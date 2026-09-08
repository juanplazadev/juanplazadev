<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Content\ContentSnapshot;
use App\Enums\AnalyticsRange;
use App\Http\Controllers\Controller;
use App\Mail\ResumeDeliverySnapshot;
use App\Queue\QueueSnapshot;
use App\Services\Cloudflare\CachedSiteAnalytics;
use App\Services\Sentry\CachedErrorInsights;
use Inertia\Inertia;
use Inertia\Response;

final class DashboardController extends Controller
{
    public function __construct(
        private readonly CachedSiteAnalytics $analytics,
        private readonly CachedErrorInsights $insights,
        private readonly ContentSnapshot $content,
        private readonly ResumeDeliverySnapshot $deliveries,
        private readonly QueueSnapshot $queue,
    ) {}

    /**
     * The admin root: one condensed reading from every source the panel has.
     *
     * This page owns no data of its own. Every number on it is a summary the
     * section pages already fetch, asked for at AnalyticsRange::default() - and
     * that default is the point, not a shortcut. Both caches key on the range,
     * so asking at the default lands on the exact entries /dashboard/analytics
     * and /dashboard/errors use when you arrive at them with no ?range=.
     * Visiting the overview warms the sections and the sections warm the
     * overview; the panel as a whole spends no more on vendor calls than it did
     * when the root was a single page.
     *
     * Three deferred groups rather than one. Grouped deferred props are fetched
     * in parallel requests, so the slow or throttled source delays its own card
     * and nothing else. That matters most for Sentry, which rate-limits on
     * caller identity: without the split, one 429 would blank the traffic card
     * it has nothing to do with.
     */
    public function index(): Response
    {
        $range = AnalyticsRange::default();

        return Inertia::render('dashboard', [
            // Two small table scans. No network, so no reason to defer it - the
            // content card and the drafts tile paint with the first response.
            'content' => $this->content->summary(),

            // Local aggregates for the same reason, and deliberately NOT a
            // fourth deferred group: a group costs a parallel HTTP request,
            // which is the wrong trade for six counts against one table.
            'deliveries' => $this->deliveries->overview($range),

            // Counts against the two queue tables plus one cache read, so it
            // is eager for the same reason `deliveries` is - and deliberately
            // NOT a fourth deferred group, which would cost a parallel HTTP
            // request and break the group count the overview test pins.
            //
            // ::status(), not ::summary(): the overview states the verdict and
            // the queue page lists the rows behind it.
            'queue' => $this->queue->status(),

            // The build this container is running. Eager, and deliberately not
            // read from any cached summary: the caches hold for fifteen minutes
            // and a deploy does not clear them, so a cached `running` would
            // report drift that had already been fixed for a quarter of an hour
            // after every release. This is config, not an answer from Sentry.
            'running' => config('sentry.release'),

            'traffic' => Inertia::defer(fn (): array => $this->analytics->summary($range), 'traffic'),
            'health' => Inertia::defer(fn (): array => $this->insights->summary($range), 'health'),
            'deploys' => Inertia::defer(fn (): array => $this->insights->deployments(), 'deploys'),
        ]);
    }
}
