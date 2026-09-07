import { cn } from '@/lib/utils';
import type { DeliveryStatus } from '@/types/deliveries';

/**
 * The status, coloured by what it asks of you.
 *
 * Same treatment as the release table's tag, and the colours come from the
 * --chart-* tokens rather than hex so they follow the active accent scale and
 * both appearances. Blocked is warning-coloured, not destructive: a refused bot
 * is the challenge working, not something that went wrong.
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
                toneFor(status),
            )}
        >
            {label}
        </span>
    );
}

function toneFor(status: DeliveryStatus): string {
    switch (status) {
        case 'delivered':
            return 'bg-chart-2/15 text-chart-2';
        case 'failed':
            return 'bg-destructive/15 text-destructive';
        case 'blocked':
            return 'bg-chart-4/15 text-chart-4';
        default:
            return 'bg-muted text-muted-foreground';
    }
}
