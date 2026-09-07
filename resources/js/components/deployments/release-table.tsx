import { ExternalLink, History } from 'lucide-react';

import PanelCard from '@/components/admin/panel-card';
import {
    releaseColor,
    releaseGlyph,
    releaseLabel,
    releaseState,
} from '@/components/deployments/release-glyphs';
import type { ReleaseState } from '@/components/deployments/release-glyphs';
import { timeAgo } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { ErrorRelease } from '@/types/deployments';

type ReleaseTableProps = {
    releases: ErrorRelease[];
    /** The build this container reports, from config('sentry.release'). */
    running: string | null;
};

/**
 * The release history, newest first.
 *
 * Sentry's own ordering, passed through rather than re-sorted: `dateCreated`
 * and `lastDeploy` disagree once a commit is redeployed, and Sentry's ranking
 * is the one its web UI shows, so re-sorting here would make the two disagree.
 *
 * One row per version rather than per deploy event - the list endpoint carries
 * each version's most recent deploy, so redeploying an unchanged commit moves a
 * row's timestamp instead of adding a row. A literal per-deploy log would cost
 * one request per release against an API that rate-limits on caller identity.
 *
 * The row marker used to be a coloured dot and nothing else, which left "this
 * is the build that is serving" carried by colour alone - the same bug the
 * issue row was fixed for. Each state that means anything now carries a word,
 * and the glyph is the second reading rather than the only one.
 */
export default function ReleaseTable({ releases, running }: ReleaseTableProps) {
    if (releases.length === 0) {
        return (
            <PanelCard title="Releases" icon={History}>
                <p className="text-muted-foreground mt-3 text-sm">
                    No tagged releases yet. The deploy workflow tags one on each
                    green build of <code>production</code>.
                </p>
            </PanelCard>
        );
    }

    return (
        <PanelCard title="Releases" icon={History}>
            <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-muted-foreground border-border border-b text-left">
                        <tr>
                            <th className="py-2 pr-4 font-medium">Version</th>
                            <th className="py-2 pr-4 font-medium">
                                Environment
                            </th>
                            <th className="py-2 pr-4 font-medium">Deployed</th>
                            <th className="py-2 text-right font-medium">
                                New issues
                            </th>
                            <th className="py-2 pl-4">
                                <span className="sr-only">Sentry</span>
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-border divide-y">
                        {releases.map((release) => {
                            const state = releaseState(
                                release.version,
                                running,
                                releases,
                            );
                            const label = releaseLabel(state);

                            return (
                                <tr key={release.version}>
                                    <td className="py-2.5 pr-4">
                                        <div className="flex items-center gap-2">
                                            {/* A fixed box whatever the glyph
                                                is, so the versions line up down
                                                the column - the same reason the
                                                issue list boxes its own. */}
                                            <span
                                                data-test="release-glyph"
                                                className="flex size-4 shrink-0 items-center justify-center"
                                                style={{
                                                    color: releaseColor(state),
                                                }}
                                            >
                                                {releaseGlyph(state)}
                                            </span>

                                            <span className="text-foreground font-mono font-medium">
                                                {release.shortVersion}
                                            </span>

                                            {label ? (
                                                <Tag
                                                    label={label}
                                                    state={state}
                                                />
                                            ) : null}
                                        </div>
                                    </td>

                                    <td className="py-2.5 pr-4">
                                        {release.environment ? (
                                            <Tag label={release.environment} />
                                        ) : (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </td>

                                    <td className="text-muted-foreground py-2.5 pr-4">
                                        {release.deployedAt
                                            ? timeAgo(release.deployedAt)
                                            : 'never deployed'}
                                    </td>

                                    <td className="py-2.5 text-right tabular-nums">
                                        <span
                                            className={
                                                release.newGroups > 0
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground'
                                            }
                                        >
                                            {release.newGroups.toLocaleString()}
                                        </span>
                                    </td>

                                    <td className="py-2.5 pl-4">
                                        {release.permalink ? (
                                            <a
                                                href={release.permalink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-muted-foreground hover:text-foreground inline-flex"
                                            >
                                                <ExternalLink className="size-4" />
                                                <span className="sr-only">
                                                    Open {release.shortVersion}{' '}
                                                    in Sentry
                                                </span>
                                            </a>
                                        ) : null}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </PanelCard>
    );
}

/**
 * The row's words: its state, and the environment it went to.
 *
 * `state` is what colours it. Without one - the environment case - the chip is
 * muted, because "production" is where a release went rather than a judgement
 * about it.
 */
function Tag({ label, state }: { label: string; state?: ReleaseState }) {
    return (
        <span
            className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase',
                tagClass(state),
            )}
        >
            {label}
        </span>
    );
}

function tagClass(state?: ReleaseState): string {
    switch (state) {
        case 'running':
            return 'bg-chart-2/15 text-chart-2';
        case 'superseded':
            return 'bg-destructive/15 text-destructive';
        case 'latest':
            return 'bg-chart-3/15 text-chart-3';
        default:
            return 'bg-muted text-muted-foreground';
    }
}
