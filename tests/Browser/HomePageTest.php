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
