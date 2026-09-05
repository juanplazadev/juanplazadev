import type { AnalyticsRow } from '@/types/analytics';

type TopListProps = {
    title: string;
    rows: AnalyticsRow[];
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
    rows,
    emptyLabel = 'Nothing yet.',
}: TopListProps) {
    const highest = rows.reduce((max, row) => Math.max(max, row.visits), 0);

    return (
        <div className="border-border bg-card rounded-xl border p-4">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {title}
            </h3>

            {rows.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                    {emptyLabel}
                </p>
            ) : (
                <ol className="mt-3 space-y-1">
                    {rows.map((row) => (
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
                            <span className="text-foreground relative truncate">
                                {row.label}
                            </span>
                            <span className="text-muted-foreground relative shrink-0 tabular-nums">
                                {row.visits.toLocaleString()}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
