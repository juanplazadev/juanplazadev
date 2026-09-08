---
paths:
  - '{app/Queue/**,app/Models/{QueuedJob,FailedJob}.php,app/Http/Controllers/Admin/QueueController.php,resources/js/components/queue/**,resources/js/pages/admin/queue.tsx}'
---

# Pages Admin

## The heartbeat is the queue panel, not the jobs table
`jobs` is empty almost all the time - one job type, a few résumé requests a month - so queue depth cannot tell a healthy idle queue from a dead worker, and the dead worker is the state that is otherwise completely silent (the résumé dialog still answers 201). App\Queue\WorkerHeartbeat is what separates them: a listener on Illuminate\Queue\Events\Looping stamps a cache key every PING_EVERY=15s, believed for STALE_AFTER=60s. Looping, not JobProcessed - it fires on idle loops too, and a JobProcessed heartbeat proves nothing on a quiet week.

Never infer `down` from an empty table, and never let a count outrank the heartbeat: QueueSnapshot::state() returns `down` ahead of everything, because with no worker a queue of zero and a queue of fifty are the same situation.

WorkerHeartbeat is a singleton in AppServiceProvider - the one deliberate exception to the scoped() rule there. Its throttle lives in an instance property, and a per-dispatch instance would restart the throttle every loop and write to the cache table every 3s. Safe because Looping only ever fires inside `queue:work`, never in an Octane request.

QueuedJob casts its three time columns to 'integer', NOT a datetime cast. They are unsigned unix integers, and a datetime cast applies on write too - it turns an integer handed to a factory into a 'Y-m-d H:i:s' string bound into an integer column. Use availableAt()/queuedAt() for Carbon. The `stalled` rule is written twice on purpose (SQL scope for the total, isStalled() for the row flag); 'a stalled job is reported by both the total and its own row' pins that they agree.

Stalled is judged on `available_at`, never `created_at`: SendResumeEmail carries #[Backoff([30,120])], so a job inside its backoff window is deliberately not available yet and measuring from creation reports every ordinary retry as a stuck queue.

QueuedJobFactory::payload() must keep a genuinely unserializable `data.command` - `queue:retry` unserializes it looking for retryUntil(), so a stub payload passes every snapshot test and then blows up the one action that matters.
