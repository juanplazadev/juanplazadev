<?php

declare(strict_types=1);

use App\Models\FailedJob;
use App\Models\QueuedJob;
use App\Models\User;
use App\Queue\WorkerHeartbeat;
use Illuminate\Support\Facades\Cache;

/** A worker that reported in a moment ago. */
function heartbeat(): void
{
    Cache::put(WorkerHeartbeat::KEY, now()->getTimestamp(), 3600);
}

test('every queue route is behind the admin middleware', function (): void {
    $failed = FailedJob::factory()->create();

    $this->get(route('admin.queue'))->assertRedirect(route('login'));
    $this->post(route('admin.queue.restart'))->assertRedirect(route('login'));
    $this->post(route('admin.queue.failed.retry', $failed))->assertRedirect(route('login'));
    $this->delete(route('admin.queue.failed.forget', $failed))->assertRedirect(route('login'));

    // Nothing was retried and nothing was discarded on the way past the guard.
    expect(FailedJob::query()->count())->toBe(1)
        ->and(QueuedJob::query()->count())->toBe(0);
});

test('the page resolves its queue inline rather than deferring it', function (): void {
    heartbeat();
    QueuedJob::factory()->create();
    FailedJob::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.queue'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/queue')
            // Eager, like the deliveries page and for the same reason: local
            // tables and one cache read, with no vendor here to be slow.
            ->where('queue.status.state', 'working')
            ->where('queue.status.worker.alive', true)
            ->where('queue.status.totals.pending', 1)
            ->where('queue.status.totals.failed', 1)
            ->has('queue.jobs', 1)
            ->has('queue.failed', 1)
            ->where('queue.jobs.0.name', 'App\Jobs\SendResumeEmail'),
        );
});

test('the page reports a dead worker over an empty queue', function (): void {
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.queue'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('queue.status.state', 'down')
            ->where('queue.status.worker.alive', false)
            ->where('queue.status.worker.lastSeenAt', null),
        );
});

/*
 * queue:restart writes a timestamp the workers compare against their own start
 * time. Asserting the flag moved is asserting the command actually ran, without
 * needing a worker in the test.
 */
test('restarting the workers moves the queue restart flag', function (): void {
    heartbeat();
    $this->actingAs(User::factory()->create());
    Cache::forget('illuminate:queue:restart');

    $this->post(route('admin.queue.restart'))->assertRedirect(route('admin.queue'));

    expect(Cache::get('illuminate:queue:restart'))->not->toBeNull();
});

test('retrying a failed job puts it back on the queue and clears the failure', function (): void {
    heartbeat();
    $failed = FailedJob::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->post(route('admin.queue.failed.retry', $failed))->assertRedirect(route('admin.queue'));

    expect(FailedJob::query()->count())->toBe(0)
        ->and(QueuedJob::query()->count())->toBe(1);
});

test('forgetting a failed job discards it without re-queueing anything', function (): void {
    heartbeat();
    $failed = FailedJob::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->delete(route('admin.queue.failed.forget', $failed))->assertRedirect(route('admin.queue'));

    expect(FailedJob::query()->count())->toBe(0)
        ->and(QueuedJob::query()->count())->toBe(0);
});

/*
 * The uuid is the route key, so a failed job is addressed by the value the
 * failed-job provider itself uses rather than by an auto-increment id that
 * would shift under a prune.
 */
test('a failed job is addressed by its uuid', function (): void {
    $failed = FailedJob::factory()->create();

    expect(route('admin.queue.failed.forget', $failed))->toContain($failed->uuid);
});

test('an unknown failed job is a 404 rather than a silent success', function (): void {
    $this->actingAs(User::factory()->create());

    $this->post(route('admin.queue.failed.retry', 'not-a-real-uuid'))->assertNotFound();
});
