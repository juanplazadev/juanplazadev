import { useCallback, useEffect, useRef, useState } from 'react';

type RenderOptions = {
    sitekey: string;
    callback: (token: string) => void;
    'error-callback'?: () => void;
    'expired-callback'?: () => void;
    'before-interactive-callback'?: () => void;
    appearance?: 'always' | 'execute' | 'interaction-only';
    theme?: 'auto' | 'light' | 'dark';
    size?: 'normal' | 'flexible' | 'compact';
};

type TurnstileApi = {
    render: (container: HTMLElement, options: RenderOptions) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const SCRIPT_SRC =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/*
  One script tag for the whole page, shared by every caller and never removed.
  Cloudflare's api.js registers globals and is not written to be loaded twice,
  and a dialog that mounts and unmounts would otherwise fetch it on every open.
*/
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
    if (scriptPromise) {
        return scriptPromise;
    }

    scriptPromise = new Promise<void>((resolve, reject) => {
        if (window.turnstile) {
            resolve();

            return;
        }

        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => {
            // Cleared so a later attempt can retry rather than being handed a
            // permanently rejected promise.
            scriptPromise = null;
            reject(new Error('Turnstile failed to load.'));
        };
        document.head.append(script);
    });

    return scriptPromise;
}

type UseTurnstileOptions = {
    /** Null switches the widget off entirely - see services.turnstile in config. */
    siteKey: string | null;
    /** Render only while the form is on screen. */
    active: boolean;
    theme?: RenderOptions['theme'];
};

/**
 * Runs a Turnstile challenge for one form.
 *
 * `interaction-only` keeps the widget invisible for the overwhelming majority
 * of visitors who pass silently, and shows a checkbox only when Cloudflare
 * actually wants one - which is what lets the dialog stay the size it is.
 *
 * A token is single use. `reset` exists so a rejected submit can ask for a
 * fresh one instead of replaying a token the server has already refused.
 */
export function useTurnstile({ siteKey, active, theme }: UseTurnstileOptions) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [interactive, setInteractive] = useState(false);

    // Off unless a site key was shared, so an unconfigured install behaves as
    // though the feature does not exist rather than blocking every submit.
    const enabled = siteKey !== null && siteKey !== '';

    useEffect(() => {
        if (!enabled || !active) {
            return;
        }

        let cancelled = false;

        loadScript()
            .then(() => {
                if (cancelled || !containerRef.current || !window.turnstile) {
                    return;
                }

                widgetRef.current = window.turnstile.render(
                    containerRef.current,
                    {
                        sitekey: siteKey,
                        appearance: 'interaction-only',
                        size: 'flexible',
                        theme: theme ?? 'auto',
                        callback: (value) => {
                            setFailed(false);
                            setInteractive(false);
                            setToken(value);
                        },
                        // Fires when Cloudflare gives up on passing silently
                        // and puts a checkbox on screen. Worth knowing about:
                        // "still verifying" is the wrong thing to tell someone
                        // who is actually being asked to click something.
                        'before-interactive-callback': () =>
                            setInteractive(true),
                        'error-callback': () => setFailed(true),
                        // A token expires after a few minutes. Dropping it is
                        // what makes the next submit wait for a fresh one
                        // rather than send one the server will reject.
                        'expired-callback': () => setToken(null),
                    },
                );
            })
            .catch(() => setFailed(true));

        return () => {
            cancelled = true;
            setToken(null);
            setInteractive(false);

            if (widgetRef.current && window.turnstile) {
                window.turnstile.remove(widgetRef.current);
                widgetRef.current = null;
            }
        };
    }, [enabled, active, siteKey, theme]);

    const reset = useCallback(() => {
        setToken(null);
        setInteractive(false);

        if (widgetRef.current && window.turnstile) {
            window.turnstile.reset(widgetRef.current);
        }
    }, []);

    return {
        containerRef,
        /** The single-use token, or null while one is still being minted. */
        token,
        /** True once Cloudflare is switched on and has not yet handed one over. */
        pending: enabled && token === null && !failed,
        /** Cloudflare is showing a checkbox and is waiting on the visitor. */
        interactive,
        failed,
        enabled,
        reset,
    };
}
