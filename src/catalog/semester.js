// One account-owned active semester. Persistence and assessment state stay here.
export function createSemester({ client, identity, view }) {
  const { escapeHtml: esc } = view;
  const copy = (en, zh) => view.language === "zh" ? zh : en;
  let owner = null, generation = 0, loadVersion = 0;
  let selected = new Map(), pending = new Map(), loadError = null;
  let assessment = null, stale = false, assessing = false, assessmentError = "";
  let scoreRequest = 0;
  const fields = "course_id,created_at,course:courses(id,title,provider,credits,language,canonical_course_id)";
  const user = () => identity.session?.user?.id || null;

  function reset() {
    owner = user(); generation++; loadVersion++; scoreRequest++;
    selected = new Map(); pending = new Map(); loadError = null;
    assessment = null; stale = false; assessing = false; assessmentError = "";
    if (view.route().path === "semester") view.main.innerHTML = `<p role="status">${copy("Loading your semester…", "正在加载你的学期…")}</p>`;
  }
  function ensureOwner() { if (owner !== user()) reset(); }
  function current(id, version) { return user() === id && owner === id && generation === version; }
  function message(error) {
    const code = error?.code || error?.error;
    if (["42P01", "PGRST205", "setup_required", "storage_unavailable"].includes(code)) return copy("Account saving or AI setup is not available yet. Please try again once setup is complete.", "账户保存或 AI 尚未配置完成，请稍后重试。");
    if (["401", "sign_in_required"].includes(String(code))) return copy("Please sign in again to continue.", "请重新登录后继续。");
    if (code === "23514") return copy("This course cannot be added. Refresh the catalog and keep your semester to 20 courses or fewer.", "无法添加该课程。请刷新课程目录，每学期最多选择 20 门课程。");
    if (code === "rate_limited") return copy("Please wait a minute between assessments. Each account can request five new assessments per UTC day.", "两次评估之间请间隔一分钟。每个账户每天（UTC）最多生成五次新评估。");
    if (["selection_changed", "course_changed"].includes(code)) return copy("Your courses, profile, or reviews changed. Refresh your semester before assessing again.", "课程、资料或评价已更新，请刷新学期后重新评估。");
    if (code === "selection_too_large") return copy("There is too much review material to assess safely in one request. Try a smaller selection.", "评价资料过多，无法在单次请求中完整评估，请减少所选课程。");
    return copy("Could not complete the request. Your saved courses are unchanged; please try again.", "请求未完成，已保存的课程不受影响，请重试。");
  }

  async function load() {
    ensureOwner();
    if (!owner) return;
    const id = owner, version = generation, request = ++loadVersion;
    try {
      const result = await client.from("semester_courses").select(fields).eq("user_id", id).order("created_at");
      if (!current(id, version) || request !== loadVersion) return;
      if (result.error) throw result.error;
      selected = new Map((result.data || []).map(row => [String(row.course_id), row]));
      loadError = null;
    } catch (error) {
      if (!current(id, version) || request !== loadVersion) return;
      loadError = error;
      // Do not represent a failed read as an empty saved semester.
    }
    syncButtons();
  }

  function button(courseId) {
    ensureOwner();
    const id = String(courseId), added = selected.has(id), busy = pending.has(id);
    return `<button type="button" class="btn semester-add ${added ? "semester-added" : "btn-outline-primary"}" data-semester-add="${esc(id)}" aria-pressed="${added}" ${busy ? "disabled aria-busy=\"true\"" : ""}>${esc(busy ? copy("Saving…", "保存中…") : added ? copy("✓ Added to My Semester", "✓ 已加入我的学期") : copy("＋ Add to My Semester", "＋ 加入我的学期"))}</button>`;
  }
  function syncButtons() {
    document.querySelectorAll("[data-semester-add]").forEach(node => {
      const id = node.dataset.semesterAdd, added = selected.has(id), busy = pending.has(id);
      node.textContent = busy ? copy("Saving…", "保存中…") : added ? copy("✓ Added to My Semester", "✓ 已加入我的学期") : copy("＋ Add to My Semester", "＋ 加入我的学期");
      node.disabled = busy; node.setAttribute("aria-pressed", String(added));
      node.setAttribute("aria-busy", String(busy));
      node.classList.toggle("semester-added", added);
    });
    document.querySelectorAll("[data-semester-remove]").forEach(node => { node.disabled = pending.has(node.dataset.semesterRemove); });
  }
  function repaint() { if (view.route().path === "semester") renderContent(); else syncButtons(); }

  async function change(courseId, remove = false) {
    ensureOwner();
    const id = String(courseId);
    if (!owner) { identity.login(`community#/semester?add=${encodeURIComponent(id)}`); return false; }
    if (pending.has(id)) return false;
    if (!remove && selected.has(id)) { view.toast(copy("Already in My Semester.", "已加入我的学期。")); return true; }
    const account = owner, version = generation, token = Symbol();
    pending.set(id, token); loadVersion++; syncButtons();
    try {
      if (loadError) { await load(); if (loadError) throw loadError; }
      if (!current(account, version)) return false;
      const result = remove
        ? await client.from("semester_courses").delete().eq("user_id", account).eq("course_id", id)
        : await client.from("semester_courses").insert({ user_id: account, course_id: id }).select(fields).single();
      if (!current(account, version)) return false;
      loadVersion++;
      if (result.error && result.error.code !== "23505") throw result.error;
      if (result.error?.code === "23505") { await load(); if (loadError) throw loadError; }
      else if (remove) selected.delete(id);
      else selected.set(id, result.data);
      if (!current(account, version)) return false;
      if (assessment) stale = true;
      assessment = null; scoreRequest++; assessing = false; assessmentError = "";
      view.toast(remove ? copy("Removed from My Semester.", "已从我的学期移除。") : copy("Saved to My Semester.", "已保存到我的学期。"));
      return true;
    } catch (error) {
      if (current(account, version)) view.toast(message(error));
      return false;
    } finally {
      if (current(account, version) && pending.get(id) === token) { pending.delete(id); repaint(); }
    }
  }

  async function invoke(method) {
    const name = method === "GET" ? `assess-semester?language=${view.language}` : "assess-semester";
    const { data, error } = await client.functions.invoke(name, {
      method, ...(method === "POST" ? { body: { language: view.language, consent: true } } : {}),
    });
    if (error) {
      let detail;
      try { detail = await error.context?.json(); } catch { /* Network failure has no body. */ }
      throw detail || { code: "assessment_unavailable" };
    }
    if (!data || data.error) throw data || { code: "assessment_unavailable" };
    return data;
  }
  function accept(data) {
    const ids = [...selected.keys()].sort();
    if (!Array.isArray(data.course_ids) || JSON.stringify([...data.course_ids].sort()) !== JSON.stringify(ids)) {
      assessment = null; stale = true; return;
    }
    assessment = data.assessment ? data : null;
    stale = Boolean(data.stale);
  }
  async function assess() {
    ensureOwner();
    if (!owner || assessing || loadError || pending.size || !selected.size) return;
    const id = owner, version = generation, request = ++scoreRequest, language = view.language;
    assessing = true; assessmentError = ""; renderContent();
    try {
      const data = await invoke("POST");
      if (!current(id, version) || request !== scoreRequest || language !== view.language) return;
      accept(data);
    } catch (error) {
      if (current(id, version) && request === scoreRequest) assessmentError = message(error);
    } finally {
      if (current(id, version) && request === scoreRequest) { assessing = false; repaint(); }
    }
  }

  function resultMarkup() {
    if (!assessment) return `<div class="semester-ai-empty"><span aria-hidden="true">✦</span><h3>${copy("How does your semester fit?", "你的学期适合你吗？")}</h3><p>${copy("Get an explained fit score based on your profile and published student reviews.", "结合个人资料和已发布的修课评价，获得附带理由的适合度评估。")}</p></div>`;
    const result = assessment.assessment;
    const list = (title, values) => values?.length ? `<section><h3>${esc(title)}</h3><ul>${values.map(value => `<li>${esc(value)}</li>`).join("")}</ul></section>` : "";
    return `<div class="semester-score"><strong>${result.score === null ? "—" : esc(result.score)}</strong><span>${result.score === null ? copy("Not enough evidence for an overall score", "信息不足，暂不提供总分") : copy("/ 10 · personal fit", "/ 10 · 个人适合度")}</span></div><p>${esc(result.summary)}</p>
      ${list(copy("What fits", "契合之处"), result.strengths)}${list(copy("Tradeoffs", "需要权衡"), result.tradeoffs)}${list(copy("Still worth checking", "还需确认"), result.missing_information)}
      <div class="semester-course-assessments">${result.courses.map(entry => {
        const title = selected.get(String(entry.course_id))?.course?.title || copy("Course", "课程");
        return `<section><h3>${esc(title)} <span>${entry.score === null ? copy("Unscored", "未评分") : `${esc(entry.score)}/10`}</span></h3><p>${esc(entry.reason)}</p><div class="semester-sources">${entry.review_ids.map((id, i) => `<a class="text-link" href="./#/course/${encodeURIComponent(entry.course_id)}?review=${encodeURIComponent(id)}">${copy("Source review", "参考评价")} ${i + 1} ↗</a>`).join("")}</div></section>`;
      }).join("")}</div><p class="small">${copy("Assessed", "评估时间")} ${esc(new Date(assessment.generated_at).toLocaleString(view.language === "zh" ? "zh-CN" : "en"))}</p>`;
  }
  function renderContent() {
    ensureOwner();
    if (!owner) {
      view.main.innerHTML = `<section class="gated"><p class="eyebrow">${copy("YOUR NEXT SEMESTER", "你的下一学期")}</p><h1>${copy("My Semester", "我的学期")}</h1><p>${copy("Sign in to save courses to your account and assess how they fit you.", "登录后即可保存课程，并评估它们与你的契合程度。")}</p><button class="btn btn-primary" type="button" data-semester-signin>${copy("Sign in to start", "登录并开始")}</button></section>`;
      return;
    }
    const rows = [...selected.values()];
    const known = rows.filter(row => typeof row.course?.credits === "number" && Number.isFinite(row.course.credits));
    const credits = known.reduce((sum, row) => sum + row.course.credits, 0);
    const card = row => {
      const course = row.course;
      return `<article class="card semester-course"><div><p class="eyebrow">${esc(course?.provider || "")}</p><h2><a href="./#/course/${encodeURIComponent(row.course_id)}">${esc(course?.title || copy("Course no longer available", "课程已不可用"))}</a></h2><p class="small">${esc(course?.language || copy("Language not listed", "未记录授课语言"))} · ${course?.credits == null ? copy("Credits not listed", "未记录学分") : `${esc(course.credits)} ${copy("credits", "学分")}`}</p>${course?.canonical_course_id ? `<p class="small">${copy("This course was merged. Remove it and add the current course from its detail page.", "该课程已合并，请移除后从详情页加入当前课程。")}</p>` : ""}</div><div class="semester-course-actions"><a class="text-link" href="./#/course/${encodeURIComponent(row.course_id)}">${copy("Read reviews", "阅读评价")} ↗</a><button type="button" class="btn btn-outline-secondary" data-semester-remove="${esc(row.course_id)}" ${pending.has(String(row.course_id)) ? "disabled" : ""}>${copy("Remove", "移除")}</button></div></article>`;
    };
    view.main.innerHTML = `<div class="page-heading"><div><p class="eyebrow">${copy("MAKE ROOM FOR WHAT MATTERS", "为重要的事留出空间")}</p><h1>${copy("My Semester", "我的学期")}</h1><p class="subtext">${copy("Your saved courses. A clearer view of what comes next.", "收藏课程，为下一学期做出更清晰的选择。")}</p></div><a class="btn btn-primary" href="./#/browse">${copy("＋ Explore courses", "＋ 探索课程")}</a></div>
      ${loadError ? `<div class="error" role="alert">${esc(message(loadError))} <button type="button" class="btn btn-outline-secondary" data-semester-refresh>${copy("Retry", "重试")}</button></div>` : ""}
      <div class="semester-stats"><div class="card"><span>${copy("Selected courses", "已选课程")}</span><strong>${loadError ? "—" : rows.length}</strong></div><div class="card"><span>${copy("Known credits", "已知学分")}</span><strong>${loadError ? "—" : credits}</strong><small>${!loadError && known.length < rows.length ? copy(`${rows.length - known.length} course(s) have unlisted credits`, `${rows.length - known.length} 门课未记录学分`) : copy("Check official registration requirements", "请核对官方选课要求")}</small></div><div class="card"><span>${copy("Private to your account", "仅你的账户可见")}</span><strong class="semester-stat-text">${copy("One active semester", "一个当前学期")}</strong><small>${copy("Saved across devices", "跨设备保存")}</small></div></div>
      <div class="semester-layout"><section class="semester-selection" aria-label="${copy("Saved courses", "已保存课程")}">${rows.map(card).join("") || (loadError ? "" : `<div class="empty-state"><h2>${copy("Your semester starts here.", "你的学期，从这里开始。")}</h2><p>${copy("Add courses while browsing. Come back here to compare your choices and assess their fit.", "浏览时将课程加入我的学期，再来这里比较选择并评估适合度。")}</p><a class="btn btn-primary" href="./#/browse">${copy("Find your first course", "寻找第一门课")}</a></div>`)}</section>
      <aside class="card semester-assessment"><div class="card-header"><h2>${copy("Semester fit", "学期适合度")}</h2><span class="badge">AI</span></div><div class="card-body">${stale ? `<p class="notice">${copy("Your previous assessment is out of date. Assess again using the current selection, profile, and reviews.", "之前的评估已过期，请根据当前课程、资料和评价重新评估。")}</p>` : ""}${resultMarkup()}
      ${assessmentError ? `<p class="error" role="alert">${esc(assessmentError)}</p>` : ""}
      <form id="semester-assessment-form"><label class="check"><input type="checkbox" name="ai_consent" required ${assessing ? "disabled" : ""}><span>${copy("Send my programme, year, bio, prior knowledge, goals (including private profile text), and these courses’ published reviews to OpenAI for this assessment. Photos and email are not sent.", "将我的学部、年级、自我介绍、知识背景、目标（包括未公开的资料文字）和所选课程的已发布评价发送给 OpenAI 进行本次评估。不发送照片和邮箱。")}</span></label><button class="btn btn-primary" type="submit" ${assessing || !rows.length || loadError || pending.size ? "disabled" : ""}>${assessing ? copy("Assessing your semester…", "正在评估…") : copy("✦ Assess my semester", "✦ 评估我的学期")}</button></form><p class="small semester-disclaimer">${copy("An advisory fit estimate, not predicted grades or degree approval. Review evidence may describe past instructors or semesters. Five new assessments per UTC day; unchanged results are reused.", "仅为适合度建议，不预测成绩，也不代表毕业要求审核。评价可能来自以往教师或学期。每天（UTC）最多生成五次新评估，信息未变化时复用结果。")}</p></div></aside></div>`;
  }

  async function render(version) {
    ensureOwner();
    scoreRequest++; assessing = false;
    const account = owner, epoch = generation;
    await load();
    if (!current(account, epoch) || version !== view.version) return;
    const add = view.route().params.get("add");
    if (account && add && !loadError) {
      const saved = await change(add);
      if (saved && current(account, epoch) && version === view.version) {
        const url = new URL(window.location.href); url.hash = "/semester"; window.history.replaceState(null, "", url);
      }
    }
    if (!current(account, epoch) || version !== view.version) return;
    // Hide any previous in-memory result until the server revalidates its sources.
    assessment = null; assessmentError = ""; renderContent();
    if (!account || loadError) return;
    const request = ++scoreRequest;
    try {
      const data = await invoke("GET");
      if (current(account, epoch) && request === scoreRequest && version === view.version) { accept(data); renderContent(); }
    } catch {
      if (current(account, epoch) && request === scoreRequest && version === view.version) { assessmentError = copy("AI assessment is not available yet. You can still save and manage courses.", "AI 评估暂不可用，你仍可保存和管理课程。"); renderContent(); }
    }
  }
  function handleClick(event) {
    const add = event.target.closest("[data-semester-add]");
    if (add) { void change(add.dataset.semesterAdd); return true; }
    const remove = event.target.closest("[data-semester-remove]");
    if (remove) { void change(remove.dataset.semesterRemove, true); return true; }
    if (event.target.closest("[data-semester-signin]")) { identity.login("community" + window.location.hash); return true; }
    if (event.target.closest("[data-semester-refresh]")) { void view.requestRender(); return true; }
    return false;
  }
  function handleSubmit(event) {
    if (event.target.id !== "semester-assessment-form") return false;
    event.preventDefault();
    if (event.target.reportValidity() && event.target.elements.ai_consent.checked) void assess();
    return true;
  }
  return { load, render, button, handleClick, handleSubmit, reset, syncButtons };
}
