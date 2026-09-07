---
paths:
  - '{resources/js/components/analytics/**,resources/js/lib/browser-icons.ts}'
---

# Lib

## Cloudflare's countryName is a code, and the flag must never be reverse-mapped
`countryName` reports the ISO 3166-1 alpha-2 CODE (`US`), not a name - confirmed against live data. row-glyphs.tsx resolves the display name and the flag emoji from it client-side. There is no country-code dimension to switch to: the RUM schema holds 21 dimensions and this is the only geographic one.

Never reverse a display name back to a code. Intl.DisplayNames silently returns deprecated codes that share a name - Germany comes back DD (East Germany), Russia SU, France FX - and a wrong flag is worse than no flag. Only code -> name is safe. An unresolved code renders no flag.

`userAgentBrowser` folds the platform into CamelCase: the live values are `MobileSafari` and `FirefoxMobile`, not `Safari`/`Firefox`. Match on a substring, and split the CamelCase before showing it. `deviceType` is lowercase from a closed set (desktop/mobile/tablet).

Fixtures must use that live vocabulary. A fixture saying "United States" and "Safari" is what hid all of this until the Devices card was rendered.

Flag emoji do not render on Windows - they degrade to two letter boxes. That is why the country NAME is rendered beside the flag, never replaced by it.
