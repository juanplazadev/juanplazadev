<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Sentry\CachedErrorInsights;
use Inertia\Inertia;
use Inertia\Response;

final class DeploymentsController extends Controller
{
    public function __construct(private readonly CachedErrorInsights $insights) {}

    /**
     * What has shipped, and whether this container is running it.
     *
     * No range, and so no range picker. Sentry's /releases/ endpoint takes no
     * statsPeriod, so the answer is identical whichever window the rest of the
     * panel happens to be showing; offering a control that changed nothing
     * would be worse than offering none. That asymmetry with its sibling pages
     * is deliberate and recorded in .ai/rules/sentry.md.
     *
     * The deployments prop is deferred for the reasons its siblings are - a
     * second network hop, and a source that rate-limits per caller identity -
     * and it degrades the same way: ErrorInsights::deployments() catches its own
     * failures and returns an error string, so an outage costs the list rather
     * than the page.
     */
    public function index(): Response
    {
        return Inertia::render('admin/deployments', [
            // Eager for the same reason the overview sends it eagerly: it is
            // config, and a cached copy would report stale drift for fifteen
            // minutes after every deploy. It is also the page's headline, so it
            // has to be there before the deferred half lands.
            'running' => config('sentry.release'),

            'deployments' => Inertia::defer(fn (): array => $this->insights->deployments()),
        ]);
    }
}
