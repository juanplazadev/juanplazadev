---
paths:
    - 'resources/css/additional-styles/prose.css,resources/js/components/content/**'
---

# Content

## .prose spacing has to reach into the body wrapper divs

ContentBody renders a compiled body as alternating chunks: a `<div data-prose>` holding a run of server-rendered markdown, then a diagram or spec list component, then the next run. dangerouslySetInnerHTML needs a real element, so those wrappers are unavoidable.

prose.css therefore spaces both levels:

    .prose > * + *,
    .prose > :where([data-prose]) > * + * { margin-top: 1.25em; }

`:where()` is load-bearing - it keeps the second selector at the same specificity as the first so `.prose h2`'s larger top margin still wins. Drop it and every heading inside a wrapper silently collapses to the paragraph spacing.
