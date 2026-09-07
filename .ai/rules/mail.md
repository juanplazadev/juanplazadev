---
paths:
  - '{app/Mail/**,app/Jobs/SendResumeEmail.php,app/Actions/*ResumeDelivery*.php,app/Actions/SendResumeEmailAction.php,app/Services/Mailgun/**,app/Http/Controllers/MailgunWebhookController.php,app/Models/{ResumeDelivery,EmailEvent}.php,resources/views/mail/**,config/mail.php}'
---

# Mail

## The résumé flow: one row per request, one queued send, webhooks reconcile it
`resume_deliveries` is written the moment somebody submits the hero dialog - BEFORE the challenge is judged and before anything is sent - so a blocked bot leaves a row with `turnstile_success` false and no message id. That is deliberate: the record of a refused request is exactly what a future dashboard wants to count, so do not move the insert behind the Turnstile gate.

Three actions, and the split is load-bearing: `LogResumeDeliveryAction` persists, `SendResumeEmailAction` sends and stamps, `HandleResumeDeliveryAction` wraps both and dispatches `SendResumeEmail` only when the verification `allows()`. The send is queued, so the visitor never waits on Mailgun; `ResumeRequested` is deliberately NOT `ShouldQueue`, because the row has to be stamped with the provider's message id in the same place the send happens and a self-queueing mailable puts that stamp out of reach.

`email_sent_at` means the provider accepted it. Only a webhook can set `email_delivered`.

## The message id is the join, and both sides must normalize it
`SentMessage::getMessageId()` is what links a row to every webhook about it. What it returns is TRANSPORT-SPECIFIC:

- Mailgun's API transport sets it from the `id` the API returns, which IS the Message-Id its webhooks later report at `event-data.message.headers.message-id`. Mailgun wraps it in angle brackets in the webhook and hands it back bare from the API.
- Local SMTP to Mailpit returns Mailpit's own queue id, which matches nothing. That is why `MailgunWebhookController::match()` keeps a recipient fallback rather than trusting the id alone - and why a locally-sent message will never reconcile.

`ResumeDelivery::normalizeMessageId()` strips the brackets and every read and write goes through it. Skip it on either side and the join simply stops matching, silently: no exception, no empty result anyone notices, just `resume_delivery_id` null on every event forever.

## MAILGUN_ENDPOINT is a bare host, and the two Mailgun keys are not interchangeable
Symfony's Mailgun transport wants `api.mailgun.net`, not `https://api.mailgun.net`. The `.env` had the URL form, so `config/services.php` runs it through `parse_url(..., PHP_URL_HOST)` rather than trusting the variable. Do not "simplify" that back to a plain `env()`.

`MAILGUN_SECRET` sends. `MAILGUN_WEBHOOK_SIGNING_KEY` (Dashboard → Webhooks → HTTP webhook signing key) verifies webhooks. Signing a webhook check with the API key produces a signature that never verifies, and the endpoint answers 403 for every real Mailgun delivery.

## The webhook answers 200 for anything it cannot act on
Mailgun retries any non-2xx for days. `MailgunWebhookController` therefore returns 204 for an unmatched message, an unknown event type and a missing event id - only a bad signature is a 403. Events are upserted by `event_id` because a retried webhook arrives more than once as a matter of course.

`MailgunSignature` is the entire access control on a public route, and all three of its checks matter: the HMAC (`hash_equals`, never `===`), a five-minute freshness window (a signature is otherwise valid forever, so a captured payload would replay indefinitely), and a single-use claim on the token via `Cache::add` (which closes replay inside that window). Unconfigured REFUSES rather than accepts.

## MAIL_PORT is 1025 for Mailpit
It was 1080 in both `.env` and `.env.example`, which is nothing - local mail could not send at all. `compose.yaml` maps Mailpit's SMTP on 1025 and its web UI on 8025.

## The dashboard that counts refused requests reads it back, and status is derived
`/dashboard/deliveries` is the read side of everything above. `resume_deliveries` has no status
column and must not grow one: every input is already a column, and a denormalised copy would have
to be kept in step by `markSent()`, `markDelivered()`, `markFailed()` and the webhook - four
places that only have to disagree once for the badge and the filter to start lying.

`App\Enums\DeliveryStatus` holds the rules twice and both halves must stay in step: `of()` for a
loaded row, `scope()` for the SQL the filter and the tiles run. Case order is load-bearing -
Blocked, Failed, Delivered, Sent, Pending, first match wins - because a delivered row is also a
sent row and a bounced one was sent before it failed. 'the five statuses partition the window' in
tests/Feature/ResumeDeliverySnapshotTest.php fails the moment the two drift.

`turnstile_success` is tested for FALSE specifically, never for falsy, for the reason analytics.md
gives: null is "never asked", not "refused". Two consequences. Null must never render as Blocked.
And the SQL spells the negation out as "true or null" rather than `whereNot(... = false)`, because
SQL's NOT is NULL for a NULL row - the negation form silently drops every request made while the
challenge was switched off, which is every request in local development and in the test suite.

`ResumeDeliverySnapshot` is modelled on `App\Content\ContentSnapshot`, NOT on the Cloudflare and
Sentry service trios: two local tables, so no API client, no cache, and deliberately no `error`
key to render. Its totals always count the whole window and ignore the status filter - narrowing
the tiles along with the table would leave the reader looking at "4 failed" with no denominator.
The list is capped at `RECENT_LIMIT` while `totals.requested` keeps reporting the true count.

An empty event timeline is a normal state, not missing data. Mailpit returns its own queue id, so
a locally-sent message never reconciles and never will; the component says so rather than leaving
it to read as a bug.
