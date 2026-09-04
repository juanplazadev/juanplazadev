#!/bin/bash
# Octane and the Inertia SSR node process share a container because
# config/inertia.php points SSR at 127.0.0.1:13714 - a loopback address, so the
# two cannot be split across services without changing that config.
#
# Neither process is allowed to outlive the other. `wait -n` returns on the
# first exit, and we then take the whole container down so compose's
# `restart: unless-stopped` recreates it, rather than letting it limp along
# half-up: Octane serving pages with no SSR behind it looks healthy from the
# outside but silently stops server-rendering.
set -uo pipefail

php artisan inertia:start-ssr &
ssr=$!

php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8080 --admin-port=2019 &
octane=$!

# Forward the SIGTERM compose sends on `up -d`/`down` so both shut down cleanly
# instead of being killed after the grace period.
trap 'kill -TERM "$ssr" "$octane" 2>/dev/null' TERM INT

wait -n
status=$?

kill -TERM "$ssr" "$octane" 2>/dev/null
wait

exit "$status"
