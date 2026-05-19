import { Env } from '../../index';

/**
 * Create a YouTube live broadcast
 * Note: This requires the YouTube Data API v3
 */
export async function createYouTubeBroadcast(
  accessToken: string,
  opts: {
    title: string;
    description?: string;
    scheduledStartTime?: string; // ISO 8601 format
    scheduledEndTime?: string;   // ISO 8601 format
    privacyStatus?: 'public' | 'unlisted' | 'private';
  }
): Promise<{
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    // ... other fields
  };
  status: {
    lifeCycleStatus: string;
    privacyStatus: string;
    // ... other fields
  };
  contentDetails: {
    boundStreamId: string;
    boundStreamLastUpdateTimeMs: string;
    // ... other fields
  };
}> {
  const params = new URLSearchParams({
    part: 'snippet,status,contentDetails',
  });

  const requestBody = {
    snippet: {
      title: opts.title,
      description: opts.description || '',
      scheduledStartTime: opts.scheduledStartTime,
      scheduledEndTime: opts.scheduledEndTime,
    },
    status: {
      privacyStatus: opts.privacyStatus || 'private',
      selfDeclaredMadeForKids: false, // Default value
    },
    // contentDetails can be empty for now, API will populate boundStreamId
  };

  const response = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create YouTube broadcast: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Bind a video stream to a broadcast
 */
export async function bindYouTubeBroadcast(
  accessToken: string,
  broadcastId: string,
  streamId: string
): Promise<void> {
  const params = new URLSearchParams({
    part: 'id',
    id: broadcastId,
    streamId,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to bind YouTube broadcast: ${errorData.error?.message || response.statusText}`);
  }
}

/**
 * Transition broadcast to testing state
 */
export async function transitionYouTubeBroadcastToTesting(
  accessToken: string,
  broadcastId: string
): Promise<void> {
  const params = new URLSearchParams({
    part: 'status',
    id: broadcastId,
    broadcastStatus: 'testing',
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to transition YouTube broadcast to testing: ${errorData.error?.message || response.statusText}`);
  }
}

/**
 * Transition broadcast to live state
 */
export async function transitionYouTubeBroadcastToLive(
  accessToken: string,
  broadcastId: string
): Promise<void> {
  const params = new URLSearchParams({
    part: 'status',
    id: broadcastId,
    broadcastStatus: 'live',
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to transition YouTube broadcast to live: ${errorData.error?.message || response.statusText}`);
  }
}

/**
 * Transition broadcast to complete state
 */
export async function transitionYouTubeBroadcastToComplete(
  accessToken: string,
  broadcastId: string
): Promise<void> {
  const params = new URLSearchParams({
    part: 'status',
    id: broadcastId,
    broadcastStatus: 'complete',
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to transition YouTube broadcast to complete: ${errorData.error?.message || response.statusText}`);
  }
}

/**
 * Delete a broadcast
 */
export async function deleteYouTubeBroadcast(
  accessToken: string,
  broadcastId: string
): Promise<void> {
  const params = new URLSearchParams({
    id: broadcastId,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts?${params.toString()}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to delete YouTube broadcast: ${errorData.error?.message || response.statusText}`);
  }
}

/**
 * Create a YouTube video stream (returns stream key and ingestion address)
 */
export async function createYouTubeStream(
  accessToken: string,
  opts: {
    title: string;
    description?: string;
  }
): Promise<{
  id: string;
  snippet: {
    title: string;
    description: string;
  };
  cdn: {
    ingestionInfo: {
      streamName: string; // This is the stream key
      ingestionAddress: string; // RTMP ingestion address
      backupIngestionAddress: string; // Backup RTMP address
    };
  };
}> {
  const params = new URLSearchParams({
    part: 'snippet,cdn',
  });

  const requestBody = {
    snippet: {
      title: opts.title,
      description: opts.description || '',
    },
    cdn: {
      // YouTube will automatically choose the ingestion format
      // We could specify format here if needed
    },
  };

  const response = await fetch(`https://www.googleapis.com/youtube/v3/liveStreams?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create YouTube stream: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
}