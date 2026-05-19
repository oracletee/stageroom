import { Env } from '../../index';
import { uploadToR2 } from './uploadToR2';

interface RecordingOptions {
  liveInputUid: string;
  filename?: string;
  metadata?: Record<string, any>;
}

/**
 * Start recording a live input
 * Note: Cloudflare Stream automatically records live inputs when the `record` preset is used
 * or when recording is enabled in the live input configuration.
 * This function would typically be used to manage recordings after they're done.
 */
export async function startRecording(
  env: Env,
  liveInputUid: string
): Promise<void> {
  // Cloudflare Stream automatically records live inputs when they're active
  // if recording is enabled. To get the recording, you would:
  // 1. Wait for the live input to end or be disabled
  // 2. Check for the recorded video in the Stream account
  // 3. Optionally download it and store it in R2 for long-term storage
  
  // For this implementation, we'll return a promise that resolves when recording starts
  // In a real implementation, you might want to set up webhooks to be notified
  // when a recording is ready
  return new Promise((resolve) => {
    // Recording starts automatically when the live input is active
    console.log(`Recording started for live input: ${liveInputUid}`);
    resolve();
  });
}

/**
 * Get recordings for a live input
 */
export async function getLiveInputRecordings(
  env: Env,
  liveInputUid: string
): Promise<Array<{
  uid: string;
  title: string;
  created: string;
  size: number;
  playable: boolean;
  downloadURL?: string;
}>> {
  // First, we need to find videos associated with this live input
  // Cloudflare Stream doesn't have a direct API to get recordings by live input UID
  // Instead, we would typically:
  // 1. List all videos in the account
  // 2. Filter by metadata or tags that we set when creating the live input
  // 3. Or use webhooks to know when a recording is ready
  
  // For now, we'll return an empty array and note that this would be implemented
  // with proper metadata tagging or webhook handling
  console.log(`Getting recordings for live input: ${liveInputUid}`);
  
  // In a real implementation, you would:
  // 1. List videos from Stream API
  // 2. Filter by live input UID (if stored in metadata)
  // 3. Return the matching videos
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/videos?per_page=100`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(`Failed to list videos: ${data.errors.map(e => e.message).join(', ')}`);
  }

  // Filter videos that belong to this live input (if we tagged them)
  // For now, we'll return all videos but note that in production you'd filter properly
  return data.result.map((video: any) => ({
    uid: video.uid,
    title: video.title,
    created: video.created,
    size: video.size,
    playable: video.playable,
    // In a real app, you might generate a download URL or get it from Stream directly
    downloadURL: undefined
  }));
}

/**
 * Download a recording from Stream and store it in R2 for long-term storage
 */
export async function archiveRecordingToR2(
  env: Env,
  videoUid: string,
  r2Key: string
): Promise<void> {
  // Get the video from Stream
  const videoResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/videos/${videoUid}/download`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  if (!videoResponse.ok) {
    throw new Error(`Failed to download video from Stream: ${videoResponse.statusText}`);
  }

  // Get the video data as ArrayBuffer
  const videoData = await videoResponse.arrayBuffer();
  
  // Determine content type from response headers or default to video/mp4
  const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
  
  // Upload to R2
  await uploadToR2(env, videoData, r2Key, contentType);
  
  console.log(`Archived video ${videoUid} to R2 at key ${r2Key}`);
}

/**
 * Delete a recording from Stream
 */
export async function deleteRecordingFromStream(
  env: Env,
  videoUid: string
): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/videos/${videoUid}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(`Failed to delete video from Stream: ${data.errors.map(e => e.message).join(', ')}`);
  }
  
  console.log(`Deleted video ${videoUid} from Stream`);
}