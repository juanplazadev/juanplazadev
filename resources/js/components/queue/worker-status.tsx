import { Form } from '@inertiajs/react';
import { Activity } from 'lucide-react';

import PanelCard from '@/components/admin/panel-card';
import {
    stateAdvice,
    stateLabel,
    stateTone,
    toneDotClass,
} from '@/components/queue/queue-glyphs';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/time';
import QueueController from '@/actions/App/Http/Controllers/Admin/QueueController';
import type { QueueStatus } from '@/types/queue';

/**
 * The verdict, the reason for it, and the one thing you can do about it.
 *
 * The restart button is shown only while the worker is alive, and that is the
 * page's most important rule rather than a detail: queue:restart asks a RUNNING
 * worker to finish up and exit, so pressing it against a dead process does
 * nothing at all and says nothing about having done nothing. A button that
 * silently no-ops on the one screen you visit to diagnose a dead worker is
 * worse than no button, so `down` gets the sentence instead.
 */
export default function WorkerStatus({ status }: { status: QueueStatus }) {
    const { state, worker } = status;
    const tone = stateTone(state);

    return (
        <PanelCard
            title="Worker"
            icon={Activity}
            action={
                worker.alive ? (
                    <Form
                        {...QueueController.restart.form()}
                        options={{ preserveScroll: true }}
                        onBefore={() =>
                            confirm(
                                'Restart the queue workers? Each finishes the job it is running before exiting, and the supervising loop starts a new one straight after.',
                            )
                        }
                    >
                        {({ processing }) => (
                            <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                disabled={processing}
                            >
                                Restart workers
                            </Button>
                        )}
                    </Form>
                ) : null
            }
        >
            <p className="text-foreground font-display mt-2 flex items-center gap-2 text-3xl font-semibold">
                <span
                    aria-hidden
                    className={`size-2.5 shrink-0 rounded-full ${toneDotClass(tone)}`}
                />
                {stateLabel(state)}
            </p>

            <p className="text-muted-foreground mt-1 text-xs">
                {worker.lastSeenAt
                    ? `Last reported in ${timeAgo(worker.lastSeenAt)}`
                    : 'Has never reported in'}
            </p>

            <p className="text-muted-foreground mt-3 text-sm">
                {stateAdvice(status)}
            </p>
        </PanelCard>
    );
}
