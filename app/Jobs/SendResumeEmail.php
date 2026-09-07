<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Actions\SendResumeEmailAction;
use App\Models\ResumeDelivery;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Attributes\Backoff;
use Illuminate\Queue\Attributes\Tries;

/**
 * Carries the send onto the queue and nothing else.
 *
 * Production runs one worker inside the app container (docker-entrypoint.sh);
 * without it this job would sit in the `jobs` table forever, which is the
 * failure mode to check first if a résumé is never delivered.
 */
#[Backoff([30, 120])]
#[Tries(3)]
final class SendResumeEmail implements ShouldQueue
{
    use Queueable;

    public function __construct(public ResumeDelivery $delivery) {}

    public function handle(SendResumeEmailAction $send): void
    {
        $send->handle($this->delivery);
    }
}
