import { Env } from './schema';

async function hmacSha256(key: Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

function base64UrlEncode(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(str: string): string {
  return base64UrlEncode(new TextEncoder().encode(str));
}

export async function generateLiveKitToken(env: Env, options: {
  identity: string;
  room: string;
  name?: string;
  isHost?: boolean;
  expiresIn?: number;
}): Promise<string> {
  const { identity, room, name, isHost = false, expiresIn = 3600 } = options;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);

  const payload: any = {
    exp: now + expiresIn,
    iss: env.LIVEKIT_API_KEY,
    nbf: 0,
    sub: identity,
    video: {
      room,
      roomJoin: true,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: isHost,
      roomAdmin: isHost,
    },
  };

  if (name) {
    payload.name = name;
  }

  const headerEncoded = base64UrlEncodeString(JSON.stringify(header));
  const payloadEncoded = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${headerEncoded}.${payloadEncoded}`;

  const keyBytes = new TextEncoder().encode(env.LIVEKIT_API_SECRET);
  const signature = await hmacSha256(keyBytes, signingInput);
  const signatureEncoded = base64UrlEncode(signature);

  return `${signingInput}.${signatureEncoded}`;
}
