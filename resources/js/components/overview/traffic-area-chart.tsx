import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { formatDay } from '@/components/admin/format';
import type { AnalyticsPoint } from '@/types/analytics';

type TrafficAreaChartProps = {
    series: AnalyticsPoint[];
};

/**
 * The overview's week of visits, with real axes.
 *
 * The only recharts import the admin root reaches, and it is reached through
 * lazy() in traffic-card.tsx so it lands in its own async chunk rather than the
 * root's entry. That boundary is only safe because this sits inside the deferred
 * `traffic` prop: deferred props are absent from the SSR response, so nothing
 * here ever renders server-side and there is no suspension for SSR to resolve.
 * See .ai/rules/components-admin.md before moving it onto an eager prop.
 *
 * One series, deliberately. --chart-1..5 are five steps of a single accent ramp
 * rather than five hues, so a second series drawn from them reads as a lighter
 * copy of the first rather than a distinct thing. Pageviews stay a number in the
 * card's subtitle, where they say more than a second band would; the full
 * two-series chart is one click away at /dashboard/analytics.
 *
 * The mount animation is off, unlike the section pages'. This card is already
 * two round trips deep - a deferred prop, then the chart chunk - so by the time
 * it can draw, the reader has been waiting; measured, recharts' 1.5s reveal was
 * still only a fraction drawn at networkidle. The number is the point, and it
 * should be there the moment the chunk lands.
 *
 * initialDimension is not decoration: ResponsiveContainer renders nothing until
 * it has measured its parent, so without it the chart is blank for a frame - and
 * blank permanently anywhere there is no layout pass to measure against.
 */
export default function TrafficAreaChart({ series }: TrafficAreaChartProps) {
    return (
        <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 160 }}
        >
            <AreaChart
                data={series}
                margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
            >
                <defs>
                    {/*
                      SVG ids are global to the document, so this must not reuse
                      the analytics page's "analytics-visits".
                    */}
                    <linearGradient
                        id="overview-visits"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0.35}
                        />
                        <stop
                            offset="100%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0}
                        />
                    </linearGradient>
                </defs>

                {/* Solid hairline: a dashed grid reads as a threshold. */}
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                        fill: 'var(--muted-foreground)',
                        fontSize: 11,
                    }}
                    tickFormatter={formatDay}
                    minTickGap={16}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{
                        fill: 'var(--muted-foreground)',
                        fontSize: 11,
                    }}
                    width={44}
                    allowDecimals={false}
                />
                <Tooltip
                    cursor={{ stroke: 'var(--border)' }}
                    labelFormatter={(label) =>
                        typeof label === 'string' ? formatDay(label) : ''
                    }
                    contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        color: 'var(--popover-foreground)',
                        fontSize: '0.75rem',
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="visits"
                    isAnimationActive={false}
                    name="Visits"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#overview-visits)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
