import { Env } from '../../index';
import { 
  getYouTubeOAuthURL, 
  exchangeCodeForTokens, 
  refreshYouTubeToken, 
  revokeYouTubeToken,
  getYouTubeChannelInfo
} from './oauth';
import {
  createYouTubeBroadcast,
  bindYouTubeBroadcast,
  transitionYouTubeBroadcastToTesting,
  transitionYouTubeBroadcastToLive,
  transitionYouTubeBroadcastToComplete,
  deleteYouTubeBroadcast,
  createYouTubeStream
} from './broadcast';

/**
 * YouTube platform integration service
 */
export class YouTubeService {
  constructor(private env: Env) {}

  /**
   * Get OAuth URL for YouTube
   */
  getAuthUrl(state: string, redirectUri: string): string {
    return getYouTubeOAuthURL(state, redirectUri);
  }

  /**
   * Exchange auth code for tokens
   */
  async exchangeCode(code: string, redirectUri: string) {
    return exchangeCodeForTokens(this.env, code, redirectUri);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    return refreshYouTubeToken(this.env, refreshToken);
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string) {
    return revokeYouTubeToken(this.env, token);
  }

  /**
   * Get user's YouTube channel info
   */
  async getChannelInfo(accessToken: string) {
    return getYouTubeChannelInfo(this.env, accessToken);
  }

  /**
   * Create a YouTube live broadcast
   */
  async createBroadcast(
    accessToken: string,
    opts: {
      title: string;
      description?: string;
      scheduledStartTime?: string;
      scheduledEndTime?: string;
      privacyStatus?: 'public' | 'unlisted' | 'private';
    }
  ) {
    return createYouTubeBroadcast(accessToken, opts);
  }

  /**
   * Bind a video stream to a broadcast
   */
  async bindBroadcast(
    accessToken: string,
    broadcastId: string,
    streamId: string
  ) {
    return bindYouTubeBroadcast(accessToken, broadcastId, streamId);
  }

  /**
   * Transition broadcast to testing state
   */
  async transitionToTesting(
    accessToken: string,
    broadcastId: string
  ) {
    return transitionYouTubeBroadcastToTesting(accessToken, broadcastId);
  }

  /**
   * Transition broadcast to live state
   */
  async transitionToLive(
    accessToken: string,
    broadcastId: string
  ) {
    return transitionYouTubeBroadcastToLive(accessToken, broadcastId);
  }

  /**
   * Transition broadcast to complete state
   */
  async transitionToComplete(
    accessToken: string,
    broadcastId: string
  ) {
    return transitionYouTubeBroadcastToComplete(accessToken, broadcastId);
  }

  /**
   * Delete a broadcast
   */
  async deleteBroadcast(
    accessToken: string,
    broadcastId: string
  ) {
    return deleteYouTubeBroadcast(accessToken, broadcastId);
  }

  /**
   * Create a YouTube video stream
   */
  async createStream(
    accessToken: string,
    opts: {
      title: string;
      description?: string;
    }
  ) {
    return createYouTubeStream(accessToken, opts);
  }
}