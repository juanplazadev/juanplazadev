<?php

declare(strict_types=1);

use App\Queue\WorkerHeartbeat;
use Illuminate\Queue\Events\Looping;
use Illuminate\Support\Facades\Cache;

it('stamps the cache the first time the worker loops', function (): void {
    app(WorkerHeartbeat::class)->handle(new Looping('database', 'default'));

    expect(Cache::get(WorkerHeartbeat::KEY))->toBe(now()->getTimestamp());
});

/*
 * The throttle is the whole reason this listener holds state. `queue:work
 * --sleep=3` loops every three seconds while idle, so without it the worker
 * writes to the cache table twenty times a minute forever.
 */
it('does not write again inside the ping interval', function (): void {
    $heartbeat = app(WorkerHeartbeat::class);
    $event = new Looping('database', 'default');

    $heartbeat->handle($event);

    $this->travel(WorkerHeartbeat::PING_EVERY - 1)->seconds();
    $heartbeat->handle($event);

    expect(Cache::get(WorkerHeartbeat::KEY))->toBe(now()->subSeconds(WorkerHeartbeat::PING_EVERY - 1)->getTimestamp());
});

it('writes again once the ping interval has passed', function (): void {
    $heartbeat = app(WorkerHeartbeat::class);
    $event = new Looping('database', 'default');

    $heartbeat->handle($event);

    $this->travel(WorkerHeartbeat::PING_EVERY)->seconds();
    $heartbeat->handle($event);

    expect(Cache::get(WorkerHeartbeat::KEY))->toBe(now()->getTimestamp());
});

/*
 * The listener is a singleton on purpose (AppServiceProvider), because the
 * throttle above lives in an instance property. Resolving a fresh one per
 * dispatch would restart the throttle every loop and silently undo it.
 */
it('resolves as one instance so the throttle survives the loop', function (): void {
    expect(app(WorkerHeartbeat::class))->toBe(app(WorkerHeartbeat::class));
});

it('reports no worker when nothing has ever reported in', function (): void {
    expect(WorkerHeartbeat::isAlive())->toBeFalse()
        ->and(WorkerHeartbeat::lastSeenAt())->toBeNull();
});

it('believes a worker that reported in recently', function (): void {
    Cache::put(WorkerHeartbeat::KEY, now()->getTimestamp(), 60);

    expect(WorkerHeartbeat::isAlive())->toBeTrue();
});

/*
 * The hourly `--max-time=3600` exit plus the supervising loop's `sleep 1` is a
 * gap of a couple of seconds, so the planned restart must never read as an
 * outage. The boundary is what proves the margin is real.
 */
it('stops believing a worker that went quiet', function (): void {
    Cache::put(WorkerHeartbeat::KEY, now()->subSeconds(WorkerHeartbeat::STALE_AFTER + 1)->getTimestamp(), 3600);

    expect(WorkerHeartbeat::isAlive())->toBeFalse()
        ->and(WorkerHeartbeat::lastSeenAt())->not->toBeNull();
});

it('still believes a worker at the edge of the stale window', function (): void {
    Cache::put(WorkerHeartbeat::KEY, now()->subSeconds(WorkerHeartbeat::STALE_AFTER - 1)->getTimestamp(), 3600);

    expect(WorkerHeartbeat::isAlive())->toBeTrue();
});
