<?php

declare(strict_types=1);

namespace App\Services\Sentry;

use App\Enums\AnalyticsRange;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sentry's vocabulary stops here.
 *
 * The seam for the errors page, the way SiteAnalytics is for Cloudflare:
 * nothing above this class knows what a shortId is, that `sum(quantity)`
 * grouped by outcome is how the quota is counted, or that the sparkline behind
 * each issue arrives on a different resolution from the chart above it.
 *
 * Two requests for the errors page, and the split is deliberate for the same
 * reason the zone half is separate in SiteAnalytics. The issue list is the
 * essential half; the stats are decoration. Sentry rate-limits on caller
 * identity, so the cheapest way for this page to break is for one throttled
 * call to take the other with it. The optional half therefore catches its own
 * throwable and returns a neutral value.
 *
 * Deploys are a third request and deliberately not part of summary(). They
 * answer a different question, on a different page, and - unlike everything
 * else here - the answer does not depend on the selected range, so folding them
 * in would key a range-independent list by range and make the errors page pay
 * for data it no longer shows. See deployments().
 *
 * @phpstan-type ErrorInsightsTotals array{errors: int, dropped: int, users: int, issues: int, accepted: int, quota: int}
 * @phpstan-type ErrorInsightsPoint array{date: string, accepted: int, dropped: int}
 * @phpstan-type ErrorInsightsIssue array{id: string, shortId: string, title: string, culprit: string, level: string, count: int, userCount: int, lastSeen: string, permalink: string, sparkline: list<int>}
 * @phpstan-type ErrorInsightsRelease array{version: string, shortVersion: string, newGroups: int, deployedAt: string|null, environment: string|null, permalink: string|null}
 * @phpstan-type ErrorInsightsStats array{series: list<ErrorInsightsPoint>, accepted: int}
 * @phpstan-type ErrorInsightsSummary array{
 *     range: string,
 *     label: string,
 *     generatedAt: string,
 *     error: string|null,
 *     totals: ErrorInsightsTotals,
 *     series: list<ErrorInsightsPoint>,
 *     issues: list<ErrorInsightsIssue>,
 * }
 * @phpstan-type DeploymentsSummary array{
 *     generatedAt: string,
 *     error: string|null,
 *     releases: list<ErrorInsightsRelease>,
 * }
 */
final readonly class ErrorInsights
{
    /**
     * How many unresolved issues the page ranks.
     */
    private const int ISSUE_LIMIT = 10;

    /**
     * How many releases the deployments page lists.
     *
     * Releases, not deploy events: the list endpoint returns one entry per
     * version carrying its most recent deploy, so redeploying an unchanged
     * commit refreshes a row rather than adding one. A literal per-deploy log
     * would mean a /releases/{version}/deploys/ call each, which is the one
     * shape this must not take - see the note on rate limiting above.
     *
     * Twenty rather than a handful because /releases/ takes per_page and costs
     * one request either way. The old limit of five was sized for a card in a
     * column; the page it now fills can show a real history for the same price.
     */
    private const int RELEASE_LIMIT = 20;

    /**
     * The window the quota is counted over, and the plan's retention ceiling.
     *
     * Pinned rather than derived from the selected range: the free plan's quota
     * resets monthly, so "how much of it is gone" is only ever a thirty day
     * question. The chart trims this same response down to the chosen range, so
     * both answers still cost one request.
     */
    private const string STATS_PERIOD = '30d';

    /**
     * Outcomes that consumed nothing but are still worth charting.
     */
    private const array DROPPED_OUTCOMES = ['rate_limited', 'filtered', 'invalid', 'abuse'];

    public function __construct(
        private SentryApiClient $client,
        private ?string $organization,
        private ?string $project,
        private int $monthlyQuota,
        private ?string $apiUrl = null,
    ) {}

    /**
     * True when the issue list can be fetched. The project slug is optional on
     * top: without one Sentry answers for every project the token can see,
     * which for a single-project account is the same answer.
     */
    public function isConfigured(): bool
    {
        return $this->client->isConfigured()
            && $this->organization !== null && $this->organization !== '';
    }

    /**
     * @return ErrorInsightsSummary
     */
    public function summary(AnalyticsRange $range): array
    {
        if (! $this->isConfigured()) {
            return $this->empty($range, 'Sentry is not configured.');
        }

        try {
            $issues = $this->issues($range);
        } catch (Throwable $throwable) {
            // The page degrades to an error card rather than a 500, and a 429
            // in particular must not cost a dashboard load.
            Log::warning('Sentry issues request failed.', ['exception' => $throwable]);

            return $this->empty($range, 'Could not reach Sentry.');
        }

        return $this->map($range, $issues, $this->stats($range));
    }

    /**
     * The release history, newest first. One request.
     *
     * Deliberately separate from summary() and deliberately not taking a range:
     * /releases/ has no statsPeriod, so the answer is the same whichever window
     * the rest of the panel is showing. That is also why the page built on this
     * carries no range picker - a control that changed nothing would be worse
     * than no control.
     *
     * Sentry answers already ordered, so the list is passed through in the
     * order it arrives rather than re-sorted here - `dateCreated` and
     * `lastDeploy` disagree for a redeployed commit, and Sentry's own ranking
     * is the one the web UI shows.
     *
     * Unlike stats(), a failure here is reported rather than swallowed. As an
     * optional half of summary() an empty list was the right answer to a failed
     * call, because losing the deploy card must never cost the issue list. On a
     * page that shows nothing else, that same empty list would render "no
     * releases yet" while Sentry was simply unreachable - a quiet lie about the
     * one thing the page exists to answer.
     *
     * An account whose pipeline has never tagged a release genuinely answers
     * with nothing at all, so an empty list with a null error stays a normal
     * state and the two must render differently.
     *
     * @return DeploymentsSummary
     */
    public function deployments(): array
    {
        if (! $this->isConfigured()) {
            return $this->noDeployments('Sentry is not configured.');
        }

        try {
            return [
                'generatedAt' => now()->toIso8601String(),
                'error' => null,
                'releases' => $this->releases(),
            ];
        } catch (Throwable $throwable) {
            Log::warning('Sentry releases request failed.', ['exception' => $throwable]);

            return $this->noDeployments('Could not reach Sentry.');
        }
    }

    /**
     * @param  list<ErrorInsightsIssue>  $issues
     * @param  ErrorInsightsStats  $stats
     * @return ErrorInsightsSummary
     */
    private function map(AnalyticsRange $range, array $issues, array $stats): array
    {
        $series = $stats['series'];

        return [
            'range' => $range->value,
            'label' => $range->label(),
            'generatedAt' => now()->toIso8601String(),
            'error' => null,
            'totals' => [
                'errors' => array_sum(array_column($series, 'accepted')),
                'dropped' => array_sum(array_column($series, 'dropped')),
                'users' => array_sum(array_column($issues, 'userCount')),
                'issues' => count($issues),
                'accepted' => $stats['accepted'],
                'quota' => $this->monthlyQuota,
            ],
            'series' => $series,
            'issues' => $issues,
        ];
    }

    /**
     * The unresolved issues, most frequent first.
     *
     * groupStatsPeriod is the sparkline's resolution and Sentry offers exactly
     * three - 24h, 14d and auto - so it is independent of the selected range.
     *
     * @return list<ErrorInsightsIssue>
     */
    private function issues(AnalyticsRange $range): array
    {
        $response = $this->client->get("/organizations/{$this->organization}/issues/", array_filter([
            'query' => 'is:unresolved',
            'statsPeriod' => $range->value,
            'groupStatsPeriod' => '24h',
            'sort' => 'freq',
            'limit' => self::ISSUE_LIMIT,
            'project' => $this->project,
        ], static fn (mixed $value): bool => $value !== null && $value !== ''));

        $issues = [];

        foreach ($response as $issue) {
            if (! is_array($issue)) {
                continue;
            }

            $issues[] = [
                'id' => (string) ($issue['id'] ?? ''),
                'shortId' => (string) ($issue['shortId'] ?? ''),
                'title' => (string) ($issue['title'] ?? 'Unknown error'),
                'culprit' => (string) ($issue['culprit'] ?? ''),
                'level' => (string) ($issue['level'] ?? 'error'),
                // count arrives as a string on this endpoint, not an integer.
                'count' => (int) ($issue['count'] ?? 0),
                'userCount' => (int) ($issue['userCount'] ?? 0),
                'lastSeen' => (string) ($issue['lastSeen'] ?? ''),
                'permalink' => (string) ($issue['permalink'] ?? ''),
                'sparkline' => $this->sparkline($issue),
            ];
        }

        return $issues;
    }

    /**
     * Accepted and dropped event counts, and the thirty day quota burn.
     *
     * Optional: a failure here costs the chart and the quota meter, never the
     * issue list.
     *
     * @return ErrorInsightsStats
     */
    private function stats(AnalyticsRange $range): array
    {
        $none = ['series' => [], 'accepted' => 0];

        try {
            $data = $this->client->get("/organizations/{$this->organization}/stats_v2/", [
                'field' => 'sum(quantity)',
                'category' => 'error',
                'groupBy' => ['outcome'],
                'statsPeriod' => self::STATS_PERIOD,
                'interval' => '1d',
                // stats_v2 filters on numeric project ids, not slugs; -1 is its
                // documented "every project this token can see".
                'project' => -1,
            ]);
        } catch (Throwable $throwable) {
            Log::info('Sentry event stats unavailable.', ['exception' => $throwable]);

            return $none;
        }

        $intervals = $this->list($data, 'intervals');

        if ($intervals === []) {
            return $none;
        }

        $accepted = array_fill(0, count($intervals), 0);
        $dropped = $accepted;

        foreach ($this->list($data, 'groups') as $group) {
            if (! is_array($group)) {
                continue;
            }

            $outcome = $this->outcome($group);

            if ($outcome !== 'accepted' && ! in_array($outcome, self::DROPPED_OUTCOMES, true)) {
                continue;
            }

            foreach ($this->quantities($group) as $index => $quantity) {
                if (! array_key_exists($index, $accepted)) {
                    continue;
                }

                if ($outcome === 'accepted') {
                    $accepted[$index] += $quantity;
                } else {
                    $dropped[$index] += $quantity;
                }
            }
        }

        $series = [];

        foreach ($intervals as $index => $interval) {
            if (! is_string($interval)) {
                continue;
            }

            $series[] = [
                'date' => mb_substr($interval, 0, 10),
                'accepted' => $accepted[$index],
                'dropped' => $dropped[$index],
            ];
        }

        return [
            // The chart shows the selected range; the quota total keeps all 30d.
            'series' => array_slice($series, -$range->days()),
            'accepted' => array_sum($accepted),
        ];
    }

    /**
     * @return DeploymentsSummary
     */
    private function noDeployments(string $error): array
    {
        return [
            'generatedAt' => now()->toIso8601String(),
            'error' => $error,
            'releases' => [],
        ];
    }

    /**
     * The raw release rows. Throws; deployments() owns the failure path.
     *
     * @return list<ErrorInsightsRelease>
     *
     * @throws SentryApiException|ConnectionException
     */
    private function releases(): array
    {
        // The project filter here is a slug, unlike stats_v2 which needs
        // numeric ids.
        $response = $this->client->get("/organizations/{$this->organization}/releases/", array_filter([
            'per_page' => self::RELEASE_LIMIT,
            'project' => $this->project,
        ], static fn (mixed $value): bool => $value !== null && $value !== ''));

        $releases = [];

        foreach ($response as $release) {
            if (! is_array($release)) {
                continue;
            }

            $version = (string) ($release['version'] ?? '');

            // A release with no version cannot be matched against the running
            // build, which is the first thing the page answers.
            if ($version === '') {
                continue;
            }

            $releases[] = [
                'version' => $version,
                'shortVersion' => (string) ($release['shortVersion'] ?? $version),
                'newGroups' => (int) ($release['newGroups'] ?? 0),
                'deployedAt' => $this->deployedAt($release),
                'environment' => $this->environment($release),
                'permalink' => $this->releaseUrl($version),
            ];
        }

        return $releases;
    }

    /**
     * The Sentry web UI's page for a release.
     *
     * Shared with the panel's Sentry console link through SentryWebUrl, which
     * owns the reasoning about which host and path form are safe to build.
     */
    private function releaseUrl(string $version): ?string
    {
        return new SentryWebUrl($this->apiUrl, $this->organization, $this->project)
            ->release($version);
    }

    /**
     * Which environment the release was last deployed to, when Sentry says.
     *
     * Null for a release Sentry auto-created from an incoming event rather than
     * from the deploy pipeline - those carry a version but never a deploy.
     *
     * @param  array<string, mixed>  $release
     */
    private function environment(array $release): ?string
    {
        $lastDeploy = $release['lastDeploy'] ?? null;

        if (! is_array($lastDeploy)) {
            return null;
        }

        $environment = $lastDeploy['environment'] ?? null;

        return is_string($environment) && $environment !== '' ? $environment : null;
    }

    /**
     * @param  array<string, mixed>  $release
     */
    private function deployedAt(array $release): ?string
    {
        $lastDeploy = $release['lastDeploy'] ?? null;

        $candidates = [
            is_array($lastDeploy) ? ($lastDeploy['dateFinished'] ?? null) : null,
            $release['dateReleased'] ?? null,
            $release['dateCreated'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && $candidate !== '') {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * The 24h event counts behind one issue, as [timestamp, count] pairs.
     *
     * @param  array<string, mixed>  $issue
     * @return list<int>
     */
    private function sparkline(array $issue): array
    {
        $stats = $issue['stats'] ?? null;

        if (! is_array($stats) || ! is_array($stats['24h'] ?? null)) {
            return [];
        }

        $counts = [];

        foreach ($stats['24h'] as $point) {
            if (is_array($point) && array_key_exists(1, $point) && is_numeric($point[1])) {
                $counts[] = (int) $point[1];
            }
        }

        return $counts;
    }

    /**
     * @param  array<string, mixed>  $group
     */
    private function outcome(array $group): ?string
    {
        $by = $group['by'] ?? null;

        if (! is_array($by)) {
            return null;
        }

        $outcome = $by['outcome'] ?? null;

        return is_string($outcome) ? $outcome : null;
    }

    /**
     * @param  array<string, mixed>  $group
     * @return list<int>
     */
    private function quantities(array $group): array
    {
        $series = $group['series'] ?? null;

        if (! is_array($series) || ! is_array($series['sum(quantity)'] ?? null)) {
            return [];
        }

        return array_values(array_map(
            static fn (mixed $value): int => is_numeric($value) ? (int) $value : 0,
            $series['sum(quantity)'],
        ));
    }

    /**
     * @param  array<mixed>  $data
     * @return list<mixed>
     */
    private function list(array $data, string $key): array
    {
        $value = $data[$key] ?? null;

        return is_array($value) ? array_values($value) : [];
    }

    /**
     * @return ErrorInsightsSummary
     */
    private function empty(AnalyticsRange $range, string $error): array
    {
        return [
            'range' => $range->value,
            'label' => $range->label(),
            'generatedAt' => now()->toIso8601String(),
            'error' => $error,
            'totals' => [
                'errors' => 0,
                'dropped' => 0,
                'users' => 0,
                'issues' => 0,
                'accepted' => 0,
                'quota' => $this->monthlyQuota,
            ],
            'series' => [],
            'issues' => [],
        ];
    }
}
