// Live weather + clock overlay. Dependency-free: icons are inline, the only
// network call is to Open-Meteo, and it degrades quietly if that fails.
(function () {
  const cfg = window.PI_KIOSK_CONFIG || {};
  const weather = cfg.weather || {};

  const weatherCodes = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Freezing fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow",
    80: "Rain showers", 81: "Showers", 82: "Heavy showers",
    95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm"
  };

  // Plain Unicode glyphs - no webfont, no CDN.
  function weatherGlyph(code) {
    if (code === 0) return "☀️";                       // sunny
    if ([1, 2].includes(code)) return "⛅";                  // partly cloudy
    if (code === 3) return "☁️";                       // overcast
    if ([45, 48].includes(code)) return "🌫️";    // fog
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️"; // rain
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️"; // snow
    if ([95, 96, 99].includes(code)) return "⛈️";      // storm
    return "☁️";
  }

  function startClock(timeEl, dateEl) {
    function tick() {
      const now = new Date();
      if (timeEl) timeEl.textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      if (dateEl) dateEl.textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    }
    tick();
    setInterval(tick, 1000);
  }

  async function fetchWeather() {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" +
      encodeURIComponent(weather.latitude || 52.4862) +
      "&longitude=" + encodeURIComponent(weather.longitude || -1.8904) +
      "&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FLondon";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("weather request failed");
    const json = await res.json();
    const c = json.current || {};
    return {
      temperature: Math.round(c.temperature_2m),
      wind: Math.round(c.wind_speed_10m || 0),
      code: c.weather_code,
      summary: weatherCodes[c.weather_code] || "Current weather"
    };
  }

  function startWeather(els) {
    async function load() {
      try {
        const w = await fetchWeather();
        els.glyph.textContent = weatherGlyph(w.code);
        els.temp.textContent = (Number.isNaN(w.temperature) ? "--" : w.temperature) + "°C";
        els.summary.textContent = w.summary + " · wind " + w.wind + " km/h";
      } catch (err) {
        els.summary.textContent = "Weather unavailable";
      }
    }
    load();
    setInterval(load, weather.refreshMs || 10 * 60 * 1000);
  }

  window.PIKioskOverlay = { startClock, startWeather, weatherGlyph };
})();
