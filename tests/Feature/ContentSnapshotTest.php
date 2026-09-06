<?php

declare(strict_types=1);

use App\Content\ContentSnapshot;
use App\Models\Architecture;
use App\Models\Post;
use Carbon\CarbonImmutable;

function snapshot(): array
{
    return resolve(ContentSnapshot::class)->summary();
}

// Counts ---------------------------------------------------------------------

test('it counts published and draft content separately', function (): void {
    Post::factory()->count(3)->create();
    Post::factory()->draft()->count(2)->create();
    Architecture::factory()->create();
    Architecture::factory()->draft()->count(4)->create();

    $summary = snapshot();

    expect($summary['posts'])->toBe(['total' => 5, 'published' => 3, 'drafts' => 2])
        ->and($summary['architectures'])->toBe(['total' => 5, 'published' => 1, 'drafts' => 4]);
});

test('a post dated in the future counts as a draft', function (): void {
    Post::factory()->create(['published_at' => CarbonImmutable::now()->addWeek()]);

    // The same definition the public index uses. A scheduled post is not live,
    // so the panel must not report it as published.
    expect(snapshot()['posts'])
        ->toBe(['total' => 1, 'published' => 0, 'drafts' => 1]);
});

test('it counts only published architectures as live systems', function (): void {
    Architecture::factory()->create(['active' => true]);
    Architecture::factory()->create(['active' => false]);
    Architecture::factory()->draft()->create(['active' => true]);

    // A draft write-up describes a system nobody can read about yet, whatever
    // its flag says.
    expect(snapshot()['activeSystems'])->toBe(1);
});

test('an empty site reports zeroes rather than nulls', function (): void {
    $summary = snapshot();

    expect($summary['posts'])->toBe(['total' => 0, 'published' => 0, 'drafts' => 0])
        ->and($summary['activeSystems'])->toBe(0)
        ->and($summary['lastPublishedAt'])->toBeNull()
        ->and($summary['daysSinceLastPublish'])->toBeNull()
        ->and($summary['staleDrafts'])->toBe([]);
});

// Publishing cadence ---------------------------------------------------------

test('it reports whole days since the newest published post', function (): void {
    Post::factory()->create(['published_at' => CarbonImmutable::now()->subDays(30)]);
    Post::factory()->create(['published_at' => CarbonImmutable::now()->subDays(9)]);

    expect(snapshot()['daysSinceLastPublish'])->toBe(9);
});

test('a scheduled post does not reset the days since last publish', function (): void {
    Post::factory()->create(['published_at' => CarbonImmutable::now()->subDays(20)]);
    Post::factory()->create(['published_at' => CarbonImmutable::now()->addDays(3)]);

    // Publishing something for next week is not publishing something.
    expect(snapshot()['daysSinceLastPublish'])->toBe(20);
});

test('architectures do not count towards the publishing cadence', function (): void {
    Post::factory()->create(['published_at' => CarbonImmutable::now()->subDays(40)]);
    Architecture::factory()->create(['published_at' => CarbonImmutable::now()->subDay()]);

    // Living documents, not a cadence anyone is trying to keep.
    expect(snapshot()['daysSinceLastPublish'])->toBe(40);
});

// Stale drafts ---------------------------------------------------------------

test('it names drafts untouched for a fortnight', function (): void {
    $stale = Post::factory()->draft()->create(['title' => 'Zero Trust']);
    $stale->forceFill(['updated_at' => CarbonImmutable::now()->subDays(20)])->saveQuietly();

    $fresh = Post::factory()->draft()->create(['title' => 'Still Writing']);
    $fresh->forceFill(['updated_at' => CarbonImmutable::now()->subDays(2)])->saveQuietly();

    $drafts = snapshot()['staleDrafts'];

    expect($drafts)->toHaveCount(1)
        ->and($drafts[0]['title'])->toBe('Zero Trust')
        ->and($drafts[0]['type'])->toBe('post')
        ->and($drafts[0]['slug'])->toBe($stale->slug);
});

test('a published post is never stale however long since it was touched', function (): void {
    $post = Post::factory()->create();
    $post->forceFill(['updated_at' => CarbonImmutable::now()->subYear()])->saveQuietly();

    expect(snapshot()['staleDrafts'])->toBe([]);
});

test('stale drafts from both content types are merged newest first', function (): void {
    $older = Post::factory()->draft()->create(['title' => 'Older Post']);
    $older->forceFill(['updated_at' => CarbonImmutable::now()->subDays(40)])->saveQuietly();

    $newer = Architecture::factory()->draft()->create(['title' => 'Newer System']);
    $newer->forceFill(['updated_at' => CarbonImmutable::now()->subDays(15)])->saveQuietly();

    $drafts = snapshot()['staleDrafts'];

    expect($drafts)->toHaveCount(2)
        ->and($drafts[0]['title'])->toBe('Newer System')
        ->and($drafts[0]['type'])->toBe('architecture')
        ->and($drafts[1]['title'])->toBe('Older Post');
});

test('it caps the stale draft list rather than listing every one', function (): void {
    foreach (range(1, 8) as $index) {
        $draft = Post::factory()->draft()->create(['title' => "Draft {$index}"]);
        $draft->forceFill([
            'updated_at' => CarbonImmutable::now()->subDays(20 + $index),
        ])->saveQuietly();
    }

    // The overview names what needs doing; it is not the drafts index.
    expect(snapshot()['staleDrafts'])->toHaveCount(5);
});
