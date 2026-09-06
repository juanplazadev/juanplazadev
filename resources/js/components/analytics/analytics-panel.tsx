import { router } from '@inertiajs/react';

import EmptyCard from '@/components/admin/empty-card';
import { formatBytes } from '@/components/admin/format';
import PanelHeader from '@/components/admin/panel-header';
import RangePicker from '@/components/admin/range-picker';
import StatTile from '@/components/admin/stat-tile';
import TopList from '@/components/analytics/top-list';
import TrafficChart from '@/components/analytics/traffic-chart';
import { analytics as analyticsRoute } from '@/routes/admin';
import type { Analytics, AnalyticsRangeOption } from '@/types/analytics';

type AnalyticsPanelProps = {
    analytics: Analytics;
    range: string;
    ranges: AnalyticsRangeOption[];
};

export default function AnalyticsPanel({
    analytics,
    range,
    ranges,
}: AnalyticsPanelProps) {
    return (
        <div className="space-y-4">
            <PanelHeader
                title="Traffic"
                subtitle={`Cloudflare Web Analytics · ${analytics.label}`}
            >
                <RangePicker
                    value={range}
                    options={ranges}
                    onSelect={selectRange}
                />
            </PanelHeader>

            {analytics.error ? (
                <EmptyCard message={analytics.error} />
            ) : (
                <Panels analytics={analytics} />
            )}
        </div>
    );
}

/**
 * Switching range refetches the deferred prop and nothing else.
 *
 * `only` keeps it a partial reload, so the range buttons cost one small JSON
 * response rather than a full page visit; `preserveState` keeps the buttons from
 * losing focus mid-click.
 */
function selectRange(value: string): void {
    router.visit(analyticsRoute.url({ query: { range: value } }), {
        only: ['analytics', 'range'],
        preserveState: true,
        preserveScroll: true,
    });
}

function Panels({ analytics }: { analytics: Analytics }) {
    const { totals, series, breakdowns } = analytics;

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                    label="Visits"
                    value={totals.visits.toLocaleString()}
                    hint={`${totals.pageViews.toLocaleString()} pageviews`}
                />
                <StatTile
                    label="Pages / visit"
                    value={
                        totals.visits > 0
                            ? (totals.pageViews / totals.visits).toFixed(1)
                            : '—'
                    }
                    hint="Across the range"
                />
                <StatTile
                    label="Edge requests"
                    value={
                        totals.requests > 0
                            ? totals.requests.toLocaleString()
                            : '—'
                    }
                    hint={
                        totals.cacheHitRatio === null
                            ? 'No zone data'
                            : `${Math.round(totals.cacheHitRatio * 100)}% cached`
                    }
                />
                <StatTile
                    label="Bandwidth"
                    value={totals.bytes > 0 ? formatBytes(totals.bytes) : '—'}
                    hint="Served from the edge"
                />
            </div>

            {series.length > 0 ? (
                <TrafficChart series={series} />
            ) : (
                <EmptyCard message="No pageviews recorded in this window yet." />
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <TopList title="Top pages" rows={breakdowns.topPaths} />
                <TopList
                    title="Referrers"
                    rows={breakdowns.topReferrers}
                    emptyLabel="No referrers - all traffic was direct."
                />
                <TopList title="Countries" rows={breakdowns.topCountries} />
                <TopList title="Browsers" rows={breakdowns.browsers} />
            </div>
        </>
    );
}
