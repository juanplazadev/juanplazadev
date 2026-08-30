import { Link } from "react-router";

import type { Post } from "@/content/posts";
import { formatDate } from "@/content/posts";

import Card from "./card";

const ArrowIcon = () => (
  <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="10" height="10" aria-hidden="true">
    <path d="M1.018 10 0 8.983l7.572-7.575H1.723L1.736 0H10v8.266H8.577l.013-5.841L1.018 10Z" />
  </svg>
);

// One post, as it appears on the blog index and in the home page teaser. The
// whole card is the hit area: the <a> is positioned over it by the before:
// pseudo-element, which is also why the card is `relative`.
export default function PostCard({ post }: { post: Post }) {
  return (
    <Card interactive className="group">
      <div className="text-muted-foreground group-hover:text-primary absolute top-5 right-5 transition group-hover:rotate-45">
        <ArrowIcon />
      </div>

      <div className="mb-2 space-y-1.5">
        <div className="text-muted-foreground flex items-center gap-2 text-[13px] font-medium">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true">&middot;</span>
          <span>{post.readingMinutes} min read</span>
        </div>
        <h3 className="text-foreground group-hover:text-primary pr-6 font-semibold transition-colors">
          <Link
            className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-lg outline-none before:absolute before:inset-0 focus-visible:ring-2 focus-visible:ring-offset-2"
            to={`/blog/${post.slug}`}
          >
            {post.title}
          </Link>
        </h3>
      </div>

      <p className="text-muted-foreground text-sm">{post.summary}</p>
    </Card>
  );
}
