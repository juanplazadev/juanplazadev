import { Suspense } from "react";
import { Link, useParams } from "react-router";

import Badge from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import StatusDot from "@/components/ui/status-dot";
import { useDocumentTitle } from "@/components/ui/use-document-title";
import { getArchitecture } from "@/content/architectures";

import NotFound from "./NotFound";

export default function ArchitectureDetail() {
  const { slug } = useParams();
  const item = slug ? getArchitecture(slug) : undefined;

  // Same shape as Post.tsx: hooks cannot sit behind the early return, so the
  // title is computed for the missing case too and simply never used.
  useDocumentTitle(item ? `${item.title} - Architecture - Juan Plaza` : "Page not found - Juan Plaza");

  // A bad slug is a 404, not a blank article shell.
  if (!item) return <NotFound />;

  const Body = item.body;

  return (
    <article>
      <header className="border-border mb-8 border-b pb-8">
        <div className="mb-3">
          <Badge variant={item.active ? "accent" : "outline"} className="px-2 py-0.5 text-[11px]">
            {item.active && <StatusDot />}
            {item.status}
          </Badge>
        </div>

        <h1 className="font-inter-tight text-foreground mb-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {item.title}
        </h1>

        <p className="text-muted-foreground mb-4 text-[15px] text-balance">{item.tagline}</p>

        <ul className="flex flex-wrap gap-1.5">
          {item.stack.map((tech) => (
            <li key={tech.label}>
              <Badge variant="outline">
                {tech.icon && <Icon name={tech.icon} size={13} className="opacity-70" />}
                {tech.label}
              </Badge>
            </li>
          ))}
        </ul>

        {/* Above the prose on purpose. A reader who only wants to see the thing
            run should not have to scroll a write-up to find out they can. */}
        {item.links && (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
            {item.links.map((link) => (
              <li key={link.href}>
                <a
                  className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label}
                  <span aria-hidden="true">&#8599;</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* Lazy, so the diagrams and prose stay out of the main bundle. Blank
          fallback rather than a spinner - on a local chunk it would only flash. */}
      <div className="prose">
        <Suspense fallback={null}>
          <Body />
        </Suspense>
      </div>

      <footer className="border-border mt-10 border-t pt-6">
        <Link
          className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
          to="/architecture"
        >
          <span aria-hidden="true">&larr;</span>
          All architecture write-ups
        </Link>
      </footer>
    </article>
  );
}
