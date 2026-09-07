import { Link } from '@inertiajs/react';

import {
    deployVerdict,
    verdictTone,
} from '@/components/deployments/release-glyphs';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/time';
import { deployments as deploymentsRoute } from '@/routes/admin';
import type { DeployVerdict } from '@/components/deployments/release-glyphs';
import type { Deployments } from '@/types/deployments';

type BuildChipProps = {
    running: string | null;
    /** Undefined until the deploys group resolves. */
    deploys?: Deployments;
};

type OverviewHeaderProps = BuildChipProps & {
    name: string;
};

/**
 * Who is looking, when, and what is serving.
 *
 * The build chip is the page's one statement of the running release. It used to
 * be said twice - once here as a sentence and again in a Build card at the
 * bottom of the grid - which is what made that card read as an afterthought:
 * it restated this line, and its drift warning was already an entry in "Needs
 * attention". Folding it up here leaves four cards, which grid without an
 * orphan, and leaves the fact stated once.
 *
 * The chip is present from the first paint and only its version and age fill in
 * when the deploys group lands, so the header does not shift under the reader.
 */
export default function OverviewHeader({
    name,
    running,
    deploys,
}: OverviewHeaderProps) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="text-foreground font-display text-2xl font-semibold">
                    {greeting()}, {name}
                </h1>
                <p className="text-muted-foreground text-xs">{today()}</p>
            </div>

            <BuildChip running={running} deploys={deploys} />
        </div>
    );
}

/**
 * The running build, as a doorway to the history behind it.
 *
 * Four states, and drift is the only one that colours itself: a release that
 * shipped and is not the one serving is the single case here worth interrupting
 * for, and it is stated in words as well as colour.
 */
function BuildChip({ running, deploys }: BuildChipProps) {
    const releases = deploys?.releases ?? [];
    const current = releases.find((release) => release.version === running);
    // The comparison behind the chip is the deployments page's own, imported
    // rather than repeated - the two must never disagree about what is serving.
    const verdict = deployVerdict(running, releases);
    const settled = Boolean(deploys) && deploys?.error === null;
    const tone = settled ? verdictTone(verdict) : 'muted';

    return (
        <Link
            href={deploymentsRoute.url()}
            className={cn(
                'border-border bg-card hover:border-muted-foreground/40 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                tone === 'bad' && 'border-destructive/40',
            )}
        >
            <span
                aria-hidden
                className={cn('size-1.5 shrink-0 rounded-full', dotClass(tone))}
            />

            <span className="text-muted-foreground">Build</span>

            {running === null ? (
                <span className="text-muted-foreground">not reported</span>
            ) : (
                <span className="text-foreground font-mono">
                    {current?.shortVersion ?? running}
                </span>
            )}

            <span className="text-muted-foreground">
                {note(verdict, current, deploys)}
            </span>
        </Link>
    );
}

/**
 * Green only once the answer is actually known.
 *
 * The deploys group has not landed on first paint, and it can land as an error.
 * A green dot in either case would claim "current" about a state nobody has
 * checked yet, so an unsettled group reads as muted whatever the verdict says.
 *
 * A container running a version Sentry has never heard of used to land here
 * green: the old check asked only whether the running build sat below the top
 * of the list, and a build in no release at all is not below anything. It is
 * `untagged` now, which the shared verdict rates as badly as drift.
 */
function dotClass(tone: 'good' | 'bad' | 'muted'): string {
    if (tone === 'bad') return 'bg-destructive';
    if (tone === 'good') return 'bg-chart-2';

    return 'bg-muted-foreground/40';
}

/** The trailing half: why this build is interesting, or when it shipped. */
function note(
    verdict: DeployVerdict,
    current: { deployedAt: string | null } | undefined,
    deploys?: Deployments,
): string {
    if (deploys?.error) return '· deploy history unavailable';
    if (!deploys || verdict === 'unreported') return '';
    if (verdict === 'drifted') return '· superseded';

    // The group has landed and this build is in no release: a container running
    // something that was never tagged.
    if (verdict === 'untagged') return '· untagged';

    return current?.deployedAt
        ? `· deployed ${timeAgo(current.deployedAt)}`
        : '';
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
