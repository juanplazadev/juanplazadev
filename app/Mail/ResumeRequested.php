<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\ResumeDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The résumé email itself.
 *
 * No attachment yet, by design rather than oversight: this pass is the branded
 * shell and the copy. When the PDF lands, add an attachments() method returning
 * the file - the delivery record and the webhook plumbing need no changes for it.
 *
 * Not ShouldQueue. App\Jobs\SendResumeEmail owns the queueing, because the row
 * has to be stamped with the provider's message id in the same place the send
 * happens, and a self-queueing mailable puts that stamp out of reach.
 */
final class ResumeRequested extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(public ResumeDelivery $delivery) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'The résumé you asked for - Juan Plaza',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.resume-requested',
            text: 'mail.resume-requested-text',
        );
    }
}
