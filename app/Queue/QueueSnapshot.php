<?php

declare(strict_types=1);

namespace App\Queue;

use App\Models\FailedJob;
use App\Models\QueuedJob;

/**
 * What the queue worker is doing, and what is stuck behind it.
 *
 * The panel's third non-vendor source, and it reads like App\Content\ContentSnapshot
 * and App\Mail\ResumeDeliverySnapshot rather than like the Cloudflare and Sentry
 * services: local tables and one cache read, so there is no `error` string here
 * because there is no request that can fail.
 *
 * The half that is NOT a table read is the point. `jobs` is empty almost all the
 * time - one job type, a handful of résumé requests a month - so depth alone
 * cannot tell a healthy idle queue from a dead worker. WorkerHeartbeat answers
 * that, and `state` below is the two readings combined into the one word the
 * page is actually asking for.
 *
 * @phpstan-type QueueWorker array{alive: bool, lastSeenAt: string|null, staleAfter: int}
 * @phpstan-type QueueTotals array{pending: int, reserved: int, stalled: int, failed: int}
 * @phpstan-type QueueStatus array{
 *     state: string,
 *     worker: QueueWorker,
 *     totals: QueueTotals,
 *     oldestPendingAt: string|null,
 *     retryAfter: int,
 * }
 * @phpstan-type QueueJobRow array{
 *     id: int,
 *     name: string,
 *     queue: string,
 *     attempts: int,
 *     reserved: bool,
 *     stalled: bool,
 *     availableAt: string,
 *     queuedAt: string,
 * }
 * @phpstan-type QueueFailedRow array{
 *     uuid: string,
 *     name: string,
 *     queue: string,
 *     connection: string,
 *     reason: string,
 *     failedAt: string,
 * }
 * @phpstan-type QueueSummary array{
 *     status: QueueStatus,
 *     limit: int,
 *     jobs: list<QueueJobRow>,
 *     failed: list<QueueFailedRow>,
 * }
 */
final readonly class QueueSnapshot
{
    /**
     * How many rows of each table the page lists before it stops.
     *
     * The totals above are counted separately and always cover the whole table,
     * so a truncated list never makes the numbers lie - the same arrangement
     * App\Mail\ResumeDeliverySnapshot uses, and for the same reason there is no
     * paginator here either.
     */
    public const int RECENT_LIMIT = 50;

    /**
     * How long an available job may sit before it counts as stuck.
     *
     * Measured from `available_at`, not from when the job was queued, so a job
     * serving out its #[Backoff([30, 120])] window is not available yet and is
     * therefore never counted. Five minutes clears the longest legitimate
     * backoff by a wide margin, which is what keeps a normal retry from
     * lighting up the overview.
     */
    public const int PENDING_GRACE = 300;

    /**
     * The overview's half: is anything wrong, and is the worker breathing.
     *
     * @return QueueStatus
     */
    public function status(): array
    {
        $retryAfter = $this->retryAfter();
        $alive = WorkerHeartbeat::isAlive();
        $lastSeenAt = WorkerHeartbeat::lastSeenAt();

        $totals = [
            'pending' => QueuedJob::query()->pending()->count(),
            'reserved' => QueuedJob::query()->reserved()->count(),
            'stalled' => QueuedJob::query()->stalled($retryAfter, self::PENDING_GRACE)->count(),
            'failed' => FailedJob::query()->count(),
        ];

        $oldestPending = QueuedJob::query()->pending()->inQueueOrder()->first();

        return [
            'state' => $this->state($alive, $totals),
            'worker' => [
                'alive' => $alive,
                'lastSeenAt' => $lastSeenAt?->toIso8601String(),
                'staleAfter' => WorkerHeartbeat::STALE_AFTER,
            ],
            'totals' => $totals,
            'oldestPendingAt' => $oldestPending?->queuedAt()->toIso8601String(),
            'retryAfter' => $retryAfter,
        ];
    }

    /**
     * The page: the status, then the rows behind it.
     *
     * @return QueueSummary
     */
    public function summary(): array
    {
        $retryAfter = $this->retryAfter();

        $jobs = QueuedJob::query()
            ->inQueueOrder()
            ->limit(self::RECENT_LIMIT)
            ->get();

        $failed = FailedJob::query()
            ->newestFirst()
            ->limit(self::RECENT_LIMIT)
            ->get();

        return [
            'status' => $this->status(),
            'limit' => self::RECENT_LIMIT,
            'jobs' => array_values(
                $jobs->map(fn (QueuedJob $job): array => $this->toJobRow($job, $retryAfter))->all(),
            ),
            'failed' => array_values(
                $failed->map(fn (FailedJob $job): array => $this->toFailedRow($job))->all(),
            ),
        ];
    }

    /**
     * The one word the page leads with.
     *
     * `down` outranks everything: with no worker, a queue of zero and a queue of
     * fifty are the same situation, and reporting "idle" over a dead process is
     * the exact failure this whole feature exists to stop.
     *
     * `stalled` is only reachable while the worker IS alive, which makes it a
     * genuinely different problem from `down` - the process is looping and
     * something else is wrong - and it is why the page offers a restart for one
     * and a diagnosis for the other.
     *
     * @param  QueueTotals  $totals
     */
    private function state(bool $alive, array $totals): string
    {
        if (! $alive) {
            return 'down';
        }

        if ($totals['stalled'] > 0) {
            return 'stalled';
        }

        return $totals['pending'] + $totals['reserved'] > 0 ? 'working' : 'idle';
    }

    /**
     * `retry_after` from config rather than the 90 it happens to be.
     *
     * It is what the driver uses to decide a reserved job was abandoned, so
     * reading it anywhere else would let the page and the queue disagree the
     * day DB_QUEUE_RETRY_AFTER is set.
     */
    private function retryAfter(): int
    {
        return (int) config('queue.connections.database.retry_after', 90);
    }

    /**
     * @return QueueJobRow
     */
    private function toJobRow(QueuedJob $job, int $retryAfter): array
    {
        return [
            'id' => $job->id,
            'name' => $job->name(),
            'queue' => $job->queue,
            'attempts' => $job->attempts,
            'reserved' => $job->reserved_at !== null,
            'stalled' => $job->isStalled($retryAfter, self::PENDING_GRACE),
            'availableAt' => $job->availableAt()->toIso8601String(),
            'queuedAt' => $job->queuedAt()->toIso8601String(),
        ];
    }

    /**
     * @return QueueFailedRow
     */
    private function toFailedRow(FailedJob $job): array
    {
        return [
            'uuid' => $job->uuid,
            'name' => $job->name(),
            'queue' => $job->queue,
            'connection' => $job->connection,
            'reason' => $job->reason(),
            'failedAt' => $job->failed_at->toIso8601String(),
        ];
    }
}
