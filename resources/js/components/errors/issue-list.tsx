import { ExternalLink } from 'lucide-react';

import Sparkline from '@/components/admin/sparkline';
import {
    levelColor,
    levelGlyph,
    levelLabel,
} from '@/components/errors/level-glyphs';
import { timeAgo } from '@/lib/time';
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
 *
 * The heading carries no glyph, and neither does the quota meter beside the
 * chart. That is a deliberate asymmetry with the traffic page rather than an
 * omission: the icons on this page mark severity, and a card titled "Unresolved
 * issues" above a column of severity glyphs does not need a sixth one.
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
                            {/* A fixed box whatever the glyph is, so the
                                titles line up down the list - the same reason
                                TopList boxes its row glyphs. */}
                            <span
                                data-test="level-glyph"
                                className="flex size-4 shrink-0 items-center justify-center"
                                style={{ color: levelColor(issue.level) }}
                            >
                                {levelGlyph(issue.level)}
                                <span className="sr-only">
                                    {levelLabel(issue.level)}
                                </span>
                            </span>

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
