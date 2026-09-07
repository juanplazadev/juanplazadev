<?php

declare(strict_types=1);

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
