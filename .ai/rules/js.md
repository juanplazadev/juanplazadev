---
paths:
  - '{vite.config.ts,tsconfig.json,resources/images/**,config/inertia.php,resources/js/app.tsx}'
---

# Js

## Path aliases must be declared in vite.config.ts, not just tsconfig
`laravel-vite-plugin` defines exactly one alias, `"@" -> /resources/js`. Vite's **dev** resolver does not read tsconfig `paths`; the Rolldown **build** resolver does.

So a tsconfig-only alias passes `tsc --noEmit`, passes `npm run build`, and then fails at `npm run dev` with `Failed to resolve import`. Declare every alias in `vite.config.ts` under `resolve.alias` - that is the one place all three resolvers agree. `@images -> /resources/images` exists for this reason.

Verifying a build is not verifying dev. Check both.

## Dev runs in Docker; public/hot is not stale
`compose.yaml` runs the app on :8080 with the Vite dev server on :5180, so `public/hot` contains `http://localhost:5180` and is written by the container. Do not delete it to "fix" something - the running dev server owns it.

This matters when debugging SSR. `Inertia\Ssr\HttpGateway::dispatch()` calls `Vite::isRunningHot()` first: when `public/hot` exists it posts to the dev server's `/__inertia_ssr` instead of `127.0.0.1:13714/render`, and swallows any connection error, falling back to client rendering. So a dev server that has crashed - on a bad import, say - shows up as an empty `<div id="app"></div>` with nothing in any log. Fix the dev server; do not remove the hot file.
