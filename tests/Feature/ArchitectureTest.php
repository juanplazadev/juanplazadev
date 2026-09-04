<?php

declare(strict_types=1);

use App\Models\Architecture;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the architecture index lists every published write-up in order', function (): void {
    $second = Architecture::factory()->create(['position' => 1]);
    $first = Architecture::factory()->create(['position' => 0]);
    Architecture::factory()->draft()->create();

    $this->get(route('architecture.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('architecture/index')
            ->has('architectures', 2)
            ->where('architectures.0.slug', $first->slug)
            ->where('architectures.1.slug', $second->slug));
});

test('a write-up renders the shared page component with its metadata and body', function (): void {
    $item = Architecture::factory()->create();

    $this->get(route('architecture.show', $item->slug))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('architecture/item')
            ->where('architecture.slug', $item->slug)
            ->where('architecture.title', $item->title)
            ->has('architecture.stack')
            ->has('architecture.rendered'));
});

test('an unknown slug is a 404', function (): void {
    $this->get('/architecture/no-such-writeup')->assertNotFound();
});

test('a traversal-shaped slug is rejected by the route pattern', function (): void {
    $this->get('/architecture/..%2F..%2Fsettings%2Fprofile')->assertNotFound();
});

test('a draft is invisible to a guest and visible to the author', function (): void {
    $draft = Architecture::factory()->draft()->create();

    $this->get(route('architecture.show', $draft->slug))->assertNotFound();

    $this->actingAs(User::factory()->create())
        ->get(route('architecture.show', $draft->slug))
        ->assertOk();
});
