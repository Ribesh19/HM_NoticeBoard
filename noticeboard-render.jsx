(function () {
  const { useEffect, useRef, useState } = React;

  function weatherIconClass(code) {
    if (code === 0) return "wi-day-sunny";
    if ([1, 2].includes(code)) return "wi-day-cloudy";
    if (code === 3) return "wi-cloudy";
    if ([45, 48].includes(code)) return "wi-fog";
    if ([51, 53, 55].includes(code)) return "wi-sprinkle";
    if ([61, 63, 65, 80, 81, 82].includes(code)) return "wi-rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "wi-snow";
    if ([95, 96, 99].includes(code)) return "wi-thunderstorm";
    return "wi-cloud";
  }

  function Media({ slide, allowEmpty = true }) {
    if (!slide.media_url) {
      if (!allowEmpty) return null;
      return (
        <div className={"tv-media-empty accent-" + slide.accent}>
          <img src="assets/union-jewel.png" alt="" />
          <span>{slide.label}</span>
        </div>
      );
    }

    if (slide.media_type === "pdf" || slide.media_url.toLowerCase().includes(".pdf")) {
      return (
        <div className="tv-pdf-panel">
          <div className="tv-pdf-sheet">
            <div className="tv-pdf-corner">PDF</div>
            <h2>{slide.title}</h2>
            <p>{slide.body}</p>
            <div className="tv-pdf-link">{slide.media_url.split("/").pop()}</div>
          </div>
        </div>
      );
    }

    return <img className="tv-media-img" src={slide.media_url} alt="" />;
  }

  function SlideItems({ slide }) {
    if (!slide.items || slide.items.length === 0) return null;
    return (
      <div className="tv-item-grid">
        {slide.items.slice(0, 6).map((item, index) => (
          <div className="tv-item" key={index}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    );
  }

  function HeroSlide({ slide }) {
    return (
      <section className={"tv-slide tv-hero accent-" + slide.accent}>
        <div className="tv-hero-copy">
          <div className="tv-eyebrow">{slide.eyebrow}</div>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
          {(slide.meta_label || slide.meta_value) && (
            <div className="tv-hero-meta">
              <span>{slide.meta_label}</span>
              <strong>{slide.meta_value}</strong>
            </div>
          )}
        </div>
        <div className="tv-hero-media">
          <Media slide={slide} />
        </div>
      </section>
    );
  }

  function ImageSlide({ slide }) {
    return (
      <section className="tv-slide tv-image-slide">
        <Media slide={slide} />
        <div className="tv-image-caption">
          <div className="tv-eyebrow">{slide.eyebrow}</div>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
        </div>
      </section>
    );
  }

  function ContentSlide({ slide }) {
    return (
      <section className={"tv-slide tv-content accent-" + slide.accent}>
        <div className="tv-content-main">
          <div className="tv-eyebrow">{slide.eyebrow}</div>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
          {(slide.meta_label || slide.meta_value) && (
            <div className="tv-content-meta">
              <span>{slide.meta_label}</span>
              <strong>{slide.meta_value}</strong>
            </div>
          )}
        </div>
        <SlideItems slide={slide} />
      </section>
    );
  }

  function PeopleSlide({ slide }) {
    return (
      <section className={"tv-slide tv-people accent-" + slide.accent}>
        <div className="tv-slide-heading">
          <div className="tv-eyebrow">{slide.eyebrow}</div>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
        </div>
        <div className="tv-people-list">
          {(slide.items || []).slice(0, 6).map((item, index) => (
            <article className="tv-person" key={index}>
              <div className="tv-person-badge">{item.charAt(0)}</div>
              <div>{item}</div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function BirthdaySlide({ slide }) {
    const hasPhoto = Boolean(slide.media_url && slide.media_type !== "pdf");
    return (
      <section className={"tv-slide tv-birthday accent-" + slide.accent + (hasPhoto ? " has-photo" : " no-photo")}>
        {hasPhoto && (
          <div className="tv-birthday-photo">
            <Media slide={slide} allowEmpty={false} />
          </div>
        )}
        <div className="tv-birthday-copy">
          <div className="tv-eyebrow">{slide.eyebrow || "Birthday"}</div>
          <h1>{slide.title || "Happy Birthday"}</h1>
          <p>{slide.body || "Wishing you a wonderful day from everyone at Hockley Mint."}</p>
          {(slide.meta_label || slide.meta_value) && (
            <div className="tv-birthday-meta">
              <span>{slide.meta_label}</span>
              <strong>{slide.meta_value}</strong>
            </div>
          )}
        </div>
      </section>
    );
  }

  function DocumentSlide({ slide }) {
    return (
      <section className={"tv-slide tv-document accent-" + slide.accent}>
        <div className="tv-document-copy">
          <div className="tv-eyebrow">{slide.eyebrow}</div>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
          <div className="tv-content-meta">
            <span>{slide.meta_label || "Document"}</span>
            <strong>{slide.meta_value || "Available on request"}</strong>
          </div>
        </div>
        <Media slide={slide} />
      </section>
    );
  }

  function SlideView({ slide }) {
    if (slide.template === "hero") return <HeroSlide slide={slide} />;
    if (slide.template === "image") return <ImageSlide slide={slide} />;
    if (slide.template === "people") return <PeopleSlide slide={slide} />;
    if (slide.template === "birthday") return <BirthdaySlide slide={slide} />;
    if (slide.template === "document") return <DocumentSlide slide={slide} />;
    return <ContentSlide slide={slide} />;
  }

  function FrameHeader({ weather, clock }) {
    return (
      <header className="tv-header">
        <div className="tv-brand">
          <img src="assets/logo-full.png" alt="Hockley Mint" className="tv-logo" />
        </div>
        <div className="tv-header-meta">
          <div className="tv-weather">
            <div className="tv-meta-kicker">{weather ? weather.label : "Weather"}</div>
            <div className="tv-weather-row">
              {weather && <i className={"wi " + weatherIconClass(weather.code)} aria-hidden="true"></i>}
              <div className="tv-weather-main">{weather ? `${weather.temperature}C` : "..."}</div>
            </div>
            <div className="tv-meta-small">{weather ? `${weather.summary} - wind ${weather.wind} km/h` : "Loading live weather"}</div>
          </div>
          <div className="tv-clock">
            <div className="tv-time">{clock.time}</div>
            <div className="tv-date">{clock.date}</div>
          </div>
        </div>
      </header>
    );
  }

  function Progress({ slides, active }) {
    return (
      <div className="tv-progress">
        {slides.map((slide, index) => (
          <span key={slide.id} className={index === active ? "is-active" : ""} />
        ))}
      </div>
    );
  }

  function Footer({ activeSlide }) {
    return (
      <footer className="tv-footer">
        <div className="tv-footer-label">Useful info</div>
        <div className="tv-footer-track">
          <span>Despatch cut-off 15:30</span>
          <span>Visitor sign-in at reception</span>
          <span>First aiders listed in the kitchen</span>
          <span>Values: environment, customers, craftsmanship, co-owners</span>
        </div>
        <div className="tv-slide-count">{activeSlide}</div>
      </footer>
    );
  }

  function TVFrame({ slides, active = 0, weather, clock }) {
    const currentSlides = slides.length ? slides : window.HMNoticeBoard.defaultSlides.slice(0, 1);
    const activeIndex = Math.min(active, currentSlides.length - 1);
    const count = `${String(activeIndex + 1).padStart(2, "0")} / ${String(currentSlides.length).padStart(2, "0")}`;
    return (
      <div className="tv-frame">
        <FrameHeader weather={weather} clock={clock} />
        <main className="tv-main">
          {currentSlides.map((slide, index) => (
            <div key={slide.id} className={"tv-slide-wrap " + (index === activeIndex ? "is-active" : "")}>
              <SlideView slide={slide} />
            </div>
          ))}
        </main>
        <Progress slides={currentSlides} active={activeIndex} />
        <Footer activeSlide={count} />
      </div>
    );
  }

  function ScaledTVFrame({ slides, active = 0, weather, clock }) {
    const boxRef = useRef(null);
    const [scale, setScale] = useState(0.25);

    useEffect(() => {
      if (!boxRef.current) return undefined;
      const resize = () => {
        const rect = boxRef.current.getBoundingClientRect();
        setScale(Math.min(rect.width / 1920, rect.height / 1080));
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(boxRef.current);
      return () => observer.disconnect();
    }, []);

    return (
      <div className="tv-scaled-frame" ref={boxRef}>
        <div className="tv-scaled-inner" style={{ transform: `scale(${scale})` }}>
          <TVFrame slides={slides} active={active} weather={weather} clock={clock} />
        </div>
      </div>
    );
  }

  function isExpired(slide, now = new Date()) {
    return Boolean(slide.expires_at && new Date(slide.expires_at).getTime() <= now.getTime());
  }

  function effectiveSlide(slide, defaults, now = new Date()) {
    if (!isExpired(slide, now)) return slide;
    const match = defaults.find((item) => item.id === slide.id);
    return match ? { ...match, sort_order: slide.sort_order, id: slide.id } : null;
  }

  function displaySlides(slides, defaults, now = new Date()) {
    return slides
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((slide) => effectiveSlide(slide, defaults, now))
      .filter((slide) => slide && slide.enabled !== false);
  }

  window.HMTV = {
    weatherIconClass,
    SlideView,
    TVFrame,
    ScaledTVFrame,
    displaySlides,
    effectiveSlide,
    isExpired
  };
})();
