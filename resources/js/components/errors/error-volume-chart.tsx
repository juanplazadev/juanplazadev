import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import type { ErrorPoint } from '@/types/errors';
import PanelCard from '@/components/admin/panel-card';

type ErrorVolumeChartProps = {
    series: ErrorPoint[];
};

/**
 * Accepted and dropped events over the selected range.
 *
 * Both series are drawn because they answer different questions: accepted is
 * what the plan was charged for, dropped is what arrived after the quota ran
 * out or a filter caught it. A month that looks quiet on the first line while
 * the second climbs is a month of errors nobody is being told about.
 *
 * Colours come from --chart-* rather than literals, the same as the traffic
 * chart, so this follows all six palettes and both appearances for free.
 * initialDimension is not decoration: ResponsiveContainer renders nothing until
 * it has measured its parent.
 */
export default function ErrorVolumeChart({ series }: ErrorVolumeChartProps) {
    return (
        <PanelCard title="Event volume">
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
                                id="errors-accepted"
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
                            dataKey="dropped"
                            name="Dropped"
                            stroke="var(--chart-4)"
                            strokeWidth={1}
                            fill="none"
                        />
                        <Area
                            type="monotone"
                            dataKey="accepted"
                            name="Accepted"
                            stroke="var(--chart-1)"
                            strokeWidth={2}
                            fill="url(#errors-accepted)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </PanelCard>
    );
}

/** "2026-09-05" -> "Sep 5". Parsed as UTC to match Sentry's day boundary. */
function formatDay(value: string): string {
    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}
