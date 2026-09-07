---
paths:
  - '{resources/js/components/admin/**,resources/js/components/analytics/**,resources/js/components/errors/**,resources/js/components/overview/**,resources/js/components/deployments/**}'
---

# Components Admin

## Panel chrome lives in components/admin; the overview stays off recharts
`components/admin/` holds the primitives the panel pages share: `panel-card` (the one `border-border bg-card rounded-xl border p-4` shell), `stat-tile`, `empty-card`, `panel-header`, `range-picker`, `sparkline`, `format.ts`. Six components hand-rolled that shell before there were four pages to keep in step - add to `admin/` rather than re-rolling it. `ui/card.tsx` stays unused here on purpose: it brings a header/footer structure these panels never wanted.

`sparkline` is hand-rolled SVG, not recharts, and that is load-bearing twice over. Ten of them sit in the errors issue list, where ten ResponsiveContainers plus resize observers would draw what is, at that size, a polyline. It is also what keeps the **overview off recharts entirely** - the traffic card draws its week with it, so the admin root never pulls in the chart bundle. Only `/dashboard/analytics` and `/dashboard/errors` should ever import recharts; check with `grep -l 'from "recharts"' bootstrap/ssr/assets/*.js` after `npm run build:ssr`.

Chart and meter colours come from the `--chart-1`..`--chart-5` tokens, never hex - they already follow the active accent scale and both appearances. The overview's quota bar duplicates `QuotaMeter`'s 0.75/0.9 thresholds deliberately; keep them in step so the two never disagree at a glance.
