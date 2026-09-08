import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import {
    deployVerdict,
    verdictTone,
} from '@/components/deployments/release-glyphs';
import {
    stateLabel,
    stateNote,
    stateTone,
    toneDotClass,
} from '@/components/queue/queue-glyphs';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/time';
import {
    deployments as deploymentsRoute,
    queue as queueRoute,
} from '@/routes/admin';
import type { DeployVerdict } from '@/components/deployments/release-glyphs';
import type { Deployments } from '@/types/deployments';
import type { QueueStatus } from '@/types/queue';

type BuildChipProps = {
    running: string | null;
    /** Undefined until the deploys group resolves. */
    deploys?: Deployments;
};

type OverviewHeaderProps = BuildChipProps & {
    name: string;
    queue: QueueStatus;
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
 *
 * The worker chip sits beside it and is the same idea for the other
 * always-on process: what is serving, and what is processing. It is here rather
 * than in the grid because a healthy queue has no card's worth to say and the
 * grid is already six cells exactly - and because "the worker is alive" is a
 * fact worth stating positively, which "Needs attention" by design cannot do.
 */
export default function OverviewHeader({
    name,
    running,
    deploys,
    queue,
}: OverviewHeaderProps) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="text-foreground font-display text-2xl font-semibold">
                    {greeting()}, {name}
                </h1>
                <p className="text-muted-foreground text-xs">{today()}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <BuildChip running={running} deploys={deploys} />
                <WorkerChip queue={queue} />
            </div>
        </div>
    );
}

/**
 * The pill both chips are drawn as.
 *
 * Extracted when the second one arrived rather than copied: the two state
 * different facts but are the same object, and a near-duplicate is exactly what
 * components/admin exists to prevent.
 */
function Chip({
    href,
    tone,
    label,
    value,
    note,
}: {
    href: string;
    tone: 'good' | 'bad' | 'muted';
    label: string;
    value: ReactNode;
    note?: ReactNode;
}) {
    return (
        <Link
            href={href}
            className={cn(
                'border-border bg-card hover:border-muted-foreground/40 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                tone === 'bad' && 'border-destructive/40',
            )}
        >
            <span
                aria-hidden
                className={cn('size-1.5 shrink-0 rounded-full', dotClass(tone))}
            />

            <span className="text-muted-foreground">{label}</span>

            {value}

            {note ? (
                <span className="text-muted-foreground">{note}</span>
            ) : null}
        </Link>
    );
}

/**
 * Is anything reading the queue.
 *
 * Never muted the way the build chip is: this prop is eager, so unlike the
 * deploys group there is no "not checked yet" state to be honest about - the
 * answer is in hand on first paint. The wording and the colour both come from
 * queue-glyphs, which the queue page reads too.
 */
function WorkerChip({ queue }: { queue: QueueStatus }) {
    return (
        <Chip
            href={queueRoute.url()}
            tone={stateTone(queue.state)}
            label="Worker"
            value={
                <span className="text-foreground">
                    {stateLabel(queue.state)}
                </span>
            }
            note={`· ${stateNote(queue)}`}
        />
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
        <Chip
            href={deploymentsRoute.url()}
            tone={tone}
            label="Build"
            value={
                running === null ? (
                    <span className="text-muted-foreground">not reported</span>
                ) : (
                    <span className="text-foreground font-mono">
                        {current?.shortVersion ?? running}
                    </span>
                )
            }
            note={note(verdict, current, deploys)}
        />
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
    return toneDotClass(tone);
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
