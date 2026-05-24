#!/bin/bash
set -e

RELAY_DIR="$(cd "$(dirname "$0")" && pwd)"
MTX_CONFIG="$RELAY_DIR/mediamtx.yml"
MTX_BIN="$RELAY_DIR/mediamtx"
TARGET_SERVER="$RELAY_DIR/target-server.py"

# Clean up stale relay target from previous run
rm -f /tmp/cloudflare_relay_target

echo "[start-relay] Starting target server..."
python3 "$TARGET_SERVER" &
TARGET_PID=$!
echo "[start-relay] Target server PID: $TARGET_PID"

# Trap SIGINT/SIGTERM to kill both processes
trap "echo '[start-relay] Shutting down...'; kill $TARGET_PID 2>/dev/null; exit 0" SIGINT SIGTERM

echo "[start-relay] Starting MediaMTX with config $MTX_CONFIG"
"$MTX_BIN" "$MTX_CONFIG"
MTX_EXIT=$?

kill $TARGET_PID 2>/dev/null
exit $MTX_EXIT
