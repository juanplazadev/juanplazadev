import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import type { AnalyticsPoint } from '@/types/analytics';

type TrafficChartProps = {
    series: AnalyticsPoint[];
};

/**
 * Visits and pageviews over the selected range.
 *
 * Colours come from --chart-* rather than literals. Those tokens are already
 * bound to the active accent scale in app.css and already swap for dark mode,
 * so the chart follows all six palettes and both appearances without knowing
 * that either exists. The same trick the SVG diagram components use.
 *
 * initialDimension is not decoration: ResponsiveContainer renders nothing until
 * it has measured its parent, so without it the chart is blank for a frame - and
 * blank permanently anywhere there is no layout pass to measure against.
 */
export default function TrafficChart({ series }: TrafficChartProps) {
    return (
        <div className="border-border bg-card rounded-xl border p-4">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Traffic
            </h3>

            <div className="mt-4 h-64">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                    initialDimension={{ width: 600, height: 256 }}
                >
                    <AreaChart
                        data={series}
                        margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
                    >
                        <defs>
                            <linearGradient
                                id="analytics-visits"
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

                        <CartesianGrid
                            vertical={false}
                            stroke="var(--border)"
                            strokeDasharray="3 3"
                        />
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
                                typeof label === 'string'
                                    ? formatDay(label)
                                    : ''
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
                            dataKey="pageViews"
                            name="Pageviews"
                            stroke="var(--chart-4)"
                            strokeWidth={1}
                            fill="none"
                        />
                        <Area
                            type="monotone"
                            dataKey="visits"
                            name="Visits"
                            stroke="var(--chart-1)"
                            strokeWidth={2}
                            fill="url(#analytics-visits)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/** "2026-09-05" -> "Sep 5". Parsed as UTC to match Cloudflare's day boundary. */
function formatDay(value: string): string {
    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}
