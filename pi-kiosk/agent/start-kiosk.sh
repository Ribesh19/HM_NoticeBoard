#!/usr/bin/env bash
#
# Launch Chromium in kiosk mode pointed at the local notice board server.
# On Raspberry Pi OS (desktop / labwc), this is run from the desktop session
# autostart (~/.config/labwc/autostart). It waits for the local web server to
# come up first, so it never loads a blank page during boot.
set -euo pipefail

URL="${KIOSK_URL:-http://127.0.0.1:8080/}"

# Pi OS Bookworm ships "chromium"; older releases ship "chromium-browser".
CHROME="$(command -v chromium-browser || command -v chromium || true)"
if [[ -z "$CHROME" ]]; then
  echo "start-kiosk: chromium not found" >&2
  exit 1
fi

# Wait (up to ~60s) for the web server to answer before opening the browser.
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "$URL"; then break; fi
  sleep 1
done

# A fresh profile each boot avoids "restore session?" prompts and stale state.
PROFILE="$(mktemp -d)"

exec "$CHROME" \
  --kiosk --start-fullscreen \
  --ozone-platform=wayland \
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
