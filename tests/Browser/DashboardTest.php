<?php

declare(strict_types=1);

use App\Models\Architecture;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Http;

/*
 * Every test here signs in, and the dashboard defers a prop that calls
 * Cloudflare. The credentials in .env are real and phpunit.xml does not blank
 * them, so without this fake the suite makes live credentialed API calls.
 *
 * The body is deliberately minimal - just enough for the panel to render.
 * tests/Feature/DashboardAnalyticsTest.php owns the exhaustive mapping,
 * sampling and failure-isolation coverage; repeating it through a browser would
 * cost seconds per case to prove the same thing.
 */
beforeEach(function (): void {
    config([
        'services.cloudflare.api_token' => 'test-token',
        'services.cloudflare.account_id' => 'acct-tag',
        'services.cloudflare.site_tag' => 'site-tag',
        'services.cloudflare.zone_id' => 'zone-tag',
    ]);

    Http::fake(['api.cloudflare.com/*' => Http::response([
        'data' => ['viewer' => [
            'accounts' => [[
                'series' => [[
                    'count' => 20,
                    'sum' => ['visits' => 4],
                    'avg' => ['sampleInterval' => 1.0],
                    'dimensions' => ['date' => '2026-09-05'],
                ]],
                'topPaths' => [],
                'topReferrers' => [],
                'topCountries' => [],
                'browsers' => [],
                'devices' => [],
            ]],
            'zones' => [['httpTraffic' => []]],
        ]],
        'errors' => null,
    ])]);
});

it('sends a guest to the login page', function (): void {
    visit('/dashboard')
        ->assertPathIs('/login')
        ->assertSee('Log in to your account');
});

/*
 * The analytics prop is Inertia::defer(), so it arrives in a second request
 * after paint. Without the networkidle wait this asserts against the skeleton.
 */
it('renders the deferred analytics panel', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/dashboard')
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        ->assertSee('Traffic')
        ->assertSee('Cloudflare Web Analytics')
        ->assertSee('Visits');
});

it('renders every admin page', function (): void {
    $this->actingAs(User::factory()->create());

    // compileBody() is a saving event the factory does not trigger, so without
    // it the edit forms load with an empty body. See .ai/rules/concerns.md.
    $post = tap(Post::factory()->create(), fn (Post $p) => $p->compileBody()->save());
    $architecture = tap(
        Architecture::factory()->create(),
        fn (Architecture $a) => $a->compileBody()->save(),
    );

    // Asserting on each page's own description rather than its title: the admin
    // sidebar carries "Posts" and "Architecture" on every page, so a title
    // assertion would pass no matter which page actually loaded.
    $pages = [
        '/dashboard' => 'Cloudflare Web Analytics',
        '/dashboard/posts' => 'Everything on the writing page, drafts included.',
        '/dashboard/posts/create' => 'New post',
        "/dashboard/posts/{$post->slug}/edit" => 'Edit post',
        '/dashboard/architectures' => 'Living documents. Position decides the order they list in.',
        '/dashboard/architectures/create' => 'New write-up',
        "/dashboard/architectures/{$architecture->slug}/edit" => 'Edit write-up',
    ];

    foreach ($pages as $url => $heading) {
        visit($url)
            ->waitForEvent('networkidle')
            ->assertNoSmoke()
            ->assertSee($heading);
    }
});
