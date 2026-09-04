<?php

declare(strict_types=1);

use App\Models\Architecture;
use App\Models\Post;
use App\Rules\ValidBlocks;
use App\Support\Content\BodyRenderer;
use Database\Seeders\ContentSeeder;
use Illuminate\Support\Collection;

/*
  Integrity checks over the content that actually ships, not over factory data.

  The seeder is the bootstrap for everything currently in the database, so a
  mistake in the markdown or the block JSON is a mistake on the live site. These
  run against the real rows.
*/

beforeEach(function (): void {
    $this->seed(ContentSeeder::class);
});

/**
 * @return Collection<int, Post|Architecture>
 */
function seededContent(): Collection
{
    return collect([...Post::all(), ...Architecture::all()]);
}

test('the seeder creates the content the site had before the database did', function (): void {
    expect(Post::query()->pluck('slug')->all())->toBe(['automatic-https-with-caddy'])
        ->and(Architecture::ordered()->pluck('slug')->all())
        ->toBe(['juanplaza-dev', 'check-in']);
});

test('every body compiles to something', function (): void {
    seededContent()->each(function ($row): void {
        expect($row->rendered)->not->toBeEmpty("[{$row->slug}] compiled to nothing");
    });
});

test('every block a body references exists', function (): void {
    // A directive with no block behind it is dropped silently at render time,
    // so nothing else would ever tell you the diagram is missing.
    seededContent()->each(function ($row): void {
        $referenced = resolve(BodyRenderer::class)->referencedKeys($row->body);
        $emitted = collect($row->rendered)->where('type', 'block')->pluck('key')->all();

        expect($emitted)->toBe($referenced, "[{$row->slug}] dropped a block reference");
    });
});

test('every stored block passes the rule that guards the editor', function (): void {
    seededContent()->each(function ($row): void {
        $errors = [];

        (new ValidBlocks)->validate('blocks', $row->blocks, function (string $message) use (&$errors): void {
            $errors[] = $message;
        });

        expect($errors)->toBeEmpty("[{$row->slug}] ".implode(' ', $errors));
    });
});

test('every icon named anywhere in the content is a real icon', function (): void {
    // A missing key renders no icon at all, silently, so this is the only thing
    // standing between a typo and a badge with a blank space in it.
    $icons = file_get_contents(resource_path('js/lib/icons.ts'));

    $named = seededContent()->flatMap(function ($row): array {
        $fromStack = collect($row->stack ?? [])->pluck('icon');

        $fromBlocks = collect($row->blocks ?? [])->flatMap(fn (array $block): array => match ($block['type']) {
            'specs' => collect($block['items'])->pluck('icon')->all(),
            'diagram' => collect($block['nodes'])->pluck('icon')->all(),
            default => [],
        });

        return $fromStack->merge($fromBlocks)->filter()->all();
    })->unique();

    expect($named)->not->toBeEmpty();

    foreach ($named as $icon) {
        // assertStringContainsString rather than toContain: the latter is
        // variadic, so a message passed to it reads as a second needle.
        $this->assertStringContainsString("{$icon}:", $icons, "[{$icon}] is not in the icon set");
    }
});

test('the seeder does not clobber content that has since been edited', function (): void {
    Post::query()->where('slug', 'automatic-https-with-caddy')->update(['title' => 'Edited in the admin UI']);

    $this->seed(ContentSeeder::class);

    expect(Post::query()->where('slug', 'automatic-https-with-caddy')->value('title'))
        ->toBe('Edited in the admin UI');
});
