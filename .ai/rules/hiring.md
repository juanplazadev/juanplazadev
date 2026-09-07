---
paths:
  - '{config/site.php,resources/js/components/site/header.tsx,resources/js/components/resume/contact.tsx}'
---

# Hiring mode

## The flag gates availability signalling only - never the work history
`config('site.hiring')` (env `SITE_HIRING_MODE`) exists so the site can stop announcing that its owner is job hunting without gutting the portfolio. It is shared from `HandleInertiaRequests::share()` and read with `usePage().props.hiring`.

It gates exactly three things, all of them signals rather than substance:

- the `StatusDot` chip on the hero avatar (dropped when off - the avatar reads fine bare)
- the `Open to remote roles` accent badge, which is *swapped* for a plain `Remote since 2018` outline badge rather than dropped, so the badge row keeps two items and the hero keeps its rhythm
- the first clause of the Contact card's opening line

The Experience section, the stats row, the Résumé button and the GitHub button are deliberately NOT gated, in either state. A work history is the substance of the site and the same content as a public LinkedIn profile; hiding it leaves a portfolio with nothing in it. Do not extend the flag to cover them.

Two things this depends on, so do not "simplify" them away:

1. The gate is server side. With the flag off the copy is never rendered, so it is absent from view-source, not hidden with a class. Never reimplement this as a CSS or client-only toggle.
2. The config default is `false` on purpose - a missing variable should fail quiet rather than broadcast. Production `.env` lives at `/opt/da-server/juanplazadev/.env`; the value has to be set there or the next deploy turns the badge off.

Off-mode copy is asserted in `tests/Browser/HomePageTest.php`, so changing the wording means changing those assertions.
