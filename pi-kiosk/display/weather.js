// Live clock + weather overlay.
//
// The clock is computed in-browser. The weather is read from a local
// weather.json that the Pi refreshes server-side (agent/fetch-weather.py via a
// systemd timer) - this avoids CORS and uses the Pi's allowed outbound network.
(function () {
  const cfg = window.PI_KIOSK_CONFIG || {};
  const weatherUrl = cfg.weatherUrl || "weather.json";
  const refreshMs = (cfg.weather && cfg.weather.refreshMs) || 10 * 60 * 1000;

  function startClock(timeEl, dateEl) {
    function tick() {
      const now = new Date();
      if (timeEl) timeEl.textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      if (dateEl) dateEl.textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    }
    tick();
    setInterval(tick, 1000);
  }

  function startWeather(els) {
    async function load() {
      try {
        const res = await fetch(weatherUrl + "?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("weather fetch failed");
        const w = await res.json();
        els.glyph.textContent = w.glyph || "";
        els.temp.textContent = (w.temperature == null ? "--" : w.temperature) + "°C";
        els.summary.textContent = (w.summary || "")
          + (w.wind != null ? " · wind " + w.wind + " km/h" : "");
      } catch (err) {
        els.summary.textContent = "Weather unavailable";
      }
    }
    load();
    setInterval(load, refreshMs);
  }

  window.PIKioskOverlay = { startClock, startWeather };
})();
