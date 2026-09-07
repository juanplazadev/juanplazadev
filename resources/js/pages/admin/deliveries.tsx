import { Head } from '@inertiajs/react';

import DeliveriesPanel from '@/components/deliveries/deliveries-panel';
import AppLayout from '@/layouts/app-layout';
import { dashboard, deliveries as deliveriesRoute } from '@/routes/admin';
import type { AnalyticsRangeOption } from '@/types/analytics';
import type { DeliveryStatusOption, DeliverySummary } from '@/types/deliveries';

/**
 * Who asked for the résumé, and what Mailgun did about it.
 *
 * No <Deferred> and no skeleton, unlike every sibling section page. The numbers
 * come from two local tables rather than from a vendor that can throttle or
 * fail, so the prop is resolved with the page - see DeliveriesController for
 * why that asymmetry is deliberate.
 */
export default function Deliveries({
    range,
    ranges,
    status,
    statuses,
    deliveries,
}: {
    range: string;
    ranges: AnalyticsRangeOption[];
    status: string | null;
    statuses: DeliveryStatusOption[];
    deliveries: DeliverySummary;
}) {
    return (
        <>
            <Head title="Deliveries" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <DeliveriesPanel
                    deliveries={deliveries}
                    range={range}
                    ranges={ranges}
                    status={status}
                    statuses={statuses}
                />
            </div>
        </>
    );
}

Deliveries.layout = [
    AppLayout,
    {
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Deliveries', href: deliveriesRoute() },
        ],
    },
];
