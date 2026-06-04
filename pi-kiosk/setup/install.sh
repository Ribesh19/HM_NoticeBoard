#!/usr/bin/env bash
#
# One-shot installer for the Hockley Mint notice board kiosk on Raspberry Pi OS
# (Bookworm or later, 64-bit recommended). Run with sudo from a cloned repo:
#
#   sudo bash pi-kiosk/setup/install.sh
#
# It installs dependencies, a dedicated service user, the kiosk files under
# /opt/noticeboard, and three systemd services (server, watcher, kiosk).
# It does NOT mount the shared drive - see setup/mount-share.md for that.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo: sudo bash $0" >&2
  exit 1
fi

SETUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_ROOT="$(cd "$SETUP_DIR/.." && pwd)"          # the pi-kiosk/ folder
REPO_ROOT="$(cd "$SRC_ROOT/.." && pwd)"          # repo root (holds assets/)
DEST=/opt/noticeboard
SVC_USER=noticeboard

echo "==> Installing dependencies"
apt-get update -qq
apt-get install -y --no-install-recommends \
  libreoffice-impress \
  poppler-utils \
  chromium-browser chromium \
  cage \
  python3 \
  cifs-utils \
  fonts-dejavu-core fonts-liberation 2>/dev/null || \
apt-get install -y --no-install-recommends \
  libreoffice-impress poppler-utils chromium cage python3 cifs-utils fonts-liberation

echo "==> Creating service user '$SVC_USER'"
if ! id "$SVC_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$SVC_USER"
fi
# Groups cage needs to claim the seat/display on tty1.
for grp in video render input tty; do
  getent group "$grp" >/dev/null && usermod -aG "$grp" "$SVC_USER" || true
done

echo "==> Installing kiosk files to $DEST"
mkdir -p "$DEST"
cp -r "$SRC_ROOT/display" "$SRC_ROOT/agent" "$DEST/"
mkdir -p "$DEST/display/current" "$DEST/display/assets"

echo "==> Copying brand assets (logo + Arial Nova fonts)"
copy_asset() { [[ -f "$1" ]] && cp -f "$1" "$2" || echo "   (skipped missing $1)"; }
copy_asset "$REPO_ROOT/assets/logo-full.png"             "$DEST/display/assets/"
copy_asset "$REPO_ROOT/assets/union-jewel.png"           "$DEST/display/assets/"
copy_asset "$REPO_ROOT/assets/pattern-01.png"            "$DEST/display/assets/"
copy_asset "$REPO_ROOT/assets/Arial Nova Font/ArialNova-Light.ttf" "$DEST/display/assets/ArialNova-Light.ttf"
copy_asset "$REPO_ROOT/assets/Arial Nova Font/ArialNova.ttf"       "$DEST/display/assets/ArialNova.ttf"
copy_asset "$REPO_ROOT/assets/Arial Nova Font/ArialNova-Bold.ttf"  "$DEST/display/assets/ArialNova-Bold.ttf"

chmod +x "$DEST/agent/"*.sh
chown -R "$SVC_USER:$SVC_USER" "$DEST"

echo "==> Installing /etc/noticeboard.env"
if [[ ! -f /etc/noticeboard.env ]]; then
  cp "$SETUP_DIR/noticeboard.env.example" /etc/noticeboard.env
  echo "   Created /etc/noticeboard.env - review DECK_PATH and SLIDE_DURATION_MS."
else
  echo "   /etc/noticeboard.env already exists; leaving it untouched."
fi

echo "==> Creating share mount point /mnt/noticeboard"
mkdir -p /mnt/noticeboard

echo "==> Installing systemd services"
cp "$SRC_ROOT/systemd/"*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable noticeboard-server.service noticeboard-watch.service noticeboard-kiosk.service

cat <<'NEXT'

==> Base install complete.

Two things remain before you start the services:

  1. Mount the shared drive so the Pi can see the deck.
     Follow setup/mount-share.md (you will need your file server's name and
     a read-only login). The deck must end up at /mnt/noticeboard/board.pptx.

  2. Put a board.pptx on the share (the starter deck in this repo will do).

Then start everything:

     sudo systemctl start noticeboard-server noticeboard-watch noticeboard-kiosk

Check status / logs with:

     systemctl status noticeboard-watch
     journalctl -u noticeboard-watch -f

NEXT
