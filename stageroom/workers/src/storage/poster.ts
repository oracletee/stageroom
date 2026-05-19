import { Env } from './db/schema';

export async function uploadPoster(env: Env, eventId: string, file: ArrayBuffer, contentType: string): Promise<string> {
  const key = `posters/${eventId}/${crypto.randomUUID()}.${contentType.split('/')[1] || 'jpg'}`;

  await env.R2.put(key, file, {
    httpMetadata: { contentType },
  });

  return `${env.R2_PUBLIC_URL}/${key}`;
}

export async function deletePoster(env: Env, url: string): Promise<void> {
  const key = url.replace(`${env.R2_PUBLIC_URL}/`, '');
  await env.R2.delete(key);
}
