<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\FailedJobFactory;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A job that exhausted its tries and was set aside.
 *
 * Written by the `database-uuids` failed-job provider (config/queue.php), which
 * stays the only thing that writes or deletes here: the panel's retry and
 * forget actions both go through Artisan so the provider keeps ownership of the
 * table. See App\Queue\QueueControl.
 *
 * @property int $id
 * @property string $uuid
 * @property string $connection
 * @property string $queue
 * @property string $payload
 * @property string $exception
 * @property CarbonImmutable $failed_at
 */
#[RouteKey('uuid')]
final class FailedJob extends Model
{
    /** @use HasFactory<FailedJobFactory> */
    use HasFactory;

    /** `failed_at` is the only time column, and the provider sets it. */
    public $timestamps = false;

    protected $table = 'failed_jobs';

    /** The job class behind the payload. Same envelope as a live QueuedJob. */
    public function name(): string
    {
        return QueuedJob::displayName($this->payload);
    }

    /**
     * The first line of the stack trace: the exception class and its message.
     *
     * The stored `exception` is the full trace, which is tens of lines of vendor
     * frames. The panel is a place to recognise a failure, not to debug it -
     * Sentry has the trace, and the errors page already links there.
     */
    public function reason(): string
    {
        $firstLine = mb_trim(explode("\n", $this->exception, 2)[0]);

        return $firstLine === '' ? 'No exception recorded' : $firstLine;
    }

    /**
     * Newest first: a failure you have not seen yet is at the top.
     *
     * @param  Builder<covariant static>  $query
     */
    #[Scope]
    protected function newestFirst(Builder $query): void
    {
        $query->latest('failed_at')->orderByDesc('id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'failed_at' => 'immutable_datetime',
        ];
    }
}
