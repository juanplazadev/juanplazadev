<?php

declare(strict_types=1);

use App\Models\Architecture;
use Database\Seeders\ContentSeeder;

it('lists published write-ups on the index', function (): void {
    $this->seed(ContentSeeder::class);

    visit('/architecture')
        ->assertNoSmoke()
        ->assertSee('Architecture')
        ->assertSee('juanplaza.dev')
        ->assertSee('Check-in');
});

/*
 * The seeder ships one write-up with external links and one without, and one of
 * each `active` state, so looping over both covers the branches in
 * architecture-layout.tsx that a single fixture would miss.
 */
it('renders every published write-up', function (): void {
    $this->seed(ContentSeeder::class);

    $architectures = Architecture::query()->published()->ordered()->get();

    expect($architectures)->not->toBeEmpty();

    $architectures->each(function (Architecture $architecture): void {
        visit("/architecture/{$architecture->slug}")
            ->assertNoSmoke()
            ->assertSee($architecture->title)
            ->assertSee($architecture->status);
    });
});

it('hides a draft write-up from a guest', function (): void {
    $architecture = Architecture::factory()->draft()->create();

    visit("/architecture/{$architecture->slug}")
        ->assertSee('Page not found');
});
