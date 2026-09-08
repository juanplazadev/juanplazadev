---
paths:
  - '{docker/Caddyfile,docker-entrypoint.sh,Dockerfile,compose.yaml}'
---

# Docker

## docker/Caddyfile is a copy of Octane's stub - keep it in step
`docker/Caddyfile` is vendor/laravel/octane/src/Commands/stubs/Caddyfile with ONE added block: an `@immutable path /build/assets/*` matcher setting `Cache-Control: public, max-age=31536000, immutable`. docker-entrypoint.sh passes it with `--caddyfile="$(pwd)/docker/Caddyfile"`.

It is a copy rather than an injection because the stub's only hook, `{$CADDY_SERVER_EXTRA_DIRECTIVES}`, is overwritten by StartFrankenPhpCommand with the Mercure config. Octane passes `--caddyfile` straight to frankenphp with no processing (see configPath()), so every `{$...}` placeholder must survive verbatim - Caddy fills them from the env vars Octane sets.

After any `composer update laravel/octane`, diff and reapply:
  diff vendor/laravel/octane/src/Commands/stubs/Caddyfile docker/Caddyfile

Scope matters: `/build/assets/*` only. `build/manifest.json` sits one level up and is NOT content-hashed, so it must keep revalidating.

The file must be `caddy fmt` clean or every boot logs "Caddyfile input is not formatted". Check it inside the image with `frankenphp fmt docker/Caddyfile | diff - docker/Caddyfile`.

Verify a change by building and running, not by reading - a bad Caddyfile means the container never becomes healthy:
  docker build --target prod -t x . && docker run -d --name x -p 8099:8080 -e APP_KEY=... x
  curl -sI -H 'Host: juanplaza.dev' http://127.0.0.1:8099/build/assets/<file>

Also: `expose_php=Off` lives in zz-app.ini, NOT the opcache ini. There is no `opcache.expose_php`; PHP ignores that spelling silently and X-Powered-By stays.

## compose.yaml does not run Vite - restarting the app container blanks dev SSR
`compose.yaml` starts only Octane (with `--watch`), pgsql and mailpit. The Vite dev server is started by hand inside the app container (`npm run dev` / `vp dev`), and it owns `public/hot`.

So `docker compose restart juanplazadev` kills it. In dev the @inertiajs/vite plugin serves SSR from that dev server, so the next request returns an empty `<div id="app"></div>` and a `curl | grep` for page copy finds nothing. That looks exactly like a rendering bug in whatever you just changed. It is not.

Recover with `docker compose exec -d juanplazadev npm run dev` and wait for :5180 to answer. Never delete `public/hot` (see browser.md).

You rarely need the restart anyway: Octane runs with `--watch` and picks up an edited `.env` in about 8 seconds, which is enough to verify a config-flag change end to end.

## Run container commands as `sail`, or you salt the caches with root-owned files
`docker exec juanplazadev-juanplazadev-1 <cmd>` runs as ROOT. `sail <cmd>` runs as uid 501 (`sail`). Mixing them poisons every cache that lives inside the container: rector writes `/tmp/rector`, phpstan writes `/tmp/phpstan` and `/tmp/phpstan-tests`, and a file root created there cannot be replaced by the sail user afterwards.

The symptom is not a permissions message from the tool you ran. It is rector dying mid-run with

    Unable to delete '/tmp/rector/5e/70/<hash>.php'. Permission denied

and then printing its own `--help` usage, which reads like a bad argument rather than a filesystem problem. phpstan degrades more quietly - it just cannot write its result cache.

Always pass `-u sail` when reaching in with `docker exec`:

    docker exec -u sail juanplazadev-juanplazadev-1 composer test

To recover after it has already happened:

    docker exec juanplazadev-juanplazadev-1 chown -R sail:sail /tmp/rector /tmp/phpstan /tmp/phpstan-tests

Project files under the bind mount are NOT affected - `find /var/www/html -user root` matches almost everything on macOS because of how Docker Desktop presents the host mount, so that result is a red herring, not evidence of damage.

## compose.yaml runs no queue worker either
Same shape as the Vite note above: `SUPERVISOR_PHP_COMMAND` starts Octane and nothing else, so a queued job in local development sits in the `jobs` table forever. Production is different - docker-entrypoint.sh runs a supervised `queue:work` (see .ai/rules/workflows.md).

The failure is silent and looks like a bug in the feature: the résumé dialog answers 201 and shows its success panel, no mail arrives, and nothing is logged. Check `php artisan queue:monitor default` before suspecting Mailgun or Mailpit.

Drain by hand with `sail artisan queue:work --stop-when-empty`, or keep a worker up with `sail artisan queue:listen --tries=1`. Use `listen`, not `work`, in development: `queue:work` caches the job classes at boot and keeps running the old code after an edit, which Octane's `--watch` does not cover.

## node_modules is the container's own volume, never the bind mount
`compose.yaml` mounts `.:/var/www/html` and then masks `node_modules` with the named volume `sail-node-modules`. Both halves are load-bearing and the mask must not be removed.

One shared `node_modules` cannot serve both sides. npm installs native bindings only for the platform it is running on, and ten packages here ship per-platform binaries: rolldown, oxlint, oxfmt, oxlint-tsgolint, lightningcss, tailwindcss/oxide, rollup, yuku-parser, yuku-codegen and vite-plus. Whichever side installed last was the only one that could build; the other died on `Error: Cannot find native binding` naming only the first of the ten, which reads like one missing package rather than a whole set. The host and the container also run different Node majors, so sharing the directory was never supported regardless of platform.

So each side installs for itself: `npm ci` on the host, `sail npm ci` in the container. Neither prunes the other any more.

Two traps when the volume is created fresh (a first `up`, or after `docker compose down -v`):

- Docker creates the mount point root-owned, so `sail npm ci` cannot write to it. `docker compose exec -u root juanplazadev chown sail:sail node_modules` once, then install as `sail` - the same reason every other container command runs as `sail`.
- The volume starts empty, which kills the Vite dev server along with it. Recreating this container therefore costs an `npm ci` AND the `npm run dev` restart the Vite note above already describes.

Browser tests read assets through `public/hot` when the dev server is up, so the first run against a freshly started Vite can exceed Playwright's 5s timeout and fail on text that is genuinely there. Re-run before believing it - a cold dev server is not a rendering bug.
