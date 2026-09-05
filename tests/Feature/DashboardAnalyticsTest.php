<?php

declare(strict_types=1);

use App\Enums\AnalyticsRange;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use App\Services\Cloudflare\CachedSiteAnalytics;
use App\Services\Cloudflare\CloudflareGraphQlClient;
use App\Services\Cloudflare\CloudflareGraphQlException;
use App\Services\Cloudflare\SiteAnalytics;
use Illuminate\Support\Facades\Http;

const GRAPHQL = 'api.cloudflare.com/*';

beforeEach(function (): void {
    config([
        'services.cloudflare.api_token' => 'test-token',
        'services.cloudflare.account_id' => 'acct-tag',
        'services.cloudflare.site_tag' => 'site-tag',
        'services.cloudflare.zone_id' => 'zone-tag',
    ]);
});

/**
 * One RUM group. sampleInterval defaults to 1 so a test only opts into sampling
 * when it is what is being tested.
 *
 * @param  array<string, string>  $dimensions
 * @return array<string, mixed>
 */
function rumGroup(array $dimensions, int $visits, int $pageViews, float $sampleInterval = 1.0): array
{
    return [
        'count' => $pageViews,
        'sum' => ['visits' => $visits],
        'avg' => ['sampleInterval' => $sampleInterval],
        'dimensions' => $dimensions,
    ];
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function cloudflareBody(array $overrides = []): array
{
    return [
        'data' => [
            'viewer' => [
                'accounts' => [[
                    'series' => [
                        rumGroup(['date' => '2026-09-04'], visits: 4, pageViews: 20),
                        rumGroup(['date' => '2026-09-05'], visits: 9, pageViews: 49),
                    ],
                    'topPaths' => [
                        rumGroup(['requestPath' => '/'], visits: 7, pageViews: 30),
                        rumGroup(['requestPath' => '/blog'], visits: 6, pageViews: 39),
                    ],
                    'topReferrers' => [rumGroup(['refererHost' => ''], visits: 13, pageViews: 69)],
                    'topCountries' => [rumGroup(['countryName' => 'United States'], visits: 13, pageViews: 69)],
                    'browsers' => [rumGroup(['userAgentBrowser' => 'Chrome'], visits: 13, pageViews: 69)],
                    'devices' => [rumGroup(['deviceType' => 'desktop'], visits: 13, pageViews: 69)],
                ]],
            ],
        ],
        'errors' => null,
        ...$overrides,
    ];
}

/**
 * The zone half, answered by its own request.
 *
 * @return array<string, mixed>
 */
function zoneBody(): array
{
    return [
        'data' => [
            'viewer' => [
                'zones' => [[
                    'httpTraffic' => [
                        ['sum' => ['requests' => 300, 'cachedRequests' => 300, 'bytes' => 2048], 'dimensions' => ['date' => '2026-09-04']],
                        ['sum' => ['requests' => 100, 'cachedRequests' => 0, 'bytes' => 1024], 'dimensions' => ['date' => '2026-09-05']],
                    ],
                ]],
            ],
        ],
        'errors' => null,
    ];
}

/**
 * Route each faked response by which document was posted.
 *
 * @param  array<string, mixed>|null  $rum
 * @param  array<string, mixed>|null  $zone
 */
function fakeCloudflare(?array $rum = null, ?array $zone = null): void
{
    $rum ??= cloudflareBody();
    $zone ??= zoneBody();

    Http::fake([
        GRAPHQL => function ($request) use ($rum, $zone) {
            return Http::response(
                str_contains((string) ($request['query'] ?? ''), 'httpRequests1dGroups') ? $zone : $rum,
            );
        },
    ]);
}

/**
 * The asset version the middleware will compare against.
 *
 * Inertia::getVersion() is empty until a request has been through the
 * middleware, so asking the middleware directly is what avoids a 409.
 */
function inertiaVersion(): string
{
    return (string) app(HandleInertiaRequests::class)->version(request());
}

/** Cloudflare requests only - Inertia's SSR gateway shares the same recorder. */
function cloudflareCalls(): int
{
    return Http::recorded(
        static fn ($request): bool => str_contains($request->url(), 'api.cloudflare.com'),
    )->count();
}

/** RUM requests only, so the zone half's separate call does not skew a count. */
function rumCalls(): int
{
    return Http::recorded(
        static fn ($request): bool => str_contains($request->url(), 'api.cloudflare.com')
            && ! str_contains((string) ($request['query'] ?? ''), 'httpRequests1dGroups'),
    )->count();
}

function assertCloudflareNotCalled(): void
{
    expect(cloudflareCalls())->toBe(0);
}

function analytics(): SiteAnalytics
{
    return app(SiteAnalytics::class);
}

// Mapper -------------------------------------------------------------------

test('it maps a cloudflare response into the dashboard shape', function (): void {
    fakeCloudflare();

    $summary = analytics()->summary(AnalyticsRange::Last7Days);

    expect($summary['error'])->toBeNull()
        ->and($summary['range'])->toBe('7d')
        ->and($summary['totals']['visits'])->toBe(13)
        ->and($summary['totals']['pageViews'])->toBe(69)
        ->and($summary['series'])->toHaveCount(2)
        ->and($summary['series'][0]['date'])->toBe('2026-09-04')
        ->and($summary['breakdowns']['topPaths'][0]['label'])->toBe('/')
        ->and($summary['breakdowns']['topPaths'][0]['visits'])->toBe(7);
});

test('it orders the series oldest first regardless of what cloudflare returns', function (): void {
    $body = cloudflareBody();
    $body['data']['viewer']['accounts'][0]['series'] = array_reverse(
        $body['data']['viewer']['accounts'][0]['series'],
    );
    fakeCloudflare(rum: $body);

    $dates = array_column(analytics()->summary(AnalyticsRange::Last7Days)['series'], 'date');

    expect($dates)->toBe(['2026-09-04', '2026-09-05']);
});

test('an empty referer host is reported as direct traffic', function (): void {
    fakeCloudflare();

    expect(analytics()->summary(AnalyticsRange::Last7Days)['breakdowns']['topReferrers'][0]['label'])
        ->toBe('Direct');
});

test('it multiplies sampled groups by their sample interval', function (): void {
    $body = cloudflareBody();
    $body['data']['viewer']['accounts'][0]['series'] = [
        rumGroup(['date' => '2026-09-05'], visits: 9, pageViews: 49, sampleInterval: 10.0),
    ];
    fakeCloudflare(rum: $body);

    $summary = analytics()->summary(AnalyticsRange::Last7Days);

    expect($summary['totals']['visits'])->toBe(90)
        ->and($summary['totals']['pageViews'])->toBe(490);
});

test('it derives requests bytes and cache hit ratio from the zone half', function (): void {
    fakeCloudflare();

    $totals = analytics()->summary(AnalyticsRange::Last7Days)['totals'];

    expect($totals['requests'])->toBe(400)
        ->and($totals['bytes'])->toBe(3072)
        ->and($totals['cacheHitRatio'])->toBe(0.75);
});

test('the zone half asks for daily rollups, not the adaptive dataset', function (): void {
    fakeCloudflare();

    analytics()->summary(AnalyticsRange::Last30Days);

    // httpRequestsAdaptiveGroups caps at a 1d window on a Free plan; the daily
    // rollups reach thirty. Pin the dataset so a refactor cannot regress it.
    $zone = Http::recorded(
        static fn ($request): bool => str_contains((string) ($request['query'] ?? ''), 'httpRequests'),
    )->first();

    expect((string) $zone[0]['query'])->toContain('httpRequests1dGroups')
        ->and((string) $zone[0]['query'])->not->toContain('httpRequestsAdaptiveGroups')
        ->and($zone[0]['variables']['start'])->toMatch('/^\\d{4}-\\d{2}-\\d{2}$/');
});

test('an unproxied zone leaves the visitor numbers intact', function (): void {
    fakeCloudflare(zone: ['data' => ['viewer' => ['zones' => []]], 'errors' => null]);

    $summary = analytics()->summary(AnalyticsRange::Last7Days);

    expect($summary['totals']['visits'])->toBe(13)
        ->and($summary['totals']['requests'])->toBe(0)
        ->and($summary['totals']['cacheHitRatio'])->toBeNull();
});

/**
 * The regression this split exists for. On a Free plan the adaptive zone dataset
 * refuses any window wider than a day; while both halves shared one document
 * that refusal took the visitor numbers with it.
 */
test('a zone side failure does not cost the visitor numbers', function (): void {
    fakeCloudflare(zone: ['errors' => [[
        'message' => 'zone "abc" cannot request a time range wider than 1d, but your query time range spans 1w',
    ]]]);

    $summary = analytics()->summary(AnalyticsRange::Last7Days);

    expect($summary['error'])->toBeNull()
        ->and($summary['totals']['visits'])->toBe(13)
        ->and($summary['totals']['pageViews'])->toBe(69)
        ->and($summary['series'])->toHaveCount(2)
        ->and($summary['totals']['requests'])->toBe(0)
        ->and($summary['totals']['cacheHitRatio'])->toBeNull();
});

test('the zone half is skipped entirely when no zone id is configured', function (): void {
    config(['services.cloudflare.zone_id' => null]);
    fakeCloudflare();

    $summary = analytics()->summary(AnalyticsRange::Last7Days);

    expect($summary['totals']['visits'])->toBe(13)
        ->and($summary['totals']['requests'])->toBe(0)
        ->and(cloudflareCalls())->toBe(1);
});

// The failure mode HTTP status codes hide ----------------------------------

test('a graphql errors array throws even though the status is 200', function (): void {
    Http::fake([GRAPHQL => Http::response([
        'data' => null,
        'errors' => [['message' => 'not authorized for that account']],
    ], 200)]);

    app(CloudflareGraphQlClient::class)->query('{ viewer { __typename } }');
})->throws(CloudflareGraphQlException::class, 'not authorized for that account');

test('an upstream failure degrades to an error string rather than an exception', function (): void {
    fakeCloudflare(rum: ['errors' => [['message' => 'boom']]]);

    $summary = analytics()->summary(AnalyticsRange::Last7Days);

    expect($summary['error'])->toBe('Could not reach Cloudflare.')
        ->and($summary['series'])->toBe([])
        ->and($summary['totals']['visits'])->toBe(0);
});

test('it does not call cloudflare when the credentials are missing', function (): void {
    config(['services.cloudflare.site_tag' => null]);
    Http::fake();

    $summary = analytics()->summary(AnalyticsRange::Last7Days);

    expect($summary['error'])->toBe('Cloudflare analytics is not configured.');
    assertCloudflareNotCalled();
});

// Caching ------------------------------------------------------------------

test('a second lookup in the same window is served from the cache', function (): void {
    fakeCloudflare();

    app(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);
    app(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);

    expect(rumCalls())->toBe(1);
});

test('each range is cached separately', function (): void {
    fakeCloudflare();

    app(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);
    app(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last30Days);

    expect(rumCalls())->toBe(2);
});

test('a failed lookup is not cached', function (): void {
    fakeCloudflare(rum: ['errors' => [['message' => 'boom']]]);

    app(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);
    app(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);

    expect(rumCalls())->toBe(2);
});

// The page -----------------------------------------------------------------

test('the dashboard defers the analytics prop', function (): void {
    fakeCloudflare();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('range', '7d')
            ->has('ranges', 2)
            ->missing('analytics'),
        );

    // Deferred means deferred. Asserted against Cloudflare specifically rather
    // than with assertNothingSent(): Inertia's SSR gateway shares this recorder.
    assertCloudflareNotCalled();
});

test('a partial reload resolves the analytics prop', function (): void {
    fakeCloudflare();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.dashboard'), [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => inertiaVersion(),
        'X-Inertia-Partial-Component' => 'dashboard',
        'X-Inertia-Partial-Data' => 'analytics',
    ])
        ->assertOk()
        // A partial reload answers with JSON, not the root view, so
        // assertInertia() cannot read it - assert the payload directly.
        ->assertJsonPath('props.analytics.totals.visits', 13)
        ->assertJsonPath('props.analytics.error', null)
        ->assertJsonCount(2, 'props.analytics.series');
});

test('an unrecognised range falls back to the default instead of failing', function (): void {
    fakeCloudflare();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.dashboard', ['range' => '90d']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('range', '7d'));
});

test('a known range is carried into the page props', function (): void {
    fakeCloudflare();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.dashboard', ['range' => '30d']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('range', '30d'));
});
