---
paths:
  - 'app/Services/Cloudflare/**,app/Enums/AnalyticsRange.php,config/services.php,app/Http/Controllers/Admin/AnalyticsController.php'
---

# Analytics

## Cloudflare analytics: four 32-hex ids, and every mistake fails silently
The GraphQL Analytics API answers a FAILED query with HTTP 200 and the failure in a top-level `errors` array. Check that array, never the status code - CloudflareGraphQlClient::throwIfErrored() is the only thing standing between a broken filter and a dashboard of honest-looking zeroes.

Four different 32-hex ids are in play and swapping any two produces an empty result set rather than an error:
- `accountTag` = the account ID (also the `{account_id}` in REST URLs).
- `siteTag` = `site_tag`, a TOP-LEVEL field of a `rum/site_info/list` row.
- `site_token` = what the beacon reports as `siteToken` in the `/cdn-cgi/rum` payload. Never used server-side. It is the only one visible in DevTools, so it is the one you will reach for first, and it is wrong.
- `zone_tag` = the Zone ID, nested INSIDE `ruleset` on the same row. Zone traffic only.

The account holds more than one Web Analytics property, so select the `site_info/list` row by `ruleset.zone_name`, never positionally.

Token needs THREE permissions. `Account Settings: Read` is the non-obvious one: it gates both `rum/site_info/list` and any account-wide (unfiltered) RUM GraphQL query. Without it an unfiltered query fails with `{"code":"authz"}` while a siteTag-filtered one silently returns `[]`, which reads as a bad tag rather than a missing permission.

SiteAnalytics sends ONE document with aliased nodes, so one invalid dimension name fails the whole thing, aliases included. BREAKDOWNS is declared as data specifically so names can be bisected one at a time. Introspect before adding one: `{__type(name:"AccountRumPageloadEventsAdaptiveGroupsDimensions"){fields{name}}}`.

Cloudflare samples between 0.0001% and 100% by volume and reports `sampleInterval` per group; multiply through it or totals under-report as traffic grows. Unsampled data is kept 7 days, then aggregated to ~10%.

Bind these scoped(), not singleton() - Octane reuses the container across requests.

## Keep the zone half in its own request
SiteAnalytics sends TWO requests, and that is deliberate. The RUM half (visitor numbers) is essential; the zone half is optional, plan-limited, and proved it: on a Free plan `httpRequestsAdaptiveGroups` refuses any window wider than 1d, and while both halves shared one GraphQL document that refusal failed the whole thing and took the visitor numbers with it. Do not merge them back for the sake of one round trip.

Zone traffic uses `httpRequests1dGroups`, not `httpRequestsAdaptiveGroups`: the daily rollups reach 30 days on Free and carry `sum { requests cachedRequests bytes }` directly, so the cache hit ratio needs no deriving from `cacheStatus`. It filters on `date_geq`/`date_leq` with `Date!` (YYYY-MM-DD), not `datetime_*` with `Time!` - hence `AnalyticsRange::toDateFilter()` alongside `toFilter()`.

`zoneTotals()` catches its own throwable, logs at info, and returns zeroes with a null ratio. A missing zone id skips the request entirely. Covered by 'a zone side failure does not cost the visitor numbers' and 'the zone half asks for daily rollups' in tests/Feature/DashboardAnalyticsTest.php - the second pins the dataset so a refactor cannot silently regress to the adaptive one.

Note on debugging: GraphQL validates before it executes. An unknown dimension or field is a validation error that fails the document outright, so if you get an EXECUTION error back (a range limit, an authz refusal) every field name in that document is already known-good.

## Turnstile: an unset secret switches the challenge OFF, not open
`TurnstileVerifier` and `TurnstileVerification` sit in this namespace because Turnstile is Cloudflare, but they share nothing with the GraphQL analytics stack above - different endpoint, different credential, different failure mode.

With `services.turnstile.secret_key` unset the feature is off END TO END: `verify()` returns a skipped verification, `HandleInertiaRequests` shares a null `turnstileSiteKey` so the widget never renders, `ResumeDeliveryRequest` stops requiring a token, and `turnstile_success` is stored as NULL. Null therefore means "never asked", which is a different fact from false ("Cloudflare refused") - do not collapse the column to a plain boolean.

That policy is the only reason local and the test suite run without Cloudflare credentials. Anything that makes an unset secret behave like a passing challenge in production would open the résumé form to any bot that can POST.

The opposite trap: a TRANSPORT failure fails the check. Cloudflare being unreachable is not evidence the visitor is human, and failing open turns a siteverify blip into an open relay for a form that sends mail. Covered by 'refuses when cloudflare cannot be reached' in tests/Feature/ResumeDeliveryTest.php.

phpunit.xml BLANKS `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` and both Mailgun keys, the same way it blanks the Sentry DSN. It does not otherwise shadow `.env`, and with real keys present the browser tests try to fetch Cloudflare's challenge script from an in-process server on a random port: the widget reports a load failure, the dialog refuses to submit, and every résumé test fails on a challenge that could never have loaded. Unset is also the state those suites assert.

There is NO score in a Turnstile response. It answers `success` plus `error-codes`; a numeric score is a reCAPTCHA v3 idea and appears only on Turnstile Enterprise. A `turnstile_score` column would be permanently null, which is why there is not one.
