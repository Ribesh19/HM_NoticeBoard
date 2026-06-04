// Wires the live clock/weather/logo overlay onto the page, per config.
(function () {
  const cfg = window.PI_KIOSK_CONFIG || {};
  const o = cfg.overlay || {};
  const root = document.getElementById("overlay");
  if (!root || !o.enabled) return;

  root.className = "overlay pos-" + (o.position || "top-right");

  if (o.showLogo && o.logoSrc) {
    const img = document.createElement("img");
    img.className = "overlay-logo";
    img.src = o.logoSrc;
    img.alt = "";
    root.appendChild(img);
  }

  let timeEl, dateEl, glyphEl, tempEl, summaryEl;

  if (o.showClock) {
    const clock = document.createElement("div");
    clock.className = "overlay-clock";
    timeEl = document.createElement("div");
    timeEl.className = "overlay-time";
    dateEl = document.createElement("div");
    dateEl.className = "overlay-date";
    clock.appendChild(timeEl);
    clock.appendChild(dateEl);
    root.appendChild(clock);
  }

  if (o.showWeather) {
    const wx = document.createElement("div");
    wx.className = "overlay-weather";
    glyphEl = document.createElement("div");
    glyphEl.className = "overlay-glyph";
    const text = document.createElement("div");
    text.className = "overlay-weather-text";
    tempEl = document.createElement("div");
    tempEl.className = "overlay-temp";
    tempEl.textContent = "--°C";
    summaryEl = document.createElement("div");
    summaryEl.className = "overlay-summary";
    summaryEl.textContent = cfg.weather ? cfg.weather.label : "";
    text.appendChild(tempEl);
    text.appendChild(summaryEl);
    wx.appendChild(glyphEl);
    wx.appendChild(text);
    root.appendChild(wx);
  }

  const api = window.PIKioskOverlay;
  if (api) {
    if (o.showClock) api.startClock(timeEl, dateEl);
    if (o.showWeather) api.startWeather({ glyph: glyphEl, temp: tempEl, summary: summaryEl });
  }
})();
