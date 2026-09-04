import ContentBody from '@/components/content/content-body';
import type { Post } from '@/types/content';

/*
  Every post renders through here. The chrome - title, date, tags - is
  post-layout.tsx, which reads the same props from the page context.
*/
export default function PostPage({ post }: { post: Post }) {
    return <ContentBody blocks={post.rendered} />;
}
