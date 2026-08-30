import { Suspense } from "react";
import { Link, useParams } from "react-router";

import Badge from "@/components/ui/badge";
import { useDocumentTitle } from "@/components/ui/use-document-title";
import { formatDate, getPost } from "@/content/posts";

import NotFound from "./NotFound";

export default function Post() {
  const { slug } = useParams();
  const post = slug ? getPost(slug) : undefined;

  // Hooks cannot sit behind the early return below, so the title is computed
  // for the missing case too and simply never used.
  useDocumentTitle(post ? `${post.title} — Juan Plaza` : "Page not found — Juan Plaza");

  // A bad slug is a 404, not a blank article shell.
  if (!post) return <NotFound />;

  const Body = post.body;

  return (
    <article>
      <header className="border-border mb-8 border-b pb-8">
        <div className="text-muted-foreground mb-3 flex items-center gap-2 text-[13px] font-medium">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true">&middot;</span>
          <span>{post.readingMinutes} min read</span>
        </div>

        <h1 className="font-inter-tight text-foreground mb-4 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {post.title}
        </h1>

        <ul className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="outline">{tag}</Badge>
            </li>
          ))}
        </ul>
      </header>

      {/* The body is a lazy chunk, so the shell above paints while it loads.
          The fallback is blank rather than a spinner — on a local chunk it is
          on screen for a frame or two and a spinner would only flash. */}
      <div className="prose">
        <Suspense fallback={null}>
          <Body />
        </Suspense>
      </div>

      <footer className="border-border mt-10 border-t pt-6">
        <Link
          className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
          to="/blog"
        >
          <span aria-hidden="true">&larr;</span>
          All posts
        </Link>
      </footer>
    </article>
  );
}
