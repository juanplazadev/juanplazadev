import { ExternalLink } from 'lucide-react';

import Sparkline from '@/components/admin/sparkline';
import { timeAgo } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { ErrorIssue } from '@/types/errors';
import PanelCard from '@/components/admin/panel-card';

type IssueListProps = {
    issues: ErrorIssue[];
    emptyLabel?: string;
};

/**
 * Unresolved issues, most frequent first.
 *
 * Ranked by event count rather than recency on purpose: this page exists to
 * answer "what is broken", and the thing firing a thousand times an hour is the
 * answer even when something quieter happened more recently.
 */
export default function IssueList({
    issues,
    emptyLabel = 'Nothing unresolved in this window.',
}: IssueListProps) {
    return (
        <PanelCard title="Unresolved issues">
            {issues.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                    {emptyLabel}
                </p>
            ) : (
                <ol className="divide-border mt-3 divide-y">
                    {issues.map((issue) => (
                        <li
                            key={issue.id}
                            className="flex items-center gap-3 py-2.5"
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'size-2 shrink-0 rounded-full',
                                    levelColor(issue.level),
                                )}
                            />

                            <div className="min-w-0 flex-1">
                                <p className="text-foreground truncate text-sm font-medium">
                                    {issue.title}
                                </p>
                                <p className="text-muted-foreground truncate text-xs">
                                    {issue.culprit || issue.shortId} ·{' '}
                                    {timeAgo(issue.lastSeen)}
                                </p>
                            </div>

                            <Sparkline counts={issue.sparkline} />

                            <div className="shrink-0 text-right">
                                <p className="text-foreground text-sm tabular-nums">
                                    {issue.count.toLocaleString()}
                                </p>
                                <p className="text-muted-foreground text-xs tabular-nums">
                                    {issue.userCount.toLocaleString()} users
                                </p>
                            </div>

                            {issue.permalink ? (
                                <a
                                    href={issue.permalink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-muted-foreground hover:text-foreground shrink-0"
                                >
                                    <ExternalLink className="size-4" />
                                    <span className="sr-only">
                                        Open {issue.shortId} in Sentry
                                    </span>
                                </a>
                            ) : null}
                        </li>
                    ))}
                </ol>
            )}
        </PanelCard>
    );
}

function levelColor(level: string): string {
    switch (level) {
        case 'fatal':
        case 'error':
            return 'bg-destructive';
        case 'warning':
            return 'bg-chart-4';
        default:
            return 'bg-muted-foreground';
    }
}
