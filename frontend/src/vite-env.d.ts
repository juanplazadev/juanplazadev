/// <reference types="vite/client" />

// Declared so a typo in a VITE_ name is a type error at build time rather than
// an undefined at runtime. Every value is a string: Vite substitutes them
// textually, so numbers are parsed by the module that reads them.
interface ImportMetaEnv {
  readonly VITE_WEATHER_LATITUDE: string;
  readonly VITE_WEATHER_LONGITUDE: string;
  readonly VITE_WEATHER_TIMEZONE: string;
  readonly VITE_WEATHER_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
