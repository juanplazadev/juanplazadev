<?php

declare(strict_types=1);

namespace App\Actions;

use App\Jobs\SendResumeEmail;
use App\Models\ResumeDelivery;
use App\Services\Cloudflare\TurnstileVerification;

/**
 * The whole résumé request: write it down, then send it.
 *
 * The send is dispatched rather than run inline so the visitor is not made to
 * wait on Mailgun, and so a provider blip becomes a retry instead of a 500 in
 * front of somebody who did nothing wrong.
 */
final readonly class HandleResumeDeliveryAction
{
    public function __construct(private LogResumeDeliveryAction $log) {}

    public function handle(
        string $email,
        ?string $ip,
        ?string $userAgent,
        TurnstileVerification $verification,
    ): ResumeDelivery {
        $delivery = $this->log->handle($email, $ip, $userAgent, $verification);

        // A blocked request is still recorded, but nothing is emailed to it.
        if ($verification->allows()) {
            dispatch(new SendResumeEmail($delivery));
        }

        return $delivery;
    }
}
