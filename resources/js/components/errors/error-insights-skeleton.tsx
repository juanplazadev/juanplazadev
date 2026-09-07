import { Skeleton } from '@/components/ui/skeleton';

/**
 * The deferred prop's empty state.
 *
 * Shaped like the panel it replaces - four tiles, the chart beside the quota
 * meter, then the severity strip over the issue list - so the layout does not
 * jump when the real numbers land.
 */
export default function ErrorInsightsSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading error insights…</span>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[104px] rounded-xl" />
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-[336px] rounded-xl lg:col-span-2" />
                <Skeleton className="h-[336px] rounded-xl" />
            </div>

            {/* Severity is a part-to-whole bar, not a list: wide and short. */}
            <Skeleton className="h-[108px] rounded-xl" />

            <Skeleton className="h-80 rounded-xl" />
        </div>
    );
}
