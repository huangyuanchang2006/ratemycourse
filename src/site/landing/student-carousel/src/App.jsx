// Production 3D cylinder contributor carousel (adapted from approved four-person build).
// Accepts host-filtered visible profile IDs from live getContributorWall() (fail-closed).
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import CircularCarousel from "./components/CircularCarousel.jsx";
import carouselCss from "./components/CircularCarousel.css?inline";
import communityCss from "./community.css?inline";
import { featuredPeople } from "./people.js";

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const assetsBase = new URL(/* @vite-ignore */ "./assets/", import.meta.url);
const allPeople = featuredPeople.map((person) => ({
  ...person,
  src: new URL(person.src, assetsBase).href,
}));

const copy = {
  en: {
    heading1: "Meet the people",
    heading2: "behind the perspectives.",
    intro: "Select a photo to read their course experiences.",
    carousel:
      "Student photographs; use arrow keys to browse and Enter to read a profile",
    controls: "Community controls",
    previous: "Previous student",
    next: "Next student",
    drag: "Drag to browse.",
    hover: " Hover to pause.",
    return: "Select the card to return to the photo.",
    opening: (name) => `Opening ${name}’s profile…`,
    profileAria: (name) => `${name}’s profile`,
    openedAnnouncement: (name) =>
      `${name}’s profile. Select the card or press Escape to return.`,
    closedAnnouncement: (name) => `${name}’s photo. Profile closed.`,
    courseExperiences: "Course experiences",
    explore: "Read their experiences",
    flip: "Flip card",
  },
  zh: {
    heading1: "认识这些同学",
    heading2: "聆听不同的课程视角。",
    intro: "选择一张照片，阅读他们的课程经历。",
    carousel: "学生照片轮播；使用方向键浏览，按回车阅读资料",
    controls: "社区轮播控制",
    previous: "上一位同学",
    next: "下一位同学",
    drag: "拖动浏览。",
    hover: " 悬停即可暂停。",
    return: "选择卡片，返回照片。",
    opening: (name) => `正在打开 ${name} 的资料…`,
    profileAria: (name) => `${name} 的资料`,
    openedAnnouncement: (name) =>
      `${name} 的资料。选择卡片或按 Escape 键返回照片。`,
    closedAnnouncement: (name) => `${name} 的照片。资料已关闭。`,
    courseExperiences: "课程经历",
    explore: "阅读 TA 的修课经历",
    flip: "翻回照片",
  },
};

function Arrow({ direction = "out" }) {
  const paths = {
    out: "M6 18 18 6M6 6h12v12",
    left: "M19 12H5m6-6-6 6 6 6",
    right: "M5 12h14m-6-6 6 6-6 6",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[direction]} />
    </svg>
  );
}

function Profile({ person, ready, onClose, onSelectPerson, ui, lang }) {
  const returnTimer = useRef(null);
  const cancelReturn = () => window.clearTimeout(returnTimer.current);

  useEffect(() => () => window.clearTimeout(returnTimer.current), [ready]);

  const aboutText = lang === "zh" ? person.focusZh || person.focus : person.focus;
  const aboutLang = person.focusLang || (lang === "zh" ? "zh-CN" : "en");
  const href = `./#/browse?author=${encodeURIComponent(person.profileId)}`;

  return (
    <article
      className="profile-card carousel-profile"
      aria-label={ui.profileAria(person.title)}
      onClick={(event) => {
        if (event.target.closest("a")) return;
        cancelReturn();
        onClose(event.detail === 0 ? "keyboard" : "pointer");
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") cancelReturn();
      }}
      onPointerLeave={(event) => {
        if (!ready || event.pointerType !== "mouse") return;
        if (document.querySelector("dialog[open]")) return;
        cancelReturn();
        returnTimer.current = window.setTimeout(() => {
          if (document.querySelector("dialog[open]")) return;
          onClose("timeout");
        }, 1000);
      }}
    >
      <button
        className="sr-only profile-close-target"
        data-profile-close
        type="button"
      >
        {ui.flip}
      </button>
      <div className="profile-top">
        <span className="profile-avatar-wrap">
          <img
            className="profile-avatar"
            src={person.src}
            alt=""
            width="58"
            height="58"
            style={{ transformOrigin: person.avatarOrigin }}
          />
        </span>
        <div>
          <h3>{person.title}</h3>
          <p className="profile-term">{person.subtitle}</p>
        </div>
      </div>
      <p className="profile-about" lang={aboutLang}>
        {aboutText}
      </p>
      <div className="course-previews">
        <h3>{ui.courseExperiences}</h3>
        <ul>
          {person.courses.map((course) => (
            <li key={course}>{course}</li>
          ))}
        </ul>
      </div>
      <a
        className="profile-link"
        href={href}
        onClick={(event) => {
          if (onSelectPerson) {
            event.preventDefault();
            cancelReturn();
            onSelectPerson(person);
          }
        }}
        lang={lang === "zh" ? "zh-CN" : "en"}
      >
        {ui.explore}
        <Arrow />
      </a>
    </article>
  );
}

function Community({ lang, items, onSelectPerson, rootRef }) {
  const ui = copy[lang];
  const controller = useRef(null);
  const pendingRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [flipped, setFlipped] = useState(null);
  const [closing, setClosing] = useState(null);
  const [readingReady, setReadingReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const closeProfile = useCallback(
    (source = "keyboard") => {
      if (flipped === null) return;
      const person = items[flipped];
      setClosing(flipped);
      setFlipped(null);
      setReadingReady(false);
      pendingRef.current = null;
      setPending(null);
      if (person) setAnnouncement(ui.closedAnnouncement(person.title));
      controller.current?.focusRoot();
      if (source !== "keyboard")
        controller.current?.resumeAfterProfile(source === "timeout");
      if (prefersReducedMotion()) queueMicrotask(() => setClosing(null));
    },
    [flipped, items, ui],
  );

  const openProfile = useCallback(
    (item, index) => {
      if (closing !== null) return;
      pendingRef.current = index;
      setPending(index);
      setAnnouncement(ui.opening(item.title));
    },
    [closing, ui],
  );

  const flipCompleted = useCallback((_index, isOpen) => {
    if (isOpen) setReadingReady(true);
    else setClosing(null);
  }, []);

  const settled = useCallback(
    (index) => {
      if (pendingRef.current !== index) return;
      const person = items[index];
      pendingRef.current = null;
      setPending(null);
      if (!person) return;
      setFlipped(index);
      setReadingReady(prefersReducedMotion());
      setAnnouncement(ui.openedAnnouncement(person.title));
    },
    [items, ui],
  );

  useEffect(() => {
    if (flipped === null) return;
    const button = rootRef.current?.querySelector(
      '[data-cc-back][data-open="true"] [data-profile-close]',
    );
    button?.focus({ preventScroll: true });
  }, [flipped, rootRef]);

  const navigate = (delta) => {
    if (flipped !== null || closing !== null) return;
    pendingRef.current = null;
    setPending(null);
    controller.current?.step(delta);
  };

  if (!items.length) return null;

  const multiple = items.length > 1;
  const hint =
    flipped !== null ? (
      ui.return
    ) : pending !== null && items[pending] ? (
      ui.opening(items[pending].title)
    ) : (
      <span>
        {ui.drag}
        <span className="hover-hint">{ui.hover}</span>
      </span>
    );

  return (
    <section
      className="community"
      id="community-inner"
      lang={lang === "zh" ? "zh-CN" : "en"}
      aria-labelledby="community-title"
      onKeyDownCapture={(event) => {
        if (event.key === "Escape" && flipped !== null) {
          event.preventDefault();
          event.stopPropagation();
          closeProfile();
        }
      }}
    >
      <div className="section-heading">
        <h2 id="community-title">
          <span>{ui.heading1}</span>
          <span>{ui.heading2}</span>
        </h2>
        <p className="section-intro">{ui.intro}</p>
      </div>
      <div className="carousel-scene" ref={rootRef}>
        <CircularCarousel
          items={items}
          preset="cylinder"
          intro={multiple ? "spin" : "none"}
          autoplay={multiple ? "drift" : "off"}
          cardWidth={250}
          aspectRatio={0.75}
          speed={14}
          captions
          gap={30}
          trackRadius={446}
          curve={1}
          tilt={-8}
          perspective={1800}
          parallax={0.59}
          innerShade={0.5}
          fadeColor="#061923"
          cornerRadius={21}
          pauseOnHover
          paused={pending !== null || flipped !== null || closing !== null}
          draggable={
            multiple &&
            pending === null &&
            flipped === null &&
            closing === null
          }
          flippedIndex={flipped}
          closingIndex={closing}
          onFlipComplete={flipCompleted}
          controllerRef={controller}
          onItemClick={openProfile}
          onFocusSettled={settled}
          ariaLabel={ui.carousel}
          renderBack={(person) => (
            <Profile
              person={person}
              ready={readingReady && flipped === items.indexOf(person)}
              onClose={closeProfile}
              onSelectPerson={onSelectPerson}
              ui={ui}
              lang={lang}
            />
          )}
        />
      </div>
      {multiple && (
        <div className="community-bottom">
          <p className="interaction-hint">{hint}</p>
          <nav className="people-navigation" aria-label={ui.controls}>
            <button
              className="arrow-button"
              aria-label={ui.previous}
              disabled={flipped !== null || closing !== null}
              onClick={() => navigate(-1)}
            >
              <Arrow direction="left" />
            </button>
            <button
              className="arrow-button"
              aria-label={ui.next}
              disabled={flipped !== null || closing !== null}
              onClick={() => navigate(1)}
            >
              <Arrow direction="right" />
            </button>
          </nav>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}

export function mountStudentCarousel(
  host,
  { lang = "en", allowedIds = [], onSelectPerson } = {},
) {
  if (!host) throw new TypeError("mountStudentCarousel requires a host element.");
  const allowed = allowedIds instanceof Set ? allowedIds : new Set(allowedIds);
  const visible = allPeople.filter((person) => allowed.has(person.profileId));
  if (!visible.length) return { setLang() {}, unmount() {} };

  const normalizeLang = (value) =>
    String(value).toLowerCase().startsWith("zh") ? "zh" : "en";
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  const root = document.createElement("div");
  root.className = "student-carousel-root";
  const fontUrl = new URL("hanken.woff2", assetsBase).href;
  style.textContent = `${carouselCss}\n@font-face { font-family: Hanken; src: url("${fontUrl}") format("woff2"); font-weight: 100 900; font-display: swap; }\n${communityCss}`;
  shadow.replaceChildren(style, root);
  const reactRoot = createRoot(root);
  const rootRef = { current: root };

  const renderTree = (nextLang) => {
    reactRoot.render(
      <Community
        lang={normalizeLang(nextLang)}
        items={visible}
        onSelectPerson={onSelectPerson}
        rootRef={rootRef}
      />,
    );
  };
  renderTree(lang);

  return {
    setLang: renderTree,
    unmount() {
      reactRoot.unmount();
      style.remove();
      root.remove();
    },
  };
}

export const FEATURED_PROFILE_IDS = Object.freeze(
  featuredPeople.map((person) => person.profileId),
);
