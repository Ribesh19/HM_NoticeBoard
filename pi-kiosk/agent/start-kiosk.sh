#!/usr/bin/env bash
#
# Launch Chromium in kiosk mode pointed at the local notice board server.
# Run by the cage compositor (see systemd/noticeboard-kiosk.service).
set -euo pipefail

URL="${KIOSK_URL:-http://127.0.0.1:8080/}"

# Pi OS Bookworm ships "chromium"; older releases ship "chromium-browser".
CHROME="$(command -v chromium-browser || command -v chromium || true)"
if [[ -z "$CHROME" ]]; then
  echo "start-kiosk: chromium not found" >&2
  exit 1
fi

# A fresh profile each boot avoids "restore session?" prompts and stale state.
PROFILE="$(mktemp -d)"

exec "$CHROME" \
  --kiosk --start-fullscreen \
  --user-data-dir="$PROFILE" \
  --noerrordialogs --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=Translate,MediaRouter \
  --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required \
  --overscroll-history-navigation=0 \
  --disable-pinch \
  --hide-scrollbars \
  "$URL"
