<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Publishable;
use App\Concerns\RendersMarkdownBody;
use Carbon\CarbonImmutable;
use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A writing entry.
 *
 * @property int $id
 * @property string $slug
 * @property string $title
 * @property string $summary
 * @property list<string> $tags
 * @property int $reading_minutes
 * @property string $body
 * @property array<string, mixed>|null $blocks
 * @property list<array<string, mixed>>|null $rendered
 * @property CarbonImmutable|null $published_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
// The slug is the public identifier everywhere; the numeric id stays internal.
#[RouteKey('slug')]
#[Fillable([
    'slug', 'title', 'summary', 'tags', 'reading_minutes',
    'body', 'blocks', 'published_at',
])]
#[Hidden(['id'])]
final class Post extends Model
{
    /** @use HasFactory<PostFactory> */
    use HasFactory;

    use Publishable;
    use RendersMarkdownBody;

    /**
     * The date as shown to a reader.
     *
     * Formatted server-side so the string in the server-rendered HTML is the
     * same one the client hydrates with, rather than depending on the browser's
     * locale.
     */
    public function formattedDate(): string
    {
        return $this->published_at?->format('F j, Y') ?? 'Draft';
    }

    /**
     * What the index and the card need. No body.
     *
     * @return array{
     *     slug: string,
     *     title: string,
     *     date: string|null,
     *     formattedDate: string,
     *     summary: string,
     *     tags: list<string>,
     *     readingMinutes: int,
     *     isPublished: bool,
     * }
     */
    public function toSummaryArray(): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'date' => $this->published_at?->toDateString(),
            'formattedDate' => $this->formattedDate(),
            'summary' => $this->summary,
            'tags' => $this->tags,
            'readingMinutes' => $this->reading_minutes,
            'isPublished' => $this->isPublished(),
        ];
    }

    /**
     * The summary plus the compiled body, for the show page.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [...$this->toSummaryArray(), 'rendered' => $this->rendered ?? []];
    }

    /**
     * Newest first.
     *
     * @param  Builder<covariant static>  $query
     */
    #[Scope]
    protected function newestFirst(Builder $query): void
    {
        $query->latest('published_at')->orderByDesc('id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'blocks' => 'array',
            'rendered' => 'array',
            'reading_minutes' => 'integer',
            'published_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
