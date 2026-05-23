/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOAA_USER_AGENT?: string;
  readonly VITE_ACCUWEATHER_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
