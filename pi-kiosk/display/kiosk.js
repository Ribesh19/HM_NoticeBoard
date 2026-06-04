// Notice board kiosk carousel.
//
// Two design goals drive everything here:
//   1. No reload, ever. The page stays alive; a new deck crossfades in.
//   2. No black/blank frame. New slide images are fully preloaded before they
//      are shown, and the deck only swaps once the new images are ready.
(function () {
  const cfg = window.PI_KIOSK_CONFIG || {};

  const layers = [document.getElementById("layer-a"), document.getElementById("layer-b")];
  const waiting = document.getElementById("waiting");
  let front = 0;                 // index into `layers` currently shown
  let idx = 0;                   // current slide within the deck
  let advanceTimer = null;
  let deck = { version: null, slides: [], durationMs: cfg.slideDurationMs || 12000 };

  // Resolve a manifest-relative slide path against the manifest's own folder.
  function slideUrl(rel) {
    const base = cfg.manifestUrl.replace(/[^/]*$/, "");
    return base + rel;
  }

  function preload(urls) {
    return Promise.all(urls.map((u) => new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = u;
    })));
  }

  // Crossfade the given image url onto the back layer, then bring it to front.
  function show(url) {
    const back = layers[1 - front];
    back.style.backgroundImage = 'url("' + url + '")';
    back.classList.add("is-visible");
    layers[front].classList.remove("is-visible");
    front = 1 - front;
  }

  function scheduleNext() {
    clearTimeout(advanceTimer);
    if (deck.slides.length <= 1) return;
    advanceTimer = setTimeout(() => {
      idx = (idx + 1) % deck.slides.length;
      show(deck.slides[idx]);
      scheduleNext();
    }, deck.durationMs);
  }

  async function applyDeck(manifest) {
    const urls = (manifest.slides || []).map(slideUrl);
    if (!urls.length) return;            // ignore an empty deck; keep showing what we have
    await preload(urls);                 // guarantee no missing-image flash
    deck = {
      version: manifest.version,
      slides: urls,
      durationMs: manifest.durationMs || cfg.slideDurationMs || 12000
    };
    idx = 0;
    if (waiting) waiting.classList.add("is-hidden");
    show(deck.slides[0]);                // crossfade straight to the new deck
    scheduleNext();
  }

  async function poll() {
    try {
      const res = await fetch(cfg.manifestUrl + "?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const manifest = await res.json();
        if (manifest && manifest.version !== deck.version) {
          await applyDeck(manifest);
        }
      }
    } catch (err) {
      // Network/converter hiccup: keep displaying the current deck untouched.
    }
    setTimeout(poll, cfg.pollMs || 20000);
  }

  poll();
})();
