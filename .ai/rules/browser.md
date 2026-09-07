---
paths:
  - 'tests/Browser/**'
---

# Browser

## Browser tests run in-process, and assertSee never waits
The Pest browser plugin's LaravelHttpServer serves requests in the SAME PHP process as the test, calling $kernel->handle() behind an Amp socket. So in-memory SQLite, RefreshDatabase, actingAs(), Http::fake() and Notification::fake() all work exactly as in a feature test - do not switch to a file-based DB "because a browser can't see :memory:". It can.

Consequence: /dashboard defers an analytics prop that calls Cloudflare, and the credentials in .env are real (phpunit.xml does not blank them). Every browser test that reaches an authenticated page MUST Http::fake('api.cloudflare.com/*') or it makes a live credentialed API call.

assertSee() does NOT auto-wait - it iterates $locator->all() once (MakesElementAssertions.php:45), and visit() only waits for `load`, not networkidle. Anything async needs ->waitForEvent('networkidle') first: the weather pill, the deferred analytics prop, an Inertia client-side visit. waitForText() is deprecated and just forwards to assertSee, so it does not help.

Datasets cannot query the database - they resolve at collection time, before RefreshDatabase builds a schema. To cover "every post", seed and loop over the model collection inside the test.

Factories set `body` but not `rendered` (compileBody() is a saving event). An admin edit form loads empty unless you call ->compileBody()->save() after the factory.

Assert on a page's own description, not its title: the admin sidebar carries "Posts" and "Architecture" on every page, so a title assertion passes no matter which page loaded.

Assets: with public/hot present the tests run against the Vite dev server on :5180 (needs the Docker dev stack up); without it they need a current `npm run build`. Both paths verified. Never delete public/hot to "fix" a blank page - the running dev server owns it.

Selector `@name` resolves to [data-testid=name], [data-test=name]. This project uses data-test.

## Every browser test failing at once means a wedged Vite dev server, not the tests
Symptom: all of `sail composer test:feature-browser` fails with "Expected to see text [...] but it was not found", the screenshots are a blank page in the app's background colour, and `assertNoJavaScriptErrors()` / `assertNoConsoleLogs()` both pass.

Cause: with public/hot present the tests load modules from the running `vp dev` server. If node_modules changed under it (an `npm install` while it was running), its optimizer cache goes stale and it answers `504 Outdated Optimize Dep` for deps whose URLs it still emits - e.g. `/node_modules/.vite/deps/sonner.js?v=<hash>`. A failing `<script type=module>` fires an error event on the element, which does NOT reach a non-capturing window listener, so the plugin's InitScript records nothing: no console logs, no JS errors, `#app` simply stays empty.

Fix: restart the dev server (`sail npm run dev`). Never delete public/hot.

To diagnose, ask the server for the hash it is handing out and then request a dep at that hash:
`curl -s http://localhost:5180/resources/js/app.tsx | grep -o '?v=[a-z0-9]*'`
A 504 at a hash the server itself emits is the tell. To surface a swallowed resource error from inside a test, register a capture-phase listener (`addEventListener('error', h, true)`); the non-capture one misses it.

## A bare tag name is not an explicit selector - it times out as a text search
`Selector::isExplicit()` only treats a string as CSS if it starts with `#`, `.`, `[`, `internal:` or contains a CSS special char (`[ ] # > + ~ : * | ^ , = ( )`) or a `.class` pattern. A bare `html`, `header` or `nav` fails all of those, so GuessLocator falls through to `[id=]`, `[name=]` and finally `getByText()` - which never matches and dies on the 5000ms timeout with a screenshot instead of a useful error.

To assert on `<html>` (the `.dark` class the whole token layer keys on), write `html.dark` or `html:not(.dark)`, never `html`. Same for `attribute('html', 'class')`.

Appearance assertions must also not pin a fixed value: nothing is persisted until a theme is picked, so the starting state is the browser's `prefers-color-scheme`. Read `aria-pressed` off `@theme-toggle` first and assert the flip relative to that - see 'switches the panel theme from the page header' in DashboardTest.
