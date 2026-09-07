<?php

declare(strict_types=1);

namespace App\Services\Cloudflare;

use App\Enums\AnalyticsRange;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Cloudflare's vocabulary stops here.
 *
 * The seam for this feature, the way resources/js/lib/weather.ts is for
 * Open-Meteo: nothing above this class knows what a siteTag is, that visits and
 * pageviews come from different aggregations, or that the visitor numbers and
 * the edge numbers arrive from two differently-scoped halves of one document.
 *
 * One request, not seven. GraphQL aliases let the same dataset be grouped six
 * ways in a single POST, so the whole panel costs one round trip. The cost of
 * that economy is that ONE invalid dimension name fails the ENTIRE document,
 * aliases included - which is why the breakdowns are declared as data in
 * BREAKDOWNS below and can be commented out one at a time while bisecting.
 *
 * @phpstan-type AnalyticsTotals array{visits: int, pageViews: int, requests: int, bytes: int, cacheHitRatio: float|null}
 * @phpstan-type AnalyticsTotalsZone array{requests: int, bytes: int, cacheHitRatio: float|null}
 * @phpstan-type AnalyticsRow array{label: string, visits: int, pageViews: int}
 * @phpstan-type AnalyticsSummary array{
 *     range: string,
 *     label: string,
 *     generatedAt: string,
 *     error: string|null,
 *     totals: AnalyticsTotals,
 *     series: list<array{date: string, visits: int, pageViews: int}>,
 *     breakdowns: array<string, list<AnalyticsRow>>,
 * }
 */
final readonly class SiteAnalytics
{
    /**
     * Ranked breakdowns, as alias => RUM dimension.
     *
     * Verify a name against the live schema before adding one here:
     *   {__type(name:"AccountRumPageloadEventsAdaptiveGroupsDimensions"){fields{name}}}
     *
     * Two of these lie about what they return, and both were confirmed against
     * live data rather than assumed:
     *
     * - `countryName` reports the ISO 3166-1 alpha-2 CODE, not a name. Rows
     *   arrive as `US`, and the frontend resolves the display name and the flag
     *   from it. There is no country-code dimension to switch to - the schema
     *   holds 21 dimensions and this is the only geographic one.
     * - `userAgentBrowser` folds the platform into a CamelCase string, so the
     *   live values are `MobileSafari` and `FirefoxMobile`, not `Safari` and
     *   `Firefox`. row-glyphs.tsx matches on a substring for that reason.
     */
    private const array BREAKDOWNS = [
        'topPaths' => 'requestPath',
        'topReferrers' => 'refererHost',
        'topCountries' => 'countryName',
        'browsers' => 'userAgentBrowser',
        'devices' => 'deviceType',
    ];

    public function __construct(
        private CloudflareGraphQlClient $client,
        private ?string $accountId,
        private ?string $siteTag,
        private ?string $zoneId,
    ) {}

    /**
     * True when the RUM half can be queried. The zone half is optional on top.
     */
    public function isConfigured(): bool
    {
        return $this->client->isConfigured()
            && $this->accountId !== null && $this->accountId !== ''
            && $this->siteTag !== null && $this->siteTag !== '';
    }

    /**
     * @return AnalyticsSummary
     */
    public function summary(AnalyticsRange $range): array
    {
        if (! $this->isConfigured()) {
            return $this->empty($range, 'Cloudflare analytics is not configured.');
        }

        try {
            $rum = $this->client->query($this->rumDocument(), $this->rumVariables($range));
        } catch (Throwable $throwable) {
            // The dashboard degrades to an error card rather than a 500: an
            // upstream outage should not take down the page it decorates.
            Log::warning('Cloudflare analytics request failed.', ['exception' => $throwable]);

            return $this->empty($range, 'Could not reach Cloudflare.');
        }

        return $this->map($range, $rum, $this->zoneTotals($range));
    }

    /**
     * @param  array<string, mixed>  $rum
     * @param  AnalyticsTotalsZone  $zone
     * @return AnalyticsSummary
     */
    private function map(AnalyticsRange $range, array $rum, array $zone): array
    {
        $account = $this->firstNode($rum, 'accounts');

        $series = $this->mapSeries($this->rows($account, 'series'));

        $breakdowns = [];
        foreach (self::BREAKDOWNS as $alias => $dimension) {
            $breakdowns[$alias] = $this->mapBreakdown($this->rows($account, $alias), $dimension);
        }

        return [
            'range' => $range->value,
            'label' => $range->label(),
            'generatedAt' => now()->toIso8601String(),
            'error' => null,
            'totals' => [
                'visits' => array_sum(array_column($series, 'visits')),
                'pageViews' => array_sum(array_column($series, 'pageViews')),
                'requests' => $zone['requests'],
                'bytes' => $zone['bytes'],
                'cacheHitRatio' => $zone['cacheHitRatio'],
            ],
            'series' => $series,
            'breakdowns' => $breakdowns,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array{date: string, visits: int, pageViews: int}>
     */
    private function mapSeries(array $rows): array
    {
        $series = [];

        foreach ($rows as $row) {
            $date = $this->dimension($row, 'date');

            if ($date === null) {
                continue;
            }

            $series[] = [
                'date' => $date,
                'visits' => $this->visits($row),
                'pageViews' => $this->pageViews($row),
            ];
        }

        usort($series, static fn (array $a, array $b): int => $a['date'] <=> $b['date']);

        return $series;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<AnalyticsRow>
     */
    private function mapBreakdown(array $rows, string $dimension): array
    {
        $mapped = [];

        // An empty refererHost is direct traffic, which is a fact. An empty
        // anything else is a fact Cloudflare did not have, and calling that
        // "Direct" reads as nonsense the moment the row is a device or a
        // country rather than a referrer.
        $missing = $dimension === 'refererHost' ? 'Direct' : 'Unknown';

        foreach ($rows as $row) {
            $label = $this->dimension($row, $dimension);

            $mapped[] = [
                'label' => ($label === null || $label === '') ? $missing : $label,
                'visits' => $this->visits($row),
                'pageViews' => $this->pageViews($row),
            ];
        }

        usort($mapped, static fn (array $a, array $b): int => $b['visits'] <=> $a['visits']);

        return $mapped;
    }

    /**
     * Requests, bandwidth and cache hit ratio from the zone half.
     *
     * Fetched separately and failing on its own. The zone is optional - the site
     * may not be proxied, the token may lack Zone Analytics, and the plan may
     * refuse the window - and none of those is a reason to lose the visitor
     * numbers that did arrive. A failure here is logged and returns zeroes.
     *
     * httpRequests1dGroups rather than httpRequestsAdaptiveGroups: the adaptive
     * dataset caps the window at one day on a Free plan, while the daily rollups
     * reach thirty and report cachedRequests directly.
     *
     * @return AnalyticsTotalsZone
     */
    private function zoneTotals(AnalyticsRange $range): array
    {
        $none = ['requests' => 0, 'bytes' => 0, 'cacheHitRatio' => null];

        if ($this->zoneId === null || $this->zoneId === '') {
            return $none;
        }

        try {
            $data = $this->client->query($this->zoneDocument(), $this->zoneVariables($range));
        } catch (Throwable $throwable) {
            Log::info('Cloudflare zone analytics unavailable.', ['exception' => $throwable]);

            return $none;
        }

        $rows = $this->rows($this->firstNode($data, 'zones'), 'httpTraffic');

        if ($rows === []) {
            return $none;
        }

        $requests = 0;
        $bytes = 0;
        $cached = 0;

        foreach ($rows as $row) {
            $sum = $this->sum($row);
            $requests += (int) ($sum['requests'] ?? 0);
            $bytes += (int) ($sum['bytes'] ?? 0);
            $cached += (int) ($sum['cachedRequests'] ?? 0);
        }

        return [
            'requests' => $requests,
            'bytes' => $bytes,
            'cacheHitRatio' => $requests > 0 ? round($cached / $requests, 4) : null,
        ];
    }

    /**
     * Visits, corrected for sampling.
     *
     * Cloudflare picks a sampling rate between 0.0001% and 100% based on volume
     * and the filters applied, and reports it per group as sampleInterval. The
     * raw number is therefore a count of the rows it kept, not of what happened;
     * multiplying is what makes the dashboard agree with Cloudflare's own.
     *
     * @param  array<string, mixed>  $row
     */
    private function visits(array $row): int
    {
        return (int) round((int) ($this->sum($row)['visits'] ?? 0) * $this->sampleInterval($row));
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function pageViews(array $row): int
    {
        return (int) round((int) ($row['count'] ?? 0) * $this->sampleInterval($row));
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function sampleInterval(array $row): float
    {
        $avg = $row['avg'] ?? null;

        if (! is_array($avg)) {
            return 1.0;
        }

        $interval = (float) ($avg['sampleInterval'] ?? 1);

        // A zero or absent interval means unsampled, not "multiply by nothing".
        return $interval > 0 ? $interval : 1.0;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function sum(array $row): array
    {
        $sum = $row['sum'] ?? [];

        return is_array($sum) ? $sum : [];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function dimension(array $row, string $key): ?string
    {
        $dimensions = $row['dimensions'] ?? [];

        if (! is_array($dimensions) || ! array_key_exists($key, $dimensions)) {
            return null;
        }

        $value = $dimensions[$key];

        return is_scalar($value) ? (string) $value : null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function firstNode(array $data, string $key): array
    {
        $viewer = $data['viewer'] ?? [];

        if (! is_array($viewer)) {
            return [];
        }

        $nodes = $viewer[$key] ?? [];

        if (! is_array($nodes) || $nodes === []) {
            return [];
        }

        $first = reset($nodes);

        return is_array($first) ? $first : [];
    }

    /**
     * @param  array<string, mixed>  $node
     * @return list<array<string, mixed>>
     */
    private function rows(array $node, string $alias): array
    {
        $rows = $node[$alias] ?? [];

        if (! is_array($rows)) {
            return [];
        }

        return array_values(array_filter($rows, is_array(...)));
    }

    /**
     * @return array<string, mixed>
     */
    private function rumVariables(AnalyticsRange $range): array
    {
        $filter = $range->toFilter();

        return [
            'accountTag' => $this->accountId,
            'siteTag' => $this->siteTag,
            'start' => $filter['start'],
            'end' => $filter['end'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function zoneVariables(AnalyticsRange $range): array
    {
        $filter = $range->toDateFilter();

        return [
            'zoneTag' => $this->zoneId,
            'start' => $filter['start'],
            'end' => $filter['end'],
        ];
    }

    private function zoneDocument(): string
    {
        return <<<'GRAPHQL'
            query ZoneTraffic($zoneTag: String!, $start: Date!, $end: Date!) {
                viewer {
                    zones(filter: { zoneTag: $zoneTag }) {
                        httpTraffic: httpRequests1dGroups(
                            limit: 1000
                            orderBy: [date_ASC]
                            filter: { date_geq: $start, date_leq: $end }
                        ) {
                            sum { requests cachedRequests bytes }
                            dimensions { date }
                        }
                    }
                }
            }
            GRAPHQL;
    }

    private function rumDocument(): string
    {
        $breakdowns = '';

        foreach (self::BREAKDOWNS as $alias => $dimension) {
            $breakdowns .= <<<GRAPHQL

                    {$alias}: rumPageloadEventsAdaptiveGroups(
                        limit: 10
                        orderBy: [sum_visits_DESC]
                        filter: { siteTag: \$siteTag, datetime_geq: \$start, datetime_leq: \$end }
                    ) {
                        count
                        sum { visits }
                        avg { sampleInterval }
                        dimensions { {$dimension} }
                    }
            GRAPHQL;
        }

        return <<<GRAPHQL
            query SiteAnalytics(\$accountTag: String!, \$siteTag: String!, \$start: Time!, \$end: Time!) {
                viewer {
                    accounts(filter: { accountTag: \$accountTag }) {
                        series: rumPageloadEventsAdaptiveGroups(
                            limit: 1000
                            orderBy: [date_ASC]
                            filter: { siteTag: \$siteTag, datetime_geq: \$start, datetime_leq: \$end }
                        ) {
                            count
                            sum { visits }
                            avg { sampleInterval }
                            dimensions { date }
                        }
                        {$breakdowns}
                    }
                }
            }
            GRAPHQL;
    }

    /**
     * @return AnalyticsSummary
     */
    private function empty(AnalyticsRange $range, string $error): array
    {
        return [
            'range' => $range->value,
            'label' => $range->label(),
            'generatedAt' => now()->toIso8601String(),
            'error' => $error,
            'totals' => ['visits' => 0, 'pageViews' => 0, 'requests' => 0, 'bytes' => 0, 'cacheHitRatio' => null],
            'series' => [],
            'breakdowns' => array_fill_keys(array_keys(self::BREAKDOWNS), []),
        ];
    }
}
