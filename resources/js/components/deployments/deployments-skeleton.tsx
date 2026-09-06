import { Skeleton } from '@/components/ui/skeleton';

/**
 * The deferred prop's empty state.
 *
 * Shaped like the page it replaces - the running verdict, then the table - so
 * the layout does not jump when the releases land.
 */
export default function DeploymentsSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading deployments…</span>

            <Skeleton className="h-[132px] rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
        </div>
    );
}
