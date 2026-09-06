<?php

declare(strict_types=1);

namespace App\Content;

use App\Models\Architecture;
use App\Models\Post;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * What the portfolio itself is doing, as opposed to what visitors are doing to
 * it.
 *
 * The overview's third source, and the only one that is not a vendor. Cloudflare
 * answers how many people came and Sentry answers what broke; neither can tell
 * you that a draft has been sitting untouched for three weeks. That question is
 * a table scan of two small tables, so unlike its siblings this has no cache, no
 * deferred prop and no failure mode - it is resolved inline with the page.
 *
 * @phpstan-type ContentCounts array{total: int, published: int, drafts: int}
 * @phpstan-type StaleDraft array{type: string, slug: string, title: string, updatedAt: string}
 * @phpstan-type ContentSnapshotSummary array{
 *     posts: ContentCounts,
 *     architectures: ContentCounts,
 *     activeSystems: int,
 *     lastPublishedAt: string|null,
 *     daysSinceLastPublish: int|null,
 *     staleDrafts: list<StaleDraft>,
 * }
 */
final readonly class ContentSnapshot
{
    /**
     * How long a draft may sit untouched before the overview mentions it.
     *
     * Two weeks is long enough that a piece being actively worked on never
     * nags, and short enough to catch the one that was genuinely abandoned.
     */
    private const int STALE_AFTER_DAYS = 14;

    /**
     * How many stale drafts the overview names before it stops listing them.
     */
    private const int STALE_LIMIT = 5;

    /**
     * @return ContentSnapshotSummary
     */
    public function summary(): array
    {
        $lastPublishedAt = $this->lastPublishedAt();

        // Carbon 3 returns a float from diffInDays; the overview wants whole
        // days, and always a positive count of them.
        $daysSince = $lastPublishedAt instanceof CarbonImmutable
            ? (int) $lastPublishedAt->diffInDays(CarbonImmutable::now(), absolute: true)
            : null;

        return [
            'posts' => $this->counts(Post::query()),
            'architectures' => $this->counts(Architecture::query()),
            'activeSystems' => Architecture::query()->published()->where('active', true)->count(),
            'lastPublishedAt' => $lastPublishedAt?->toIso8601String(),
            'daysSinceLastPublish' => $daysSince,
            'staleDrafts' => $this->staleDrafts(),
        ];
    }

    /**
     * Published against the whole table.
     *
     * Both halves go through the Publishable scopes rather than a hand-written
     * `whereNotNull`, so a change to what "published" means reaches the admin
     * counts and the public index in the same commit.
     *
     * @param  Builder<Post>|Builder<Architecture>  $query
     * @return ContentCounts
     */
    private function counts(Builder $query): array
    {
        $total = (clone $query)->count();
        $published = (clone $query)->published()->count();

        return [
            'total' => $total,
            'published' => $published,
            'drafts' => $total - $published,
        ];
    }

    /**
     * The most recent publish date across posts.
     *
     * Architectures are excluded on purpose: they are living documents whose
     * `published_at` marks when the write-up first went up, not a publishing
     * cadence anyone is trying to keep.
     */
    private function lastPublishedAt(): ?CarbonImmutable
    {
        $published = Post::query()->published()->max('published_at');

        return $published === null ? null : CarbonImmutable::parse($published);
    }

    /**
     * Drafts that have not been touched in a fortnight, most recent first.
     *
     * Ordered by `updated_at` rather than `created_at`: the question is how long
     * since you last worked on it, not how long since you started it.
     *
     * @return list<StaleDraft>
     */
    private function staleDrafts(): array
    {
        $cutoff = CarbonImmutable::now()->subDays(self::STALE_AFTER_DAYS);

        $drafts = [];

        foreach (['post' => Post::query(), 'architecture' => Architecture::query()] as $type => $query) {
            $rows = $query->drafts()
                ->where('updated_at', '<', $cutoff)
                ->latest('updated_at')
                ->limit(self::STALE_LIMIT)
                ->get(['slug', 'title', 'updated_at']);

            foreach ($rows as $row) {
                $drafts[] = [
                    'type' => $type,
                    'slug' => $row->slug,
                    'title' => $row->title,
                    'updatedAt' => $row->updated_at?->toIso8601String() ?? '',
                ];
            }
        }

        usort($drafts, static fn (array $a, array $b): int => $b['updatedAt'] <=> $a['updatedAt']);

        return array_slice($drafts, 0, self::STALE_LIMIT);
    }
}
