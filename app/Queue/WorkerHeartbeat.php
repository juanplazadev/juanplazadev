<?php

declare(strict_types=1);

namespace App\Queue;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

/**
 * Proof that a worker is alive, which the `jobs` table cannot give.
 *
 * With one job type and low volume that table is empty nearly all the time, and
 * empty reads exactly the same for "healthy and idle" as it does for "the
 * worker died" - which is the state worth knowing about, and the one
 * docker-entrypoint.sh and .ai/rules/workflows.md both warn is otherwise
 * completely silent. So the panel does not infer liveness from the queue depth;
 * the worker says so itself, once every PING_EVERY seconds.
 *
 * `Looping` is the event to hang this on because it fires on every pass of the
 * worker loop INCLUDING the idle ones. A JobProcessed listener would only prove
 * the worker was alive the last time somebody asked for the résumé, which on a
 * quiet week is no proof at all.
 *
 * The cache store is `database` and the worker shares its container with
 * Octane, so the web process reads this back with nothing else to deploy - the
 * same reason the queue itself is on the database driver.
 */
final class WorkerHeartbeat
{
    public const string KEY = 'queue:worker:seen';

    /**
     * How often the worker is allowed to say it is alive.
     *
     * `queue:work --sleep=3` loops every three seconds when there is nothing to
     * do, and an unthrottled listener would turn that into a write to the cache
     * table every three seconds forever. Fifteen costs ~5,700 writes a day and
     * still lands four pings inside STALE_AFTER.
     */
    public const int PING_EVERY = 15;

    /**
     * How long a stamp stays believable.
     *
     * Four ping intervals. The worker is restarted on purpose once an hour by
     * `--max-time=3600`, and the supervising loop's `sleep 1` puts it back
     * within a couple of seconds, so that planned gap is nowhere near this and
     * never reads as an outage. Nothing listens for WorkerStopping for the same
     * reason: a clean exit that is followed by a restart is not news.
     */
    public const int STALE_AFTER = 60;

    /** Long enough to still say "last seen three days ago", then it clears itself. */
    private const int REMEMBER_FOR = 7 * 24 * 60 * 60;

    /**
     * The last stamp this process wrote.
     *
     * An instance property is safe here despite the Octane rules, and only
     * here: `Looping` is dispatched by the queue worker and never during a
     * request, so this object is only ever resolved inside the worker process -
     * a separate, single-threaded, non-Octane PHP process that this listener
     * outlives on purpose. The worst a stale value could do is skip one ping.
     */
    private ?int $lastPingAt = null;

    /** When a worker last reported in, or null if none ever has. */
    public static function lastSeenAt(): ?CarbonImmutable
    {
        $seen = Cache::get(self::KEY);

        return is_int($seen) ? CarbonImmutable::createFromTimestamp($seen) : null;
    }

    /** Whether a worker reported in recently enough to believe it is still there. */
    public static function isAlive(): bool
    {
        $seen = self::lastSeenAt();

        return $seen instanceof CarbonImmutable
            && $seen->getTimestamp() > now()->getTimestamp() - self::STALE_AFTER;
    }

    public function handle(): void
    {
        $now = now()->getTimestamp();
        if ($this->lastPingAt !== null && $now - $this->lastPingAt < self::PING_EVERY) {
            return;
        }

        $this->lastPingAt = $now;
        Cache::put(self::KEY, $now, self::REMEMBER_FOR);
    }
}
