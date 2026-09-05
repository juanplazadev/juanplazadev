<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\AnalyticsRange;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DashboardRequest;
use App\Services\Cloudflare\CachedSiteAnalytics;
use Inertia\Inertia;
use Inertia\Response;

final class DashboardController extends Controller
{
    public function __construct(private readonly CachedSiteAnalytics $analytics) {}

    /**
     * The authenticated dashboard, with Cloudflare traffic for the chosen range.
     *
     * The analytics prop is deferred rather than resolved inline. Three reasons,
     * in order of how much they matter:
     *
     * 1. Cloudflare is a second network hop. Blocking the page on it would put
     *    a stranger's latency in front of every dashboard load.
     * 2. A deferred prop is fetched client-side only, so it never reaches the
     *    SSR pass - which is what keeps recharts, whose containers render blank
     *    without a DOM to measure, out of the server bundle's way.
     * 3. It degrades. SiteAnalytics catches its own failures and returns an
     *    error string, so an outage costs the panel, not the page.
     */
    public function index(DashboardRequest $request): Response
    {
        $range = $request->range();

        return Inertia::render('dashboard', [
            'range' => $range->value,
            'ranges' => array_map(
                static fn (AnalyticsRange $case): array => [
                    'value' => $case->value,
                    'label' => $case->label(),
                ],
                AnalyticsRange::cases(),
            ),
            'analytics' => Inertia::defer(fn (): array => $this->analytics->summary($range)),
        ]);
    }
}
