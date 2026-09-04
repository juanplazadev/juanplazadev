<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Post;
use Illuminate\Support\Arr;

final class CreatePostAction
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handle(array $attributes): Post
    {
        $post = Post::query()->make(Arr::except($attributes, 'published'));

        $post->published_at = $post->publishedAtFor((bool) ($attributes['published'] ?? false));

        $post->save();

        return $post;
    }
}
