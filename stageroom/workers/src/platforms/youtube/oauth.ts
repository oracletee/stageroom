import { Env } from '../../index';

// YouTube OAuth2 endpoints
const GOOGLE_OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

// Scopes needed for YouTube live streaming
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload', // For managing videos and live streams
  'https://www.googleapis.com/auth/youtube.readonly', // For reading account info
  'https://www.googleapis.com/auth/youtubepartner', // For partner features
].join(' ');

/**
 * Generate the Google OAuth URL for YouTube
 */
export function getYouTubeOAuthURL(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline', // To get refresh token
    prompt: 'consent', // Always show consent screen to get refresh token
    state,
  });

  return `${GOOGLE_OAUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  env: Env,
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to exchange code for tokens: ${errorData.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshYouTubeToken(
  env: Env,
  refreshToken: string
): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to refresh token: ${errorData.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Revoke a token (access or refresh)
 */
export async function revokeYouTubeToken(
  env: Env,
  token: string
): Promise<void> {
  const params = new URLSearchParams({
    token,
  });

  const response = await fetch(`${GOOGLE_REVOKE_ENDPOINT}?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    // Note: Revoke endpoint might return 400 if token is already invalid, but we consider it success
    // For simplicity, we'll not throw on non-200, but in production we might want to check.
    console.warn('Failed to revoke token, but continuing');
  }
}

/**
 * Get user's YouTube channel info
 */
export async function getYouTubeChannelInfo(
  env: Env,
  accessToken: string
): Promise<{
  id: string;
  snippet: {
    title: string;
    description: string;
    // ... other fields
  };
}> {
  const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube channel info: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('No YouTube channel found for the authenticated user');
  }

  return data.items[0];
}