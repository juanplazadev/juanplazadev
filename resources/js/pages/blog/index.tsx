import { Head } from '@inertiajs/react';

import PostCard from '@/components/cards/post-card';
import type { Post } from '@/types/content';

export default function BlogIndex({ posts }: { posts: Post[] }) {
    return (
        <>
            <Head title="Writing">
                <meta
                    name="description"
                    content="Notes on the things I build and the ones that break - Laravel, PHP, and the infrastructure underneath them."
                    head-key="description"
                />
            </Head>

            <section>
                <div className="mb-8">
                    <h1 className="font-inter-tight text-foreground mb-2 text-2xl font-bold tracking-tight">
                        Writing
                    </h1>
                    <p className="text-muted-foreground text-[15px] text-balance">
                        Notes on the things I build and the ones that break -
                        Laravel, PHP, and the infrastructure underneath them.
                    </p>
                </div>

                {posts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Nothing published yet. Check back soon.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {posts.map((post) => (
                            <PostCard key={post.slug} post={post} />
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
