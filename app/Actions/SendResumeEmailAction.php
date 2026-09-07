<?php

declare(strict_types=1);

namespace App\Actions;

use App\Mail\ResumeRequested;
use App\Models\ResumeDelivery;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends the résumé email and stamps the row with what the provider said.
 *
 * Synchronous on purpose - App\Jobs\SendResumeEmail is what puts it on the
 * queue. Keeping the queueing out of here is what lets a test call this
 * directly and assert on the row rather than on a fake bus.
 */
final class SendResumeEmailAction
{
    public function handle(ResumeDelivery $delivery): void
    {
        try {
            $sent = Mail::to($delivery->email)->send(new ResumeRequested($delivery));
        } catch (Throwable $throwable) {
            // Recorded before rethrowing, so a row that never made it out says
            // why even if every retry is eventually exhausted.
            $delivery->markFailed($throwable->getMessage());

            throw $throwable;
        }

        /*
         * The message id is the only handle the webhooks will give us on this
         * message, so a send without one leaves a row nothing can reconcile.
         *
         * What getMessageId() returns is transport-specific. Mailgun's API
         * transport sets it from the `id` the API hands back, which IS the
         * Message-Id its webhooks later report in message.headers.message-id -
         * so in production the two match once the angle brackets are stripped
         * (see ResumeDelivery::normalizeMessageId). Local SMTP to Mailpit
         * returns Mailpit's own queue id instead, which matches nothing; that
         * is why MailgunWebhookController keeps a recipient fallback rather
         * than trusting the id alone.
         */
        $delivery->markSent($sent?->getSymfonySentMessage()->getMessageId());
    }
}
