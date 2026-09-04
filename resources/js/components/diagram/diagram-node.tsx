import type { IconName } from '@/lib/icons';
import { ICON_SIZE, icons } from '@/lib/icons';
import type { Box } from './box';

const variants = {
    default: { fill: 'var(--card)', stroke: 'var(--border)', dash: undefined },
    /** The one box the diagram is actually about. */
    accent: {
        fill: 'var(--accent)',
        stroke: 'var(--primary)',
        dash: undefined,
    },
    /** Not built yet. */
    planned: { fill: 'transparent', stroke: 'var(--border)', dash: '4 4' },
} as const;

type DiagramNodeProps = {
    box: Box;
    label: string;
    sublabel?: string;
    variant?: keyof typeof variants;
    icon?: IconName;
    /** "left" puts the icon beside left-aligned text and needs roughly 60 units of
     *  width for itself. "top" centres it above the label - for narrow boxes. */
    iconPlacement?: 'left' | 'top';
};

const GLYPH = 18;
const GUTTER = 14;

/*
  Every colour in here is a var(--…) rather than a Tailwind utility, and that is
  deliberate. Inside an <svg>, `text-muted-foreground` sets `color`, not `fill`,
  so a <text> carrying only that class renders black in both themes. Pointing at
  the tokens directly is one rule with no exceptions, and it is what makes the
  six palettes and dark mode work here for free.
*/
export default function DiagramNode({
    box,
    label,
    sublabel,
    variant = 'default',
    icon,
    iconPlacement = 'left',
}: DiagramNodeProps) {
    const { fill, stroke, dash } = variants[variant];
    const side = Boolean(icon) && iconPlacement === 'left';

    // Left-aligned text once an icon sits beside it; centred otherwise.
    const textX = side ? box.x + GUTTER + GLYPH + 10 : box.cx;
    const anchor = side ? 'start' : 'middle';

    // "top" pushes the text down to make room for the glyph above it, so those
    // boxes need to be tall enough (~78 units) to hold both.
    const top = Boolean(icon) && iconPlacement === 'top';
    const labelY = top ? box.y + 46 : sublabel ? box.cy - 8 : box.cy;
    const sublabelY = top ? box.y + 61 : box.cy + 9;

    const glyphX = side ? box.x + GUTTER : box.cx - GLYPH / 2;
    const glyphY = side ? box.cy - GLYPH / 2 : box.y + 22 - GLYPH / 2;
    const scale = GLYPH / ICON_SIZE;

    return (
        <g>
            <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                rx={8}
                fill={fill}
                stroke={stroke}
                strokeWidth={1}
                strokeDasharray={dash}
            />

            {icon && (
                <g
                    transform={`translate(${glyphX} ${glyphY}) scale(${scale})`}
                    fill="var(--muted-foreground)"
                >
                    <path d={icons[icon]} />
                </g>
            )}

            <text
                x={textX}
                y={labelY}
                textAnchor={anchor}
                dominantBaseline="central"
                fontSize={12}
                fontWeight={600}
                fill="var(--foreground)"
            >
                {label}
            </text>
            {sublabel && (
                <text
                    x={textX}
                    y={sublabelY}
                    textAnchor={anchor}
                    dominantBaseline="central"
                    fontSize={9.5}
                    fill="var(--muted-foreground)"
                >
                    {sublabel}
                </text>
            )}
        </g>
    );
}
