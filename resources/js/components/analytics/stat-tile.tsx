import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type StatTileProps = {
    label: string;
    value: string;
    /** Secondary line: a unit, a share, or what the number is measured over. */
    hint?: ReactNode;
    className?: string;
};

/**
 * One number, stated plainly.
 *
 * Deliberately no sparkline or delta arrow: the chart below already carries the
 * shape of the data, and a second, smaller rendering of the same series next to
 * the total reads as decoration rather than information.
 */
export default function StatTile({
    label,
    value,
    hint,
    className,
}: StatTileProps) {
    return (
        <div
            className={cn(
                'border-border bg-card rounded-xl border p-4',
                className,
            )}
        >
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {label}
            </p>
            <p className="text-foreground font-display mt-2 text-3xl font-semibold tabular-nums">
                {value}
            </p>
            {hint ? (
                <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
            ) : null}
        </div>
    );
}
