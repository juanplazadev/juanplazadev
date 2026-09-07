import { Deferred, Head } from '@inertiajs/react';

import EmptyCard from '@/components/admin/empty-card';
import PanelHeader from '@/components/admin/panel-header';
import DeploymentsSkeleton from '@/components/deployments/deployments-skeleton';
import ReleaseStats from '@/components/deployments/release-stats';
import ReleaseTable from '@/components/deployments/release-table';
import RunningBuild from '@/components/deployments/running-build';
import AppLayout from '@/layouts/app-layout';
import { dashboard, deployments as deploymentsRoute } from '@/routes/admin';
import type { Deployments } from '@/types/deployments';

export default function DeploymentsPage({
    running,
    deployments,
}: {
    /** Eager: config, not an answer from Sentry, and the page's headline. */
    running: string | null;
    deployments?: Deployments;
}) {
    return (
        <>
            <Head title="Deployments" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                {/* No range picker, unlike every sibling page. Sentry's release
                    list takes no statsPeriod, so a window control here would
                    change nothing - see .ai/rules/sentry.md. */}
                <PanelHeader
                    title="Deployments"
                    subtitle="Sentry releases · newest first"
                />

                <Deferred data="deployments" fallback={<DeploymentsSkeleton />}>
                    {deployments ? (
                        deployments.error ? (
                            <EmptyCard message={deployments.error} />
                        ) : (
                            <>
                                <RunningBuild
                                    running={running}
                                    releases={deployments.releases}
                                />
                                {/* Below the verdict, not above it: the verdict
                                    is what the page is for, and the tiles are
                                    the summary of the table they sit on. */}
                                <ReleaseStats releases={deployments.releases} />
                                <ReleaseTable
                                    releases={deployments.releases}
                                    running={running}
                                />
                            </>
                        )
                    ) : null}
                </Deferred>
            </div>
        </>
    );
}

DeploymentsPage.layout = [
    AppLayout,
    {
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Deployments', href: deploymentsRoute() },
        ],
    },
];
