import { Head } from '@inertiajs/react';

import ArchitectureCard from '@/components/cards/architecture-card';
import type { Architecture } from '@/types/content';

export default function ArchitectureIndex({
    architectures,
}: {
    architectures: Architecture[];
}) {
    return (
        <>
            <Head title="Architecture">
                <meta
                    name="description"
                    content="How the things I build are actually put together - the containers, the queues, the deploy path, and the decisions that took a second pass to get right."
                    head-key="description"
                />
            </Head>

            <section>
                <div className="mb-8">
                    <h1 className="font-inter-tight text-foreground mb-2 text-2xl font-bold tracking-tight">
                        Architecture
                    </h1>
                    <p className="text-muted-foreground text-[15px] text-balance">
                        How the things I build are actually put together - the
                        containers, the queues, the deploy path, and the
                        decisions that took a second pass to get right.
                    </p>
                </div>

                {architectures.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Nothing published yet. Check back soon.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {architectures.map((item) => (
                            <ArchitectureCard key={item.slug} item={item} />
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
