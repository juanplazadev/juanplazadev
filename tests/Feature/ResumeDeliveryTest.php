<?php

declare(strict_types=1);

use App\Jobs\SendResumeEmail;
use App\Models\ResumeDelivery;
use App\Services\Cloudflare\TurnstileVerifier;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;

/*
 * The hero's résumé dialog posts here. It is the only unauthenticated endpoint
 * on the site that writes a row and sends mail, so what these cover is mostly
 * the ways a stranger can abuse it.
 */

beforeEach(function (): void {
    Queue::fake();

    // No secret in phpunit.xml, so the challenge is off by default and each
    // Turnstile test turns it on for itself. Cleared regardless because the
    // limiter is process-wide and Octane-style reuse would leak counts.
    RateLimiter::clear('');
});

it('records the request and queues the email', function (): void {
    $response = $this->withHeaders([
        'X-Forwarded-For' => '203.0.113.10',
        'User-Agent' => 'PestBrowser/1.0',
    ])->postJson(route('resume.request'), ['email' => 'hiring@example.com']);

    $response->assertCreated();

    $delivery = ResumeDelivery::query()->sole();

    expect($delivery->email)->toBe('hiring@example.com')
        // The forwarded header, not Caddy's own address - see
        // tests/Feature/TrustedProxyTest.php for why that works.
        ->and($delivery->ip_address)->toBe('203.0.113.10')
        ->and($delivery->user_agent)->toBe('PestBrowser/1.0')
        ->and($delivery->uuid)->not->toBeEmpty()
        ->and($delivery->email_sent_at)->toBeNull()
        ->and($delivery->email_delivered)->toBeFalse();

    $response->assertJson(['uuid' => $delivery->uuid]);

    Queue::assertPushed(SendResumeEmail::class, fn (SendResumeEmail $job): bool => $job->delivery->is($delivery));
});

it('normalises the address before storing it', function (): void {
    $this->postJson(route('resume.request'), ['email' => '  Hiring@Example.COM '])
        ->assertCreated();

    expect(ResumeDelivery::query()->sole()->email)->toBe('hiring@example.com');
});

it('rejects an address it cannot send to', function (string $email): void {
    $this->postJson(route('resume.request'), ['email' => $email])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('email');

    expect(ResumeDelivery::query()->count())->toBe(0);
    Queue::assertNothingPushed();
})->with([
    'missing' => '',
    'no domain' => 'hiring',
    'no tld' => 'hiring@example',
    'spaces' => 'hiring @example.com',
]);

it('throttles a caller hammering the form', function (): void {
    foreach (range(1, 5) as $attempt) {
        $this->postJson(route('resume.request'), ['email' => "hiring{$attempt}@example.com"])
            ->assertCreated();
    }

    $this->postJson(route('resume.request'), ['email' => 'hiring6@example.com'])
        ->assertTooManyRequests();

    expect(ResumeDelivery::query()->count())->toBe(5);
});

/*
 * Turnstile. The secret being unset is the switch: with no secret the challenge
 * never runs and the column stays null, which is what lets local and this suite
 * work without Cloudflare credentials at all.
 */

it('skips the challenge when turnstile is unconfigured', function (): void {
    Http::preventStrayRequests();

    $this->postJson(route('resume.request'), ['email' => 'hiring@example.com'])
        ->assertCreated();

    expect(ResumeDelivery::query()->sole()->turnstile_success)->toBeNull();
});

it('sends the email when the challenge passes', function (): void {
    config()->set('services.turnstile.secret_key', 'secret');
    Http::fake(['challenges.cloudflare.com/*' => Http::response(['success' => true])]);

    $this->postJson(route('resume.request'), [
        'email' => 'hiring@example.com',
        'turnstile_token' => 'a-token',
    ])->assertCreated();

    expect(ResumeDelivery::query()->sole()->turnstile_success)->toBeTrue();
    Queue::assertPushed(SendResumeEmail::class);
});

it('records a refused challenge but sends nothing', function (): void {
    config()->set('services.turnstile.secret_key', 'secret');
    Http::fake(['challenges.cloudflare.com/*' => Http::response([
        'success' => false,
        'error-codes' => ['invalid-input-response'],
    ])]);

    $this->postJson(route('resume.request'), [
        'email' => 'bot@example.com',
        'turnstile_token' => 'a-token',
    ])->assertUnprocessable()->assertJsonValidationErrorFor('turnstile_token');

    // The row is the point: a blocked attempt is exactly the traffic the
    // dashboard will want to count, so it is written before the 422.
    $delivery = ResumeDelivery::query()->sole();

    expect($delivery->email)->toBe('bot@example.com')
        ->and($delivery->turnstile_success)->toBeFalse()
        ->and($delivery->turnstile_errors)->toBe(['invalid-input-response']);

    Queue::assertNothingPushed();
});

it('requires a token once the challenge is switched on', function (): void {
    config()->set('services.turnstile.secret_key', 'secret');
    Http::preventStrayRequests();

    $this->postJson(route('resume.request'), ['email' => 'hiring@example.com'])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('turnstile_token');

    expect(ResumeDelivery::query()->count())->toBe(0);
});

it('refuses when cloudflare cannot be reached', function (): void {
    config()->set('services.turnstile.secret_key', 'secret');

    // An outage at Cloudflare is not evidence the visitor is human. Failing
    // open here would turn any siteverify blip into an open relay for the form.
    Http::fake(fn () => throw new ConnectionException('down'));

    $this->postJson(route('resume.request'), [
        'email' => 'hiring@example.com',
        'turnstile_token' => 'a-token',
    ])->assertUnprocessable();

    expect(ResumeDelivery::query()->sole()->turnstile_errors)->toBe(['internal-error']);
    Queue::assertNothingPushed();
});

/*
 * The verifier's own guards, exercised directly. Both are unreachable through
 * the endpoint - ResumeDeliveryRequest rejects a missing token before verify()
 * sees it, and Cloudflare does not send a malformed envelope on purpose - but
 * both decide whether a request is allowed through, so neither should be able
 * to flip to "allow" unnoticed.
 */

it('refuses a missing token rather than waving it through', function (): void {
    config()->set('services.turnstile.secret_key', 'secret');
    Http::preventStrayRequests();

    $verification = resolve(TurnstileVerifier::class)->verify(null);

    expect($verification->allows())->toBeFalse()
        ->and($verification->errors())->toBe(['missing-input-response']);
});

it('refuses a response whose error codes are not a list', function (): void {
    config()->set('services.turnstile.secret_key', 'secret');
    Http::fake(['challenges.cloudflare.com/*' => Http::response([
        'success' => false,
        'error-codes' => 'not-a-list',
    ])]);

    $verification = resolve(TurnstileVerifier::class)->verify('a-token');

    expect($verification->allows())->toBeFalse()
        ->and($verification->errors())->toBe(['internal-error']);
});
