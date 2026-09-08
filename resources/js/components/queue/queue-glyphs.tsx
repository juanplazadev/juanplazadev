import type { QueueState, QueueStatus } from '@/types/queue';

/**
 * The vocabulary for the four queue states, in one place.
 *
 * The overview chip and the queue page both state the same verdict, and this
 * is the file that stops them wording it differently - the same job
 * deployments/release-glyphs.tsx does for the build chip and the deployments
 * page. Import from here rather than re-deriving from `state`.
 */

export type QueueTone = 'good' | 'bad' | 'muted';

/** One word for the state, as the chip and the page heading both say it. */
export function stateLabel(state: QueueState): string {
    if (state === 'down') return 'not running';
    if (state === 'stalled') return 'stalled';
    if (state === 'working') return 'working';

    return 'idle';
}

/**
 * Only the two broken states colour themselves.
 *
 * `idle` is the healthy resting state of a queue nobody is using, so it reads
 * as good rather than as an absence - the same reasoning that keeps "Nothing
 * needs you" a real answer on the overview rather than a hidden card.
 */
export function stateTone(state: QueueState): QueueTone {
    if (state === 'down' || state === 'stalled') return 'bad';

    return 'good';
}

/**
 * The trailing half of the chip: why this state is interesting.
 *
 * `down` deliberately says nothing about the queue depth. With no worker,
 * "3 waiting" and "none waiting" describe the same situation, and leading with
 * the number invites reading an empty queue as fine.
 */
export function stateNote(status: QueueStatus): string {
    const { state, totals } = status;

    if (state === 'down') return 'no worker';
    if (state === 'stalled') {
        return `${totals.stalled.toLocaleString()} stuck`;
    }
    if (state === 'working') {
        const moving = totals.pending + totals.reserved;

        return `${moving.toLocaleString()} ${moving === 1 ? 'job' : 'jobs'}`;
    }

    return 'nothing waiting';
}

/**
 * What the reader should actually do about it.
 *
 * The `down` sentence is the one that earns this file. queue:restart signals a
 * RUNNING worker to exit and cannot revive a process that is already gone, so
 * the page must send you to the container rather than offer a button that
 * silently does nothing. See App\Queue\QueueControl::restart().
 */
export function stateAdvice(status: QueueStatus): string {
    const { state, totals, retryAfter } = status;

    if (state === 'down') {
        return 'No worker has reported in. Nothing on the queue will move until one is running again - check the process in the app container rather than restarting from here, because there is nothing left to receive a restart.';
    }

    if (state === 'stalled') {
        return `A worker is looping, but ${totals.stalled === 1 ? 'a job is' : `${totals.stalled} jobs are`} past the point one should have moved. A job reserved longer than retry_after (${retryAfter}s) was abandoned mid-run and the queue will release it on its own; one merely waiting means the worker is busy or wedged.`;
    }

    if (state === 'working') {
        return 'A worker is running and jobs are moving through.';
    }

    return 'A worker is running and there is nothing waiting for it.';
}

/** The chip and status dot, shared with the build chip's palette. */
export function toneDotClass(tone: QueueTone): string {
    if (tone === 'bad') return 'bg-destructive';
    if (tone === 'good') return 'bg-chart-2';

    return 'bg-muted-foreground/40';
}
