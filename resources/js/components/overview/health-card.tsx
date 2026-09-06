import SectionCard from '@/components/overview/section-card';
import { errors } from '@/routes/admin';
import type { ErrorInsights } from '@/types/errors';

/**
 * Whether anything is broken, and how much of the plan it has cost.
 *
 * Names the loudest issue rather than only counting them: a number tells you
 * something is wrong, the title tells you whether it is the thing you already
 * know about.
 */
export default function HealthCard({ health }: { health: ErrorInsights }) {
    const { totals, issues, error } = health;
    const loudest = issues[0];
    const share = totals.quota > 0 ? totals.accepted / totals.quota : 0;

    return (
        <SectionCard title="Errors" href={errors.url()} linkLabel="All issues">
            {error ? (
                <p className="text-muted-foreground mt-3 text-sm">{error}</p>
            ) : (
                <>
                    <p className="text-foreground font-display mt-2 text-3xl font-semibold tabular-nums">
                        {totals.issues.toLocaleString()}
                        <span className="text-muted-foreground text-base font-normal">
                            {' '}
                            unresolved
                        </span>
                    </p>

                    <p className="text-muted-foreground mt-1 truncate text-xs">
                        {loudest
                            ? `Loudest: ${loudest.title}`
                            : 'Nothing unresolved in the last 7 days'}
                    </p>

                    <div
                        role="meter"
                        aria-valuenow={totals.accepted}
                        aria-valuemin={0}
                        aria-valuemax={totals.quota}
                        aria-label="Monthly error quota used"
                        className="bg-muted mt-4 h-1.5 overflow-hidden rounded-full"
                    >
                        <div
                            className={barClass(share)}
                            style={{ width: `${Math.max(share * 100, 1)}%` }}
                        />
                    </div>

                    <p className="text-muted-foreground mt-2 text-xs tabular-nums">
                        {totals.accepted.toLocaleString()} /{' '}
                        {totals.quota.toLocaleString()} events this month
                    </p>
                </>
            )}
        </SectionCard>
    );
}

/** Matches QuotaMeter's thresholds, so the two never disagree at a glance. */
function barClass(share: number): string {
    const base = 'h-full rounded-full transition-[width]';

    if (share >= 0.9) return `${base} bg-destructive`;
    if (share >= 0.75) return `${base} bg-chart-4`;

    return `${base} bg-chart-1`;
}
