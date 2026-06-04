#!/usr/bin/env bash
#
# Park the mouse pointer in the far bottom-right corner so it isn't visible on
# the wall display. Wayland/labwc has no simple "hide cursor" option; a large
# relative move (clamped to the screen edge) is the robust, common approach.
#
# Requires the uinput kernel module (loaded via /etc/modules-load.d/uinput.conf)
# and ydotool. Run from the desktop session autostart.
sleep 8
# ydotool needs root to open /dev/uinput (no daemon needed for a one-shot move).
sudo ydotool mousemove --delay 1000 10000 10000
