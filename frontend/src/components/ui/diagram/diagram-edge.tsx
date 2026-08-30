import type { Point } from "./box";

type DiagramEdgeProps = {
  from: Point;
  to: Point;
  /** Right-angle route. "h" runs horizontally first, "v" vertically first. */
  bend?: "h" | "v";
  label?: string;
  /** "dashed" for a connection that is not a request — a planned swap, or a
   *  call that leaves the stack entirely. */
  variant?: "default" | "dashed";
};

/*
  The arrowhead is a drawn <path>, not a <marker>. Markers would need an id, and
  ids are document-global — two diagrams on one page would collide. They also
  resolve `currentColor` against their own position in the tree rather than the
  element referencing them, which browsers disagree about. A rotated triangle has
  neither problem.
*/
export default function DiagramEdge({ from, to, bend, label, variant = "default" }: DiagramEdgeProps) {
  const [fx, fy] = from;
  const [tx, ty] = to;

  let d: string;
  let tail: Point;
  let labelAt: Point;

  if (bend === "h") {
    d = `M ${fx} ${fy} L ${tx} ${fy} L ${tx} ${ty}`;
    tail = [tx, fy];
    labelAt = [(fx + tx) / 2, fy];
  } else if (bend === "v") {
    d = `M ${fx} ${fy} L ${fx} ${ty} L ${tx} ${ty}`;
    tail = [fx, ty];
    labelAt = [fx, (fy + ty) / 2];
  } else {
    d = `M ${fx} ${fy} L ${tx} ${ty}`;
    tail = from;
    labelAt = [(fx + tx) / 2, (fy + ty) / 2];
  }

  // Angle of the final segment, so the head points where the line arrives.
  const angle = (Math.atan2(ty - tail[1], tx - tail[0]) * 180) / Math.PI;
  const stroke = "var(--muted-foreground)";

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={variant === "dashed" ? "4 4" : undefined}
      />
      <path d="M 0 0 L -6 -3.4 L -6 3.4 Z" fill={stroke} transform={`translate(${tx} ${ty}) rotate(${angle})`} />
      {label && (
        <text
          x={labelAt[0]}
          y={labelAt[1]}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fill="var(--muted-foreground)"
          /* Knocks the line out from behind the label: the stroke is painted
             first in the panel's own background colour, then the glyphs. */
          stroke="var(--muted)"
          strokeWidth={4}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {label}
        </text>
      )}
    </g>
  );
}
