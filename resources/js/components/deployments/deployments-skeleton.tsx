import { Skeleton } from '@/components/ui/skeleton';

/**
 * The deferred prop's empty state.
 *
 * Shaped like the page it replaces - the running verdict, the three tiles, then
 * the table - so the layout does not jump when the releases land. The tile
 * height matches the one error-insights-skeleton.tsx uses for the same card.
 */
export default function DeploymentsSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading deployments…</span>

            <Skeleton className="h-[132px] rounded-xl" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[104px] rounded-xl" />
                ))}
            </div>

            <Skeleton className="h-96 rounded-xl" />
        </div>
    );
}
