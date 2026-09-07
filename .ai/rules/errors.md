---
paths:
  - 'resources/js/components/errors/**'
---

# Errors

## Severity is the errors page's one icon vocabulary, and red means fatal
`level` is the ONLY enumerable field in the errors payload - ErrorInsights::issues() never maps Sentry's `platform` or tags - so it is the one thing on this page a glyph can honestly stand for. Do not reach for browser/OS/device icons here without extending the mapper first.

errors/level-glyphs.tsx is that vocabulary, the sibling of analytics/row-glyphs.tsx: OctagonAlert/fatal, CircleAlert/error, TriangleAlert/warning, Info/info, Bug/debug, CircleHelp/anything else. Two callers - the issue row and SeverityCard's legend.

`fatal` and `error` no longer share --destructive. They did, which left the two levels that matter most indistinguishable; red is reserved for fatal and error is --chart-4. That is only safe because the glyph shape plus an sr-only level name now carry the level and colour merely ties a row back to its bar segment. The issue row's colour-only dot was the bug this replaced.

levelColor() returns a CSS value, never a Tailwind class: ShareBar tints through an inline style, and the row reads the same map so the two cannot drift.

SeverityCard counts ISSUES, not events. It then sums to the "Unresolved" stat tile above it; weighting by issue.count would let one screaming issue swallow the bar and would restate the chart. Levels sort by severity, not by size - a single fatal belongs at the left-hand end. It renders null on an empty list rather than an empty card above an empty list. Keep error-insights-skeleton.tsx in step: a short h-[108px] full-width block, the height analytics-skeleton uses for a ShareBar card.

QuotaMeter and IssueList carry NO heading glyph, deliberately. The two volume charts do (Activity here, ChartLine on analytics/traffic-chart.tsx) - but never overview/traffic-area-chart.tsx, which is behind the lazy recharts boundary.

Browser fixture trap: the shared Sentry fake in tests/Browser/DashboardTest.php answered /issues/ with [], so no browser test ever rendered an issue row. It now returns two issues at DIFFERENT levels via browserSentryIssue(); one level draws a single full-width segment and proves nothing. Assert 'Warning', never 'Error' - assertSee is a substring match and the header, breadcrumb and sidebar all carry "Errors". 'Warning' alone does not prove the BAR drew: sr-only text is visible to Playwright, so the issue row's level name would satisfy it. The share ('50%') is the assertion that only ShareBar can pass.
