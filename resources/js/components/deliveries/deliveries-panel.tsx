import { router } from '@inertiajs/react';

import PanelHeader from '@/components/admin/panel-header';
import RangePicker from '@/components/admin/range-picker';
import StatTile from '@/components/admin/stat-tile';
import DeliveryTable from '@/components/deliveries/delivery-table';
import { deliveries as deliveriesRoute } from '@/routes/admin';
import type { AnalyticsRangeOption } from '@/types/analytics';
import type { DeliveryStatusOption, DeliverySummary } from '@/types/deliveries';

type DeliveriesPanelProps = {
    deliveries: DeliverySummary;
    range: string;
    ranges: AnalyticsRangeOption[];
    /** Null is "all of them", which is what the page opens on. */
    status: string | null;
    statuses: DeliveryStatusOption[];
};

/** The sentinel for "no status filter". Never sent to the server. */
const ALL = 'all';

export default function DeliveriesPanel({
    deliveries,
    range,
    ranges,
    status,
    statuses,
}: DeliveriesPanelProps) {
    const { totals } = deliveries;

    function select(next: { range?: string; status?: string }): void {
        visit({
            range: next.range ?? range,
            status: next.status ?? status ?? ALL,
        });
    }

    return (
        <div className="space-y-4">
            <PanelHeader
                title="Résumé deliveries"
                subtitle={`Mailgun · ${deliveries.label}`}
            >
                <RangePicker
                    value={range}
                    options={ranges}
                    onSelect={(value) => select({ range: value })}
                />
            </PanelHeader>

            {/* The same button group as the range picker, reused rather than
                re-rolled: it is already generic over {value, label}, and
                .ai/rules/components-admin.md is explicit that these primitives
                exist so the pages stay in step. */}
            <div
                role="group"
                aria-label="Filter by status"
                className="flex flex-wrap items-center gap-2"
            >
                <RangePicker
                    value={status ?? ALL}
                    options={[{ value: ALL, label: 'All' }, ...statuses]}
                    onSelect={(value) => select({ status: value })}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                    label="Requested"
                    value={totals.requested.toLocaleString()}
                    hint={`${totals.pending.toLocaleString()} still queued`}
                />
                <StatTile
                    label="Delivered"
                    value={totals.delivered.toLocaleString()}
                    hint={deliveredHint(totals.delivered, totals.requested)}
                />
                <StatTile
                    label="Failed"
                    value={totals.failed.toLocaleString()}
                    hint="Bounced or refused at the provider"
                />
                <StatTile
                    label="Blocked"
                    value={totals.blocked.toLocaleString()}
                    hint="Turnstile refused the challenge"
                />
            </div>

            <DeliveryTable
                deliveries={deliveries.deliveries}
                limit={deliveries.limit}
                requested={totals.requested}
            />
        </div>
    );
}

/**
 * Switching a filter refetches the table and nothing else.
 *
 * `only` keeps it a partial reload, so the buttons cost one small JSON response
 * rather than a full page visit; `preserveState` keeps them from losing focus
 * mid-click. `status` drops out of the URL entirely for "All" rather than
 * travelling as an empty string the server would have to sanitise away.
 */
function visit({ range, status }: { range: string; status: string }): void {
    router.visit(
        deliveriesRoute.url({
            query: {
                range,
                status: status === ALL ? undefined : status,
            },
        }),
        {
            only: ['deliveries', 'range', 'status'],
            preserveState: true,
            preserveScroll: true,
        },
    );
}

/** Of everything asked for, not of everything sent - a blocked bot counts. */
function deliveredHint(delivered: number, requested: number): string {
    if (requested === 0) return 'Nothing requested yet';

    return `${Math.round((delivered / requested) * 100)}% of requests`;
}
