(function () {
  "use strict";

  document.documentElement.classList.add("sils-ready");

  const locales = {
    zh: { data: window.SILS_DATA, copy: window.SILS_COPY?.zh },
    en: { data: window.SILS_DATA_EN, copy: window.SILS_COPY?.en }
  };
  const storedLocale = (() => {
    try {
      return window.localStorage.getItem("sils-language");
    } catch (error) {
      return null;
    }
  })();
  let currentLocale = storedLocale === "en" ? "en" : "zh";
  let data = locales[currentLocale].data;
  let copy = locales[currentLocale].copy;
  let compactView = false;

  if (!data || !copy) {
    document.body.innerHTML = "<p>Course data could not be loaded. Please check the page files.</p>";
    return;
  }

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scrollBehavior = () => reducedMotion.matches ? "auto" : "smooth";
  const t = (path) => path.split(".").reduce((value, key) => value?.[key], copy);
  const fieldText = (value) => escapeHtml(value || t("labels.notProvided"));

  const escapeHtml = (value = "") =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const languageLabel = (language) => t(`labels.language.${language}`) || language;
  const termLabel = (term) => currentLocale === "en"
    ? term
    : term.replaceAll("Spring", "春季").replaceAll("Fall", "秋季");

  function syllabusLinks(course) {
    const links = Array.isArray(course.syllabus)
      ? course.syllabus
      : course.syllabus
        ? [course.syllabus]
        : [];

    return links
      .map(
        (url, index) =>
          `<a class="text-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(t("labels.syllabus"))}${links.length > 1 ? ` ${index + 1}` : ""}</a>`
      )
      .join("<span aria-hidden=\"true\"> · </span>");
  }

  const reviewerTargets = { Chambers: "reviewer-chambers", Richard: "reviewer-richard", Cindy: "reviewer-cindy" };

  function reviewerLink(name) {
    const target = reviewerTargets[name];
    return target ? `<a class="text-link" href="#${target}" data-reviewer-link>${escapeHtml(t("explorer.reviewer.meet").replace("{name}", name))}</a>` : "";
  }

  const filterForm = $("[data-filter-form]");
  const courseGrid = $("[data-course-grid]");
  const resultsCount = $("[data-results-count]");
  const emptyState = $("[data-empty-state]");
  const selectedReviewByCourse = new Map();
  let applyingPreset = false;

  const reviewerName = (course) => course.reviewer || course.takenBy || t("labels.notProvided");
  const courseIdentity = (course) => course.courseKey || course.id;
  const courseDisplayTitle = (course) => course.groupTitle || course.title;

  function groupCourses(courses) {
    const groups = new Map();
    courses.forEach((course) => {
      const key = courseIdentity(course);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: courseDisplayTitle(course),
          reviews: []
        });
      }
      const group = groups.get(key);
      if (course.groupTitle) group.title = course.groupTitle;
      group.reviews.push(course);
    });
    return Array.from(groups.values());
  }

  function getFilters() {
    const formData = new FormData(filterForm);
    return Object.fromEntries(formData.entries());
  }

  function courseMatches(course, filters) {
    const searchable = [
      courseDisplayTitle(course),
      course.title,
      course.provider,
      course.language,
      reviewerName(course),
      course.teacher,
      course.experience,
      course.fit,
      course.avoid,
      course.assessment,
      ...(course.tags || [])
    ]
      .join(" ")
      .toLocaleLowerCase();

    const queryMatches = !filters.query || searchable.includes(filters.query.trim().toLocaleLowerCase());
    const ownerMatches = filters.takenBy === "all" || reviewerName(course) === filters.takenBy;
    const providerMatches = filters.provider === "all" || course.provider === filters.provider;
    const languageMatches = filters.language === "all" || course.language === filters.language;

    let workloadMatches = true;
    if (filters.workload === "1-2") workloadMatches = course.workload <= 2;
    if (filters.workload === "3") workloadMatches = course.workload === 3;
    if (filters.workload === "4-5") workloadMatches = course.workload >= 4;

    let groupMatches = true;
    if (filters.groupWork === "none") groupMatches = course.groupWork === "none";
    if (filters.groupWork === "any") groupMatches = course.groupWork !== "none";
    if (filters.groupWork === "some") groupMatches = course.groupWork === "some";
    if (filters.groupWork === "heavy") groupMatches = course.groupWork === "heavy";

    return queryMatches && ownerMatches && providerMatches && languageMatches && workloadMatches && groupMatches;
  }

  function reviewerTabs(group, selectedReview) {
    if (group.reviews.length < 2) {
      return `<div class="reviewer-single"><span>${escapeHtml(t("explorer.reviewer.single"))}</span><strong>${escapeHtml(reviewerName(selectedReview))}</strong></div>`;
    }

    const hasCindy = group.reviews.some((review) => reviewerName(review) === "Cindy");
    return `
      <div class="reviewer-switch">
        <div class="reviewer-switch-copy">
          <span class="reviewer-switch-label"><span class="reviewer-star" aria-hidden="true">✦</span>${escapeHtml(t("explorer.reviewer.label"))}</span>
          <span class="reviewer-switch-hint">${escapeHtml(hasCindy ? t("explorer.reviewer.cindyHint") : t("explorer.reviewer.hint"))}</span>
        </div>
        <div class="reviewer-tabs" role="tablist" aria-label="${escapeHtml(t("explorer.reviewer.aria"))}">
          ${group.reviews.map((review) => {
            const reviewer = reviewerName(review);
            const isSelected = review.id === selectedReview.id;
            const isCindy = reviewer === "Cindy";
            return `
              <button
                class="reviewer-tab${isCindy ? " reviewer-tab-cindy" : ""}"
                type="button"
                role="tab"
                aria-selected="${String(isSelected)}"
                tabindex="${isSelected ? "0" : "-1"}"
                id="review-tab-${escapeHtml(review.id)}"
                aria-controls="review-panel-${escapeHtml(group.key)}"
                data-reviewer-tab
                data-review-id="${escapeHtml(review.id)}"
                data-course-key="${escapeHtml(group.key)}"
              >
                ${isCindy ? `<span class="reviewer-tab-star" aria-hidden="true">✦</span>` : ""}
                <span>${escapeHtml(reviewer)}</span>
                ${isCindy ? `<small>${escapeHtml(t("explorer.reviewer.new"))}</small>` : ""}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function reviewPanel(course, hasTabs = false) {
    const source = course.source
      ? `<dt>${escapeHtml(t("labels.source"))}</dt><dd><a class="text-link" href="${escapeHtml(course.source)}" target="_blank" rel="noreferrer">${escapeHtml(t("labels.sourceLink"))}</a></dd>`
      : "";
    const syllabus = course.syllabus
      ? `<dt>${escapeHtml(t("labels.syllabus"))}</dt><dd>${syllabusLinks(course)}</dd>`
      : "";

    return `
      <div class="course-review-panel" id="review-panel-${escapeHtml(courseIdentity(course))}" role="${hasTabs ? "tabpanel" : "region"}" ${hasTabs ? `aria-labelledby="review-tab-${escapeHtml(course.id)}" tabindex="0"` : `aria-label="${escapeHtml(reviewerName(course))}${escapeHtml(t("labels.attributionSuffix"))}"`} data-review-panel data-review-id="${escapeHtml(course.id)}">
        <div class="course-head">
          <div>
            <div class="course-meta">
              <span class="meta-chip">${escapeHtml(reviewerName(course))}</span>
              <span class="meta-chip">${escapeHtml(course.provider)}</span>
              <span class="meta-chip">${escapeHtml(languageLabel(course.language))}</span>
              <span class="meta-chip">${escapeHtml(t("labels.group"))}: ${escapeHtml(course.groupLabel)}</span>
            </div>
          </div>
          <span class="workload" aria-label="${escapeHtml(t("labels.workload"))} ${course.workload} out of 5">${escapeHtml(t("labels.workload"))} ${course.workload}</span>
        </div>
        <div class="review-attribution"><span>${escapeHtml(termLabel(course.term))}</span>${reviewerLink(reviewerName(course))}</div>
        <p class="course-take">${escapeHtml(course.experience)}</p>
        <button class="course-toggle" type="button" aria-expanded="false" aria-controls="detail-${escapeHtml(course.id)}">${escapeHtml(t("courseDetails.expand"))}</button>
        <div class="course-details" id="detail-${escapeHtml(course.id)}" aria-hidden="true" inert>
          <div>
            <div class="course-detail-inner">
              <dl>
                <dt>${escapeHtml(t("labels.credits"))}</dt><dd>${course.credits}</dd>
                <dt>${escapeHtml(t("labels.term"))}</dt><dd>${escapeHtml(termLabel(course.term))}</dd>
                <dt>${escapeHtml(t("labels.teacher"))}</dt><dd>${escapeHtml(course.teacher)}</dd>
                <dt>${escapeHtml(t("labels.fit"))}</dt><dd>${fieldText(course.fit)}</dd>
                <dt>${escapeHtml(t("labels.avoid"))}</dt><dd>${fieldText(course.avoid)}</dd>
                <dt>${escapeHtml(t("labels.assessment"))}</dt><dd>${fieldText(course.assessment)}</dd>
                ${syllabus}
                ${source}
                ${course.notes ? `<dt>${escapeHtml(t("labels.notes"))}</dt><dd>${escapeHtml(course.notes)}</dd>` : ""}
              </dl>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function courseCard(group) {
    const savedReviewId = selectedReviewByCourse.get(group.key);
    const selectedReview = group.reviews.find((review) => review.id === savedReviewId) || group.reviews[0];

    return `
      <article class="course-card" data-course-key="${escapeHtml(group.key)}" data-expanded="false">
        <div class="course-heading">
          <h3 class="course-title">${escapeHtml(group.title)}</h3>
          ${reviewerTabs(group, selectedReview)}
        </div>
        ${reviewPanel(selectedReview, group.reviews.length > 1)}
      </article>
    `;
  }

  function setCourseExpanded(card, expanded) {
    card.dataset.expanded = String(expanded);
    const button = $(".course-toggle", card);
    const details = $(".course-details", card);
    button.setAttribute("aria-expanded", String(expanded));
    button.textContent = expanded ? t("courseDetails.collapse") : t("courseDetails.expand");
    details.setAttribute("aria-hidden", String(!expanded));
    details.inert = !expanded;
  }

  function bindCourseToggle(card) {
    $(".course-toggle", card)?.addEventListener("click", () => {
      const expanded = card.dataset.expanded === "true";
      setCourseExpanded(card, !expanded);
    });
  }

  function bindReviewerTabs(card, groupsByKey) {
    $$(`[data-reviewer-tab]`, card).forEach((button) => {
      button.addEventListener("click", () => {
        const group = groupsByKey.get(button.dataset.courseKey);
        const review = group?.reviews.find((item) => item.id === button.dataset.reviewId);
        if (!group || !review) return;

        selectedReviewByCourse.set(group.key, review.id);
        const expanded = card.dataset.expanded === "true";
        const panel = $("[data-review-panel]", card);
        if (!panel) return;
        panel.outerHTML = reviewPanel(review, true);
        $$("[data-reviewer-tab]", card).forEach((tab) => {
          tab.setAttribute("aria-selected", String(tab.dataset.reviewId === review.id));
          tab.tabIndex = tab.dataset.reviewId === review.id ? 0 : -1;
        });
        bindCourseToggle(card);
        if (expanded) setCourseExpanded(card, true);
      });
    });
  }

  // Tabs use one Tab stop; arrows, Home and End select another perspective.
  courseGrid.addEventListener("keydown", (event) => {
    const tab = event.target.closest("[data-reviewer-tab]");
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = $$("[data-reviewer-tab]", tab.closest(".reviewer-tabs"));
    const index = tabs.indexOf(tab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
      : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-reviewer-link]");
    if (!link) return;
    const target = document.getElementById(link.hash.slice(1));
    target?.focus({ preventScroll: true });
  });

  function bindCourseCard(card, groupsByKey) {
    bindCourseToggle(card);
    bindReviewerTabs(card, groupsByKey);
  }

  function updateDensityButton() {
    const button = $("[data-density-toggle]");
    if (!button) return;
    button.textContent = compactView ? t("explorer.density.compact") : t("explorer.density.full");
  }

  function renderCourses(expandedIds = []) {
    const filters = getFilters();
    const filtered = data.courses.filter((course) => courseMatches(course, filters));
    const grouped = groupCourses(filtered);
    const totalGroups = groupCourses(data.courses).length;
    const groupsByKey = new Map(grouped.map((group) => [group.key, group]));
    courseGrid.innerHTML = grouped.map(courseCard).join("");
    courseGrid.classList.toggle("compact", compactView);
    resultsCount.textContent = t("explorer.results")
      .replace("{filtered}", grouped.length)
      .replace("{total}", totalGroups);
    emptyState.hidden = grouped.length !== 0;
    updateDensityButton();

    $$(".course-card", courseGrid).forEach((card) => bindCourseCard(card, groupsByKey));

    expandedIds.forEach((id) => {
      const card = $$(".course-card", courseGrid).find((item) => item.dataset.courseKey === id);
      if (card) setCourseExpanded(card, true);
    });
  }

  function resetPresetButtons() {
    $$("[data-filter-preset]").forEach((button) => button.setAttribute("aria-pressed", "false"));
  }

  function applyPreset(name, trigger) {
    applyingPreset = true;
    filterForm.reset();
    applyingPreset = false;
    const query = $("[name='query']", filterForm);
    const provider = $("[name='provider']", filterForm);
    const language = $("[name='language']", filterForm);
    const workload = $("[name='workload']", filterForm);
    const groupWork = $("[name='groupWork']", filterForm);

    if (name === "lighter") workload.value = "1-2";
    if (name === "group") groupWork.value = "any";
    if (name === "japanese") {
      provider.value = "CJL";
      language.value = "Japanese";
    }
    if (name === "business") query.value = "business";
    if (name === "heavy") workload.value = "4-5";

    resetPresetButtons();
    trigger?.setAttribute("aria-pressed", "true");
    renderCourses();
    query.focus({ preventScroll: true });
    $("#courses").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }

  function applyReviewerFilter(reviewer) {
    applyingPreset = true;
    filterForm.reset();
    applyingPreset = false;
    filterForm.elements.takenBy.value = reviewer;
    resetPresetButtons();
    renderCourses();
    filterForm.elements.takenBy.focus({ preventScroll: true });
    $("#courses").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }

  filterForm.addEventListener("input", () => {
    resetPresetButtons();
    renderCourses();
  });

  filterForm.addEventListener("reset", () => {
    if (applyingPreset) return;
    window.requestAnimationFrame(() => {
      resetPresetButtons();
      renderCourses();
    });
  });

  $$("[data-filter-preset]").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.filterPreset, button));
  });

  $$("[data-presenter-filter]").forEach((button) => {
    button.addEventListener("click", () => applyReviewerFilter(button.dataset.presenterFilter));
  });

  $("[data-assessment-search]").addEventListener("click", () => {
    applyPreset("assessment");
    $("[name='query']", filterForm).placeholder = t("explorer.filters.assessmentPlaceholder");
  });

  $("[data-reset-empty]").addEventListener("click", () => {
    filterForm.reset();
    window.requestAnimationFrame(() => {
      renderCourses();
      $("[name='query']", filterForm).focus({ preventScroll: true });
    });
  });

  $("[data-density-toggle]").addEventListener("click", (event) => {
    compactView = !compactView;
    courseGrid.classList.toggle("compact", compactView);
    event.currentTarget.setAttribute("aria-pressed", String(compactView));
    updateDensityButton();
  });

  function timelineState(item, now) {
    const start = new Date(item.start);
    const end = new Date(item.end);
    if (now < start) return "future";
    if (now > end) return "past";
    return "current";
  }

  function currentRegistrationAction(now) {
    const current = data.registration.find((item) => timelineState(item, now) === "current");
    if (current) {
      return {
        status: t("timeline.current"),
        state: "current",
        date: current.dateLabel.replace("\n", " "),
        title: current.title,
        copy: current.action
      };
    }

    const next = data.registration.find((item) => timelineState(item, now) === "future");
    if (next) {
      const isBeforeFirst = next.id === data.registration[0].id;
      return {
        status: isBeforeFirst ? t("timeline.preparing") : t("timeline.next"),
        state: "upcoming",
        date: next.dateLabel.replace("\n", " "),
        title: isBeforeFirst ? t("timeline.beforeFirstTitle") : next.title,
        copy: isBeforeFirst
          ? t("timeline.beforeFirstCopy")
          : next.action
      };
    }

    return {
      status: t("timeline.completed"),
      state: "completed",
      date: t("timeline.completedDate"),
      title: t("timeline.completedTitle"),
      copy: t("timeline.completedCopy")
    };
  }

  function renderTimeline() {
    const now = new Date();
    const action = currentRegistrationAction(now);
    const list = $("[data-timeline-list]");

    list.innerHTML = data.registration
      .map((item) => {
        const state = timelineState(item, now);
        return `
          <li class="timeline-item" data-state="${state}">
            <time class="timeline-date">${escapeHtml(item.dateLabel)}</time>
            <div class="timeline-content">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.action)}</p>
            </div>
          </li>
        `;
      })
      .join("");

    const bindings = [
      ["[data-action-status]", action.status],
      ["[data-action-date]", action.date],
      ["[data-action-title]", action.title],
      ["[data-action-copy]", action.copy],
      ["[data-timeline-status]", action.status],
      ["[data-timeline-title]", action.title],
      ["[data-timeline-copy]", action.copy]
    ];

    bindings.forEach(([selector, value]) => {
      const element = $(selector);
      if (element) element.textContent = value;
    });

    [$("[data-action-status]"), $("[data-timeline-status]")].forEach((chip) => {
      chip?.setAttribute("data-state", action.state);
    });
  }

  function renderResources() {
    const container = $("[data-resource-list]");
    container.innerHTML = data.resources
      .map(
        (resource) => `
          <article class="resource-card">
            <span class="resource-type">${escapeHtml(resource.type)}</span>
            <strong class="resource-name">${escapeHtml(resource.name)}</strong>
            <p class="resource-copy">${escapeHtml(resource.copy)}</p>
            <a class="resource-link" href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer">
              ${escapeHtml(t("resources.open"))}
            </a>
          </article>
        `
      )
      .join("");
  }

  function setupPresenterCards() {
    // Keep keyboard/reading order consistent with the visible layout at each breakpoint.
    const grid = $(".presenter-grid");
    const smallScreen = window.matchMedia("(max-width: 820px)");
    const arrange = () => {
      const author = $(".presenter-chambers", grid);
      const richard = $(".presenter-richard", grid);
      if (smallScreen.matches) grid.insertBefore(author, richard);
      else grid.insertBefore(richard, author);
    };
    arrange();
    smallScreen.addEventListener?.("change", arrange);
    const cards = $$("[data-reveal]");
    if (!cards.length) return;

    const reveal = (card) => card.setAttribute("data-reveal", "visible");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      cards.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    cards.forEach((card) => observer.observe(card));
  }

  function setupInlineWechatCopy() {
    const buttons = $$("[data-copy-wechat-inline]");
    if (!buttons.length) return;

    const copyText = async (value) => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }

      const fallback = document.createElement("textarea");
      fallback.value = value;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand("copy");
      fallback.remove();
      return copied;
    };

    buttons.forEach((button) => {
      let copyResetTimer = 0;
      button.addEventListener("click", async () => {
        const id = button.dataset.wechatId || "";
        const label = $("[data-copy-label]", button);
        if (!id || !label) return;
        window.clearTimeout(copyResetTimer);
        try {
          const copied = await copyText(id);
          label.textContent = copied ? t("contact.copied") : t("contact.copyFailed");
          button.dataset.copyState = copied ? "copied" : "failed";
        } catch (error) {
          label.textContent = t("contact.copyFailed");
          button.dataset.copyState = "failed";
        }
        copyResetTimer = window.setTimeout(() => {
          label.textContent = t("contact.copy");
          delete button.dataset.copyState;
        }, 1800);
      });
    });
  }

  function captureOpenIds(selector, attribute) {
    return $$(selector)
      .map((element) => element.getAttribute(attribute))
      .filter(Boolean);
  }

  function setLocale(locale) {
    if (!locales[locale] || !locales[locale].data || !locales[locale].copy) return;

    const scrollY = window.scrollY;
    const expandedCourseIds = captureOpenIds("[data-course-grid] .course-card[data-expanded='true']", "data-course-key");

    currentLocale = locale;
    data = locales[locale].data;
    copy = locales[locale].copy;
    try {
      window.localStorage.setItem("sils-language", locale);
    } catch (error) {
      // Private browsing and blocked storage should not prevent the toggle from working.
    }

    window.SILS_LOCALIZE_STATIC(locale);
    renderCourses(expandedCourseIds);
    renderTimeline();
    renderResources();
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
  }

  function setupNavigation() {
    const menuButton = $(".menu-toggle");
    const nav = $("#site-nav");
    const navLinks = $$("a", nav);
    const languageButton = $("[data-language-toggle]");

    languageButton?.addEventListener("click", () => {
      setLocale(currentLocale === "en" ? "zh" : "en");
    });

    menuButton.addEventListener("click", () => {
      const open = nav.dataset.open === "true";
      nav.dataset.open = String(!open);
      menuButton.setAttribute("aria-expanded", String(!open));
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        nav.dataset.open = "false";
        menuButton.setAttribute("aria-expanded", "false");
      });
    });

    nav.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      nav.dataset.open = "false";
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.focus();
    });

    const sections = $$("[data-chapter]");
    const routeLinks = $$(".voyage-nav a");
    const allLinks = [...navLinks, ...routeLinks];
    let frame = 0;
    let offsets = [];
    let dirty = true;
    const progressBars = $$(".voyage-progress");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

    function paintMotion() {
      const documentHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const routeProgress = clamp(window.scrollY / documentHeight);
      document.documentElement.style.setProperty("--route-progress", routeProgress.toFixed(4));
      progressBars.forEach((bar) => bar.style.setProperty("--route-progress", routeProgress.toFixed(4)));

      const hero = $(".hero");
      if (hero && !reducedMotionQuery.matches && window.innerWidth > 820) {
        const heroExit = clamp(-hero.getBoundingClientRect().bottom / Math.max(hero.offsetHeight * 0.72, 1));
        hero.style.setProperty("--hero-shift", `${(heroExit * 20).toFixed(2)}px`);
      } else if (hero) {
        hero.style.setProperty("--hero-shift", "0px");
      }
    }

    function paintRoute() {
      frame = 0;
      paintMotion();
      if (dirty) {
        offsets = sections.map(section => section.getBoundingClientRect().top + window.scrollY);
        dirty = false;
      }
      const position = window.scrollY + Math.min(window.innerHeight * 0.3, 200);
      let active = 0;
      offsets.forEach((top, index) => { if (position >= top) active = index; });
      document.documentElement.style.setProperty("--chapter-progress", String(active / Math.max(1, sections.length - 1)));
      routeLinks.forEach(link => {
        const index = sections.findIndex(section => link.hash === "#" + section.id);
        link.toggleAttribute("data-passed", index >= 0 && index < active);
      });
      allLinks.forEach(link => {
        if (link.hash === "#" + sections[active].id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
    function schedule(measure = false) {
      if (measure) dirty = true;
      if (!frame) frame = requestAnimationFrame(paintRoute);
    }
    window.addEventListener("scroll", () => schedule(), { passive: true });
    window.addEventListener("resize", () => schedule(true), { passive: true });
    reducedMotionQuery.addEventListener?.("change", () => schedule(true));
    // Re-measure after filtering, long reviews or details alter chapter positions.
    if ("ResizeObserver" in window) {
      const resize = new ResizeObserver(() => schedule(true));
      resize.observe($("main"));
      resize.observe($("[data-header]"));
      sections.forEach(section => resize.observe(section));
    } else {
      document.addEventListener("toggle", () => schedule(true), true);
      filterForm.addEventListener("input", () => schedule(true));
      document.addEventListener("click", () => schedule(true));
    }
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("chapter-seen");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });
      $$(".chapter-marker").forEach(marker => observer.observe(marker));
    }
    schedule(true);
  }

  window.SILS_LOCALIZE_STATIC(currentLocale);
  renderCourses();
  renderTimeline();
  renderResources();
  setupPresenterCards();
  setupInlineWechatCopy();
  setupNavigation();
})();
