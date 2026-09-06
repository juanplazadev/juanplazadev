import { timeAgo } from '@/lib/time';
import type { Deployments } from '@/types/deployments';

type OverviewHeaderProps = {
    name: string;
    running: string | null;
    /** Undefined until the deploys group resolves. */
    deploys?: Deployments;
};

/**
 * Who is looking, when, and what is serving.
 *
 * The build line fills in after the deploys group lands rather than shifting
 * the layout: the sentence is there from the first paint, and only the version
 * and its age arrive late.
 */
export default function OverviewHeader({
    name,
    running,
    deploys,
}: OverviewHeaderProps) {
    const current = deploys?.releases.find(
        (release) => release.version === running,
    );

    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="text-foreground font-display text-2xl font-semibold">
                    {greeting()}, {name}
                </h1>
                <p className="text-muted-foreground text-xs">{today()}</p>
            </div>

            <p className="text-muted-foreground text-xs">
                {running === null ? (
                    'This container reports no release'
                ) : (
                    <>
                        running{' '}
                        <span className="text-foreground font-mono">
                            {current?.shortVersion ?? running}
                        </span>
                        {current?.deployedAt
                            ? ` · deployed ${timeAgo(current.deployedAt)}`
                            : null}
                    </>
                )}
            </p>
        </div>
    );
}

function greeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';

    return 'Good evening';
}

/**
 * Formatted in the browser, unlike the public site's dates.
 *
 * Nothing here is server-rendered into shared HTML - the overview is behind
 * auth and rendered per viewer - so the client's own locale and timezone are
 * the right ones to use.
 */
function today(): string {
    return new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}
