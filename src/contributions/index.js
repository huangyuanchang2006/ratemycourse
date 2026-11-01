import * as rules from "./rules.js";
import {
  providers,
  providerLabel,
  groups,
  contentLanguages,
  termLabel,
} from "../catalog/index.js";
import { createContributionFlow } from "./flow.js";
import { createTermPicker } from "./term-picker.js";
import { reviewFeedback } from "./feedback.js";
import { createDrafts } from "../platform/index.js";
import { saveForm } from "../platform/index.js";
export { createContributionFlow } from "./flow.js";
export { reviewPayload, syllabusUrls } from "./rules.js";
export function createContributions({
  client: db,
  view,
  identity,
  catalog,
  sourceLanguages,
}) {
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

  let reviewTermPicker = null,
    editingReview = null,
    reviewEditScroll = 0,
    savingTask = null;
  const formField = (label, name, options = {}) =>
    `<div class="field"><label for="${escapeHtml(name)}">${escapeHtml(label)}${options.optional ? ` <span class="optional">${view.language === "zh" ? "可选" : "optional"}</span>` : ""}</label>${options.textarea ? `<textarea id="${escapeHtml(name)}" name="${escapeHtml(name)}" ${options.required ? "required" : ""} maxlength="${options.max || 3000}">${escapeHtml(options.value ?? "")}</textarea>` : `<input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="${escapeHtml(options.type || "text")}" ${options.type === "number" ? 'min="0" max="999.9" step="0.1"' : ""} ${options.required ? "required" : ""} maxlength="${options.max || 200}" value="${escapeHtml(options.value ?? "")}" placeholder="${escapeHtml(options.placeholder || "")}">`}</div>`;
  const model = {
    ...rules,
    providers,
    providerLabel,
    groups,
    contentLanguages,
    termLabel,
  };
  const drafts = createDrafts({
    selector: "#review-form",
    view,
    userId: () => identity.session?.user.id,
    persistent: true,
    restored(form) {
      toggleNewCourseFields();
      toggleTermField();
      reviewTermPicker?.set(form.elements.term.value);
    },
  });
  let preparedTermCheck = () => {
    throw Object.assign(new Error(t("invalidTerm")), { code: "invalidTerm" });
  };
  const flow = createContributionFlow({
    client: db,
    identity,
    invalidate: catalog.invalidate,
    validateTerm() {
      preparedTermCheck();
    },
  });
  function moderationMarkup(item) {
    const feedback = Array.isArray(item.moderation_feedback)
      ? item.moderation_feedback
      : [];
    const zh = view.language === "zh";
    const detail = feedback.length
      ? `<section class="review-feedback" aria-label="${zh ? "审核反馈" : "Review feedback"}"><strong>${zh ? "请修改以下内容" : "Please revise the following"}</strong><ul>${feedback.map((entry) => `<li><span class="small">${escapeHtml(entry.rule_id || "")} · ${escapeHtml((entry.fields || []).map((field) => reviewFeedback.fieldLabel(field, view.language)).join(" / "))}</span><p>${escapeHtml(reviewFeedback.message(entry, view.language))}</p></li>`).join("")}</ul></section>`
      : "";
    const context = item.historical_exempt
      ? `<p class="small">${zh ? "历史投稿已豁免，编辑后仍保持公开。" : "Historical review: edits keep this contribution public."}</p>`
      : item.status === "needs_human"
        ? `<p class="small">${zh ? "正在等待人工复核。你也可以编辑内容后重新提交。" : "Waiting for human review. You can also edit and resubmit."}</p>`
        : item.status === "pending" && item.moderation_queue === "failed"
          ? `<p class="small">${zh ? "自动审核暂未完成，内容仍在待审。可请求人工复核。" : "Automatic review has not completed. Your contribution is still pending; you can request human review."}</p>`
          : "";
    const appeal =
      item.appeal_state === "open"
        ? `<p class="small">${zh ? "人工复核申请已收到。" : "Your request for human review has been received."}</p>`
        : ["pending", "changes_requested", "needs_human"].includes(item.status)
          ? `<details class="review-appeal"><summary>${zh ? "请求人工复核" : "Request human review"}</summary><form data-review-appeal data-review-id="${escapeHtml(item.id)}" data-revision="${item.content_revision}"><div class="field"><label for="appeal-${escapeHtml(item.id)}">${zh ? "复核说明" : "Review request"}</label><textarea id="appeal-${escapeHtml(item.id)}" name="note" required maxlength="2000" rows="3"></textarea></div><p class="form-error error" role="alert" tabindex="-1" hidden></p><button class="button secondary compact" type="submit">${zh ? "提交复核申请" : "Send request"}</button></form></details>`
          : "";
    return detail + context + appeal;
  }

  async function renderMine(version) {
    if (!identity.session) {
      gated(t("mine"), t("loginRequired"));
      return;
    }
    const data = await flow.mine();
    if (version !== view.version) return;
    const items = data || [];
    main.innerHTML = `<div class="page-heading"><div><p class="eyebrow">YOUR CONTRIBUTIONS</p><h1>${escapeHtml(t("mine"))}</h1><p class="subtext">${view.language === "zh" ? "投稿审核通过后公开。修改会重新审核；此前已确认豁免的历史投稿除外。" : "Contributions become public after approval. Edits are reviewed again, except for the confirmed historical reviews."}</p></div><a class="button" href="./#/share">${escapeHtml(t("share"))}</a></div>
      ${
        items.length
          ? items
              .map((item) => {
                const title = item.course_id
                  ? catalog.courses.find(
                      (course) => course.id === item.course_id,
                    )?.title || (view.language === "zh" ? "课程" : "Course")
                  : item.suggested_course_title ||
                    (view.language === "zh" ? "新课程建议" : "Proposed course");
                return `<article class="submission"><div><span class="pill ${item.status === "published" ? "green" : item.status === "pending" ? "amber" : ""}">${escapeHtml(reviewFeedback.status(item, view.language) || t(item.status) || item.status)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(model.termLabel(item.term, view.language))} · ${escapeHtml(String(item.experience || "").slice(0, 200) + (String(item.experience || "").length > 200 ? "…" : ""))}</p>${moderationMarkup(item)}</div><div class="submission-actions">${button(`edit-review:${item.id}`, t("edit"), "button secondary compact")}${item.course_id ? link(`./#/course/${encodeURIComponent(item.course_id)}`, view.language === "zh" ? "课程页" : "Course page") : ""}</div></article>`;
              })
              .join("")
          : `<div class="empty-state"><h2>${escapeHtml(t("noMine"))}</h2><a class="button" href="./#/share">${escapeHtml(t("share"))}</a></div>`
      }`;
  }

  function validateReviewTerm(form) {
    if (form.dataset.editId && form.elements.term.value === editingReview?.term)
      return;
    if (!reviewTermPicker?.valid()) {
      reviewTermPicker?.focus();
      throw Object.assign(new Error(t("invalidTerm")), { code: "invalidTerm" });
    }
  }

  async function showReviewPreview(form) {
    validateReviewTerm(form);
    const picker = reviewTermPicker;
    const unchangedEdit = Boolean(
      form.dataset.editId && form.elements.term.value === editingReview?.term,
    );
    // The confirmed term keeps its validator even if a later view destroys the picker DOM.
    preparedTermCheck = () => {
      if (!unchangedEdit && !picker.valid())
        throw Object.assign(new Error(t("invalidTerm")), {
          code: "invalidTerm",
        });
    };
    const payload = flow.prepare(Object.fromEntries(new FormData(form)));
    const target = $("#review-submission-preview");
    const selected = catalog.courses.find(
      (course) => course.id === payload.course_id,
    );
    const title = selected?.title || payload.suggested_course_title;
    const syllabus = safeUrl(
      selected?.syllabus_url || payload.suggested_course_syllabus_url,
    );
    reviewEditScroll = window.scrollY;
    reviewTermPicker.close(false);
    target.innerHTML = `<header class="review-preview-header"><h2>${view.language === "zh" ? "公开内容预览" : "Public content preview"}</h2><p>${escapeHtml(title)}</p><p class="hint">${view.language === "zh" ? "检查原文与公开范围，提交后先进入审核。" : "Check your original writing and publication choices. Submissions enter review first."}</p></header>${await catalog.reviewCard(payload, { preview: true })}${syllabus ? `<section class="official-course-info"><h2>${escapeHtml(t("syllabus"))}</h2><a class="text-link" href="${escapeHtml(syllabus)}" target="_blank" rel="noreferrer">${escapeHtml(t("syllabus"))} ↗</a></section>` : ""}<p class="review-preview-error error" role="alert" tabindex="-1" hidden></p><div class="review-preview-actions"><button class="button secondary" type="button" data-action="return-review">${view.language === "zh" ? "返回修改" : "Back to editing"}</button><button class="button" type="button" data-action="confirm-review">${escapeHtml(editingReview?.historical_exempt ? (view.language === "zh" ? "保存修改" : "Save changes") : editingReview ? t("saveReview") : t("submit"))}</button></div>`;
    form.hidden = true;
    target.hidden = false;
    target.focus();
    target.scrollIntoView({ block: "start", behavior: "instant" });
  }

  async function renderShare(editId = "", version) {
    if (!identity.session) {
      gated(t("share"), t("loginRequired"));
      return;
    }
    if (savingTask) await savingTask;
    if (version !== view.version) return;
    const author = identity.session?.user.id;
    await identity.getProfile();
    if (version !== view.version || author !== identity.session?.user.id)
      return;
    if (!identity.complete(identity.profile)) {
      const target = `./${window.location.hash || "#/share"}`;
      window.location.hash = `/profile?onboarding=1&return=${encodeURIComponent(target)}`;
      return;
    }
    const current = await flow.begin(editId, () => version === view.version);
    if (version !== view.version) return;
    if (editId && !current) {
      main.innerHTML = `<div class="empty-state"><h2>${escapeHtml(t("notReady"))}</h2></div>`;
      return;
    }
    const selectedCourse =
      current?.course_id || route().params.get("course") || "";
    const requestedProvider = route().params.get("provider");
    const selectedProvider =
      current?.suggested_course_provider ||
      (!current &&
      !selectedCourse &&
      model.providers.includes(requestedProvider)
        ? requestedProvider
        : "");
    const isNewCourse = Boolean(
      current?.suggested_course_title ||
        (!current && !selectedCourse && selectedProvider),
    );
    editingReview = current;
    const zh = view.language === "zh";
    const choices = (name, label, items, selected, hint = "") =>
      `<fieldset><legend>${escapeHtml(label)} <span class="optional">${zh ? "选填" : "optional"}</span></legend>${hint ? `<p class="hint">${escapeHtml(hint)}</p>` : ""}<div class="submission-options">${items.map(([value, title]) => `<label class="submission-choice"><input type="radio" name="${name}" value="${value}" ${String(selected ?? "") === value ? "checked" : ""}><span>${escapeHtml(title)}</span></label>`).join("")}</div><button class="text-link indicator-clear" type="button" data-clear-indicator="${name}">${zh ? "清除选择" : "Clear selection"}</button></fieldset>`;
    const course = catalog.courses.find((item) => item.id === selectedCourse);
    main.innerHTML = `<header class="page-heading review-form-context"><div><h1>${escapeHtml(current ? t("edit") : t("share"))}</h1>${course ? `<h2>${escapeHtml(course.title)}</h2><p class="small">${escapeHtml(model.providerLabel(course.provider, view.language))}${course.credits != null ? ` · ${escapeHtml(course.credits)} ${zh ? "学分" : "credits"}` : ""}</p>` : ""}<p class="subtext">${current?.historical_exempt ? (zh ? "这条历史投稿已豁免，保存修改后继续公开。" : "This historical review remains public after saving.") : zh ? "先预览你的原文与公开范围，提交后进入审核。" : "Preview your original writing and publication choices before submitting for review."}</p></div></header>
    <form id="review-form" class="form-shell" data-edit-id="${escapeHtml(editId)}" data-revision="${current?.content_revision || ""}" novalidate>
      <section class="panel"><h2>${escapeHtml(t("existingCourse"))}</h2><label class="radio"><input type="radio" name="course_mode" value="existing" ${!isNewCourse ? "checked" : ""}><span><strong>${escapeHtml(t("existingCourse"))}</strong><small>${view.language === "zh" ? "选择已收录的课程" : "Choose a listed course"}</small></span></label><div class="field"><label for="course-id">${escapeHtml(t("selectCourse"))}</label><select id="course-id" name="course_id"><option value="" ${selectedCourse ? "" : "selected"}>${view.language === "zh" ? "请选择课程" : "Choose a course"}</option>${catalog.courses.map((course) => `<option value="${escapeHtml(course.id)}" ${selectedCourse === course.id ? "selected" : ""}>${escapeHtml(course.title)} · ${escapeHtml(model.providerLabel(course.provider, view.language))}</option>`).join("")}</select></div>
          <label class="radio"><input type="radio" name="course_mode" value="new" ${isNewCourse ? "checked" : ""}><span><strong>${escapeHtml(t("newCourse"))}</strong><small>${view.language === "zh" ? "课程和体验会共同待审；审核通过后加入目录。" : "The course and experience are reviewed together and then added to the catalog."}</small></span></label>
          <div id="new-course-fields" class="field-grid" ${isNewCourse ? "" : "hidden"}>${formField(t("courseTitle"), "suggested_course_title", { value: current?.suggested_course_title, required: true })}<div class="field"><label for="suggested-course-provider">${escapeHtml(t("provider"))}</label><select name="suggested_course_provider" id="suggested-course-provider" required><option value="">—</option>${model.providers.map((p) => `<option value="${p}" ${selectedProvider === p ? "selected" : ""}>${escapeHtml(model.providerLabel(p, view.language))}</option>`).join("")}</select></div>${formField(t("courseCode"), "suggested_course_code", { value: current?.suggested_course_code, optional: true })}${formField(t("credits"), "suggested_course_credits", { value: current?.suggested_course_credits, type: "number", optional: true })}<div class="field"><label for="suggested-course-language">${escapeHtml(t("language"))}</label><select id="suggested-course-language" name="suggested_course_language"><option value="">—</option>${["English", "Japanese", "Chinese", "Other"].map((p) => `<option ${current?.suggested_course_language === p ? "selected" : ""}>${p}</option>`).join("")}</select></div>${formField(t("syllabusUrls"), "suggested_course_syllabus_urls", { value: (current?.suggested_course_syllabus_urls || []).join("\n") || current?.suggested_course_syllabus_url || "", textarea: true, optional: true, max: 1000 })}<p class="hint">${view.language === "zh" ? "粘贴官方课程链接；有多个链接时每行一个。" : "Paste official course links, one URL per line."}</p></div>
        </section>
      <section class="panel"><h2>${zh ? "这次修课" : "When you took the course"}</h2><div class="field-grid"><div id="term-picker" class="term-picker"></div>${formField(t("teacher"), "teacher", { value: current?.teacher, optional: true })}</div></section>
      <section class="panel"><h2>${zh ? "你的课程判断" : "Your course indicators"}</h2><p class="hint">${zh ? "四项均可跳过；只填写你能判断的部分，不会根据正文自动填选。" : "All four are optional. Answer what you know; your writing does not fill them automatically."}</p><div class="submission-indicators">
      ${choices("workload", t("workload"), [...[1, 2, 3, 4, 5].map((n) => [String(n), `${n} ${t("workloadNames")[n - 1]}`]), ["unknown", zh ? "不确定" : "Not sure"]], current?.workload_unknown ? "unknown" : current?.workload, zh ? "表示时间与精力投入，不代表课程质量。" : "Time and effort required, not course quality.")}
      ${choices("group_work", t("group"), [...["none", "some", "heavy", "mixed"].map((v, i) => [v, t("groupChoices")[i]]), ["unknown", zh ? "不确定" : "Not sure"]], current?.group_work)}
      ${choices(
        "attendance",
        zh ? "出席要求" : "Attendance",
        [
          ["required", zh ? "要求出席" : "Required"],
          ["not_required", zh ? "不要求出席" : "Not required"],
          [
            "conditional",
            zh ? "部分活动要求出席" : "Required for some activities",
          ],
          ["unknown", zh ? "不确定" : "Not sure"],
        ],
        current?.attendance,
        zh
          ? "修读时的出席要求，不是你的出勤率。"
          : "Requirements when you took the course, not your attendance rate.",
      )}
      ${choices(
        "take_again",
        zh ? "是否愿意再选" : "Would take again",
        [
          ["yes", zh ? "愿意" : "Yes"],
          ["no", zh ? "不愿意" : "No"],
          ["unsure", zh ? "还不确定" : "Not sure yet"],
        ],
        current?.take_again,
      )}
      </div></section>
      <section class="panel"><h2>${zh ? "写下你的体验" : "Write your experience"}</h2><p class="hint">${zh ? "预览保留你的原文，不自动总结或改写。" : "The preview preserves your original text without summarising or rewriting."}</p>
      ${formField(t("experience"), "experience", { value: current?.experience, textarea: true, required: true, max: 5000 })}
      <div class="field-grid">${formField(t("fit"), "fit", { value: current?.fit, textarea: true, optional: true })}${formField(t("avoid"), "avoid", { value: current?.avoid, textarea: true, optional: true })}</div>
      ${formField(t("assessment"), "assessment", { value: current?.assessment, textarea: true, optional: true })}${formField(t("notes"), "notes", { value: current?.notes, textarea: true, optional: true, max: 2000 })}
      <div class="field"><label for="content-language">${zh ? "评价原文语言" : "Original review language"}</label><select id="content-language" name="content_language" required><option value="">${zh ? "请选择" : "Choose a language"}</option>${model.contentLanguages.map((value) => `<option value="${value}" ${current?.content_language === value ? "selected" : ""}>${sourceLanguages[view.language][value]}</option>`).join("")}</select><p class="hint">${zh ? "与你的写作语言一致，和授课语言分别记录。" : "Choose the language you wrote in, separately from the teaching language."}</p></div></section>
      <section class="panel"><h2>${zh ? "作者与公开选择" : "Identity and publication choices"}</h2><p class="hint">${zh ? "默认匿名；完成个人资料不等于同意公开。" : "Anonymous by default. Completing your profile does not mean consenting to publication."}</p>
      <label class="check"><input type="checkbox" name="show_name" ${current?.show_name ? "checked" : ""} ${identity.profile?.display_name ? "" : "disabled"}><span><strong>${escapeHtml(t("showName"))}</strong><small>${escapeHtml(identity.profile?.display_name || t("ownProfile"))}</small></span></label>
      <label class="check"><input type="checkbox" name="show_avatar" ${current?.show_avatar ? "checked" : ""} ${identity.profile?.avatar_path ? "" : "disabled"}><span><strong>${escapeHtml(t("showAvatar"))}</strong><small>${escapeHtml(identity.profile?.avatar_path ? t("avatar") : t("profilePhoto"))}</small></span></label>
      <label class="check"><input type="checkbox" name="show_profile" ${current?.public_profile_id ? "checked" : ""} ${identity.profile?.is_public ? "" : "disabled"}><span><strong>${escapeHtml(t("showProfile"))}</strong><small>${escapeHtml(identity.profile?.is_public ? t("profile") : t("publicProfileNeeded"))}</small></span></label>
      <details class="contribution-background"><summary>${zh ? "这次修课的背景 · 选填" : "Background for this experience · Optional"}</summary>${formField(t("priorKnowledge"), "reviewer_prior_knowledge", { value: current ? current.reviewer_prior_knowledge : identity.profile?.prior_knowledge, optional: true, textarea: true, max: 500 })}${formField(t("selectionGoal"), "reviewer_selection_goal", { value: current ? current.reviewer_selection_goal : identity.profile?.selection_goal, optional: true, textarea: true, max: 500 })}</details>
      <label class="check"><input type="checkbox" name="share_background" ${current?.share_background ? "checked" : ""}><span><strong>${escapeHtml(t("shareBackground"))}</strong><small>${escapeHtml(t("contextAuthor"))}</small></span></label></section>
      <p class="form-error error" role="alert" tabindex="-1" hidden></p><div class="form-actions"><a class="text-link" href="./#/mine">${escapeHtml(t("cancel"))}</a><div class="review-draft-actions"><button class="button secondary" type="button" data-action="save-review-draft">${zh ? "保存草稿" : "Save draft"}</button><button class="button" type="submit">${zh ? "预览公开内容" : "Preview public content"}</button></div></div>
    </form><section id="review-submission-preview" class="form-shell review-preview" tabindex="-1" hidden></section>`;
    reviewTermPicker = createTermPicker({
      root: $("#term-picker"),
      getLanguage: () => view.language,
      onChange: drafts.capture,
    });
    reviewTermPicker.set(current?.term || "");
    toggleNewCourseFields();
  }

  function toggleNewCourseFields() {
    const form = $("#review-form");
    if (!form) return;
    const isNew = $("input[name=course_mode]:checked", form)?.value === "new";
    $("#new-course-fields", form).hidden = !isNew;
    $("#new-course-fields", form)
      .querySelectorAll("input,select,textarea")
      .forEach((input) => {
        input.disabled = !isNew;
      });
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
  async function saveReview(form) {
    const version = view.version,
      editing = editingReview;
    const result = await flow.submit();
    if (!result.contextCurrent) return;
    drafts.clear();
    toast(
      editing
        ? view.language === "zh"
          ? "修改已保存，请查看当前审核状态。"
          : "Changes saved. Check the current review status."
        : t("reviewSaved"),
    );
    if (version === view.version) location.hash = "/mine";
  }

  return {
    renderShare,
    renderMine,
    capture: drafts.capture,
    get dirty() {
      return drafts.dirty;
    },
    reset() {
      drafts.reset();
      flow.reset();
      editingReview = null;
    },
    beforeRender() {
      reviewTermPicker?.destroy();
      reviewTermPicker = null;
    },
    afterRender(current) {
      if (current.path === "share") drafts.restore();
    },
    handleClick(event) {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "save-review-draft") {
        drafts.save();
        return true;
      }
      if (action === "return-review") {
        if (flow.saving) return true;
        flow.edit();
        $("#review-submission-preview").hidden = true;
        $("#review-form").hidden = false;
        $("#review-form button[type=submit]").focus({ preventScroll: true });
        scrollTo({ top: reviewEditScroll, behavior: "instant" });
        return true;
      }
      if (action === "confirm-review") {
        $("#review-form").requestSubmit();
        return true;
      }
      const clear = event.target.closest("[data-clear-indicator]");
      if (clear) {
        document
          .querySelectorAll(
            '#review-form [name="' + clear.dataset.clearIndicator + '"]',
          )
          .forEach((input) => (input.checked = false));
        drafts.capture();
        return true;
      }
      if (action?.startsWith("edit-review:")) {
        location.hash =
          "/share?edit=" + encodeURIComponent(action.split(":")[1]);
        return true;
      }
      return false;
    },
    handleChange(event) {
      if (event.target.matches("input[name=course_mode]"))
        toggleNewCourseFields();
      if (event.target.matches("#term")) toggleTermField();
      if (event.target.closest("#review-form")) drafts.capture();
    },
    handleInput(event) {
      if (event.target.closest("#review-form")) drafts.capture();
    },
    async submit(form) {
      if (form.matches("[data-review-appeal]"))
        return saveForm(
          form,
          view,
          async (values) => {
            await flow.appeal(
              form.dataset.reviewId,
              form.dataset.revision,
              values.get("note"),
            );
            toast(
              view.language === "zh"
                ? "人工复核申请已收到。"
                : "Your request for human review has been received.",
            );
            await view.requestRender();
          },
          $(".form-error", form),
        );
      if (!form.reportValidity()) {
        flow.edit();
        return;
      }
      if (!flow.previewing) {
        try {
          await showReviewPreview(form);
        } catch (error) {
          flow.edit();
          const node = $(".form-error", form);
          node.textContent = t(error.code) || error.message;
          node.hidden = false;
          if (error.code !== "invalidTerm") node.focus();
        }
        return;
      }
      const errorNode = $("#review-submission-preview").hidden
        ? $(".form-error", form)
        : $(".review-preview-error");
      const task = saveForm(
        form,
        view,
        () => saveReview(form),
        errorNode,
        $("[data-action=confirm-review]"),
      );
      savingTask = task;
      try {
        await task;
      } finally {
        if (savingTask === task) savingTask = null;
      }
    },
  };
}
