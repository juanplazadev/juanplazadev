import { cn } from "./cn";
import type { IconName } from "./icons";
import { ICON_SIZE, icons } from "./icons";

type IconProps = {
  name: IconName;
  /** Rendered size in px. The path is scaled from its 24x24 viewBox. */
  size?: number;
  className?: string;
};

// A vendored Iconify path, as a DOM element. `fill-current` rather than a fixed
// colour, so the icon takes whatever text colour its container carries — which
// is what keeps it tracking the palette.
//
// For an icon inside a diagram, use DiagramNode's `icon` prop instead: an <svg>
// nested in the diagram's own <svg> is a different thing to place.
export default function Icon({ name, size = 16, className }: IconProps) {
  return (
    <svg
      className={cn("fill-current", className)}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
      aria-hidden="true"
    >
      <path d={icons[name]} />
    </svg>
  );
}
