import SectionCard from '@/components/overview/section-card';
import { timeAgo } from '@/lib/time';
import { deliveries as deliveriesRoute } from '@/routes/admin';
import type { DeliveryOverview } from '@/types/deliveries';

/**
 * How many people asked for the résumé, and how many actually got it.
 *
 * The second card on the overview that needs no network, so like the content
 * card it is never in a loading state. Blocked is listed alongside the two
 * failure-ish numbers on purpose: it is the only visible evidence the Turnstile
 * challenge is doing anything at all.
 */
export default function DeliveriesCard({
    deliveries,
}: {
    deliveries: DeliveryOverview;
}) {
    const { totals, lastRequestedAt } = deliveries;

    return (
        <SectionCard
            title="Résumé requests"
            href={deliveriesRoute.url()}
            linkLabel="All requests"
        >
            <p className="text-foreground font-display mt-2 text-3xl font-semibold tabular-nums">
                {totals.requested.toLocaleString()}
                <span className="text-muted-foreground text-base font-normal">
                    {' '}
                    {totals.requested === 1 ? 'request' : 'requests'}
                </span>
            </p>

            <p className="text-muted-foreground mt-1 text-xs">
                {lastRequestedAt
                    ? `Last asked ${timeAgo(lastRequestedAt)}`
                    : 'Nobody has asked yet'}
            </p>

            <dl className="text-muted-foreground mt-4 space-y-1.5 text-xs">
                <Row
                    label="Delivered"
                    value={totals.delivered.toLocaleString()}
                />
                <Row label="Failed" value={totals.failed.toLocaleString()} />
                <Row
                    label="Blocked by Turnstile"
                    value={totals.blocked.toLocaleString()}
                />
            </dl>
        </SectionCard>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <dt>{label}</dt>
            <dd className="text-foreground tabular-nums">{value}</dd>
        </div>
    );
}
