/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUDFLARE_ACCOUNT_ID: string;
  readonly VITE_STREAM_PLAYBACK_DOMAIN: string;
  readonly VITE_LIVEKIT_URL: string;
  readonly VITE_LIVEKIT_TOKEN: string;
  readonly VITE_RELAY_WHIP_URL: string;
  readonly VITE_RELAY_TARGET_URL: string;
  readonly VITE_STUN_SERVER_1: string;
  readonly VITE_STUN_SERVER_2: string;
  readonly VITE_STUN_SERVER_3: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Insertable Streams API — not yet in TypeScript's DOM lib
declare class MediaStreamTrackGenerator extends MediaStreamTrack {
  constructor(init: { kind: 'video' | 'audio' });
  readonly writable: WritableStream<VideoFrame | AudioData>;
}

declare class VideoFrame {
  constructor(image: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | ImageBitmap | VideoFrame, init: { timestamp: number; duration?: number; codedWidth?: number; codedHeight?: number });
  readonly timestamp: number;
  readonly duration: number | null;
  readonly codedWidth: number | null;
  readonly codedHeight: number | null;
  close(): void;
}
