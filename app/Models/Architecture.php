<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Publishable;
use App\Concerns\RendersMarkdownBody;
use Carbon\CarbonImmutable;
use Database\Factories\ArchitectureFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A system write-up.
 *
 * @property int $id
 * @property string $slug
 * @property string $title
 * @property string $tagline
 * @property string $status
 * @property bool $active
 * @property int $position
 * @property list<array{label: string, icon?: string}> $stack
 * @property list<array{label: string, href: string}>|null $links
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
    'slug', 'title', 'tagline', 'status', 'active', 'position',
    'stack', 'links', 'body', 'blocks', 'published_at',
])]
#[Hidden(['id'])]
final class Architecture extends Model
{
    /** @use HasFactory<ArchitectureFactory> */
    use HasFactory;

    use Publishable;
    use RendersMarkdownBody;

    /**
     * @return array{
     *     slug: string,
     *     title: string,
     *     tagline: string,
     *     status: string,
     *     active: bool,
     *     stack: list<array{label: string, icon?: string}>,
     *     links: list<array{label: string, href: string}>|null,
     *     isPublished: bool,
     * }
     */
    public function toSummaryArray(): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'tagline' => $this->tagline,
            'status' => $this->status,
            'active' => $this->active,
            'stack' => $this->stack,
            'links' => $this->links,
            'isPublished' => $this->isPublished(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [...$this->toSummaryArray(), 'rendered' => $this->rendered ?? []];
    }

    /**
     * Display order.
     *
     * These are living documents rather than dated posts, so there is no date
     * to sort on and `position` carries the ordering instead.
     *
     * @param  Builder<covariant static>  $query
     */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('position')->orderBy('id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'position' => 'integer',
            'stack' => 'array',
            'links' => 'array',
            'blocks' => 'array',
            'rendered' => 'array',
            'published_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
