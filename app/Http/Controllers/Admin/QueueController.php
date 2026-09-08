<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FailedJob;
use App\Queue\QueueControl;
use App\Queue\QueueSnapshot;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class QueueController extends Controller
{
    public function __construct(
        private readonly QueueSnapshot $snapshot,
        private readonly QueueControl $control,
    ) {}

    /**
     * The one process the container cannot healthcheck.
     *
     * Eager, not deferred, for the same reason the deliveries page resolves
     * inline: two counts and two capped selects against local tables plus one
     * cache read, so a deferred prop would buy a second round trip and a
     * skeleton for data already in hand. Deferring is what the vendor pages do
     * because Cloudflare and Sentry can be slow, throttled or down; nothing
     * here can be any of those.
     */
    public function index(): Response
    {
        return Inertia::render('admin/queue', [
            'queue' => $this->snapshot->summary(),
        ]);
    }

    /**
     * Cycle the workers.
     *
     * Not guarded here against a dead worker on purpose: the page hides the
     * button when the heartbeat is stale, and a second check would be a second
     * place to keep that rule. Pressing it with nothing running is harmless -
     * the flag sits in the cache and the next worker to boot reads it as
     * already satisfied.
     */
    public function restart(): RedirectResponse
    {
        $this->control->restart();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Workers will finish the job in hand and restart.'),
        ]);

        return to_route('admin.queue');
    }

    public function retry(FailedJob $failedJob): RedirectResponse
    {
        $this->control->retry($failedJob);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Job pushed back onto the queue.'),
        ]);

        return to_route('admin.queue');
    }

    public function forget(FailedJob $failedJob): RedirectResponse
    {
        $this->control->forget($failedJob);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Failed job discarded.'),
        ]);

        return to_route('admin.queue');
    }
}
