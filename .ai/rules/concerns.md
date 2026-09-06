---
paths:
    - 'app/Content/**,app/Models/{Post,Architecture}.php,app/Concerns/{Publishable,RendersMarkdownBody}.php'
---

# Concerns

## Content bodies are markdown in the DB, compiled on write

Post and Architecture store `body` (markdown) plus `blocks` (JSON, keyed by name). BodyRenderer splits the body on `::block{key="..."}` directive lines and compiles the result into the `rendered` column on save, so the public read path never parses markdown and there is no cache to invalidate.

Traps:

- Compilation is a `saving` model event (RendersMarkdownBody). Seeders run under `WithoutModelEvents`, so anything writing outside a request must call `compileBody()` explicitly or `rendered` stays null.
- `Str::markdown()` is called with `html_input => 'strip'`. The output goes to `dangerouslySetInnerHTML`, so do not relax that.
- A directive whose key is missing from `blocks` is dropped silently at render time. ValidBlocks (used by the admin form requests) is the only thing that catches a bad diagram edge reference before it ships.
- `published_at` null or future = draft. Guests 404; an authenticated user sees drafts at their real URL.

## ContentSnapshot counts through the Publishable scopes, never its own predicate

`ContentSnapshot` is the admin overview's only non-vendor source: post and architecture counts, days since the last publish, and drafts gone stale. No cache and no deferred prop - it is two small table scans, so it resolves inline with the page and the content card paints before either vendor answers.

It must keep going through `Publishable`'s scopes (`published()`, and the `drafts()` added for it) rather than writing `whereNotNull('published_at')` itself. A draft is "null or dated in the future", and the admin counts and the public index must not be able to disagree about that. `drafts()` exists precisely so the definition is not written a fourth time. Pinned by 'a post dated in the future counts as a draft'.

`daysSinceLastPublish` reads posts only. Architectures are living documents whose `published_at` marks when the write-up first went up, not a cadence anyone is keeping - pinned by 'architectures do not count towards the publishing cadence'.

No container binding: the class is stateless with no injected config, so autowiring is correct. The `scoped()` rule for the Cloudflare and Sentry services exists because those hold config; this one does not.
