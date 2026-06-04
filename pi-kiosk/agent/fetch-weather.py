#!/usr/bin/env python3
"""Fetch current weather server-side on the Pi and write it to weather.json
in the kiosk web root.

Done on the Pi (not in the browser) because:
  - it avoids CORS entirely (the kiosk reads a same-origin local file), and
  - it uses the Pi's allowed outbound internet. (This network blocks
    api.open-meteo.com but permits api.met.no.)

Configured via environment (see /etc/noticeboard.env):
  WEATHER_LAT, WEATHER_LON, WEATHER_LABEL, WEATHER_OUT
"""
import json
import os
import urllib.request

LAT = os.environ.get("WEATHER_LAT", "52.4862")
LON = os.environ.get("WEATHER_LON", "-1.8904")
LABEL = os.environ.get("WEATHER_LABEL", "Birmingham")
OUT = os.environ.get("WEATHER_OUT", "/opt/noticeboard/display/weather.json")

# met.no requires an identifying User-Agent (their terms of service).
UA = "HockleyMintNoticeBoard/1.0 (github.com/Ribesh19/HM_NoticeBoard)"


def glyph_and_summary(symbol):
    s = (symbol or "").lower()
    if "thunder" in s:
        return "⛈️", "Thunderstorm"
    if "snow" in s or "sleet" in s:
        return "\U0001f328️", "Snow"
    if "rain" in s or "showers" in s:
        return "\U0001f327️", "Rain"
    if "fog" in s:
        return "\U0001f32b️", "Fog"
    if "partlycloudy" in s:
        return "⛅", "Partly cloudy"
    if "cloudy" in s:
        return "☁️", "Cloudy"
    if "fair" in s:
        return "\U0001f324️", "Fair"
    if "clearsky" in s or "clear" in s:
        return "☀️", "Clear sky"
    return "☁️", "Current weather"


def main():
    url = ("https://api.met.no/weatherapi/locationforecast/2.0/compact"
           f"?lat={LAT}&lon={LON}")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.load(resp)

    entry = data["properties"]["timeseries"][0]["data"]
    details = entry["instant"]["details"]
    temperature = round(details.get("air_temperature"))
    wind_kmh = round(details.get("wind_speed", 0) * 3.6)
    symbol = (entry.get("next_1_hours", {}).get("summary", {}).get("symbol_code")
              or entry.get("next_6_hours", {}).get("summary", {}).get("symbol_code"))
    glyph, summary = glyph_and_summary(symbol)

    out = {
        "label": LABEL,
        "temperature": temperature,
        "wind": wind_kmh,
        "summary": summary,
        "glyph": glyph,
    }
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f)
    os.replace(tmp, OUT)  # atomic
    print("weather:", out)


if __name__ == "__main__":
    main()
