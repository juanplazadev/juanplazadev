import Sparkline from '@/components/admin/sparkline';
import SectionCard from '@/components/overview/section-card';
import { analytics } from '@/routes/admin';
import type { Analytics } from '@/types/analytics';

/**
 * A week of visitors, at a glance.
 *
 * The shape comes from the shared SVG sparkline rather than recharts, which is
 * what keeps the admin root off the chart bundle entirely. The full chart, with
 * axes and a tooltip and both series, is one click away on the traffic page.
 */
export default function TrafficCard({ traffic }: { traffic: Analytics }) {
    const { totals, series, error } = traffic;

    return (
        <SectionCard
            title="Traffic"
            href={analytics.url()}
            linkLabel="Full report"
        >
            {error ? (
                <p className="text-muted-foreground mt-3 text-sm">{error}</p>
            ) : (
                <>
                    <p className="text-foreground font-display mt-2 text-3xl font-semibold tabular-nums">
                        {totals.visits.toLocaleString()}
                        <span className="text-muted-foreground text-base font-normal">
                            {' '}
                            visits
                        </span>
                    </p>

                    <p className="text-muted-foreground mt-1 text-xs">
                        {totals.pageViews.toLocaleString()} pageviews ·{' '}
                        {totals.visits > 0
                            ? `${(totals.pageViews / totals.visits).toFixed(1)} per visit`
                            : 'no visits yet'}
                    </p>

                    <Sparkline
                        counts={series.map((point) => point.visits)}
                        className="mt-4 h-10 w-full"
                    />

                    <p className="text-muted-foreground mt-2 text-xs">
                        {topPath(traffic)}
                    </p>
                </>
            )}
        </SectionCard>
    );
}

/** The busiest page in the window, which on a portfolio is the story. */
function topPath(traffic: Analytics): string {
    const top = traffic.breakdowns.topPaths[0];

    if (!top) return 'No pages recorded yet';

    return `Busiest: ${top.label} · ${top.visits.toLocaleString()} visits`;
}
