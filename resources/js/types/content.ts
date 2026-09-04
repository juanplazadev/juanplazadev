/**
 * Mirrors of the content models in app/Models.
 *
 * These describe what arrives as Inertia props, so they must stay in step with
 * Post::toArray() and Architecture::toArray().
 */
import type { IconName } from '@/lib/icons';

/** Either a node's edge midpoint, "node.anchor", or a literal viewBox point. */
export type EdgeEndpoint =
    | `${string}.${'top' | 'right' | 'bottom' | 'left'}`
    | [x: number, y: number];

export type DiagramNodeSpec = {
    /** Referenced by edges, and unique within one diagram. */
    key: string;
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    sublabel?: string;
    variant?: 'default' | 'accent' | 'planned';
    icon?: IconName;
    iconPlacement?: 'left' | 'top';
};

export type DiagramEdgeSpec = {
    from: EdgeEndpoint;
    to: EdgeEndpoint;
    label?: string;
    bend?: 'h' | 'v';
    variant?: 'default' | 'dashed';
};

export type DiagramGroupSpec = {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    labelAnchor?: 'start' | 'end';
};

export type DiagramBlock = {
    type: 'diagram';
    title: string;
    description: string;
    width: number;
    height: number;
    minWidth?: number;
    caption?: string;
    groups?: DiagramGroupSpec[];
    nodes: DiagramNodeSpec[];
    edges?: DiagramEdgeSpec[];
};

export type SpecsBlock = {
    type: 'specs';
    items: { label: string; value: string; icon?: IconName }[];
};

export type ContentBlock = DiagramBlock | SpecsBlock;

/**
 * One entry in a compiled body.
 *
 * The server interleaves rendered markdown with the blocks the prose referenced,
 * so the order here is the order on the page.
 */
export type RenderedBlock =
    | { type: 'html'; html: string }
    | { type: 'block'; key: string; block: ContentBlock };

export type Post = {
    slug: string;
    title: string;
    /** ISO 8601 date, for <time dateTime>. Null while the post is a draft. */
    date: string | null;
    /** Preformatted on the server so SSR and hydration agree. */
    formattedDate: string;
    summary: string;
    tags: string[];
    readingMinutes: number;
    isPublished: boolean;
    /** Only present on the show page; the index ships metadata alone. */
    rendered?: RenderedBlock[];
};

export type Architecture = {
    slug: string;
    title: string;
    tagline: string;
    status: string;
    /** Up and serving traffic - drives the pinging StatusDot. */
    active: boolean;
    stack: { label: string; icon?: IconName }[];
    links: { label: string; href: string }[] | null;
    isPublished: boolean;
    rendered?: RenderedBlock[];
};

export type Palette = {
    id: string;
    label: string;
    /** A `var(--swatch-*)` reference, not a literal colour. */
    swatch: string;
};
