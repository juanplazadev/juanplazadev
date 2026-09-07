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
