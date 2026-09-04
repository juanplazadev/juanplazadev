<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\CreatePostAction;
use App\Actions\DeletePostAction;
use App\Actions\UpdatePostAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PostRequest;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class PostController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/posts/index', [
            'posts' => Post::newestFirst()->get()->map(fn (Post $post): array => [
                'slug' => $post->slug,
                'title' => $post->title,
                'isPublished' => $post->isPublished(),
                'updatedAt' => $post->updated_at?->diffForHumans(),
            ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/posts/form', ['post' => null]);
    }

    public function store(PostRequest $request, CreatePostAction $action): RedirectResponse
    {
        $action->handle($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Post created.')]);

        return to_route('admin.posts.index');
    }

    public function edit(Post $post): Response
    {
        return Inertia::render('admin/posts/form', [
            'post' => $this->toForm($post),
        ]);
    }

    public function update(PostRequest $request, Post $post, UpdatePostAction $action): RedirectResponse
    {
        $action->handle($post, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Post updated.')]);

        return to_route('admin.posts.index');
    }

    public function destroy(Post $post, DeletePostAction $action): RedirectResponse
    {
        $action->handle($post);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Post deleted.')]);

        return to_route('admin.posts.index');
    }

    /**
     * The structured fields go to the editor as formatted JSON, which is what
     * the textareas hand back.
     *
     * @return array<string, mixed>
     */
    private function toForm(Post $post): array
    {
        return [
            'slug' => $post->slug,
            'title' => $post->title,
            'summary' => $post->summary,
            'tags' => implode(', ', $post->tags),
            'reading_minutes' => $post->reading_minutes,
            'body' => $post->body,
            'blocks' => $post->blocks === null
                ? ''
                : (string) json_encode($post->blocks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'published' => $post->isPublished(),
        ];
    }
}
