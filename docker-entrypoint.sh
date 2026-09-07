#!/bin/bash
# Octane and the Inertia SSR node process share a container because
# config/inertia.php points SSR at 127.0.0.1:13714 - a loopback address, so the
# two cannot be split across services without changing that config.
#
# A queue worker runs alongside them for App\Jobs\SendResumeEmail; the queue is
# the `database` driver, so there is nothing else to deploy for it.
#
# No process is allowed to outlive the others. `wait -n` returns on the first
# exit, and we then take the whole container down so compose's
# `restart: unless-stopped` recreates it, rather than letting it limp along
# half-up: Octane serving pages with no SSR behind it looks healthy from the
# outside but silently stops server-rendering, and a dead worker leaves every
# résumé request sitting unsent in the jobs table.
set -uo pipefail

php artisan inertia:start-ssr &
ssr=$!

# The queue worker. Deliberately NOT a bare `queue:work` under the `wait -n`
# below: --max-time makes the worker exit ON PURPOSE once an hour to shed the
# memory a long-lived PHP process accumulates, and `wait -n` would read that
# planned exit as a failure and take the whole container down with it. The
# supervising loop keeps the memory hygiene without the false alarm; only the
# loop itself dying is a real failure, and that is what the container reacts to.
#
# The loop forwards SIGTERM to whichever queue:work it is currently running.
# Without that, stopping the container kills the loop and leaves the worker to
# be SIGKILLed after the grace period, mid-job - and a résumé email interrupted
# after Mailgun accepted it but before the row was stamped gets sent twice on
# the retry.
#
# Nothing else runs on this queue today; it exists for App\Jobs\SendResumeEmail.
# If a résumé is never delivered, check this process is alive before suspecting
# Mailgun.
(
    trap 'kill -TERM "$job" 2>/dev/null; exit 0' TERM
    while true; do
        php artisan queue:work --tries=3 --max-time=3600 --sleep=3 &
        job=$!
        wait "$job"
        sleep 1
    done
) &
worker=$!

# --caddyfile points at our copy of Octane's stub, which adds immutable
# Cache-Control for /build/assets. $(pwd) rather than a literal path so this
# does not depend on the image's WORKDIR.
php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8080 --admin-port=2019 \
    --caddyfile="$(pwd)/docker/Caddyfile" &
octane=$!

# Forward the SIGTERM compose sends on `up -d`/`down` so all three shut down
# cleanly instead of being killed after the grace period.
trap 'kill -TERM "$ssr" "$octane" "$worker" 2>/dev/null' TERM INT

wait -n
status=$?

kill -TERM "$ssr" "$octane" "$worker" 2>/dev/null
wait

exit "$status"
