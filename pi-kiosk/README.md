# Hockley Mint Notice Board — PowerPoint kiosk

A wall-mounted notice board driven by a Raspberry Pi. **There is no web app and
no login.** Your colleague edits a normal PowerPoint and saves it to a shared
drive; the Pi notices the change, converts it to slides, and updates the screen
with no reload and no black flash. Live weather and the clock are drawn on top
in real time, so they're never stale even if the deck is weeks old.

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
                                              Chromium kiosk (via cage)
                                              crossfades to the new deck,
                                              live clock + weather overlaid
```

Key design choices:

- **Polling, not push.** `inotify` is unreliable over SMB network shares, so we
  poll the file's modified-time. A ~20s delay is irrelevant for a notice board.
- **Atomic swap, no flash.** Conversion happens in a temp build folder while the
  old deck keeps showing. Only when every new slide image is rendered does the
  `manifest.json` get swapped in. The browser preloads the new images, then
  crossfades — so updates are seamless and reboots are the *only* time the
  screen ever goes black (and even that can be hidden behind a boot splash).
- **No CDN, no build step, no React.** The display is plain HTML/CSS/JS with the
  brand font bundled locally, so it works with no internet (except the weather
  call, which fails quietly).

## Components

| Path | What it does |
|------|--------------|
| `display/` | The kiosk web page (vanilla JS). Carousel + crossfade + live overlay. |
| `display/config.js` | Tunables: poll interval, slide duration, overlay position, weather location. |
| `agent/watch-deck.sh` | Polls the deck on the share; calls the converter on change. |
| `agent/convert-deck.sh` | pptx → PDF → per-slide PNGs → atomic manifest swap. |
| `agent/start-kiosk.sh` | Launches Chromium with kiosk flags. |
| `systemd/` | Three services: local server, watcher, kiosk. |
| `setup/install.sh` | Installs everything to `/opt/noticeboard`. |
| `setup/mount-share.md` | How to mount `S:\NoticeBoard` on the Pi. |

## Install (on the Pi)

```bash
git clone https://github.com/Ribesh19/HM_NoticeBoard.git
cd HM_NoticeBoard
sudo bash pi-kiosk/setup/install.sh
```

Then:

1. Mount the shared drive — follow [`setup/mount-share.md`](setup/mount-share.md)
   so the deck lands at `/mnt/noticeboard/board.pptx`.
2. Put a `board.pptx` on the share (use the starter deck in
   [`../starter-deck/`](../starter-deck/) to avoid a blank start).
3. Start it:

```bash
sudo systemctl start noticeboard-server noticeboard-watch noticeboard-kiosk
```

Reboot to confirm it all comes up on its own. From now on, power-cycling the Pi
always recovers it.

## Configuring

- **Slide timing, weather location, overlay position:** edit
  `/opt/noticeboard/display/config.js`, then refresh (or reboot).
- **Deck path / poll interval / duration:** edit `/etc/noticeboard.env`, then
  `sudo systemctl restart noticeboard-watch`.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Screen stuck on "Waiting for today's deck" | Is the share mounted? `ls /mnt/noticeboard`. Is `board.pptx` there with that exact name? |
| Deck not updating | `journalctl -u noticeboard-watch -f` while you save the file — you should see "change detected". |
| A slide looks wrong vs PowerPoint | LibreOffice renders ~95% faithfully. Embed fonts in the deck (PowerPoint → Save Options → Embed fonts) and avoid exotic SmartArt. |
| Black screen on tty1 | `systemctl status noticeboard-kiosk`; confirm `cage` and `chromium` installed and the `noticeboard` user is in the `video`/`render`/`input`/`tty` groups. |
| Weather shows "unavailable" | The Pi has no internet, or Open-Meteo is unreachable. The rest of the board is unaffected. |

## Alternative: desktop autostart instead of cage

If you prefer to run on the full Pi OS desktop, skip the kiosk service and add
`start-kiosk.sh` to the desktop session's autostart instead
(`~/.config/wayfire.ini` `[autostart]` on Wayland, or
`~/.config/lxsession/LXDE-pi/autostart` on X). The `cage` approach is
recommended because it needs no desktop and restarts itself if Chromium dies.

## Hiding the boot screen (optional polish)

To replace the Linux boot text with the brand logo, install a Plymouth splash
theme. This only affects the few seconds during an actual reboot; content
updates never reboot. (Left as an optional extra; ask if you want it scripted.)
