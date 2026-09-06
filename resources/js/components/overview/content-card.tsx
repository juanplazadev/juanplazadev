import SectionCard from '@/components/overview/section-card';
import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import type { ContentSnapshot } from '@/types/overview';

/**
 * What is published, what is not, and how long since the last one.
 *
 * The only card on the overview that needs no network, so it is also the only
 * one that is never in a loading state.
 */
export default function ContentCard({ content }: { content: ContentSnapshot }) {
    const { posts, architectures, activeSystems } = content;

    return (
        <SectionCard
            title="Content"
            href={PostController.index.url()}
            linkLabel="Manage"
        >
            <p className="text-foreground font-display mt-2 text-3xl font-semibold tabular-nums">
                {posts.published.toLocaleString()}
                <span className="text-muted-foreground text-base font-normal">
                    {' '}
                    {posts.published === 1 ? 'post' : 'posts'}
                </span>
            </p>

            <p className="text-muted-foreground mt-1 text-xs">
                {lastPublished(content)}
            </p>

            <dl className="text-muted-foreground mt-4 space-y-1.5 text-xs">
                <Row
                    label="Drafts"
                    value={(
                        posts.drafts + architectures.drafts
                    ).toLocaleString()}
                />
                <Row
                    label="Architecture write-ups"
                    value={architectures.published.toLocaleString()}
                />
                <Row
                    label="Systems marked live"
                    value={activeSystems.toLocaleString()}
                />
            </dl>
        </SectionCard>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <dt>{label}</dt>
            <dd className="text-foreground tabular-nums">{value}</dd>
        </div>
    );
}

function lastPublished(content: ContentSnapshot): string {
    const days = content.daysSinceLastPublish;

    if (days === null) return 'Nothing published yet';
    if (days === 0) return 'Published today';
    if (days === 1) return 'Published yesterday';

    return `${days} days since the last post`;
}
