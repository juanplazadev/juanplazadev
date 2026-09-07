import {
    ChevronRight,
    Hash,
    Inbox,
    MailCheck,
    Send,
    TriangleAlert,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import PanelCard from '@/components/admin/panel-card';
import {
    DETAIL_COLUMNS,
    statusColor,
    statusGlyph,
    turnstileGlyph,
    turnstileLabel,
} from '@/components/deliveries/delivery-glyphs';
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
 *
 * `Inbox` rather than the sidebar's MailCheck: a card inside a section page
 * picks its own icon, the way running-build.tsx uses Server and not Rocket.
 * Matching the nav is a rule about overview cards that link somewhere.
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
            <PanelCard title="Requests" icon={Inbox}>
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
            icon={Inbox}
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
                        data-test="delivery-toggle"
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        className="text-foreground hover:text-primary flex items-center gap-2 text-left"
                    >
                        {/* A fixed box, so the rail below can be placed on its
                            centre rather than on a hand-tuned offset. */}
                        <span className="flex size-4 shrink-0 items-center justify-center">
                            <ChevronRight
                                aria-hidden="true"
                                className={cn(
                                    'text-muted-foreground size-3.5 transition-transform',
                                    expanded && 'rotate-90',
                                )}
                            />
                        </span>

                        <span className="font-medium break-all">
                            {delivery.email}
                        </span>
                    </button>
                </td>

                <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                        {/* Decorative: the badge beside it carries the word. */}
                        <span
                            data-test="delivery-glyph"
                            className="flex size-4 shrink-0 items-center justify-center"
                            style={{ color: statusColor(delivery.status) }}
                        >
                            {statusGlyph(delivery.status)}
                        </span>

                        <StatusBadge
                            status={delivery.status}
                            label={delivery.statusLabel}
                        />
                    </div>
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
                <td colSpan={4} className="pb-4">
                    {/* ml-2 is half of the chevron's size-4 box, which puts the
                        rail on the chevron's centre. The old ml-1.5 was aimed
                        at the email text instead and missed it by the border's
                        own width. */}
                    <div className="border-border mt-2 ml-2 space-y-3 border-l pl-4">
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
        <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
            <Fact
                icon={turnstileGlyph(delivery.turnstile, 'size-3.5')}
                label="Turnstile"
                value={turnstileLabel(delivery.turnstile)}
            />
            <Fact
                icon={<Send aria-hidden className="size-3.5" />}
                label="Sent"
                value={delivery.sentAt ? timeAgo(delivery.sentAt) : 'never'}
            />
            <Fact
                icon={<MailCheck aria-hidden className="size-3.5" />}
                label="Delivered"
                value={
                    delivery.deliveredAt
                        ? timeAgo(delivery.deliveredAt)
                        : 'not confirmed'
                }
            />
            <Fact
                icon={<Hash aria-hidden className="size-3.5" />}
                label="Message-Id"
                value={delivery.messageId ?? '—'}
                mono
            />

            {delivery.failureReason ? (
                <Fact
                    icon={<TriangleAlert aria-hidden className="size-3.5" />}
                    label="Failure"
                    value={delivery.failureReason}
                    tone="bad"
                    className="sm:col-span-2"
                />
            ) : null}
        </dl>
    );
}

type FactProps = {
    icon: ReactNode;
    label: string;
    value: string;
    mono?: boolean;
    /** Failure is the only fact that is a verdict rather than a reading. */
    tone?: 'bad';
    className?: string;
};

/**
 * One reading, on the column template the timeline shares.
 *
 * `title` carries the whole value, because the one fact long enough to clip is
 * the Message-Id, and a clipped Message-Id you cannot copy is worse than none.
 * The mono value stays at text-xs - it used to be text-[11px], which sat that
 * one row off the baseline of the three beside it.
 */
function Fact({ icon, label, value, mono, tone, className }: FactProps) {
    const bad = tone === 'bad';

    return (
        <div className={cn(DETAIL_COLUMNS, className)}>
            <span
                className={cn(
                    'flex size-4 items-center justify-center',
                    bad ? 'text-destructive' : 'text-muted-foreground',
                )}
            >
                {icon}
            </span>

            <dt className="text-muted-foreground">{label}</dt>

            <dd
                className={cn(
                    'truncate',
                    bad ? 'text-destructive' : 'text-foreground',
                    mono && 'font-mono',
                )}
                title={value}
            >
                {value}
            </dd>
        </div>
    );
}
