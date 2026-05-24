#!/bin/bash
set -e

RELAY_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_FILE="${CLOUDFLARE_RELAY_FILE:-/tmp/cloudflare_relay_target}"
FFMPEG="$RELAY_DIR/ffmpeg"
RTSP_URL="rtsp://localhost:8554/${MTX_PATH:-live}"

echo "[relay] MTX_PATH=$MTX_PATH, RTSP_URL=$RTSP_URL"

if [ ! -f "$TARGET_FILE" ]; then
  echo "[relay] No relay target file found at $TARGET_FILE — skipping"
  exit 0
fi

CLOUDFLARE_URL=$(cat "$TARGET_FILE" 2>/dev/null)
if [ -z "$CLOUDFLARE_URL" ]; then
  echo "[relay] Relay target file is empty — skipping"
  exit 0
fi

echo "[relay] Relaying $RTSP_URL → $CLOUDFLARE_URL"
exec "$FFMPEG" \
  -rtsp_transport tcp \
  -reconnect 1 \
  -reconnect_at_eof 1 \
  -reconnect_streamed 1 \
  -reconnect_delay_max 10 \
  -i "$RTSP_URL" \
  -c copy \
  -f flv \
  "$CLOUDFLARE_URL"
