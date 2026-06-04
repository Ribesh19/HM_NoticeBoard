#!/usr/bin/env bash
#
# One-shot installer for the Hockley Mint notice board kiosk on Raspberry Pi OS
# (Bookworm, 64-bit). Run from a cloned repo as the desktop user:
#
#   sudo bash pi-kiosk/setup/install.sh
#
# It is idempotent - safe to re-run. It installs dependencies, a service user,
# the kiosk files under /opt/noticeboard, the systemd services, the weather
# updater, cursor-hiding, screen-blanking-off, and (if the share credentials
# exist) the CIFS mount. On a desktop Pi OS it runs the kiosk via the desktop
# session autostart; on a headless Pi it falls back to the cage compositor.
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

# The human/desktop user (for the desktop-session autostart).
DESK_USER="${SUDO_USER:-}"
if [[ -z "$DESK_USER" || "$DESK_USER" == "root" ]]; then
  DESK_USER="$(awk -F'--autologin ' '/--autologin/{print $2}' \
    /etc/systemd/system/getty@tty1.service.d/autologin.conf 2>/dev/null | awk '{print $1}')"
fi

echo "==> Installing dependencies"
apt-get update -qq
apt-get install -y --no-install-recommends \
  libreoffice-impress poppler-utils \
  chromium chromium-browser cage \
  python3 cifs-utils \
  fonts-dejavu-core fonts-liberation \
  ydotool grim 2>/dev/null || \
apt-get install -y --no-install-recommends \
  libreoffice-impress poppler-utils chromium cage python3 cifs-utils \
  fonts-liberation ydotool grim

echo "==> Creating service user '$SVC_USER'"
if ! id "$SVC_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$SVC_USER"
fi
for grp in video render input tty; do
  getent group "$grp" >/dev/null && usermod -aG "$grp" "$SVC_USER" || true
done

echo "==> Installing kiosk files to $DEST"
mkdir -p "$DEST"
cp -r "$SRC_ROOT/display" "$SRC_ROOT/agent" "$DEST/"
mkdir -p "$DEST/display/current" "$DEST/display/assets"

echo "==> Copying brand assets (logo + Arial Nova fonts + pattern)"
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
  echo "   Created /etc/noticeboard.env - review it."
else
  echo "   /etc/noticeboard.env already exists; leaving it untouched."
fi
# shellcheck disable=SC1091
source /etc/noticeboard.env

echo "==> Enabling the uinput module (needed by ydotool to park the cursor)"
echo uinput > /etc/modules-load.d/uinput.conf
modprobe uinput 2>/dev/null || true

echo "==> Installing systemd units"
cp "$SRC_ROOT/systemd/"*.service "$SRC_ROOT/systemd/"*.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable noticeboard-server.service noticeboard-watch.service \
                 noticeboard-weather.timer >/dev/null

echo "==> Share mount point ${MOUNT_POINT:-/mnt/noticeboard}"
MOUNT_POINT="${MOUNT_POINT:-/mnt/noticeboard}"
mkdir -p "$MOUNT_POINT"
if [[ -n "${SMB_SHARE:-}" && -f "${SMB_CRED:-/etc/noticeboard-smb.cred}" ]]; then
  MOUNT_UNIT="$(systemd-escape -p --suffix=mount "$MOUNT_POINT")"
  cat > "/etc/systemd/system/$MOUNT_UNIT" <<UNIT
[Unit]
Description=Notice board shared drive
After=network-online.target
Wants=network-online.target

[Mount]
What=$SMB_SHARE
Where=$MOUNT_POINT
Type=cifs
Options=credentials=$SMB_CRED,ro,iocharset=utf8,vers=3.0,uid=$SVC_USER,gid=$SVC_USER,file_mode=0444,dir_mode=0555,nofail,_netdev

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable --now "$MOUNT_UNIT" >/dev/null 2>&1 && echo "   mounted $SMB_SHARE" \
    || echo "   mount unit installed but mount failed - check credentials / dmesg"
else
  echo "   No credentials yet. Create $SMB_CRED (see setup/mount-share.md), then re-run."
fi

# ---- display: desktop autostart (preferred) vs cage (headless fallback) ----
if systemctl is-enabled lightdm >/dev/null 2>&1 || command -v labwc >/dev/null; then
  echo "==> Desktop detected - running kiosk via the desktop session autostart"
  if [[ -z "$DESK_USER" ]]; then
    echo "   ! Could not determine the desktop user. Re-run with: sudo bash $0"
  else
    USER_HOME="$(getent passwd "$DESK_USER" | cut -d: -f6)"
    AUTO="$USER_HOME/.config/labwc/autostart"
    sudo -u "$DESK_USER" mkdir -p "$USER_HOME/.config/labwc"
    if [[ ! -f "$AUTO" && -f /etc/xdg/labwc/autostart ]]; then
      sudo -u "$DESK_USER" cp /etc/xdg/labwc/autostart "$AUTO"
    fi
    sudo -u "$DESK_USER" touch "$AUTO"
    grep -q 'start-kiosk.sh' "$AUTO" || echo "$DEST/agent/start-kiosk.sh &" | sudo -u "$DESK_USER" tee -a "$AUTO" >/dev/null
    grep -q 'hide-cursor.sh' "$AUTO" || echo "$DEST/agent/hide-cursor.sh &" | sudo -u "$DESK_USER" tee -a "$AUTO" >/dev/null
    echo "   autostart configured for $DESK_USER"
  fi
  # let the desktop user run ydotool without a password (for cursor parking)
  echo "$DESK_USER ALL=(root) NOPASSWD: /usr/bin/ydotool" > /etc/sudoers.d/noticeboard-ydotool
  chmod 440 /etc/sudoers.d/noticeboard-ydotool
  systemctl disable noticeboard-kiosk.service >/dev/null 2>&1 || true
else
  echo "==> No desktop - enabling the cage kiosk service"
  systemctl enable noticeboard-kiosk.service >/dev/null
fi

echo "==> Disabling screen blanking"
command -v raspi-config >/dev/null && raspi-config nonint do_blanking 1 || echo "   (raspi-config not found; set blanking off manually)"

cat <<NEXT

==> Install complete.

If the share is mounted (check: ls $MOUNT_POINT), put board.pptx on it and
either reboot, or start the services now:

  sudo systemctl start noticeboard-server noticeboard-watch noticeboard-weather.service

A reboot is the best test - everything should come up on its own.

Useful checks:
  systemctl status noticeboard-watch
  journalctl -u noticeboard-watch -f
  cat $DEST/display/weather.json

NEXT
