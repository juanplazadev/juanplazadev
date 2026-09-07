import { Skeleton } from '@/components/ui/skeleton';

/**
 * The deferred prop's empty state.
 *
 * Shaped like the panel it replaces - four tiles, a chart, then four breakdown
 * lists in a two-column grid over the full-width devices strip - so the layout
 * does not jump when the real numbers land.
 */
export default function AnalyticsSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading analytics…</span>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[104px] rounded-xl" />
                ))}
            </div>

            <Skeleton className="h-[336px] rounded-xl" />

            <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
                {/* Devices is a part-to-whole bar, not a list: wide and short. */}
                <Skeleton className="h-[108px] rounded-xl lg:col-span-2" />
            </div>
        </div>
    );
}
