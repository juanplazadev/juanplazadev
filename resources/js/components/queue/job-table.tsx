import { Layers } from 'lucide-react';

import PanelCard from '@/components/admin/panel-card';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/time';
import type { QueueJob } from '@/types/queue';

/**
 * What is on the queue right now, in the order the worker will read it.
 *
 * Oldest first, unlike every other table in the panel: this one answers "what
 * is holding the rest up", and the newest row is never that.
 */
export default function JobTable({
    jobs,
    limit,
    total,
}: {
    jobs: QueueJob[];
    limit: number;
    total: number;
}) {
    return (
        <PanelCard
            title="On the queue"
            icon={Layers}
            action={
                <span className="text-muted-foreground text-xs tabular-nums">
                    {total.toLocaleString()}
                </span>
            }
        >
            {jobs.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                    Nothing is waiting.
                </p>
            ) : (
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-sm">
                        <thead>
                            <tr className="text-muted-foreground border-border border-b text-left text-xs">
                                <th className="py-2 pr-4 font-medium">Job</th>
                                <th className="py-2 pr-4 font-medium">State</th>
                                <th className="py-2 pr-4 font-medium">
                                    Attempts
                                </th>
                                <th className="py-2 font-medium">Queued</th>
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {jobs.map((job) => (
                                <tr key={job.id}>
                                    <td className="text-foreground py-2.5 pr-4 font-mono text-xs">
                                        {job.name}
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        <Badge
                                            variant={
                                                job.stalled
                                                    ? 'destructive'
                                                    : 'secondary'
                                            }
                                        >
                                            {label(job)}
                                        </Badge>
                                    </td>
                                    <td className="text-muted-foreground py-2.5 pr-4 tabular-nums">
                                        {job.attempts}
                                    </td>
                                    <td className="text-muted-foreground py-2.5">
                                        {timeAgo(job.queuedAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {total > limit ? (
                <p className="text-muted-foreground mt-3 text-xs">
                    Showing the first {limit.toLocaleString()} of{' '}
                    {total.toLocaleString()}.
                </p>
            ) : null}
        </PanelCard>
    );
}

/**
 * A future `availableAt` is a job serving out its #[Backoff] window, which is
 * the queue working rather than failing - worth naming so it is not read as a
 * job nobody is picking up.
 */
function label(job: QueueJob): string {
    if (job.stalled) return job.reserved ? 'abandoned' : 'stuck';
    if (job.reserved) return 'running';
    if (new Date(job.availableAt).getTime() > Date.now()) return 'backing off';

    return 'waiting';
}
