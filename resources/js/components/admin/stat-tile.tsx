import type { ReactNode } from 'react';

import PanelCard from '@/components/admin/panel-card';

type StatTileProps = {
    label: string;
    /** The number, already formatted. Use an em dash for "none to report". */
    value: ReactNode;
    /** Secondary line: a unit, a share, or what the number is measured over. */
    hint?: ReactNode;
    className?: string;
};

/**
 * One number, stated plainly.
 *
 * Deliberately no sparkline or delta arrow: on a section page the chart below
 * already carries the shape of the data, and a second, smaller rendering of the
 * same series next to the total reads as decoration rather than information.
 * The overview's traffic card draws a chart under its number because there is
 * no section page beneath it doing that job.
 */
export default function StatTile({
    label,
    value,
    hint,
    className,
}: StatTileProps) {
    return (
        <PanelCard title={label} className={className}>
            <p className="text-foreground font-display mt-2 text-3xl font-semibold tabular-nums">
                {value}
            </p>
            {hint ? (
                <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
            ) : null}
        </PanelCard>
    );
}
