---
paths:
  - '{resources/js/components/app-sidebar.tsx,resources/js/components/app-sidebar-header.tsx,resources/js/components/nav-console.tsx,resources/js/components/theme-toggle.tsx,resources/js/components/palette-picker.tsx,app/Enums/Console.php}'
---

# Panel Chrome

## The appearance rail is shared with the public site, and the Consoles menu is config-gated
`theme-toggle.tsx` and `palette-picker.tsx` live at the top level of `components/`, NOT in `components/site/`, for the reason `wordmark.tsx` does: the public header, the page header and the admin page header all render them. The admin rail is the point - every admin token (`--sidebar-*`, `--chart-1..5`) resolves through `--accent-*`, so the panel already rendered in the active palette and just had no control for it. The palette cookie is global, so changing it in the panel changes the public site too; that is intended.

The rail sits in `app-sidebar-header.tsx` behind `ml-auto`, with the picker `hidden sm:flex` - six dots plus a breadcrumb trail does not fit a phone.

`App\Enums\Console` builds each console URL from the credentials the matching panel page already reads and returns null when a service is unconfigured; `options()` drops those cases. That config presence is the ONLY gate - never add an `app()->isLocal()` check. It is what keeps Mailpit (local Docker only, `MAILPIT_URL`) out of the production sidebar. Sentry's URL goes through `App\Services\Sentry\SentryWebUrl`, shared with `ErrorInsights::releaseUrl()`; do not re-derive the host. The list is shared from `HandleInertiaRequests` only for an authenticated user, because the entries carry the Sentry org slug, the Cloudflare account id and the Mailgun domain.

`nav-console.tsx` keys its icons by enum case id. Do not give Mailgun `MailCheck` - that glyph is bound to Deliveries by .ai/rules/components-admin.md.
