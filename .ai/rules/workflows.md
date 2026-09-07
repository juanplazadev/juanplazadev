---
paths:
  - '{Dockerfile,docker-entrypoint.sh,compose.prod.yaml,.dockerignore,.github/workflows/deploy.yml}'
---

# Workflows

## Production deploy: SSR shares the app container, never seed prod

Octane and the Inertia SSR process run in ONE container via docker-entrypoint.sh. This is forced: config/inertia.php hardcodes the SSR url to 127.0.0.1:13714, a loopback address, so a separate `ssr` service cannot be reached. The entrypoint uses `wait -n` so either process dying takes the container down and compose recreates it - otherwise Octane keeps serving with SSR silently dead. The Dockerfile HEALTHCHECK deliberately curls both :8080/up and :13714/health for the same reason.

Traps:

- `node_modules` must ship in the runtime image. The SSR bundle externalizes its bare imports (react, react-dom/server, @inertiajs/react, @radix-ui/*, lucide-react, sonner, class-variance-authority), all of which live in package.json `dependencies`, so `npm ci --omit=dev` keeps them.
- Never add `db:seed` to deploy.yml. DatabaseSeeder creates test@example.com / "password", and routes/admin.php guards the content editor with nothing but auth+verified. The first admin user is made by hand.
- Container name, port 8080 and the `proxy` network are load-bearing: the Caddyfile in the separate caddy project proxies juanplaza.dev to juanplaza:8080. Changing any of them means changing that too.
- The base image sets XDG_DATA_HOME=/data and XDG_CONFIG_HOME=/config as root-owned; they are chowned to www-data or Caddy logs storage errors on every boot.
- `optimize` is always followed by `octane:reload` - it writes the config/route cache after the workers already booted.

## The healthcheck's Host header is load-bearing

The Dockerfile HEALTHCHECK curls the app over loopback, so its Host header must be one `trustHosts` in bootstrap/app.php accepts - hence `-H 'Host: juanplaza.dev'`. Without it Symfony sees Host `127.0.0.1:8080`, throws SuspiciousOperationException, and `/up` answers 400: the container sits at `unhealthy` forever and deploy.yml's "Wait for healthy" prints "juanplaza never became healthy" while the app itself is serving fine (Caddy forwards the real Host). Change the trusted host list and you must change this line. Neither local nor CI catches the drift - TrustHosts is a no-op outside production - so tests/Feature/TrustedProxyTest.php pins it instead.

## The Sentry release is IMAGE_TAG in two places that must agree
deploy.yml's `Tag the Sentry release` step and compose.prod.yaml's SENTRY_RELEASE build arg both key off IMAGE_TAG. If they drift, Sentry shows a release with no events against it and the errors dashboard reports permanent drift.

SENTRY_RELEASE must NEVER appear in the production .env. compose's `env_file:` overrides an image ENV for every key the file names, so a blank SENTRY_RELEASE= there silently untags every event. It is baked as an ARG in the Dockerfile instead, defaulting to empty rather than `unknown` so a local build does not invent a release. .env.example documents this as a comment and deliberately does not list it as a key.

secrets.SENTRY_RELEASE_TOKEN is an ORGANIZATION auth token (org:ci) - the mirror of the USER token in .env (see sentry.md). Neither works for the other's job: the org one creates releases and cannot read issues.

set_commits is `skip`. The default `auto` needs both fetch-depth: 0 on the checkout and a Sentry<->GitHub integration on the org, and fails the step without the integration.

The step is last (after `Wait for healthy`) and continue-on-error: a release only exists for a deploy that served traffic, and a Sentry outage must not red a healthy deploy.

## No third-party Docker action may run after the GHCR login
`Log in to GHCR` leaves the repo-scoped GITHUB_TOKEN in the self-hosted runner's docker credential store, and docker sends it on EVERY later ghcr.io pull. GHCR answers `denied: denied` for a package outside this repo rather than falling back to an anonymous pull, so a *public* image still fails. This is what killed `getsentry/action-release@v3`, a Docker action: its image pulls fine anonymously - the login is what broke it. The credential also outlives the job on a runner shared with the check-in project.

`Tag the Sentry release` is therefore two curl calls against the Sentry Web API. If a Docker action is ever genuinely needed here, isolate the login with a job-local DOCKER_CONFIG rather than `docker logout`, which would yank the credential out from under a concurrent job.

The `/releases/{version}/deploys/` call is not decoration. `POST /releases/` alone leaves `lastDeploy` null, and ErrorInsights::environment() and ::deployedAt() read `lastDeploy.environment` and `lastDeploy.dateFinished` to decide the production badge and the timestamp on the deployments page. Re-tagging an existing release answers 208, which is why the step checks the status code instead of using `curl -f`.

## The queue worker is wrapped in a restart loop on purpose
docker-entrypoint.sh runs THREE processes: Octane, Inertia SSR, and a `queue:work` for App\Jobs\SendResumeEmail. The worker is not a bare background command under the shared `wait -n`, and must not become one: `--max-time=3600` makes it exit ON PURPOSE once an hour to shed accumulated memory, and `wait -n` would read that planned exit as a failure and recreate the whole container every hour.

The supervising subshell also traps TERM and forwards it to whichever `queue:work` is running. Without that, `docker compose down` kills the loop and leaves the worker to be SIGKILLed mid-job after the grace period - and a résumé email interrupted after Mailgun accepted it but before the row was stamped gets sent twice on the retry.

The queue is the `database` driver, so there is nothing else to deploy for it. If a résumé request is never delivered, check this process is alive before suspecting Mailgun: with no worker the job sits in the `jobs` table forever and nothing errors.
