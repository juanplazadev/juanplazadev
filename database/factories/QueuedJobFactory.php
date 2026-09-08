<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Jobs\SendResumeEmail;
use App\Models\QueuedJob;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use stdClass;

/**
 * @extends Factory<QueuedJob>
 */
final class QueuedJobFactory extends Factory
{
    /**
     * The envelope `Illuminate\Queue\Queue::createPayloadArray()` writes.
     *
     * `displayName` is the only part the panel reads, but `data.command` has to
     * be genuinely unserializable rather than a placeholder: `queue:retry`
     * unserializes it to look for a retryUntil(), so a stub payload would pass
     * every snapshot test and then blow up the one action that matters. A bare
     * stdClass is enough for that - serializing a real SendResumeEmail would
     * tie every fixture to a ResumeDelivery row it has no use for.
     */
    public static function payload(string $job): string
    {
        return (string) json_encode([
            'uuid' => (string) Str::uuid7(),
            'displayName' => $job,
            'job' => 'Illuminate\Queue\CallQueuedHandler@call',
            'maxTries' => 3,
            'data' => ['commandName' => $job, 'command' => serialize(new stdClass())],
        ]);
    }

    /**
     * A job pushed a moment ago and available now: what a healthy queue looks
     * like in the instant before a worker claims it.
     *
     * The payload is the driver's own envelope rather than a real serialised
     * command. Everything the panel reads comes off the envelope, and building
     * a genuine one would tie every test to SendResumeEmail's constructor.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $now = now()->getTimestamp();

        return [
            'queue' => 'default',
            'payload' => self::payload(SendResumeEmail::class),
            'attempts' => 0,
            'reserved_at' => null,
            'available_at' => $now,
            'created_at' => $now,
        ];
    }

    /** Claimed by a worker and running right now. */
    public function reserved(): static
    {
        return $this->state(fn (): array => [
            'attempts' => 1,
            'reserved_at' => now()->getTimestamp(),
        ]);
    }

    /**
     * Available well past the grace period and still untouched: nobody is
     * reading the queue.
     */
    public function waiting(int $minutes = 30): static
    {
        return $this->state(fn (): array => [
            'available_at' => now()->subMinutes($minutes)->getTimestamp(),
            'created_at' => now()->subMinutes($minutes)->getTimestamp(),
        ]);
    }

    /**
     * Reserved long enough ago that `retry_after` has passed: the worker that
     * claimed it died mid-job.
     */
    public function abandoned(int $minutes = 30): static
    {
        return $this->state(fn (): array => [
            'attempts' => 1,
            'reserved_at' => now()->subMinutes($minutes)->getTimestamp(),
        ]);
    }

    /** Not yet available, because it is serving out its #[Backoff] window. */
    public function backingOff(int $seconds = 120): static
    {
        return $this->state(fn (): array => [
            'attempts' => 1,
            'available_at' => now()->addSeconds($seconds)->getTimestamp(),
        ]);
    }
}
