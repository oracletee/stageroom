/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUDFLARE_ACCOUNT_ID: string;
  readonly VITE_STREAM_PLAYBACK_DOMAIN: string;
  readonly VITE_LIVEKIT_URL: string;
  readonly VITE_LIVEKIT_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
