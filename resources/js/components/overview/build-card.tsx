import SectionCard from '@/components/overview/section-card';
import { timeAgo } from '@/lib/time';
import { deployments as deploymentsRoute } from '@/routes/admin';
import type { Deployments } from '@/types/deployments';

type BuildCardProps = {
    running: string | null;
    deploys: Deployments;
};

/**
 * What shipped last, and whether it is what is serving.
 *
 * The condensed form of the deployments page's headline. It states the drift
 * case in one line and sends you there for the history behind it.
 */
export default function BuildCard({ running, deploys }: BuildCardProps) {
    const { releases, error } = deploys;
    const latest = releases[0] ?? null;
    const current = releases.find((release) => release.version === running);
    const runningIndex = releases.findIndex(
        (release) => release.version === running,
    );
    const drifted = runningIndex > 0;

    return (
        <SectionCard
            title="Build"
            href={deploymentsRoute.url()}
            linkLabel="Deployments"
        >
            {error ? (
                <p className="text-muted-foreground mt-3 text-sm">{error}</p>
            ) : (
                <>
                    <p className="text-foreground font-display mt-2 truncate font-mono text-2xl font-semibold">
                        {running === null ? (
                            <span className="text-muted-foreground font-sans">
                                not reported
                            </span>
                        ) : (
                            (current?.shortVersion ?? running)
                        )}
                    </p>

                    <p className="text-muted-foreground mt-1 text-xs">
                        {current?.deployedAt
                            ? `Deployed ${timeAgo(current.deployedAt)}`
                            : 'No deploy recorded for this build'}
                    </p>

                    <p
                        className={
                            drifted
                                ? 'text-destructive mt-4 text-xs'
                                : 'text-muted-foreground mt-4 text-xs'
                        }
                    >
                        {drifted
                            ? `${latest?.shortVersion} shipped but is not running`
                            : summary(latest, releases.length)}
                    </p>
                </>
            )}
        </SectionCard>
    );
}

function summary(
    latest: { shortVersion: string } | null,
    count: number,
): string {
    if (latest === null) return 'No tagged releases yet';

    return `${count} ${count === 1 ? 'release' : 'releases'} tagged · newest ${latest.shortVersion}`;
}
