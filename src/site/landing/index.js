import { getAuth, getContributorWall } from "../../identity/index.js";
import { createSavedCourses } from "../../catalog/index.js";
import {
  renderBayHero,
  updateBayHeroCopy,
  renderBayCredits,
  mountBayScroll,
} from "./bay-hero.js";
import { COURSE_PREVIEWS } from "./previews.js";

const FEATURED_WALL_IDS = Object.freeze([
  "f6669b7c-2104-4dcb-ba10-decd41fc130f", // Chambers
  "d56cca0a-787e-413d-8b96-9a513beaf322", // Cindy
  "dcd6262c-bbd0-442d-b639-9b39ad564cf7", // Richard
  "6b81c480-22c4-431f-abef-4e3d43b8fcc9", // Star
]);

const BOOKMARK_ICON = `<svg class="save-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path d="M5 3.5h10a.5.5 0 0 1 .5.5v12.8a.4.4 0 0 1-.66.3L10 13.1l-4.84 4a.4.4 0 0 1-.66-.3V4a.5.5 0 0 1 .5-.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

function deepActiveElement() {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
}

export function mountLanding() {
  const app = document.querySelector("#app");
  const modal = document.querySelector("#modal");
  const toastNode = document.querySelector("#toast");
  if (!app || !modal) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const controller = new AbortController();
  const listen = (el, type, fn, options = {}) =>
    el.addEventListener(type, fn, { ...options, signal: controller.signal });

  let lang = "en";
  try {
    lang =
      localStorage.getItem("odyssey-community-language") === "zh" ? "zh" : "en";
  } catch {
    // Storage can be restricted in private browsing contexts.
  }

  let authClient = null;
  let savedCourses = null;
  let currentSession = null;
  let activeCourseIndex = 0;
  let allowedWallIds = new Set();
  let wallPending = false;
  let signingIn = false;
  let destroyed = false;
  let returnFocus = null;
  let target = "./#/browse";
  let pendingSaveCourseId = "";
  let toastTimer = 0;
  let stopHero = () => {};
  let studentCarousel = { setLang() {}, unmount() {} };
  let studentMountToken = 0;
  let swipeStart = null;

  const zh = () => lang === "zh";
  const t = (en, cn) => (zh() ? cn : en);

  function showToast(message) {
    if (!toastNode || !message) return;
    toastNode.textContent = message;
    toastNode.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastNode.classList.remove("is-visible");
    }, 3600);
  }

  function showSaveFlash(flash) {
    if (!flash) return;
    if (flash.saved) {
      showToast(
        flash.alreadySaved
          ? t("Already in My saved courses.", "这门课已在你的「我的收藏」中。")
          : t("Saved to My saved courses.", "已保存到「我的收藏」。"),
      );
    } else if (flash.error) {
      showToast(
        t("Could not save course: ", "保存课程失败：") + flash.error,
      );
    }
  }

  async function syncSavedForSession(nextSession, { force = false } = {}) {
    if (!savedCourses) return;
    if (!nextSession) {
      savedCourses.reset();
      updateCourseCarousel();
      return;
    }
    try {
      await savedCourses.load(nextSession, { force });
    } catch {
      // Leave unsaved state truthfully if load fails.
    }
    if (!destroyed) updateCourseCarousel();
  }

  function syncAuthButton(nextSession) {
    currentSession = nextSession || null;
    const button = $(".site-nav .signin", app);
    if (button) {
      button.textContent = currentSession
        ? t("My profile", "个人名片")
        : t("Sign in", "登录");
    }
  }

  const authPromise = getAuth()
    .then(async (auth) => {
      authClient = auth;
      savedCourses = createSavedCourses(auth.client);
      syncAuthButton(auth.session);
      await auth.ready;
      if (destroyed) return auth;
      syncAuthButton(auth.session);
      showSaveFlash(auth.consumeSaveFlash?.());
      await syncSavedForSession(auth.session);
      return auth;
    })
    .catch(() => null);

  function header() {
    const authLabel = currentSession
      ? t("My profile", "个人名片")
      : t("Sign in", "登录");
    return `<header class="site-header">
      <nav class="site-nav" aria-label="${t("Main navigation", "主导航")}">
        <a href="./#/browse" data-gate="./#/browse">${t("Course library", "课程库")}</a>
        <a href="guide.html">${t("Course guide", "选课指南")}</a>
        <button class="lang" type="button" data-action="language" aria-label="${t("Switch to Chinese", "切换到英文")}">${t("中文", "EN")}</button>
        <button class="signin" type="button" data-action="signin">${authLabel}</button>
      </nav>
    </header>`;
  }

  function renderQuote(review) {
    const destination = `./#/course/${encodeURIComponent(review.courseId)}`;
    const body = zh()
      ? `<p lang="${review.originalLang}">${esc(review.original)}</p>`
      : `<p lang="en">${esc(review.translationEn)}</p>
         <details class="quote-original">
           <summary>Translated from Chinese original · Read original</summary>
           <p lang="${review.originalLang}">${esc(review.original)}</p>
         </details>`;
    return `<blockquote>
      ${body}
      <div class="quote-footer">
        <cite>${esc(review.author)}</cite>
        <a class="quote-link" href="${destination}" data-gate="${destination}">${t("Read full review", "查看完整评价")} ↗</a>
      </div>
    </blockquote>`;
  }

  function renderVoicesPanel() {
    const course = COURSE_PREVIEWS[activeCourseIndex];
    const title = zh() ? course.titleZh : course.titleEn;
    const courseLang = zh() ? course.languageZh : course.languageEn;
    const destination = `./#/course/${encodeURIComponent(course.courseId)}`;
    const ctaLabel =
      course.reviews.length > 1
        ? t("Read full reviews", "查看完整评价")
        : t("Read full review", "查看完整评价");
    const isSaved = Boolean(currentSession && savedCourses?.has(course.courseId));
    const isBusy = Boolean(savedCourses?.isBusy(course.courseId));
    const saveLabel = isSaved
      ? t("Saved", "已保存")
      : t("Save this course", "保存这门课");
    return `<div class="bay-review-course">
        <p class="course-meta">${esc(course.provider)} · ${esc(courseLang)}</p>
        <h3 id="review-course-title">${esc(title)}</h3>
      </div>
      <div class="quotes">${course.reviews.map(renderQuote).join("")}</div>
      <div class="course-actions">
        <a class="button" href="${destination}" data-gate="${destination}">${ctaLabel} ↗</a>
        <button class="save-button${isSaved ? " is-saved" : ""}" type="button" data-action="save-course" data-course-id="${esc(course.courseId)}" aria-pressed="${isSaved}" ${isBusy ? "disabled" : ""}>${BOOKMARK_ICON}<span>${esc(saveLabel)}</span></button>
        <a class="detail-link" href="./#/browse" data-gate="./#/browse">${t("Browse all courses", "浏览全部课程")}</a>
      </div>`;
  }

  function voicesSection() {
    const total = COURSE_PREVIEWS.length;
    return `<section class="voices" id="preview" aria-labelledby="voices-title">
      <div class="voices-head">
        <h2 id="voices-title">${t("What students remember", "这门课，上过才知道")}</h2>
        <div class="carousel-tools">
          <span class="counter" aria-live="polite">${activeCourseIndex + 1} / ${total}</span>
          <button class="circle" type="button" data-action="prev" aria-label="${t("Previous course", "上一门课")}" aria-disabled="${activeCourseIndex === 0}">←</button>
          <button class="circle" type="button" data-action="next" aria-label="${t("Next course", "下一门课")}" aria-disabled="${activeCourseIndex === total - 1}">→</button>
        </div>
      </div>
      <article class="voice-panel" aria-labelledby="review-course-title" data-course-key="${COURSE_PREVIEWS[activeCourseIndex].key}">
        ${renderVoicesPanel()}
      </article>
    </section>`;
  }

  function catalogEntry() {
    return `<section class="official-band" aria-labelledby="catalog-entry-title">
      <h2 id="catalog-entry-title">${t("Find your next course", "找到你的下一门课")}</h2>
      <a class="button" href="./#/browse" data-gate="./#/browse">${t("Explore courses", "探索课程")}</a>
    </section>`;
  }

  function footerInner() {
    return `<p class="bay-footer-journey">${t("A university journey.", "一段大学旅程。")}<br>${t("A community along the way.", "一路同行的社区。")}</p>
      <p class="bay-footer-wordmark">RateMyCourse</p>
      <div class="bay-footer-meta">
        <span>© 2026 RateMyCourse · WaseCrew</span>
        <span>${t("Built around student perspectives.", "从学生的真实视角出发。")}</span>
        <a href="guide.html">${t("Course guide", "选课指南")}</a>
        <details class="bay-footer-credits">
          <summary>${t("Artwork credits", "素材署名")}</summary>
          ${renderBayCredits(t)}
        </details>
      </div>`;
  }

  function footer() {
    return `<footer class="bay-footer"><div class="bay-footer-inner">${footerInner()}</div></footer>`;
  }

  function syncStudentCarousel() {
    const section = $("#community");
    const host = $(".student-carousel-mount");
    studentCarousel.unmount();
    studentCarousel = { setLang() {}, unmount() {} };
    const token = ++studentMountToken;

    if (!section || !host) return;
    if (!allowedWallIds.size) {
      section.hidden = true;
      window.ScrollTrigger?.refresh();
      return;
    }

    section.hidden = false;
    import("./student-carousel/index.js")
      .then(({ mountStudentCarousel }) => {
        if (destroyed || token !== studentMountToken || !host.isConnected) return;
        studentCarousel = mountStudentCarousel(host, {
          lang,
          allowedIds: allowedWallIds,
          onSelectPerson(person) {
            void gate(`./#/browse?author=${encodeURIComponent(person.profileId)}`);
          },
        });
        window.ScrollTrigger?.refresh();
      })
      .catch(() => {
        if (destroyed || token !== studentMountToken || !section.isConnected)
          return;
        section.hidden = true;
        window.ScrollTrigger?.refresh();
      });
  }

  function updateCourseCarousel() {
    const panel = $(".voice-panel");
    if (!panel) return;
    const total = COURSE_PREVIEWS.length;
    panel.dataset.courseKey = COURSE_PREVIEWS[activeCourseIndex].key;
    panel.innerHTML = renderVoicesPanel();
    const counter = $(".voices .counter");
    if (counter) counter.textContent = `${activeCourseIndex + 1} / ${total}`;
    const prev = $('.voices [data-action="prev"]');
    const next = $('.voices [data-action="next"]');
    prev?.setAttribute("aria-disabled", String(activeCourseIndex === 0));
    next?.setAttribute("aria-disabled", String(activeCourseIndex === total - 1));
  }

  function stepCourse(delta) {
    const next = Math.max(
      0,
      Math.min(COURSE_PREVIEWS.length - 1, activeCourseIndex + delta),
    );
    if (next === activeCourseIndex) return;
    activeCourseIndex = next;
    updateCourseCarousel();
  }

  // Update copy in place on language toggle so scroll position, GSAP ScrollTrigger,
  // focus on the language button, and the 3D carousel remain undisturbed.
  function updateLanguageInPlace() {
    document.documentElement.lang = zh() ? "zh-CN" : "en";

    const nav = $(".site-nav", app);
    if (nav) {
      nav.setAttribute("aria-label", t("Main navigation", "主导航"));
      const [coursesLink, guideLink, langBtn, signBtn] = nav.children;
      if (coursesLink) coursesLink.textContent = t("Course library", "课程库");
      if (guideLink) guideLink.textContent = t("Course guide", "选课指南");
      if (langBtn) {
        langBtn.textContent = t("中文", "EN");
        langBtn.setAttribute(
          "aria-label",
          t("Switch to Chinese", "切换到英文"),
        );
      }
      if (signBtn) {
        signBtn.textContent = currentSession
          ? t("My profile", "个人名片")
          : t("Sign in", "登录");
      }
    }

    updateBayHeroCopy($(".bay-hero", app), t);
    studentCarousel.setLang(lang);

    const voicesTitle = $("#voices-title", app);
    if (voicesTitle)
      voicesTitle.textContent = t("What students remember", "这门课，上过才知道");
    $('.voices [data-action="prev"]', app)?.setAttribute(
      "aria-label",
      t("Previous course", "上一门课"),
    );
    $('.voices [data-action="next"]', app)?.setAttribute(
      "aria-label",
      t("Next course", "下一门课"),
    );
    updateCourseCarousel();

    const catalogTitle = $("#catalog-entry-title", app);
    if (catalogTitle)
      catalogTitle.textContent = t("Find your next course", "找到你的下一门课");
    const catalogBtn = $(".official-band .button", app);
    if (catalogBtn) catalogBtn.textContent = t("Explore courses", "探索课程");

    const footerContent = $(".bay-footer-inner", app);
    if (footerContent) footerContent.innerHTML = footerInner();
  }

  function render() {
    stopHero();
    stopHero = () => {};
    studentCarousel.unmount();
    studentCarousel = { setLang() {}, unmount() {} };

    document.documentElement.lang = zh() ? "zh-CN" : "en";
    document.title = "RateMyCourse · Chart your own course.";
    app.className = "bay-landing";
    app.innerHTML = `${header()}<main id="main" tabindex="-1">${renderBayHero(t)}<section class="student-carousel-section" id="community" hidden><div class="student-carousel-mount"></div></section>${voicesSection()}${catalogEntry()}</main>${footer()}`;

    stopHero = mountBayScroll($(".bay-hero", app));
    syncStudentCarousel();
  }

  function showAuthDialog({ saving = false } = {}) {
    returnFocus = deepActiveElement();
    modal.className = "bay-dialog";
    const heading = saving
      ? t("Save this course to your list.", "登录并自动保存这门课。")
      : t("Welcome to the community.", "欢迎加入社区。");
    const subtitle = saving
      ? t(
          "Sign in with Google and we will save this course automatically right after you return.",
          "使用 Google 登录后，系统会自动为你保存这门课，无需重新搜索。",
        )
      : t(
          "Sign in with Google to continue to the course community.",
          "使用 Google 登录，继续进入课程社区。",
        );
    modal.innerHTML = `<div class="dialog-head">
        <h2 id="dialog-title">RateMyCourse</h2>
        <button class="dialog-close" type="button" data-action="close" aria-label="${t("Close", "关闭")}">×</button>
      </div>
      <div class="dialog-body">
        <div class="auth-layout">
          <div class="auth-story">
            <h3>${t("A community<br>along the way.", "一路同行的社区。")}</h3>
            <p>${t("Read real course experiences. Get to know the people who shared them.", "阅读真实修课经历，认识分享经历的人。")}</p>
          </div>
          <div class="auth-form">
            <h4>${heading}</h4>
            <p class="muted">${subtitle}</p>
            <button class="google-button" type="button" data-action="google">
              <span class="google-letter" aria-hidden="true">G</span>
              ${t("Continue with Google", "使用 Google 继续")}
            </button>
            <p class="form-error" id="auth-error" role="alert"></p>
            <p class="auth-note">${t("Your profile and each review have their own visibility settings.", "个人资料与每条评价均可分别选择公开方式。")}</p>
          </div>
        </div>
      </div>`;
    if (!modal.open) modal.showModal();
    document.body.classList.add("dialog-open");
    requestAnimationFrame(() =>
      modal.querySelector(".google-button,.dialog-close")?.focus(),
    );
  }

  function closeDialog() {
    if (modal.open) modal.close();
  }

  function navigate(destination) {
    closeDialog();
    location.assign(destination);
  }

  async function resolveAuth() {
    const auth = await authPromise;
    if (!auth)
      throw new Error(
        t(
          "Sign-in is unavailable. Please reload and try again.",
          "登录暂不可用，请刷新后重试。",
        ),
      );
    return auth;
  }

  async function gate(destination = "./#/browse", { saveCourseId = "" } = {}) {
    target = destination;
    pendingSaveCourseId = saveCourseId;
    const hadSession = Boolean(currentSession || authClient?.session);
    if (!hadSession) showAuthDialog({ saving: Boolean(saveCourseId) });
    try {
      const client = await resolveAuth();
      await client.ready;
      if (destroyed) return;
      if (!hadSession && !modal.open) return;
      if (client.session) {
        if (saveCourseId) {
          closeDialog();
          await handleSignedInSave(saveCourseId);
        } else {
          navigate(target);
        }
      }
    } catch (error) {
      const box = $("#auth-error", modal);
      if (box) box.textContent = error.message;
    }
  }

  async function handleSignedInSave(courseId) {
    try {
      const client = await resolveAuth();
      await client.ready;
      if (destroyed || !client.session || !savedCourses) return;
      const task = savedCourses.toggle(courseId);
      updateCourseCarousel();
      const result = await task;
      if (destroyed) return;
      updateCourseCarousel();
      if (result.saved) {
        showToast(
          result.already_saved
            ? t("Already in My saved courses.", "这门课已在你的「我的收藏」中。")
            : t("Saved to My saved courses.", "已保存到「我的收藏」。"),
        );
      } else {
        showToast(
          t("Removed from My saved courses.", "已从「我的收藏」移除。"),
        );
      }
    } catch (error) {
      if (!destroyed) {
        updateCourseCarousel();
        showToast(
          t("Could not update saved course: ", "保存操作失败：") +
            (error?.message || t("Please try again.", "请稍后重试。")),
        );
      }
    }
  }

  async function signInWithGoogle() {
    if (signingIn) return;
    const button = $('[data-action="google"]', modal);
    const errorBox = $("#auth-error", modal);
    if (!button || !errorBox) return;

    signingIn = true;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    errorBox.textContent = "";
    try {
      const client = await resolveAuth();
      await client.ready;
      if (!client?.signInWithGoogle)
        throw new Error(
          t(
            "Sign-in is unavailable. Please reload and try again.",
            "登录暂不可用，请刷新后重试。",
          ),
        );
      await client.signInWithGoogle(
        "community" + new URL(target, location.href).hash,
        { saveCourseId: pendingSaveCourseId },
      );
    } catch (error) {
      if (errorBox.isConnected)
        errorBox.textContent =
          error?.message ||
          t(
            "Could not start Google sign-in. Try again.",
            "未能启动 Google 登录，请重试。",
          );
    } finally {
      signingIn = false;
      if (button.isConnected) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    }
  }

  function applyWallVisibility(nextIds) {
    const prevKey = [...allowedWallIds].sort().join(",");
    const nextKey = [...nextIds].sort().join(",");
    if (prevKey === nextKey) return;
    allowedWallIds = nextIds;
    syncStudentCarousel();
  }

  async function refreshWall() {
    if (destroyed || wallPending || document.visibilityState !== "visible")
      return;
    wallPending = true;
    try {
      const data = await getContributorWall();
      if (destroyed) return;
      const liveIds = new Set((data?.people || []).map((p) => p.id));
      applyWallVisibility(
        new Set(FEATURED_WALL_IDS.filter((id) => liveIds.has(id))),
      );
    } catch {
      // Fail closed: never display opted-out or unverified contributors on read failure.
      if (!destroyed) applyWallVisibility(new Set());
    } finally {
      wallPending = false;
    }
  }

  listen(document, "click", (event) => {
    const el = event.target.closest("[data-action],[data-gate]");
    if (!el || (!app.contains(el) && !modal.contains(el))) return;

    if (el.dataset.gate) {
      event.preventDefault();
      void gate(el.dataset.gate);
      return;
    }

    const action = el.dataset.action;
    if (action === "close") {
      event.preventDefault();
      closeDialog();
    } else if (action === "save-course") {
      event.preventDefault();
      const courseId = el.dataset.courseId || "";
      if (!courseId) return;
      if (currentSession || authClient?.session) {
        void handleSignedInSave(courseId);
      } else {
        void gate(`./#/course/${encodeURIComponent(courseId)}`, {
          saveCourseId: courseId,
        });
      }
    } else if (action === "signin") {
      event.preventDefault();
      void gate(
        currentSession || authClient?.session ? "./#/profile" : "./#/browse",
      );
    } else if (action === "google") {
      event.preventDefault();
      void signInWithGoogle();
    } else if (action === "language") {
      event.preventDefault();
      lang = zh() ? "en" : "zh";
      try {
        localStorage.setItem("odyssey-community-language", lang);
      } catch {}
      updateLanguageInPlace();
    } else if (action === "prev") {
      event.preventDefault();
      stepCourse(-1);
    } else if (action === "next") {
      event.preventDefault();
      stepCourse(1);
    }
  });

  // Touch/pen swipe on course review panel; leave mouse drag free for text selection.
  listen(app, "pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    if (!event.target.closest(".voice-panel")) return;
    swipeStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });

  listen(app, "pointercancel", (event) => {
    if (swipeStart?.id === event.pointerId) swipeStart = null;
  });

  listen(app, "pointerup", (event) => {
    if (!swipeStart || swipeStart.id !== event.pointerId) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      stepCourse(dx < 0 ? 1 : -1);
    }
  });

  listen(modal, "click", (event) => {
    if (event.target === modal) closeDialog();
  });

  listen(modal, "close", () => {
    document.body.classList.remove("dialog-open");
    pendingSaveCourseId = "";
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  });

  listen(window, "sils:auth", (event) => {
    const nextSession = event.detail?.session ?? authClient?.session ?? null;
    syncAuthButton(nextSession);
    void syncSavedForSession(nextSession);
  });

  listen(window, "rmc:saved-change", (event) => {
    authClient?.consumeSaveFlash?.();
    showSaveFlash(event.detail);
    if (currentSession) void syncSavedForSession(currentSession, { force: true });
  });

  const wallInterval = setInterval(() => {
    if (document.visibilityState === "visible") void refreshWall();
  }, 60000);
  listen(window, "focus", () => void refreshWall());
  listen(document, "visibilitychange", () => {
    if (document.visibilityState === "visible") void refreshWall();
  });

  render();
  void refreshWall();

  return {
    destroy() {
      destroyed = true;
      clearInterval(wallInterval);
      clearTimeout(toastTimer);
      controller.abort();
      stopHero();
      studentCarousel.unmount();
      if (modal.open) modal.close();
      document.body.classList.remove("dialog-open");
    },
  };
}
