import PanelCard from '@/components/admin/panel-card';
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
 */
export default function ReleaseTable({ releases, running }: ReleaseTableProps) {
    const latest = releases[0]?.version ?? null;

    if (releases.length === 0) {
        return (
            <PanelCard title="Releases">
                <p className="text-muted-foreground mt-3 text-sm">
                    No tagged releases yet. The deploy workflow tags one on each
                    green build of <code>production</code>.
                </p>
            </PanelCard>
        );
    }

    return (
        <PanelCard
            title="Releases"
            action={
                <span className="text-muted-foreground text-xs tabular-nums">
                    {releases.length} shown
                </span>
            }
        >
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
                        </tr>
                    </thead>

                    <tbody className="divide-border divide-y">
                        {releases.map((release) => (
                            <tr key={release.version}>
                                <td className="py-2.5 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'size-2 shrink-0 rounded-full',
                                                release.version === running
                                                    ? 'bg-chart-2'
                                                    : 'bg-muted-foreground/30',
                                            )}
                                        />
                                        <span className="text-foreground font-mono font-medium">
                                            {release.shortVersion}
                                        </span>

                                        {release.version === running ? (
                                            <Tag label="running" emphasis />
                                        ) : null}
                                        {release.version === latest ? (
                                            <Tag label="latest" />
                                        ) : null}
                                    </div>
                                </td>

                                <td className="text-muted-foreground py-2.5 pr-4">
                                    {release.environment ?? '—'}
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </PanelCard>
    );
}

function Tag({ label, emphasis }: { label: string; emphasis?: boolean }) {
    return (
        <span
            className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase',
                emphasis
                    ? 'bg-chart-2/15 text-chart-2'
                    : 'bg-muted text-muted-foreground',
            )}
        >
            {label}
        </span>
    );
}
