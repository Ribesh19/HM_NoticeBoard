# Mounting the shared drive on the Pi

Your colleague saves the deck to **`S:\NoticeBoard\board.pptx`** on Windows.
`S:` is just a drive letter mapped to a network share. The Pi can't use `S:`;
it needs the share's real network path and mounts it at **`/mnt/noticeboard`**.

## 1. Find the real network path

On the Windows PC that has `S:` mapped, open a terminal and run:

```cmd
net use
```

Look at the `Remote` column for `S:`. It looks like `\\YOURSERVER\NoticeBoard`
(or `\\192.168.1.10\NoticeBoard`). The Linux form of that is:

```
//YOURSERVER/NoticeBoard
```

## 2. Store the login (read-only is enough)

The Pi only ever *reads* the deck, so use a read-only account if you have one.

```bash
sudo nano /etc/noticeboard-smb.cred
```

Put in (no quotes, no spaces around `=`):

```
username=noticeboard-ro
password=YOUR_PASSWORD
domain=YOURDOMAIN        # or WORKGROUP; omit if not on a domain
```

Lock it down:

```bash
sudo chmod 600 /etc/noticeboard-smb.cred
```

## 3. Add a mount unit (auto-mounts at boot, survives reconnects)

Create `/etc/systemd/system/mnt-noticeboard.mount` (the filename **must** match
the mount path `/mnt/noticeboard` with the slash turned into a dash):

```ini
[Unit]
Description=Notice board shared drive
After=network-online.target
Wants=network-online.target

[Mount]
What=//YOURSERVER/NoticeBoard
Where=/mnt/noticeboard
Type=cifs
Options=credentials=/etc/noticeboard-smb.cred,ro,iocharset=utf8,vers=3.0,uid=noticeboard,gid=noticeboard,file_mode=0444,dir_mode=0555,nofail,_netdev

[Install]
WantedBy=multi-user.target
```

Replace `//YOURSERVER/NoticeBoard` with the path from step 1.

Enable and mount it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mnt-noticeboard.mount
```

## 4. Verify

```bash
ls -l /mnt/noticeboard
```

You should see `board.pptx` (once it's been saved to the share). The watcher
service will pick it up within ~20 seconds and convert it.

## Notes

- **Why `vers=3.0`?** Modern Windows servers. If the mount fails, try `vers=2.1`
  (older servers) and check `journalctl -u mnt-noticeboard.mount`.
- **`nofail` + `_netdev`** mean the Pi still boots cleanly if the share is
  briefly unreachable; the kiosk keeps showing the last deck until it returns.
- **Filename** is fixed to `board.pptx` by `DECK_PATH` in `/etc/noticeboard.env`.
  Tell your colleague to always save with that exact name (overwrite each time).
