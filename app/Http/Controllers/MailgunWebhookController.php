<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\EmailEvent;
use App\Models\ResumeDelivery;
use App\Services\Mailgun\MailgunSignature;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Date;

/**
 * Records what Mailgun says happened to a message we sent.
 *
 * The route is public because Mailgun cannot authenticate, so MailgunSignature
 * is the whole of the access control - see that class for what it checks.
 *
 * Everything past the signature answers 200, including events this does not act
 * on and events for messages it cannot find. Mailgun retries any non-2xx for
 * days, so returning 500 on an unrecognised payload turns one bad event into a
 * sustained flood.
 */
final class MailgunWebhookController extends Controller
{
    public function __invoke(Request $request, MailgunSignature $signature): Response
    {
        /** @var array<string, mixed> $envelope */
        $envelope = (array) $request->input('signature', []);

        $verified = $signature->isValid(
            (string) ($envelope['timestamp'] ?? ''),
            (string) ($envelope['token'] ?? ''),
            (string) ($envelope['signature'] ?? ''),
        );

        abort_unless($verified, 403, 'Invalid webhook signature.');

        /** @var array<string, mixed> $data */
        $data = (array) $request->input('event-data', []);

        $eventId = (string) ($data['id'] ?? '');

        // No id means nothing can be deduplicated, and Mailgun will send this
        // event again. Accepting it silently is better than storing duplicates.
        if ($eventId === '') {
            return response()->noContent();
        }

        $event = $this->store($eventId, $data);

        $this->applyTo($event);

        return response()->noContent();
    }

    /**
     * Upsert by the provider's event id, so a retried webhook updates one row.
     *
     * @param  array<string, mixed>  $data
     */
    private function store(string $eventId, array $data): EmailEvent
    {
        $messageId = ResumeDelivery::normalizeMessageId(
            Arr::get($data, 'message.headers.message-id') === null
                ? null
                : (string) Arr::get($data, 'message.headers.message-id'),
        );

        $recipient = $data['recipient'] ?? null;
        $recipient = is_string($recipient) ? mb_strtolower($recipient) : null;

        $event = EmailEvent::query()->firstOrNew(['event_id' => $eventId]);

        $event->fill([
            'provider' => 'mailgun',
            'event' => (string) ($data['event'] ?? 'unknown'),
            'recipient' => $recipient,
            'message_id' => $messageId,
            'severity' => $this->stringOrNull($data['severity'] ?? null),
            'reason' => $this->stringOrNull($data['reason'] ?? null),
            'payload' => $data,
            'occurred_at' => Date::createFromTimestamp((float) ($data['timestamp'] ?? now()->getTimestamp())),
            'resume_delivery_id' => $this->match($messageId, $recipient)?->id,
        ])->save();

        return $event;
    }

    /**
     * Find the delivery this event belongs to.
     *
     * The message id is the reliable join. The recipient fallback exists for
     * events Mailgun sends without message headers, and takes the newest
     * matching row because an address can ask more than once.
     */
    private function match(?string $messageId, ?string $recipient): ?ResumeDelivery
    {
        if ($messageId !== null) {
            $byMessage = ResumeDelivery::query()->where('message_id', $messageId)->first();

            if ($byMessage instanceof ResumeDelivery) {
                return $byMessage;
            }
        }

        if ($recipient === null) {
            return null;
        }

        return ResumeDelivery::query()
            ->where('email', $recipient)
            ->whereNotNull('email_sent_at')
            ->newestFirst()
            ->first();
    }

    private function applyTo(EmailEvent $event): void
    {
        $delivery = $event->resumeDelivery;

        if (! $delivery instanceof ResumeDelivery) {
            return;
        }

        if ($event->event === 'delivered') {
            $delivery->markDelivered($event->occurred_at);

            return;
        }

        if ($event->isPermanentFailure()) {
            $delivery->markFailed($event->reason ?? 'Permanently failed at the provider.');
        }
    }

    private function stringOrNull(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }
}
