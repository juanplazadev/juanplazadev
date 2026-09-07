import { router } from '@inertiajs/react';

import EmptyCard from '@/components/admin/empty-card';
import PanelHeader from '@/components/admin/panel-header';
import RangePicker from '@/components/admin/range-picker';
import StatTile from '@/components/admin/stat-tile';
import ErrorVolumeChart from '@/components/errors/error-volume-chart';
import IssueList from '@/components/errors/issue-list';
import QuotaMeter from '@/components/errors/quota-meter';
import SeverityCard from '@/components/errors/severity-card';
import { errors } from '@/routes/admin';
import type { AnalyticsRangeOption } from '@/types/analytics';
import type { ErrorInsights } from '@/types/errors';

type ErrorInsightsPanelProps = {
    insights: ErrorInsights;
    range: string;
    ranges: AnalyticsRangeOption[];
};

export default function ErrorInsightsPanel({
    insights,
    range,
    ranges,
}: ErrorInsightsPanelProps) {
    return (
        <div className="space-y-4">
            <PanelHeader title="Errors" subtitle={`Sentry · ${insights.label}`}>
                <RangePicker
                    value={range}
                    options={ranges}
                    onSelect={selectRange}
                />
            </PanelHeader>

            {insights.error ? (
                <EmptyCard message={insights.error} />
            ) : (
                <Panels insights={insights} />
            )}
        </div>
    );
}

/**
 * Switching range refetches the deferred prop and nothing else.
 *
 * `only` keeps it a partial reload, so the range buttons cost one small JSON
 * response rather than a full page visit; `preserveState` keeps the buttons
 * from losing focus mid-click.
 */
function selectRange(value: string): void {
    router.visit(errors.url({ query: { range: value } }), {
        only: ['insights', 'range'],
        preserveState: true,
        preserveScroll: true,
    });
}

/**
 * Four tiles, then the chart beside the quota meter, then the issues.
 *
 * The issue list runs full width because it is what the page is for. It spent a
 * while in a two-thirds column beside a stack of small cards, which made the
 * one thing worth reading the most cramped thing on the page. The quota meter
 * moved up next to the chart instead - both are counts over a window, and the
 * meter is the footnote to the volume rather than to the issues.
 *
 * Severity sits outside that grid and directly above the list it describes. A
 * part-to-whole bar wants to be wide and short, and as a third column it would
 * have been a tall card holding one bar.
 */
function Panels({ insights }: { insights: ErrorInsights }) {
    const { totals, series, issues } = insights;

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                    label="Errors"
                    value={totals.errors.toLocaleString()}
                    hint={`${insights.label.toLowerCase()}, accepted`}
                />
                <StatTile
                    label="Users affected"
                    value={
                        totals.users > 0 ? totals.users.toLocaleString() : '—'
                    }
                    hint="Across the ranked issues"
                />
                <StatTile
                    label="Unresolved"
                    value={totals.issues.toLocaleString()}
                    hint={
                        totals.issues === 10 ? 'Top ten shown' : 'Open issues'
                    }
                />
                <StatTile
                    label="Dropped"
                    value={
                        totals.dropped > 0
                            ? totals.dropped.toLocaleString()
                            : '—'
                    }
                    hint="Rate limited or filtered"
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    {series.length > 0 ? (
                        <ErrorVolumeChart series={series} />
                    ) : (
                        <EmptyCard message="No events recorded in this window yet." />
                    )}
                </div>

                <QuotaMeter totals={totals} />
            </div>

            <SeverityCard issues={issues} />

            <IssueList issues={issues} />
        </>
    );
}
