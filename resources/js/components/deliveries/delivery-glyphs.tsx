import {
    BellOff,
    CircleDashed,
    Clock,
    Flag,
    MailCheck,
    MailOpen,
    MailPlus,
    MailX,
    MousePointerClick,
    Send,
    ShieldCheck,
    ShieldOff,
    ShieldX,
} from 'lucide-react';

import type { DeliveryStatus } from '@/types/deliveries';

/**
 * The glyph, label and colour vocabulary for a résumé delivery.
 *
 * Grouped here the way deployments/release-glyphs.tsx and errors/level-glyphs.tsx
 * group theirs. This page reads three enumerable fields - the derived status,
 * the Turnstile verdict, and the provider's event name - and only the first of
 * them had a home. The other two were private helpers inside delivery-table.tsx
 * and event-timeline.tsx, which is how `permanent_fail` reached the screen as
 * `permanent_fail`.
 *
 * Every glyph is decorative and aria-hidden. The status badge carries the
 * status in words, each fact carries its label, and an event's own name sits
 * beside its mark - so these are a second way to recognise something you can
 * already read, never the only way. That is the rule PanelCard's heading icon
 * follows.
 *
 * A deliberate divergence, recorded so nobody "fixes" it: overview/delivery-bar.tsx
 * paints `delivered` as --chart-1 and this file paints it --chart-2. The bar's
 * five segments partition one total and walk the accent ramp in that order,
 * which is magnitude - the one thing --chart-1..5 encodes well. The badge is a
 * good/bad judgement about a single row, which is identity - the thing that
 * same ramp encodes badly. Same statuses, two different questions.
 */

/**
 * The detail block's column template: glyph, label, value.
 *
 * The facts and the timeline are two lists under one rail, and they used to run
 * on a 5rem gutter and a 6rem gutter respectively, so nothing lined up between
 * them. They share this instead.
 *
 * `minmax(0,1fr)` rather than `1fr` is what makes `truncate` work in the value
 * cell: a `1fr` track floors at its content's min-content width, so a long
 * Mailgun Message-Id widened the column instead of clipping.
 */
export const DETAIL_COLUMNS =
    'grid grid-cols-[1rem_6rem_minmax(0,1fr)] items-center gap-x-2';

/**
 * The same three tracks, plus a trailing column the timestamp right-aligns in.
 * Keep the first three identical to DETAIL_COLUMNS - that is the whole point.
 */
export const EVENT_COLUMNS =
    'grid grid-cols-[1rem_6rem_minmax(0,1fr)_auto] items-center gap-x-2';

export function statusGlyph(status: DeliveryStatus, className = 'size-4') {
    switch (status) {
        case 'delivered':
            return <MailCheck aria-hidden className={className} />;
        case 'failed':
            return <MailX aria-hidden className={className} />;
        case 'blocked':
            return <ShieldX aria-hidden className={className} />;
        case 'sent':
            return <Send aria-hidden className={className} />;
        default:
            return <Clock aria-hidden className={className} />;
    }
}

/**
 * A CSS value, never a Tailwind class, for the reason levelColor() gives: the
 * mark is tinted through an inline style, so the glyph and the badge beside it
 * cannot drift into disagreeing about what a status looks like.
 */
export function statusColor(status: DeliveryStatus): string {
    switch (status) {
        case 'delivered':
            return 'var(--chart-2)';
        case 'failed':
            return 'var(--destructive)';
        case 'blocked':
            return 'var(--chart-4)';
        default:
            return 'var(--muted-foreground)';
    }
}

/**
 * The badge's fill and text. Blocked is warning-coloured, not destructive: a
 * refused bot is the challenge working, not something that went wrong.
 */
export function statusTone(status: DeliveryStatus): string {
    switch (status) {
        case 'delivered':
            return 'bg-chart-2/15 text-chart-2';
        case 'failed':
            return 'bg-destructive/15 text-destructive';
        case 'blocked':
            return 'bg-chart-4/15 text-chart-4';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

export function eventGlyph(event: string, className = 'size-4') {
    switch (normalise(event)) {
        case 'accepted':
            return <MailPlus aria-hidden className={className} />;
        case 'delivered':
            return <MailCheck aria-hidden className={className} />;
        case 'opened':
            return <MailOpen aria-hidden className={className} />;
        case 'clicked':
            return <MousePointerClick aria-hidden className={className} />;
        case 'failed':
        case 'permanent_fail':
        case 'temporary_fail':
        case 'rejected':
            return <MailX aria-hidden className={className} />;
        case 'complained':
            return <Flag aria-hidden className={className} />;
        case 'unsubscribed':
            return <BellOff aria-hidden className={className} />;
        default:
            return <CircleDashed aria-hidden className={className} />;
    }
}

/**
 * Sparse on purpose. Most of what Mailgun reports is neither good news nor bad
 * - an open is not an outcome - and tinting every line would leave the two that
 * decide whether the résumé arrived no easier to find than the rest.
 */
export function eventColor(event: string): string {
    switch (normalise(event)) {
        case 'delivered':
            return 'var(--chart-2)';
        case 'failed':
        case 'permanent_fail':
        case 'temporary_fail':
        case 'rejected':
            return 'var(--destructive)';
        case 'complained':
        case 'unsubscribed':
            return 'var(--chart-4)';
        default:
            return 'var(--muted-foreground)';
    }
}

/**
 * Mailgun's event names are snake_case machine values, and they reached the
 * screen raw: `permanent_fail` sat beside a human-readable timestamp.
 */
export function eventLabel(event: string): string {
    const words = event.replace(/_/g, ' ').trim();

    if (words === '') {
        return 'Unknown';
    }

    return words.charAt(0).toUpperCase() + words.slice(1);
}

export function turnstileGlyph(value: string, className = 'size-4') {
    switch (value) {
        case 'passed':
            return <ShieldCheck aria-hidden className={className} />;
        case 'blocked':
            return <ShieldX aria-hidden className={className} />;
        default:
            return <ShieldOff aria-hidden className={className} />;
    }
}

/**
 * 'skipped' is "never asked", which is not the same answer as "passed" - and
 * must never read as "blocked". With the secret unset the feature is off end to
 * end and the column is stored NULL, so anything that is neither an explicit
 * pass nor an explicit refusal is a question nobody put. See
 * .ai/rules/analytics.md, which is explicit that null must not collapse.
 */
export function turnstileLabel(value: string): string {
    if (value === 'passed') return 'passed';
    if (value === 'blocked') return 'refused by Cloudflare';

    return 'not challenged';
}

/** Mailgun sends these lowercase, but nothing in the webhook contract promises it. */
function normalise(event: string): string {
    return event.toLowerCase();
}
