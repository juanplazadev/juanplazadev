<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Post;
use Illuminate\Support\Arr;

final class UpdatePostAction
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handle(Post $post, array $attributes): Post
    {
        $post->update([
            ...Arr::except($attributes, 'published'),
            'published_at' => $post->publishedAtFor((bool) ($attributes['published'] ?? false)),
        ]);

        return $post;
    }
}
