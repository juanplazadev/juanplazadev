import Icon from "./icon";
import type { IconName } from "./icons";

type Spec = {
  label: string;
  value: string;
  icon?: IconName;
};

// The "layer / technology" rows both architecture pages want. A <dl> rather than
// a <table>: these are label-value pairs, not a grid, and a real table would
// need its own overflow handling inside the 728px sheet.
export default function SpecList({ items }: { items: Spec[] }) {
  return (
    <dl className="border-border bg-card divide-border divide-y overflow-hidden rounded-lg border text-sm">
      {items.map((item) => (
        <div
          key={item.label}
          className="px-4 py-2.5 min-[440px]:grid min-[440px]:grid-cols-[9rem_1fr] min-[440px]:gap-3"
        >
          <dt className="text-muted-foreground flex items-center gap-2">
            {/* The slot is held open either way, so a row without an icon does
                not pull its label out of line with the rows above it. */}
            {item.icon ? (
              <Icon name={item.icon} size={14} className="shrink-0 opacity-70" />
            ) : (
              <span className="w-3.5 shrink-0" aria-hidden="true" />
            )}
            {item.label}
          </dt>
          <dd className="text-foreground font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
