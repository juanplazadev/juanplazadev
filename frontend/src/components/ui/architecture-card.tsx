import { Link } from "react-router";

import type { Architecture } from "@/content/architectures";

import ArrowIcon from "./arrow-icon";
import Badge from "./badge";
import Card from "./card";
import Icon from "./icon";
import StatusDot from "./status-dot";

// One entry on the architecture index. Same shape as post-card.tsx: the whole
// card is the hit area, via the <a>'s before: pseudo-element stretched over the
// (relative) card.
export default function ArchitectureCard({ item }: { item: Architecture }) {
  return (
    <Card interactive className="group">
      <div className="text-muted-foreground group-hover:text-primary absolute top-5 right-5 transition group-hover:rotate-45">
        <ArrowIcon />
      </div>

      <div className="mb-2 space-y-2">
        <div>
          <Badge variant={item.active ? "accent" : "outline"} className="px-2 py-0.5 text-[11px]">
            {item.active && <StatusDot />}
            {item.status}
          </Badge>
        </div>
        <h3 className="text-foreground group-hover:text-primary pr-6 font-semibold transition-colors">
          <Link
            className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-lg outline-none before:absolute before:inset-0 focus-visible:ring-2 focus-visible:ring-offset-2"
            to={`/architecture/${item.slug}`}
          >
            {item.title}
          </Link>
        </h3>
      </div>

      <p className="text-muted-foreground text-sm">{item.tagline}</p>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {item.stack.map((tech) => (
          <li key={tech.label}>
            <Badge variant="outline" className="px-2 py-0.5 text-[11px]">
              {tech.icon && <Icon name={tech.icon} size={12} className="opacity-70" />}
              {tech.label}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
