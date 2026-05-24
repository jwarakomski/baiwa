/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOAA_USER_AGENT?: string;
  readonly VITE_ACCUWEATHER_API_KEY?: string;
  readonly VITE_DONATE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
