import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'system';

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    try {
        return (localStorage.getItem('appearance') as Appearance) || 'system';
    } catch {
        // Private mode or blocked storage. This runs at module load, so an
        // uncaught throw here would take the whole bundle down; system is the
        // same answer a visitor who never chose would get anyway.
        return 'system';
    }
};

const isDarkMode = (appearance: Appearance): boolean => {
    return appearance === 'dark' || (appearance === 'system' && prefersDark());
};

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = isDarkMode(appearance);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

/*
  The OS preference is part of the store, not something read during render.

  `prefers-color-scheme` is only knowable on the client, so a render-time
  matchMedia() read resolves to light on the server and dark on a dark-mode
  client's hydration pass - an attribute mismatch React refuses to patch up,
  which left the toggle's aria-pressed stale. Subscribing here instead keeps the
  hydration render equal to the server's and lets React re-render once with the
  real value, and it means an OS theme change now reaches subscribers at all.
*/
const subscribe = (callback: () => void) => {
    listeners.add(callback);

    const query = mediaQuery();
    query?.addEventListener('change', callback);

    return () => {
        listeners.delete(callback);
        query?.removeEventListener('change', callback);
    };
};

const notify = (): void => listeners.forEach((listener) => listener());

const mediaQuery = (): MediaQueryList | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = (): void => applyTheme(currentAppearance);

/*
  A first-time visitor is left unpersisted on purpose.

  Nothing is written to localStorage or the appearance cookie until the visitor
  actually picks a theme, so an untouched browser keeps following the OS: the
  blade pre-paint script reads no cookie, falls through to "system" and resolves
  it against prefers-color-scheme. Seeding storage with "system" up front only
  wrote a value that the absent-cookie default already implies.
*/
export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentAppearance = getStoredAppearance();
    applyTheme(currentAppearance);

    // Set up system theme change listener
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'system',
    );

    // Server and hydration both resolve to light; the subscription above then
    // re-renders with the real value. Deriving this inline would read matchMedia
    // during render and break hydration.
    const resolvedAppearance: ResolvedAppearance = useSyncExternalStore(
        subscribe,
        () => (isDarkMode(currentAppearance) ? 'dark' : 'light'),
        () => 'light',
    );

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;

        // Store in localStorage for client-side persistence...
        localStorage.setItem('appearance', mode);

        // Store in cookie for SSR...
        setCookie('appearance', mode);

        applyTheme(mode);
        notify();
    };

    return { appearance, resolvedAppearance, updateAppearance } as const;
}
