<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\AnalyticsRange;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ErrorsRequest;
use App\Services\Sentry\CachedErrorInsights;
use Inertia\Inertia;
use Inertia\Response;

final class ErrorsController extends Controller
{
    public function __construct(private readonly CachedErrorInsights $insights) {}

    /**
     * Unresolved issues, event volume and quota burn for the chosen range.
     *
     * The insights prop is deferred for the same three reasons the traffic page
     * defers its analytics, and one more that is specific to Sentry:
     *
     * 1. Sentry is a second network hop, and this page makes two calls to it.
     * 2. A deferred prop is fetched client-side only, so it never reaches the
     *    SSR pass - which keeps recharts, whose containers render blank without
     *    a DOM to measure, out of the server bundle's way.
     * 3. It degrades. ErrorInsights catches its own failures and returns an
     *    error string, so an outage costs the panel, not the page.
     * 4. Sentry rate-limits per caller identity. Deferring means a throttled
     *    window slows a panel rather than every admin page load.
     *
     * Releases are not here. They live on /dashboard/deployments, which asks
     * ErrorInsights for them directly - they answer a different question and,
     * unlike everything on this page, they do not vary with the range.
     */
    public function index(ErrorsRequest $request): Response
    {
        $range = $request->range();

        return Inertia::render('admin/errors', [
            'range' => $range->value,
            'ranges' => array_map(
                static fn (AnalyticsRange $case): array => [
                    'value' => $case->value,
                    'label' => $case->label(),
                ],
                AnalyticsRange::cases(),
            ),
            'insights' => Inertia::defer(fn (): array => $this->insights->summary($range)),
        ]);
    }
}
