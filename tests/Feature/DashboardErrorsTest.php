<?php

declare(strict_types=1);

use App\Enums\AnalyticsRange;
use App\Models\User;
use App\Services\Sentry\CachedErrorInsights;
use App\Services\Sentry\SentryApiClient;
use App\Services\Sentry\SentryApiException;
use Illuminate\Support\Facades\Http;

beforeEach(fn () => configureSentry());

// Mapper -------------------------------------------------------------------

test('it maps a sentry response into the errors page shape', function (): void {
    fakeSentry();

    $summary = insights()->summary(AnalyticsRange::Last7Days);

    expect($summary['error'])->toBeNull()
        ->and($summary['range'])->toBe('7d')
        ->and($summary['issues'])->toHaveCount(2)
        ->and($summary['issues'][0]['title'])->toBe('TypeError: undefined is not a function')
        // count arrives as a string; the page needs a number to format.
        ->and($summary['issues'][0]['count'])->toBe(88)
        ->and($summary['issues'][0]['userCount'])->toBe(12)
        ->and($summary['issues'][0]['sparkline'])->toBe([2, 5])
        ->and($summary['totals']['issues'])->toBe(2)
        ->and($summary['totals']['users'])->toBe(16)
        // Releases are not part of this shape any more - they answer a
        // different question on /dashboard/deployments.
        ->and($summary)->not->toHaveKey('releases');
});

test('the quota counts thirty days while the chart is trimmed to the range', function (): void {
    fakeSentry();

    $week = insights()->summary(AnalyticsRange::Last7Days);
    $month = insights()->summary(AnalyticsRange::Last30Days);

    // 28 days of 100, then 10 and 5.
    $burn = 2815;

    expect($week['series'])->toHaveCount(7)
        ->and($month['series'])->toHaveCount(30)
        // Narrowing the range must not make the meter look emptier.
        ->and($week['totals']['accepted'])->toBe($burn)
        ->and($month['totals']['accepted'])->toBe($burn)
        ->and($week['totals']['quota'])->toBe(5000)
        // The range totals do move, because those are what the chart shows.
        ->and($week['totals']['errors'])->toBe(515)
        ->and($month['totals']['errors'])->toBe($burn);
});

test('it separates dropped outcomes from accepted ones and ignores the rest', function (): void {
    fakeSentry();

    $summary = insights()->summary(AnalyticsRange::Last7Days);
    $latest = end($summary['series']);

    expect($latest['accepted'])->toBe(5)
        ->and($latest['dropped'])->toBe(7)
        ->and($summary['totals']['dropped'])->toBe(7);
});

test('it asks for repeated query keys rather than indexed ones', function (): void {
    fakeSentry();

    insights()->summary(AnalyticsRange::Last7Days);

    $stats = Http::recorded(
        static fn ($request): bool => str_contains($request->url(), '/stats_v2/'),
    )->first();

    // PHP would write groupBy[0]=outcome, which Sentry ignores silently - it
    // answers with one ungrouped total rather than refusing the request.
    expect($stats[0]->url())->toContain('groupBy=outcome')
        ->and($stats[0]->url())->not->toContain('groupBy%5B0%5D')
        ->and($stats[0]->url())->toContain('statsPeriod=30d');
});

// Halves that must fail alone ----------------------------------------------

test('a stats failure does not cost the issue list', function (): void {
    fakeSentry(stats: Http::response(['detail' => 'Too Many Requests'], 429));

    $summary = insights()->summary(AnalyticsRange::Last7Days);

    expect($summary['error'])->toBeNull()
        ->and($summary['issues'])->toHaveCount(2)
        ->and($summary['series'])->toBe([])
        ->and($summary['totals']['accepted'])->toBe(0);
});

// Refusals -----------------------------------------------------------------

test('a refused request carries its status into the exception', function (): void {
    Http::fake([SENTRY => Http::response(['detail' => 'Invalid token'], 401)]);

    resolve(SentryApiClient::class)->get('/organizations/test-org/issues/');
})->throws(SentryApiException::class, 'Sentry API: HTTP 401 - Invalid token');

test('an issues failure degrades to an error string rather than an exception', function (): void {
    fakeSentry(issues: Http::response(['detail' => 'Too Many Requests'], 429));

    $summary = insights()->summary(AnalyticsRange::Last7Days);

    expect($summary['error'])->toBe('Could not reach Sentry.')
        ->and($summary['issues'])->toBe([])
        ->and($summary['series'])->toBe([])
        // The quota still renders, so its denominator survives the failure.
        ->and($summary['totals']['quota'])->toBe(5000);
});

test('a blank api token is not configured either', function (): void {
    config(['services.sentry.api_token' => '']);
    Http::fake();

    expect(insights()->summary(AnalyticsRange::Last7Days)['error'])
        ->toBe('Sentry is not configured.');

    assertSentryNotCalled();
});

test('a refusal with no detail body still names the status', function (): void {
    Http::fake([SENTRY => Http::response('<html>bad gateway</html>', 502)]);

    resolve(SentryApiClient::class)->get('/organizations/test-org/issues/');
})->throws(SentryApiException::class, 'Sentry API: HTTP 502');

// Payloads that are answers rather than failures -----------------------------

test('an account with no events yet leaves the chart empty rather than crashing', function (): void {
    // What stats_v2 answers for a project that has never ingested anything.
    fakeSentry(stats: ['intervals' => [], 'groups' => []]);

    $summary = insights()->summary(AnalyticsRange::Last7Days);

    expect($summary['error'])->toBeNull()
        ->and($summary['series'])->toBe([])
        ->and($summary['totals']['errors'])->toBe(0)
        ->and($summary['totals']['accepted'])->toBe(0)
        ->and($summary['issues'])->toHaveCount(2);
});

test('an issue too new to have hourly stats renders without a sparkline', function (): void {
    $issue = sentryIssue('3', 'RuntimeException: fresh', 1, 1);
    unset($issue['stats']);

    fakeSentry(issues: [$issue]);

    expect(insights()->summary(AnalyticsRange::Last7Days)['issues'][0]['sparkline'])->toBe([]);
});

test('it does not call sentry when the credentials are missing', function (): void {
    config(['services.sentry.organization' => null]);
    Http::fake();

    expect(insights()->summary(AnalyticsRange::Last7Days)['error'])
        ->toBe('Sentry is not configured.');

    assertSentryNotCalled();
});

// Caching ------------------------------------------------------------------

test('a second lookup in the same window is served from the cache', function (): void {
    fakeSentry();

    resolve(CachedErrorInsights::class)->summary(AnalyticsRange::Last7Days);
    resolve(CachedErrorInsights::class)->summary(AnalyticsRange::Last7Days);

    expect(sentryCalls('/issues/'))->toBe(1);
});

test('each range is cached separately', function (): void {
    fakeSentry();

    resolve(CachedErrorInsights::class)->summary(AnalyticsRange::Last7Days);
    resolve(CachedErrorInsights::class)->summary(AnalyticsRange::Last30Days);

    expect(sentryCalls('/issues/'))->toBe(2);
});

test('a failed lookup is not cached', function (): void {
    fakeSentry(issues: Http::response(['detail' => 'boom'], 500));

    resolve(CachedErrorInsights::class)->summary(AnalyticsRange::Last7Days);
    resolve(CachedErrorInsights::class)->summary(AnalyticsRange::Last7Days);

    expect(sentryCalls('/issues/'))->toBeGreaterThan(1);
});

// The page -----------------------------------------------------------------

test('the errors page defers the insights prop', function (): void {
    fakeSentry();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.errors'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/errors')
            ->where('range', '7d')
            ->has('ranges', 2)
            ->missing('insights'),
        );

    // Deferred means deferred. Asserted against Sentry specifically rather than
    // with assertNothingSent(): Inertia's SSR gateway shares this recorder.
    assertSentryNotCalled();
});

test('a partial reload resolves the insights prop', function (): void {
    fakeSentry();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.errors'), [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => sentryInertiaVersion(),
        'X-Inertia-Partial-Component' => 'admin/errors',
        'X-Inertia-Partial-Data' => 'insights',
    ])
        ->assertOk()
        // A partial reload answers with JSON, not the root view, so
        // assertInertia() cannot read it - assert the payload directly.
        ->assertJsonPath('props.insights.error', null)
        ->assertJsonPath('props.insights.totals.accepted', 2815)
        ->assertJsonCount(2, 'props.insights.issues');
});

test('an unrecognised range falls back to the default instead of failing', function (): void {
    fakeSentry();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.errors', ['range' => '90d']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('range', '7d'));
});

test('a known range is carried into the page props', function (): void {
    fakeSentry();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.errors', ['range' => '30d']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('range', '30d'));
});

test('the errors page is behind the admin middleware', function (): void {
    $this->get(route('admin.errors'))->assertRedirect(route('login'));
});

test('the errors summary asks sentry twice and never for releases', function (): void {
    fakeSentry();

    insights()->summary(AnalyticsRange::Last7Days);

    // Releases moved to their own page and their own request. Leaving them in
    // here would make every errors load pay for a list it no longer shows,
    // against an API that rate-limits on caller identity.
    expect(sentryCalls())->toBe(2)
        ->and(sentryCalls('/releases/'))->toBe(0);
});
