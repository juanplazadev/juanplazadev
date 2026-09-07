<?php

declare(strict_types=1);

use App\Actions\SendResumeEmailAction;
use App\Jobs\SendResumeEmail;
use App\Mail\ResumeRequested;
use App\Models\ResumeDelivery;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\Attributes\Tries;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Email;

it('addresses the email to whoever asked', function (): void {
    Mail::fake();

    $delivery = ResumeDelivery::factory()->create(['email' => 'hiring@example.com']);

    resolve(SendResumeEmailAction::class)->handle($delivery);

    Mail::assertSent(
        ResumeRequested::class,
        fn (ResumeRequested $mail): bool => $mail->hasTo('hiring@example.com')
            && $mail->delivery->is($delivery),
    );
});

it('renders the wordmark and the address it was sent to', function (): void {
    $delivery = ResumeDelivery::factory()->create(['email' => 'hiring@example.com']);

    $rendered = new ResumeRequested($delivery)->render();

    expect($rendered)
        ->toContain('juanplaza')
        ->toContain('.dev')
        // The Ember accent, hard-coded because no mail client resolves the CSS
        // custom properties the site itself uses.
        ->toContain('#a03c12')
        ->toContain('hiring@example.com');
});

it('carries no attachment yet', function (): void {
    // The PDF is deliberately not attached in this pass. If that changes, this
    // is the test to change with it rather than the one to delete. Asserted on
    // the built MIME message rather than the Mailable, because attachments()
    // is not defined at all - calling it would only prove that.
    $delivery = ResumeDelivery::factory()->create();

    /** @var Email $message */
    $message = Mail::to($delivery->email)
        ->send(new ResumeRequested($delivery))
        ?->getSymfonySentMessage()
        ->getOriginalMessage();

    expect($message->getAttachments())->toBe([]);
});

it('stamps the row with the provider message id', function (): void {
    $delivery = ResumeDelivery::factory()->create();

    resolve(SendResumeEmailAction::class)->handle($delivery);

    // Without this the webhooks have no handle on the message and the row can
    // never be reconciled, so a send that does not stamp is a broken send.
    expect($delivery->refresh())
        ->message_id->not->toBeNull()
        ->email_sent_at->not->toBeNull()
        // Normalised on the way in - the webhook side sends it wrapped.
        ->message_id->not->toStartWith('<');
});

it('records why a send failed and lets the queue retry', function (): void {
    $delivery = ResumeDelivery::factory()->create();

    Mail::shouldReceive('to->send')->andThrow(new RuntimeException('smtp is down'));

    expect(fn () => resolve(SendResumeEmailAction::class)->handle($delivery))
        ->toThrow(RuntimeException::class);

    expect($delivery->refresh())
        ->failure_reason->toBe('smtp is down')
        ->email_sent_at->toBeNull();
});

it('queues the send rather than blocking the visitor', function (): void {
    Mail::fake();

    $delivery = ResumeDelivery::factory()->create();
    $job = new SendResumeEmail($delivery);

    // Retries are declared with Laravel's attributes rather than $tries/$backoff
    // properties - rector rewrites the properties to these, so asserting on the
    // properties passes today and silently stops meaning anything tomorrow.
    $tries = new ReflectionClass($job)->getAttributes(Tries::class);

    expect($job)->toBeInstanceOf(ShouldQueue::class)
        ->and($tries)->toHaveCount(1)
        ->and($tries[0]->newInstance()->tries)->toBe(3);

    // Run it: the job is the only thing that reaches the send in production, so
    // asserting on its shape alone would leave the actual path untested.
    $job->handle(resolve(SendResumeEmailAction::class));

    Mail::assertSent(ResumeRequested::class);
});
