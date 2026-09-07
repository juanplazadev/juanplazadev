import { Server } from 'lucide-react';

import PanelCard from '@/components/admin/panel-card';
import {
    deployVerdict,
    verdictGlyph,
    verdictTone,
} from '@/components/deployments/release-glyphs';
import type { DeployVerdict } from '@/components/deployments/release-glyphs';
import { timeAgo } from '@/lib/time';
import type { ErrorRelease } from '@/types/deployments';

type RunningBuildProps = {
    /** The build this container reports, from config('sentry.release'). */
    running: string | null;
    releases: ErrorRelease[];
};

/**
 * The page's headline: is what was shipped actually what is serving?
 *
 * Two separate facts, and the whole point is the case where they disagree.
 * `releases[0]` is the newest release Sentry knows about - what CI last built.
 * `running` is what the container answering this request reports. A deploy that
 * pushed an image but never cycled the process leaves those pointing at
 * different versions, which is a failure nothing else in the panel surfaces:
 * the build is green, the release is tagged, and the old code is still live.
 *
 * The comparison itself lives in release-glyphs.tsx, which the table beneath and
 * two overview components share. What stays here is the prose - a sentence a
 * reader can act on is about this card, not vocabulary the others want.
 *
 * `Server` rather than the sidebar's `Rocket`: the sidebar-twin rule is for
 * overview cards that link to a section, and this card is inside the section
 * and about what is serving rather than about deployments as a whole.
 */
export default function RunningBuild({ running, releases }: RunningBuildProps) {
    const current = releases.find((release) => release.version === running);
    const verdict = deployVerdict(running, releases);
    const tone = verdictTone(verdict);

    return (
        <PanelCard title="Running" icon={Server}>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-foreground font-display text-2xl font-semibold">
                    {running === null ? (
                        <span className="text-muted-foreground">
                            not reported
                        </span>
                    ) : (
                        <span className="font-mono">
                            {current?.shortVersion ?? running}
                        </span>
                    )}
                </span>

                {current?.environment ? (
                    <span className="text-muted-foreground text-sm">
                        {current.environment}
                    </span>
                ) : null}

                {current?.deployedAt ? (
                    <span className="text-muted-foreground text-sm">
                        deployed {timeAgo(current.deployedAt)}
                    </span>
                ) : null}
            </div>

            <p
                className={cnVerdict(tone)}
                // The drift case is the one thing on this page worth
                // interrupting a reader for.
                role={tone === 'bad' ? 'alert' : undefined}
            >
                {verdictGlyph(verdict, 'mt-0.5 size-4 shrink-0')}
                <span>{message(verdict, running, releases)}</span>
            </p>
        </PanelCard>
    );
}

/** The sentence behind each verdict. */
function message(
    verdict: DeployVerdict,
    running: string | null,
    releases: ErrorRelease[],
): string {
    const latest = releases[0] ?? null;

    switch (verdict) {
        case 'unreported':
            return 'This container reports no release, so it cannot be matched against a deploy. SENTRY_RELEASE is set at image build time.';
        case 'unknown':
            return 'Sentry knows of no releases to compare this build against yet.';
        case 'current':
            return 'Up to date with the newest release Sentry knows about.';
        case 'drifted':
            return `The newest release is ${latest?.shortVersion}, but this container is still running ${running}. An image shipped without the container cycling.`;
        default:
            return `This container reports ${running}, which is not among the releases Sentry has. Either the build was never tagged, or it is older than the list below.`;
    }
}

function cnVerdict(tone: 'good' | 'bad' | 'muted'): string {
    const base = 'mt-3 flex items-start gap-2 text-xs';

    if (tone === 'bad') return `${base} text-destructive`;
    if (tone === 'good') return `${base} text-chart-2`;

    return `${base} text-muted-foreground`;
}
