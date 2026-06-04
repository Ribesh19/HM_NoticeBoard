// Kiosk configuration. Edit these values on the Pi; no rebuild needed.
window.PI_KIOSK_CONFIG = {
  // Where the converter writes the slide manifest (served by the local web server).
  manifestUrl: "current/manifest.json",

  // How often the page checks for a new deck, in milliseconds.
  // The deck never reloads the page - a new deck crossfades in. 20s is plenty.
  pollMs: 20000,

  // Fallback slide duration if the deck/manifest does not specify one.
  slideDurationMs: 12000,

  // Live weather + clock overlay. Drawn by the kiosk in real time, never baked
  // into the deck, so it stays current even if the PowerPoint is weeks old.
  overlay: {
    enabled: true,
    position: "top-right",          // top-right | top-left | bottom-right | bottom-left
    showClock: true,
    showWeather: true,
    showLogo: false,                // set true to float the brand logo as well
    logoSrc: "assets/logo-full.png"
  },

  // Open-Meteo location (no API key required). Defaults to Birmingham.
  weather: {
    label: "Birmingham",
    latitude: 52.4862,
    longitude: -1.8904,
    refreshMs: 10 * 60 * 1000       // re-fetch every 10 minutes
  },

  // Branding shown while waiting for the first deck to be uploaded.
  waitingLogoSrc: "assets/logo-full.png",
  waitingMessage: "Waiting for today's deck"
};
