import { CircleAlert, CircleCheck, CircleHelp } from 'lucide-react';

import PanelCard from '@/components/admin/panel-card';
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
 */
export default function RunningBuild({ running, releases }: RunningBuildProps) {
    const latest = releases[0] ?? null;
    const current = releases.find((release) => release.version === running);
    const state = verdict(running, latest, releases);

    return (
        <PanelCard title="Running">
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
                className={cnVerdict(state.tone)}
                // The drift case is the one thing on this page worth
                // interrupting a reader for.
                role={state.tone === 'bad' ? 'alert' : undefined}
            >
                <state.icon className="mt-0.5 size-4 shrink-0" />
                <span>{state.message}</span>
            </p>
        </PanelCard>
    );
}

type Tone = 'good' | 'bad' | 'unknown';

function verdict(
    running: string | null,
    latest: ErrorRelease | null,
    releases: ErrorRelease[],
) {
    if (running === null) {
        return {
            tone: 'unknown' as Tone,
            icon: CircleHelp,
            message:
                'This container reports no release, so it cannot be matched against a deploy. SENTRY_RELEASE is set at image build time.',
        };
    }

    if (latest === null) {
        return {
            tone: 'unknown' as Tone,
            icon: CircleHelp,
            message:
                'Sentry knows of no releases to compare this build against yet.',
        };
    }

    if (latest.version === running) {
        return {
            tone: 'good' as Tone,
            icon: CircleCheck,
            message: 'Up to date with the newest release Sentry knows about.',
        };
    }

    // Running something Sentry has never heard of is a different problem from
    // running something it has: the first is an untagged build, the second is
    // an image that shipped without the container cycling.
    const known = releases.some((release) => release.version === running);

    return {
        tone: 'bad' as Tone,
        icon: CircleAlert,
        message: known
            ? `The newest release is ${latest.shortVersion}, but this container is still running ${running}. An image shipped without the container cycling.`
            : `This container reports ${running}, which is not among the releases Sentry has. Either the build was never tagged, or it is older than the list below.`,
    };
}

function cnVerdict(tone: Tone): string {
    const base = 'mt-3 flex items-start gap-2 text-xs';

    if (tone === 'bad') return `${base} text-destructive`;
    if (tone === 'good') return `${base} text-chart-2`;

    return `${base} text-muted-foreground`;
}
