<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class PostController extends Controller
{
    /**
     * List every published post, newest first.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('blog/index', [
            'posts' => Post::query()
                ->visible($this->includeDrafts($request))
                ->newestFirst()
                ->get()
                ->map(fn (Post $post): array => $post->toSummaryArray()),
        ]);
    }

    /**
     * Show a single post.
     *
     * The body is compiled markdown from the database, so unlike the previous
     * arrangement the slug never reaches a component path - it only ever
     * reaches a where clause. The route's slug pattern is a second guard.
     */
    public function show(Request $request, string $slug): Response
    {
        $post = Post::query()
            ->visible($this->includeDrafts($request))
            ->where('slug', $slug)
            ->firstOrFail();

        return Inertia::render('blog/post', [
            'post' => $post->toArray(),
        ]);
    }

    /**
     * The author sees drafts at their real URLs, so a post can be proofed in
     * place before it is published. A guest gets a 404 for one, which is what
     * keeps unfinished writing out of the index and away from a crawler.
     */
    private function includeDrafts(Request $request): bool
    {
        return $request->user() !== null;
    }
}
