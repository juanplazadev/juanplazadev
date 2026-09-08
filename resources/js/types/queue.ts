/**
 * Mirrors App\Queue\QueueSnapshot::status() and ::summary().
 *
 * The panel's third non-vendor source, and like the deliveries types there is
 * no `error` field: two local tables and one cache read, so there is no request
 * here that can fail.
 *
 * The half that is not a table read is the reason this exists. `jobs` is empty
 * almost all the time, so depth alone cannot tell a healthy idle queue from a
 * dead worker - `worker` is what separates them, and `state` is the two
 * readings already combined.
 */

/**
 * Mirrors the string App\Queue\QueueSnapshot::state() returns.
 *
 * `down` outranks everything else: with no worker, an empty queue and a full
 * one are the same situation. `stalled` is only reachable while the worker is
 * alive, which is what makes it a different problem - and why the page offers a
 * restart for one and a diagnosis for the other.
 */
export type QueueState = 'idle' | 'working' | 'stalled' | 'down';

export type QueueWorker = {
    alive: boolean;
    /** Null when no worker has ever reported in - including all of local dev. */
    lastSeenAt: string | null;
    /** Seconds of silence after which a worker stops being believed. */
    staleAfter: number;
};

export type QueueTotals = {
    pending: number;
    reserved: number;
    /** Waiting past the grace period, or reserved past retry_after. */
    stalled: number;
    failed: number;
};

export type QueueStatus = {
    state: QueueState;
    worker: QueueWorker;
    /** Always the whole table, however few rows the lists below carry. */
    totals: QueueTotals;
    oldestPendingAt: string | null;
    /** config('queue.connections.database.retry_after'), never assumed. */
    retryAfter: number;
};

export type QueueJob = {
    id: number;
    /** The payload's displayName, e.g. "App\Jobs\SendResumeEmail". */
    name: string;
    queue: string;
    attempts: number;
    reserved: boolean;
    stalled: boolean;
    /** When it became eligible to run. Future while it serves out a backoff. */
    availableAt: string;
    queuedAt: string;
};

export type QueueFailedJob = {
    uuid: string;
    name: string;
    queue: string;
    connection: string;
    /** The first line of the stored trace. Sentry has the frames. */
    reason: string;
    failedAt: string;
};

export type QueueSummary = {
    status: QueueStatus;
    /** How many rows each table will ever list, however many exist. */
    limit: number;
    jobs: QueueJob[];
    failed: QueueFailedJob[];
};
