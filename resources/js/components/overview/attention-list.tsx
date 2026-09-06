import { Link } from '@inertiajs/react';
import { CircleCheck } from 'lucide-react';

import PanelCard from '@/components/admin/panel-card';
import { timeAgo } from '@/lib/time';
import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import ArchitectureController from '@/actions/App/Http/Controllers/Admin/ArchitectureController';
import { deployments, errors } from '@/routes/admin';
import type { Deployments } from '@/types/deployments';
import type { ErrorInsights } from '@/types/errors';
import type { ContentSnapshot } from '@/types/overview';

type AttentionListProps = {
    content: ContentSnapshot;
    running: string | null;
    health?: ErrorInsights;
    deploys?: Deployments;
};

type Item = {
    key: string;
    text: string;
    href: string;
};

/**
 * The short list of things actually asking for a decision.
 *
 * Composed from whatever has arrived rather than waiting for everything: the
 * content half is there on first paint and each vendor half appends itself when
 * its group lands. An empty list is a real answer and says so, which is why the
 * card is not hidden when there is nothing in it - "nothing needs you" is the
 * thing a daily check is looking for.
 */
export default function AttentionList({
    content,
    running,
    health,
    deploys,
}: AttentionListProps) {
    const items = collect(content, running, health, deploys);

    return (
        <PanelCard title="Needs attention">
            {items.length === 0 ? (
                <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
                    <CircleCheck className="text-chart-2 size-4 shrink-0" />
                    Nothing needs you.
                </p>
            ) : (
                <ul className="divide-border mt-1 divide-y">
                    {items.map((item) => (
                        <li key={item.key}>
                            <Link
                                href={item.href}
                                className="text-foreground hover:text-primary block py-2.5 text-sm"
                            >
                                {item.text}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </PanelCard>
    );
}

function collect(
    content: ContentSnapshot,
    running: string | null,
    health?: ErrorInsights,
    deploys?: Deployments,
): Item[] {
    const items: Item[] = [];

    if (health && !health.error && health.totals.issues > 0) {
        const count = health.totals.issues;

        items.push({
            key: 'issues',
            href: errors.url(),
            text: `${count.toLocaleString()} unresolved ${count === 1 ? 'issue' : 'issues'} in Sentry`,
        });
    }

    if (health && !health.error) {
        const { accepted, quota } = health.totals;

        if (quota > 0 && accepted / quota >= 0.75) {
            items.push({
                key: 'quota',
                href: errors.url(),
                text: `${Math.round((accepted / quota) * 100)}% of the monthly error quota is gone`,
            });
        }
    }

    // Drift is only knowable once both halves are in hand, and only meaningful
    // when the running build appears somewhere other than the top of the list.
    if (deploys && !deploys.error && running !== null) {
        const index = deploys.releases.findIndex(
            (release) => release.version === running,
        );

        if (index > 0) {
            items.push({
                key: 'drift',
                href: deployments.url(),
                text: 'The newest release is not the one running',
            });
        }
    }

    for (const draft of content.staleDrafts) {
        items.push({
            key: `draft-${draft.type}-${draft.slug}`,
            href:
                draft.type === 'post'
                    ? PostController.edit.url(draft.slug)
                    : ArchitectureController.edit.url(draft.slug),
            text: `"${draft.title}" has been a draft since ${timeAgo(draft.updatedAt)}`,
        });
    }

    return items;
}
