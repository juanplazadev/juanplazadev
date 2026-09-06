import { cn } from '@/lib/utils';

type SparklineProps = {
    /** Counts, oldest first. Hourly for an issue, daily for a trend. */
    counts: number[];
    className?: string;
};

const WIDTH = 64;
const HEIGHT = 20;

/**
 * A short series drawn small enough to sit inside a row.
 *
 * Hand-rolled SVG rather than a recharts instance: ten of these on the errors
 * page would each mount a ResponsiveContainer and a resize observer to draw
 * what is, at this size, a polyline. That is also what keeps the overview off
 * recharts entirely - it wants the shape of a week, not an axis.
 *
 * Scaled against its own peak, so the shape reads whatever the magnitude.
 */
export default function Sparkline({ counts, className }: SparklineProps) {
    if (counts.length < 2) {
        return null;
    }

    const peak = Math.max(...counts);
    const step = WIDTH / (counts.length - 1);

    const points = counts
        .map((count, index) => {
            // A flat series sits on the baseline rather than dividing by zero.
            const y = peak > 0 ? HEIGHT - (count / peak) * HEIGHT : HEIGHT;

            return `${(index * step).toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');

    return (
        <svg
            aria-hidden
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            width={WIDTH}
            height={HEIGHT}
            preserveAspectRatio="none"
            className={cn('shrink-0 overflow-visible', className)}
        >
            <polyline
                points={points}
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
