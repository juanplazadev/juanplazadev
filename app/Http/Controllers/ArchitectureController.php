<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Architecture;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class ArchitectureController extends Controller
{
    /**
     * List every write-up, in display order.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('architecture/index', [
            'architectures' => Architecture::query()
                ->visible($this->includeDrafts($request))
                ->ordered()
                ->get()
                ->map(fn (Architecture $item): array => $item->toSummaryArray()),
        ]);
    }

    /**
     * Show a single write-up. Same arrangement as PostController::show().
     */
    public function show(Request $request, string $slug): Response
    {
        $architecture = Architecture::query()
            ->visible($this->includeDrafts($request))
            ->where('slug', $slug)
            ->firstOrFail();

        return Inertia::render('architecture/item', [
            'architecture' => $architecture->toArray(),
        ]);
    }

    private function includeDrafts(Request $request): bool
    {
        return $request->user() !== null;
    }
}
