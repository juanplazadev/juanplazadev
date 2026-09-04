<?php

declare(strict_types=1);

use App\Models\Post;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the blog index lists every published post', function (): void {
    Post::factory()->count(3)->create();
    Post::factory()->draft()->create();

    $this->get(route('posts.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('blog/index')
            ->has('posts', 3));
});

test('a post renders the shared page component with its metadata and body', function (): void {
    $post = Post::factory()->create(['tags' => ['Caddy', 'TLS']]);

    $this->get(route('posts.show', $post->slug))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('blog/post')
            ->where('post.slug', $post->slug)
            ->where('post.title', $post->title)
            ->has('post.tags', 2)
            ->has('post.rendered'));
});

test('an unknown slug is a 404', function (): void {
    $this->get('/blog/no-such-post')->assertNotFound();
});

test('a traversal-shaped slug is rejected by the route pattern', function (): void {
    $this->get('/blog/..%2F..%2Fsettings%2Fprofile')->assertNotFound();
    $this->get('/blog/Some_Upper.Case')->assertNotFound();
});

test('posts are ordered newest first', function (): void {
    Post::factory()->create(['published_at' => now()->subYear()]);
    $newest = Post::factory()->create(['published_at' => now()->subDay()]);
    Post::factory()->create(['published_at' => now()->subMonth()]);

    $this->get(route('posts.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('posts.0.slug', $newest->slug));
});

test('a draft is invisible to a guest and visible to the author', function (): void {
    $draft = Post::factory()->draft()->create();

    $this->get(route('posts.show', $draft->slug))->assertNotFound();

    $this->actingAs(User::factory()->create())
        ->get(route('posts.show', $draft->slug))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->component('blog/post'));
});

test('a post published in the future is still a draft', function (): void {
    $scheduled = Post::factory()->create(['published_at' => now()->addWeek()]);

    $this->get(route('posts.show', $scheduled->slug))->assertNotFound();
});

test('the body is compiled on save', function (): void {
    $post = Post::factory()->create([
        'body' => "## Heading\n\nA paragraph.",
        'blocks' => null,
    ]);

    expect($post->rendered)->toHaveCount(1)
        ->and($post->rendered[0]['html'])->toContain('<h2>Heading</h2>');
});

test('editing the body recompiles it', function (): void {
    $post = Post::factory()->create(['body' => 'Before.']);

    $post->update(['body' => 'After.']);

    expect($post->fresh()->rendered[0]['html'])->toContain('After.')
        ->and($post->fresh()->rendered[0]['html'])->not->toContain('Before.');
});
