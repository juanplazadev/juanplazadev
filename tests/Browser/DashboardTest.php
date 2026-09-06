<?php

declare(strict_types=1);

use App\Models\Architecture;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Http;

/*
 * Every test here signs in, and the admin pages defer props that call
 * Cloudflare AND Sentry - the overview reaches both in one request. The
 * credentials in .env are real and phpunit.xml does not blank them, so without
 * these fakes the suite makes live credentialed API calls.
 *
 * The bodies are deliberately minimal - just enough for the panels to render.
 * The feature tests own the exhaustive mapping, sampling and failure-isolation
 * coverage; repeating it through a browser would cost seconds per case to prove
 * the same thing.
 */
beforeEach(function (): void {
    config([
        'services.cloudflare.api_token' => 'test-token',
        'services.cloudflare.account_id' => 'acct-tag',
        'services.cloudflare.site_tag' => 'site-tag',
        'services.cloudflare.zone_id' => 'zone-tag',
        'services.sentry.api_token' => 'test-token',
        'services.sentry.organization' => 'test-org',
        'services.sentry.project' => 'test-project',
        'services.sentry.api_url' => 'https://us.sentry.io/api/0',
        'services.sentry.monthly_error_quota' => 5000,
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

    Http::fake(['us.sentry.io/*' => fn ($request) => Http::response(match (true) {
        str_contains($request->url(), '/issues/') => [],
        str_contains($request->url(), '/stats_v2/') => ['intervals' => [], 'groups' => []],
        default => [],
    })]);
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

    visit('/dashboard/analytics')
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        ->assertSee('Traffic')
        ->assertSee('Cloudflare Web Analytics')
        ->assertSee('Visits');
});

/*
 * The overview fans out to three deferred groups at once, which is the thing
 * worth proving in a browser: the content half must paint before any of them
 * land, and all three must still resolve rather than one request cancelling
 * the others.
 */
it('paints the overview before its deferred groups land', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/dashboard')
        // Eager, so it is on the page before any vendor answers.
        ->assertSee('Needs attention')
        ->assertSee('Content')
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        ->assertSee('Traffic')
        ->assertSee('Errors')
        ->assertSee('Build');
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
        '/dashboard' => 'Needs attention',
        '/dashboard/analytics' => 'Cloudflare Web Analytics',
        '/dashboard/errors' => 'Sentry',
        '/dashboard/deployments' => 'Sentry releases',
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
