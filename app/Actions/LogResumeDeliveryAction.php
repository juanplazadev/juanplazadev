<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\ResumeDelivery;
use App\Services\Cloudflare\TurnstileVerification;

/**
 * Writes the request down. Sends nothing.
 *
 * Separate from the send because the row has to exist even when nothing will be
 * sent: a failed Turnstile challenge is exactly the thing the dashboard will
 * want to count, and it has no email to go with it.
 */
final class LogResumeDeliveryAction
{
    public function handle(
        string $email,
        ?string $ip,
        ?string $userAgent,
        TurnstileVerification $verification,
    ): ResumeDelivery {
        return ResumeDelivery::query()->create([
            'email' => $email,
            'ip_address' => $ip,
            // Truncated to the column rather than rejected: a long or absurd
            // user agent must not cost us the record of the request.
            'user_agent' => $userAgent === null ? null : mb_substr($userAgent, 0, 512),
            'turnstile_success' => $verification->success(),
            'turnstile_errors' => $verification->errors(),
        ]);
    }
}
