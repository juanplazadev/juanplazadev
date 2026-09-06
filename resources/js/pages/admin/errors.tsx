import { Deferred, Head } from '@inertiajs/react';

import ErrorInsightsPanel from '@/components/errors/error-insights-panel';
import ErrorInsightsSkeleton from '@/components/errors/error-insights-skeleton';
import AppLayout from '@/layouts/app-layout';
import { dashboard, errors } from '@/routes/admin';
import type { AnalyticsRangeOption } from '@/types/analytics';
import type { ErrorInsights } from '@/types/errors';

export default function Errors({
    range,
    ranges,
    insights,
}: {
    range: string;
    ranges: AnalyticsRangeOption[];
    insights?: ErrorInsights;
}) {
    return (
        <>
            <Head title="Errors" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <Deferred data="insights" fallback={<ErrorInsightsSkeleton />}>
                    {/* Deferred guarantees the prop before this renders, but the
                        type stays optional because the initial page really does
                        arrive without it. */}
                    {insights ? (
                        <ErrorInsightsPanel
                            insights={insights}
                            range={range}
                            ranges={ranges}
                        />
                    ) : null}
                </Deferred>
            </div>
        </>
    );
}

Errors.layout = [
    AppLayout,
    {
        breadcrumbs: [
            {
                title: 'Dashboard',
                href: dashboard(),
            },
            {
                title: 'Errors',
                href: errors(),
            },
        ],
    },
];
