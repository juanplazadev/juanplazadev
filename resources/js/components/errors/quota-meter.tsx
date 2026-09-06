import type { ErrorTotals } from '@/types/errors';
import PanelCard from '@/components/admin/panel-card';

type QuotaMeterProps = {
    totals: ErrorTotals;
};

/**
 * How much of the month's free allowance is gone.
 *
 * The thirty day figure, not the selected range's - the plan resets monthly, so
 * narrowing the chart to a week must not make the meter look emptier than the
 * account is. Sentry's API reports consumption but never the plan's limit,
 * which is why the denominator comes from config.
 */
export default function QuotaMeter({ totals }: QuotaMeterProps) {
    const used = totals.accepted;
    const quota = totals.quota;
    const share = quota > 0 ? Math.min(used / quota, 1) : 0;
    const remaining = Math.max(quota - used, 0);

    return (
        <PanelCard title="Quota · last 30 days">
            <p className="text-foreground font-display mt-2 text-3xl font-semibold tabular-nums">
                {used.toLocaleString()}
                <span className="text-muted-foreground text-base font-normal">
                    {' '}
                    / {quota.toLocaleString()}
                </span>
            </p>

            <div
                role="meter"
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={quota}
                aria-label="Monthly error quota used"
                className="bg-muted mt-3 h-2 overflow-hidden rounded-full"
            >
                <div
                    className={barClass(share)}
                    style={{ width: `${Math.max(share * 100, 1)}%` }}
                />
            </div>

            <p className="text-muted-foreground mt-2 text-xs">
                {remaining.toLocaleString()} events left
                {totals.dropped > 0
                    ? ` · ${totals.dropped.toLocaleString()} dropped in range`
                    : null}
            </p>
        </PanelCard>
    );
}

/** Green until it matters, amber at three quarters, red once it is nearly gone. */
function barClass(share: number): string {
    const base = 'h-full rounded-full transition-[width]';

    if (share >= 0.9) return `${base} bg-destructive`;
    if (share >= 0.75) return `${base} bg-chart-4`;

    return `${base} bg-chart-1`;
}
