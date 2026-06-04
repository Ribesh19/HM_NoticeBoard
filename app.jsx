const { useEffect, useMemo, useState } = React;
const api = window.HMNoticeBoard;

const Icon = {
  publish: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/><path d="M5 5v14"/></svg>,
  upload: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>,
  tv: () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>,
  logout: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17 15 12 10 7"/><path d="M15 12H3"/><path d="M14 4h5v16h-5"/></svg>,
  plus: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>,
  trash: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>,
  grip: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h.01"/><path d="M15 5h.01"/><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M9 19h.01"/><path d="M15 19h.01"/></svg>
};

const previewWeather = { label: "Birmingham", temperature: 8, summary: "Overcast", wind: 12, code: 3 };
const previewClock = { time: "10:24", date: "Wednesday, 6 May 2026" };

function Login({ onDemo }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = api.isConfigured();

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const client = api.getSupabaseClient();
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message || "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login">
      <section className="login-panel">
        <img src="assets/logo-full.png" alt="Hockley Mint" />
        <h1>Notice board manager</h1>
        <p>Sign in to manage the TV carousel slides, text, images and documents.</p>
        {configured ? (
          <form onSubmit={signIn}>
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
          </form>
        ) : (
          <div className="setup-note">
            <strong>Supabase is not configured yet.</strong>
            <span>Add your Supabase URL and publishable key in config.js. Local demo mode is enabled so you can test the workflow now.</span>
            <button className="primary" onClick={onDemo}>Use local demo mode</button>
          </div>
        )}
      </section>
    </main>
  );
}

function TopBar({ user, onLogout, status, onPublish, demo }) {
  return (
    <header className="admin-topbar">
      <div className="admin-brand">
        <img src="assets/union-jewel.png" alt="" />
        <div>
          <strong>Hockley Mint Notice Board</strong>
          <span>{demo ? "Local demo mode" : "Connected to Supabase"}</span>
        </div>
      </div>
      <div className="admin-actions">
        <span className={"save-state " + (status === "Published" ? "is-saved" : "")}>{status}</span>
        <a className="ghost-link" href="Notice Board.html" target="_blank"><Icon.tv /> TV view</a>
        <button className="primary" onClick={onPublish}><Icon.publish /> Publish changes</button>
        {user && <button className="icon-button" onClick={onLogout} title="Sign out"><Icon.logout /></button>}
      </div>
    </header>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function newId(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}

function createSlide(template, sortOrder) {
  const base = {
    id: newId(template),
    enabled: true,
    sort_order: sortOrder,
    template,
    label: "New slide",
    eyebrow: "Notice",
    title: "New notice",
    body: "Add the message you want to show on the TV.",
    accent: "green",
    meta_label: "",
    meta_value: "",
    media_url: "",
    media_type: "",
    expires_at: "",
    items: []
  };

  if (template === "birthday") {
    return {
      ...base,
      label: "Birthday",
      eyebrow: "Birthday celebration",
      title: "Happy Birthday",
      body: "Wishing you a wonderful day from everyone at Hockley Mint.",
      accent: "mint",
      meta_label: "From",
      meta_value: "Your Hockley Mint team",
      media_type: "image"
    };
  }

  if (template === "image") return { ...base, label: "Image slide", eyebrow: "Feature", title: "Image feature", body: "Add a caption for this image.", media_type: "image" };
  if (template === "document") return { ...base, label: "Document", eyebrow: "Document", title: "Document notice", body: "Add a short summary for this PDF.", media_type: "pdf", meta_label: "PDF", meta_value: "Document" };
  if (template === "events") return { ...base, label: "Events", eyebrow: "Upcoming events", title: "What's coming up", items: ["Date - Event, location, time"] };
  return base;
}

function formatDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  return value ? new Date(value).toISOString() : "";
}

function statusFor(slide) {
  if (!slide.enabled) return "Hidden";
  if (window.HMTV.isExpired(slide)) return "Expired";
  return "Live";
}

function SlideRailItem({ slide, selected, index, onSelect, onToggle, onDragStart, onDragOver, onDrop }) {
  const state = statusFor(slide);
  return (
    <button
      className={"rail-slide " + (selected ? "is-selected " : "") + (state !== "Live" ? "is-inactive" : "")}
      onClick={onSelect}
      draggable
      onDragStart={(event) => onDragStart(event, slide.id)}
      onDragOver={(event) => onDragOver(event, slide.id)}
      onDrop={(event) => onDrop(event, slide.id)}
    >
      <span className="rail-index">{index + 1}</span>
      <span className="rail-grip"><Icon.grip /></span>
      <span className="rail-copy">
        <strong>{slide.label || slide.title}</strong>
        <small>{slide.template} - {state}</small>
      </span>
      <input
        type="checkbox"
        checked={slide.enabled}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onToggle(event.target.checked)}
        aria-label="Show slide"
      />
    </button>
  );
}

function DeckPreview({ slide, activeIndex, total }) {
  const previewSlide = window.HMTV.effectiveSlide(slide, api.defaultSlides) || slide;
  const inactive = statusFor(slide) !== "Live";
  return (
    <section className={"preview-stage " + (inactive ? "is-inactive" : "")}>
      <div className="preview-toolbar">
        <div>
          <span>TV preview</span>
          <strong>Slide {activeIndex + 1} of {total}</strong>
        </div>
        <em>{inactive ? `${statusFor(slide)} - TV uses default or skips this slide` : "Live slide design"}</em>
      </div>
      <window.HMTV.ScaledTVFrame slides={[previewSlide]} active={0} weather={previewWeather} clock={previewClock} />
    </section>
  );
}

function Editor({ slide, onChange, onUpload, onDelete }) {
  if (!slide) return null;
  const itemText = (slide.items || []).join("\n");
  return (
    <aside className="editor">
      <div className="editor-head">
        <div>
          <span>Editing</span>
          <strong>{slide.label || slide.title}</strong>
        </div>
        <button className="danger-button" onClick={onDelete}><Icon.trash /> Delete</button>
      </div>
      <div className="editor-grid">
        <div className="editor-switch-row">
          <label className="toggle-row">
            <input type="checkbox" checked={slide.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
            <span>Show on TV</span>
          </label>
          <span className={"status-pill " + statusFor(slide).toLowerCase()}>{statusFor(slide)}</span>
        </div>
        <div className="two-cols">
          <Field label="Slide name"><input value={slide.label} onChange={(e) => onChange({ label: e.target.value })} /></Field>
          <Field label="Template">
            <select value={slide.template} onChange={(e) => onChange({ template: e.target.value })}>
              <option value="hero">Hero</option>
              <option value="notice">Notice</option>
              <option value="events">Events</option>
              <option value="people">People / list</option>
              <option value="birthday">Birthday</option>
              <option value="image">Full image</option>
              <option value="document">Document</option>
            </select>
          </Field>
        </div>
        <div className="two-cols">
          <Field label="Accent">
            <select value={slide.accent} onChange={(e) => onChange({ accent: e.target.value })}>
              <option value="green">Green</option>
              <option value="dark">Dark</option>
              <option value="mint">Mint</option>
              <option value="amber">Amber</option>
            </select>
          </Field>
          <Field label="Expires automatically" hint="After this time, the TV falls back to the default slide or skips custom slides.">
            <input type="datetime-local" value={formatDateTimeLocal(slide.expires_at)} onChange={(e) => onChange({ expires_at: fromDateTimeLocal(e.target.value) })} />
          </Field>
        </div>
        <Field label="Eyebrow"><input value={slide.eyebrow} onChange={(e) => onChange({ eyebrow: e.target.value })} /></Field>
        <Field label={slide.template === "birthday" ? "Birthday headline" : "Title"}>
          <input value={slide.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field label={slide.template === "birthday" ? "Personal message" : "Body"}>
          <textarea rows="5" value={slide.body} onChange={(e) => onChange({ body: e.target.value })} />
        </Field>
        <div className="two-cols">
          <Field label={slide.template === "birthday" ? "Sign-off label" : "Meta label"}>
            <input value={slide.meta_label} onChange={(e) => onChange({ meta_label: e.target.value })} />
          </Field>
          <Field label={slide.template === "birthday" ? "Sign-off" : "Meta value"}>
            <input value={slide.meta_value} onChange={(e) => onChange({ meta_value: e.target.value })} />
          </Field>
        </div>
        <Field label="List items">
          <textarea rows="5" value={itemText} onChange={(e) => onChange({ items: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Media URL">
          <input value={slide.media_url} onChange={(e) => onChange({ media_url: e.target.value })} />
        </Field>
        <div className="upload-row">
          <label className="upload-button">
            <Icon.upload />
            Upload image or PDF
            <input type="file" accept="image/*,application/pdf" onChange={onUpload} />
          </label>
          <select value={slide.media_type} onChange={(e) => onChange({ media_type: e.target.value })}>
            <option value="">Auto</option>
            <option value="image">Image</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>
    </aside>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const localDemoAllowed = ["127.0.0.1", "localhost"].includes(window.location.hostname) && new URLSearchParams(window.location.search).has("demo");
  const [demo, setDemo] = useState(!api.isConfigured() || localDemoAllowed);
  const [slides, setSlides] = useState(api.defaultSlides);
  const [selectedId, setSelectedId] = useState(api.defaultSlides[0].id);
  const [status, setStatus] = useState("Loading");
  const [view, setView] = useState("storyboard");
  const [newTemplate, setNewTemplate] = useState("notice");
  const [dragId, setDragId] = useState("");

  useEffect(() => {
    const client = api.getSupabaseClient();
    if (!client) return undefined;

    client.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user && !demo) return;
    api.loadSlides()
      .then((loaded) => {
        setSlides(loaded);
        setSelectedId((current) => loaded.some((slide) => slide.id === current) ? current : loaded[0]?.id);
        setStatus("Loaded");
      })
      .catch((error) => setStatus(error.message || "Load failed"));
  }, [user, demo]);

  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.sort_order - b.sort_order), [slides]);
  const selectedIndex = Math.max(0, orderedSlides.findIndex((slide) => slide.id === selectedId));
  const selected = orderedSlides[selectedIndex] || orderedSlides[0];

  function setOrdered(nextSlides) {
    setStatus("Unsaved changes");
    setSlides(nextSlides.map((slide, index) => ({ ...slide, sort_order: index + 1 })));
  }

  function patchSlide(id, patch) {
    setStatus("Unsaved changes");
    setSlides((current) => current.map((slide) => slide.id === id ? { ...slide, ...patch } : slide));
  }

  function addSlide() {
    const next = createSlide(newTemplate, orderedSlides.length + 1);
    setOrdered([...orderedSlides, next]);
    setSelectedId(next.id);
  }

  function deleteSelected() {
    if (!selected || orderedSlides.length <= 1) return;
    const next = orderedSlides.filter((slide) => slide.id !== selected.id);
    setOrdered(next);
    setSelectedId(next[Math.min(selectedIndex, next.length - 1)].id);
  }

  function moveDragged(targetId) {
    if (!dragId || dragId === targetId) return;
    const from = orderedSlides.findIndex((slide) => slide.id === dragId);
    const to = orderedSlides.findIndex((slide) => slide.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...orderedSlides];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrdered(next);
  }

  async function publish() {
    setStatus("Publishing");
    try {
      const published = await api.saveSlides(orderedSlides.map((slide, index) => ({ ...slide, sort_order: index + 1 })));
      setSlides(published);
      setStatus("Published");
    } catch (error) {
      setStatus(error.message || "Publish failed");
    }
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file || !selected) return;
    setStatus("Uploading");
    try {
      const url = await api.uploadMedia(file);
      patchSlide(selected.id, { media_url: url, media_type: file.type === "application/pdf" ? "pdf" : "image" });
      setStatus("Unsaved changes");
    } catch (error) {
      setStatus(error.message || "Upload failed");
    } finally {
      event.target.value = "";
    }
  }

  async function logout() {
    const client = api.getSupabaseClient();
    if (client) await client.auth.signOut();
  }

  if (!user && !demo) return <Login onDemo={() => setDemo(true)} />;

  return (
    <div className="admin-app">
      <TopBar user={user} onLogout={logout} status={status} onPublish={publish} demo={demo} />
      <main className={"deck-workspace view-" + view}>
        <section className="deck-main">
          <div className="deck-command">
            <div>
              <span>TV carousel</span>
              <h1>Slide deck editor</h1>
            </div>
            <div className="deck-tools">
              <div className="segmented">
                <button className={view === "storyboard" ? "is-on" : ""} onClick={() => setView("storyboard")}>Storyboard</button>
                <button className={view === "focus" ? "is-on" : ""} onClick={() => setView("focus")}>Focus</button>
              </div>
              <select value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)}>
                <option value="notice">Notice</option>
                <option value="birthday">Birthday</option>
                <option value="events">Events</option>
                <option value="hero">Hero</option>
                <option value="image">Image</option>
                <option value="document">Document</option>
              </select>
              <button className="ghost-link" onClick={addSlide}><Icon.plus /> Add slide</button>
            </div>
          </div>

          {view === "storyboard" && (
            <div className="deck-rail">
              {orderedSlides.map((slide, index) => (
                <SlideRailItem
                  key={slide.id}
                  slide={slide}
                  index={index}
                  selected={slide.id === selected?.id}
                  onSelect={() => setSelectedId(slide.id)}
                  onToggle={(enabled) => patchSlide(slide.id, { enabled })}
                  onDragStart={(_event, id) => setDragId(id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event, id) => {
                    event.preventDefault();
                    moveDragged(id);
                    setDragId("");
                  }}
                />
              ))}
            </div>
          )}

          {view === "focus" && (
            <div className="focus-slider">
              <span>Slide {selectedIndex + 1}</span>
              <input
                type="range"
                min="0"
                max={Math.max(0, orderedSlides.length - 1)}
                value={selectedIndex}
                onChange={(event) => setSelectedId(orderedSlides[Number(event.target.value)].id)}
              />
              <span>{orderedSlides.length}</span>
            </div>
          )}

          {selected && <DeckPreview slide={selected} activeIndex={selectedIndex} total={orderedSlides.length} />}
        </section>
        <Editor
          slide={selected}
          onChange={(patch) => patchSlide(selected.id, patch)}
          onUpload={upload}
          onDelete={deleteSelected}
        />
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
