<?php

declare(strict_types=1);

namespace App\Services\Sentry;

use App\Enums\AnalyticsRange;
use Illuminate\Support\Facades\Cache;

/**
 * A short TTL in front of ErrorInsights.
 *
 * Same fifteen minutes as CachedSiteAnalytics, for a sharper reason. Sentry's
 * documented rate limit is applied per caller identity rather than per token,
 * so every uncached dashboard load spends from a budget shared with anything
 * else this account automates. Fifteen minutes costs no accuracy a reader would
 * notice - the free plan's own ingest and aggregation lag more than that.
 *
 * No manual invalidation, by design: the key carries the range, and the only
 * thing that changes the answer is time passing.
 *
 * The deployments key carries no range, because the list it holds has none -
 * /releases/ takes no statsPeriod, so keying it by a window the answer ignores
 * would cache the same list twice and halve the value of the cache.
 *
 * @phpstan-import-type DeploymentsSummary from ErrorInsights
 * @phpstan-import-type ErrorInsightsSummary from ErrorInsights
 */
final readonly class CachedErrorInsights
{
    private const int TTL_MINUTES = 15;

    public function __construct(private ErrorInsights $insights) {}

    public function isConfigured(): bool
    {
        return $this->insights->isConfigured();
    }

    /**
     * @return ErrorInsightsSummary
     */
    public function summary(AnalyticsRange $range): array
    {
        // An unconfigured or failed lookup must not be cached for fifteen
        // minutes - that would turn a fixed token into a quarter hour of
        // still-broken page.
        if (! $this->isConfigured()) {
            return $this->insights->summary($range);
        }

        $key = "insights:sentry:{$range->value}";

        $summary = Cache::remember(
            $key,
            now()->addMinutes(self::TTL_MINUTES),
            fn (): array => $this->insights->summary($range),
        );

        if (($summary['error'] ?? null) !== null) {
            Cache::forget($key);
        }

        return $summary;
    }

    /**
     * @return DeploymentsSummary
     */
    public function deployments(): array
    {
        if (! $this->isConfigured()) {
            return $this->insights->deployments();
        }

        $key = 'deployments:sentry';

        $deployments = Cache::remember(
            $key,
            now()->addMinutes(self::TTL_MINUTES),
            fn (): array => $this->insights->deployments(),
        );

        if (($deployments['error'] ?? null) !== null) {
            Cache::forget($key);
        }

        return $deployments;
    }
}
