---
paths:
  - 'resources/js/components/deployments/**'
---

# Deployments

## One release vocabulary, and the tiles sit below the verdict
deployments/release-glyphs.tsx is this page's glyph vocabulary, the sibling of errors/level-glyphs.tsx and analytics/row-glyphs.tsx. It exists for a stronger reason than either: the comparison behind it - which release is running, which shipped last, whether they disagree - had been written out FOUR times, in running-build.tsx, release-table.tsx, overview/overview-header.tsx and overview/attention-list.tsx, with nothing keeping them in step. Import it; do not re-derive drift.

Two exports because two callers ask two things of the same pair of facts. deployVerdict() answers "is what shipped what is serving" (current/drifted/untagged/unreported/unknown) and is what the running card, the overview chip and the attention list read. releaseState() answers "what is this row" (running/superseded/latest/shipped) and is the table's. `superseded` is the state the table could not previously express: the row IS the running build but something newer exists above it, which drawn as an ordinary row made the failure invisible.

releaseColor() returns a CSS value, never a Tailwind class - same contract as levelColor(), because the mark is tinted through an inline style.

The row marker used to be a bare coloured dot: bg-chart-2 for running, bg-muted-foreground/30 otherwise, aria-hidden, no text. That is meaning carried by colour alone, the exact bug errors.md records fixing on the issue row. It is fixed by the TAG, not by an sr-only span - every state that means anything now carries a word, and the glyph is the second reading. Do not "tidy" the tags away and leave the glyph.

Fixing the same derivation in overview-header.tsx also fixed a latent wrong signal there: the old check asked only whether the running build sat BELOW the top of the list, so a build in no release at all (untagged, index -1) drew a GREEN dot. The shared verdict rates untagged as badly as drift.

ReleaseStats sits BELOW RunningBuild, unlike every sibling page which reads header -> tiles -> detail. running-build.tsx's docblock calls itself the page's headline, and the verdict is what the page is for; the tiles are the table's summary line. Deliberate, not an oversight. Keep deployments-skeleton.tsx in step - h-[132px], three h-[104px] tiles, h-96.

Heading icons are Server (Running) and History (Releases), NOT the sidebar's Rocket: the sidebar-twin rule in components-admin.md is for overview cards that link to a section, and these are inside the section.

Browser fixture trap: the shared Sentry fake in tests/Browser/DashboardTest.php routed /releases/ into its `default => []` branch, so no browser test had ever rendered a release row - the same gap errors.md documents for /issues/. It now returns two releases via browserSentryRelease(), and 'renders the deployment history' pins config('sentry.release') to the OLDER one so the drift path actually draws. Assert 'superseded' - nothing else on that page carries the word, while the overview chip's '· superseded' lives on /dashboard.
