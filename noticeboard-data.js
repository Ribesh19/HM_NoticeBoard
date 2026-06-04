(function () {
  const STORAGE_KEY = "hm_noticeboard_slides_v1";
  const CONFIG = window.HM_NOTICEBOARD_CONFIG || {};
  const weatherCodes = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Freezing fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Showers",
    82: "Heavy showers",
    95: "Thunderstorm"
  };

  const defaultSlides = [
    {
      id: "welcome",
      enabled: true,
      sort_order: 1,
      template: "hero",
      label: "Welcome",
      eyebrow: "Today at Hockley Mint",
      title: "Good morning, co-owners",
      body: "A quick look at the notices, events, birthdays, values and useful updates for the workshop today.",
      accent: "green",
      meta_label: "Workshop hours",
      meta_value: "07:30-17:00",
      media_url: "assets/logo-full.png",
      media_type: "image"
    },
    {
      id: "announcements",
      enabled: true,
      sort_order: 2,
      template: "notice",
      label: "Announcements",
      eyebrow: "Announcements",
      title: "Annual co-owners' meeting",
      body: "All co-owners are invited to the main workshop. Agenda: FY results, Aurora collection, sustainability update and open Q&A.",
      accent: "dark",
      meta_label: "When",
      meta_value: "Friday 16 May, 15:00",
      items: ["Refreshments from 14:30", "RSVP on the kitchen sign-up sheet", "Questions welcome in advance"]
    },
    {
      id: "birthdays",
      enabled: true,
      sort_order: 3,
      template: "birthday",
      label: "Birthday",
      eyebrow: "Birthday celebration",
      title: "Happy Birthday, Aisha",
      body: "Wishing you a wonderful day from everyone at Hockley Mint. Thank you for the care and craft you bring to the workshop.",
      accent: "mint",
      meta_label: "From",
      meta_value: "Your Hockley Mint team",
      media_url: "",
      media_type: "image",
      items: []
    },
    {
      id: "events",
      enabled: true,
      sort_order: 4,
      template: "events",
      label: "Events",
      eyebrow: "Upcoming events",
      title: "This fortnight at the workshop",
      body: "Key dates and useful reminders for everyone on site.",
      accent: "green",
      items: ["08 May - Co-owners coffee, Kitchen, 09:00", "13 May - Fire drill, whole building, 11:30", "22 May - Aurora press preview, Showroom, 10:00"]
    },
    {
      id: "values",
      enabled: true,
      sort_order: 5,
      template: "image",
      label: "Company Values",
      eyebrow: "Our values",
      title: "What we stand for",
      body: "Kind to our environment. Delighted customers. Honest British craftsmanship. Happy co-owners.",
      accent: "dark",
      media_url: "assets/Values (Desktop Wallpaper).jpg",
      media_type: "image"
    },
    {
      id: "safety",
      enabled: true,
      sort_order: 6,
      template: "notice",
      label: "Health & Safety",
      eyebrow: "Safety",
      title: "Fire drill on Tuesday",
      body: "Scheduled drill for all departments. Please leave by your nearest route and meet at the east car park assembly point.",
      accent: "amber",
      meta_label: "Time",
      meta_value: "Tuesday, 11:30",
      items: ["Do not use lifts", "Take visitors with you", "Return only when cleared by Facilities"]
    },
    {
      id: "kudos",
      enabled: true,
      sort_order: 7,
      template: "people",
      label: "Kudos",
      eyebrow: "Shout-outs",
      title: "Kudos from the workshop",
      body: "Small notes of appreciation from around the business.",
      accent: "mint",
      items: ["Casting team - Q1 wedding band run shipped a day early", "CAD team - bespoke commission turned around in 48 hours", "Despatch - every next-day parcel out before cut-off"]
    },
    {
      id: "document",
      enabled: true,
      sort_order: 8,
      template: "document",
      label: "Document",
      eyebrow: "Useful document",
      title: "Brand Guidelines V2",
      body: "The latest brand guidelines are available for anyone preparing internal or customer-facing materials.",
      accent: "green",
      meta_label: "PDF",
      meta_value: "P4707 Hockley Mint Brand Guidelines V2",
      media_url: "assets/P4707 Hockley Mint Brand Guidelines V2 SINGLE.pdf",
      media_type: "pdf"
    }
  ];

  function getClient() {
    if (!CONFIG.supabaseUrl || !CONFIG.supabasePublishableKey || !window.supabase) return null;
    if (!window.__hmSupabase) {
      window.__hmSupabase = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabasePublishableKey);
    }
    return window.__hmSupabase;
  }

  function isConfigured() {
    return Boolean(getClient());
  }

  function normalizeSlide(slide, index) {
    return {
      id: slide.id || "slide-" + (index + 1),
      enabled: slide.enabled !== false,
      sort_order: Number(slide.sort_order || index + 1),
      template: slide.template || "notice",
      label: slide.label || "Slide " + (index + 1),
      eyebrow: slide.eyebrow || "",
      title: slide.title || "",
      body: slide.body || "",
      accent: slide.accent || "green",
      meta_label: slide.meta_label || "",
      meta_value: slide.meta_value || "",
      media_url: slide.media_url || "",
      media_type: slide.media_type || "",
      expires_at: slide.expires_at || "",
      items: Array.isArray(slide.items) ? slide.items : []
    };
  }

  function seedSlides() {
    return defaultSlides.map(normalizeSlide);
  }

  async function loadSlides() {
    const client = getClient();
    if (client) {
      const { data, error } = await client
        .from("noticeboard_slides")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      if (data && data.length) {
        return data.map((row, index) => normalizeSlide({ ...row.payload, id: row.id, enabled: row.enabled, sort_order: row.sort_order }, index));
      }
    }

    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed.map(normalizeSlide);
      } catch (error) {
        console.warn("Could not read saved slides", error);
      }
    }
    const seeded = seedSlides();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  async function saveSlides(slides) {
    const normalized = slides.map(normalizeSlide).sort((a, b) => a.sort_order - b.sort_order);
    const client = getClient();
    if (client) {
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData.session) {
        const rows = normalized.map((slide, index) => ({
          id: slide.id,
          enabled: slide.enabled,
          sort_order: index + 1,
          payload: { ...slide, sort_order: index + 1 }
        }));
        const { data: existing, error: existingError } = await client.from("noticeboard_slides").select("id");
        if (existingError) throw existingError;
        const nextIds = new Set(rows.map((row) => row.id));
        const staleRows = (existing || []).filter((row) => !nextIds.has(row.id));
        for (const row of staleRows) {
          const { error: deleteError } = await client.from("noticeboard_slides").delete().eq("id", row.id);
          if (deleteError) throw deleteError;
        }
        const { error } = await client.from("noticeboard_slides").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        const { error: publishError } = await client
          .from("noticeboard_publish_events")
          .upsert({
            id: "current",
            published_at: new Date().toISOString()
          }, { onConflict: "id" });
        if (publishError) throw publishError;
      } else if (!["127.0.0.1", "localhost"].includes(window.location.hostname)) {
        throw new Error("Please sign in before publishing changes.");
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("hm-slides-updated", { detail: normalized }));
    return normalized;
  }

  async function uploadMedia(file) {
    const client = getClient();
    if (client) {
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) {
        if (["127.0.0.1", "localhost"].includes(window.location.hostname)) {
          return readLocalFile(file);
        }
        throw new Error("Please sign in before uploading media.");
      }
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
      const path = Date.now() + "-" + safeName;
      const { error } = await client.storage.from(CONFIG.mediaBucket || "noticeboard-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });
      if (error) throw error;
      const { data } = client.storage.from(CONFIG.mediaBucket || "noticeboard-media").getPublicUrl(path);
      return data.publicUrl;
    }

    return readLocalFile(file);
  }

  function readLocalFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function subscribeToSlides(callback) {
    const client = getClient();
    const localHandler = (event) => callback(event.detail);
    window.addEventListener("hm-slides-updated", localHandler);

    let channel = null;
    if (client) {
      channel = client
        .channel("noticeboard-publish-events")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "noticeboard_publish_events",
          filter: "id=eq.current"
        }, async () => {
          callback(await loadSlides());
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener("hm-slides-updated", localHandler);
      if (channel) client.removeChannel(channel);
    };
  }

  async function fetchWeather() {
    const weather = CONFIG.weather || {};
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" +
      encodeURIComponent(weather.latitude || 52.4862) +
      "&longitude=" + encodeURIComponent(weather.longitude || -1.8904) +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Europe%2FLondon";
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather request failed");
    const json = await response.json();
    const current = json.current || {};
    return {
      label: weather.label || "Birmingham",
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      wind: Math.round(current.wind_speed_10m || 0),
      code: current.weather_code,
      summary: weatherCodes[current.weather_code] || "Current weather"
    };
  }

  window.HMNoticeBoard = {
    config: CONFIG,
    isConfigured,
    defaultSlides: seedSlides(),
    loadSlides,
    saveSlides,
    uploadMedia,
    subscribeToSlides,
    fetchWeather,
    getSupabaseClient: getClient
  };
})();
