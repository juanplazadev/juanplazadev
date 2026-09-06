/**
 * Mirrors App\Services\Sentry\ErrorInsights::summary().
 *
 * Sentry's own vocabulary - shortId, groupStatsPeriod, sum(quantity) grouped by
 * outcome - stops at that class and never reaches this file. What arrives here
 * is already ranked, already trimmed to the selected range, and already
 * separated into what the plan charged for and what it dropped.
 *
 * Releases are not here. They come from ErrorInsights::deployments() and live
 * in ./deployments, because they do not vary with the selected range and this
 * page no longer shows them.
 */

export type ErrorPoint = {
    /** ISO date, oldest first. */
    date: string;
    /** Events the plan was charged for. */
    accepted: number;
    /** Rate limited, filtered or invalid - ingested but not billed. */
    dropped: number;
};

export type ErrorIssue = {
    id: string;
    /** Sentry's human reference, e.g. JUANPLAZADEV-7. */
    shortId: string;
    title: string;
    /** Where it fired: a route, a job, a file. Empty when Sentry has none. */
    culprit: string;
    level: string;
    count: number;
    userCount: number;
    lastSeen: string;
    permalink: string;
    /** Hourly counts over the last 24h. Independent of the selected range. */
    sparkline: number[];
};

export type ErrorTotals = {
    /** Accepted events within the selected range. */
    errors: number;
    dropped: number;
    /** Summed across the ranked issues, so it undercounts past the top ten. */
    users: number;
    issues: number;
    /** Accepted events across the full 30 days - the quota burn. */
    accepted: number;
    /** The plan's monthly allowance. Config, not API: Sentry never reports it. */
    quota: number;
};

export type ErrorInsights = {
    range: string;
    label: string;
    generatedAt: string;
    /** Non-null means the panel renders its error state instead of numbers. */
    error: string | null;
    totals: ErrorTotals;
    series: ErrorPoint[];
    issues: ErrorIssue[];
};
