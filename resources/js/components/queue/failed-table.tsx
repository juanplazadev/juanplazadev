import { Form } from '@inertiajs/react';
import { CircleX } from 'lucide-react';

import PanelCard from '@/components/admin/panel-card';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/time';
import QueueController from '@/actions/App/Http/Controllers/Admin/QueueController';
import type { QueueFailedJob } from '@/types/queue';

/**
 * Jobs that ran out of tries, newest first.
 *
 * Retry is per-row and there is deliberately no "retry all". A résumé send that
 * Mailgun accepted before the worker was interrupted has already gone out, so a
 * retry can put a second copy in somebody's inbox - a fine trade to make one
 * row at a time while looking at it, and a bad one to make for every row at
 * once. The confirm text says so rather than leaving it to be discovered.
 */
export default function FailedTable({
    failed,
    limit,
    total,
}: {
    failed: QueueFailedJob[];
    limit: number;
    total: number;
}) {
    return (
        <PanelCard
            title="Failed"
            icon={CircleX}
            action={
                <span className="text-muted-foreground text-xs tabular-nums">
                    {total.toLocaleString()}
                </span>
            }
        >
            {failed.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                    Nothing has failed.
                </p>
            ) : (
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[42rem] text-sm">
                        <thead>
                            <tr className="text-muted-foreground border-border border-b text-left text-xs">
                                <th className="py-2 pr-4 font-medium">Job</th>
                                <th className="py-2 pr-4 font-medium">Why</th>
                                <th className="py-2 pr-4 font-medium">
                                    Failed
                                </th>
                                <th className="py-2 text-right font-medium">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {failed.map((job) => (
                                <tr key={job.uuid}>
                                    <td className="text-foreground py-2.5 pr-4 font-mono text-xs">
                                        {job.name}
                                    </td>
                                    <td className="text-muted-foreground max-w-md py-2.5 pr-4">
                                        <span className="line-clamp-2">
                                            {job.reason}
                                        </span>
                                    </td>
                                    <td className="text-muted-foreground py-2.5 pr-4 whitespace-nowrap">
                                        {timeAgo(job.failedAt)}
                                    </td>
                                    <td className="py-2.5 text-right whitespace-nowrap">
                                        <Form
                                            {...QueueController.retry.form(
                                                job.uuid,
                                            )}
                                            options={{ preserveScroll: true }}
                                            className="inline"
                                            onBefore={() =>
                                                confirm(
                                                    `Retry ${job.name}? If the provider already accepted this message before the worker was interrupted, retrying sends a second copy.`,
                                                )
                                            }
                                        >
                                            {({ processing }) => (
                                                <Button
                                                    type="submit"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={processing}
                                                >
                                                    Retry
                                                </Button>
                                            )}
                                        </Form>

                                        <Form
                                            {...QueueController.forget.form(
                                                job.uuid,
                                            )}
                                            options={{ preserveScroll: true }}
                                            className="inline"
                                            onBefore={() =>
                                                confirm(
                                                    `Discard ${job.name}? Nothing is re-queued and this cannot be undone.`,
                                                )
                                            }
                                        >
                                            {({ processing }) => (
                                                <Button
                                                    type="submit"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={processing}
                                                >
                                                    Discard
                                                </Button>
                                            )}
                                        </Form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {total > limit ? (
                <p className="text-muted-foreground mt-3 text-xs">
                    Showing the newest {limit.toLocaleString()} of{' '}
                    {total.toLocaleString()}.
                </p>
            ) : null}
        </PanelCard>
    );
}
