<?php

declare(strict_types=1);

use App\Http\Middleware\HandleInertiaRequests;
use App\Services\Sentry\ErrorInsights;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/*
  Sentry fixtures, shared by the errors, deployments and overview tests.

  They live here rather than in one of those files because a test file's
  functions are only loaded when that file is, so a helper declared in a
  sibling works for a full-suite run and disappears under --filter.
*/

const SENTRY = 'us.sentry.io/*';

/** Credentials a configured account would have. Call from a beforeEach. */
function configureSentry(): void
{
    config([
        'services.sentry.api_token' => 'test-token',
        'services.sentry.organization' => 'test-org',
        'services.sentry.project' => 'test-project',
        'services.sentry.api_url' => 'https://us.sentry.io/api/0',
        'services.sentry.monthly_error_quota' => 5000,
    ]);
}

/**
 * One issue, as the organization issues endpoint reports it.
 *
 * `count` is a string on this endpoint, not an integer, so the fixture keeps it
 * one - a mapper that stopped casting would otherwise still pass.
 *
 * @return array<string, mixed>
 */
function sentryIssue(string $id, string $title, int $count, int $users): array
{
    return [
        'id' => $id,
        'shortId' => "JUANPLAZADEV-{$id}",
        'title' => $title,
        'culprit' => 'App\\Http\\Controllers\\HomeController@index',
        'level' => 'error',
        'count' => (string) $count,
        'userCount' => $users,
        'lastSeen' => '2026-09-05T12:00:00Z',
        'permalink' => "https://test-org.sentry.io/issues/{$id}/",
        'stats' => ['24h' => [[1757000000, 2], [1757003600, 5]]],
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function sentryIssuesBody(): array
{
    return [
        sentryIssue('1', 'TypeError: undefined is not a function', 88, 12),
        sentryIssue('2', 'QueryException: 42P01', 31, 4),
    ];
}

/**
 * Thirty daily buckets grouped by outcome.
 *
 * Only the last two carry anything, which is what lets a range test prove the
 * series was trimmed while the quota total was not.
 *
 * @return array<string, mixed>
 */
function sentryStatsBody(): array
{
    $intervals = [];
    $accepted = [];
    $rateLimited = [];

    for ($day = 29; $day >= 0; $day--) {
        $intervals[] = now('UTC')->subDays($day)->format('Y-m-d\TH:i:s\Z');
        // 100 a day for the first 28, then 10 and 5 in the charted window.
        $accepted[] = match ($day) {
            1 => 10,
            0 => 5,
            default => 100,
        };
        $rateLimited[] = $day === 0 ? 7 : 0;
    }

    return [
        'intervals' => $intervals,
        'groups' => [
            [
                'by' => ['outcome' => 'accepted'],
                'series' => ['sum(quantity)' => $accepted],
            ],
            [
                'by' => ['outcome' => 'rate_limited'],
                'series' => ['sum(quantity)' => $rateLimited],
            ],
            [
                // Not charted and not billed, so it must be ignored entirely.
                'by' => ['outcome' => 'client_discard'],
                'series' => ['sum(quantity)' => array_fill(0, 30, 999)],
            ],
        ],
    ];
}

/**
 * Two releases, in the order Sentry itself returns them - newest first.
 *
 * The order is the fixture's whole point alongside the count: the mapper passes
 * Sentry's ranking through rather than re-sorting, so a sort accidentally
 * introduced here would show the timeline upside down.
 *
 * @return list<array<string, mixed>>
 */
function sentryReleasesBody(): array
{
    return [
        [
            'version' => '1a2b3c4d5e6f7a8b9c0d',
            'shortVersion' => '1a2b3c4',
            'newGroups' => 3,
            'dateCreated' => '2026-09-01T09:00:00Z',
            'lastDeploy' => [
                'dateFinished' => '2026-09-02T10:30:00Z',
                'environment' => 'production',
            ],
        ],
        [
            'version' => '9f8e7d6c5b4a3f2e1d0c',
            'shortVersion' => '9f8e7d6',
            'newGroups' => 0,
            'dateCreated' => '2026-08-28T09:00:00Z',
            'lastDeploy' => [
                'dateFinished' => '2026-08-28T11:00:00Z',
                'environment' => 'production',
            ],
        ],
    ];
}

/**
 * Route each faked response by which endpoint was asked for.
 *
 * Pass an Http::response() in place of a body to make one half fail without
 * touching the other two.
 */
function fakeSentry(mixed $issues = null, mixed $stats = null, mixed $releases = null): void
{
    $issues ??= sentryIssuesBody();
    $stats ??= sentryStatsBody();
    $releases ??= sentryReleasesBody();

    Http::fake([
        SENTRY => function (Request $request) use ($issues, $stats, $releases) {
            $body = match (true) {
                str_contains($request->url(), '/issues/') => $issues,
                str_contains($request->url(), '/stats_v2/') => $stats,
                default => $releases,
            };

            // Http::response() hands back a promise, not an array, so a body
            // given as one is returned untouched.
            return is_array($body) ? Http::response($body) : $body;
        },
    ]);
}

/** Sentry requests only - Inertia's SSR gateway shares the same recorder. */
function sentryCalls(?string $endpoint = null): int
{
    return Http::recorded(
        static fn ($request): bool => str_contains($request->url(), 'us.sentry.io')
            && ($endpoint === null || str_contains($request->url(), $endpoint)),
    )->count();
}

function assertSentryNotCalled(): void
{
    expect(sentryCalls())->toBe(0);
}

/**
 * The asset version the middleware will compare against, so a partial reload
 * is not answered with a 409.
 */
function sentryInertiaVersion(): string
{
    return (string) resolve(HandleInertiaRequests::class)->version(request());
}

function insights(): ErrorInsights
{
    return resolve(ErrorInsights::class);
}
