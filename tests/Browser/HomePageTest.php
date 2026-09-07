<?php

declare(strict_types=1);

use App\Models\ResumeDelivery;

it('renders the landing page', function (): void {
    visit('/')
        ->assertNoSmoke()
        ->assertSee('Juan Plaza')
        ->assertSee('Shelton, CT')
        ->assertSee('Get In Touch')
        ->assertSee('Experience');
});

/*
 * The one test here that reaches the public internet. The pill fetches
 * Open-Meteo from the browser using build-time VITE_WEATHER_* vars, so there is
 * no server-side seam to fake - which is the point: this proves the real
 * integration rather than the rendering of a canned payload.
 *
 * visit() only waits for `load`, and assertSee does not retry, so the
 * networkidle wait is what stands between this and asserting on the skeleton.
 */
it('loads a live weather reading into the hero pill', function (): void {
    visit('/')
        ->waitForEvent('networkidle')
        ->assertVisible('@weather-reading')
        ->assertSee('°F');
});

/*
 * What the flag is for: with hiring off, nothing on the page says the owner is
 * looking, while the work history - the substance of the site - stays put.
 * Browser tests share this process (see .ai/rules/browser.md), so config()->set
 * reaches the request the visit makes.
 */
it('shows the availability badge in hiring mode', function (): void {
    config()->set('site.hiring', true);

    visit('/')
        ->assertNoSmoke()
        ->assertSee('Open to remote roles')
        ->assertSee('Open to remote roles and conversations');
});

it('drops every availability signal outside hiring mode', function (): void {
    config()->set('site.hiring', false);

    visit('/')
        ->assertNoSmoke()
        ->assertDontSee('Open to remote roles')
        ->assertSee('Remote since 2018')
        ->assertSee('Always up for a conversation')
        // The history and the resume are not availability signals and never move.
        ->assertSee('Experience')
        ->assertSee('RBC Bearings')
        ->assertSee('Résumé');
});

/*
 * The résumé is no longer a direct download - the button opens a dialog that
 * asks for an address first, and submitting it POSTs to resume.request.
 *
 * Browser tests share this process (.ai/rules/browser.md), so the row this
 * writes is visible to the assertion below; phpunit.xml pins QUEUE_CONNECTION
 * to sync and MAIL_MAILER to array, so the send runs inline and goes nowhere.
 *
 * assertSee never retries, so every assertion is reached through an action that
 * does wait: type() and click() are Playwright actionability calls, which is
 * what rides out the dialog's 200ms entrance and the round trip.
 */
it('asks for an email address instead of downloading the résumé', function (): void {
    visit('/')
        ->assertNoSmoke()
        ->click('@resume-trigger')
        ->type('email', 'not-an-address')
        ->assertSee('Get the résumé')
        ->click('@resume-submit')
        // Rejected on the client, before a request is made.
        ->assertSee('That does not look like an address I can send to.')
        ->type('email', 'hiring@example.com')
        ->click('@resume-submit')
        ->waitForEvent('networkidle')
        ->assertVisible('@resume-sent')
        ->assertSee('On its way')
        ->assertSee('hiring@example.com');

    expect(ResumeDelivery::query()->sole())
        ->email->toBe('hiring@example.com')
        // Unconfigured Turnstile means the challenge never ran - see
        // App\Services\Cloudflare\TurnstileVerifier.
        ->turnstile_success->toBeNull()
        ->email_sent_at->not->toBeNull();
});

it('rejects an address the server will not accept', function (): void {
    visit('/')
        ->click('@resume-trigger')
        // A leading hyphen in the domain passes the dialog's own regex and
        // fails Rule::email()'s strict mode, which is what makes this a test of
        // the server's message reaching the dialog rather than of the regex.
        ->type('email', 'hiring@-example.com')
        ->click('@resume-submit')
        ->waitForEvent('networkidle')
        ->assertSee('The email field must be a valid email address.')
        ->assertVisible('@resume-email')
        ->assertDontSee('On its way');

    expect(ResumeDelivery::query()->count())->toBe(0);
});
