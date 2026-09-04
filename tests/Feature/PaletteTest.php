<?php

declare(strict_types=1);

use App\Enums\Palette;
use Inertia\Testing\AssertableInertia;

test('the default palette is used when no cookie is set', function (): void {
    $this->get(route('home'))
        ->assertOk()
        ->assertSee('data-palette="ember"', escape: false)
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('palette', 'ember'));
});

test('a stored palette is rendered into the markup by the server', function (): void {
    $this->withUnencryptedCookie(Palette::COOKIE, 'cobalt')
        ->get(route('home'))
        ->assertOk()
        ->assertSee('data-palette="cobalt"', escape: false)
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('palette', 'cobalt'));
});

test('an unrecognised palette falls back to the default', function (): void {
    $this->withUnencryptedCookie(Palette::COOKIE, 'chartreuse')
        ->get(route('home'))
        ->assertOk()
        ->assertSee('data-palette="ember"', escape: false);
});

test('every palette has a matching css block and swatch', function (): void {
    $css = file_get_contents(resource_path('css/additional-styles/palettes.css'));

    foreach (Palette::cases() as $palette) {
        // Quote style is whatever the formatter last settled on, so match the
        // selector rather than a literal - this test is about the palette
        // existing, not about how the CSS is punctuated.
        expect($css)
            ->toContain("--swatch-{$palette->value}")
            ->toMatch('/\[data-palette=[\'"]'.preg_quote($palette->value, '/').'[\'"]\]/');
    }
});
