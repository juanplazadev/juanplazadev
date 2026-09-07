---
paths:
  - '{resources/js/components/admin/**,resources/js/components/analytics/**,resources/js/components/errors/**,resources/js/components/overview/**,resources/js/components/deployments/**}'
---

# Components Admin

## Panel chrome lives in components/admin; the overview reaches recharts only through a lazy boundary
`components/admin/` holds the primitives the panel pages share: `panel-card` (the one `border-border bg-card rounded-xl border p-4` shell), `stat-tile`, `empty-card`, `panel-header`, `range-picker`, `sparkline`, `format.ts`. Six components hand-rolled that shell before there were four pages to keep in step - add to `admin/` rather than re-rolling it. `ui/card.tsx` stays unused here on purpose: it brings a header/footer structure these panels never wanted.

`sparkline` is hand-rolled SVG, not recharts, and that is still load-bearing: ten of them sit in the errors issue list, where ten ResponsiveContainers plus resize observers would draw what is, at that size, a polyline. It is also the overview's Suspense fallback - the same week, drawn coarsely from data already in hand, while the real chart is fetched. `format.ts` holds `formatDay` because the same UTC-parsed day formatter had been copied verbatim into both chart files.

The overview DOES chart, but never in its own chunk. `components/overview/traffic-area-chart.tsx` is the only file on that path importing recharts, and the only thing reaching it is the `lazy(() => import(...))` in `traffic-card.tsx`. The number that makes the boundary worth its complexity: the recharts chunk is **~343KB**, which /dashboard/analytics and /dashboard/errors import statically and which the admin root must not put on its critical path. Measured after the split, the dashboard page chunk is 18KB and the chart chunk that reaches recharts is 2KB, with `dynamicImports` naming the chart and `imports` free of recharts. Do not grep for that chunk by name - Rolldown names it after whichever module it merged with (`format-*.js` today, `AreaChart-*.js` before), which is exactly why the two checks below assert on the manifest and on `dashboard-*.js` instead.

That boundary is only safe because the chart sits inside the deferred `traffic` prop. `<Deferred>` returns its fallback whenever the prop is absent, and deferred props are absent from the SSR response, so the chart subtree is never created on the server and the lazy factory never runs there - there is no suspension for SSR to resolve and nothing for hydration to disagree about. **A recharts chart on this page goes inside a deferred card, never on `content`, `deliveries` or `running`.** A Suspense fallback here must also stay deterministic - no `Date`, no random, no `typeof window` - because React emits a suspended boundary's fallback into the SSR HTML rather than waiting for it.

Verify with two checks, both confirmed against real output:

```
npm run build:ssr
grep -l 'from "recharts"' bootstrap/ssr/assets/*.js
```

lists exactly three files - the analytics page, the errors page, and the overview's async chart chunk. What it must NEVER list is `dashboard-*.js`; a match there means someone imported recharts statically and the boundary is gone.

```
npm run build
node -p "const d=require('./public/build/manifest.json')['resources/js/pages/dashboard.tsx']; JSON.stringify({imports:d.imports,dyn:d.dynamicImports})"
```

`dynamicImports` must name `traffic-area-chart.tsx` and `imports` must not contain the recharts chunk.

One chunking subtlety, tested rather than assumed: Rolldown currently merges `format.ts` INTO the recharts chunk, because today the same three entries reach both. That is not a trap waiting to spring - adding an eager overview import of `format.ts` was measured to split it back out into its own 320-byte chunk, leaving recharts behind the dynamic import. The reachability sets differ, so the chunker self-corrects. Do not "fix" it by duplicating the helper.

Chart and meter colours come from the `--chart-1`..`--chart-5` tokens, never hex - they already follow the active accent scale and both appearances. Those five are steps of ONE accent ramp, not five hues, and the order inverts in dark mode, so they encode magnitude well and identity badly: prefer single-series charts here, and give a genuinely categorical split a text label rather than leaning on colour. Gradient `id`s are global in the DOM, so each chart owns a distinct one: `analytics-visits`, `errors-accepted`, `overview-visits`. The overview's quota bar duplicates `QuotaMeter`'s 0.75/0.9 thresholds deliberately; keep them in step so the two never disagree at a glance.

## Overview cards carry the sidebar's icon; stat tiles stay bare
`PanelCard` takes an optional `icon?: LucideIcon`, rendered inside the `<h3>` before the title as an inline `size-3.5` glyph inheriting the heading's `text-muted-foreground`. `SectionCard` requires one and forwards it.

The icon is whatever `app-sidebar.tsx` uses for the section the card links to, so a card and its nav entry read as the same thing: ChartLine/Traffic, TriangleAlert/Errors, PenLine/Posts, MailCheck/Deliveries. "Needs attention" has no nav twin and uses ListChecks. Change one side and change the other. Four of the five are already in the shared chunk via `app-layout`, so this costs one new icon's bytes.

Always `aria-hidden`, because the title beside it already names the card - the glyph is a second way to recognise a card you can already read, never the only way. `tests/Browser/DashboardTest.php` holds both halves of that: `assertPresent('@panel-icon')` for the glyph, and the neighbouring `assertSee('Traffic')` / `assertSee('Errors')` lines passing unchanged for the accessible name. Do NOT reach for `assertAttribute('@panel-icon', ...)` - it calls `getAttribute()` on the locator, and with five icons on the page Playwright strict mode throws on the multi-match; `assertPresent` is safe only because it goes through `count()`. Give one card its own `data-test` if a specific attribute ever needs asserting.

`StatTile` stays bare on purpose - its docblock rejects added ornament, and the health-strip tiles restate the subjects of the cards directly beneath them, so an icon there is the same idea drawn twice. Admin chrome takes icons from `lucide-react` named imports, never `@/lib/icons` (that is vendored Iconify path data for the public site's diagrams, raw `d` attributes meant to nest inside another `<svg>`). Never import an icon into `traffic-area-chart.tsx`; it sits behind the lazy recharts boundary.

## Brand marks lucide lacks go in a scoped module, never @/lib/icons
Admin chrome is still lucide-first. The exception is a brand mark lucide does not carry - at the pinned 0.475 there is Chrome and Apple, but no Firefox, Edge or Opera, so a browser list drawn from lucide alone is one logo and three generic globes.

Those go in a SCOPED module (resources/js/lib/browser-icons.ts), not in @/lib/icons. The reason is measurable, not stylistic: lib/icons.ts is 25KB of path data in one object literal, which does not tree-shake per key, so importing it would put all 27 diagram icons on the admin analytics chunk to draw five glyphs. Verified after the split - the diagram set stays on the public site's icon-*.js and the browser marks sit on analytics-*.js.

Vendor from mdi, not simple-icons, when both have the mark: simple-icons draws Safari's compass in 11,102 characters against mdi's 410, and the two sets read as different weights side by side. Same constraints either way - 24x24, one filled path, currentColor.

A breakdown card's heading icon has NO sidebar twin to match. That rule is about overview cards that link to a section; these five link nowhere.
