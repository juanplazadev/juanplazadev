import { timeAgo } from '@/lib/time';
import type { DeliveryEvent } from '@/types/deliveries';

/**
 * What Mailgun said happened to one message, oldest first.
 *
 * An empty timeline is a normal state, not a gap in the data. Locally the mail
 * goes to Mailpit, which answers with its own queue id rather than a Message-Id,
 * so no webhook can ever be joined back to the row - see .ai/rules/mail.md. The
 * empty sentence says so rather than leaving the reader to suspect a bug.
 */
export default function EventTimeline({ events }: { events: DeliveryEvent[] }) {
    if (events.length === 0) {
        return (
            <p className="text-muted-foreground py-1 text-xs">
                No provider events yet. Locally there never will be — Mailpit
                returns its own queue id, so nothing can be matched back.
            </p>
        );
    }

    return (
        <ol className="space-y-1.5 py-1">
            {events.map((event, index) => (
                <li
                    key={`${event.event}-${event.occurredAt}-${index}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs"
                >
                    <span className="text-foreground w-24 shrink-0 font-medium">
                        {event.event}
                    </span>

                    <span className="text-muted-foreground w-20 shrink-0 tabular-nums">
                        {timeAgo(event.occurredAt)}
                    </span>

                    {event.severity ? (
                        <span className="text-muted-foreground">
                            {event.severity}
                        </span>
                    ) : null}

                    {event.reason ? (
                        <span className="text-muted-foreground truncate">
                            {event.reason}
                        </span>
                    ) : null}
                </li>
            ))}
        </ol>
    );
}
