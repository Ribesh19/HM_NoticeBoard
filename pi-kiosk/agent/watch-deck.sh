#!/usr/bin/env bash
#
# Watch the shared-drive deck for changes and reconvert when it changes.
#
# We POLL the file's mtime+size rather than using inotify on purpose: inotify
# events are not delivered reliably over CIFS/SMB network mounts, so polling is
# the correct tool here, not a workaround. A ~20s detection delay is invisible
# on a notice board.
#
# Configured entirely via environment variables (see systemd unit / setup):
#   DECK_PATH          full path to the watched .pptx on the mounted share
#   WEBROOT            kiosk web root (the folder containing index.html)
#   SLIDE_DURATION_MS  per-slide duration (default 12000)
#   POLL_SECONDS       how often to check (default 20)
set -euo pipefail

DECK_PATH="${DECK_PATH:?set DECK_PATH to the watched .pptx}"
WEBROOT="${WEBROOT:?set WEBROOT to the kiosk web root}"
SLIDE_DURATION_MS="${SLIDE_DURATION_MS:-12000}"
POLL_SECONDS="${POLL_SECONDS:-20}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log() { logger -t noticeboard "$*" 2>/dev/null || true; echo "watch-deck: $*"; }

last_sig=""
log "watching $DECK_PATH (poll ${POLL_SECONDS}s)"

while true; do
  if [[ -f "$DECK_PATH" ]]; then
    sig="$(stat -c '%Y-%s' "$DECK_PATH" 2>/dev/null || echo "")"
    if [[ -n "$sig" && "$sig" != "$last_sig" ]]; then
      log "change detected ($sig); converting"
      if "$SCRIPT_DIR/convert-deck.sh" "$DECK_PATH" "$WEBROOT" "$SLIDE_DURATION_MS"; then
        last_sig="$sig"
        log "published deck $sig"
      else
        # Leave last_sig unchanged so we retry on the next tick; the kiosk keeps
        # showing the previously published deck in the meantime.
        log "conversion failed; keeping previous deck, will retry"
      fi
    fi
  else
    log "deck not found at $DECK_PATH (share unmounted?); keeping current deck"
  fi
  sleep "$POLL_SECONDS"
done
