import ShareBar from '@/components/admin/share-bar';
import type { ShareSegment } from '@/components/admin/share-bar';
import type { DeliveryTotals } from '@/types/deliveries';

type Segment = {
    key: keyof DeliveryTotals;
    label: string;
    /** Fill for the bar and the legend dot. Tokens, never hex. */
    color: string;
};

/*
 * DeliveryStatus order, which partitions the window: every request is in
 * exactly one of these, and they sum to `requested`. Delivered leads because it
 * is the outcome the page is actually about.
 */
const SEGMENTS: Segment[] = [
    { key: 'delivered', label: 'Delivered', color: 'var(--chart-1)' },
    { key: 'sent', label: 'Sent', color: 'var(--chart-3)' },
    { key: 'pending', label: 'Pending', color: 'var(--chart-5)' },
    { key: 'blocked', label: 'Blocked', color: 'var(--chart-4)' },
    { key: 'failed', label: 'Failed', color: 'var(--destructive)' },
];

/**
 * Where the résumé requests ended up, as one part-to-whole bar.
 *
 * Five counts that sum to the total is a stacked bar, not five list rows - the
 * card used to spell out three of them and leave the reader to work out what
 * the remainder was.
 *
 * The drawing lives in admin/share-bar.tsx, which the devices breakdown on the
 * traffic page shares. What stays here is the part that is about deliveries:
 * which statuses exist, and what order they read in.
 */
export default function DeliveryBar({ totals }: { totals: DeliveryTotals }) {
    const segments: ShareSegment[] = SEGMENTS.map((segment) => ({
        key: segment.key,
        label: segment.label,
        value: totals[segment.key],
        color: segment.color,
    }));

    return <ShareBar segments={segments} />;
}
