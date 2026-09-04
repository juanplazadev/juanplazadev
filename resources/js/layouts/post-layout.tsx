import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import Badge from '@/components/site/badge';
import { index } from '@/routes/posts';
import type { Post } from '@/types/content';

/*
  The chrome around a post. The prose itself is the page component this wraps -
  one Inertia page per post, which is what lets Vite split each write-up into
  its own chunk while still server-rendering the text.

  The metadata comes from the controller rather than from the page component, so
  the title and date exist before the body does.
*/
export default function PostLayout({ children }: { children: ReactNode }) {
    const { post } = usePage<{ post: Post }>().props;

    return (
        <>
            <Head title={post.title}>
                <meta
                    name="description"
                    content={post.summary}
                    head-key="description"
                />
            </Head>

            <article>
                <header className="border-border mb-8 border-b pb-8">
                    <div className="text-muted-foreground mb-3 flex items-center gap-2 text-[13px] font-medium">
                        {post.date ? (
                            <time dateTime={post.date}>
                                {post.formattedDate}
                            </time>
                        ) : (
                            <span>{post.formattedDate}</span>
                        )}
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

                <div className="prose">{children}</div>

                <footer className="border-border mt-10 border-t pt-6">
                    <Link
                        className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                        href={index()}
                        prefetch
                    >
                        <span aria-hidden="true">&larr;</span>
                        All posts
                    </Link>
                </footer>
            </article>
        </>
    );
}
