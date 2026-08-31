import type { ComponentType, LazyExoticComponent } from "react";
import { lazy } from "react";

import type { IconName } from "@/components/ui/icons";

export type Architecture = {
  /** URL segment. Must be unique - it is the route param. */
  slug: string;
  title: string;
  /** One line. Shown on the index and under the heading on the page itself. */
  tagline: string;
  /** Free text: "Live", "In development". */
  status: string;
  /** Up and serving traffic - drives the pinging StatusDot, not "worked on". */
  active: boolean;
  /** The badge row. Keep to the things a reader would scan for. */
  stack: { label: string; icon?: IconName }[];
  /** Off-site proof: the running app, the source. Optional because not every
   *  write-up has either - this site's own repo is private, so it has none. A
   *  write-up that can be clicked into is worth more than one that cannot. */
  links?: { label: string; href: string }[];
  /** The write-up, split out so its diagrams stay out of the main bundle. */
  body: LazyExoticComponent<ComponentType>;
};

/*
  The same shape as content/posts.ts, and for the same reason: one module is the
  single source of truth, so when the Laravel API lands this is the only file
  that changes.

  No date field. These are living documents rather than dated posts - there is
  nothing to sort by, so the array order is the display order.
*/
const architectures: Architecture[] = [
  {
    slug: "juanplaza-dev",
    title: "juanplaza.dev",
    tagline:
      "This site. One container behind Caddy, deployed from a self-hosted runner on the same box it serves from.",
    status: "Live",
    active: true,
    stack: [
      { label: "React 19", icon: "react" },
      { label: "TypeScript", icon: "typescript" },
      { label: "Vite", icon: "vite" },
      { label: "Tailwind v4", icon: "tailwind" },
      { label: "nginx", icon: "nginx" },
      { label: "Caddy", icon: "caddy" },
      { label: "GitHub Actions", icon: "githubActions" },
    ],
    body: lazy(() => import("./architectures/juanplaza-dev")),
  },
  {
    slug: "check-in",
    title: "Check-in",
    tagline:
      "Appointment scheduling and driver check-in across sites. Laravel on Octane, with queues, PDFs and SMS behind it.",
    status: "In development",
    active: false,
    stack: [
      { label: "Laravel 13", icon: "laravel" },
      { label: "PHP 8.5", icon: "php" },
      { label: "Inertia + React", icon: "inertia" },
      { label: "Vite", icon: "vite" },
      { label: "PostgreSQL", icon: "postgresql" },
      { label: "Redis", icon: "redis" },
      { label: "Horizon", icon: "laravelHorizon" },
    ],
    links: [
      { label: "Live demo", href: "https://ci.thatdevjp.com" },
      { label: "Source", href: "https://github.com/juanplazadev/check-in-v2" },
    ],
    body: lazy(() => import("./architectures/check-in")),
  },
];

export function getArchitectures(): Architecture[] {
  return architectures;
}

export function getArchitecture(slug: string): Architecture | undefined {
  return architectures.find((architecture) => architecture.slug === slug);
}
