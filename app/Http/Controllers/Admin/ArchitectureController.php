<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\CreateArchitectureAction;
use App\Actions\DeleteArchitectureAction;
use App\Actions\UpdateArchitectureAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ArchitectureRequest;
use App\Models\Architecture;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class ArchitectureController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/architectures/index', [
            'architectures' => Architecture::ordered()->get()->map(fn (Architecture $item): array => [
                'slug' => $item->slug,
                'title' => $item->title,
                'position' => $item->position,
                'isPublished' => $item->isPublished(),
                'updatedAt' => $item->updated_at?->diffForHumans(),
            ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/architectures/form', ['architecture' => null]);
    }

    public function store(ArchitectureRequest $request, CreateArchitectureAction $action): RedirectResponse
    {
        $action->handle($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Write-up created.')]);

        return to_route('admin.architectures.index');
    }

    public function edit(Architecture $architecture): Response
    {
        return Inertia::render('admin/architectures/form', [
            'architecture' => $this->toForm($architecture),
        ]);
    }

    public function update(ArchitectureRequest $request, Architecture $architecture, UpdateArchitectureAction $action): RedirectResponse
    {
        $action->handle($architecture, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Write-up updated.')]);

        return to_route('admin.architectures.index');
    }

    public function destroy(Architecture $architecture, DeleteArchitectureAction $action): RedirectResponse
    {
        $action->handle($architecture);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Write-up deleted.')]);

        return to_route('admin.architectures.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function toForm(Architecture $architecture): array
    {
        $json = fn (?array $value): string => $value === null
            ? ''
            : (string) json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return [
            'slug' => $architecture->slug,
            'title' => $architecture->title,
            'tagline' => $architecture->tagline,
            'status' => $architecture->status,
            'active' => $architecture->active,
            'position' => $architecture->position,
            'stack' => $json($architecture->stack),
            'links' => $json($architecture->links),
            'body' => $architecture->body,
            'blocks' => $json($architecture->blocks),
            'published' => $architecture->isPublished(),
        ];
    }
}
