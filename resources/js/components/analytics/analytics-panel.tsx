import { router } from '@inertiajs/react';

import StatTile from '@/components/analytics/stat-tile';
import TopList from '@/components/analytics/top-list';
import TrafficChart from '@/components/analytics/traffic-chart';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-foreground font-display text-lg font-semibold">
                        Traffic
                    </h2>
                    <p className="text-muted-foreground text-xs">
                        Cloudflare Web Analytics · {analytics.label}
                    </p>
                </div>

                <div className="border-border flex rounded-lg border p-0.5">
                    {ranges.map((option) => (
                        <Button
                            key={option.value}
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-pressed={option.value === range}
                            className={cn(
                                'h-7 px-3 text-xs',
                                option.value === range &&
                                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                            )}
                            onClick={() => selectRange(option.value)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            {analytics.error ? (
                <ErrorCard message={analytics.error} />
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
    router.visit(dashboard.url({ query: { range: value } }), {
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
                <ErrorCard message="No pageviews recorded in this window yet." />
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

function ErrorCard({ message }: { message: string }) {
    return (
        <div className="border-border bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            {message}
        </div>
    );
}

function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
