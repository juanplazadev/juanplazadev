import { MailCheck } from 'lucide-react';

import DeliveryBar from '@/components/overview/delivery-bar';
import SectionCard from '@/components/overview/section-card';
import { timeAgo } from '@/lib/time';
import { deliveries as deliveriesRoute } from '@/routes/admin';
import type { DeliveryOverview } from '@/types/deliveries';

/**
 * Who asked for the résumé, and what became of it.
 *
 * The outcomes are a stacked bar rather than the three-row list this used to
 * carry: the five statuses partition the window and sum to the total, so the
 * shape is part-to-whole and the old list left the remainder unaccounted for.
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
            icon={MailCheck}
            href={deliveriesRoute.url()}
            linkLabel="All requests"
        >
            <p className="text-foreground font-display mt-2 text-3xl font-semibold">
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

            <DeliveryBar totals={totals} />
        </SectionCard>
    );
}
