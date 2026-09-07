/**
 * Byte counts at the size a dashboard shows them.
 *
 * Binary units, because this counts bytes Cloudflare served rather than disk a
 * vendor sold. One decimal below ten so 1.4 GB does not round to 1 GB, none
 * above it where the digit is noise.
 */
export function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/**
 * "2026-09-05" -> "Sep 5". Parsed as UTC to match Cloudflare's day boundary.
 *
 * Shared rather than private to a chart: three chart components format the same
 * ISO day, and the UTC pin is the part that is easy to get wrong on the fourth.
 */
export function formatDay(value: string): string {
    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}
