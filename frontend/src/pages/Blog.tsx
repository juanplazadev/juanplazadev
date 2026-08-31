import PostCard from "@/components/ui/post-card";
import { useDocumentTitle } from "@/components/ui/use-document-title";
import { getPosts } from "@/content/posts";

export default function Blog() {
  const posts = getPosts();

  useDocumentTitle("Writing — Juan Plaza");

  return (
    <section>
      <div className="mb-8">
        <h1 className="font-inter-tight text-foreground mb-2 text-2xl font-bold tracking-tight">Writing</h1>
        <p className="text-muted-foreground text-[15px] text-balance">
          Notes on the things I build and the ones that break — Laravel, PHP, and the infrastructure underneath them.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing published yet. Check back soon.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
