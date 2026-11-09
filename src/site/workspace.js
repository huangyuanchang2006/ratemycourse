import "./navigation.js";
import { getPlatform } from "../platform/index.js";
import { getAuth, createIdentity } from "../identity/index.js";
import { createCatalog } from "../catalog/index.js";
import { createContributions } from "../contributions/index.js";
import { createAdminAccess } from "../admin/index.js";
import { copy, sourceLanguages } from "./copy.js";
import {
  $,
  escapeHtml,
  safeUrl,
  link,
  button,
  toast,
  gated,
} from "../platform/index.js";
async function mountWorkspace() {
  const { client, metrics } = await getPlatform(),
    auth = await getAuth(),
    main = $("#main");
  const lifecycle = new AbortController(),
    listen = (target, event, fn, options = {}) =>
      target.addEventListener(event, fn, {
        ...options,
        signal: lifecycle.signal,
      });
  let language;
  try {
    language = localStorage.getItem("odyssey-community-language");
  } catch {}
  if (!["zh", "en"].includes(language))
    language = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  let renderVersion = 0,
    browseScrollY = 0,
    activePath = "browse";
  const t = (key) => copy[language][key === "published" ? "approved" : key];
  const route = () => {
    const raw = window.location.hash.replace(/^#\/?/, "");
    const [routePath = "browse", search = ""] = raw.split("?");
    const [path = "browse", ...parts] = routePath.split("/");
    return {
      path: path || "browse",
      id: parts.join("/"),
      params: new URLSearchParams(search),
    };
  };
  const view = {
    $,
    main,
    t,
    escapeHtml,
    safeUrl,
    link,
    button,
    toast,
    route,
    signal: lifecycle.signal,
    get language() {
      return language;
    },
    get version() {
      return renderVersion;
    },
    gated: (title, description) => gated(view, title, description),
    requestRender: () => render(),
    requestHeader: () => renderHeader(),
    onAuthor: (key) => {
      catalog.selectAuthor(key);
      renderHeader();
    },
    onAccountChange: () => contributions.reset(),
    fail: (error) =>
      toast(t("serverError") + (error?.message || t("notReady"))),
  };
  const identity = createIdentity({ client, auth, view }),
    catalog = createCatalog({ client, view, identity }),
    contributions = createContributions({
      client,
      view,
      identity,
      catalog,
      sourceLanguages,
    }),
    access = createAdminAccess(client, renderHeader);
  function renderHeader() {
    document.documentElement.lang = view.language === "zh" ? "zh-CN" : "en";
    $(".brand").setAttribute(
      "aria-label",
      view.language === "zh" ? "RateMyCourse 首页" : "RateMyCourse home",
    );
    $("nav").setAttribute(
      "aria-label",
      view.language === "zh" ? "RateMyCourse 导航" : "RateMyCourse navigation",
    );
    $(".skip").textContent =
      view.language === "zh" ? "跳到主要内容" : "Skip to main content";
    $("#auth-notice").textContent =
      view.language === "zh"
        ? "Google 登录仅用于账户与投稿归属，不代表学籍或修课经历已验证。"
        : "Google sign-in establishes account ownership; it does not verify student status or course attendance.";
    $("#login-title").textContent =
      view.language === "zh"
        ? "分享你的课程体验"
        : "Share your course experience";
    $("#login-description").textContent =
      view.language === "zh"
        ? "浏览课程无需登录。登录后可提交体验、查看审核状态和编辑自己的投稿。"
        : "Browse without signing in. Sign in to contribute, check moderation status, and edit your own submissions.";
    $("#login-privacy").textContent =
      view.language === "zh"
        ? "登录邮箱不会显示在评价或个人名片中。此登录不读取 Gmail 邮件，也不会验证学籍。"
        : "Your login email is not shown on reviews or profile cards. Sign-in does not read Gmail or verify student status.";
    $("[data-close-login]").setAttribute(
      "aria-label",
      view.language === "zh" ? "关闭" : "Close",
    );
    $("#login [data-community-signin]").textContent = t("signIn");
    $(".brand small").textContent =
      view.language === "zh" ? "课程体验" : "COURSE EXPERIENCES";
    $("#language-toggle").textContent =
      view.language === "zh" ? "English" : "中文";
    const labels = {
      browse: t("browse"),
      mine: t("mine"),
      profile: t("profile"),
      guide: view.language === "zh" ? "选课指南" : "Registration guide",
      contributors: view.language === "zh" ? "分享者" : "Contributors",
    };
    document.querySelectorAll("[data-nav]").forEach((anchor) => {
      anchor.textContent = labels[anchor.dataset.nav];
      const currentNav =
        route().path === "browse" &&
        route().params.get("section") === "contributors"
          ? "contributors"
          : route().path;
      anchor.setAttribute(
        "aria-current",
        currentNav === anchor.dataset.nav ? "page" : "false",
      );
    });
    const footerBrand = $("footer>span:first-child");
    if (footerBrand)
      footerBrand.textContent =
        view.language === "zh"
          ? "RateMyCourse · 课程体验"
          : "RateMyCourse · Course experiences";
    document.title =
      view.language === "zh"
        ? "RateMyCourse · 找到适合你的课程"
        : "RateMyCourse · Find the courses that fit you";
    const slot = $("#account-nav");
    slot.innerHTML = identity.session
      ? `${access.allowed ? `<a class="text-link" href="analytics.html">${view.language === "zh" ? "数据概览" : "Analytics"}</a>` : ""}<button class="quiet" type="button" data-auth-signout>${view.language === "zh" ? "退出" : "Sign out"}</button>`
      : `<button class="button secondary compact" type="button" data-community-signin>${escapeHtml(t("signIn"))}</button>`;
  }
  function capture() {
    identity.capture();
    contributions.capture();
  }
  async function render() {
    capture();
    const version = ++renderVersion;
    access.refresh(identity.session);
    renderHeader();
    identity.beforeRender();
    contributions.beforeRender();
    main.setAttribute("aria-busy", "true");
    const current = route();
    if (
      !catalog.loaded &&
      ["browse", "course", "share", "mine"].includes(current.path)
    )
      main.innerHTML = `<div class="empty-state"><span class="empty-icon">…</span><h2>${escapeHtml(t("loading"))}</h2></div>`;
    try {
      if (["browse", "course", "share", "mine"].includes(current.path))
        await catalog.load();
      if (["browse", "people"].includes(current.path))
        await identity.loadContributors();
      if (version !== renderVersion) return;
      if (current.path === "course")
        await catalog.renderCourse(decodeURIComponent(current.id), version);
      else if (current.path === "share")
        await contributions.renderShare(
          current.params.get("edit") || "",
          version,
        );
      else if (current.path === "mine") await contributions.renderMine(version);
      else if (current.path === "profile")
        await identity.renderProfile(version);
      else if (current.path === "people")
        await identity.renderPerson(decodeURIComponent(current.id), version);
      else {
        catalog.enter(current);
        catalog.renderBrowse();
      }
      if (version !== renderVersion) return;
      identity.afterRender(current);
      contributions.afterRender(current);
      renderHeader();
      identity.syncContributorWall();
      const metricPage =
        {
          course: "course",
          share: "share",
          mine: "mine",
          profile: "profile",
          people: "person",
        }[current.path] || "browse";
      metrics.page({
        page: metricPage,
        courseId:
          metricPage === "course" ? catalog.canonical(current.id) : null,
        viewKey: metricPage === "person" ? current.id : null,
      });
      if (route().params.get("section") === "contributors")
        $("#contributors-wall")?.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      main.removeAttribute("aria-busy");
    } catch (error) {
      if (version !== renderVersion) return;
      main.removeAttribute("aria-busy");
      console.error("RateMyCourse community page failed", error);
      main.innerHTML = `<div class="empty-state"><h2>${escapeHtml(t("notReady"))}</h2><p>${escapeHtml(error?.message || "")}</p><button class="button" type="button" data-action="retry">${language === "zh" ? "重试" : "Try again"}</button></div>`;
    }
  }
  listen(document, "click", async (event) => {
    if (activePath === "browse" && event.target.closest('a[href*="#/course/"]'))
      browseScrollY = scrollY;
    if (await identity.handleClick(event)) return;
    if (contributions.handleClick(event) || catalog.handleClick(event)) return;
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "share") {
      if (!identity.session) {
        identity.login("community#/share");
        return;
      }
      location.hash = "/share";
    }
    if (action === "retry") await render();
  });
  listen(document, "input", (event) => identity.handleInput(event), {
    capture: true,
  });
  listen(document, "input", (event) => {
    contributions.handleInput(event);
    catalog.handleInput(event);
  });
  listen(document, "change", (event) => {
    identity.capture();
    contributions.handleChange(event);
    catalog.handleChange(event);
  });
  listen(document, "keydown", (event) => {
    if (event.target.matches("#course-search") && event.key === "Enter") {
      event.preventDefault();
      $(".results-meta")?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    }
  });
  listen(document, "submit", async (event) => {
    if (catalog.handleSubmit(event)) return;
    const form = event.target;
    if (form.id === "profile-form") {
      event.preventDefault();
      await identity.submit(form);
    } else if (
      form.id === "review-form" ||
      form.matches("[data-review-appeal]")
    ) {
      event.preventDefault();
      await contributions.submit(form);
    }
  });
  listen($("#language-toggle"), "click", async () => {
    capture();
    language = language === "zh" ? "en" : "zh";
    try {
      localStorage.setItem("odyssey-community-language", language);
    } catch {}
    await render();
  });
  listen(window, "hashchange", async () => {
    const next = route().path,
      returning = next === "browse" && activePath !== "browse";
    activePath = next;
    await render();
    if (route().params.get("section") === "contributors")
      $("#contributors-wall")?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    else scrollTo({ top: returning ? browseScrollY : 0, behavior: "instant" });
  });
  listen(window, "beforeunload", (event) => {
    if (!identity.dirty && !contributions.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
  listen(window, "resize", catalog.syncFilterPanel, { passive: true });
  listen(document, "toggle", catalog.toggle, { capture: true });
  listen(window, "sils:auth-error", () => toast(t("authError")));
  const wallTimer = setInterval(async () => {
    if (!document.hidden && route().path === "browse") {
      await identity.loadContributors(true);
      identity.syncContributorWall();
    }
  }, 60000);
  listen(
    window,
    "pagehide",
    () => {
      clearInterval(wallTimer);
      identity.destroy();
      lifecycle.abort();
    },
    { once: true },
  );
  activePath = route().path;
  renderHeader();
  await identity.ready;
  await render();
}
void mountWorkspace().catch((error) => {
  const main = $("#main");
  main.textContent = error.message;
  main.setAttribute("role", "alert");
});
