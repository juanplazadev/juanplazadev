/**
 * Mirrors App\Services\Sentry\ErrorInsights::deployments().
 *
 * Split from ./errors because the two answer different questions on different
 * pages, and because this one takes no range: Sentry's release list has no
 * statsPeriod, so the answer is the same whichever window the panel is showing.
 */

export type ErrorRelease = {
    version: string;
    shortVersion: string;
    /** Issues Sentry first saw in this release. */
    newGroups: number;
    deployedAt: string | null;
    /** Null for a release Sentry inferred from an event rather than a deploy. */
    environment: string | null;
    /**
     * The release's page in Sentry's web UI.
     *
     * Constructed server-side rather than returned by the API, unlike an
     * issue's permalink - the release endpoint hands back no link to itself.
     * Null when no API URL is configured, so the row simply drops its link
     * instead of pointing at a half-built one.
     */
    permalink: string | null;
};

export type Deployments = {
    generatedAt: string;
    /**
     * Non-null means the page renders its error state.
     *
     * Distinct from an empty `releases`, and the distinction is the point: an
     * account whose pipeline has never tagged a release honestly has none, and
     * that must not look the same as Sentry being unreachable.
     */
    error: string | null;
    /**
     * Newest first, in Sentry's own order. One entry per version rather than
     * per deploy event, so redeploying an unchanged commit refreshes an entry
     * instead of adding one.
     */
    releases: ErrorRelease[];
};
