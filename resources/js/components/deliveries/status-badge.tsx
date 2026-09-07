import { statusTone } from '@/components/deliveries/delivery-glyphs';
import { cn } from '@/lib/utils';
import type { DeliveryStatus } from '@/types/deliveries';

/**
 * The status, coloured by what it asks of you.
 *
 * Same treatment as the release table's tag, and the colours come from the
 * --chart-* tokens rather than hex so they follow the active accent scale and
 * both appearances. Blocked is warning-coloured, not destructive: a refused bot
 * is the challenge working, not something that went wrong.
 *
 * The tones themselves live in delivery-glyphs.tsx, beside the glyph that now
 * sits next to this badge in the table, so the two cannot drift into
 * disagreeing about what a status looks like.
 */
export default function StatusBadge({
    status,
    label,
}: {
    status: DeliveryStatus;
    label: string;
}) {
    return (
        <span
            className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase',
                statusTone(status),
            )}
        >
            {label}
        </span>
    );
}
