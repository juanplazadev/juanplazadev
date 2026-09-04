<?php

declare(strict_types=1);

namespace App\Concerns;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;

/**
 * Draft/published state for the content models.
 *
 * A null `published_at` is a draft, and so is a date still in the future.
 * Drafts are invisible to guests, which is what keeps unfinished writing out of
 * the index and out of a crawler's reach without anyone having to remember not
 * to commit it.
 */
trait Publishable
{
    public function isPublished(): bool
    {
        return $this->published_at !== null && $this->published_at->isPast();
    }

    /**
     * The `published_at` a save should store for the given publish flag.
     *
     * Publishing stamps the moment it happened; re-saving something that is
     * already live must not move its date. A model that has never been saved
     * has no date yet, so this answers a create correctly too.
     */
    public function publishedAtFor(bool $published): ?CarbonImmutable
    {
        return match (true) {
            ! $published => null,
            $this->published_at !== null => $this->published_at,
            default => CarbonImmutable::now(),
        };
    }

    /**
     * @param  Builder<static>  $query
     */
    #[Scope]
    protected function published(Builder $query): void
    {
        $this->constrainToPublished($query);
    }

    /**
     * Visible to this viewer.
     *
     * An authenticated user is the author, so they see drafts at their real
     * URLs and can proof one before publishing it.
     *
     * @param  Builder<static>  $query
     */
    #[Scope]
    protected function visible(Builder $query, bool $includeDrafts = false): void
    {
        if (! $includeDrafts) {
            $this->constrainToPublished($query);
        }
    }

    /**
     * Applied directly rather than by calling the published() scope, so the two
     * entry points cannot drift and static analysis can follow both.
     *
     * @param  Builder<static>  $query
     */
    private function constrainToPublished(Builder $query): void
    {
        $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }
}
