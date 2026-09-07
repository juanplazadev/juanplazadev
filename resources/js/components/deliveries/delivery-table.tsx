import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

import PanelCard from '@/components/admin/panel-card';
import EventTimeline from '@/components/deliveries/event-timeline';
import StatusBadge from '@/components/deliveries/status-badge';
import { timeAgo } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { Delivery } from '@/types/deliveries';

type DeliveryTableProps = {
    deliveries: Delivery[];
    /** How many rows the server will ever send, whatever the totals say. */
    limit: number;
    /** The whole window's request count, so a truncated list can say so. */
    requested: number;
};

/**
 * Every résumé request, newest first, each one opening onto its own timeline.
 *
 * The events live inside the row rather than behind a detail page because the
 * question they answer - "did this one actually land?" - is the question the
 * table is already being scanned for. A drill-down would put one extra click in
 * front of the only reason to look.
 */
export default function DeliveryTable({
    deliveries,
    limit,
    requested,
}: DeliveryTableProps) {
    const [open, setOpen] = useState<Set<string>>(new Set());

    function toggle(uuid: string): void {
        setOpen((current) => {
            const next = new Set(current);

            if (!next.delete(uuid)) next.add(uuid);

            return next;
        });
    }

    if (deliveries.length === 0) {
        return (
            <PanelCard title="Requests">
                <p className="text-muted-foreground mt-3 text-sm">
                    No résumé requests in this window. The hero dialog writes a
                    row the moment somebody submits it, before the challenge is
                    even judged, so a blocked bot would show up here too.
                </p>
            </PanelCard>
        );
    }

    return (
        <PanelCard
            title="Requests"
            action={
                <span className="text-muted-foreground text-xs tabular-nums">
                    {requested > limit
                        ? `newest ${limit} of ${requested.toLocaleString()}`
                        : `${deliveries.length} shown`}
                </span>
            }
        >
            <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-muted-foreground border-border border-b text-left">
                        <tr>
                            <th className="py-2 pr-4 font-medium">Email</th>
                            <th className="py-2 pr-4 font-medium">Status</th>
                            <th className="py-2 pr-4 font-medium">Requested</th>
                            <th className="py-2 text-right font-medium">
                                Events
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-border divide-y">
                        {deliveries.map((delivery) => {
                            const expanded = open.has(delivery.uuid);

                            return (
                                <Row
                                    key={delivery.uuid}
                                    delivery={delivery}
                                    expanded={expanded}
                                    onToggle={() => toggle(delivery.uuid)}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </PanelCard>
    );
}

type RowProps = {
    delivery: Delivery;
    expanded: boolean;
    onToggle: () => void;
};

/**
 * Two `tr`s rather than a nested table: the timeline has to span every column,
 * and a second table inside a cell would stop the columns lining up.
 */
function Row({ delivery, expanded, onToggle }: RowProps) {
    const panelId = `delivery-${delivery.uuid}`;

    return (
        <>
            <tr>
                <td className="py-2.5 pr-4">
                    <button
                        type="button"
                        onClick={onToggle}
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        className="text-foreground hover:text-primary flex items-center gap-2 text-left"
                    >
                        <ChevronRight
                            aria-hidden="true"
                            className={cn(
                                'text-muted-foreground size-3.5 shrink-0 transition-transform',
                                expanded && 'rotate-90',
                            )}
                        />
                        <span className="font-medium break-all">
                            {delivery.email}
                        </span>
                    </button>
                </td>

                <td className="py-2.5 pr-4">
                    <StatusBadge
                        status={delivery.status}
                        label={delivery.statusLabel}
                    />
                </td>

                <td className="text-muted-foreground py-2.5 pr-4">
                    {timeAgo(delivery.requestedAt)}
                </td>

                <td className="py-2.5 text-right tabular-nums">
                    <span
                        className={
                            delivery.events.length > 0
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                        }
                    >
                        {delivery.events.length}
                    </span>
                </td>
            </tr>

            {/* Rendered either way and hidden with `hidden`, so the panel the
                button points at with aria-controls always exists. */}
            <tr id={panelId} hidden={!expanded}>
                <td colSpan={4} className="pb-3">
                    <div className="border-border ml-1.5 border-l pl-4">
                        <Facts delivery={delivery} />
                        <EventTimeline events={delivery.events} />
                    </div>
                </td>
            </tr>
        </>
    );
}

/** The parts of the row that are not a timeline: how it was judged, and where it went. */
function Facts({ delivery }: { delivery: Delivery }) {
    return (
        <dl className="text-muted-foreground mb-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            <Fact label="Turnstile" value={turnstile(delivery.turnstile)} />
            <Fact
                label="Sent"
                value={delivery.sentAt ? timeAgo(delivery.sentAt) : 'never'}
            />
            <Fact
                label="Delivered"
                value={
                    delivery.deliveredAt
                        ? timeAgo(delivery.deliveredAt)
                        : 'not confirmed'
                }
            />
            <Fact label="Message-Id" value={delivery.messageId ?? '—'} mono />

            {delivery.failureReason ? (
                <div className="sm:col-span-2">
                    <dt className="inline">Failure </dt>
                    <dd className="text-destructive inline">
                        {delivery.failureReason}
                    </dd>
                </div>
            ) : null}
        </dl>
    );
}

function Fact({
    label,
    value,
    mono,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex gap-2">
            <dt className="w-20 shrink-0">{label}</dt>
            <dd
                className={cn(
                    'text-foreground truncate',
                    mono && 'font-mono text-[11px]',
                )}
            >
                {value}
            </dd>
        </div>
    );
}

/** 'skipped' is "never asked", which is not the same answer as "passed". */
function turnstile(value: string): string {
    if (value === 'passed') return 'passed';
    if (value === 'blocked') return 'refused by Cloudflare';

    return 'not challenged';
}
