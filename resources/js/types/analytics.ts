/**
 * Mirrors App\Services\Cloudflare\SiteAnalytics::summary().
 *
 * Cloudflare's own vocabulary - siteTag, rumPageloadEventsAdaptiveGroups,
 * sampleInterval - stops at that class and never reaches this file. What
 * arrives here is already corrected for sampling and ordered.
 */

export type AnalyticsPoint = {
    /** ISO date, oldest first. */
    date: string;
    visits: number;
    pageViews: number;
};

export type AnalyticsRow = {
    label: string;
    visits: number;
    pageViews: number;
};

export type AnalyticsTotals = {
    visits: number;
    pageViews: number;
    /** Edge requests. Zero when the site is not proxied through Cloudflare. */
    requests: number;
    bytes: number;
    /** 0-1, or null when there is no zone data to derive it from. */
    cacheHitRatio: number | null;
};

/** Alias => rows. Keys match SiteAnalytics::BREAKDOWNS. */
export type AnalyticsBreakdowns = {
    topPaths: AnalyticsRow[];
    topReferrers: AnalyticsRow[];
    topCountries: AnalyticsRow[];
    browsers: AnalyticsRow[];
    devices: AnalyticsRow[];
};

export type Analytics = {
    range: string;
    label: string;
    generatedAt: string;
    /** Non-null means the panel renders its error state instead of numbers. */
    error: string | null;
    totals: AnalyticsTotals;
    series: AnalyticsPoint[];
    breakdowns: AnalyticsBreakdowns;
};

export type AnalyticsRangeOption = {
    value: string;
    label: string;
};
