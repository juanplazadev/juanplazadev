<?php

declare(strict_types=1);

namespace App\Queue;

use App\Models\FailedJob;
use Illuminate\Support\Facades\Artisan;

/**
 * The three things the panel is allowed to do to the queue.
 *
 * Every one of them is a named Artisan command with no user input reaching its
 * arguments except a route-bound uuid. That is the whole security posture and it
 * is deliberate: the alternative shape - a page that runs a command it is
 * handed - would turn an authenticated session into a shell, which is far more
 * than "see if the queue is stuck" ever needed.
 *
 * Going through Artisan rather than touching the tables directly also keeps the
 * failed-job provider the single owner of `failed_jobs`, the same way the queue
 * driver stays the single owner of `jobs`.
 */
final class QueueControl
{
    /**
     * Ask every running worker to finish its job and exit.
     *
     * Safe to press at any time, and safe to press twice: it writes a timestamp
     * to the cache, workers compare it against their own start time between
     * jobs, and the supervising loop in docker-entrypoint.sh has a new one
     * running about a second later. Nothing is killed mid-job, so it cannot
     * duplicate a send the way a SIGKILL can.
     *
     * What it CANNOT do is bring back a worker that is already gone - there is
     * no process left to read the flag. That is why the page hides this behind
     * a live heartbeat and reports the container instead when the worker is
     * down: a button that silently does nothing is worse than no button.
     */
    public function restart(): void
    {
        Artisan::call('queue:restart');
    }

    /**
     * Push one failed job back onto the queue.
     *
     * Per-job on purpose, and there is deliberately no "retry all". A résumé
     * send that Mailgun accepted before the worker was interrupted has already
     * gone out - .ai/rules/mail.md documents that shape - so a retry can mean a
     * second copy in somebody's inbox. That is a fine trade to make one row at
     * a time while looking at it, and a bad one to make for every row at once.
     */
    public function retry(FailedJob $job): void
    {
        Artisan::call('queue:retry', ['id' => [$job->uuid]]);
    }

    /** Drop one failed job for good. Nothing is re-queued and nothing is sent. */
    public function forget(FailedJob $job): void
    {
        Artisan::call('queue:forget', ['id' => $job->uuid]);
    }
}
