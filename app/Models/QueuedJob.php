<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\QueuedJobFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A job waiting on the `database` queue, or reserved by a worker right now.
 *
 * Laravel ships no model for this table because nothing in the framework reads
 * it as data - the queue driver does its own hand-written SQL. The panel does
 * read it as data, so it gets one rather than the application's first
 * `DB::table()`, which would be the odd one out beside App\Content\ContentSnapshot
 * and App\Mail\ResumeDeliverySnapshot.
 *
 * Read-only by convention: the queue driver owns every write to this table, and
 * the panel only ever counts and lists. Nothing here inserts, updates or deletes.
 *
 * @property int $id
 * @property string $queue
 * @property string $payload
 * @property int $attempts
 * @property int|null $reserved_at
 * @property int $available_at
 * @property int $created_at
 */
final class QueuedJob extends Model
{
    /** @use HasFactory<QueuedJobFactory> */
    use HasFactory;

    /**
     * The three time columns are unsigned unix integers, not timestamps, and
     * there is no `updated_at` at all - so Eloquent's own timestamp handling has
     * nothing to touch here.
     */
    public $timestamps = false;

    protected $table = 'jobs';

    /**
     * The job class named in a raw queue payload, or a stand-in.
     *
     * Shared with FailedJob, which stores the same envelope in the same shape.
     */
    public static function displayName(string $payload): string
    {
        /** @var array{displayName?: mixed} $decoded */
        $decoded = json_decode($payload, true) ?: [];

        return is_string($decoded['displayName'] ?? null) && $decoded['displayName'] !== ''
            ? $decoded['displayName']
            : 'Unrecognised job';
    }

    /**
     * The job class behind the payload, e.g. "App\Jobs\SendResumeEmail".
     *
     * `displayName` is what the queue writes for a plain job and what
     * `queue:failed` prints, so it is the name to show rather than digging the
     * serialised command out of `data`. A payload the driver did not write is
     * not worth guessing at.
     */
    public function name(): string
    {
        return self::displayName($this->payload);
    }

    /**
     * Whether this row is one the `stalled` scope would have counted.
     *
     * The rule is written twice on purpose - once here for a row already in
     * hand and once as SQL below for a count over the whole table - because the
     * page states both and they must never disagree. Change one, change the
     * other; `a stalled job is reported by both the total and its own row` pins
     * that they still agree.
     */
    public function isStalled(int $retryAfter, int $grace): bool
    {
        return $this->reserved_at === null
            ? $this->available_at <= now()->getTimestamp() - $grace
            : $this->reserved_at <= now()->getTimestamp() - $retryAfter;
    }

    /** When the job became eligible to run. */
    public function availableAt(): CarbonImmutable
    {
        return CarbonImmutable::createFromTimestamp($this->available_at);
    }

    /** When the job was pushed onto the queue. */
    public function queuedAt(): CarbonImmutable
    {
        return CarbonImmutable::createFromTimestamp($this->created_at);
    }

    /**
     * Waiting for a worker to pick it up.
     *
     * @param  Builder<covariant static>  $query
     */
    #[Scope]
    protected function pending(Builder $query): void
    {
        $query->whereNull('reserved_at');
    }

    /**
     * Claimed by a worker and being run right now.
     *
     * @param  Builder<covariant static>  $query
     */
    #[Scope]
    protected function reserved(Builder $query): void
    {
        $query->whereNotNull('reserved_at');
    }

    /**
     * Jobs a healthy worker should have moved by now, either way it can hang.
     *
     * An unreserved row is judged on `available_at`, never `created_at`: a job
     * inside its #[Backoff] window is deliberately not available yet, and
     * measuring from creation would report every legitimate retry as stuck.
     *
     * A reserved row past `retry_after` means the worker that claimed it died
     * mid-job. The queue will release it on its own, so this is a symptom to
     * report rather than something to fix from the page.
     *
     * @param  Builder<covariant static>  $query
     */
    #[Scope]
    protected function stalled(Builder $query, int $retryAfter, int $grace): void
    {
        $now = now()->getTimestamp();

        $query->where(function (Builder $stuck) use ($now, $retryAfter, $grace): void {
            $stuck
                ->where(fn (Builder $waiting) => $waiting
                    ->whereNull('reserved_at')
                    ->where('available_at', '<=', $now - $grace))
                ->orWhere(fn (Builder $abandoned) => $abandoned
                    ->whereNotNull('reserved_at')
                    ->where('reserved_at', '<=', $now - $retryAfter));
        });
    }

    /**
     * Oldest first: the queue's own order, and the one that answers "what is
     * holding everything else up".
     *
     * @param  Builder<covariant static>  $query
     */
    #[Scope]
    protected function inQueueOrder(Builder $query): void
    {
        $query->orderBy('id');
    }

    /**
     * Integers, deliberately not datetime casts.
     *
     * These columns hold unsigned unix integers, and a datetime cast applies on
     * WRITE as well as read - it would turn an integer handed to a factory into
     * a `Y-m-d H:i:s` string and put that in an integer column. Reading them as
     * what they are also keeps the scopes above comparing integers to
     * integers, which is what the queue driver's own SQL does.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'reserved_at' => 'integer',
            'available_at' => 'integer',
            'created_at' => 'integer',
        ];
    }
}
