// Current conditions for the location in the hero pill, from Open-Meteo.
//
// The single seam for this feature, the way content/posts.ts is for the blog:
// the hook and the component below it know nothing about Open-Meteo's field
// names or query string. When the Spring Boot API lands and proxies this, the
// URL built in currentWeatherUrl() is the only thing that changes.
//
// No API key — Open-Meteo is open and sends Access-Control-Allow-Origin: *, so
// the browser calls it directly and the inert /api proxy stays out of it.

import { getJson } from "./http";

/** What the rest of the app sees. Open-Meteo's shape stops at this module. */
export type CurrentWeather = {
  /** Fahrenheit — the unit is requested, not converted here. */
  temperature: number;
  feelsLike: number;
  /** Percent. */
  humidity: number;
  isDay: boolean;
  /** WMO code, kept so callers can pick an icon without re-parsing the label. */
  code: number;
  condition: string;
  icon: WeatherIconKey;
  /** ISO local time of the reading, per the configured timezone. */
  observedAt: string;
};

export type WeatherIconKey = "sun" | "moon" | "cloud-sun" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "thunder";

type OpenMeteoResponse = {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    is_day: 0 | 1;
    weather_code: number;
    wind_speed_10m: number;
  };
};

// Config ------------------------------------------------------------------

type WeatherConfig = {
  latitude: number;
  longitude: number;
  timezone: string;
  apiUrl: string;
};

const DEFAULT_API_URL = "https://api.open-meteo.com/v1/forecast";

// Parsed once at module load. Null rather than a fallback coordinate: a pill
// confidently reporting the weather somewhere else is worse than a pill that
// just says "Shelton, CT", which is exactly what the component falls back to.
function readConfig(): WeatherConfig | null {
  const latitude = Number(import.meta.env.VITE_WEATHER_LATITUDE);
  const longitude = Number(import.meta.env.VITE_WEATHER_LONGITUDE);

  // Number("") is 0, so emptiness has to be rejected before finiteness or a
  // missing var silently geolocates to the Gulf of Guinea.
  if (!import.meta.env.VITE_WEATHER_LATITUDE || !import.meta.env.VITE_WEATHER_LONGITUDE) return warnAndDisable();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return warnAndDisable();

  return {
    latitude,
    longitude,
    timezone: import.meta.env.VITE_WEATHER_TIMEZONE || "auto",
    apiUrl: import.meta.env.VITE_WEATHER_API_URL || DEFAULT_API_URL,
  };
}

function warnAndDisable(): null {
  if (import.meta.env.DEV) {
    console.warn(
      "[weather] VITE_WEATHER_LATITUDE / VITE_WEATHER_LONGITUDE are missing or not numbers — " +
        "the hero pill will render without weather. See .env.example.",
    );
  }
  return null;
}

export const weatherConfig = readConfig();

// Request -----------------------------------------------------------------

function currentWeatherUrl(config: WeatherConfig): string {
  // URLSearchParams rather than a template string: it encodes the timezone's
  // slash and keeps the comma-separated `current` list readable as a list.
  const params = new URLSearchParams({
    latitude: String(config.latitude),
    longitude: String(config.longitude),
    current: ["temperature_2m", "apparent_temperature", "relative_humidity_2m", "is_day", "weather_code"].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: config.timezone,
  });

  return `${config.apiUrl}?${params}`;
}

/** Throws on network failure, timeout, or a non-2xx response. */
export async function fetchCurrentWeather(signal?: AbortSignal): Promise<CurrentWeather> {
  if (!weatherConfig) throw new Error("Weather is not configured");

  const { current } = await getJson<OpenMeteoResponse>(currentWeatherUrl(weatherConfig), { signal });
  const isDay = current.is_day === 1;
  const { condition, icon } = describeWeatherCode(current.weather_code, isDay);

  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    isDay,
    code: current.weather_code,
    condition,
    icon,
    observedAt: current.time,
  };
}

// WMO codes ---------------------------------------------------------------

// https://open-meteo.com/en/docs — the codes are sparse, so a lookup object
// beats a range ladder: every case is visible and an unknown code is a miss
// rather than whichever branch happened to catch it.
const WMO: Record<number, { condition: string; icon: WeatherIconKey }> = {
  0: { condition: "Clear", icon: "sun" },
  1: { condition: "Mainly clear", icon: "sun" },
  2: { condition: "Partly cloudy", icon: "cloud-sun" },
  3: { condition: "Overcast", icon: "cloud" },
  45: { condition: "Fog", icon: "fog" },
  48: { condition: "Freezing fog", icon: "fog" },
  51: { condition: "Light drizzle", icon: "drizzle" },
  53: { condition: "Drizzle", icon: "drizzle" },
  55: { condition: "Heavy drizzle", icon: "drizzle" },
  56: { condition: "Freezing drizzle", icon: "drizzle" },
  57: { condition: "Freezing drizzle", icon: "drizzle" },
  61: { condition: "Light rain", icon: "rain" },
  63: { condition: "Rain", icon: "rain" },
  65: { condition: "Heavy rain", icon: "rain" },
  66: { condition: "Freezing rain", icon: "rain" },
  67: { condition: "Freezing rain", icon: "rain" },
  71: { condition: "Light snow", icon: "snow" },
  73: { condition: "Snow", icon: "snow" },
  75: { condition: "Heavy snow", icon: "snow" },
  77: { condition: "Snow grains", icon: "snow" },
  80: { condition: "Light showers", icon: "rain" },
  81: { condition: "Showers", icon: "rain" },
  82: { condition: "Heavy showers", icon: "rain" },
  85: { condition: "Snow showers", icon: "snow" },
  86: { condition: "Snow showers", icon: "snow" },
  95: { condition: "Thunderstorm", icon: "thunder" },
  96: { condition: "Thunderstorm with hail", icon: "thunder" },
  99: { condition: "Thunderstorm with hail", icon: "thunder" },
};

export function describeWeatherCode(code: number, isDay: boolean): { condition: string; icon: WeatherIconKey } {
  // A code Open-Meteo adds later should degrade to a plain cloud, not crash the
  // pill or render `undefined°F`'s cousin.
  const match = WMO[code] ?? { condition: "Current conditions", icon: "cloud" as const };

  // Only the clear-sky icons have a night form; rain at 2am is still rain.
  if (!isDay && match.icon === "sun") return { ...match, icon: "moon" };
  if (!isDay && match.icon === "cloud-sun") return { ...match, icon: "cloud" };

  return match;
}
