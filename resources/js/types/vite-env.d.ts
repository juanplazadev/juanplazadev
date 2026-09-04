/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Latitude for the hero weather pill. Unset disables the pill. */
    readonly VITE_WEATHER_LATITUDE?: string;
    readonly VITE_WEATHER_LONGITUDE?: string;
    readonly VITE_WEATHER_TIMEZONE?: string;
    readonly VITE_WEATHER_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
