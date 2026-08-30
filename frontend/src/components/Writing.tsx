import { Link } from "react-router";

import PostCard from "@/components/ui/post-card";
import Section from "@/components/ui/section";
import { getPosts } from "@/content/posts";

// The home page teaser. Deliberately capped: the point is to show the blog
// exists and is current, not to be a second index. /blog is the index.
const TEASER_COUNT = 3;

export default function Writing() {
  const all = getPosts();
  const posts = all.slice(0, TEASER_COUNT);

  // Nothing published yet renders no heading at all, rather than an empty one.
  if (posts.length === 0) return null;

  return (
    <Section title="Writing">
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      {all.length > TEASER_COUNT && (
        <Link
          className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
          to="/blog"
        >
          All posts
          <span aria-hidden="true">&rarr;</span>
        </Link>
      )}
    </Section>
  );
}
