# Hockley Mint Notice Board — PowerPoint kiosk

A wall-mounted notice board driven by a Raspberry Pi. **There is no web app and
no login.** Your colleague edits a normal PowerPoint and saves it to a shared
drive; the Pi notices the change, converts it to slides, and updates the screen
with no reload and no black flash. The clock and weather are drawn on top in
real time, so they're never stale even if the deck is weeks old.

## How it works for the person managing it

> **Open `S:\NoticeBoard\board.pptx`, edit it in PowerPoint, and save.**
> That's the whole job. The TV updates itself within about 20 seconds.

No accounts, no uploads, no website. If they can edit a PowerPoint and press
Save, they can run the notice board. (Always keep the filename `board.pptx`.)

## How it works under the hood

```
 Manager's PC                Shared drive               Raspberry Pi
 ------------               --------------              --------------
 PowerPoint   ──save──►   S:\NoticeBoard\        mounts as /mnt/noticeboard
                          board.pptx        ◄────  watch-deck.sh polls mtime
                                                     │ (every ~20s)
                                                     ▼ on change
                                              convert-deck.sh
                                              LibreOffice: pptx → pdf
                                              poppler:    pdf  → PNG per slide
                                                     │ atomic manifest swap
                                                     ▼
                                              /opt/noticeboard/display/current/
                                                     │ served on 127.0.0.1:8080
                                                     ▼
                                              Chromium kiosk (desktop autostart)
                                              crossfades to the new deck;
                                              live clock + weather overlaid
```

Key design choices:

- **Polling, not push.** `inotify` is unreliable over SMB network shares, so we
  poll the file's modified-time. A ~20s delay is irrelevant for a notice board.
- **Atomic swap, no flash.** Conversion happens in a temp build folder while the
  old deck keeps showing. Only when every new slide image is rendered does
  `manifest.json` get swapped in. The browser preloads the new images, then
  crossfades — so updates are seamless and a reboot is the *only* time the screen
  goes black.
- **Weather is fetched server-side.** The clock is computed in-browser; the
  weather is fetched on the Pi (`fetch-weather.py` → api.met.no) into a local
  `weather.json` that the page reads. This avoids CORS and uses the Pi's allowed
  network. (This site's firewall blocks `api.open-meteo.com` but permits met.no.)
- **No CDN, no build step, no React.** The display is plain HTML/CSS/JS with the
  brand font bundled locally.

## Components

| Path | What it does |
|------|--------------|
| `display/` | The kiosk web page (vanilla JS). Carousel + crossfade + live overlay. |
| `display/config.js` | Tunables: poll interval, slide duration, overlay position, weather file. |
| `agent/watch-deck.sh` | Polls the deck on the share; calls the converter on change. |
| `agent/convert-deck.sh` | pptx → PDF → per-slide PNGs → atomic manifest swap. |
| `agent/fetch-weather.py` | Fetches weather from met.no → `weather.json` (run by a timer). |
| `agent/start-kiosk.sh` | Waits for the server, then launches Chromium kiosk (Wayland). |
| `agent/hide-cursor.sh` | Parks the mouse pointer off-screen (Wayland cursor-hide). |
| `systemd/` | server, watcher, weather (service + timer), and cage kiosk (headless fallback). |
| `setup/install.sh` | Installs and wires up everything on the Pi. |
| `setup/mount-share.md` | How to mount `S:\NoticeBoard` on the Pi. |

## Install (on the Pi)

```bash
git clone https://github.com/Ribesh19/HM_NoticeBoard.git
cd HM_NoticeBoard

# 1. Create the share credentials first (see setup/mount-share.md):
sudo tee /etc/noticeboard-smb.cred >/dev/null <<'CRED'
username=YOUR_DOMAIN_USERNAME
password=YOUR_DOMAIN_PASSWORD
domain=HOCKLEYMINT
CRED
sudo chmod 600 /etc/noticeboard-smb.cred

# 2. Run the installer (mounts the share if the creds above exist):
sudo bash pi-kiosk/setup/install.sh

# 3. Put board.pptx on the share (the starter deck works):
#    copy starter-deck/board.pptx to S:\NoticeBoard\board.pptx

# 4. Reboot - everything should come up on its own.
sudo reboot
```

The installer is idempotent — if you create the credentials *after* the first
run, just run it again and it will set up the mount.

What `install.sh` does: installs deps (LibreOffice, poppler, Chromium, cage,
cifs-utils, ydotool, fonts); creates the `noticeboard` service user; copies the
app to `/opt/noticeboard`; installs `/etc/noticeboard.env`; loads `uinput`;
enables the server, watcher and weather timer; builds + mounts the CIFS share;
and on a desktop Pi OS wires the kiosk + cursor-park into the desktop autostart
(falling back to the cage compositor on a headless Pi). It also disables screen
blanking.

## Configuring

- **Slide timing, overlay position, weather file:** edit
  `/opt/noticeboard/display/config.js`, then refresh (or reboot).
- **Deck path, poll interval, weather location, share path:** edit
  `/etc/noticeboard.env`, then `sudo systemctl restart noticeboard-watch`.

## Display: desktop autostart vs cage

- **Desktop Pi OS (default here):** the Pi auto-logs into the labwc desktop, and
  `~/.config/labwc/autostart` launches `start-kiosk.sh` (Chromium fullscreen)
  and `hide-cursor.sh`. The installer sets this up automatically.
- **Headless / appliance Pi:** if no desktop is present, the installer enables
  `noticeboard-kiosk.service`, which runs Chromium inside the `cage` compositor
  on tty1 — no desktop required, and it restarts itself if Chromium dies.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Stuck on "Waiting for today's deck" | Share mounted? `ls /mnt/noticeboard`. Is `board.pptx` there with that exact name? |
| Deck not updating | `journalctl -u noticeboard-watch -f` while you save the file — expect "change detected". |
| Mount fails (`error(13)`) | Wrong credentials. Use the short logon name (`RMaharjan`, not the email) + `domain=HOCKLEYMINT`. Check `sudo dmesg | grep CIFS`. |
| A slide looks wrong vs PowerPoint | LibreOffice renders ~95% faithfully. Embed fonts (PowerPoint → Save Options → Embed fonts); avoid exotic SmartArt. |
| Weather "unavailable" | `cat /opt/noticeboard/display/weather.json`; run `sudo systemctl start noticeboard-weather.service` and check `journalctl -u noticeboard-weather`. The board is otherwise unaffected. |
| Cursor visible | Ensure `uinput` is loaded (`lsmod | grep uinput`) and `hide-cursor.sh` is in the autostart; unplugging the mouse also stops it reappearing. |
| Kiosk not fullscreen on the desktop | `cat ~/.config/labwc/autostart` should list `start-kiosk.sh`; check `journalctl --user -u ... ` or just reboot. |

## Hiding the boot screen (optional polish)

To replace the Linux boot text with the brand logo during the few seconds of an
actual reboot, install a Plymouth splash theme. Content updates never reboot, so
this is purely cosmetic. (Ask if you want it scripted.)
