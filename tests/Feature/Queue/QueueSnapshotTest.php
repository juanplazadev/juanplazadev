<?php

declare(strict_types=1);

use App\Jobs\SendResumeEmail;
use App\Models\FailedJob;
use App\Models\QueuedJob;
use App\Queue\QueueSnapshot;
use App\Queue\WorkerHeartbeat;
use Illuminate\Support\Facades\Cache;

/** A worker that reported in a moment ago. */
function workerIsAlive(): void
{
    Cache::put(WorkerHeartbeat::KEY, now()->getTimestamp(), 3600);
}

it('reports an idle queue when the worker is alive and there is nothing to do', function (): void {
    workerIsAlive();

    $status = resolve(QueueSnapshot::class)->status();

    expect($status['state'])->toBe('idle')
        ->and($status['worker']['alive'])->toBeTrue()
        ->and($status['totals'])->toBe(['pending' => 0, 'reserved' => 0, 'stalled' => 0, 'failed' => 0]);
});

it('reports a working queue when the worker is alive and jobs are moving', function (): void {
    workerIsAlive();
    QueuedJob::factory()->create();
    QueuedJob::factory()->reserved()->create();

    $status = resolve(QueueSnapshot::class)->status();

    expect($status['state'])->toBe('working')
        ->and($status['totals']['pending'])->toBe(1)
        ->and($status['totals']['reserved'])->toBe(1)
        ->and($status['totals']['stalled'])->toBe(0);
});

/*
 * The state this whole feature exists for. An empty `jobs` table reads exactly
 * like a healthy idle one, so only the heartbeat can tell them apart - and a
 * queue with no worker is `down` however many jobs are sitting in it.
 */
it('reports down when no worker has reported in, however deep the queue', function (): void {
    QueuedJob::factory()->count(3)->create();

    $status = resolve(QueueSnapshot::class)->status();

    expect($status['state'])->toBe('down')
        ->and($status['worker']['alive'])->toBeFalse()
        ->and($status['worker']['lastSeenAt'])->toBeNull();
});

it('reports down over an empty queue too', function (): void {
    expect(resolve(QueueSnapshot::class)->status()['state'])->toBe('down');
});

it('reports stalled when a job has been available past the grace period', function (): void {
    workerIsAlive();
    QueuedJob::factory()->waiting()->create();

    $status = resolve(QueueSnapshot::class)->status();

    expect($status['state'])->toBe('stalled')
        ->and($status['totals']['stalled'])->toBe(1);
});

it('reports stalled when a reserved job outlives retry_after', function (): void {
    workerIsAlive();
    QueuedJob::factory()->abandoned()->create();

    $status = resolve(QueueSnapshot::class)->status();

    expect($status['state'])->toBe('stalled')
        ->and($status['totals']['stalled'])->toBe(1)
        ->and($status['totals']['reserved'])->toBe(1);
});

/*
 * SendResumeEmail carries #[Backoff([30, 120])], so a job waiting out a retry
 * is deliberately not available yet. Judging it on `created_at` instead of
 * `available_at` would report every ordinary retry as a stuck queue.
 */
it('does not call a job stalled while it serves out its backoff window', function (): void {
    workerIsAlive();
    QueuedJob::factory()->backingOff()->create();

    $status = resolve(QueueSnapshot::class)->status();

    expect($status['state'])->toBe('working')
        ->and($status['totals']['stalled'])->toBe(0);
});

it('reads retry_after from config rather than assuming ninety', function (): void {
    config()->set('queue.connections.database.retry_after', 3600);
    workerIsAlive();

    // Abandoned half an hour ago: stalled under the default 90s, not under 3600.
    QueuedJob::factory()->abandoned()->create();

    $status = resolve(QueueSnapshot::class)->status();

    expect($status['retryAfter'])->toBe(3600)
        ->and($status['totals']['stalled'])->toBe(0)
        ->and($status['state'])->toBe('working');
});

it('counts failed jobs without letting them change the state', function (): void {
    workerIsAlive();
    FailedJob::factory()->count(2)->create();

    $status = resolve(QueueSnapshot::class)->status();

    expect($status['totals']['failed'])->toBe(2)
        ->and($status['state'])->toBe('idle');
});

it('names the oldest waiting job as the one holding things up', function (): void {
    workerIsAlive();
    QueuedJob::factory()->waiting(60)->create();
    QueuedJob::factory()->create();

    $status = resolve(QueueSnapshot::class)->status();

    expect($status['oldestPendingAt'])->toBe(now()->subMinutes(60)->toIso8601String());
});

it('lists the queue in the order the worker will read it', function (): void {
    workerIsAlive();
    $first = QueuedJob::factory()->waiting(10)->create();
    $second = QueuedJob::factory()->create();

    $jobs = resolve(QueueSnapshot::class)->summary()['jobs'];

    expect(array_column($jobs, 'id'))->toBe([$first->id, $second->id]);
});

it('takes the job name off the payload envelope', function (): void {
    workerIsAlive();
    QueuedJob::factory()->create();
    FailedJob::factory()->create();

    $summary = resolve(QueueSnapshot::class)->summary();

    expect($summary['jobs'][0]['name'])->toBe(SendResumeEmail::class)
        ->and($summary['failed'][0]['name'])->toBe(SendResumeEmail::class);
});

it('says so plainly when a payload is not one the driver wrote', function (): void {
    workerIsAlive();
    QueuedJob::factory()->create(['payload' => '{"not":"an envelope"}']);

    expect(resolve(QueueSnapshot::class)->summary()['jobs'][0]['name'])->toBe('Unrecognised job');
});

/*
 * The panel shows the first line of the trace, not the trace. Sentry holds the
 * frames and the errors page already links there.
 */
it('reduces a stored trace to its first line', function (): void {
    workerIsAlive();
    FailedJob::factory()->create();

    expect(resolve(QueueSnapshot::class)->summary()['failed'][0]['reason'])
        ->toBe('Symfony\Component\Mailer\Exception\TransportException: Connection refused');
});

it('lists newest failures first', function (): void {
    workerIsAlive();
    $older = FailedJob::factory()->create(['failed_at' => now()->subDay()]);
    $newer = FailedJob::factory()->create(['failed_at' => now()->subMinute()]);

    $failed = resolve(QueueSnapshot::class)->summary()['failed'];

    expect(array_column($failed, 'uuid'))->toBe([$newer->uuid, $older->uuid]);
});

/*
 * Both halves of the stalled rule are written twice - once as SQL for the
 * total and once in PHP for the row - because the page states both. This is
 * what stops them drifting apart.
 */
it('agrees between the stalled total and the stalled row flag', function (): void {
    workerIsAlive();
    QueuedJob::factory()->waiting()->create();
    QueuedJob::factory()->abandoned()->create();
    QueuedJob::factory()->create();
    QueuedJob::factory()->backingOff()->create();

    $summary = resolve(QueueSnapshot::class)->summary();
    $flagged = count(array_filter(array_column($summary['jobs'], 'stalled')));

    expect($flagged)->toBe($summary['status']['totals']['stalled'])
        ->and($flagged)->toBe(2);
});

it('caps both lists without letting the totals lie', function (): void {
    workerIsAlive();
    QueuedJob::factory()->count(QueueSnapshot::RECENT_LIMIT + 5)->create();

    $summary = resolve(QueueSnapshot::class)->summary();

    expect($summary['jobs'])->toHaveCount(QueueSnapshot::RECENT_LIMIT)
        ->and($summary['status']['totals']['pending'])->toBe(QueueSnapshot::RECENT_LIMIT + 5)
        ->and($summary['limit'])->toBe(QueueSnapshot::RECENT_LIMIT);
});
