import StatTile from '@/components/admin/stat-tile';
import { Skeleton } from '@/components/ui/skeleton';
import type { Analytics } from '@/types/analytics';
import type { ErrorInsights } from '@/types/errors';
import type { ContentSnapshot } from '@/types/overview';

type HealthStripProps = {
    content: ContentSnapshot;
    /** Undefined until the traffic group resolves. */
    traffic?: Analytics;
    /** Undefined until the health group resolves. */
    health?: ErrorInsights;
};

/**
 * The four numbers worth seeing before anything else.
 *
 * Each tile owns its own loading state rather than the row sharing one. The
 * drafts count comes from the database and is there on first paint; the other
 * three come from two vendors fetched in parallel, and a row that waited for
 * the slowest of them would hide a number it already had.
 */
export default function HealthStrip({
    content,
    traffic,
    health,
}: HealthStripProps) {
    const drafts = content.posts.drafts + content.architectures.drafts;

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
                label="Visits"
                value={
                    traffic ? (
                        traffic.error ? (
                            '—'
                        ) : (
                            traffic.totals.visits.toLocaleString()
                        )
                    ) : (
                        <Pending />
                    )
                }
                hint="Last 7 days"
            />

            <StatTile
                label="Unresolved"
                value={
                    health ? (
                        health.error ? (
                            '—'
                        ) : (
                            health.totals.issues.toLocaleString()
                        )
                    ) : (
                        <Pending />
                    )
                }
                hint={health?.error ? 'Sentry unreachable' : 'Open issues'}
            />

            <StatTile
                label="Drafts"
                value={drafts.toLocaleString()}
                hint={`${content.posts.published + content.architectures.published} published`}
            />

            <StatTile
                label="Quota"
                value={
                    health ? (
                        health.error ? (
                            '—'
                        ) : (
                            `${quotaShare(health)}%`
                        )
                    ) : (
                        <Pending />
                    )
                }
                hint="Of the monthly allowance"
            />
        </div>
    );
}

/** Sized to the digits it replaces, so the tile does not resize on arrival. */
function Pending() {
    return <Skeleton className="my-1 inline-block h-7 w-16 align-middle" />;
}

function quotaShare(health: ErrorInsights): number {
    const { accepted, quota } = health.totals;

    return quota > 0 ? Math.min(Math.round((accepted / quota) * 100), 100) : 0;
}
