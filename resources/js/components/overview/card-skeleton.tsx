import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type CardSkeletonProps = {
    label: string;
    /**
     * Height class, when the real card is not the default size. The traffic
     * card carries a chart and settles taller than the rest, and a placeholder
     * shorter than the card it stands in for makes the grid jump on arrival.
     */
    className?: string;
};

/**
 * One overview card, pending.
 *
 * Fixed at the height the real cards settle to. Each deferred group renders its
 * own, so a slow vendor leaves a placeholder in its own slot rather than
 * collapsing the grid around it.
 */
export default function CardSkeleton({ label, className }: CardSkeletonProps) {
    return (
        <>
            <span className="sr-only">{label}</span>
            <Skeleton
                className={cn('h-[196px] rounded-xl', className)}
                aria-hidden="true"
            />
        </>
    );
}
