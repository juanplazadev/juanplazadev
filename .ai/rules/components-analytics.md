---
paths:
  - '{config/inertia.php,phpunit.xml,package.json,resources/js/components/analytics/**}'
---

# Components Analytics

## SSR must be off in tests, and chart deps must ship in dependencies
`config/inertia.php` reads `env('INERTIA_SSR_ENABLED', true)`. It used to hardcode `true`, which made phpunit.xml's override inert: every feature test rendering an Inertia page dispatched a real SSR HTTP request. HttpGateway swallows the connection error, so nothing failed - it just cost ~500ms a run AND landed in any `Http::fake()` recording the test asserted against. `Http::assertNothingSent()` is therefore unsafe in a feature test that renders a page; filter the recorder by URL instead (see `cloudflareCalls()` in tests/Feature/DashboardAnalyticsTest.php).

Other testing notes for Inertia here: `assertInertia()` only reads the root-view response, so a partial reload (X-Inertia-Partial-Data) has to be asserted with `assertJsonPath('props.…')`. A partial reload also needs a matching `X-Inertia-Version` or Inertia answers 409 - `Inertia::getVersion()` is empty outside a request, so ask the middleware: `app(HandleInertiaRequests::class)->version(request())`.

recharts belongs in package.json `dependencies`, not devDependencies. The SSR bundle externalizes bare imports and the runtime image installs with `npm ci --omit=dev`, so a devDependency builds fine locally and crashes the SSR process in production. Verify with `grep -l 'from "recharts"' bootstrap/ssr/assets/*.js` after `npm run build:ssr`: the analytics chunk, the errors chunk and the overview's async chart chunk must all appear. The older form of this check pointed at `dashboard-*.js`, left over from when the traffic panel lived at the admin root; it matched nothing and passed silently for months. `dashboard-*.js` matching is now the FAILURE case - see .ai/rules/components-admin.md for why the overview reaches recharts only through a lazy boundary.

Chart colours come from the existing `--chart-1`..`--chart-5` tokens in app.css, which are already bound to the active accent scale and already swap for dark mode. CSS variables work in SVG presentation attributes here (the diagram components rely on it), so `stroke="var(--chart-1)"` is enough - never hardcode hex.
