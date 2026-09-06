<?php

declare(strict_types=1);

use App\Enums\AnalyticsRange;
use App\Models\User;
use App\Services\Cloudflare\CachedSiteAnalytics;
use App\Services\Cloudflare\CloudflareGraphQlClient;
use App\Services\Cloudflare\CloudflareGraphQlException;
use Illuminate\Support\Facades\Http;

beforeEach(fn () => configureCloudflare());

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

    resolve(CloudflareGraphQlClient::class)->query('{ viewer { __typename } }');
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

    resolve(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);
    resolve(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);

    expect(rumCalls())->toBe(1);
});

test('each range is cached separately', function (): void {
    fakeCloudflare();

    resolve(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);
    resolve(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last30Days);

    expect(rumCalls())->toBe(2);
});

test('a failed lookup is not cached', function (): void {
    fakeCloudflare(rum: ['errors' => [['message' => 'boom']]]);

    resolve(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);
    resolve(CachedSiteAnalytics::class)->summary(AnalyticsRange::Last7Days);

    expect(rumCalls())->toBe(2);
});

// The page -----------------------------------------------------------------

test('the traffic page defers the analytics prop', function (): void {
    fakeCloudflare();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.analytics'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/analytics')
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

    $this->get(route('admin.analytics'), [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => inertiaVersion(),
        'X-Inertia-Partial-Component' => 'admin/analytics',
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

    $this->get(route('admin.analytics', ['range' => '90d']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('range', '7d'));
});

test('a known range is carried into the page props', function (): void {
    fakeCloudflare();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.analytics', ['range' => '30d']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('range', '30d'));
});
