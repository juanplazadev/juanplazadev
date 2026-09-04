import { type ReactNode, useCallback, useState } from 'react';

import {
    PALETTE_COOKIE,
    PALETTE_STORAGE_KEY,
    PaletteContext,
} from '@/hooks/use-palette';
import type { Palette } from '@/types/content';

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/*
  The palette is seeded from a shared Inertia prop rather than read off the DOM.

  That is what makes it SSR-safe: the previous client-only version resolved the
  palette by reading document.documentElement inside a useState initializer,
  which runs during render and throws on the server. Reading a per-request prop
  also avoids module-level state, which would leak between requests in the
  long-running SSR process.

  The props are passed in from createInertiaApp's withApp() rather than read
  with usePage(): withApp wraps the app from outside Inertia's own context
  provider, so usePage() has nothing to read there and throws during SSR.

  The cookie is the half the server reads, so HandlePalette can stamp
  data-palette on <html> before anything paints. localStorage is kept only so a
  visitor who blocks cookies still gets their choice back on reload.
*/
export default function PaletteProvider({
    initialPalette,
    palettes,
    children,
}: {
    initialPalette: string;
    palettes: Palette[];
    children: ReactNode;
}) {
    const [palette, setPaletteState] = useState<string>(initialPalette);

    const setPalette = useCallback((next: string) => {
        setPaletteState(next);

        if (typeof document === 'undefined') {
            return;
        }

        document.documentElement.dataset.palette = next;
        document.cookie = `${PALETTE_COOKIE}=${next};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;

        try {
            localStorage.setItem(PALETTE_STORAGE_KEY, next);
        } catch {
            // Private mode or blocked storage: the cookie above still carries
            // the choice, so only a cookie-less visitor loses it on reload.
        }
    }, []);

    return (
        <PaletteContext value={{ palette, palettes, setPalette }}>
            {children}
        </PaletteContext>
    );
}
