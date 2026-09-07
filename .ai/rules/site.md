---
paths:
  - '{resources/js/components/wordmark.tsx,resources/js/components/app-logo.tsx,resources/js/components/site/**}'
---

# Site

## The brand mark is Wordmark, not an SVG - and its accent half constrains backgrounds
`@/components/wordmark` is the single source of the brand mark: `full` renders `juanplaza.dev`, `monogram` renders `JP`. It replaced the Laravel starter-kit SVG (`app-logo-icon.tsx`, deleted). Never re-inline the mark as JSX - site header, page header, footer, admin sidebar/header and all three auth layouts all go through this component.

The second half (`.dev` / `P`) is `text-primary` on purpose, so it tracks the palette picker. That means the mark cannot sit on a `--primary`-coloured surface. In `resources/css/app.css`, `--sidebar-primary` resolves to the same token as `--primary` (accent-700 light, accent-400 dark), so a `bg-sidebar-primary` tile paints the accented half onto its own colour and hides it. `app-logo.tsx` uses a `bg-sidebar-accent` + border chip instead.

Size and weight come in through `className` and are merged with `cn`; the component owns `font-inter-tight text-foreground font-semibold tracking-tight`.

## The hero résumé CTA is a lead-capture dialog with no backend
`resume-dialog.tsx` replaced the hero's `<a href="/juan-plaza-resume.pdf" download>`. Asking for an address before handing over the PDF is the whole point, so there is deliberately NO direct-download link inside the dialog - do not add one back as a "convenience".

The submit is a 700ms `setTimeout`, not a request: there is no route, controller or mailable yet. Replace that timeout with the POST when the backend lands; do not "fix" it by flipping straight to the sent state, because the button's pending state is then the thing that goes untested.

Two details the look depends on: the dialog reuses the hero's own `.hero-grid` / `.hero-glow` (`additional-styles/hero.css`) so it tracks the palette picker's `--primary`, and it passes `overlayClassName` to soften the shared `bg-black/80` scrim. That prop was added to `ui/dialog.tsx` as an optional pass-through - it changes nothing for the admin and settings dialogs that omit it.

State resets when the dialog OPENS, not when it closes: Radix keeps the content mounted through its exit animation, so clearing on close flips the success panel back to an empty form while it fades.

The trigger's label stays exactly `Résumé` - `tests/Browser/HomePageTest.php` asserts it in the hiring-off test. Per the hiring rule this CTA is not gated by `site.hiring` in either state.
