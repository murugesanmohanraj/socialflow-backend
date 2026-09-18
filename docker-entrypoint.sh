#!/bin/bash
set -e

echo "Starting Xvfb..."

Xvfb :99 -screen 0 1920x1080x24 -ac > /tmp/xvfb.log 2>&1 &
XVFB_PID=$!

export DISPLAY=:99

echo "DISPLAY=$DISPLAY"
echo "Xvfb PID=$XVFB_PID"

echo "Waiting for X server..."

for i in {1..20}; do
  if xdpyinfo -display :99 >/dev/null 2>&1; then
    echo "X server is ready!"
    break
  fi

  sleep 0.5
done

if ! xdpyinfo -display :99 >/dev/null 2>&1; then
  echo "X server FAILED"
  echo "=== Xvfb log ==="
  cat /tmp/xvfb.log || true
  exit 1
fi

echo "=== Display information ==="
xdpyinfo -display :99 | head -20

echo "=== Starting Node ==="

exec node dist/server.js
