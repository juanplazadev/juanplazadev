<?php

declare(strict_types=1);

use App\Models\Post;
use Database\Seeders\ContentSeeder;

it('lists published posts on the index', function (): void {
    $this->seed(ContentSeeder::class);

    visit('/blog')
        ->assertNoSmoke()
        ->assertSee('Writing')
        ->assertSee("Automatic HTTPS with Caddy and Let's Encrypt");
});

/*
 * Iterating the models rather than using a dataset is deliberate: a dataset is
 * resolved when Pest collects the file, long before RefreshDatabase has built a
 * schema, so it cannot ask the database what exists. Driving the loop off the
 * same scope the controller uses means a post added to the seeder is covered
 * here without anyone remembering to add a case.
 */
it('renders every published post', function (): void {
    $this->seed(ContentSeeder::class);

    $posts = Post::query()->published()->get();

    expect($posts)->not->toBeEmpty();

    $posts->each(function (Post $post): void {
        visit("/blog/{$post->slug}")
            ->assertNoSmoke()
            ->assertSee($post->title)
            ->assertSee('min read');
    });
});

it('hides a draft post from a guest', function (): void {
    $post = Post::factory()->draft()->create();

    visit("/blog/{$post->slug}")
        ->assertSee('Page not found');
});
