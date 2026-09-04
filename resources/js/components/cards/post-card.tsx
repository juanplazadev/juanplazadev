import { Link } from '@inertiajs/react';

import ArrowIcon from '@/components/site/arrow-icon';
import Card from '@/components/site/card';
import { show } from '@/routes/posts';
import type { Post } from '@/types/content';

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
                    {post.date ? (
                        <time dateTime={post.date}>{post.formattedDate}</time>
                    ) : (
                        <span>{post.formattedDate}</span>
                    )}
                    <span aria-hidden="true">&middot;</span>
                    <span>{post.readingMinutes} min read</span>
                </div>
                <h3 className="text-foreground group-hover:text-primary pr-6 font-semibold transition-colors">
                    <Link
                        className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-lg outline-none before:absolute before:inset-0 focus-visible:ring-2 focus-visible:ring-offset-2"
                        href={show(post.slug)}
                        prefetch
                    >
                        {post.title}
                    </Link>
                </h3>
            </div>

            <p className="text-muted-foreground text-sm">{post.summary}</p>
        </Card>
    );
}
