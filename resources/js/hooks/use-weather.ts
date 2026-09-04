import { useEffect, useState } from 'react';

import type { CurrentWeather } from '@/lib/weather';
import { fetchCurrentWeather, weatherConfig } from '@/lib/weather';

// Open-Meteo stamps `interval: 900` on every reading, so polling faster than
// fifteen minutes just re-downloads a payload that has not changed.
const REFRESH_MS = 15 * 60 * 1000;

type WeatherState =
    | { status: 'loading' }
    | { status: 'ready'; weather: CurrentWeather }
    // One state for "no config" and "request failed": the pill treats both the
    // same way, and the distinction only matters to the dev-mode warning.
    | { status: 'unavailable' };

export function useWeather(): WeatherState {
    const [state, setState] = useState<WeatherState>(() =>
        weatherConfig ? { status: 'loading' } : { status: 'unavailable' },
    );

    useEffect(() => {
        if (!weatherConfig) return;

        // Recreated per request rather than shared, so aborting a refresh does not
        // poison the controller the next one would use.
        let controller: AbortController | null = null;

        const load = async () => {
            controller?.abort();
            controller = new AbortController();

            try {
                const weather = await fetchCurrentWeather(controller.signal);
                setState({ status: 'ready', weather });
            } catch (error) {
                // StrictMode mounts twice in development, so the first request is
                // always aborted. Treating that as a failure would blank the pill on
                // every dev reload; a real failure still falls through.
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                )
                    return;
                setState({ status: 'unavailable' });
            }
        };

        void load();
        const interval = window.setInterval(() => void load(), REFRESH_MS);

        // A laptop reopened the next morning has a timer that never fired while
        // suspended, so the reading on screen can be hours stale until the interval
        // catches up. Refreshing on the way back into view closes that gap.
        const onVisible = () => {
            if (document.visibilityState === 'visible') void load();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            controller?.abort();
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    return state;
}
