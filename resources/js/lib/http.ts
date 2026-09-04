// The app's only network entry point. Everything that talks to a server goes
// through here so timeouts, abort composition and error shape are decided once
// rather than per caller. No dependency: fetch is already in every target
// browser, and a client class would be ceremony around a single function.

export class HttpError extends Error {
    constructor(
        readonly status: number,
        readonly url: string,
    ) {
        super(`${status} from ${url}`);
        this.name = 'HttpError';
    }
}

type GetJsonOptions = {
    /** Caller's abort signal, typically an effect cleanup. */
    signal?: AbortSignal;
    timeoutMs?: number;
};

export async function getJson<T>(
    url: string,
    { signal, timeoutMs = 8000 }: GetJsonOptions = {},
): Promise<T> {
    // Composed rather than chosen: the caller's signal cancels on unmount, the
    // timeout cancels a request that is merely hanging. Without the second one a
    // dead socket leaves a component in its loading state indefinitely.
    const timeout = AbortSignal.timeout(timeoutMs);
    const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;

    const response = await fetch(url, {
        signal: composed,
        headers: { Accept: 'application/json' },
    });

    // Checked before parsing, because an error response is usually HTML and the
    // JSON.parse failure would report a syntax error instead of the real status.
    if (!response.ok) throw new HttpError(response.status, url);

    return (await response.json()) as T;
}
