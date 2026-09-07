import { CircleHelp, Monitor, Smartphone, Tablet } from 'lucide-react';

import { BROWSER_ICON_SIZE, browserIcons } from '@/lib/browser-icons';
import type { BrowserIconName } from '@/lib/browser-icons';

/**
 * The glyph and label vocabulary for the breakdown rows.
 *
 * Grouped here the way components/admin/format.ts groups its formatters: three
 * of the five breakdowns identify a *thing* rather than a URL, and each needs
 * the same two questions answered - which glyph, and is the raw Cloudflare
 * string fit to show a reader.
 *
 * Every glyph is decorative. The label beside it already names the row, so
 * these are a second way to recognise a row you can already read, never the
 * only way - the same rule PanelCard's heading icon follows.
 */

/** Renders one vendored 24x24 brand path. */
function BrowserMark({ name }: { name: BrowserIconName }) {
    return (
        <svg
            className="size-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${BROWSER_ICON_SIZE} ${BROWSER_ICON_SIZE}`}
            aria-hidden="true"
        >
            <path d={browserIcons[name]} />
        </svg>
    );
}

/**
 * Cloudflare reports `userAgentBrowser` as a CamelCase name with the platform
 * folded in - the live values on this site are Chrome, MobileSafari, Edge and
 * FirefoxMobile, not the bare brand. So match on a substring of the flattened
 * string rather than on equality, and check the Chromium-derived browsers that
 * carry their own mark before Chrome itself.
 */
export function browserIconName(label: string): BrowserIconName {
    const name = label.toLowerCase().replace(/[^a-z]/g, '');

    if (name.includes('edge') || name.includes('edg')) {
        return 'edge';
    }

    if (name.includes('opera') || name.includes('opr')) {
        return 'opera';
    }

    if (name.includes('firefox')) {
        return 'firefox';
    }

    if (name.includes('chrome') || name.includes('chromium')) {
        return 'chrome';
    }

    if (name.includes('safari')) {
        return 'safari';
    }

    return 'unknown';
}

export function browserGlyph(label: string) {
    return <BrowserMark name={browserIconName(label)} />;
}

/**
 * `MobileSafari` -> `Mobile Safari`.
 *
 * The same CamelCase the matcher above flattens is what a reader sees, and it
 * reads as a machine value beside `Chrome` and `United States`. Split on a
 * capital that follows a lowercase letter, which leaves single-word values
 * (`Chrome`, `Edge`, `Unknown`) untouched.
 */
export function browserLabel(label: string): string {
    return label.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * `deviceType` arrives lowercase and from a closed set, which is what makes
 * this the one breakdown whose rows map onto icons with nothing inferred.
 */
export function deviceGlyph(label: string, className = 'size-4') {
    switch (label.toLowerCase()) {
        case 'desktop':
            return <Monitor aria-hidden className={className} />;
        case 'mobile':
            return <Smartphone aria-hidden className={className} />;
        case 'tablet':
            return <Tablet aria-hidden className={className} />;
        default:
            return <CircleHelp aria-hidden className={className} />;
    }
}

/** `desktop` reads badly beside `Chrome` and `United States`. */
export function deviceLabel(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Cloudflare's dimension is named `countryName` but reports the ISO 3166-1
 * alpha-2 *code* - `US`, not `United States`. That misnomer is load-bearing
 * here in two ways: the card used to render bare codes at a reader, and a flag
 * needs the code, so nothing has to be mapped back out of a display name.
 *
 * Do not be tempted to reverse that mapping if the dimension ever changes.
 * Resolving a name back to a code through Intl.DisplayNames silently returns
 * deprecated codes that share a display name - Germany comes back DD (East
 * Germany), Russia SU, France FX - and a wrong flag is worse than no flag.
 */
const ALPHA_2 = /^[A-Za-z]{2}$/;

let regionNames: Intl.DisplayNames | null | undefined;

function regions(): Intl.DisplayNames | null {
    if (regionNames === undefined) {
        try {
            regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        } catch {
            // A runtime built without full ICU. The code is still readable.
            regionNames = null;
        }
    }

    return regionNames;
}

/** `US` -> `United States`, falling back to whatever Cloudflare sent. */
export function countryLabel(code: string): string {
    if (!ALPHA_2.test(code)) {
        return code;
    }

    try {
        return regions()?.of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

/**
 * The two regional indicator symbols for an alpha-2 code.
 *
 * Windows ships no country flag glyphs, so this degrades to the two letters in
 * boxes there rather than drawing a flag. Legible, which is why it is not
 * guarded against - but it is why the country name is rendered beside it and
 * not replaced by it.
 */
export function countryGlyph(code: string) {
    if (!ALPHA_2.test(code)) {
        return null;
    }

    const flag = code
        .toUpperCase()
        .replace(/./g, (character) =>
            String.fromCodePoint(0x1f1e6 + character.charCodeAt(0) - 65),
        );

    return (
        <span aria-hidden className="text-base leading-none">
            {flag}
        </span>
    );
}
