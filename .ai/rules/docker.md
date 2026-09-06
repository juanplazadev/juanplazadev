---
paths:
  - '{docker/Caddyfile,docker-entrypoint.sh,Dockerfile}'
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
