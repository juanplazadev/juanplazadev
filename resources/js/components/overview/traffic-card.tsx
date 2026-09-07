import { ChartLine } from 'lucide-react';
import { Suspense, lazy } from 'react';

import Sparkline from '@/components/admin/sparkline';
import SectionCard from '@/components/overview/section-card';
import { analytics } from '@/routes/admin';
import type { Analytics } from '@/types/analytics';

/*
 * Module scope, not inside the component: lazy() called during render creates a
 * new component type every pass and remounts the chart on each one.
 */
const TrafficAreaChart = lazy(
    () => import('@/components/overview/traffic-area-chart'),
);

/** Matches the chart's own height, so the swap does not resize the card. */
const CHART_HEIGHT = 'h-40';

/**
 * A week of visitors, with the shape drawn properly.
 *
 * recharts arrives through lazy() rather than a plain import, which keeps the
 * admin root's entry chunk off the chart bundle while still giving the overview
 * real axes. The sparkline is the fallback rather than a skeleton: the shape of
 * the week is the point of the card, and it can be drawn from data already in
 * hand while the chunk is still in flight.
 */
export default function TrafficCard({ traffic }: { traffic: Analytics }) {
    const { totals, series, error } = traffic;

    return (
        <SectionCard
            title="Traffic"
            icon={ChartLine}
            href={analytics.url()}
            linkLabel="Full report"
        >
            {error ? (
                <p className="text-muted-foreground mt-3 text-sm">{error}</p>
            ) : (
                <>
                    <p className="text-foreground font-display mt-2 text-3xl font-semibold">
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

                    <div className={`mt-4 ${CHART_HEIGHT}`}>
                        {series.length > 1 ? (
                            <Suspense
                                fallback={
                                    <ChartPending
                                        counts={series.map(
                                            (point) => point.visits,
                                        )}
                                    />
                                }
                            >
                                <TrafficAreaChart series={series} />
                            </Suspense>
                        ) : (
                            <p className="text-muted-foreground text-xs">
                                Not enough days recorded to chart yet.
                            </p>
                        )}
                    </div>

                    <p className="text-muted-foreground mt-2 text-xs">
                        {topPath(traffic)}
                    </p>
                </>
            )}
        </SectionCard>
    );
}

/** The sparkline, centred in the box the chart is about to fill. */
function ChartPending({ counts }: { counts: number[] }) {
    return (
        <div className="flex h-full items-center">
            <Sparkline counts={counts} className="h-16 w-full" />
        </div>
    );
}

/** The busiest page in the window, which on a portfolio is the story. */
function topPath(traffic: Analytics): string {
    const top = traffic.breakdowns.topPaths[0];

    if (!top) return 'No pages recorded yet';

    return `Busiest: ${top.label} · ${top.visits.toLocaleString()} visits`;
}
