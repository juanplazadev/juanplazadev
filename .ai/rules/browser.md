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
