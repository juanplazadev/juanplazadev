import type { ComponentType, LazyExoticComponent } from "react";
import { lazy } from "react";

export type Post = {
  /** URL segment. Must be unique - it is the route param. */
  slug: string;
  title: string;
  /** ISO 8601. Sorted on and formatted for display; never shown raw. */
  date: string;
  /** One or two sentences. Shown on the index, the home teaser and in <meta>. */
  summary: string;
  tags: string[];
  /** Rough read time in minutes. */
  readingMinutes: number;
  /** The body, split out so a post's prose is not in the main bundle. */
  body: LazyExoticComponent<ComponentType>;
};

// The single source of truth for the blog. Adding a post is: drop a component
// in ./posts/, add an entry here. When the Laravel API lands this module is
// the one thing that changes - everything else consumes getPosts()/getPost().
const posts: Post[] = [
  {
    slug: "automatic-https-with-caddy",
    title: "Automatic HTTPS with Caddy and Let's Encrypt",
    date: "2026-08-24",
    summary:
      "Caddy issues and renews certificates on its own. Here is the whole setup that fronts every container on this box, and the two things that actually go wrong.",
    tags: ["Caddy", "Let's Encrypt", "Docker", "TLS"],
    readingMinutes: 5,
    body: lazy(() => import("./posts/automatic-https-with-caddy")),
  },
];

/** Newest first. */
export function getPosts(): Post[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}

// Parsed as UTC-noon rather than `new Date(post.date)`, which reads a bare
// ISO date as midnight UTC and renders as the previous day west of Greenwich.
export function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
