import { Deferred, Head } from '@inertiajs/react';

import AnalyticsPanel from '@/components/analytics/analytics-panel';
import AnalyticsSkeleton from '@/components/analytics/analytics-skeleton';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes/admin';
import type { Analytics, AnalyticsRangeOption } from '@/types/analytics';

export default function Dashboard({
    range,
    ranges,
    analytics,
}: {
    range: string;
    ranges: AnalyticsRangeOption[];
    analytics?: Analytics;
}) {
    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <Deferred data="analytics" fallback={<AnalyticsSkeleton />}>
                    {/* Deferred guarantees the prop before this renders, but the
                        type stays optional because the initial page really does
                        arrive without it. */}
                    {analytics ? (
                        <AnalyticsPanel
                            analytics={analytics}
                            range={range}
                            ranges={ranges}
                        />
                    ) : null}
                </Deferred>
            </div>
        </>
    );
}

Dashboard.layout = [
    AppLayout,
    {
        breadcrumbs: [
            {
                title: 'Dashboard',
                href: dashboard(),
            },
        ],
    },
];
