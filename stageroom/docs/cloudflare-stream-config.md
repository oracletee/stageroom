# Cloudflare Stream Configuration

## Overview
This document outlines the configuration for Cloudflare Stream in the LiveStream Platform.

## Required Settings
- **Account ID**: Your Cloudflare account ID
- **API Token**: With permissions for Stream (Video Editing, Video Upload, etc.)

## Stream Settings for Live Ingest
When creating a live input via the Stream API, use these settings:

```json
{
  "profile": "low_latency", // or "live" depending on needs
  "playback": {
    "hls": true,
    "dash": false
  },
  "thumbnail": {
    "timestamps": [0]
  }
}
```

## API Endpoints Used
- **Create Live Input**: `POST https://api.cloudflare.com/client/v4/accounts/:account_id/stream/live_inputs`
- **List Live Inputs**: `GET https://api.cloudflare.com/client/v4/accounts/:account_id/stream/live_inputs`
- **Get Live Input**: `GET https://api.cloudflare.com/client/v4/accounts/:account_id/stream/live_inputs/:input_id`
- **Delete Live Input**: `DELETE https://api.cloudflare.com/client/v4/accounts/:account_id/stream/live_inputs/:input_id`

## Webhooks
Configure webhooks for:
- `live_input.created`
- `live_input.updated`
- `live_input.deleted`
- `video.ready` (when a recording is ready)

## Environment Variables for Workers
In your Cloudflare Workers, set these secrets:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## Example Wrangler Configuration for Secrets
```toml
[vars]
  # These are set as secrets in the Cloudflare dashboard
  # CLOUDFLARE_ACCOUNT_ID = "your_account_id"
  # CLOUDFLARE_API_TOKEN = "your_api_token"
```