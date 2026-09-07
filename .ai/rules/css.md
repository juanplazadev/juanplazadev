---
paths:
  - 'resources/css/app.css,resources/css/additional-styles/**'
---

# CSS

## Tailwind source detection is pinned with source(none) - do not remove it
`@import 'tailwindcss' source(none)` plus explicit @source globs. Removing `source(none)` re-enables Tailwind v4's automatic content detection, which walks the project from the root and only skips what .gitignore names. storage/ is NOT gitignored, so auto-detection rescanned 4MB of logs, 228 compiled blade views and storage/inertia-devtools on every regeneration.

Cost, measured on this project: Tailwind regenerates on ANY source change, and that cost lands on the first request for resources/css/app.css afterwards. Auto-detection made that 3.6-5.4s; the explicit globs make it ~65ms (and a cold first request 0.25s). The production build halved too, 12.8s -> 6.5s, because @tailwindcss/vite:generate:build was 48% of it.

That 5s stall was also a test flake, not just a dev annoyance: the Pest browser plugin's default action timeout is 5000ms (Playwright/Client.php), and the first browser test in a run navigated while Tailwind was regenerating, so `composer test` failed on whichever test happened to be first. It passed on re-run because the CSS was then cached. If that flake ever comes back, time `curl -o /dev/null -w '%{time_total}' http://localhost:5180/resources/css/app.css` right after touching a .tsx file - that single number tells you whether Tailwind is the cause.

Narrowing removed exactly four rules from the output - .contents, .invisible, .italic, .lowercase - and all four were FALSE POSITIVES scanned out of PHP, not classes anything uses: `lowercase` is a Laravel validation rule in ArchitectureRequest/PostRequest/ValidBlocks, `invisible` is in Concerns/Publishable, and `italic` is the `font-style: italic` declaration in prose.css. Nothing in resources/js or resources/views contains any of the four. Everything else was byte-identical.

Consequence when adding sources: nothing outside resources/ writes class names today, and the globs assume it. If class strings ever move into app/ (a Blade component class, a PHP-side variant map), add an @source for it or those utilities silently will not be generated.
