---
paths:
  - '{app/Services/Sentry/**,app/Http/Controllers/Admin/{Errors,Deployments}Controller.php,config/services.php,resources/js/pages/admin/deployments.tsx}'
---

# Sentry

## Reading errors back out of Sentry
Two Sentry credentials, and they are not interchangeable. config/sentry.php holds the DSN, which SUBMITS events. config/services.php `sentry` holds the read-side token for the Web API, which QUERIES them. Do not put API-read credentials in config/sentry.php - it is the vendor-published SDK file.

SENTRY_API_TOKEN must be a USER auth token (User settings > User Auth Tokens) with org:read, project:read, event:read. The Organization Auth Token variety is scoped for CI (org:ci, release creation) and cannot read issues - it reports that as an empty list, not as a refusal, so a wrong token type looks like a quiet account rather than a broken one.

SENTRY_API_URL carries the region and the DSN already tells you which: `...ingest.us.sentry.io` means `https://us.sentry.io/api/0`. SENTRY_ORGANIZATION and SENTRY_PROJECT are slugs, not the numeric ids in the DSN.

The query string is the trap. Several Sentry parameters are repeated keys (`groupBy=outcome`), and PHP's http_build_query writes a list as `groupBy[0]=...`, which Sentry IGNORES rather than rejects - it answers with one ungrouped total, which reads as "no rate-limited events" instead of as a malformed request. SentryApiClient::queryString() strips the indices; pinned by the test 'it asks for repeated query keys rather than indexed ones'.

stats_v2 is always requested at statsPeriod=30d regardless of the selected range: the free plan's quota resets monthly, so narrowing the chart to 7d must not make the quota meter look emptier. ErrorInsights trims the same response down for the chart. One request, two answers; pinned by 'the quota counts thirty days while the chart is trimmed to the range'. stats_v2 also filters on numeric project ids, not slugs, hence project=-1.

Three requests, and the split matters for the same reason the Cloudflare zone half is separate (see analytics.md): Sentry rate-limits on CALLER IDENTITY, not per token, so a throttled stats or releases call must not take the issue list with it. Both optional halves catch their own Throwable, log at info, and return neutral values.

Bind these scoped(), not singleton() - Octane reuses the container across requests.

Free Developer plan: 5,000 errors/month, 30-day retention. That retention ceiling is why AnalyticsRange (7d/30d) is reused verbatim - its values are already Sentry's statsPeriod strings. The API reports consumption but never the plan's limit, so SENTRY_MONTHLY_ERROR_QUOTA is the meter's denominator.

## Deployments are their own page, their own request, and carry no range
Releases left `ErrorInsights::summary()`. `summary()` is now two requests (issues + stats_v2); `deployments()` is a third, public, and called only by `/dashboard/deployments` and the overview's build card. Pinned by 'the errors summary asks sentry twice and never for releases'.

Why the split matters beyond tidiness: `/releases/` takes no `statsPeriod`, so the answer does not vary with the selected range. Its cache key is therefore `deployments:sentry` with no range segment, and the page carries **no range picker** - a control that changed nothing would be worse than none. That asymmetry with the traffic and errors pages is deliberate, not an omission.

`deployments()` reports failure as an `error` string rather than returning `[]`. As an optional half of `summary()`, `[]` was right - losing the deploy card must never cost the issue list. On a page that shows nothing else, `[]` renders "no tagged releases yet" while Sentry is simply unreachable. An empty list with a null error is still a normal state (an untagged project), so the two must render differently. Pinned by 'a sentry failure is reported as an error rather than an empty list'.

`RELEASE_LIMIT` is 20: `per_page` costs one request whichever number it carries, and this is a page now rather than a card in a column. Still never `/releases/{version}/deploys/` - that is N calls against an API that rate-limits on caller identity.

`running` (`config('sentry.release')`) stays an eager prop on both the deployments page and the overview. The caches hold 15 minutes and a deploy does not clear them, so a cached copy would report drift already fixed a quarter of an hour ago.
