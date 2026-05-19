import { Env } from '../index';

interface CloudflareStreamResponse {
  result: any;
  success: boolean;
  errors: any[];
  messages: any[];
}

interface LiveInput {
  uid: string;
  url: string;
  token: string;
  // Add other properties as needed
}

/**
 * Create a live input via Cloudflare Stream API
 */
export async function createLiveInput(
  env: Env,
  opts: { name?: string; profile?: string } = {}
): Promise<LiveInput> {
  const { name = 'Livestream', profile = 'low_latency' } = opts;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        profile,
        // We can add more settings here
      }),
    }
  );

  const data: CloudflareStreamResponse = await response.json();

  if (!data.success) {
    throw new Error(`Failed to create live input: ${data.errors.map(e => e.message).join(', ')}`);
  }

  return data.result;
}

/**
 * List live inputs
 */
export async function listLiveInputs(env: Env): Promise<LiveInput[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  const data: CloudflareStreamResponse = await response.json();

  if (!data.success) {
    throw new Error(`Failed to list live inputs: ${data.errors.map(e => e.message).join(', ')}`);
  }

  return data.result;
}

/**
 * Get a live input by UID
 */
export async function getLiveInput(env: Env, uid: string): Promise<LiveInput> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${uid}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  const data: CloudflareStreamResponse = await response.json();

  if (!data.success) {
    throw new Error(`Failed to get live input: ${data.errors.map(e => e.message).join(', ')}`);
  }

  return data.result;
}

/**
 * Delete a live input by UID
 */
export async function deleteLiveInput(env: Env, uid: string): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${uid}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  const data: CloudflareStreamResponse = await response.json();

  if (!data.success) {
    throw new Error(`Failed to delete live input: ${data.errors.map(e => e.message).join(', ')}`);
  }
}