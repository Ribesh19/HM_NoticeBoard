const { useEffect, useMemo, useState } = React;
const api = window.HMNoticeBoard;

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return {
    time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    date: now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  };
}

function useWeather() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await api.fetchWeather();
        if (active) setWeather(result);
      } catch (error) {
        if (active) setWeather({ label: "Birmingham", temperature: "--", summary: "Weather unavailable", wind: "--", code: 3 });
      }
    }
    load();
    const timer = setInterval(load, 10 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return weather;
}

function App() {
  const [slides, setSlides] = useState(api.defaultSlides);
  const [active, setActive] = useState(0);
  const clock = useClock();
  const weather = useWeather();
  const enabledSlides = useMemo(() => window.HMTV.displaySlides(slides, api.defaultSlides), [slides]);
  const duration = api.config.slideDurationMs || 12000;

  useEffect(() => {
    let mounted = true;
    api.loadSlides().then((loaded) => mounted && setSlides(loaded)).catch(console.error);
    const unsubscribe = api.subscribeToSlides((loaded) => setSlides(loaded));
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (enabledSlides.length === 0) return undefined;
    const timer = setTimeout(() => setActive((index) => (index + 1) % enabledSlides.length), duration);
    return () => clearTimeout(timer);
  }, [active, duration, enabledSlides.length]);

  useEffect(() => {
    if (active >= enabledSlides.length) setActive(0);
  }, [active, enabledSlides.length]);

  return (
    <div className="tv-stage">
      <window.HMTV.TVFrame slides={enabledSlides} active={active} weather={weather} clock={clock} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
