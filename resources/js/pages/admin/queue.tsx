import { Head } from '@inertiajs/react';

import PanelHeader from '@/components/admin/panel-header';
import StatTile from '@/components/admin/stat-tile';
import FailedTable from '@/components/queue/failed-table';
import JobTable from '@/components/queue/job-table';
import WorkerStatus from '@/components/queue/worker-status';
import AppLayout from '@/layouts/app-layout';
import { timeAgo } from '@/lib/time';
import { dashboard, queue as queueRoute } from '@/routes/admin';
import type { QueueSummary } from '@/types/queue';

/**
 * The one long-running process the container cannot healthcheck.
 *
 * No <Deferred> and no skeleton, like the deliveries page and unlike the vendor
 * pages: two local tables and one cache read, with nothing here that can
 * throttle or fail - see QueueController for why that asymmetry is deliberate.
 *
 * The worker card leads rather than the tiles. An empty `jobs` table is the
 * normal state on this site, so the depth numbers are the least informative
 * thing on the page and the liveness reading is the most.
 */
export default function Queue({ queue }: { queue: QueueSummary }) {
    const { status, jobs, failed, limit } = queue;
    const { totals } = status;

    return (
        <>
            <Head title="Queue" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <PanelHeader
                    title="Queue"
                    subtitle="The database queue behind the résumé emails."
                />

                <WorkerStatus status={status} />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile
                        label="Waiting"
                        value={totals.pending.toLocaleString()}
                        hint={
                            status.oldestPendingAt
                                ? `Oldest queued ${timeAgo(status.oldestPendingAt)}`
                                : 'Nothing waiting'
                        }
                    />
                    <StatTile
                        label="Running"
                        value={totals.reserved.toLocaleString()}
                        hint="Reserved by a worker"
                    />
                    <StatTile
                        label="Stuck"
                        value={totals.stalled.toLocaleString()}
                        hint={`Past ${status.retryAfter}s reserved, or long overdue`}
                    />
                    <StatTile
                        label="Failed"
                        value={totals.failed.toLocaleString()}
                        hint="Out of tries"
                    />
                </div>

                <JobTable
                    jobs={jobs}
                    limit={limit}
                    total={totals.pending + totals.reserved}
                />

                <FailedTable
                    failed={failed}
                    limit={limit}
                    total={totals.failed}
                />
            </div>
        </>
    );
}

Queue.layout = [
    AppLayout,
    {
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Queue', href: queueRoute() },
        ],
    },
];
