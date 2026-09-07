<?php

declare(strict_types=1);

use App\Models\Architecture;
use App\Models\EmailEvent;
use App\Models\Post;
use App\Models\ResumeDelivery;
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
        '/dashboard/deliveries' => 'Résumé deliveries',
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

/*
 * The delivery detail is the one part of this section a feature test cannot
 * reach: the props carry `permanent_fail`, a null severity and a raw Message-Id,
 * and everything that turns those into something readable happens client-side
 * behind a disclosure that has to be clicked first.
 *
 * One delivery, so the toggle and the glyph are unambiguous - `click` and
 * `assertPresent` both go through a locator that Playwright's strict mode would
 * throw on if a second row rendered.
 *
 * No Http::fake matters here. This is the one section page that reads two local
 * tables rather than a vendor, which is why it resolves its prop inline instead
 * of deferring it - see .ai/rules/admin.md.
 */
it('makes a delivery readable once its row is expanded', function (): void {
    $this->actingAs(User::factory()->create());

    $delivery = ResumeDelivery::factory()
        ->sent()
        ->create([
            'email' => 'hiring@example.com',
            'failure_reason' => 'suppressed by the provider',
        ]);

    EmailEvent::factory()->for($delivery)->create([
        'event' => 'accepted',
        'occurred_at' => now()->subMinutes(3),
    ]);

    EmailEvent::factory()->for($delivery)->create([
        'event' => 'permanent_fail',
        'severity' => 'permanent',
        'reason' => 'suppress-bounce',
        'occurred_at' => now()->subMinutes(2),
    ]);

    visit('/dashboard/deliveries')
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        // The status glyph beside the badge. The badge's own word is what
        // carries the meaning; this is the second reading.
        ->assertPresent('@delivery-glyph')
        ->assertPresent('@panel-icon')
        // The detail row exists either way, so aria-controls always resolves -
        // which is exactly why the collapsed state has to be asserted before
        // the click, or the test would pass without the disclosure working.
        ->assertDontSee('Provider events')
        ->click('@delivery-toggle')
        ->assertSee('Provider events')
        // The facts, on the gutter the timeline below them now shares.
        ->assertSee('Turnstile')
        ->assertSee('Message-Id')
        ->assertSee('Failure')
        ->assertSee('suppressed by the provider')
        // Not 'permanent_fail'. The underscore form is what the webhook stores
        // and what the prop carries, so this string reaches the page only if
        // eventLabel() rewrote it - and nothing else on the site produces it.
        ->assertSee('Permanent fail')
        ->assertDontSee('permanent_fail')
        // Severity and reason read as one phrase now rather than landing in two
        // columns that agreed with nothing above them.
        ->assertSee('permanent · suppress-bounce');
});

/*
 * The body editor is the one part of the panel a feature test cannot reach at
 * all. Everything it does happens after mount, in a chunk the server never
 * loads: MDXEditor is Lexical plus CodeMirror, so markdown-field.tsx gates the
 * lazy() behind a mount effect and the SSR pass renders a skeleton instead.
 *
 * So the assertions here are the three things that gate can get wrong. The
 * prose has to survive the markdown -> Lexical parse; the ::block directive has
 * to come back as a chip rather than as literal syntax; and the hidden input the
 * form actually submits has to hold the markdown, because a body that renders
 * beautifully and posts an empty string would pass every other test in the file.
 *
 * compileBody() is a saving event the factory does not fire - see
 * .ai/rules/browser.md. Without it the edit form loads with an empty body and
 * every assertion below passes vacuously.
 */
it('edits a body in the rich text editor', function (): void {
    $this->actingAs(User::factory()->create());

    $post = Post::factory()->create([
        'body' => "## The edge\n\nCaddy fronts every container.\n\n::block{key=\"edge-diagram\"}\n",
        'blocks' => [
            'edge-diagram' => [
                'type' => 'specs',
                'items' => [['label' => 'Edge', 'value' => 'Caddy']],
            ],
        ],
    ]);

    $post->compileBody()->save();

    visit("/dashboard/posts/{$post->slug}/edit")
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        // The prose came through the parse.
        ->assertSee('The edge')
        ->assertSee('Caddy fronts every container.')
        // The directive is a chip, not the raw line. All three matter: the chip
        // proves directivesPlugin resolved it, the key proves the chip is bound
        // to the right block, and the absent literal proves it is not simply
        // sitting there as text. The key is deliberately not `request-path` -
        // the field's own hint uses that one as its example, so the literal
        // would be on the page either way.
        ->assertPresent('@block-directive')
        ->assertSee('edge-diagram')
        ->assertDontSee('::block{key="edge-diagram"}')
        // What the form posts. The editor is not a form control, so this input
        // is the whole submission path for `body`.
        ->assertValue('input[name="body"]', $post->body);
});

/*
 * The round trip, which is the failure mode with the widest blast radius.
 *
 * MDXEditor does not edit text - it parses markdown into Lexical and
 * re-serialises the whole document through mdast on every change. So every
 * construct the site's write-ups actually use has to survive a pass it never
 * had to survive when the field was a textarea, and a construct that does not
 * is rewritten in the database the first time an author touches an unrelated
 * paragraph.
 *
 * Each line below is a specific thing that goes wrong unpinned:
 *
 *   - the ::block directive is the only reason directivesPlugin is configured;
 *     without it BodyRenderer's line-anchored, double-quoted form is what
 *     breaks, and every diagram silently vanishes from the page.
 *   - `caddyfile` has no CodeMirror grammar. The fence must keep its language
 *     even though the editor cannot highlight it.
 *   - bullets and emphasis are mdast defaults (`*` for both) pinned back to
 *     what the existing bodies use, so opening a post does not rewrite it.
 *
 * The keypress is what forces the export: onChange does not fire on mount, so
 * without it the hidden input still holds the untouched original and every
 * expectation below would pass without the serialiser running at all.
 */
it('round trips the markdown constructs the write-ups use', function (): void {
    $this->actingAs(User::factory()->create());

    $body = <<<'MARKDOWN'
    ## The edge

    Everything _around_ it is pushed onto a queue.

    ::block{key="edge-diagram"}

    - **The first point.** With a sentence after it.
    - **The second point.** And another.

    ```caddyfile
    reverse_proxy juanplaza:8080
    ```
    MARKDOWN;

    $post = Post::factory()->create([
        'body' => $body,
        'blocks' => ['edge-diagram' => ['type' => 'specs', 'items' => [['label' => 'Edge', 'value' => 'Caddy']]]],
    ]);

    $post->compileBody()->save();

    $page = visit("/dashboard/posts/{$post->slug}/edit")
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        // data-lexical-editor, not [contenteditable]: a fenced code block is a
        // CodeMirror instance with a contenteditable of its own, so the looser
        // selector matches two elements and Playwright's strict mode throws.
        ->keys('[data-lexical-editor="true"]', ['a', 'Backspace']);

    expect($page->value('input[name="body"]'))
        ->toContain('::block{key="edge-diagram"}')
        ->toContain("```caddyfile\nreverse_proxy juanplaza:8080\n```")
        ->toContain('- **The first point.**')
        ->toContain('_around_')
        ->toContain('## The edge');
});

// Panel chrome ---------------------------------------------------------------

/*
 * The appearance rail. Asserted as a change rather than against a fixed value,
 * because nothing is persisted until a theme is picked, so the starting state
 * is whatever prefers-color-scheme the browser reports - pinning "dark is
 * present after one click" would pass or fail on the machine's colour scheme
 * rather than on the toggle.
 *
 * The palette picker beside it is asserted by its accessible name, not its
 * dots: it renders six sibling buttons, and a locator matching all six trips
 * Playwright's strict mode the same way @panel-icon would.
 */
it('switches the panel theme from the page header', function (): void {
    $this->actingAs(User::factory()->create());

    $page = visit('/dashboard')
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        ->assertPresent('[role="radiogroup"][aria-label="Color palette"]')
        ->assertPresent('@theme-toggle');

    $wasDark = $page->attribute('@theme-toggle', 'aria-pressed') === 'true';

    // Both halves: the class the whole token layer keys on actually lands on
    // <html>, and the button reports the state it just moved to. Selectors are
    // written with a `.` or `:` because a bare tag name is not explicit enough
    // for the plugin's locator guesser - it falls through to a text search and
    // times out.
    $page->click('@theme-toggle')
        ->assertPresent($wasDark ? 'html:not(.dark)' : 'html.dark')
        ->assertAttribute('@theme-toggle', 'aria-pressed', $wasDark ? 'false' : 'true');
});

/*
 * The footer's two halves. "View site" is the panel's only way back to the
 * public site, and the Consoles menu is built from a shared prop rather than
 * hardcoded - so the assertion is on a URL that only exists if the Cloudflare
 * account id from beforeEach() reached the DOM through App\Enums\Console.
 *
 * Neither console the fixture configures is asserted by its label: "Sentry" and
 * "Cloudflare" both appear in panel copy elsewhere, and matching on the href is
 * what makes this about the link rather than about the word.
 */
it('links back to the public site and out to the configured consoles', function (): void {
    $this->actingAs(User::factory()->create());

    visit('/dashboard')
        ->waitForEvent('networkidle')
        ->assertNoSmoke()
        ->assertSee('View site')
        ->assertPresent('a[href="/"][target="_blank"]')
        ->assertDontSee('Documentation')
        ->click('@consoles-menu')
        ->assertPresent('a[href^="https://dash.cloudflare.com/acct-tag/"]')
        ->assertPresent('a[href^="https://us.sentry.io/organizations/test-org/issues/"]');
});
