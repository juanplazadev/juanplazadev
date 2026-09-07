import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ShareSegment = {
    key: string;
    label: string;
    value: number;
    /** Fill for the bar and the legend mark. Tokens, never hex. */
    color: string;
    /**
     * Replaces the legend's colour dot. Use it where the segments have a glyph
     * of their own worth showing; leave it off and the dot is drawn instead.
     */
    icon?: ReactNode;
};

/**
 * A set of counts that partition a whole, as one bar.
 *
 * Extracted from DeliveryBar when the devices breakdown turned out to be the
 * same shape: a handful of values that sum to the total, which a ranked list
 * renders badly because it leaves the reader adding up the remainder. Both
 * callers keep their own vocabulary and ordering and share only the drawing.
 *
 * No chart library. This is a flex row of divs, and reaching for recharts to
 * draw three rectangles would cost the async chunk for nothing.
 *
 * Every segment is named in the legend beneath, so nothing is carried by colour
 * alone - which matters more than usual here, because --chart-1..5 are steps of
 * one accent ramp rather than five hues and their order inverts in dark mode.
 */
export default function ShareBar({
    segments,
    showShare = false,
    className,
}: {
    segments: ShareSegment[];
    /**
     * Adds each segment's percentage to the legend.
     *
     * Off by default because it answers a different question than the counts
     * do. Deliveries wants the count - how many actually failed - while a split
     * across devices is read as a proportion, and "mostly mobile" is the whole
     * point of drawing it.
     */
    showShare?: boolean;
    className?: string;
}) {
    const present = segments.filter((segment) => segment.value > 0);

    if (present.length === 0) {
        return null;
    }

    const total = present.reduce((sum, segment) => sum + segment.value, 0);

    return (
        <div className={cn('mt-4', className)}>
            <div
                className="flex h-2 gap-0.5 overflow-hidden"
                role="img"
                aria-label={present
                    .map(
                        (segment) =>
                            `${segment.value} ${segment.label.toLowerCase()}`,
                    )
                    .join(', ')}
            >
                {present.map((segment) => (
                    <div
                        key={segment.key}
                        className="h-full rounded-[2px] first:rounded-l-full last:rounded-r-full"
                        style={{
                            width: `${(segment.value / total) * 100}%`,
                            background: segment.color,
                        }}
                    />
                ))}
            </div>

            <ul className="text-muted-foreground mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {present.map((segment) => (
                    <li key={segment.key} className="flex items-center gap-1.5">
                        {segment.icon ? (
                            <span
                                aria-hidden
                                className="flex size-3.5 shrink-0 items-center justify-center"
                                style={{ color: segment.color }}
                            >
                                {segment.icon}
                            </span>
                        ) : (
                            <span
                                aria-hidden
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ background: segment.color }}
                            />
                        )}
                        {segment.label}
                        <span className="text-foreground tabular-nums">
                            {segment.value.toLocaleString()}
                        </span>
                        {showShare ? (
                            <span className="tabular-nums">
                                · {Math.round((segment.value / total) * 100)}%
                            </span>
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}
