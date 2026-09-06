/**
 * Mirrors App\Content\ContentSnapshot::summary().
 *
 * The overview's one non-vendor source. Cloudflare says how many people came
 * and Sentry says what broke; this says what the site itself has been doing.
 */

export type ContentCounts = {
    total: number;
    published: number;
    /** Never dated, or dated for later. */
    drafts: number;
};

export type StaleDraft = {
    /** 'post' or 'architecture'. */
    type: string;
    slug: string;
    title: string;
    updatedAt: string;
};

export type ContentSnapshot = {
    posts: ContentCounts;
    architectures: ContentCounts;
    /** Published architectures currently flagged live. */
    activeSystems: number;
    /** Across posts only - architectures are living documents, not a cadence. */
    lastPublishedAt: string | null;
    daysSinceLastPublish: number | null;
    /** Drafts untouched for a fortnight, most recent first. */
    staleDrafts: StaleDraft[];
};
