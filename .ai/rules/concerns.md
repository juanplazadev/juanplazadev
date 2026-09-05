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
