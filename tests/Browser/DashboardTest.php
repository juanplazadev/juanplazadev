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

    /*
     * Three days, not one. The overview's traffic chart needs more than a
     * single point to draw, so a one-day body renders an empty plot and any
     * assertion about the chart passes without proving anything.
     */
    Http::fake(['api.cloudflare.com/*' => Http::response([
        'data' => ['viewer' => [
            'accounts' => [[
                'series' => [
                    [
                        'count' => 20,
                        'sum' => ['visits' => 4],
                        'avg' => ['sampleInterval' => 1.0],
                        'dimensions' => ['date' => '2026-09-05'],
                    ],
                    [
                        'count' => 31,
                        'sum' => ['visits' => 9],
                        'avg' => ['sampleInterval' => 1.0],
                        'dimensions' => ['date' => '2026-09-06'],
                    ],
                    [
                        'count' => 12,
                        'sum' => ['visits' => 5],
                        'avg' => ['sampleInterval' => 1.0],
                        'dimensions' => ['date' => '2026-09-07'],
                    ],
                ],
                'topPaths' => [],
                'topReferrers' => [],
                // These three carry rows because the breakdown cards render a
                // glyph per row - a flag, a brand mark, a device - and with
                // every breakdown empty no browser test ever rendered a single
                // TopList row. The values are the live Cloudflare vocabulary:
                // countryName is an alpha-2 code, and userAgentBrowser folds
                // the platform into CamelCase.
                'topCountries' => [
                    [
                        'count' => 49,
                        'sum' => ['visits' => 9],
                        'avg' => ['sampleInterval' => 1.0],
                        'dimensions' => ['countryName' => 'US'],
                    ],
                ],
                'browsers' => [
                    [
                        'count' => 49,
                        'sum' => ['visits' => 9],
                        'avg' => ['sampleInterval' => 1.0],
                        'dimensions' => ['userAgentBrowser' => 'MobileSafari'],
                    ],
                ],
                // Two, so the part-to-whole bar actually has a split to draw.
                'devices' => [
                    [
                        'count' => 49,
                        'sum' => ['visits' => 9],
                        'avg' => ['sampleInterval' => 1.0],
                        'dimensions' => ['deviceType' => 'mobile'],
                    ],
                    [
                        'count' => 14,
                        'sum' => ['visits' => 5],
                        'avg' => ['sampleInterval' => 1.0],
                        'dimensions' => ['deviceType' => 'desktop'],
                    ],
                ],
            ]],
            'zones' => [['httpTraffic' => []]],
        ]],
        'errors' => null,
    ])]);

    Http::fake(['us.sentry.io/*' => fn ($request) => Http::response(match (true) {
        // Two issues at DIFFERENT levels. This answered [] until the issue rows
        // grew a severity glyph and the levels grew a part-to-whole bar, so no
        // browser test had ever rendered an issue row at all - the same gap the
        // Cloudflare breakdowns above were fixed for. One level would draw a
        // single full-width segment and prove nothing about the split.
        str_contains($request->url(), '/issues/') => [
            browserSentryIssue('1', 'TypeError: undefined is not a function', 'error'),
            browserSentryIssue('2', 'QueryException: 42P01', 'warning'),
        ],
        str_contains($request->url(), '/stats_v2/') => ['intervals' => [], 'groups' => []],
        // This answered [] until now, so no browser test had ever rendered a
        // release row - the same gap the issue list and the Cloudflare
        // breakdowns above were fixed for. Two of them, so that a test can pin
        // the running build to the older one and draw the drift.
        default => [
            browserSentryRelease('1a2b3c4d5e6f7a8b9c0d', '2026-09-02T10:30:00Z'),
            browserSentryRelease('9f8e7d6c5b4a3f2e1d0c', '2026-08-28T11:00:00Z'),
        ],
    })]);
});

/**
 * One release, as the organization releases endpoint reports it.
 *
 * Local rather than tests/Helpers/sentry.php's sentryReleasesBody() for the
 * reason browserSentryIssue() is local: the feature tests assert exact values
 * off the shared fixture, and this one exists to be pinned against a running
 * build.
 *
 * @return array<string, mixed>
 */
function browserSentryRelease(string $version, string $deployedAt): array
{
    return [
        'version' => $version,
        'shortVersion' => mb_substr($version, 0, 7),
        'newGroups' => 3,
        'dateCreated' => $deployedAt,
        'lastDeploy' => [
            'dateFinished' => $deployedAt,
            'environment' => 'production',
        ],
    ];
}

/**
 * One issue, as the organization issues endpoint reports it.
 *
 * Deliberately not tests/Helpers/sentry.php's sentryIssue(): that fixture is
 * shared by the feature tests which assert exact totals off it, and this one
 * exists to vary the level. `count` is a string on this endpoint, not an int.
 *
 * @return array<string, mixed>
 */
function browserSentryIssue(string $id, string $title, string $level): array
{
    return [
        'id' => $id,
        'shortId' => "JUANPLAZADEV-{$id}",
        'title' => $title,
        'culprit' => 'App\\Http\\Controllers\\HomeController@index',
        'level' => $level,
        'count' => '88',
        'userCount' => 12,
        'lastSeen' => '2026-09-05T12:00:00Z',
        'permalink' => "https://test-org.sentry.io/issues/{$id}/",
        'stats' => ['24h' => [[1757000000, 2], [1757003600, 5]]],
    ];
}

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
 * The breakdown rows resolve two things client-side that the server sends raw,
 * so a passing feature test proves neither: Cloudflare's `US` has to reach the
 * reader as "United States", and the Devices breakdown - fetched since the
 * panel was built and rendered by nothing until now - has to appear at all.
 *
 * assertPresent goes through count(); assertAttribute would call getAttribute()
 * on the locator and Playwright strict mode throws on the multi-match, which
 * every one of these pages now is.
 */
it('resolves country codes and draws a glyph on each breakdown row', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/dashboard/analytics')
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        ->assertSee('Countries')
        ->assertSee('United States')
        ->assertSee('Browsers')
        // Not "MobileSafari" - the raw dimension value reads as a machine
        // string, and the split is the only thing standing between the two.
        ->assertSee('Mobile Safari')
        // Devices is a part-to-whole bar rather than a list, so both of its
        // values have to be named in the legend - the whole point of the shape
        // is that no share is left for the reader to infer.
        ->assertSee('Devices')
        ->assertSee('Mobile')
        ->assertSee('Desktop')
        ->assertPresent('@row-glyph')
        ->assertPresent('@panel-icon');
});

/*
 * Severity is the only enumerable field in the errors payload, and it is drawn
 * twice from one vocabulary: a glyph per issue row and a part-to-whole bar above
 * the list. Neither is visible to a feature test - the level arrives as the bare
 * string `warning` and everything that makes it readable happens client-side.
 *
 * Until this test the page's issue list had never rendered a row in a browser at
 * all, because the shared Sentry fake answered /issues/ with an empty array.
 */
it('names each issue level rather than leaving it to colour', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/dashboard/errors')
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        ->assertSee('Unresolved issues')
        ->assertSee('Severity')
        // Not 'Error': assertSee is a substring match and the page header, the
        // breadcrumb and the sidebar entry all carry "Errors", so it would pass
        // without a level being named anywhere. 'Warning' reaches the page only
        // as a name - from the bar's legend or the row's sr-only span - which is
        // the whole point, because it used to be an unlabelled amber dot.
        ->assertSee('Warning')
        // The share, which only the bar draws. Two issues at one level each, so
        // the split is 50/50 - and a bar that failed to render takes this with
        // it while 'Warning' above would still pass off the sr-only span.
        ->assertSee('50%')
        // The severity glyph on each row, which replaced a colour-only dot.
        ->assertPresent('@level-glyph')
        // assertPresent goes through count(); assertAttribute would call
        // getAttribute() on the locator and Playwright strict mode throws on
        // the multi-match this page now is.
        ->assertPresent('@panel-icon');
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
        ->assertSee('Build')
        // The cards carry the sidebar's icon for the section they link to. The
        // assertSee lines above passing unchanged is what proves the glyph
        // stayed out of the accessible name.
        ->assertPresent('@panel-icon');
});

/*
 * The chart is the one thing on this page that is not in the first response OR
 * the deferred one: recharts is behind a lazy() boundary, so it arrives in a
 * third round trip, from an async chunk, after the traffic group lands. Both
 * halves matter. A static import would still draw the chart and still pass the
 * second assertion, while quietly putting 340KB back on the admin root's
 * critical path - so the first assertion, that the eager page paints before any
 * of it, is the half that guards the reason for the boundary.
 */
it('loads the traffic chart from a lazy chunk after the deferred group lands', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/dashboard')
        // Eager, and on screen before the chart chunk is even requested.
        ->assertSee('Needs attention')
        ->waitForEvent('networkidle')
        // A rejected lazy() factory throws where only this can see it.
        ->assertNoSmoke()
        // recharts drew: its own surface class, from the async chunk.
        ->assertPresent('.recharts-surface')
        // The axis is the part the sparkline fallback cannot produce, so this
        // is what separates the real chart from its stand-in.
        ->assertSee('Sep 6');
});

/*
 * Three things the feature tests cannot see, because all three are resolved in
 * the browser from props the server sends raw: the tiles are summed client-side
 * from the release rows, the row state is a comparison against config('sentry.release'),
 * and `superseded` is drawn by nothing else on the site.
 *
 * The running build is pinned to the OLDER release, which is the state the page
 * exists to catch - an image that shipped without the container cycling - and
 * the only one where both the superseded row and the latest row draw.
 */
it('renders the deployment history', function (): void {
    config(['sentry.release' => '9f8e7d6c5b4a3f2e1d0c']);
    $this->actingAs(User::factory()->create());

    visit('/dashboard/deployments')
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        // A tile label, which only release-stats.tsx produces.
        ->assertSee('Last deploy')
        // Both counts summed across the two releases.
        ->assertSee('New issues')
        // The row tag for a running build that something newer has replaced.
        // Nothing else on this page carries the word.
        ->assertSee('superseded')
        ->assertSee('latest')
        // The environment reads as a chip now rather than a bare string.
        ->assertSee('production')
        // assertPresent goes through count(); assertAttribute would call
        // getAttribute() and Playwright strict mode throws on the multi-match.
        ->assertPresent('@release-glyph');
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
