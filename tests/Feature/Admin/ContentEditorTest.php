<?php

declare(strict_types=1);

use App\Models\Architecture;
use App\Models\Post;
use App\Models\User;

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function postPayload(array $overrides = []): array
{
    return [
        'slug' => 'a-new-post',
        'title' => 'A new post',
        'summary' => 'What it is about.',
        'tags' => 'Caddy, TLS',
        'reading_minutes' => 4,
        'body' => "## Heading\n\nA paragraph.",
        'blocks' => '',
        'published' => '1',
        ...$overrides,
    ];
}

test('the editor is closed to guests', function (): void {
    $post = Post::factory()->create();

    $this->get(route('admin.posts.index'))->assertRedirect(route('login'));
    $this->get(route('admin.posts.create'))->assertRedirect(route('login'));
    $this->get(route('admin.posts.edit', $post))->assertRedirect(route('login'));
    $this->post(route('admin.posts.store'), postPayload())->assertRedirect(route('login'));
    $this->delete(route('admin.posts.destroy', $post))->assertRedirect(route('login'));

    expect(Post::query()->count())->toBe(1);
});

test('every editor screen renders its page component', function (): void {
    // A page component missing from the Vite manifest is a 500, which no
    // controller-level assertion would catch.
    $user = User::factory()->create();
    $post = Post::factory()->create();
    $item = Architecture::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.index'))
        ->assertOk()->assertInertia(fn ($page) => $page->component('admin/posts/index'));
    $this->actingAs($user)->get(route('admin.posts.create'))
        ->assertOk()->assertInertia(fn ($page) => $page->component('admin/posts/form')->where('post', null));
    $this->actingAs($user)->get(route('admin.posts.edit', $post))
        ->assertOk()->assertInertia(fn ($page) => $page->component('admin/posts/form')->where('post.slug', $post->slug));

    $this->actingAs($user)->get(route('admin.architectures.index'))
        ->assertOk()->assertInertia(fn ($page) => $page->component('admin/architectures/index'));
    $this->actingAs($user)->get(route('admin.architectures.create'))
        ->assertOk()->assertInertia(fn ($page) => $page->component('admin/architectures/form'));
    $this->actingAs($user)->get(route('admin.architectures.edit', $item))
        ->assertOk()->assertInertia(fn ($page) => $page->component('admin/architectures/form')
        ->where('architecture.slug', $item->slug));
});

test('the editor hands structured fields back as text the textareas can hold', function (): void {
    $item = Architecture::factory()->create([
        'stack' => [['label' => 'Laravel', 'icon' => 'laravel']],
        'blocks' => ['stack' => ['type' => 'specs', 'items' => [['label' => 'A', 'value' => 'B']]]],
    ]);

    $this->actingAs(User::factory()->create())
        ->get(route('admin.architectures.edit', $item))
        ->assertInertia(fn ($page) => $page
            ->where('architecture.stack', json_encode(
                [['label' => 'Laravel', 'icon' => 'laravel']],
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            ))
            ->where('architecture.links', '')
            ->etc());
});

test('an author can create a post', function (): void {
    $this->actingAs(User::factory()->create())
        ->post(route('admin.posts.store'), postPayload())
        ->assertRedirect(route('admin.posts.index'));

    $post = Post::query()->sole();

    expect($post->slug)->toBe('a-new-post')
        ->and($post->tags)->toBe(['Caddy', 'TLS'])
        ->and($post->isPublished())->toBeTrue()
        ->and($post->rendered[0]['html'])->toContain('<h2>Heading</h2>');
});

test('a post created unpublished is a draft', function (): void {
    $this->actingAs(User::factory()->create())
        ->post(route('admin.posts.store'), postPayload(['published' => '0']));

    expect(Post::query()->sole()->published_at)->toBeNull();
});

test('re-saving a published post does not move its publication date', function (): void {
    $user = User::factory()->create();
    $post = Post::factory()->create(['published_at' => now()->subMonth()]);
    $originalDate = $post->published_at;

    $this->actingAs($user)->put(
        route('admin.posts.update', $post),
        postPayload(['slug' => $post->slug, 'title' => 'Retitled']),
    )->assertRedirect(route('admin.posts.index'));

    expect($post->fresh()->published_at->toDateTimeString())
        ->toBe($originalDate->toDateTimeString())
        ->and($post->fresh()->title)->toBe('Retitled');
});

test('unpublishing clears the date so the post becomes a draft again', function (): void {
    $post = Post::factory()->create(['published_at' => now()->subMonth()]);

    $this->actingAs(User::factory()->create())->put(
        route('admin.posts.update', $post),
        postPayload(['slug' => $post->slug, 'published' => '0']),
    );

    expect($post->fresh()->published_at)->toBeNull();

    // The author keeps seeing their own draft, so the public 404 has to be
    // checked as a guest.
    auth()->logout();

    $this->get(route('posts.show', $post->slug))->assertNotFound();
});

test('a duplicate slug is rejected, but a post keeps its own', function (): void {
    $user = User::factory()->create();
    $taken = Post::factory()->create(['slug' => 'taken']);
    $post = Post::factory()->create(['slug' => 'mine']);

    $this->actingAs($user)
        ->put(route('admin.posts.update', $post), postPayload(['slug' => $taken->slug]))
        ->assertSessionHasErrors('slug');

    $this->actingAs($user)
        ->put(route('admin.posts.update', $post), postPayload(['slug' => 'mine']))
        ->assertSessionHasNoErrors();
});

test('a slug that could reach a path is rejected', function (): void {
    $this->actingAs(User::factory()->create())
        ->post(route('admin.posts.store'), postPayload(['slug' => '../settings/profile']))
        ->assertSessionHasErrors('slug');

    expect(Post::query()->count())->toBe(0);
});

test('malformed block json is a field error, not a 500', function (): void {
    $this->actingAs(User::factory()->create())
        ->post(route('admin.posts.store'), postPayload(['blocks' => '{ not json']))
        ->assertSessionHasErrors('blocks');
});

test('a diagram edge naming a node that does not exist is rejected', function (): void {
    // The renderer drops an unresolvable edge silently, so this is the only
    // place the mistake is visible.
    $blocks = json_encode(['d' => [
        'type' => 'diagram',
        'title' => 'A diagram',
        'description' => 'Described.',
        'width' => 560,
        'height' => 200,
        'nodes' => [['key' => 'a', 'x' => 0, 'y' => 0, 'w' => 10, 'h' => 10, 'label' => 'A']],
        'edges' => [['from' => 'a.bottom', 'to' => 'ghost.top']],
    ]]);

    $this->actingAs(User::factory()->create())
        ->post(route('admin.posts.store'), postPayload(['blocks' => $blocks]))
        ->assertSessionHasErrors('blocks');
});

test('an author can delete a post', function (): void {
    $post = Post::factory()->create();

    $this->actingAs(User::factory()->create())
        ->delete(route('admin.posts.destroy', $post))
        ->assertRedirect(route('admin.posts.index'));

    expect(Post::query()->count())->toBe(0);
});

test('the preview endpoint compiles through the same renderer as a save', function (): void {
    $this->actingAs(User::factory()->create())
        ->postJson(route('admin.content.preview'), [
            'body' => "Intro.\n\n::block{key=\"stack\"}",
            'blocks' => ['stack' => ['type' => 'specs', 'items' => [['label' => 'A', 'value' => 'B']]]],
        ])
        ->assertOk()
        ->assertJsonPath('rendered.1.type', 'block')
        ->assertJsonPath('rendered.1.key', 'stack');
});

test('the preview endpoint is closed to guests', function (): void {
    $this->postJson(route('admin.content.preview'), ['body' => 'Hi'])->assertUnauthorized();
});

test('an author can edit an architecture write-up', function (): void {
    $item = Architecture::factory()->create();

    $this->actingAs(User::factory()->create())->put(route('admin.architectures.update', $item), [
        'slug' => $item->slug,
        'title' => 'Renamed',
        'tagline' => 'A tagline.',
        'status' => 'Live',
        'active' => '1',
        'position' => 3,
        'stack' => '[{"label":"Laravel","icon":"laravel"}]',
        'links' => '',
        'body' => 'Body text.',
        'blocks' => '',
        'published' => '1',
    ])->assertRedirect(route('admin.architectures.index'));

    $item->refresh();

    expect($item->title)->toBe('Renamed')
        ->and($item->active)->toBeTrue()
        ->and($item->position)->toBe(3)
        ->and($item->stack)->toBe([['label' => 'Laravel', 'icon' => 'laravel']])
        ->and($item->links)->toBeNull();
});
