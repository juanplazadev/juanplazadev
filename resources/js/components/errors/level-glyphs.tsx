import {
    Bug,
    CircleAlert,
    CircleHelp,
    Info,
    OctagonAlert,
    TriangleAlert,
} from 'lucide-react';

/**
 * The glyph, label and colour vocabulary for a Sentry level.
 *
 * Grouped here the way analytics/row-glyphs.tsx groups its own: `level` is the
 * only enumerable field in the errors payload - browser, OS and platform are
 * never serialised by ErrorInsights::issues() - so it is the one thing on this
 * page a glyph can honestly stand for, and two components now ask the same two
 * questions of it.
 *
 * Every glyph is decorative. The issue list puts the level's name beside it in
 * an sr-only span and the severity bar names every segment in its legend, so
 * these are a second way to recognise a level you can already read, never the
 * only way - the same rule PanelCard's heading icon follows.
 */

/** Severity descending. The severity bar reads in this order; unknown levels sort last. */
export const LEVEL_ORDER = ['fatal', 'error', 'warning', 'info', 'debug'];

export function levelGlyph(level: string, className = 'size-4') {
    switch (normalise(level)) {
        case 'fatal':
            return <OctagonAlert aria-hidden className={className} />;
        case 'error':
            return <CircleAlert aria-hidden className={className} />;
        case 'warning':
            return <TriangleAlert aria-hidden className={className} />;
        case 'info':
            return <Info aria-hidden className={className} />;
        case 'debug':
            return <Bug aria-hidden className={className} />;
        default:
            return <CircleHelp aria-hidden className={className} />;
    }
}

/** `warning` reads as a machine value beside a stack trace. */
export function levelLabel(level: string): string {
    if (level === '') {
        return 'Unknown';
    }

    return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * A CSS value, never a Tailwind class: ShareBar tints the bar and the legend
 * mark through an inline `style`, and the issue list reads the same map so the
 * two can never drift into disagreeing about what amber means.
 *
 * `fatal` and `error` used to share --destructive, which left the two levels
 * that matter most indistinguishable. Red is reserved for fatal now. That is
 * safe to do because the shape and the name carry the level here - the colour
 * only ties a row back to its segment in the bar - and because severity is a
 * magnitude, which is the one thing the --chart-* ramp encodes well.
 */
export function levelColor(level: string): string {
    switch (normalise(level)) {
        case 'fatal':
            return 'var(--destructive)';
        case 'error':
            return 'var(--chart-4)';
        case 'warning':
            return 'var(--chart-3)';
        case 'info':
            return 'var(--chart-1)';
        case 'debug':
            return 'var(--chart-5)';
        default:
            return 'var(--muted-foreground)';
    }
}

/** Sentry sends these lowercase, but nothing in the API contract promises it. */
function normalise(level: string): string {
    return level.toLowerCase();
}
