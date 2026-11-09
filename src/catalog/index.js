import * as rules from "./rules.js";
import { translations } from "./translations.js";
import { createCatalogStore } from "./store.js";
export {
  providerCatalog,
  providerInfo,
  providerLabel,
  providerMatches,
  providers,
  groups,
  contentLanguages,
  normalizeTerm,
  termLabel,
  filterCatalog,
} from "./rules.js";
export { createCatalogStore } from "./store.js";
export function createCatalog({ client, view, identity }) {
  const { $, main, t, escapeHtml, safeUrl, link, button, toast, route } = view;
  const gated = (title, description) => view.gated(title, description);
  const shortDate = (value) =>
    value
      ? new Intl.DateTimeFormat(view.language === "zh" ? "zh-CN" : "en", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(new Date(value))
      : "";

  const store = createCatalogStore(client);
  let query = "",
    providerFilter = "",
    languageFilter = "",
    workloadFilter = "",
    groupFilter = "",
    fitFilter = "",
    avoidFilter = "",
    authorFilter = "";
  let hasEnteredBrowse = false,
    filtersExpanded = false;
  const teachingLanguage = (value) =>
    view.language === "zh"
      ? { English: "英语", Japanese: "日语", Chinese: "中文", Other: "其他" }[
          value
        ] || value
      : value;
  function syncFilterPanel() {
    const panel = $(".filter-panel");
    if (panel)
      panel.open =
        !window.matchMedia ||
        window.matchMedia("(min-width: 781px)").matches ||
        filtersExpanded;
  }

  function selectedAuthor() {
    if (authorFilter.startsWith("legacy:")) {
      const key = authorFilter.slice(7);
      return {
        author: "",
        authorReviewIds: identity.wall.legacy_review_ids?.[key] || [],
        label:
          { richard: "Richard", chambers: "Chambers", cindy: "Cindy" }[key] ||
          (view.language === "zh" ? "历史作者" : "Historical contributor"),
      };
    }
    if (!authorFilter.startsWith("profile:"))
      return { author: authorFilter, label: authorFilter };
    const id = authorFilter.slice(8);
    const person = identity.wall.people.find((person) => person.id === id);
    return {
      author: "",
      authorReviewIds:
        person?.review_ids ||
        store.reviews
          .filter((review) => review.public_profile_id === id)
          .map((review) => review.id),
      label:
        person?.display_name ||
        (view.language === "zh"
          ? "已关联名片的体验"
          : "Profile-linked experiences"),
    };
  }

  function authorChoices() {
    const choices = identity.wall.people
      .filter((person) => person.review_ids?.length)
      .map((person) => ({
        value: `profile:${person.id}`,
        label: person.display_name,
        ids: new Set(person.review_ids),
      }));
    for (const person of identity.contributors(view.language)) {
      if (!person.profileId && person.reviewIds?.length)
        choices.push({
          value: person.wallKey,
          label: person.name,
          ids: new Set(person.reviewIds),
        });
    }
    for (const name of [
      ...new Set(
        store.reviews
          .map((review) => review.public_display_name)
          .filter(Boolean),
      ),
    ].sort()) {
      const rows = store.reviews.filter(
        (review) => review.public_display_name === name,
      );
      if (
        !choices.some((choice) =>
          rows.every((review) => choice.ids.has(review.id)),
        )
      )
        choices.push({
          value: name,
          label: name,
          ids: new Set(rows.map((review) => review.id)),
        });
    }
    return choices;
  }

  function displayReview(review) {
    if (review.translationStatus) return review;
    return translations?.displayReview(review, view.language) || review;
  }

  function translationNotice(review, visibleFields) {
    const notice = translations?.noticeFor(
      review,
      view.language,
      visibleFields,
    );
    if (!notice) return "";
    return `<p class="translation-note">${
      notice === "pending"
        ? view.language === "zh"
          ? "部分内容保留作者原文；译文尚待更新。"
          : "Some content is shown in its original language; translation is pending."
        : view.language === "zh"
          ? "译文 · 保留作者原意"
          : "Translated from the contributor’s original"
    }</p>`;
  }

  function reviewTerm(review) {
    return review.legacy_offered_term &&
      review.term === "修读学期未记录 / Term taken not recorded"
      ? (view.language === "zh"
          ? "修读学期未记录；原表开课："
          : "Term taken not recorded; offered: ") + review.legacy_offered_term
      : rules.termLabel(review.term, view.language);
  }

  function courseCard(entry) {
    const { course, reviews, totalReviews, hasReviewFilters } = entry;
    const review = reviews[0] ? displayReview(reviews[0]) : null;
    const noMeasure =
        view.language === "zh" ? "\u672a\u63d0\u4f9b" : "Not provided",
      unknownMeasure =
        view.language === "zh" ? "\u4e0d\u786e\u5b9a" : "Not sure";
    const syllabi = [
      ...new Set(
        [...(course.syllabus_urls || []), course.syllabus_url].filter(Boolean),
      ),
    ]
      .map(safeUrl)
      .filter(Boolean);
    return `<article class="course-card">
      <div class="chips"><span class="pill">${escapeHtml(rules.providerLabel(course.provider, view.language) || "RateMyCourse")}</span>${course.language ? `<span class="pill">${escapeHtml(teachingLanguage(course.language))}</span>` : ""}</div>
      <h3><a href="./#/course/${encodeURIComponent(course.id)}">${escapeHtml(course.title)}</a></h3>
      <p class="meta">${course.course_code ? `${escapeHtml(course.course_code)} · ` : ""}${course.credits ?? "—"} ${view.language === "zh" ? "学分" : course.credits === 1 ? "credit" : "credits"} · ${totalReviews}${view.language === "zh" ? " 条公开体验" : totalReviews === 1 ? " experience" : " experiences"}</p>
      ${
        review
          ? `<section class="card-perspective"><p class="perspective-note small">${view.language === "zh" ? "体验作者：" : "Review by: "}${escapeHtml(review.public_display_name || t("anonymous"))}</p>
      <p class="perspective-scope">${view.language === "zh" ? "以下判断来自这位作者" : "The following reflects this contributor’s experience"}${totalReviews > 1 ? (view.language === "zh" ? ` · 另有 ${totalReviews - 1} 条独立体验` : ` · ${totalReviews - 1} other independent ${totalReviews === 2 ? "experience" : "experiences"}`) : ""}</p>
      ${review.teacher ? `<p class="small review-instructor">${view.language === "zh" ? "授课教师（作者记录）：" : "Instructor (reported by this author): "}${escapeHtml(review.teacher)}</p>` : ""}
      ${translationNotice(review, ["fit", "avoid"])}
      <dl class="audience-notes">${[
        ["fit", review.fit],
        ["avoid", review.avoid],
      ]
        .filter(([, value]) => value)
        .map(
          ([key, value]) =>
            `<div><dt>${escapeHtml(t(key))}</dt><dd>${escapeHtml(value)}</dd></div>`,
        )
        .join("")}</dl>
      <div class="card-measures"><div><p class="measure-label">${escapeHtml(t("workload"))}</p><span class="workload-score"><strong>${review.workload ?? (review.workload_unknown ? unknownMeasure : noMeasure)}</strong>${review.workload != null ? `<span>/ 5</span><small>${escapeHtml(t("workloadNames")[review.workload - 1])}</small>` : ""}</span><p class="small">1 = ${escapeHtml(t("workloadNames")[0])} · 5 = ${escapeHtml(t("workloadNames")[4])}</p></div><div><p class="measure-label">${escapeHtml(t("group"))}</p><p>${escapeHtml(t("groupChoices")[rules.groups.indexOf(review.group_work)] || (review.group_work === "unknown" ? unknownMeasure : noMeasure))}</p></div></div></section>`
          : ""
      }
      ${hasReviewFilters ? `<p class="small">${reviews.length} ${view.language === "zh" ? "条体验同时符合全部体验筛选条件" : reviews.length === 1 ? "experience matches all filters" : "experiences match all filters"}</p>` : ""}
      <div class="card-bottom"><a class="text-link" href="./#/course/${encodeURIComponent(course.id)}">${totalReviews > 1 ? (view.language === "zh" ? `查看全部 ${totalReviews} 条独立体验` : `Read all ${totalReviews} independent experiences`) : view.language === "zh" ? "查看课程与评价" : "View course and reviews"}</a>${syllabi[0] ? `<a class="text-link" href="${escapeHtml(syllabi[0])}" target="_blank" rel="noreferrer">${escapeHtml(t("syllabus"))} ↗</a>` : ""}</div>
    </article>`;
  }

  function shareUrl() {
    return `./#/share${providerFilter ? `?provider=${encodeURIComponent(providerFilter)}` : ""}`;
  }

  function renderBrowse() {
    const author = selectedAuthor();
    const filtered = rules.filterCatalog(
      store.courses,
      store.reviews.map(displayReview),
      {
        query,
        provider: providerFilter,
        language: languageFilter,
        workload: workloadFilter,
        group: groupFilter,
        fit: fitFilter,
        avoid: avoidFilter,
        ...author,
      },
    );
    const option = (value, label, selected) =>
      `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
    main.innerHTML = `<section class="hero">
      <div><p class="eyebrow">${view.language === "zh" ? "早稻田大学" : "WASEDA UNIVERSITY"}</p><h1>${view.language === "zh" ? "找到适合你的课程。" : "Find the courses that fit you."}</h1>
      <p class="subtext"><span class="intro-full">${view.language === "zh" ? "已开放早稻田全部 13 个本科学部及 JCulP、CJL 的投稿入口。比较已收录的修课体验，也欢迎分享尚未收录的课程。浏览免费，无需登录。" : "Contributions are open to all 13 Waseda undergraduate schools, plus JCulP and CJL. Compare listed experiences or contribute a course that is missing. Free to browse, no sign-in needed."}</span><span class="intro-compact">${view.language === "zh" ? "浏览早稻田全部 13 个学部与 CJL，分享你的修课体验。" : "Explore all 13 Waseda schools and CJL. Share your course experience."}</span></p>
      <div class="search"><input id="course-search" type="search" value="${escapeHtml(query)}" placeholder="${escapeHtml(t("search"))}" aria-label="${escapeHtml(t("search"))}"><button class="button" type="button" data-action="search">${view.language === "zh" ? "搜索" : "Search"}</button></div>
      </div><aside class="hero-example"><span class="pill green">${view.language === "zh" ? "免费选课指南" : "FREE REGISTRATION GUIDE"}</span><h2>${view.language === "zh" ? "第一次选课？" : "New to course registration?"}</h2><p>${view.language === "zh" ? "从你的学部／项目出发，找到官方注册说明、课程要求和选课前检查项。" : "Find the official registration instructions, curriculum links, and a short checklist for your programme."}</p><a class="button secondary" href="guide.html"><span class="guide-full">${view.language === "zh" ? "打开选课指南" : "Open the guide"}</span><span class="guide-compact">${view.language === "zh" ? "第一次选课？查看指南" : "New to registration? Open the guide"}</span> ↗</a></aside>
    </section>
    <div class="page-heading browse-heading"><div><h2>${escapeHtml(t("browse"))}</h2></div><a class="button" href="${escapeHtml(shareUrl())}"><span class="contribute-full">${escapeHtml(t("add"))}</span><span class="contribute-compact">${view.language === "zh" ? "分享体验" : "Contribute"}</span></a></div>
    <div class="browse"><details class="filter-panel"><summary>${view.language === "zh" ? "筛选课程" : "Filter courses"}<span>${[providerFilter, languageFilter, workloadFilter, groupFilter, authorFilter, fitFilter, avoidFilter].filter(Boolean).length || (view.language === "zh" ? "全部课程" : "All courses")}</span></summary><form class="filters" id="browse-filters"><h2>${view.language === "zh" ? "筛选课程" : "Filter courses"}</h2>
      <div class="filter"><label for="provider-filter">${escapeHtml(t("provider"))}</label><select id="provider-filter" name="provider"><option value="">${escapeHtml(t("all"))}</option>${rules.providers.map((item) => option(item, rules.providerLabel(item, view.language), providerFilter)).join("")}</select></div>
      <div class="filter"><label for="language-filter">${escapeHtml(t("language"))}</label><select id="language-filter" name="language">${option("", view.language === "zh" ? "全部语言" : "All languages", languageFilter)}${[
        ...new Set(
          store.courses.map((course) => course.language).filter(Boolean),
        ),
      ]
        .sort()
        .map((item) => option(item, teachingLanguage(item), languageFilter))
        .join("")}</select></div>
      <div class="filter"><label for="workload-filter">${escapeHtml(t("workload"))} · 1–5</label><select id="workload-filter" name="workload">${option("", view.language === "zh" ? "全部负担" : "Any workload", workloadFilter)}${option("light", `1–2 · ${view.language === "zh" ? "较轻" : "Lighter"}`, workloadFilter)}${option("3", `3 · ${t("workloadNames")[2]}`, workloadFilter)}${option("heavy", `4–5 · ${view.language === "zh" ? "较重" : "Heavier"}`, workloadFilter)}</select><p class="hint">1 = ${t("workloadNames")[0]} · 5 = ${t("workloadNames")[4]}</p></div>
      <div class="filter"><label for="group-filter">${escapeHtml(t("group"))}</label><select id="group-filter" name="group">${option("", view.language === "zh" ? "全部合作方式" : "Any group work", groupFilter)}${rules.groups.map((key, index) => option(key, t("groupChoices")[index], groupFilter)).join("")}</select></div>
      <div class="filter"><label for="author-filter">${view.language === "zh" ? "体验作者" : "Contributor"}</label><select id="author-filter" name="author">${option("", view.language === "zh" ? "全部作者" : "All contributors", authorFilter)}${authorChoices()
        .map((person) => option(person.value, person.label, authorFilter))
        .join("")}</select></div>
      <details class="audience-filter" ${fitFilter || avoidFilter ? "open" : ""}><summary>${view.language === "zh" ? "更多筛选：适合／不适合" : "More filters: fit and avoid"}</summary><div class="filter"><label for="fit-filter">${escapeHtml(t("fit"))}</label><input id="fit-filter" name="fit" value="${escapeHtml(fitFilter)}"></div><div class="filter"><label for="avoid-filter">${escapeHtml(t("avoid"))}</label><input id="avoid-filter" name="avoid" value="${escapeHtml(avoidFilter)}"></div><p class="hint">${view.language === "zh" ? "按当前显示语言匹配。同一条体验须同时满足各项条件。" : "Matches the displayed language. All conditions must match the same experience."}</p><button class="button secondary" type="submit">${view.language === "zh" ? "应用筛选" : "Apply filters"}</button></details>${button("clear-filters", view.language === "zh" ? "清除筛选" : "Clear filters", "quiet filter-reset")}
    </form></details><section><p class="results-meta" role="status" aria-live="polite"><span>${filtered.length} / ${store.courses.length}${authorFilter ? ` · ${escapeHtml(author.label)}` : ""}</span><span>${view.language === "zh" ? "条课程记录 · 每位作者的体验分别呈现。" : "catalog records · Each contributor’s experience is shown separately."}</span></p><div class="course-grid">${filtered.map(courseCard).join("") || `<div class="empty-state"><h2>${escapeHtml(t("empty"))}</h2><p>${view.language === "zh" ? "没有找到这门课？添加课程资料并分享第一条体验。" : "Course missing? Add its details and share the first experience."}</p>${link(shareUrl(), t("add"), "button")}${button("clear-filters", view.language === "zh" ? "清除筛选" : "Clear filters", "button secondary")}</div>`}</div></section></div>`;
    syncFilterPanel();
    if (!hasEnteredBrowse) {
      hasEnteredBrowse = true;
      main.classList.add("is-entering");
      window.setTimeout(() => main.classList.remove("is-entering"), 650);
    }
  }

  function readBrowseFilters() {
    const form = $("#browse-filters");
    if (!form) return;
    const values = new FormData(form);
    providerFilter = String(values.get("provider") || "");
    languageFilter = String(values.get("language") || "");
    workloadFilter = String(values.get("workload") || "");
    groupFilter = String(values.get("group") || "");
    fitFilter = String(values.get("fit") || "").trim();
    avoidFilter = String(values.get("avoid") || "").trim();
    authorFilter = String(values.get("author") || "");
    syncAuthorRoute();
  }

  function syncAuthorRoute() {
    if (route().path !== "browse") return;
    const params = route().params;
    params.delete("section");
    if (providerFilter) params.set("provider", providerFilter);
    else params.delete("provider");
    if (authorFilter.startsWith("profile:"))
      params.set("author", authorFilter.slice(8));
    else params.delete("author");
    if (authorFilter.startsWith("legacy:"))
      params.set("legacy_author", authorFilter.slice(7));
    else params.delete("legacy_author");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#/browse${params.size ? `?${params}` : ""}`,
    );
  }

  function authorIdentity(review, avatar) {
    const name = review.public_display_name || t("anonymous");
    const avatarMarkup = avatar
      ? `<img src="${escapeHtml(avatar)}" alt="" style="${identity.avatarStyle(review.public_avatar_crop)}">`
      : escapeHtml(name.slice(0, 1).toUpperCase());
    const profileLink = review.public_profile_id
      ? `<a class="text-link" href="./#/people/${encodeURIComponent(review.public_profile_id)}">${escapeHtml(t("openProfile"))} ↗</a>`
      : "";
    return `<div class="review-identity"><span class="review-avatar">${avatarMarkup}</span><div><strong>${view.language === "zh" ? "体验作者：" : "Review by: "}${escapeHtml(name)}</strong><small>${escapeHtml(reviewTerm(review))}</small></div>${profileLink}</div>`;
  }

  function reviewText(value) {
    return String(value ?? "")
      .split(/(https?:\/\/[^\s<>"']+)/g)
      .map((part, index) => {
        if (index % 2 === 0) return escapeHtml(part);
        const url = safeUrl(part);
        return url
          ? `<a class="text-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(part)}</a>`
          : escapeHtml(part);
      })
      .join("");
  }

  async function reviewCard(review, { preview = false } = {}) {
    const readingCopy = displayReview(review);
    const sourceLanguage = String(review.content_language || "")
      .toLowerCase()
      .split(/[-_]/)[0];
    const translatedFields =
      sourceLanguage && sourceLanguage !== view.language
        ? readingCopy.translationStatus?.translatedFields || []
        : [];
    const avatar = review.public_avatar_path
      ? await identity.signedAvatar(review.public_avatar_path)
      : "";
    const contextFields = [
      [
        view.language === "zh" ? "修读项目／学部" : "Programme",
        review.reviewer_programme,
      ],
      [view.language === "zh" ? "修读时年级" : "Year", review.reviewer_year],
      [
        view.language === "zh" ? "相关知识基础" : "Prior knowledge",
        review.reviewer_prior_knowledge,
      ],
      [
        view.language === "zh" ? "选课目标" : "Course goal",
        review.reviewer_selection_goal,
      ],
    ].filter(([, value]) => value);
    const workload = Number(review.workload);
    const validWorkload =
      Number.isInteger(workload) && workload >= 1 && workload <= 5;
    const groupIndexes = { none: 0, some: 1, heavy: 2, mixed: 3 };
    const groupIndex = Object.prototype.hasOwnProperty.call(
      groupIndexes,
      review.group_work,
    )
      ? groupIndexes[review.group_work]
      : undefined;
    const notProvided = view.language === "zh" ? "未提供" : "Not provided";
    const notSure = view.language === "zh" ? "不确定" : "Not sure";
    const attendanceLabels =
      view.language === "zh"
        ? {
            required: "要求出席",
            not_required: "不要求出席",
            conditional: "部分活动要求出席",
            unknown: notSure,
          }
        : {
            required: "Required",
            not_required: "Not required",
            conditional: "Required for some activities",
            unknown: notSure,
          };
    const againLabels =
      view.language === "zh"
        ? { yes: "愿意", no: "不愿意", unsure: "还不确定" }
        : { yes: "Yes", no: "No", unsure: "Not sure yet" };
    const reviewSection = (key, value, kind = "review") =>
      value
        ? `<section class="review-body" data-${kind}-field="${key}"><h3>${escapeHtml(t(key))}</h3><p>${reviewText(value)}</p></section>`
        : "";
    return `<article class="experience">
      <dl class="review-measures" aria-label="${view.language === "zh" ? "这位作者的课程判断" : "This contributor’s course indicators"}"><div${validWorkload ? "" : ' class="is-unavailable"'}><dt>${escapeHtml(t("workload"))}</dt><dd><strong>${validWorkload ? workload : review.workload_unknown ? notSure : notProvided}</strong>${validWorkload ? `<span>/ 5 · ${escapeHtml(t("workloadNames")[workload - 1])}</span>` : ""}</dd></div><div${groupIndex === undefined ? ' class="is-unavailable"' : ""}><dt>${escapeHtml(t("group"))}</dt><dd><strong>${groupIndex === undefined ? (review.group_work === "unknown" ? notSure : notProvided) : escapeHtml(t("groupChoices")[groupIndex])}</strong></dd></div><div${review.attendance ? "" : ' class="is-unavailable"'}><dt>${view.language === "zh" ? "出席要求" : "Attendance"}</dt><dd><strong>${escapeHtml(attendanceLabels[review.attendance] || notProvided)}</strong></dd></div><div${review.take_again ? "" : ' class="is-unavailable"'}><dt>${view.language === "zh" ? "是否愿意再选" : "Would take again"}</dt><dd><strong>${escapeHtml(againLabels[review.take_again] || notProvided)}</strong></dd></div></dl>
      ${reviewSection("experience", review.experience)}
      ${review.fit || review.avoid ? `<div class="fit-pair">${reviewSection("fit", review.fit)}${reviewSection("avoid", review.avoid)}</div>` : ""}
      ${reviewSection("assessment", review.assessment)}
      ${reviewSection("notes", review.notes)}
      ${
        translatedFields.length
          ? `<details class="original-review review-translation"><summary>${view.language === "zh" ? "查看已有中文译文" : "Read existing English translation"}</summary>${[
              "experience",
              "fit",
              "avoid",
              "assessment",
              "notes",
            ]
              .filter((key) => translatedFields.includes(key))
              .map((key) => reviewSection(key, readingCopy[key], "translation"))
              .join("")}</details>`
          : ""
      }
      <div class="review-author">
        <div class="review-top"><div>${authorIdentity(review, avatar)}${review.legacy_source_id || preview ? "" : `<small>${escapeHtml(shortDate(review.created_at))}</small>`}</div><span class="pill green">${preview ? (view.language === "zh" ? "公开预览" : "Public preview") : review.legacy_source_id ? (view.language === "zh" ? "历史导入" : "Archive") : escapeHtml(t("approved"))}</span></div>
        ${review.teacher ? `<p class="small review-instructor">${view.language === "zh" ? "授课教师（作者记录）：" : "Instructor (reported by this author): "}${escapeHtml(review.teacher)}</p>` : ""}
        ${review.share_background && contextFields.length ? `<section class="context"><div class="context-label">${view.language === "zh" ? "作者自述背景" : "AUTHOR-REPORTED BACKGROUND"}<span>${escapeHtml(t("contextAuthor"))}</span></div><dl class="context-grid">${contextFields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>` : ""}
        ${review.legacy_source_url ? `<details class="source-note"><summary>${view.language === "zh" ? "来源与修读时间说明" : "Source and term information"}</summary><p class="small">${view.language === "zh" ? "从原始课程表恢复；原表的 Spring／Fall 为开课信息，不作为作者修读时间。" : "Restored from the original course sheet. Spring / Fall describes when the course is offered, not when the author took it."}</p></details>` : ""}
      </div>
    </article>`;
  }

  async function renderCourse(id, version) {
    id = store.canonical(id);
    const detail = await store.detail(id);
    if (version !== view.version) return;
    const course = detail?.course;
    if (!course) {
      main.innerHTML = `<div class="empty-state"><h2>${escapeHtml(t("empty"))}</h2>${link("./#/browse", t("backToBrowse"), "button")}</div>`;
      return;
    }
    const data = detail.reviews;
    const syllabi = [
      ...new Set(
        [...(course.syllabus_urls || []), course.syllabus_url].filter(Boolean),
      ),
    ]
      .map(safeUrl)
      .filter(Boolean);
    const reviews = data || [];
    const teachers = [
      ...new Set(
        reviews.map((review) => review.teacher?.trim()).filter(Boolean),
      ),
    ];
    const terms = [
      ...new Set(
        reviews
          .map((review) =>
            review.term === "修读学期未记录 / Term taken not recorded"
              ? view.language === "zh"
                ? "未记录"
                : "Not recorded"
              : rules.termLabel(review.term, view.language),
          )
          .filter(Boolean),
      ),
    ];
    const cards = await Promise.all(reviews.map(reviewCard));
    if (version !== view.version) return;
    const proposalButton = `<a class="button" href="./#/share?course=${encodeURIComponent(id)}">${view.language === "zh" ? "分享这门课的体验" : "Share your experience"}</a>`;
    main.innerHTML = `<div class="crumb"><a href="./#/browse">${escapeHtml(t("browse"))}</a><span>›</span><span>${escapeHtml(rules.providerLabel(course.provider, view.language))}</span></div>
      <header class="course-heading"><h1 class="detail-title">${escapeHtml(course.title)}</h1>
      <dl class="course-summary"><div><dt>${view.language === "zh" ? "教师（作者记录）" : "Instructor (author-reported)"}</dt><dd>${escapeHtml(teachers.join(" / ") || "—")}</dd></div><div><dt>${escapeHtml(t("term"))}</dt><dd>${escapeHtml(terms.join(" / ") || "—")}</dd></div><div><dt>${escapeHtml(t("credits"))}</dt><dd>${escapeHtml(course.credits ?? "—")}</dd></div></dl></header>
      <h2 class="visually-hidden" id="course-experiences-title">${view.language === "zh" ? "修课体验" : "Student experiences"} (${reviews.length})</h2>
      <div class="detail-layout"><div class="detail-reading"><section class="review-stack" aria-labelledby="course-experiences-title">${reviews.length ? cards.join("") : `<div class="empty-state"><h2>${escapeHtml(t("noReviews"))}</h2>${proposalButton}</div>`}</section>
      <section class="official-course-info" aria-labelledby="official-course-title"><h2 id="official-course-title">${view.language === "zh" ? "官方课程信息" : "Official course information"}</h2>
      <dl class="course-facts"><div><dt>${escapeHtml(t("courseCode"))}</dt><dd>${escapeHtml(course.course_code || "—")}</dd></div><div><dt>${escapeHtml(t("credits"))}</dt><dd>${escapeHtml(course.credits ?? "—")}</dd></div><div><dt>${escapeHtml(t("language"))}</dt><dd>${escapeHtml(teachingLanguage(course.language) || "—")}</dd></div></dl>
      <div class="syllabus-row">${syllabi.length ? syllabi.map((url, i) => `<a class="text-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(t("syllabus"))}${syllabi.length > 1 ? ` ${i + 1}` : ""} ↗</a>`).join("") : `<span class="small">${view.language === "zh" ? "暂无官方链接" : "No official syllabus link listed"}</span>`}</div></section></div>
      <aside><div class="side-card green"><h3>${view.language === "zh" ? "分享你的视角" : "Add your perspective"}</h3><p>${view.language === "zh" ? "每条评价保留作者自己的课程负担和适合度，不做平均分排名。" : "Each contribution keeps the author’s own workload and fit notes; experiences are not averaged into a rating."}</p>${proposalButton}</div></aside></div>`;
  }
  return {
    load: store.load,
    invalidate: store.invalidate,
    canonical: store.canonical,
    get loaded() {
      return store.loaded;
    },
    get courses() {
      return store.courses;
    },
    reviewCard,
    renderCourse,
    renderBrowse,
    shareUrl,
    selectedAuthor,
    enter(current) {
      providerFilter = rules.providers.includes(current.params.get("provider"))
        ? current.params.get("provider")
        : "";
      if (current.params.has("author"))
        authorFilter = "profile:" + current.params.get("author");
      else if (current.params.has("legacy_author"))
        authorFilter = "legacy:" + current.params.get("legacy_author");
    },
    selectAuthor(key) {
      query =
        providerFilter =
        languageFilter =
        workloadFilter =
        groupFilter =
        fitFilter =
        avoidFilter =
          "";
      authorFilter = key;
      syncAuthorRoute();
      renderBrowse();
      const results = $(".results-meta");
      results?.setAttribute("tabindex", "-1");
      results?.scrollIntoView({ block: "start", behavior: "instant" });
      results?.focus({ preventScroll: true });
    },
    handleClick(event) {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "search") {
        query = $("#course-search")?.value || "";
        renderBrowse();
        $(".results-meta")?.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
        return true;
      }
      if (action === "clear-filters") {
        query =
          providerFilter =
          languageFilter =
          workloadFilter =
          groupFilter =
          fitFilter =
          avoidFilter =
          authorFilter =
            "";
        syncAuthorRoute();
        renderBrowse();
        return true;
      }
      return false;
    },
    handleChange(event) {
      if (!event.target.matches("#browse-filters select")) return;
      const id = event.target.id;
      readBrowseFilters();
      renderBrowse();
      document.getElementById(id)?.focus({ preventScroll: true });
    },
    handleInput(event) {
      if (!event.target.matches("#course-search")) return;
      query = event.target.value;
      renderBrowse();
      const input = $("#course-search");
      input?.focus();
      input?.setSelectionRange(query.length, query.length);
    },
    handleSubmit(event) {
      if (event.target.id !== "browse-filters") return false;
      event.preventDefault();
      readBrowseFilters();
      renderBrowse();
      return true;
    },
    syncFilterPanel,
    toggle(event) {
      if (
        event.target.matches(".filter-panel") &&
        matchMedia("(max-width:780px)").matches
      )
        filtersExpanded = event.target.open;
    },
  };
}
