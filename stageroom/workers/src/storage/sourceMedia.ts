import { Env } from '../db/schema';

export async function uploadSourceMedia(env: Env, file: ArrayBuffer, contentType: string): Promise<string> {
  const ext = contentType.split('/')[1] || 'bin';
  const key = `source-media/${crypto.randomUUID()}.${ext}`;
  await env.R2.put(key, file, { httpMetadata: { contentType } });
  return key;
}

export async function getSourceMedia(env: Env, key: string): Promise<{ body: ReadableStream; contentType: string } | null> {
  const obj = await env.R2.get(key);
  if (!obj) return null;
  return {
    body: obj.body,
    contentType: obj.httpMetadata?.contentType || 'application/octet-stream',
  };
}
