# Hockley Mint Notice Board

Two separate entry points are provided:

- `Notice Board.html` - the Raspberry Pi / TV display.
- `Notice Board (web).html` - the management portal for slide editing.

The app uses the bundled Arial Nova font from `assets/Arial Nova Font`.

## Local Run

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open:

- TV: `http://127.0.0.1:4173/Notice%20Board.html`
- Manager: `http://127.0.0.1:4173/Notice%20Board%20(web).html`

If Supabase is not configured, the manager uses local browser storage for demo testing.

## Supabase Setup

1. Create or choose a Supabase project.
2. Run `supabase/noticeboard_schema.sql` in the SQL editor or apply it as a migration.
3. Create the personnel accounts in Supabase Auth.
4. Bootstrap each approved manager in SQL:

```sql
insert into public.noticeboard_admins (user_id, email)
select id, email
from auth.users
where email = 'person@example.com';
```

5. Add the public project values to `config.js`:

```js
window.HM_NOTICEBOARD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabasePublishableKey: "YOUR_PUBLISHABLE_KEY",
  mediaBucket: "noticeboard-media",
  weather: {
    label: "Birmingham",
    latitude: 52.4862,
    longitude: -1.8904
  },
  slideDurationMs: 12000
};
```

This workspace is currently configured for project `HM_NoticeBoard`:

- URL: `https://brovwkaluklwrytistke.supabase.co`
- Bucket: `noticeboard-media`

Never place a Supabase service role key in `config.js`.

## Publishing

The management portal does not poll the TV. When a manager clicks `Publish changes`, the portal upserts the eight slide rows and updates the single `noticeboard_publish_events` row. The TV keeps one Supabase Realtime WebSocket subscription open to that row and reloads slide data only when the publish event changes.

## Weather

The TV header calls Open-Meteo directly for current Birmingham weather. No API key is required. Weather icons come from the open-source Weather Icons stylesheet, with Open-Meteo numeric weather codes mapped to sunny, cloudy, rain, snow, fog, and storm icons.

## Local Demo

When Supabase is configured, the management page requires Supabase Auth. For local visual QA only, `http://127.0.0.1:4173/Notice%20Board%20(web).html?demo=1` opens the manager without signing in. The bypass is limited to `localhost` / `127.0.0.1`, keeps uploads in browser memory, and does not publish to Supabase.

## Raspberry Pi

Serve this folder with any static web server, then launch Chromium in kiosk mode to the TV URL. The TV view is fixed to a 1920x1080 frame and scales to the display without vertical scrolling.
