(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const main = $("#main");
  const auth = window.SILS_AUTH;
  const db = auth?.client;
  const model = window.SILS_COMMUNITY_MODEL;
  const PUBLIC_REVIEW_FIELDS = "id,course_id,suggested_course_title,suggested_course_provider,suggested_course_code,suggested_course_credits,suggested_course_language,suggested_course_syllabus_url,term,teacher,workload,group_work,assessment,fit,avoid,experience,notes,content_language,created_at,share_background,reviewer_programme,reviewer_year,reviewer_prior_knowledge,reviewer_selection_goal,public_display_name,public_avatar_path,public_avatar_crop,public_profile_id,legacy_source_id,legacy_source_url,legacy_offered_term,translation_en";
  const OWN_REVIEW_FIELDS = `${PUBLIC_REVIEW_FIELDS},reviewer_id,status,reviewer_background,updated_at,suggested_course_syllabus_urls,show_name,show_avatar`;
  const COURSE_FIELDS = "id,course_code,title,provider,credits,language,syllabus_url,syllabus_urls,created_at,canonical_course_id";
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
  const BUCKET = "reviewer-avatars";
  const copy = {
    zh: {
      browse: "课程浏览", mine: "我的投稿", profile: "个人名片", share: "分享课程体验", search: "搜索课程名、代码或学部", all: "全部学部", loading: "正在连接课程数据库…", empty: "还没有符合条件的课程。", add: "添加课程并分享体验", syllabus: "官方课程说明", syllabusUrls: "官方 Syllabus 链接（每行一个）", reviews: "条公开体验", noReviews: "这门课还没有公开评价。你可以分享第一条体验。", anonymous: "匿名投稿者", approved: "已发布", pending: "待审核", changes_requested: "需要修改", needs_human: "人工复核", withdrawn: "已撤回", workload: "课程负担", group: "小组合作", term: "修读学期", teacher: "教师", assessment: "考核方式", fit: "适合谁", avoid: "不适合谁", experience: "课程体验", notes: "补充说明", signIn: "使用 Google 继续", signedOut: "你已退出登录。", notReady: "连接失败。请稍后重试。", authError: "登录未完成，请重试。", loginRequired: "登录后可提交课程体验并管理自己的投稿。", submit: "提交审核", save: "保存资料", saveReview: "保存修改并重新审核", cancel: "返回", edit: "编辑", profilePrivate: "个人名片目前未公开。", noMine: "你还没有投稿。", displayName: "公开显示名", programme: "修读项目／学部", studyYear: "修读时年级", priorKnowledge: "相关知识基础", selectionGoal: "当时选课目标", bio: "个人简介", publicProfile: "公开个人名片", avatar: "个人照片", choosePhoto: "选择照片", removePhoto: "移除照片", uploadHint: "JPG、PNG 或 WebP，最大 5 MB。照片不会自动从 Google 导入。", saveHint: "资料和头像只在你保存后才上传。关闭公开名片后，读者无法打开名片。", showName: "在这条体验上显示我的显示名", showAvatar: "在这条体验上显示我的照片", showProfile: "允许读者打开我的公开名片", shareBackground: "随这条体验公开上述修课背景", newCourse: "这是一门尚未收录的课程", courseTitle: "课程名称", provider: "学部／项目", courseCode: "课程代码", credits: "学分", language: "授课语言", syllabusUrl: "官方 Syllabus 链接", existingCourse: "已收录课程", selectCourse: "选择一门课程", groupChoices: ["没有", "有一些", "很多", "视课程而异"], workloadNames: ["很轻", "较轻", "中等", "较重", "很重"], status: "审核状态", openProfile: "查看公开名片", profileSaved: "个人资料已保存。", reviewSaved: "投稿已提交审核。", updated: "修改已提交并重新进入审核。", photoRemoved: "照片已移除。", photoError: "请选择 JPG、PNG 或 WebP，且文件小于 5 MB。", required: "请填写课程、学期、课程体验，并选择课程负担与小组合作情况。", ownProfile: "先补充公开显示名，才能在投稿中选择显示姓名。", profilePhoto: "先上传照片，才能在投稿中选择显示照片。", publicProfileNeeded: "先公开个人名片，才能添加名片入口。", contextAuthor: "以下背景由作者自述，不代表学校核验。", serverError: "数据库操作失败：", backToBrowse: "返回课程浏览", newPhoto: "待保存照片已选好。保存资料后上传。", noPhoto: "尚未选择照片。", returnSite: "返回选课工作台"
    },
    en: {
      browse: "Browse courses", mine: "My contributions", profile: "Profile card", share: "Share an experience", search: "Search course, code, or programme", all: "All programmes", loading: "Connecting to the course database…", empty: "No courses match your search.", add: "Add a course and share an experience", syllabus: "Official syllabus", syllabusUrls: "Official syllabus URLs (one per line)", reviews: " published experience(s)", noReviews: "No public reviews yet. Share the first experience.", anonymous: "Anonymous contributor", approved: "Published", pending: "Pending review", changes_requested: "Changes requested", needs_human: "Needs human review", withdrawn: "Withdrawn", workload: "Workload", group: "Group work", term: "Term taken", teacher: "Instructor", assessment: "Assessment", fit: "Good fit for", avoid: "May not fit", experience: "Course experience", notes: "Additional notes", signIn: "Continue with Google", signedOut: "You have signed out.", notReady: "Could not connect. Please try again later.", authError: "Sign-in did not complete. Please try again.", loginRequired: "Sign in to submit a course experience and manage your contributions.", submit: "Submit for review", save: "Save profile", saveReview: "Save changes and resubmit", cancel: "Back", edit: "Edit", profilePrivate: "This profile card is not public.", noMine: "You have not submitted anything yet.", displayName: "Public display name", programme: "Programme / school", studyYear: "Year when taken", priorKnowledge: "Relevant prior knowledge", selectionGoal: "Your goal when choosing the course", bio: "Short introduction", publicProfile: "Make my profile card public", avatar: "Profile photo", choosePhoto: "Choose a photo", removePhoto: "Remove photo", uploadHint: "JPG, PNG, or WebP, up to 5 MB. Your Google photo is never imported automatically.", saveHint: "Your details and photo upload only when you save. Readers cannot open your card while it is private.", showName: "Show my display name on this experience", showAvatar: "Show my photo on this experience", showProfile: "Let readers open my public profile card", shareBackground: "Share the course background above with this experience", newCourse: "This course is not listed yet", courseTitle: "Course title", provider: "Programme", courseCode: "Course code", credits: "Credits", language: "Teaching language", syllabusUrl: "Official syllabus URL", existingCourse: "Listed course", selectCourse: "Choose a course", groupChoices: ["None", "Some", "Heavy", "Varies"], workloadNames: ["Very light", "Light", "Moderate", "Heavy", "Very heavy"], status: "Status", openProfile: "View profile card", profileSaved: "Profile saved.", reviewSaved: "Your contribution is awaiting review.", updated: "Changes saved and resubmitted for review.", photoRemoved: "Photo removed.", photoError: "Choose a JPG, PNG, or WebP file under 5 MB.", required: "Choose a course, term, workload and group-work level, and describe your experience.", ownProfile: "Add a display name in your profile before choosing to show it on a review.", profilePhoto: "Upload a photo before choosing to show it on a review.", publicProfileNeeded: "Make your profile public before adding a profile link.", contextAuthor: "The author supplied this background. It is not school-verified.", serverError: "Database request failed: ", backToBrowse: "Back to courses", newPhoto: "Photo selected. Save your profile to upload it.", noPhoto: "No photo selected.", returnSite: "Back to course workbench"
    }
  };

  Object.assign(copy.zh, { search: "搜索课程、教师或体验关键词", invalidSyllabus: "请逐行填写完整的 http:// 或 https:// 链接，最多 10 个。", invalidCredits: "学分须在 0–999.9 之间，最多一位小数。" });
  Object.assign(copy.en, { search: "Search courses, instructors, or experiences", invalidSyllabus: "Enter a complete http:// or https:// URL per line, up to 10 links.", invalidCredits: "Credits must be between 0 and 999.9, with at most one decimal place." });

  let language = localStorage.getItem("odyssey-community-language") || (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");
  let session = null;
  let profile = null;
  let courses = [];
  let courseAliases = new Map();
  let publishedReviews = [];
  let localPhotoUrl = "";
  let selectedPhoto = null;
  let photoDraft = null, cleanupPhotoEditor;
  const photos = window.SILS_PHOTO;
  let avatarUrlCache = new Map();
  let query = "";
  let providerFilter = "";
  let languageFilter = "";
  let workloadFilter = "";
  let groupFilter = "";
  let fitFilter = "";
  let avoidFilter = "";
  let renderVersion = 0;
  let authLoaded = false;
  let catalogLoadedAt = 0;
  let browseScrollY = 0;
  let activePath = "browse";
  let hasEnteredBrowse = false;
  let filtersExpanded = false;
  const formDrafts = new Map();
  let activeFormKey = "", activeFormBaseline = "";
  let authorFilter = "";
  let cleanupWall;
  let wallLanguage = "";
  let wallData = { people: [], replaced_legacy_keys: ["chambers", "cindy", "richard"] };
  let wallLoadedAt = 0;
  let wallRequest = 0;
  let mountedWallData = "";
  let metricsAdmin = false;
  let metricsAccountId;
  const sourceLanguages = { zh: { zh: "中文", en: "英语", ja: "日语", mixed: "多种语言", other: "其他语言" }, en: { zh: "Chinese", en: "English", ja: "Japanese", mixed: "Multiple languages", other: "Another language" } };
  Object.assign(copy.zh, { profileStudyStage: "年级／届别（自述）", invalidContentLanguage: "请选择评价原文使用的语言。", wallNameRequired: "加入名片墙前，请填写公开显示名。" });
  Object.assign(copy.en, { profileStudyStage: "Year / cohort (self-reported)", invalidContentLanguage: "Choose the original language of your review.", wallNameRequired: "Add a public display name before joining the contributor wall." });
  let loginTarget = "";

  const t = (key) => copy[language][key === "published" ? "approved" : key];
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const shortDate = (value) => value ? new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)) : "";
  const safeUrl = (value) => { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch (_) { return ""; } };
  const route = () => {
    const raw = window.location.hash.replace(/^#\/?/, "");
    const [routePath = "browse", search = ""] = raw.split("?");
    const [path = "browse", ...parts] = routePath.split("/");
    return { path: path || "browse", id: parts.join("/"), params: new URLSearchParams(search) };
  };
  const toast = (message) => {
    const node = $("#toast"); node.textContent = message; node.hidden = false;
    window.clearTimeout(toast.timer); toast.timer = window.setTimeout(() => { node.hidden = true; }, 3600);
  };
  const fail = (error) => toast(`${t("serverError")}${error?.message || t("notReady")}`);
  const login = (target = "") => { loginTarget = target; $("#login").showModal(); };
  const link = (href, label, klass = "text-link") => `<a class="${klass}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  const button = (action, label, klass = "button") => `<button class="${klass}" type="button" data-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`;

  // Drafts stay in this tab's memory, scoped to the owning account and exact form.
  function formFields(form) {
    return [...form.elements].filter(input => input.name && !["file", "submit", "button"].includes(input.type))
      .map(input => ({ name: input.name, type: input.type, value: input.value, checked: input.checked }));
  }
  function rememberForm() {
    const form = $("#profile-form, #review-form");
    if (!form || !activeFormKey) return;
    const fields = formFields(form);
    if (JSON.stringify(fields) === activeFormBaseline) formDrafts.delete(activeFormKey);
    else formDrafts.set(activeFormKey, fields);
    updateDraftStatus();
  }
  function updateDraftStatus() {
    const status = $(".draft-status");
    if (!status) return;
    const dirty = formDrafts.has(activeFormKey) || Boolean(selectedPhoto) || photos?.dirty(photoDraft);
    status.hidden = !dirty;
    status.textContent = language === "zh" ? "有未保存的修改 · 此标签页内保留，刷新前请保存。" : "Unsaved changes · Kept in this tab. Save before reloading.";
  }
  function restoreForm(current) {
    const form = $("#profile-form, #review-form");
    activeFormKey = ""; activeFormBaseline = "";
    if (!form || !session?.user.id) return;
    activeFormKey = JSON.stringify([session.user.id, current.path, current.params.get("edit") || "", current.params.get("course") || ""]);
    activeFormBaseline = JSON.stringify(formFields(form));
    const fields = formDrafts.get(activeFormKey);
    if (fields) fields.forEach(field => {
      [...form.elements].filter(input => input.name === field.name && input.type === field.type &&
        (!["radio", "checkbox"].includes(field.type) || input.value === field.value)).forEach(input => {
        if (["radio", "checkbox"].includes(field.type)) input.checked = field.checked;
        else input.value = field.value;
      });
    });
    toggleNewCourseFields(); toggleTermField(); toggleWallChoice();
    const status = document.createElement("p"); status.className = "draft-status hint"; status.setAttribute("role", "status");
    form.querySelector(".form-actions").before(status);
    updateDraftStatus();
  }
  function clearFormDraft() { formDrafts.delete(activeFormKey); activeFormKey = ""; activeFormBaseline = ""; }
  function syncFilterPanel() {
    const panel = $(".filter-panel");
    if (panel) panel.open = !window.matchMedia || window.matchMedia("(min-width: 781px)").matches || filtersExpanded;
  }

  async function signedAvatar(path) {
    if (!path || !db) return "";
    const cached = avatarUrlCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 1800);
    const url = error ? "" : data?.signedUrl || "";
    if (url) avatarUrlCache.set(path, { url, expiresAt: Date.now() + 25 * 60 * 1000 });
    return url;
  }

  async function getProfile() {
    if (!session?.user) { profile = null; return null; }
    const userId = session.user.id;
    const { data, error } = await db.from("reviewer_profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    if (session?.user.id !== userId) return null;
    profile = data || null;
    return profile;
  }

  async function loadCourses() {
    if (catalogLoadedAt && Date.now() - catalogLoadedAt < 60000) return;
    const { data, error } = await db.from("courses").select(COURSE_FIELDS).order("title");
    if (error) throw error;
    courseAliases = new Map((data || []).filter(course => course.canonical_course_id).map(course => [course.id, course.canonical_course_id]));
    courses = (data || []).filter(course => !course.canonical_course_id);
    const { data: reviewData, error: reviewError } = await db.from("reviews").select("id,course_id,workload,group_work,fit,avoid,experience,assessment,teacher,notes,term,content_language,public_display_name,public_profile_id,legacy_source_id,legacy_source_url,legacy_offered_term,translation_en").eq("status", "published").not("course_id", "is", null);
    if (reviewError) throw reviewError;
    publishedReviews = reviewData || [];
    catalogLoadedAt = Date.now();
  }

  async function loadContributors(force = false) {
    if (!force && wallLoadedAt && Date.now() - wallLoadedAt < 60000) return;
    const request = ++wallRequest;
    try {
      const { data, error } = await db.rpc("get_contributor_wall");
      if (error) throw error;
      const people = await Promise.all((data?.people || []).map(async person => ({ ...person, avatar_url: await signedAvatar(person.avatar_path) })));
      if (request !== wallRequest) return;
      wallData = { people, replaced_legacy_keys: data?.replaced_legacy_keys || [], legacy_review_ids: data?.legacy_review_ids || {} };
      wallLoadedAt = Date.now();
    } catch (error) {
      if (request !== wallRequest) return;
      // Fail closed: never revive an opted-out historical card after a failed read.
      wallData = { people: [], replaced_legacy_keys: ["chambers", "cindy", "richard"] };
      wallLoadedAt = 0;
    }
  }

  function selectedAuthor() {
    if (authorFilter.startsWith("legacy:")) {
      const key = authorFilter.slice(7);
      return { author: "", authorReviewIds: wallData.legacy_review_ids?.[key] || [], label: ({ richard: "Richard", chambers: "Chambers", cindy: "Cindy" })[key] || (language === "zh" ? "历史作者" : "Historical contributor") };
    }
    if (!authorFilter.startsWith("profile:")) return { author: authorFilter, label: authorFilter };
    const id = authorFilter.slice(8);
    const person = wallData.people.find(person => person.id === id);
    return { author: "", authorReviewIds: person?.review_ids || publishedReviews.filter(review => review.public_profile_id === id).map(review => review.id), label: person?.display_name || (language === "zh" ? "已关联名片的体验" : "Profile-linked experiences") };
  }

  function authorChoices() {
    const choices = wallData.people.filter(person => person.review_ids?.length).map(person => ({ value: `profile:${person.id}`, label: person.display_name, ids: new Set(person.review_ids) }));
    for (const person of window.SILS_NAMECARD_WALL?.buildPeople(wallData, language) || []) {
      if (!person.profileId && person.reviewIds?.length) choices.push({ value: person.wallKey, label: person.name, ids: new Set(person.reviewIds) });
    }
    for (const name of [...new Set(publishedReviews.map(review => review.public_display_name).filter(Boolean))].sort()) {
      const rows = publishedReviews.filter(review => review.public_display_name === name);
      if (!choices.some(choice => rows.every(review => choice.ids.has(review.id)))) choices.push({ value: name, label: name, ids: new Set(rows.map(review => review.id)) });
    }
    return choices;
  }

  function loadMetricsRole() {
    const id = session?.user.id || "";
    if (metricsAccountId === id) return;
    metricsAccountId = id; metricsAdmin = false;
    if (id && db?.rpc) db.rpc("site_metrics_admin_status").then(({ data, error }) => {
      if (metricsAccountId !== id) return;
      metricsAdmin = !error && data === true;
      renderHeader();
    }).catch(() => {});
  }

  function renderHeader() {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    $(".brand").setAttribute("aria-label", language === "zh" ? "RateMyCourse 首页" : "RateMyCourse home");
    $("nav").setAttribute("aria-label", language === "zh" ? "RateMyCourse 导航" : "RateMyCourse navigation");
    $(".skip").textContent = language === "zh" ? "跳到主要内容" : "Skip to main content";
    $("#auth-notice").textContent = language === "zh" ? "Google 登录仅用于账户与投稿归属，不代表学籍或修课经历已验证。" : "Google sign-in establishes account ownership; it does not verify student status or course attendance.";
    $("#login-title").textContent = language === "zh" ? "分享你的课程体验" : "Share your course experience";
    $("#login-description").textContent = language === "zh" ? "浏览课程无需登录。登录后可提交体验、查看审核状态和编辑自己的投稿。" : "Browse without signing in. Sign in to contribute, check moderation status, and edit your own submissions.";
    $("#login-privacy").textContent = language === "zh" ? "登录邮箱不会显示在评价或个人名片中。此登录不读取 Gmail 邮件，也不会验证学籍。" : "Your login email is not shown on reviews or profile cards. Sign-in does not read Gmail or verify student status.";
    $("[data-close-login]").setAttribute("aria-label", language === "zh" ? "关闭" : "Close");
    $("#login [data-community-signin]").textContent = t("signIn");
    $(".brand small").textContent = language === "zh" ? "课程体验" : "COURSE EXPERIENCES";
    $("#language-toggle").textContent = language === "zh" ? "English" : "中文";
    const labels = { browse: t("browse"), mine: t("mine"), profile: t("profile"), guide: language === "zh" ? "选课指南" : "Registration guide", contributors: language === "zh" ? "分享者" : "Contributors" };
    document.querySelectorAll("[data-nav]").forEach((anchor) => {
      anchor.textContent = labels[anchor.dataset.nav];
      const currentNav = route().path === "browse" && route().params.get("section") === "contributors" ? "contributors" : route().path;
      anchor.setAttribute("aria-current", currentNav === anchor.dataset.nav ? "page" : "false");
    });
    const footerBrand = $("footer>span:first-child");
    if (footerBrand) footerBrand.textContent = language === "zh" ? "RateMyCourse · 课程体验" : "RateMyCourse · Course experiences";
    document.title = language === "zh" ? "RateMyCourse · 找到适合你的课程" : "RateMyCourse · Find the courses that fit you";
    const slot = $("#account-nav");
    slot.innerHTML = session
      ? `${metricsAdmin ? `<a class="text-link" href="analytics.html">${language === "zh" ? "数据概览" : "Analytics"}</a>` : ""}<button class="quiet" type="button" data-auth-signout>${language === "zh" ? "退出" : "Sign out"}</button>`
      : `<button class="button secondary compact" type="button" data-community-signin>${escapeHtml(t("signIn"))}</button>`;
  }

  function loadingPage() {
    main.innerHTML = `<div class="empty-state"><span class="empty-icon">…</span><h2>${escapeHtml(t("loading"))}</h2></div>`;
  }

  function displayReview(review) {
    if (review.translationStatus) return review;
    return window.SILS_REVIEW_TRANSLATIONS?.displayReview(review, language) || review;
  }

  function translationNotice(review, visibleFields) {
    const notice = window.SILS_REVIEW_TRANSLATIONS?.noticeFor(review, language, visibleFields);
    if (!notice) return "";
    return `<p class="translation-note">${notice === "pending"
      ? (language === "zh" ? "部分内容保留作者原文；译文尚待更新。" : "Some content is shown in its original language; translation is pending.")
      : (language === "zh" ? "译文 · 保留作者原意" : "Translated from the contributor’s original")}</p>`;
  }

  const teachingLanguage = value => language === "zh" ? ({ English: "英语", Japanese: "日语", Chinese: "中文", Other: "其他" }[value] || value) : value;

  function reviewTerm(review) {
    return review.legacy_offered_term && review.term === "修读学期未记录 / Term taken not recorded"
      ? (language === "zh" ? "修读学期未记录；原表开课：" : "Term taken not recorded; offered: ") + review.legacy_offered_term
      : model.termLabel(review.term, language);
  }

  function courseCard(entry) {
    const { course, reviews, totalReviews, hasReviewFilters } = entry;
    const review = reviews[0] ? displayReview(reviews[0]) : null;
    const syllabi = [...new Set([...(course.syllabus_urls || []), course.syllabus_url].filter(Boolean))].map(safeUrl).filter(Boolean);
    return `<article class="course-card">
      <div class="chips"><span class="pill">${escapeHtml(course.provider || "RateMyCourse")}</span>${course.language ? `<span class="pill">${escapeHtml(teachingLanguage(course.language))}</span>` : ""}</div>
      <h3><a href="./#/course/${encodeURIComponent(course.id)}">${escapeHtml(course.title)}</a></h3>
      <p class="meta">${course.course_code ? `${escapeHtml(course.course_code)} · ` : ""}${course.credits ?? "—"} ${language === "zh" ? "学分" : course.credits === 1 ? "credit" : "credits"} · ${totalReviews}${language === "zh" ? " 条公开体验" : totalReviews === 1 ? " experience" : " experiences"}</p>
      ${review ? `<section class="card-perspective"><p class="perspective-note small">${language === "zh" ? "体验作者：" : "Review by: "}${escapeHtml(review.public_display_name || t("anonymous"))}</p>
      <p class="perspective-scope">${language === "zh" ? "以下判断来自这位作者" : "The following reflects this contributor’s experience"}${totalReviews > 1 ? (language === "zh" ? ` · 另有 ${totalReviews - 1} 条独立体验` : ` · ${totalReviews - 1} other independent ${totalReviews === 2 ? "experience" : "experiences"}`) : ""}</p>
      ${review.teacher ? `<p class="small review-instructor">${language === "zh" ? "授课教师（作者记录）：" : "Instructor (reported by this author): "}${escapeHtml(review.teacher)}</p>` : ""}
      ${translationNotice(review, ["fit", "avoid"])}
      <dl class="audience-notes">${[["fit", review.fit], ["avoid", review.avoid]].filter(([, value]) => value).map(([key, value]) => `<div><dt>${escapeHtml(t(key))}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
      <div class="card-measures"><div><p class="measure-label">${escapeHtml(t("workload"))}</p><span class="workload-score"><strong>${review.workload}</strong><span>/ 5</span><small>${escapeHtml(t("workloadNames")[review.workload - 1])}</small></span><p class="small">1 = ${escapeHtml(t("workloadNames")[0])} · 5 = ${escapeHtml(t("workloadNames")[4])}</p></div><div><p class="measure-label">${escapeHtml(t("group"))}</p><p>${escapeHtml(t("groupChoices")[model.groups.indexOf(review.group_work)])}</p></div></div></section>` : ""}
      ${hasReviewFilters ? `<p class="small">${reviews.length} ${language === "zh" ? "条体验同时符合全部体验筛选条件" : reviews.length === 1 ? "experience matches all filters" : "experiences match all filters"}</p>` : ""}
      <div class="card-bottom"><a class="text-link" href="./#/course/${encodeURIComponent(course.id)}">${totalReviews > 1 ? (language === "zh" ? `查看全部 ${totalReviews} 条独立体验` : `Read all ${totalReviews} independent experiences`) : (language === "zh" ? "查看课程与评价" : "View course and reviews")}</a>${syllabi[0] ? `<a class="text-link" href="${escapeHtml(syllabi[0])}" target="_blank" rel="noreferrer">${escapeHtml(t("syllabus"))} ↗</a>` : ""}</div>
    </article>`;
  }

  function renderBrowse() {
    const author = selectedAuthor();
    const filtered = model.filterCatalog(courses, publishedReviews.map(displayReview), { query, provider: providerFilter, language: languageFilter, workload: workloadFilter, group: groupFilter, fit: fitFilter, avoid: avoidFilter, ...author });
    const option = (value, label, selected) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
    main.innerHTML = `<section class="hero">
      <div><p class="eyebrow">${language === "zh" ? "早稻田大学" : "WASEDA UNIVERSITY"}</p><h1>${language === "zh" ? "找到适合你的课程。" : "Find the courses that fit you."}</h1>
      <p class="subtext"><span class="intro-full">${language === "zh" ? "从早稻田 SILS 与 CJL 开始。先看官方课程资料，再比较修课者的体验与自愿公开背景，判断是否适合自己。浏览免费，无需登录。" : "Starting with SILS and CJL at Waseda. Explore course information, then compare students’ experiences and the background they choose to share. Free to browse, no sign-in needed."}</span><span class="intro-compact">${language === "zh" ? "比较 SILS 与 CJL 的修课体验。免费浏览，无需登录。" : "Explore SILS and CJL through students’ experiences. Free to browse, no sign-in needed."}</span></p>
      <div class="search"><input id="course-search" type="search" value="${escapeHtml(query)}" placeholder="${escapeHtml(t("search"))}" aria-label="${escapeHtml(t("search"))}"><button class="button" type="button" data-action="search">${language === "zh" ? "搜索" : "Search"}</button></div>
      </div><aside class="hero-example"><span class="pill green">${language === "zh" ? "免费选课指南" : "FREE REGISTRATION GUIDE"}</span><h2>${language === "zh" ? "第一次选课？" : "New to course registration?"}</h2><p>${language === "zh" ? "从你的学部／项目出发，找到官方注册说明、课程要求和选课前检查项。" : "Find the official registration instructions, curriculum links, and a short checklist for your programme."}</p><a class="button secondary" href="guide.html"><span class="guide-full">${language === "zh" ? "打开选课指南" : "Open the guide"}</span><span class="guide-compact">${language === "zh" ? "第一次选课？查看指南" : "New to registration? Open the guide"}</span> ↗</a></aside>
    </section>
    <div class="page-heading browse-heading"><div><h2>${escapeHtml(t("browse"))}</h2></div><a class="button" href="./#/share"><span class="contribute-full">${escapeHtml(t("add"))}</span><span class="contribute-compact">${language === "zh" ? "分享体验" : "Contribute"}</span></a></div>
    <div class="browse"><details class="filter-panel"><summary>${language === "zh" ? "筛选课程" : "Filter courses"}<span>${[providerFilter,languageFilter,workloadFilter,groupFilter,authorFilter,fitFilter,avoidFilter].filter(Boolean).length || (language === "zh" ? "全部课程" : "All courses")}</span></summary><form class="filters" id="browse-filters"><h2>${language === "zh" ? "筛选课程" : "Filter courses"}</h2>
      <div class="filter"><label for="provider-filter">${escapeHtml(t("provider"))}</label><select id="provider-filter" name="provider"><option value="">${escapeHtml(t("all"))}</option>${model.providers.map((item) => option(item, item, providerFilter)).join("")}</select></div>
      <div class="filter"><label for="language-filter">${escapeHtml(t("language"))}</label><select id="language-filter" name="language">${option("", language === "zh" ? "全部语言" : "All languages", languageFilter)}${[...new Set(courses.map((course) => course.language).filter(Boolean))].sort().map((item) => option(item, teachingLanguage(item), languageFilter)).join("")}</select></div>
      <div class="filter"><label for="workload-filter">${escapeHtml(t("workload"))} · 1–5</label><select id="workload-filter" name="workload">${option("", language === "zh" ? "全部负担" : "Any workload", workloadFilter)}${option("light", `1–2 · ${language === "zh" ? "较轻" : "Lighter"}`, workloadFilter)}${option("3", `3 · ${t("workloadNames")[2]}`, workloadFilter)}${option("heavy", `4–5 · ${language === "zh" ? "较重" : "Heavier"}`, workloadFilter)}</select><p class="hint">1 = ${t("workloadNames")[0]} · 5 = ${t("workloadNames")[4]}</p></div>
      <div class="filter"><label for="group-filter">${escapeHtml(t("group"))}</label><select id="group-filter" name="group">${option("", language === "zh" ? "全部合作方式" : "Any group work", groupFilter)}${model.groups.map((key, index) => option(key, t("groupChoices")[index], groupFilter)).join("")}</select></div>
      <div class="filter"><label for="author-filter">${language === "zh" ? "体验作者" : "Contributor"}</label><select id="author-filter" name="author">${option("", language === "zh" ? "全部作者" : "All contributors", authorFilter)}${authorChoices().map(person => option(person.value, person.label, authorFilter)).join("")}</select></div>
      <details class="audience-filter" ${fitFilter || avoidFilter ? "open" : ""}><summary>${language === "zh" ? "更多筛选：适合／不适合" : "More filters: fit and avoid"}</summary><div class="filter"><label for="fit-filter">${escapeHtml(t("fit"))}</label><input id="fit-filter" name="fit" value="${escapeHtml(fitFilter)}"></div><div class="filter"><label for="avoid-filter">${escapeHtml(t("avoid"))}</label><input id="avoid-filter" name="avoid" value="${escapeHtml(avoidFilter)}"></div><p class="hint">${language === "zh" ? "按当前显示语言匹配。同一条体验须同时满足各项条件。" : "Matches the displayed language. All conditions must match the same experience."}</p><button class="button secondary" type="submit">${language === "zh" ? "应用筛选" : "Apply filters"}</button></details>${button("clear-filters", language === "zh" ? "清除筛选" : "Clear filters", "quiet filter-reset")}
    </form></details><section><p class="results-meta" role="status" aria-live="polite"><span>${filtered.length} / ${courses.length}${authorFilter ? ` · ${escapeHtml(author.label)}` : ""}</span><span>${language === "zh" ? "条课程记录 · 每位作者的体验分别呈现。" : "catalog records · Each contributor’s experience is shown separately."}</span></p><div class="course-grid">${filtered.map(courseCard).join("") || `<div class="empty-state"><h2>${escapeHtml(t("empty"))}</h2>${button("clear-filters", language === "zh" ? "清除筛选" : "Clear filters", "button secondary")}</div>`}</div></section></div>`;
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
    if (authorFilter.startsWith("profile:")) params.set("author", authorFilter.slice(8));
    else params.delete("author");
    if (authorFilter.startsWith("legacy:")) params.set("legacy_author", authorFilter.slice(7));
    else params.delete("legacy_author");
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/browse${params.size ? `?${params}` : ""}`);
  }

  function identity(review, avatar) {
    const name = review.public_display_name || t("anonymous");
    const avatarMarkup = avatar ? `<img src="${escapeHtml(avatar)}" alt="" style="${photos.style(review.public_avatar_crop)}">` : escapeHtml(name.slice(0, 1).toUpperCase());
    const profileLink = review.public_profile_id ? `<a class="text-link" href="./#/people/${encodeURIComponent(review.public_profile_id)}">${escapeHtml(t("openProfile"))} ↗</a>` : "";
    return `<div class="review-identity"><span class="review-avatar">${avatarMarkup}</span><div><strong>${language === "zh" ? "体验作者：" : "Review by: "}${escapeHtml(name)}</strong><small>${escapeHtml(reviewTerm(review))}</small></div>${profileLink}</div>`;
  }

  async function reviewCard(review) {
    review = displayReview(review);
    const avatar = review.public_avatar_path ? await signedAvatar(review.public_avatar_path) : "";
    const contextFields = [
      [language === "zh" ? "修读项目／学部" : "Programme", review.reviewer_programme],
      [language === "zh" ? "修读时年级" : "Year", review.reviewer_year],
      [language === "zh" ? "相关知识基础" : "Prior knowledge", review.reviewer_prior_knowledge],
      [language === "zh" ? "选课目标" : "Course goal", review.reviewer_selection_goal]
    ].filter(([, value]) => value);
    return `<article class="experience">
      <div class="review-top"><div>${identity(review, avatar)}${review.legacy_source_id ? "" : `<small>${escapeHtml(shortDate(review.created_at))}</small>`}</div><span class="pill green">${review.legacy_source_id ? (language === "zh" ? "历史导入" : "Archive") : escapeHtml(t("approved"))}</span></div>
      ${review.teacher ? `<p class="small review-instructor">${language === "zh" ? "授课教师（作者记录）：" : "Instructor (reported by this author): "}${escapeHtml(review.teacher)}</p>` : ""}

      ${review.share_background && contextFields.length ? `<section class="context"><div class="context-label">${language === "zh" ? "作者自述背景" : "AUTHOR-REPORTED BACKGROUND"}<span>${escapeHtml(t("contextAuthor"))}</span></div><dl class="context-grid">${contextFields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>` : ""}
      <div class="review-measures"><p><span class="measure-label">${escapeHtml(t("workload"))}</span><span class="workload-score"><strong>${Number(review.workload) || "—"}</strong><span>/ 5</span><small>${escapeHtml(t("workloadNames")[(Number(review.workload) || 1) - 1])}</small></span></p><p><span class="measure-label">${escapeHtml(t("group"))}</span><strong>${escapeHtml(t("groupChoices")[({ none: 0, some: 1, heavy: 2, mixed: 3 })[review.group_work] ?? 3])}</strong></p></div>
      ${translationNotice(review)}
      ${[["fit", review.fit], ["avoid", review.avoid], ["experience", review.experience], ["assessment", review.assessment], ["notes", review.notes]].filter(([, value]) => value).map(([label, value]) => `<section class="review-body"><h3>${escapeHtml(t(label))}</h3><p>${escapeHtml(value)}</p></section>`).join("")}
      ${review.legacy_source_url ? `<details class="source-note"><summary>${language === "zh" ? "来源与修读时间说明" : "Source and term information"}</summary><p class="small">${language === "zh" ? "从原始课程表恢复；原表的 Spring／Fall 为开课信息，不作为作者修读时间。" : "Restored from the original course sheet. Spring / Fall describes when the course is offered, not when the author took it."} <a class="text-link" href="${escapeHtml(safeUrl(review.legacy_source_url))}" target="_blank" rel="noreferrer">${language === "zh" ? "查看原始来源" : "View source"}</a></p></details>` : ""}
      ${review.translationStatus?.translatedFields?.length && review.rawFields ? `<details class="original-review"><summary>${language === "zh" ? "查看作者原文" : "Read the contributor’s original"}</summary>${["experience", "fit", "avoid", "assessment", "notes"].filter(key => review.rawFields[key]).map(key => `<section class="review-body"><h3>${escapeHtml(t(key))}</h3><p>${escapeHtml(review.rawFields[key])}</p></section>`).join("")}</details>` : ""}
    </article>`;
  }

  async function renderCourse(id, version) {
    id = courseAliases.get(id) || id;
    const course = courses.find((item) => item.id === id) || (await db.from("courses").select(COURSE_FIELDS).eq("id", id).maybeSingle()).data;
    if (version !== renderVersion) return;
    if (!course) { main.innerHTML = `<div class="empty-state"><h2>${escapeHtml(t("empty"))}</h2>${link("./#/browse", t("backToBrowse"), "button")}</div>`; return; }
    const { data, error } = await db.from("reviews").select(PUBLIC_REVIEW_FIELDS).eq("course_id", id).eq("status", "published").order("created_at", { ascending: false });
    if (error) throw error;
    const syllabi = [...new Set([...(course.syllabus_urls || []), course.syllabus_url].filter(Boolean))].map(safeUrl).filter(Boolean);
    const reviews = data || [];
    const cards = await Promise.all(reviews.map(reviewCard));
    if (version !== renderVersion) return;
    const proposalButton = `<a class="button" href="./#/share?course=${encodeURIComponent(id)}">${language === "zh" ? "分享这门课的体验" : "Share your experience"}</a>`;
    main.innerHTML = `<div class="crumb"><a href="./#/browse">${escapeHtml(t("browse"))}</a><span>›</span><span>${escapeHtml(course.provider || "")}</span></div>
      <p class="eyebrow">${escapeHtml(course.provider || "RateMyCourse")}</p><h1 class="detail-title">${escapeHtml(course.title)}</h1>
      <dl class="course-facts"><div><dt>${escapeHtml(t("courseCode"))}</dt><dd>${escapeHtml(course.course_code || "—")}</dd></div><div><dt>${escapeHtml(t("credits"))}</dt><dd>${escapeHtml(course.credits ?? "—")}</dd></div><div><dt>${escapeHtml(t("language"))}</dt><dd>${escapeHtml(teachingLanguage(course.language) || "—")}</dd></div></dl>
      <div class="syllabus-row">${syllabi.length ? syllabi.map((url, i) => `<a class="text-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(t("syllabus"))}${syllabi.length > 1 ? ` ${i + 1}` : ""} ↗</a>`).join("") : `<span class="small">${language === "zh" ? "暂无官方链接" : "No official syllabus link listed"}</span>`}</div>
      <div class="section-heading"><h2>${language === "zh" ? "修课体验" : "Student experiences"} <span class="pill">${reviews.length}</span></h2></div>
      <div class="detail-layout"><section class="review-stack">${reviews.length ? cards.join("") : `<div class="empty-state"><h2>${escapeHtml(t("noReviews"))}</h2>${proposalButton}</div>`}</section><aside><div class="side-card green"><h3>${language === "zh" ? "分享你的视角" : "Add your perspective"}</h3><p>${language === "zh" ? "每条评价保留作者自己的课程负担和适合度，不做平均分排名。" : "Each contribution keeps the author’s own workload and fit notes; experiences are not averaged into a rating."}</p>${proposalButton}</div></aside></div>`;
  }

  function gated(title, description) {
    main.innerHTML = `<section class="gated"><b class="brand-mark login-mark">r.</b><p class="eyebrow">GOOGLE SIGN-IN</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><button class="button" type="button" data-open-login>${escapeHtml(t("signIn"))}</button></section>`;
  }

  async function renderMine(version) {
    if (!session) { gated(t("mine"), t("loginRequired")); return; }
    const { data, error } = await db.from("reviews").select(OWN_REVIEW_FIELDS).eq("reviewer_id", session.user.id).order("updated_at", { ascending: false });
    if (error) throw error;
    if (version !== renderVersion) return;
    const items = data || [];
    main.innerHTML = `<div class="page-heading"><div><p class="eyebrow">YOUR CONTRIBUTIONS</p><h1>${escapeHtml(t("mine"))}</h1><p class="subtext">${language === "zh" ? "投稿只有审核通过后才对其他访客公开。编辑会重新进入审核。" : "Contributions become public only after approval. Editing sends them back for review."}</p></div><a class="button" href="./#/share">${escapeHtml(t("share"))}</a></div>
      ${items.length ? items.map((item) => {
        const title = item.course_id ? courses.find((course) => course.id === item.course_id)?.title || (language === "zh" ? "课程" : "Course") : item.suggested_course_title || (language === "zh" ? "新课程建议" : "Proposed course");
        return `<article class="submission"><div><span class="pill ${item.status === "published" ? "green" : item.status === "pending" ? "amber" : ""}">${escapeHtml(t(item.status) || item.status)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(model.termLabel(item.term, language))} · ${escapeHtml(String(item.experience || "").slice(0, 200))}</p></div><div class="submission-actions">${button(`edit-review:${item.id}`, t("edit"), "button secondary compact")}${item.course_id ? link(`./#/course/${encodeURIComponent(item.course_id)}`, language === "zh" ? "课程页" : "Course page") : ""}</div></article>`;
      }).join("") : `<div class="empty-state"><h2>${escapeHtml(t("noMine"))}</h2><a class="button" href="./#/share">${escapeHtml(t("share"))}</a></div>`}`;
  }

  function profileFormMarkup() {
    return `<div class="page-heading"><div><p class="eyebrow">YOUR OPTIONAL PROFILE</p><h1>${escapeHtml(t("profile"))}</h1><p class="subtext">${language === "zh" ? "姓名、背景和照片均为可选自述；Google 不会自动提供或公开这些内容。" : "Your name, background, and photo are optional and self-reported. Google details are never imported or published automatically."}</p></div></div>
      <div class="detail-layout profile-editor-layout"><section class="form-shell"><form id="profile-form" class="panel">
        <div class="field"><label for="profile-name">${escapeHtml(t("displayName"))}</label><input id="profile-name" name="display_name" type="text" maxlength="60" value="${escapeHtml(profile?.display_name || "")}" placeholder="${language === "zh" ? "可留空；投稿可匿名" : "Optional; reviews can be anonymous"}"></div>
        <div class="field"><label for="profile-bio">${escapeHtml(t("bio"))}</label><textarea id="profile-bio" name="bio" maxlength="500">${escapeHtml(profile?.bio || "")}</textarea></div>
        <details class="profile-background"><summary>${language === "zh" ? "已有背景资料" : "Background details"}</summary><p class="hint">${language === "zh" ? "这些是当前个人资料。每条体验的修课背景单独填写。" : "These are your current profile details. Course backgrounds are entered separately for each experience."}</p><div class="field-grid"><div class="field"><label for="profile-programme">${escapeHtml(t("programme"))}</label><input id="profile-programme" name="programme" maxlength="100" value="${escapeHtml(profile?.programme || "")}"></div><div class="field"><label for="profile-year">${escapeHtml(t("profileStudyStage"))}</label><input id="profile-year" name="study_year" maxlength="60" value="${escapeHtml(profile?.study_year || "")}"></div><div class="field"><label for="profile-prior">${escapeHtml(t("priorKnowledge"))}</label><textarea id="profile-prior" name="prior_knowledge" maxlength="500">${escapeHtml(profile?.prior_knowledge || "")}</textarea></div><div class="field"><label for="profile-goal">${escapeHtml(t("selectionGoal"))}</label><textarea id="profile-goal" name="selection_goal" maxlength="500">${escapeHtml(profile?.selection_goal || "")}</textarea></div></div></details>
        ${photos.markup(language)}
        <label class="check"><input type="checkbox" name="is_public" ${profile?.is_public ? "checked" : ""}><span><strong>${escapeHtml(t("publicProfile"))}</strong><small>${escapeHtml(t("saveHint"))}</small></span></label>
        <label class="check"><input type="checkbox" name="show_on_wall" ${profile?.show_on_wall ? "checked" : ""} ${profile?.is_public ? "" : "disabled"}><span><strong>${language === "zh" ? "在首页分享者名片墙展示我的公开名片" : "Show my public profile on the homepage contributor wall"}</strong><small>${language === "zh" ? "需同时公开个人名片并填写显示名。读者可查看你的署名或已关联名片的公开体验；匿名投稿不会因此公开身份。取消后，名片将从墙上撤下。" : "Requires a public profile and display name. Readers can explore your named or profile-linked public experiences. Anonymous reviews stay anonymous. Uncheck to remove your card from the wall."}</small></span></label>
        <p class="form-error error" role="alert" tabindex="-1" hidden></p><div class="form-actions"><a class="text-link" href="./#/browse">${escapeHtml(t("cancel"))}</a><button class="button secondary" type="button" data-photo-action="preview">${language === "zh" ? "预览公开效果" : "Preview public appearance"}</button><button class="button" type="submit">${escapeHtml(t("save"))}</button></div>
      </form></section><aside>${photos.previewMarkup(language)}</aside></div>`;
  }

  async function renderProfile(version) {
    if (!session) { gated(t("profile"), t("loginRequired")); return; }
    await getProfile();
    const source = await signedAvatar(profile?.avatar_path);
    if (version !== renderVersion) return;
    if (!photoDraft) photoDraft = photos.create(profile, source);
    else photoDraft.source = source;
    main.innerHTML = profileFormMarkup();
    toggleWallChoice();
  }

  async function renderPerson(id, version) {
    const { data, error } = await db.from("reviewer_profiles").select("id,display_name,programme,study_year,prior_knowledge,selection_goal,bio,is_public,avatar_path,photo_crops").eq("id", id).maybeSingle();
    if (error) throw error;
    if (version !== renderVersion) return;
    if (!data?.is_public) { main.innerHTML = `<div class="empty-state"><h2>${escapeHtml(t("profilePrivate"))}</h2>${link("./#/browse", t("backToBrowse"), "button")}</div>`; return; }
    const avatar = await signedAvatar(data.avatar_path);
    if (version !== renderVersion) return;
    const person = wallData.people.find(person => person.id === id);
    const fields = [[t("programme"), data.programme], [t("profileStudyStage"), data.study_year], [t("priorKnowledge"), data.prior_knowledge], [t("selectionGoal"), data.selection_goal]].filter(([, value]) => value);
    main.innerHTML = `<div class="crumb"><a href="./#/browse">${escapeHtml(t("browse"))}</a><span>›</span><span>${escapeHtml(t("profile"))}</span></div><section class="public-person"><span class="person-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="" style="${photos.style(data.photo_crops?.avatar)}">` : escapeHtml((data.display_name || "?").slice(0, 1).toUpperCase())}</span><p class="eyebrow">${language === "zh" ? "公开名片 · 作者自述" : "PUBLIC PROFILE · AUTHOR-REPORTED"}</p><h1>${escapeHtml(data.display_name || t("anonymous"))}</h1>${data.bio ? `<p class="subtext">${escapeHtml(data.bio)}</p>` : ""}<dl class="context-grid">${fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl><p class="small">${escapeHtml(t("contextAuthor"))}</p>${person?.review_ids?.length ? `<a class="button secondary" href="./#/browse?author=${encodeURIComponent(id)}">${language === "zh" ? "查看课程体验" : "Explore course experiences"} · ${person.review_ids.length}</a>` : ""}</section>`;
  }

  const formField = (label, name, options = {}) => `<div class="field"><label for="${escapeHtml(name)}">${escapeHtml(label)}${options.optional ? ` <span class="optional">${language === "zh" ? "可选" : "optional"}</span>` : ""}</label>${options.textarea ? `<textarea id="${escapeHtml(name)}" name="${escapeHtml(name)}" ${options.required ? "required" : ""} maxlength="${options.max || 3000}">${escapeHtml(options.value ?? "")}</textarea>` : `<input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="${escapeHtml(options.type || "text")}" ${options.type === "number" ? 'min="0" max="999.9" step="0.1"' : ""} ${options.required ? "required" : ""} maxlength="${options.max || 200}" value="${escapeHtml(options.value ?? "")}" placeholder="${escapeHtml(options.placeholder || "")}">`}</div>`;

  async function renderShare(editId = "", version) {
    if (!session) { gated(t("share"), t("loginRequired")); return; }
    await getProfile();
    const editing = editId ? await db.from("reviews").select(OWN_REVIEW_FIELDS).eq("id", editId).eq("reviewer_id", session.user.id).maybeSingle() : { data: null, error: null };
    if (editing.error) throw editing.error;
    if (version !== renderVersion) return;
    if (editId && !editing.data) { main.innerHTML = `<div class="empty-state"><h2>${escapeHtml(t("notReady"))}</h2></div>`; return; }
    const current = editing.data;
    const selectedCourse = current?.course_id || route().params.get("course") || "";
    const storedTerm = model.normalizeTerm(current?.term);
    const otherTerm = storedTerm && !model.terms.some((term) => term.value === storedTerm) ? storedTerm : "";
    const selectedTerm = otherTerm ? "other" : storedTerm;
    main.innerHTML = `<div class="page-heading"><div><p class="eyebrow">CONTRIBUTE</p><h1>${escapeHtml(current ? t("edit") : t("share"))}</h1><p class="subtext">${language === "zh" ? "内容先进入待审核。课程信息与第一条体验会一起审核。" : "Your contribution enters review first. New course details and the first experience are reviewed together."}</p></div></div>
      <form id="review-form" class="form-shell" data-edit-id="${escapeHtml(editId)}">
        <section class="panel"><h2>${escapeHtml(t("existingCourse"))}</h2><label class="radio"><input type="radio" name="course_mode" value="existing" ${current?.course_id || !current?.suggested_course_title ? "checked" : ""}><span><strong>${escapeHtml(t("existingCourse"))}</strong><small>${language === "zh" ? "选择已收录的课程" : "Choose a listed course"}</small></span></label><div class="field"><label for="course-id">${escapeHtml(t("selectCourse"))}</label><select id="course-id" name="course_id"><option value="" ${selectedCourse ? "" : "selected"}>${language === "zh" ? "请选择课程" : "Choose a course"}</option>${courses.map((course) => `<option value="${escapeHtml(course.id)}" ${selectedCourse === course.id ? "selected" : ""}>${escapeHtml(course.title)} · ${escapeHtml(course.provider || "")}</option>`).join("")}</select></div>
          <label class="radio"><input type="radio" name="course_mode" value="new" ${current?.suggested_course_title ? "checked" : ""}><span><strong>${escapeHtml(t("newCourse"))}</strong><small>${language === "zh" ? "课程和体验会共同待审；审核通过后加入目录。" : "The course and experience are reviewed together and then added to the catalog."}</small></span></label>
          <div id="new-course-fields" class="field-grid" ${current?.suggested_course_title ? "" : "hidden"}>${formField(t("courseTitle"), "suggested_course_title", { value: current?.suggested_course_title, required: true })}<div class="field"><label for="suggested-course-provider">${escapeHtml(t("provider"))}</label><select name="suggested_course_provider" id="suggested-course-provider" required><option value="">—</option>${["SILS", "PSE", "JCulP", "CJL"].map((p) => `<option ${current?.suggested_course_provider === p ? "selected" : ""}>${p}</option>`).join("")}</select></div>${formField(t("courseCode"), "suggested_course_code", { value: current?.suggested_course_code, optional: true })}${formField(t("credits"), "suggested_course_credits", { value: current?.suggested_course_credits, type: "number", optional: true })}<div class="field"><label for="suggested-course-language">${escapeHtml(t("language"))}</label><select id="suggested-course-language" name="suggested_course_language"><option value="">—</option>${["English", "Japanese", "Chinese", "Other"].map((p) => `<option ${current?.suggested_course_language === p ? "selected" : ""}>${p}</option>`).join("")}</select></div>${formField(t("syllabusUrls"), "suggested_course_syllabus_urls", { value: (current?.suggested_course_syllabus_urls || []).join("\n") || current?.suggested_course_syllabus_url || "", textarea: true, optional: true, max: 1000 })}<p class="hint">${language === "zh" ? "粘贴官方课程链接；有多个链接时每行一个。" : "Paste official course links, one URL per line."}</p></div>
        </section>
        <section class="panel"><h2>${language === "zh" ? "修课体验" : "Your experience"}</h2><div class="field-grid"><div class="field"><label for="term">${escapeHtml(t("term"))}</label><select id="term" name="term" required><option value="">—</option>${model.terms.map((term) => `<option value="${term.value}" ${selectedTerm === term.value ? "selected" : ""}>${escapeHtml(term[language])}</option>`).join("")}<option value="other" ${selectedTerm === "other" ? "selected" : ""}>${language === "zh" ? "其他学期" : "Other term"}</option></select></div><div class="field" id="other-term-field" hidden><label for="term-other">${language === "zh" ? "填写修读学期" : "Specify the term"}</label><input id="term-other" name="term_other" maxlength="100" value="${escapeHtml(otherTerm)}" placeholder="${language === "zh" ? "例如：2024 年秋季" : "e.g. Fall 2024"}"></div>${formField(t("teacher"), "teacher", { value: current?.teacher, optional: true })}</div>
          <fieldset class="workload-picker"><legend>${escapeHtml(t("workload"))} · 1–5</legend><p class="hint">${language === "zh" ? "表示时间与精力投入，不代表课程质量。" : "Time and effort required, not course quality."}</p><div class="score-options">${[1,2,3,4,5].map((score) => `<label><input type="radio" name="workload" value="${score}" ${Number(current?.workload) === score ? "checked" : ""} required><span><b>${score}</b><small>${escapeHtml(t("workloadNames")[score - 1])}</small></span></label>`).join("")}</div></fieldset>
          <fieldset class="workload-picker"><legend>${escapeHtml(t("group"))}</legend><div class="field"><label for="review-group-work">${escapeHtml(t("group"))}</label><select id="review-group-work" name="group_work" required><option value="">—</option>${["none", "some", "heavy", "mixed"].map((key, i) => `<option value="${key}" ${current?.group_work === key ? "selected" : ""}>${escapeHtml(t("groupChoices")[i])}</option>`).join("")}</select></div></fieldset>
          ${formField(t("assessment"), "assessment", { value: current?.assessment, textarea: true, optional: true })}${formField(t("fit"), "fit", { value: current?.fit, textarea: true, optional: true })}${formField(t("avoid"), "avoid", { value: current?.avoid, textarea: true, optional: true })}${formField(t("experience"), "experience", { value: current?.experience, textarea: true, required: true, max: 5000 })}${formField(t("notes"), "notes", { value: current?.notes, textarea: true, optional: true, max: 2000 })}
        </section>
        <section class="panel"><div class="field"><label for="content-language">${language === "zh" ? "评价原文语言" : "Original review language"}</label><select id="content-language" name="content_language" required><option value="">${language === "zh" ? "请选择" : "Choose a language"}</option>${model.contentLanguages.map(value => `<option value="${value}" ${current?.content_language === value ? "selected" : ""}>${sourceLanguages[language][value]}</option>`).join("")}</select><p class="hint">${language === "zh" ? "选择你撰写评价使用的语言，与网页显示语言、课程授课语言分别记录。" : "Choose the language you wrote in. This is separate from the interface and teaching languages."}</p></div></section>
        <section class="panel"><h2>${language === "zh" ? "这次修课的背景（可选）" : "Background for this experience (optional)"}</h2><p class="hint">${language === "zh" ? "可从个人资料带入初始值，再按这门课的实际情况修改。年级请按本次修课时填写。只有勾选下方公开选项才会随体验保存。" : "Profile details are starting values. Adjust them for this course. Enter your year when you took this course. These fields are saved with the experience only if you choose to share them below."}</p><div class="field-grid">${formField(t("programme"), "reviewer_programme", { value: current ? current.reviewer_programme : profile?.programme, optional: true, max: 100 })}${formField(t("studyYear"), "reviewer_year", { value: current ? current.reviewer_year : "", optional: true, max: 60 })}${formField(t("priorKnowledge"), "reviewer_prior_knowledge", { value: current ? current.reviewer_prior_knowledge : profile?.prior_knowledge, optional: true, textarea: true, max: 500 })}${formField(t("selectionGoal"), "reviewer_selection_goal", { value: current ? current.reviewer_selection_goal : profile?.selection_goal, optional: true, textarea: true, max: 500 })}</div></section>
        <section class="panel"><h2>${language === "zh" ? "公开选项" : "Publication choices"}</h2><p class="subtext">${language === "zh" ? "默认匿名。每个选项分别控制；关闭背景后，背景内容不会随评价公开。" : "Anonymous by default. Each option is separate. Background details stay private unless you opt in."}</p>
          <label class="check"><input type="checkbox" name="show_name" ${current?.show_name ? "checked" : ""} ${profile?.display_name ? "" : "disabled"}><span><strong>${escapeHtml(t("showName"))}</strong><small>${profile?.display_name ? escapeHtml(profile.display_name) : escapeHtml(t("ownProfile"))}</small></span></label>
          <label class="check"><input type="checkbox" name="show_avatar" ${current?.show_avatar ? "checked" : ""} ${profile?.avatar_path ? "" : "disabled"}><span><strong>${escapeHtml(t("showAvatar"))}</strong><small>${profile?.avatar_path ? escapeHtml(t("avatar")) : escapeHtml(t("profilePhoto"))}</small></span></label>
          <label class="check"><input type="checkbox" name="show_profile" ${current?.public_profile_id ? "checked" : ""} ${profile?.is_public ? "" : "disabled"}><span><strong>${escapeHtml(t("showProfile"))}</strong><small>${profile?.is_public ? escapeHtml(t("profile")) : escapeHtml(t("publicProfileNeeded"))}</small></span></label>
          <label class="check"><input type="checkbox" name="share_background" ${current?.share_background ? "checked" : ""}><span><strong>${escapeHtml(t("shareBackground"))}</strong><small>${escapeHtml(t("contextAuthor"))}</small></span></label>
          ${current?.status ? `<p class="notice">${escapeHtml(t("status"))}: ${escapeHtml(t(current.status) || current.status)}${current.status === "published" && current.updated_at ? ` · ${escapeHtml(shortDate(current.updated_at))}` : ""}</p>` : ""}
        </section>
        <p class="form-error error" role="alert" tabindex="-1" hidden></p><div class="form-actions"><a class="text-link" href="./#/mine">${escapeHtml(t("cancel"))}</a><button class="button" type="submit">${escapeHtml(current ? t("saveReview") : t("submit"))}</button></div>
      </form>`;
    toggleNewCourseFields();
    toggleTermField();
  }

  function toggleNewCourseFields() {
    const form = $("#review-form"); if (!form) return;
    const isNew = $("input[name=course_mode]:checked", form)?.value === "new";
    $("#new-course-fields", form).hidden = !isNew;
    $("#new-course-fields", form).querySelectorAll("input,select,textarea").forEach((input) => { input.disabled = !isNew; });
    $("#course-id", form).disabled = isNew;
    $("#course-id", form).required = !isNew;
    $("input[name=suggested_course_title]", form).required = isNew;
    $("select[name=suggested_course_provider]", form).required = isNew;
  }

  function toggleTermField() {
    const field = $("#other-term-field");
    if (!field) return;
    const isOther = $("#term").value === "other";
    field.hidden = !isOther;
    $("#term-other").disabled = !isOther;
    $("#term-other").required = isOther;
  }

  function toggleWallChoice() {
    const form = $("#profile-form"); if (!form) return;
    const isPublic = $("[name=is_public]", form).checked;
    const wall = $("[name=show_on_wall]", form);
    wall.disabled = !isPublic;
    if (!isPublic) wall.checked = false;
  }

  function syncContributorWall() {
    const host = $("#contributors-wall"); if (!host) return;
    const visible = route().path === "browse"; host.hidden = !visible;
    if (!visible) return;
    const snapshot = JSON.stringify(wallData);
    if (wallLanguage !== language || mountedWallData !== snapshot) {
      cleanupWall?.();
      cleanupWall = window.mountNamecardWall?.(host, { language, data: wallData, onCourses(person) {
        query = providerFilter = languageFilter = workloadFilter = groupFilter = fitFilter = avoidFilter = "";
        authorFilter = person.wallKey;
        syncAuthorRoute();
        renderBrowse(); renderHeader();
        const results = $(".results-meta"); results?.setAttribute("tabindex", "-1");
        results?.scrollIntoView({ block: "start", behavior: "instant" }); results?.focus({ preventScroll: true });
      }});
      wallLanguage = language; mountedWallData = snapshot;
    }
  }

  async function render() {
    rememberForm();
    const version = ++renderVersion;
    loadMetricsRole();
    renderHeader();
    if (!db) { main.innerHTML = `<div class="empty-state"><h2>${escapeHtml(t("notReady"))}</h2></div>`; return; }
    if (!catalogLoadedAt) loadingPage();
    cleanupPhotoEditor?.(); cleanupPhotoEditor = null;
    main.setAttribute("aria-busy", "true");
    try {
      await loadCourses();
      await loadContributors();
      if (version !== renderVersion) return;
      const current = route();
      if (current.path === "browse" && current.params.has("author")) authorFilter = `profile:${current.params.get("author")}`;
      else if (current.path === "browse" && current.params.has("legacy_author")) authorFilter = `legacy:${current.params.get("legacy_author")}`;
      if (current.path === "course") await renderCourse(decodeURIComponent(current.id), version);
      else if (current.path === "share") await renderShare(current.params.get("edit") || "", version);
      else if (current.path === "mine") await renderMine(version);
      else if (current.path === "profile") await renderProfile(version);
      else if (current.path === "people") await renderPerson(decodeURIComponent(current.id), version);
      else renderBrowse();
      if (version !== renderVersion) return;
      restoreForm(current);
      if (current.path === "profile" && photoDraft) cleanupPhotoEditor = photos.mount(main, photoDraft, language, () => { selectedPhoto = photoDraft.file; updateDraftStatus(); }, profile?.id === "d56cca0a-787e-413d-8b96-9a513beaf322" ? window.SILS_NAMECARD_WALL.buildPeople({ people: [{ ...profile, legacy_author_key: "cindy" }], replaced_legacy_keys: ["chambers", "cindy", "richard"] }, language)[0] : null, profile?.id === "f6669b7c-2104-4dcb-ba10-decd41fc130f");
      renderHeader();
      syncContributorWall();
      const metricPage = ({ course: "course", share: "share", mine: "mine", profile: "profile", people: "person" })[current.path] || "browse";
      window.SILS_ANALYTICS?.page({ page: metricPage, courseId: metricPage === "course" ? (courseAliases.get(current.id) || current.id) : null, viewKey: metricPage === "person" ? current.id : null });
      if (route().params.get("section") === "contributors") $("#contributors-wall")?.scrollIntoView({ block: "start", behavior: "instant" });
      main.removeAttribute("aria-busy");
    } catch (error) {
      if (version !== renderVersion) return;
      main.removeAttribute("aria-busy");
      console.error("RateMyCourse community page failed", error);
      main.innerHTML = `<div class="empty-state"><h2>${escapeHtml(t("notReady"))}</h2><p>${escapeHtml(error?.message || "")}</p><button class="button" type="button" data-action="retry">${language === "zh" ? "重试" : "Try again"}</button></div>`;
    }
  }

  async function handleProfileSubmit(form, values = new FormData(form)) {
    const userId = session?.user.id;
    if (!userId) throw Object.assign(new Error(t("loginRequired")), { code: "loginRequired" });
    if (values.has("show_on_wall") && values.has("is_public") && !String(values.get("display_name") || "").trim()) throw Object.assign(new Error(t("wallNameRequired")), { code: "wallNameRequired" });
    if (photoDraft?.loading) throw new Error(language === "zh" ? "照片仍在读取，请稍候再保存。" : "Your photo is still loading. Please wait before saving.");
    const draft = photoDraft;
    let avatarPath = draft?.removed ? null : profile?.avatar_path || null;
    let uploadedPath = "";
    if (selectedPhoto && !draft?.removed) {
      const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[selectedPhoto.type];
      if (!extension || selectedPhoto.size > MAX_PHOTO_SIZE) throw new Error(t("photoError"));
      uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await db.storage.from(BUCKET).upload(uploadedPath, selectedPhoto, { contentType: selectedPhoto.type, upsert: false, cacheControl: "3600" });
      if (error) throw error;
      avatarPath = uploadedPath;
    }
    const payload = {
      display_name: String(values.get("display_name") || "").trim() || null,
      programme: String(values.get("programme") || "").trim() || null,
      study_year: String(values.get("study_year") || "").trim() || null,
      prior_knowledge: String(values.get("prior_knowledge") || "").trim() || null,
      selection_goal: String(values.get("selection_goal") || "").trim() || null,
      bio: String(values.get("bio") || "").trim() || null,
      is_public: values.has("is_public"),
      show_on_wall: values.has("is_public") && values.has("show_on_wall"),
      avatar_path: avatarPath,
      photo_crops: avatarPath ? photos.crops(draft?.crops || profile?.photo_crops) : null
    };
    if (session?.user.id !== userId) throw new Error(t("loginRequired"));
    const result = profile
      ? await db.from("reviewer_profiles").update(payload).eq("id", userId).select("id").single()
      : await db.from("reviewer_profiles").insert(payload).select("id").single();
    if (result.error) {
      if (uploadedPath) await db.storage.from(BUCKET).remove([uploadedPath]);
      throw result.error;
    }
    if (session?.user.id !== userId) return;
    photos.dispose(draft); photoDraft = null; selectedPhoto = null; localPhotoUrl = "";
    profile = { ...(profile || { id: userId }), ...payload };
    avatarUrlCache.clear();
    wallLoadedAt = 0;
    clearFormDraft();
    toast(t("profileSaved"));
    await render();
  }

  async function handleReviewSubmit(form, values = new FormData(form)) {
    const userId = session?.user.id;
    await getProfile();
    if (!userId || session?.user.id !== userId) throw new Error(t("loginRequired"));
    const payload = model.reviewPayload(Object.fromEntries(values), profile, session?.user.id, language);
    const editId = form.dataset.editId;
    const result = editId
      ? await db.from("reviews").update(payload).eq("id", editId).eq("reviewer_id", session.user.id).select("id").maybeSingle()
      : await db.from("reviews").insert(payload).select("id").single();
    if (result.error) throw result.error;
    if (!result.data?.id) throw new Error(t("notReady"));
    catalogLoadedAt = 0;
    clearFormDraft();
    toast(editId ? t("updated") : t("reviewSaved"));
    window.location.hash = "/mine";
  }

  document.addEventListener("click", async (event) => {
    const signInButton = event.target.closest("[data-open-login]");
    if (signInButton) { login(); return; }
    if (event.target.closest("[data-close-login]")) { loginTarget = ""; $("#login").close(); return; }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "share") { if (!session) { login("community#/share"); return; } window.location.hash = "/share"; return; }
    if (action === "retry") { await render(); return; }
    if (action === "search") { query = $("#course-search")?.value || ""; renderBrowse(); $(".results-meta")?.scrollIntoView({block: "start", behavior: "instant"}); return; }
    if (action === "clear-filters") { query = providerFilter = languageFilter = workloadFilter = groupFilter = fitFilter = avoidFilter = authorFilter = ""; syncAuthorRoute(); renderBrowse(); return; }
    if (action?.startsWith("edit-review:")) { window.location.hash = `/share?edit=${encodeURIComponent(action.split(":")[1])}`; return; }
    if (event.target.closest("[data-auth-signout]")) {
      try { await auth.signOut(); toast(t("signedOut")); window.location.hash = "/browse"; } catch (error) { fail(error); }
      return;
    }
    if (event.target.closest("[data-community-signin]")) {
      try { await auth.signInWithGoogle(loginTarget || `community${window.location.hash || "#/browse"}`); } catch (error) { fail(error); }
      return;
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("#profile-form [name=is_public]")) toggleWallChoice();
    if (event.target.matches("input[name=course_mode]")) toggleNewCourseFields();
    if (event.target.matches("#term")) toggleTermField();
    if (event.target.matches("#browse-filters select")) { const focusId = event.target.id; readBrowseFilters(); renderBrowse(); document.getElementById(focusId)?.focus({ preventScroll: true }); }
    if (event.target.closest("#profile-form, #review-form")) rememberForm();
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("#course-search") && event.key === "Enter") {
      event.preventDefault();
      $(".results-meta")?.scrollIntoView({block: "start", behavior: "instant"});
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.closest("#profile-form, #review-form")) rememberForm();
    if (event.target.matches("#course-search")) { query = event.target.value; renderBrowse(); const input = $("#course-search"); if (input) { input.focus(); input.setSelectionRange(query.length, query.length); } }
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.id === "browse-filters") { event.preventDefault(); readBrowseFilters(); renderBrowse(); return; }
    if (event.target.id !== "profile-form" && event.target.id !== "review-form") return;
    event.preventDefault();
    const form = event.target;
    const values = new FormData(form);
    const submit = $("button[type=submit]", form);
    const submitLabel = submit.textContent;
    submit.textContent = language === "zh" ? "正在保存…" : "Saving…";
    const controls = [...form.elements].map((control) => [control, control.disabled]);
    const errorNode = $(".form-error", form);
    if (errorNode) errorNode.hidden = true;
    controls.forEach(([control]) => { control.disabled = true; });
    form.setAttribute("aria-busy", "true");
    try {
      if (form.id === "profile-form") await handleProfileSubmit(form, values);
      else await handleReviewSubmit(form, values);
    } catch (error) {
      const message = t(error.code) || error.message || t("notReady");
      if (errorNode) { errorNode.textContent = message; errorNode.hidden = false; errorNode.focus(); }
      else fail(error);
    } finally {
      controls.forEach(([control, disabled]) => { control.disabled = disabled; });
      form.removeAttribute("aria-busy");
      submit.textContent = submitLabel;
    }
  });

  $("#language-toggle").addEventListener("click", async () => {
    rememberForm();
    language = language === "zh" ? "en" : "zh";
    localStorage.setItem("odyssey-community-language", language);
    await render();
  });
  document.addEventListener("click", (event) => {
    if (activePath === "browse" && event.target.closest('a[href*="#/course/"]')) browseScrollY = window.scrollY;
  });
  window.addEventListener("hashchange", async () => {
    const nextPath = route().path;
    const returning = nextPath === "browse" && activePath !== "browse";
    activePath = nextPath;
    await render();
    if (route().params.get("section") === "contributors") $("#contributors-wall")?.scrollIntoView({ block: "start", behavior: "instant" });
    else window.scrollTo({ top: returning ? browseScrollY : 0, behavior: "instant" });
  });
  window.addEventListener("sils:auth", (event) => {
    const previousId = session?.user.id;
    session = event.detail.session;
    if (previousId === session?.user.id) return;
    formDrafts.clear(); activeFormKey = ""; activeFormBaseline = "";
    photos?.dispose(photoDraft); photoDraft = null;
    cleanupPhotoEditor?.(); cleanupPhotoEditor = null;
    selectedPhoto = null; profile = null; avatarUrlCache.clear();
    if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
    localPhotoUrl = "";
    if (authLoaded) window.setTimeout(() => render(), 0);
  });
  window.addEventListener("beforeunload", event => {
    if (!formDrafts.size && !selectedPhoto && !photos?.dirty(photoDraft)) return;
    event.preventDefault(); event.returnValue = "";
  });
  window.addEventListener("resize", syncFilterPanel, { passive: true });
  document.addEventListener("toggle", event => {
    if (event.target.matches(".filter-panel") && window.matchMedia("(max-width: 780px)").matches) filtersExpanded = event.target.open;
  }, true);
  window.addEventListener("sils:auth-error", () => toast(t("authError")));

  window.setInterval(async () => {
    if (!document.hidden && route().path === "browse" && db) { await loadContributors(true); syncContributorWall(); }
  }, 60000);

  activePath = route().path;
  session = auth?.session || null;
  renderHeader(); loadingPage();
  Promise.resolve(auth?.ready).then((value) => { session = value || null; authLoaded = true; render(); });
})();
