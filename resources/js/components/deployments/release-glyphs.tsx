import {
    CircleAlert,
    CircleArrowUp,
    CircleCheck,
    CircleDashed,
    CircleHelp,
    CirclePlay,
} from 'lucide-react';

import type { ErrorRelease } from '@/types/deployments';

/**
 * The glyph, label and colour vocabulary for a release.
 *
 * Grouped here the way errors/level-glyphs.tsx and analytics/row-glyphs.tsx
 * group theirs, and for a stronger reason than either: the comparison behind
 * these states - which release is running, which one shipped last, and whether
 * the two disagree - had been written out four separate times, in
 * running-build.tsx, release-table.tsx, overview/overview-header.tsx and
 * overview/attention-list.tsx. Nothing kept them in step.
 *
 * Two questions, because two callers ask two different things of the same pair
 * of facts. `deployVerdict` answers "is what shipped what is serving", which is
 * a statement about the deployment. `releaseState` answers "what is this row",
 * which is a statement about one release among others.
 *
 * Every glyph is decorative. Each state that means anything carries a word
 * beside it - the verdict's sentence, the row's tag - so these are a second way
 * to recognise something you can already read, never the only way. That is the
 * rule PanelCard's heading icon follows, and it is what the row's old
 * colour-only dot was breaking.
 */

/** Where the running build sits relative to what shipped. */
export type DeployVerdict =
    | 'current'
    | 'drifted'
    | 'untagged'
    | 'unreported'
    | 'unknown';

/**
 * `drifted` and `untagged` are separated on purpose: running something Sentry
 * has never heard of is an untagged build, while running something it has, from
 * below the top of the list, is an image that shipped without the container
 * cycling. Same colour, different fix.
 */
export function deployVerdict(
    running: string | null,
    releases: ErrorRelease[],
): DeployVerdict {
    if (running === null) {
        return 'unreported';
    }

    if (releases.length === 0) {
        return 'unknown';
    }

    const index = releases.findIndex((release) => release.version === running);

    if (index === 0) {
        return 'current';
    }

    return index === -1 ? 'untagged' : 'drifted';
}

export function verdictGlyph(verdict: DeployVerdict, className = 'size-4') {
    switch (verdict) {
        case 'current':
            return <CircleCheck aria-hidden className={className} />;
        case 'drifted':
        case 'untagged':
            return <CircleAlert aria-hidden className={className} />;
        default:
            return <CircleHelp aria-hidden className={className} />;
    }
}

/**
 * Muted is the honest answer for a state nobody has checked yet, which is why
 * `unreported` and `unknown` are not good news drawn in green.
 */
export function verdictTone(verdict: DeployVerdict): 'good' | 'bad' | 'muted' {
    if (verdict === 'current') return 'good';
    if (verdict === 'drifted' || verdict === 'untagged') return 'bad';

    return 'muted';
}

/** What one row of the history is. */
export type ReleaseState = 'running' | 'superseded' | 'latest' | 'shipped';

/**
 * `superseded` is the state the table could not previously express: the row IS
 * the running build, but a newer release exists above it. Drawn as an ordinary
 * row, that failure was invisible until you read the card above the table.
 */
export function releaseState(
    version: string,
    running: string | null,
    releases: ErrorRelease[],
): ReleaseState {
    const latest = releases[0]?.version ?? null;

    if (version === running) {
        return version === latest ? 'running' : 'superseded';
    }

    return version === latest ? 'latest' : 'shipped';
}

export function releaseGlyph(state: ReleaseState, className = 'size-4') {
    switch (state) {
        case 'running':
            return <CirclePlay aria-hidden className={className} />;
        case 'superseded':
            return <CircleAlert aria-hidden className={className} />;
        case 'latest':
            return <CircleArrowUp aria-hidden className={className} />;
        default:
            return <CircleDashed aria-hidden className={className} />;
    }
}

/**
 * A CSS value, never a Tailwind class, for the reason levelColor() gives: the
 * mark is tinted through an inline style so a caller cannot drift into
 * disagreeing about what a state looks like.
 */
export function releaseColor(state: ReleaseState): string {
    switch (state) {
        case 'running':
            return 'var(--chart-2)';
        case 'superseded':
            return 'var(--destructive)';
        case 'latest':
            return 'var(--chart-3)';
        default:
            return 'var(--muted-foreground)';
    }
}

/**
 * The word that goes beside the glyph, or null for a row where there is nothing
 * to say. History is most of the table, and tagging every row "shipped" would
 * make the three rows that matter harder to find rather than easier.
 */
export function releaseLabel(state: ReleaseState): string | null {
    return state === 'shipped' ? null : state;
}
