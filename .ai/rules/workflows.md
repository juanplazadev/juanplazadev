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
