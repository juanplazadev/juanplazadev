import type { ReactNode } from 'react';

type DiagramGroupProps = {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    /** Which top corner the label sits in. Move it when a spine or an edge label
     *  runs through the default one - they end up on the same baseline and read
     *  as a single run of text. */
    labelAnchor?: 'start' | 'end';
    children?: ReactNode;
};

// A boundary: the VPS, a Docker network. Dashed so it never reads as a node.
export default function DiagramGroup({
    x,
    y,
    w,
    h,
    label,
    labelAnchor = 'start',
    children,
}: DiagramGroupProps) {
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={10}
                fill="none"
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray="3 4"
            />
            <text
                x={labelAnchor === 'end' ? x + w - 12 : x + 12}
                y={y}
                textAnchor={labelAnchor}
                dominantBaseline="central"
                fontSize={9.5}
                fontWeight={500}
                fill="var(--muted-foreground)"
                stroke="var(--muted)"
                strokeWidth={4}
                strokeLinejoin="round"
                paintOrder="stroke"
            >
                {label}
            </text>
            {children}
        </g>
    );
}
