import { Env } from '../../index';

/**
 * Upload a file to R2 bucket
 * @param env The environment bindings
 * @param fileBuffer The file content as Buffer or ArrayBuffer
 * @param key The key (path) under which to store the file in the bucket
 * @param contentType The MIME type of the file
 */
export async function uploadToR2(
  env: Env,
  fileBuffer: Buffer | ArrayBuffer,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<void> {
  // Ensure we have the R2 bucket binding
  if (!env.RECORDINGS_BUCKET) {
    throw new Error('RECORDINGS_BUCKET binding is not defined');
  }

  // Convert Buffer to ArrayBuffer if needed
  const data = fileBuffer instanceof Buffer 
    ? fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
    : fileBuffer;

  // Upload to R2
  await env.RECORDINGS_BUCKET.put(key, data, {
    httpMetadata: {
      contentType,
    },
  });
}

/**
 * Get a signed URL for downloading a file from R2 (if needed)
 * @param env The environment bindings
 * @param key The key of the file in the bucket
 * @param expiresIn Seconds until the URL expires (default: 3600)
 */
export async function getR2SignedUrl(
  env: Env,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!env.RECORDINGS_BUCKET) {
    throw new Error('RECORDINGS_BUCKET binding is not defined');
  }

  // Note: R2 doesn't natively support signed URLs in the same way as S3.
  // For private buckets, you would need to use a Worker to generate a signed URL or use Cloudflare's signed URL feature.
  // For simplicity, we'll return a direct URL if the bucket is public, but note that this is not secure.
  // In a production app, you would implement a proper signing mechanism or use a Worker to proxy the request.

  // Since we are using the bucket binding, we can only access it from Workers.
  // To share a file publicly, you would need to make the bucket public or use a Worker to serve it.
  // For this example, we'll assume the bucket is public and return the direct URL.
  // However, note: R2 does not support public buckets by default without a Worker or domain mapping.

  // Given the complexity, we'll return a placeholder and note that this needs to be implemented based on your setup.
  return `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com/${env.RECORDINGS_BUCKET}/${key}`;
}