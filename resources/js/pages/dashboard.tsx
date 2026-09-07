import { Deferred, Head, usePage } from '@inertiajs/react';

import AttentionList from '@/components/overview/attention-list';
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
 * recharts reaches this page, but only through the lazy boundary inside
 * TrafficCard, so it lands in its own async chunk rather than the admin root's
 * entry. That is safe here specifically because the chart sits inside the
 * deferred `traffic` prop and therefore never renders during SSR; see
 * .ai/rules/components-admin.md before charting anything eager.
 *
 * One grid of three columns, not two. The traffic chart earns the double width
 * and "Needs attention" sits beside it, which fills six cells exactly - the old
 * two-column grid held five cards and left Build alone on the last row.
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

                <div className="grid gap-4 lg:grid-cols-3">
                    <Deferred
                        data="traffic"
                        fallback={
                            <CardSkeleton
                                label="Loading traffic…"
                                className="h-[300px] lg:col-span-2"
                            />
                        }
                    >
                        {traffic ? (
                            <div className="lg:col-span-2">
                                <TrafficCard traffic={traffic} />
                            </div>
                        ) : null}
                    </Deferred>

                    <AttentionList
                        content={content}
                        deliveries={deliveries}
                        running={running}
                        health={health}
                        deploys={deploys}
                    />

                    <Deferred
                        data="health"
                        fallback={<CardSkeleton label="Loading errors…" />}
                    >
                        {health ? <HealthCard health={health} /> : null}
                    </Deferred>

                    <ContentCard content={content} />

                    <DeliveriesCard deliveries={deliveries} />
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
