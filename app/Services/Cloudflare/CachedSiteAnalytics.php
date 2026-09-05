<?php

declare(strict_types=1);

namespace App\Services\Cloudflare;

use App\Enums\AnalyticsRange;
use Illuminate\Support\Facades\Cache;

/**
 * A short TTL in front of SiteAnalytics.
 *
 * This is the application's first cache key. The content pipeline deliberately
 * has none - markdown is compiled into a column on save, so there is nothing to
 * invalidate (see .ai/rules/concerns.md). The difference here is that the data
 * is remote, rate-limited, and already stale by a few minutes when it arrives:
 * Cloudflare's own RUM aggregation lags, so fifteen minutes costs no accuracy a
 * reader would notice and stops a page refresh from being an API call.
 *
 * No manual invalidation, by design. The key carries the range, and the only
 * thing that changes the answer is time passing.
 *
 * @phpstan-import-type AnalyticsSummary from SiteAnalytics
 */
final readonly class CachedSiteAnalytics
{
    private const TTL_MINUTES = 15;

    public function __construct(private SiteAnalytics $analytics) {}

    public function isConfigured(): bool
    {
        return $this->analytics->isConfigured();
    }

    /**
     * @return AnalyticsSummary
     */
    public function summary(AnalyticsRange $range): array
    {
        // An unconfigured or failed lookup must not be cached for fifteen
        // minutes - that would turn a fixed token into a quarter hour of
        // still-broken dashboard.
        if (! $this->isConfigured()) {
            return $this->analytics->summary($range);
        }

        $summary = Cache::remember(
            "analytics:cloudflare:{$range->value}",
            now()->addMinutes(self::TTL_MINUTES),
            fn (): array => $this->analytics->summary($range),
        );

        if (($summary['error'] ?? null) !== null) {
            Cache::forget("analytics:cloudflare:{$range->value}");
        }

        return $summary;
    }
}
