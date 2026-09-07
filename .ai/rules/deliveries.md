---
paths:
  - 'resources/js/components/deliveries/**'
---

# Deliveries

## The deliveries page has a glyph vocabulary and one shared detail column template
No rule file covered this directory before - `.ai/rules/index.md` routed components-admin.md at admin/, analytics/, errors/, overview/ and deployments/ only. The primitives and colour rules in components-admin.md still apply here; this records what is specific to deliveries.

`delivery-glyphs.tsx` is this page's vocabulary file, the sibling of deployments/release-glyphs.tsx and errors/level-glyphs.tsx. Same contract: `(value, className = 'size-4') => JSX` for glyphs, a CSS string (`var(--chart-2)`, never a Tailwind class) for colours applied through an inline `style`. It also owns `statusTone()`, which status-badge.tsx reads - the badge and the glyph sit beside each other in the table, so a second copy of that map is exactly the drift the file exists to prevent.

`DETAIL_COLUMNS` and `EVENT_COLUMNS` live there too, and their first three tracks must stay identical. The expanded row is two lists under one rail; they previously ran on a 5rem gutter (Facts) and a 6rem gutter (EventTimeline) and lined up with nothing. Use `minmax(0,1fr)` and not `1fr` for the value track - a `1fr` track floors at min-content, which is why `truncate` on a long Message-Id widened the column instead of clipping.

The rail is `ml-2`, which is half the chevron's `size-4` box - derived geometry, not a tuned number. Keep the chevron boxed.

Deliberate divergence, do not "fix" it: overview/delivery-bar.tsx paints `delivered` as --chart-1, delivery-glyphs.tsx paints it --chart-2. The bar's segments partition a total and walk the ramp in order (magnitude, which --chart-1..5 encodes well); the badge is a good/bad judgement about one row (identity, which it encodes badly).

`eventLabel()` rewrites Mailgun's snake_case event names for display; `turnstileLabel()` must keep returning "not challenged" for anything that is not an explicit pass or refusal, because null means "never asked" (.ai/rules/mail.md, .ai/rules/analytics.md). Both are pinned by 'makes a delivery readable once its row is expanded' in tests/Browser/DashboardTest.php, which asserts `Permanent fail` AND `assertDontSee('permanent_fail')`.
