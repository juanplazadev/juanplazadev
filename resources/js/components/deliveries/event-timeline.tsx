import {
    EVENT_COLUMNS,
    eventColor,
    eventGlyph,
    eventLabel,
} from '@/components/deliveries/delivery-glyphs';
import { timeAgo } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { DeliveryEvent } from '@/types/deliveries';

/**
 * What Mailgun said happened to one message, oldest first.
 *
 * An empty timeline is a normal state, not a gap in the data. Locally the mail
 * goes to Mailpit, which answers with its own queue id rather than a Message-Id,
 * so no webhook can ever be joined back to the row - see .ai/rules/mail.md. The
 * empty sentence says so rather than leaving the reader to suspect a bug.
 *
 * The heading renders either way. Without it the events ran straight on from
 * the facts above with nothing between them but a margin, so the two lists read
 * as one badly aligned list.
 */
export default function EventTimeline({ events }: { events: DeliveryEvent[] }) {
    return (
        <div>
            <h4 className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                Provider events
            </h4>

            {events.length === 0 ? (
                <p className="text-muted-foreground mt-1.5 pl-6 text-xs">
                    No provider events yet. Locally there never will be —
                    Mailpit returns its own queue id, so nothing can be matched
                    back.
                </p>
            ) : (
                <ol className="mt-1.5 space-y-1">
                    {events.map((event, index) => (
                        <li
                            key={`${event.event}-${event.occurredAt}-${index}`}
                            className={cn(EVENT_COLUMNS, 'text-xs')}
                        >
                            {/* A fixed box whatever the glyph is, so the names
                                line up down the column - the same reason the
                                release row boxes its own. */}
                            <span
                                className="flex size-4 items-center justify-center"
                                style={{ color: eventColor(event.event) }}
                            >
                                {eventGlyph(event.event, 'size-3.5')}
                            </span>

                            <span className="text-foreground font-medium">
                                {eventLabel(event.event)}
                            </span>

                            <span
                                className="text-muted-foreground truncate"
                                title={detail(event)}
                            >
                                {detail(event)}
                            </span>

                            <span className="text-muted-foreground tabular-nums">
                                {timeAgo(event.occurredAt)}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

/**
 * Severity and reason read as one phrase - 'permanent · suppress-bounce'.
 *
 * They were two separate spans, which put a bounce's severity and its cause in
 * different columns from each other and from everything above. Either can be
 * null, and a row with neither leaves the cell empty rather than drawing a
 * separator with nothing on one side of it.
 */
function detail(event: DeliveryEvent): string {
    return [event.severity, event.reason].filter(Boolean).join(' · ');
}
