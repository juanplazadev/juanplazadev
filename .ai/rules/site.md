---
paths:
  - '{resources/js/components/wordmark.tsx,resources/js/components/app-logo.tsx,resources/js/components/site/**}'
---

# Site

## The brand mark is Wordmark, not an SVG - and its accent half constrains backgrounds
`@/components/wordmark` is the single source of the brand mark: `full` renders `juanplaza.dev`, `monogram` renders `JP`. It replaced the Laravel starter-kit SVG (`app-logo-icon.tsx`, deleted). Never re-inline the mark as JSX - site header, page header, footer, admin sidebar/header and all three auth layouts all go through this component.

The second half (`.dev` / `P`) is `text-primary` on purpose, so it tracks the palette picker. That means the mark cannot sit on a `--primary`-coloured surface. In `resources/css/app.css`, `--sidebar-primary` resolves to the same token as `--primary` (accent-700 light, accent-400 dark), so a `bg-sidebar-primary` tile paints the accented half onto its own colour and hides it. `app-logo.tsx` uses a `bg-sidebar-accent` + border chip instead.

Size and weight come in through `className` and are merged with `cn`; the component owns `font-inter-tight text-foreground font-semibold tracking-tight`.
