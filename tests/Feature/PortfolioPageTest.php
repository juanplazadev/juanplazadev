<?php

declare(strict_types=1);

use Inertia\Testing\AssertableInertia;

test('the landing page renders the home component', function (): void {
    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->component('home'));
});

test('an unknown path renders the 404 page rather than a Laravel error', function (): void {
    $this->get('/no-such-page')
        ->assertNotFound()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->component('errors/404'));
});

test('the 404 page still receives the shared props its chrome needs', function (): void {
    $this->get('/no-such-page')
        ->assertNotFound()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('errors/404')
            ->has('palette')
            ->has('palettes'));
});
