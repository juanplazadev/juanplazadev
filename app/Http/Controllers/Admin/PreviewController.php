<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Rules\ValidBlocks;
use App\Support\Content\BodyRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Compiles an unsaved body so the editor can show what it will look like.
 *
 * Deliberately the same BodyRenderer the models use on save, so the preview
 * cannot drift from the page - a preview rendered by a second implementation
 * would only be trustworthy until the two disagreed.
 */
final class PreviewController extends Controller
{
    public function __invoke(Request $request, BodyRenderer $renderer): JsonResponse
    {
        $validated = $request->validate([
            'body' => ['nullable', 'string'],
            'blocks' => ['nullable', 'array', new ValidBlocks],
        ]);

        return response()->json([
            'rendered' => $renderer->render($validated['body'] ?? '', $validated['blocks'] ?? null),
        ]);
    }
}
