import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AnalyticsRow } from '@/types/analytics';
import PanelCard from '@/components/admin/panel-card';

type TopListProps = {
    title: string;
    /** The card's heading glyph. Forwarded to PanelCard. */
    icon?: LucideIcon;
    rows: AnalyticsRow[];
    /**
     * A leading glyph for each row - a flag, a brand mark, a device.
     *
     * Only the breakdowns whose rows identify a thing pass one. Top pages and
     * referrers do not: one repeated document icon down a list is ornament,
     * and the row already carries the path.
     */
    rowIcon?: (row: AnalyticsRow) => ReactNode;
    /** Rewrites the raw Cloudflare string for a reader. See row-glyphs.tsx. */
    rowLabel?: (row: AnalyticsRow) => string;
    /** Shown when Cloudflare returned the breakdown but it held nothing. */
    emptyLabel?: string;
};

/**
 * A ranked list with the bar drawn behind the row rather than beside it.
 *
 * The bar is scaled against the largest row, not the total, so the shape of the
 * ranking stays readable when one path dominates - which on a personal site it
 * always does, because it is the home page.
 */
export default function TopList({
    title,
    icon,
    rows,
    rowIcon,
    rowLabel,
    emptyLabel = 'Nothing yet.',
}: TopListProps) {
    const highest = rows.reduce((max, row) => Math.max(max, row.visits), 0);

    return (
        <PanelCard title={title} icon={icon}>
            {rows.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                    {emptyLabel}
                </p>
            ) : (
                <ol className="mt-3 space-y-1">
                    {rows.map((row) => {
                        const glyph = rowIcon?.(row);

                        return (
                            <li
                                key={row.label}
                                className="relative flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
                            >
                                <span
                                    aria-hidden
                                    className="bg-primary/10 absolute inset-y-0 left-0 rounded-md"
                                    style={{
                                        width:
                                            highest > 0
                                                ? `${Math.max((row.visits / highest) * 100, 2)}%`
                                                : '0%',
                                    }}
                                />
                                <span className="relative flex min-w-0 items-center gap-2">
                                    {glyph ? (
                                        // A fixed box whatever the glyph is, so
                                        // the labels line up down the list even
                                        // when one row falls back to no flag.
                                        <span
                                            data-test="row-glyph"
                                            className="text-muted-foreground flex size-4 shrink-0 items-center justify-center"
                                        >
                                            {glyph}
                                        </span>
                                    ) : null}
                                    <span className="text-foreground truncate">
                                        {rowLabel ? rowLabel(row) : row.label}
                                    </span>
                                </span>
                                <span className="text-muted-foreground relative shrink-0 tabular-nums">
                                    {row.visits.toLocaleString()}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </PanelCard>
    );
}
