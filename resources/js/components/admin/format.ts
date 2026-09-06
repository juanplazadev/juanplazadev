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
