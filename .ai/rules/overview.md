---
paths:
  - '{routes/admin.php,app/Queue/QueueControl.php,resources/js/components/queue/queue-glyphs.tsx,resources/js/components/overview/overview-header.tsx}'
---

# Overview

## Restart is hidden when the worker is down, and there is no retry-all
`queue:restart` signals a RUNNING worker to finish up and exit; the supervising loop in docker-entrypoint.sh starts a new one about a second later. It cannot revive a process that is already gone - there is nothing left to read the flag. So worker-status.tsx renders the button only while the heartbeat is live and shows stateAdvice() otherwise, pointing at the container. A button that silently no-ops on the one screen you visit to diagnose a dead worker is worse than no button. QueueController::restart deliberately does NOT re-check that; the rule lives in one place.

Retry is per-job and there is deliberately no "retry all". .ai/rules/mail.md documents that a send Mailgun accepted before the worker was interrupted has already gone out, so a retry can put a second copy in somebody's inbox - a fine trade one row at a time, a bad one for every row at once. The confirm text says so in words.

The three mutating routes are the panel's only ones that reach past the request and the only ones carrying a throttle. Each maps to one fixed Artisan command taking no argument but a route-bound uuid; going through Artisan also keeps the failed-job provider the sole owner of `failed_jobs`. Never add an endpoint that runs a command it is handed.

queue-glyphs.tsx is the shared vocabulary for the four states, the same job deployments/release-glyphs.tsx does for the build chip: the overview chip and the queue page must never word or colour the same verdict differently. Import from it rather than re-deriving from `state`.

The overview's `queue` prop is EAGER and must stay so - two counts and a cache read, same reasoning as `content`/`deliveries`. Making it a fourth deferred group fails 'each deferred group is announced under its own name'. The worker chip lives in OverviewHeader beside the build chip, not in the grid: the grid is six cells exactly and HealthStrip's docblock rejects a sixth tile.
