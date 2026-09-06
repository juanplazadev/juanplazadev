import { Skeleton } from '@/components/ui/skeleton';

/**
 * One overview card, pending.
 *
 * Fixed at the height the real cards settle to. Each deferred group renders its
 * own, so a slow vendor leaves a placeholder in its own slot rather than
 * collapsing the grid around it.
 */
export default function CardSkeleton({ label }: { label: string }) {
    return (
        <>
            <span className="sr-only">{label}</span>
            <Skeleton className="h-[196px] rounded-xl" aria-hidden="true" />
        </>
    );
}
