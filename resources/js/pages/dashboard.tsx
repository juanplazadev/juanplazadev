import { Deferred, Head, usePage } from '@inertiajs/react';

import AttentionList from '@/components/overview/attention-list';
import BuildCard from '@/components/overview/build-card';
import CardSkeleton from '@/components/overview/card-skeleton';
import ContentCard from '@/components/overview/content-card';
import DeliveriesCard from '@/components/overview/deliveries-card';
import HealthCard from '@/components/overview/health-card';
import HealthStrip from '@/components/overview/health-strip';
import OverviewHeader from '@/components/overview/overview-header';
import TrafficCard from '@/components/overview/traffic-card';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes/admin';
import type { Analytics } from '@/types/analytics';
import type { DeliveryOverview } from '@/types/deliveries';
import type { Deployments } from '@/types/deployments';
import type { ErrorInsights } from '@/types/errors';
import type { ContentSnapshot } from '@/types/overview';

type OverviewProps = {
    /** Two table scans, resolved with the page. Never absent. */
    content: ContentSnapshot;
    /** Local aggregates, resolved with the page for the same reason. */
    deliveries: DeliveryOverview;
    /** config('sentry.release'). Eager so it can never be a stale cached copy. */
    running: string | null;
    traffic?: Analytics;
    health?: ErrorInsights;
    deploys?: Deployments;
};

/**
 * The admin root: everything worth knowing, in one screen.
 *
 * Three deferred groups, each with its own fallback rather than one wrapper
 * around the lot. Grouped deferred props are fetched in parallel, so this is
 * what makes a throttled Sentry cost the error card alone - the traffic card
 * beside it resolves on its own request and paints when it is ready.
 *
 * No chart library on this page by design. The traffic card draws its week with
 * the shared SVG sparkline, so the admin root never pulls in recharts; the two
 * pages that need real axes pay for it and nothing else does.
 */
export default function Overview({
    content,
    deliveries,
    running,
    traffic,
    health,
    deploys,
}: OverviewProps) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Overview" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <OverviewHeader
                    name={firstName(auth.user.name)}
                    running={running}
                    deploys={deploys}
                />

                <HealthStrip
                    content={content}
                    deliveries={deliveries}
                    traffic={traffic}
                    health={health}
                />

                <AttentionList
                    content={content}
                    deliveries={deliveries}
                    running={running}
                    health={health}
                    deploys={deploys}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                    <Deferred
                        data="traffic"
                        fallback={<CardSkeleton label="Loading traffic…" />}
                    >
                        {traffic ? <TrafficCard traffic={traffic} /> : null}
                    </Deferred>

                    <Deferred
                        data="health"
                        fallback={<CardSkeleton label="Loading errors…" />}
                    >
                        {health ? <HealthCard health={health} /> : null}
                    </Deferred>

                    <ContentCard content={content} />

                    <DeliveriesCard deliveries={deliveries} />

                    <Deferred
                        data="deploys"
                        fallback={<CardSkeleton label="Loading deploys…" />}
                    >
                        {deploys ? (
                            <BuildCard running={running} deploys={deploys} />
                        ) : null}
                    </Deferred>
                </div>
            </div>
        </>
    );
}

/** "Juan Plaza" -> "Juan". A greeting uses the name you answer to. */
function firstName(name: string): string {
    return name.trim().split(/\s+/)[0] ?? name;
}

Overview.layout = [
    AppLayout,
    {
        breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
    },
];
