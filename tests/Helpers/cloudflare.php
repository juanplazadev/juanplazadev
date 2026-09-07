<?php

declare(strict_types=1);

use App\Http\Middleware\HandleInertiaRequests;
use App\Services\Cloudflare\SiteAnalytics;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/*
  Cloudflare fixtures, shared by the traffic and overview tests. See the
  note in sentry.php for why they are not in a test file.
*/

const GRAPHQL = 'api.cloudflare.com/*';

/** Credentials a configured account would have. Call from a beforeEach. */
function configureCloudflare(): void
{
    config([
        'services.cloudflare.api_token' => 'test-token',
        'services.cloudflare.account_id' => 'acct-tag',
        'services.cloudflare.site_tag' => 'site-tag',
        'services.cloudflare.zone_id' => 'zone-tag',
    ]);
}

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
                    // These three are the live vocabulary, captured from the
                    // real API - not tidied. countryName reports an alpha-2
                    // CODE despite its name, and userAgentBrowser folds the
                    // platform into CamelCase. A fixture that said "United
                    // States" and "Safari" is what hid both for this long.
                    'topCountries' => [
                        rumGroup(['countryName' => 'US'], visits: 9, pageViews: 49),
                        rumGroup(['countryName' => 'GB'], visits: 4, pageViews: 20),
                    ],
                    'browsers' => [
                        rumGroup(['userAgentBrowser' => 'Chrome'], visits: 9, pageViews: 49),
                        rumGroup(['userAgentBrowser' => 'MobileSafari'], visits: 4, pageViews: 20),
                    ],
                    'devices' => [
                        rumGroup(['deviceType' => 'desktop'], visits: 9, pageViews: 49),
                        rumGroup(['deviceType' => ''], visits: 4, pageViews: 20),
                    ],
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
        GRAPHQL => fn (Request $request) => Http::response(
            str_contains((string) ($request['query'] ?? ''), 'httpRequests1dGroups') ? $zone : $rum,
        ),
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
    return (string) resolve(HandleInertiaRequests::class)->version(request());
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
    return resolve(SiteAnalytics::class);
}
