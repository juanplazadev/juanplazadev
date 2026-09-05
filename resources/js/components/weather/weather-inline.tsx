import { useWeather } from '@/hooks/use-weather';
import WeatherIcon from './weather-icon';

// The tail of the location pill: a separator, the sky, the temperature. It does
// no fetching of its own - the hook owns that - so the pill stays a pill and the
// request stays testable on its own.
export default function WeatherInline() {
    const state = useWeather();

    // A failed or unconfigured request leaves the pill exactly as it reads
    // without this component. Weather is a garnish; it never gets to show an
    // error in the middle of the hero.
    if (state.status === 'unavailable') return null;

    return (
        <>
            <span aria-hidden="true" className="text-muted-foreground/40">
                ·
            </span>
            {state.status === 'loading' ? (
                // Holds the width the temperature will need, so the centered pill does
                // not visibly resize when the value lands.
                <span
                    aria-hidden="true"
                    className="bg-muted-foreground/20 h-3 w-11 animate-pulse rounded-full"
                />
            ) : (
                <span
                    data-test="weather-reading"
                    className="inline-flex items-center gap-1.5"
                >
                    <WeatherIcon icon={state.weather.icon} />
                    <span className="tabular-nums">
                        {Math.round(state.weather.temperature)}°F
                    </span>
                    {/* The icon carries the condition visually; there is no room for the
              word, so screen readers get it here instead. */}
                    <span className="sr-only">{state.weather.condition}</span>
                </span>
            )}
        </>
    );
}
