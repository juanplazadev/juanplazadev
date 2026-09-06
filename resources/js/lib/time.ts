/**
 * "3h ago" from an ISO timestamp, falling back to the raw value.
 *
 * Shared by the issue list and the deployment timeline, which ask the same
 * question of two different Sentry fields. The charts keep their own absolute
 * date formatters - an axis label is a different job.
 */
export function timeAgo(value: string): string {
    const at = new Date(value);

    if (Number.isNaN(at.getTime())) return value || 'unknown';

    const minutes = Math.round((Date.now() - at.getTime()) / 60_000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;

    return `${Math.round(minutes / 1440)}d ago`;
}
