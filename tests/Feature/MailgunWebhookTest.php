<?php

declare(strict_types=1);

use App\Models\EmailEvent;
use App\Models\ResumeDelivery;
use App\Services\Mailgun\MailgunSignature;

/*
 * The webhook is public - Mailgun cannot log in - so the signature is the whole
 * of the access control, and most of what follows is about the ways someone who
 * is not Mailgun might try to post here.
 */

const SIGNING_KEY = 'webhook-signing-key';

beforeEach(function (): void {
    config()->set('services.mailgun.webhook_signing_key', SIGNING_KEY);
});

/**
 * Build a payload signed the way Mailgun signs one.
 *
 * @param  array<string, mixed>  $eventData
 * @return array<string, mixed>
 */
function mailgunPayload(array $eventData, ?int $timestamp = null, ?string $key = null): array
{
    $timestamp ??= now()->getTimestamp();
    $token = bin2hex(random_bytes(16));

    return [
        'signature' => [
            'timestamp' => (string) $timestamp,
            'token' => $token,
            'signature' => hash_hmac('sha256', $timestamp.$token, $key ?? SIGNING_KEY),
        ],
        'event-data' => [
            'id' => $eventData['id'] ?? 'event-'.bin2hex(random_bytes(8)),
            'event' => 'delivered',
            'timestamp' => (float) $timestamp,
            ...$eventData,
        ],
    ];
}

it('marks a delivery as delivered', function (): void {
    $delivery = ResumeDelivery::factory()->sent()->create();

    $this->postJson(route('webhooks.mailgun'), mailgunPayload([
        'event' => 'delivered',
        'recipient' => $delivery->email,
        // Mailgun quotes the id in angle brackets here and hands it back bare
        // from the send API. The join only works because both sides normalise.
        'message' => ['headers' => ['message-id' => '<'.$delivery->message_id.'>']],
    ]))->assertNoContent();

    $delivery->refresh();

    expect($delivery->email_delivered)->toBeTrue()
        ->and($delivery->email_delivered_at)->not->toBeNull();

    expect(EmailEvent::query()->sole())
        ->event->toBe('delivered')
        ->resume_delivery_id->toBe($delivery->id)
        ->provider->toBe('mailgun');
});

it('records a permanent failure against the delivery', function (): void {
    $delivery = ResumeDelivery::factory()->sent()->create();

    $this->postJson(route('webhooks.mailgun'), mailgunPayload([
        'event' => 'failed',
        'severity' => 'permanent',
        'reason' => 'suppress-bounce',
        'recipient' => $delivery->email,
        'message' => ['headers' => ['message-id' => $delivery->message_id]],
    ]))->assertNoContent();

    expect($delivery->refresh())
        ->failure_reason->toBe('suppress-bounce')
        ->email_delivered->toBeFalse();
});

it('leaves the delivery alone for a temporary failure', function (): void {
    $delivery = ResumeDelivery::factory()->sent()->create();

    $this->postJson(route('webhooks.mailgun'), mailgunPayload([
        'event' => 'failed',
        'severity' => 'temporary',
        'reason' => 'greylisted',
        'message' => ['headers' => ['message-id' => $delivery->message_id]],
    ]))->assertNoContent();

    // Mailgun will retry it itself, so nothing has actually failed yet.
    expect($delivery->refresh()->failure_reason)->toBeNull();
    expect(EmailEvent::query()->sole()->severity)->toBe('temporary');
});

it('stores a retried event once', function (): void {
    $delivery = ResumeDelivery::factory()->sent()->create();

    // Mailgun retries any non-2xx for days, so the same event id arrives more
    // than once as a matter of course rather than as an edge case.
    foreach (range(1, 3) as $ignored) {
        $this->postJson(route('webhooks.mailgun'), mailgunPayload([
            'id' => 'the-same-event',
            'event' => 'delivered',
            'message' => ['headers' => ['message-id' => $delivery->message_id]],
        ]))->assertNoContent();
    }

    expect(EmailEvent::query()->count())->toBe(1);
});

it('keeps an event it cannot match to a delivery', function (): void {
    $this->postJson(route('webhooks.mailgun'), mailgunPayload([
        'event' => 'opened',
        'recipient' => 'someone@example.com',
        'message' => ['headers' => ['message-id' => 'unknown@juanplaza.dev']],
    ]))->assertNoContent();

    // Answering anything but 2xx here would make Mailgun retry for days over an
    // event we simply have no row for.
    expect(EmailEvent::query()->sole()->resume_delivery_id)->toBeNull();
});

it('falls back to the recipient when the message id is missing', function (): void {
    $delivery = ResumeDelivery::factory()->sent()->create(['email' => 'hiring@example.com']);

    $this->postJson(route('webhooks.mailgun'), mailgunPayload([
        'event' => 'delivered',
        'recipient' => 'Hiring@Example.com',
    ]))->assertNoContent();

    expect($delivery->refresh()->email_delivered)->toBeTrue();
});

it('refuses a payload signed with the wrong key', function (): void {
    $this->postJson(route('webhooks.mailgun'), mailgunPayload(
        ['event' => 'delivered'],
        key: 'not-the-signing-key',
    ))->assertForbidden();

    expect(EmailEvent::query()->count())->toBe(0);
});

it('refuses a stale signature', function (): void {
    // A signature stays valid forever on its own, so without the age check a
    // captured payload would replay indefinitely.
    $this->postJson(route('webhooks.mailgun'), mailgunPayload(
        ['event' => 'delivered'],
        timestamp: now()->subHour()->getTimestamp(),
    ))->assertForbidden();

    expect(EmailEvent::query()->count())->toBe(0);
});

it('refuses a replayed token inside the freshness window', function (): void {
    $payload = mailgunPayload(['event' => 'delivered']);

    $this->postJson(route('webhooks.mailgun'), $payload)->assertNoContent();

    // Same token, same signature, still inside the window - and still refused,
    // because the token is claimed once.
    $this->postJson(route('webhooks.mailgun'), $payload)->assertForbidden();

    expect(EmailEvent::query()->count())->toBe(1);
});

it('refuses everything when no signing key is configured', function (): void {
    $payload = mailgunPayload(['event' => 'delivered']);

    config()->set('services.mailgun.webhook_signing_key');
    app()->forgetInstance(MailgunSignature::class);

    // An unsigned endpoint that writes rows is worse than one that 403s.
    $this->postJson(route('webhooks.mailgun'), $payload)->assertForbidden();

    expect(EmailEvent::query()->count())->toBe(0);
});

it('refuses a signature whose timestamp is not a number', function (): void {
    $payload = mailgunPayload(['event' => 'delivered']);
    $payload['signature']['timestamp'] = 'not-a-timestamp';

    $this->postJson(route('webhooks.mailgun'), $payload)->assertForbidden();

    expect(EmailEvent::query()->count())->toBe(0);
});

it('reads its events back off the delivery', function (): void {
    $delivery = ResumeDelivery::factory()->sent()->create();
    EmailEvent::factory()->count(2)->create(['resume_delivery_id' => $delivery->id]);

    expect($delivery->events)->toHaveCount(2);
});
