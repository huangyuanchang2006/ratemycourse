import { getPlatform } from "../platform/index.js";
import { createAuth } from "./auth.js";
import { profilePolicy } from "./policy.js";
import { photos } from "./photos.js";
import { wallPresentation } from "./wall.js";
import { createDrafts } from "../platform/index.js";
import { saveForm } from "../platform/index.js";
export { profilePolicy } from "./policy.js";
let authentication;
export function getAuth() {
  return (authentication ||= getPlatform().then(({ client }) =>
    createAuth(client),
  ));
}
// Shared public-wall adapter: workspace and Landing use the same projection and failure contract.
async function readContributorWall(client, timeout = 0) {
  let timer;
  try {
    const operation = client.rpc("get_contributor_wall");
    const result = timeout
      ? await Promise.race([
          operation,
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("Wall unavailable")),
              timeout,
            );
          }),
        ])
      : await operation;
    if (result.error) throw result.error;
    if (!Array.isArray(result.data?.people))
      throw new Error("Wall unavailable");
    return result.data;
  } finally {
    clearTimeout(timer);
  }
}
export async function getContributorWall() {
  const auth = await getAuth();
  await auth.ready;
  return readContributorWall(auth.client, 12000);
}
export function createIdentity({ client: db, auth, view }) {
  const { $, main, t, escapeHtml, link, toast, route } = view;
  const gated = (title, description) => view.gated(title, description);

  const BUCKET = "reviewer-avatars",
    MAX_PHOTO_SIZE = 5 * 1024 * 1024,
    LEGACY_WALL_EXEMPT_IDS = new Set([
      "d56cca0a-787e-413d-8b96-9a513beaf322", // Cindy (approved static historical card)
    ]);
  let session = auth.session || null,
    profile = null,
    profileLoadedFor = "",
    selectedPhoto = null,
    photoDraft = null,
    localPhotoUrl = "",
    cleanupPhotoEditor,
    cleanupWall;
  let avatarUrlCache = new Map(),
    wallLoadedAt = 0,
    wallRequest = 0,
    wallLanguage = "",
    mountedWallData = "",
    loginTarget = "",
    loginSaveCourseId = "",
    started = false;
  let wallData = {
    people: [],
    replaced_legacy_keys: ["chambers", "cindy", "richard"],
  };
  const drafts = createDrafts({
    selector: "#profile-form",
    view,
    userId: () => session?.user.id,
    photoDirty: () => Boolean(selectedPhoto) || photos.dirty(photoDraft),
    restored: toggleWallChoice,
  });

  async function signedAvatar(path) {
    if (!path || !db) return "";
    const cached = avatarUrlCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    const { data, error } = await db.storage
      .from(BUCKET)
      .createSignedUrl(path, 1800);
    const url = error ? "" : data?.signedUrl || "";
    if (url)
      avatarUrlCache.set(path, { url, expiresAt: Date.now() + 25 * 60 * 1000 });
    return url;
  }

  async function getProfile({ force = false } = {}) {
    if (!session?.user) {
      profile = null;
      profileLoadedFor = "";
      return null;
    }
    const userId = session.user.id;
    if (!force && profileLoadedFor === userId) return profile;
    const { data, error } = await db
      .from("reviewer_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (session?.user.id !== userId) return null;
    profile = data || null;
    profileLoadedFor = userId;
    return profile;
  }

  async function loadContributors(force = false) {
    if (!force && wallLoadedAt && Date.now() - wallLoadedAt < 60000) return;
    const request = ++wallRequest;
    try {
      const data = await readContributorWall(db);
      const people = await Promise.all(
        (data?.people || []).map(async (person) => ({
          ...person,
          avatar_url: await signedAvatar(person.avatar_path),
        })),
      );
      if (request !== wallRequest) return;
      wallData = {
        people,
        replaced_legacy_keys: data?.replaced_legacy_keys || [],
        legacy_review_ids: data?.legacy_review_ids || {},
      };
      wallLoadedAt = Date.now();
    } catch (error) {
      if (request !== wallRequest) return;
      // Fail closed: never revive an opted-out historical card after a failed read.
      wallData = {
        people: [],
        replaced_legacy_keys: ["chambers", "cindy", "richard"],
      };
      wallLoadedAt = 0;
    }
  }

  function currentOnboardingMode() {
    const raw = route().params.get("onboarding");
    if (!raw) return "";
    if (raw === "contribute") return "contribute";
    if (raw === "reading") return "reading";
    return profilePolicy.readingComplete(profile) ? "contribute" : "reading";
  }

  function isWallEligibleCandidate(candidate) {
    if (profilePolicy.complete(candidate)) return true;
    return Boolean(
      LEGACY_WALL_EXEMPT_IDS.has(profile?.id) &&
        profilePolicy.readingComplete(candidate),
    );
  }

  function formHasFullContributorFields(form) {
    if (!form) return false;
    const candidate = {
      display_name: form.elements.display_name?.value || "",
      programme: form.elements.programme?.value || "",
      study_year: form.elements.study_year?.value || "",
      bio: form.elements.bio?.value || "",
      avatar_path: photoDraft?.removed
        ? ""
        : selectedPhoto
          ? "selected"
          : profile?.avatar_path || "",
    };
    return isWallEligibleCandidate(candidate);
  }

  function profileFormMarkup() {
    const mode = currentOnboardingMode();
    const zh = view.language === "zh";
    const returnUrl = route().params.get("return") || "";

    if (mode === "reading") {
      const fullStepHref = `./#/profile?onboarding=contribute${returnUrl ? `&return=${encodeURIComponent(returnUrl)}` : ""}`;
      return `<div class="page-heading"><div><p class="eyebrow">${zh ? "步骤 1 / 2 · 解锁完整评价" : "STEP 1 OF 2 · UNLOCK FULL REVIEWS"}</p><h1>${zh ? "填写 3 项基础信息" : "3 quick details to start reading"}</h1><p class="subtext">${zh ? "填完昵称、学部／项目和年级后即可阅读全部完整课程评价。简介和照片留到以后写评价或加入名片墙时再补。" : "Add your nickname, programme, and year to unlock all full course reviews. Bio and photo are only needed later if you decide to write a review or join the wall."}</p></div></div>
        <div class="form-shell"><form id="profile-form" class="panel" data-profile-mode="reading">
          <div class="field"><label for="profile-name">${escapeHtml(t("displayName"))} *</label><input id="profile-name" name="display_name" type="text" required maxlength="60" value="${escapeHtml(profile?.display_name || "")}" placeholder="${zh ? "填写你希望使用的昵称，无需真实姓名" : "Choose a nickname; your real name is not required"}"></div>
          <div class="field-grid"><div class="field"><label for="profile-programme">${escapeHtml(t("programme"))} *</label><input id="profile-programme" name="programme" required maxlength="100" value="${escapeHtml(profile?.programme || "")}" placeholder="${zh ? "例如：SILS／商学部／CJL" : "e.g. SILS / School of Commerce / CJL"}"></div><div class="field"><label for="profile-year">${escapeHtml(t("profileStudyStage"))} *</label><input id="profile-year" name="study_year" required maxlength="60" value="${escapeHtml(profile?.study_year || "")}" placeholder="${zh ? "例如：大二／2026年春入学" : "e.g. Year 2 / Spring 2026 entry"}"></div></div>
          <p class="hint">${zh ? "只填这 3 项不会把你的资料放到首页名片墙；以后随时可以在「个人名片」中补充简介和照片。" : "Completing these 3 details keeps your profile off the homepage wall. You can add a bio and photo anytime in Profile card."}</p>
          <p class="form-error error" role="alert" tabindex="-1" hidden></p>
          <div class="form-actions"><a class="text-link" href="${escapeHtml(fullStepHref)}">${zh ? "顺便补齐简介与照片" : "Add bio & photo now too"}</a><button class="button" type="submit">${zh ? "保存并解锁完整评价" : "Save and unlock reviews"}</button></div>
        </form></div>`;
    }

    const isContributeOnboarding = mode === "contribute";
    const fullRequired = isContributeOnboarding;
    const wallEligibleNow = isWallEligibleCandidate(profile);
    const visibility = profilePolicy.defaults(profile, {
      fullStep: isContributeOnboarding || wallEligibleNow,
    });
    const hasBioAndPhotoNow = wallEligibleNow;

    const eyebrow = isContributeOnboarding
      ? zh
        ? "步骤 2 / 2 · 准备分享体验"
        : "STEP 2 OF 2 · READY TO CONTRIBUTE"
      : "YOUR PROFILE";
    const title = isContributeOnboarding
      ? zh
        ? "补齐简介与照片，开始写评价"
        : "Add bio & photo to contribute"
      : zh
        ? "个人名片"
        : "Profile card";
    const subtext = isContributeOnboarding
      ? zh
        ? "基础信息已保留；补齐个人简介和照片（可用插画或风景图）后，即可提交课程评价，并可选择是否在首页名片墙展示。"
        : "Your basic details are saved. Add a short introduction and photo (portraits, illustrations, or landscapes are all welcome) to submit reviews and optionally appear on the contributor wall."
      : zh
        ? "基础 3 项用于解锁完整评价；补齐简介与照片（共 5 项）后可提交课程评价并选择上首页名片墙。"
        : "The first 3 details unlock full course reviews. Add a short introduction and photo (5 total) to contribute reviews and become eligible for the homepage wall.";

    return `<div class="page-heading"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p class="subtext">${escapeHtml(subtext)}</p></div></div>
      <div class="detail-layout profile-editor-layout"><section class="form-shell"><form id="profile-form" class="panel" data-profile-mode="${isContributeOnboarding ? "contribute" : "full"}">
        <p class="hint">${fullRequired ? (zh ? "投稿前需补齐全部 5 项；相关知识基础和选课目标仍为可选。" : "All 5 details are required before submitting a review; prior knowledge and goals remain optional.") : zh ? "前 3 项为必填；补齐简介与照片后即可投稿并解锁名片墙展示。" : "The first 3 fields are required. Add a bio and photo whenever you are ready to contribute or join the wall."}</p>
        <div class="field"><label for="profile-name">${escapeHtml(t("displayName"))} *</label><input id="profile-name" name="display_name" type="text" required maxlength="60" value="${escapeHtml(profile?.display_name || "")}" placeholder="${zh ? "填写你希望使用的昵称，无需真实姓名" : "Choose a nickname; your real name is not required"}"></div>
        <div class="field-grid"><div class="field"><label for="profile-programme">${escapeHtml(t("programme"))} *</label><input id="profile-programme" name="programme" required maxlength="100" value="${escapeHtml(profile?.programme || "")}" placeholder="${zh ? "例如：SILS／商学部／CJL" : "e.g. SILS / School of Commerce / CJL"}"></div><div class="field"><label for="profile-year">${escapeHtml(t("profileStudyStage"))} *</label><input id="profile-year" name="study_year" required maxlength="60" value="${escapeHtml(profile?.study_year || "")}" placeholder="${zh ? "例如：大二／2026年春入学" : "e.g. Year 2 / Spring 2026 entry"}"></div></div>
        <div class="field"><label for="profile-bio">${escapeHtml(t("bio"))}${fullRequired ? " *" : ` <span class="optional">${zh ? "投稿与上墙需填写" : "required to contribute / join wall"}</span>`}</label><textarea id="profile-bio" name="bio" ${fullRequired ? "required" : ""} maxlength="500">${escapeHtml(profile?.bio || "")}</textarea></div>
        <p class="hint">${zh ? "以上是当前个人资料；每条评价的实际修课背景单独填写。" : "These are your current details. Enter the background for each course separately in its review."}</p>
        ${photos.markup(view.language, { required: fullRequired })}
        <details class="profile-background"><summary>${zh ? "补充背景（可选）" : "Additional background (optional)"}</summary><p class="hint">${zh ? "填写后也会按下方的名片公开设置展示。" : "If supplied, these details follow your profile visibility setting below."}</p><div class="field-grid"><div class="field"><label for="profile-prior">${escapeHtml(t("priorKnowledge"))}</label><textarea id="profile-prior" name="prior_knowledge" maxlength="500">${escapeHtml(profile?.prior_knowledge || "")}</textarea></div><div class="field"><label for="profile-goal">${escapeHtml(t("selectionGoal"))}</label><textarea id="profile-goal" name="selection_goal" maxlength="500">${escapeHtml(profile?.selection_goal || "")}</textarea></div></div></details>
        <section class="profile-visibility" aria-labelledby="profile-visibility-title"><h2 id="profile-visibility-title">${zh ? "保存后的公开范围" : "Visibility after saving"}</h2>
        <label class="check"><input type="checkbox" name="make_private" ${visibility.is_public ? "" : "checked"}><span><strong>${zh ? "不公开我的个人名片" : "Keep my profile card private"}</strong><small>${zh ? "勾选后，名片资料和照片仅本人及网站管理员可查看，也不展示在首页名片墙。" : "When checked, only you and the site administrator can view your profile details and photo. Your card stays off the homepage wall."}</small></span></label>
        <input type="hidden" name="wall_preference" value="${visibility.show_on_wall || !visibility.is_public ? "true" : "false"}">
        <input type="checkbox" name="is_public" hidden ${visibility.is_public ? "checked" : ""}>
        <label class="check" ${profile || !fullRequired ? "" : "hidden"}><input type="checkbox" name="show_on_wall" data-preferred="${visibility.show_on_wall}" ${visibility.show_on_wall && hasBioAndPhotoNow ? "checked" : ""} ${visibility.is_public && hasBioAndPhotoNow ? "" : "disabled"}><span>${zh ? "在首页名片墙展示（需补齐简介与照片共 5 项）" : "Show on the homepage wall (requires bio & photo — all 5 details)"}</span></label>
        <p id="profile-visibility-status" class="notice" role="status"></p><p class="hint">${zh ? "无论是否公开，网站管理员都可查看你已保存的资料和照片。每条课程评价仍可单独选择匿名。" : "The site administrator can view your saved details and photo whether your card is public or private. Each course review can still be anonymous."}</p></section>
        <p class="form-error error" role="alert" tabindex="-1" hidden></p><div class="form-actions"><a class="text-link" href="./#/browse">${zh ? "先浏览课程" : "Browse courses for now"}</a><button class="button secondary" type="button" data-photo-action="preview">${zh ? "预览公开效果" : "Preview public appearance"}</button><button class="button" type="submit">${escapeHtml(isContributeOnboarding ? (zh ? "保存并继续写评价" : "Save and continue") : t("save"))}</button></div>
      </form></section><aside>${photos.previewMarkup(view.language)}</aside></div>`;
  }

  async function renderProfile(version) {
    if (!session) {
      gated(t("profile"), t("loginRequired"));
      return;
    }
    await getProfile({ force: true });
    const source = await signedAvatar(profile?.avatar_path);
    if (version !== view.version) return;
    if (!photoDraft) photoDraft = photos.create(profile, source);
    else photoDraft.source = source;
    main.innerHTML = profileFormMarkup();
    toggleWallChoice();
  }

  async function renderPerson(id, version) {
    const { data, error } = await db
      .from("reviewer_profiles")
      .select(
        "id,display_name,programme,study_year,prior_knowledge,selection_goal,bio,is_public,avatar_path,photo_crops",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (version !== view.version) return;
    if (!data?.is_public) {
      main.innerHTML = `<div class="empty-state"><h2>${escapeHtml(t("profilePrivate"))}</h2>${link("./#/browse", t("backToBrowse"), "button")}</div>`;
      return;
    }
    const avatar = await signedAvatar(data.avatar_path);
    if (version !== view.version) return;
    const person = wallData.people.find((person) => person.id === id);
    const fields = [
      [t("programme"), data.programme],
      [t("profileStudyStage"), data.study_year],
      [t("priorKnowledge"), data.prior_knowledge],
      [t("selectionGoal"), data.selection_goal],
    ].filter(([, value]) => value);
    main.innerHTML = `<div class="crumb"><a href="./#/browse">${escapeHtml(t("browse"))}</a><span>›</span><span>${escapeHtml(t("profile"))}</span></div><section class="public-person"><span class="person-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="" style="${photos.style(data.photo_crops?.avatar)}">` : escapeHtml((data.display_name || "?").slice(0, 1).toUpperCase())}</span><p class="eyebrow">${view.language === "zh" ? "公开名片 · 作者自述" : "PUBLIC PROFILE · AUTHOR-REPORTED"}</p><h1>${escapeHtml(data.display_name || t("anonymous"))}</h1>${data.bio ? `<p class="subtext">${escapeHtml(data.bio)}</p>` : ""}<dl class="context-grid">${fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl><p class="small">${escapeHtml(t("contextAuthor"))}</p>${person?.review_ids?.length ? `<a class="button secondary" href="./#/browse?author=${encodeURIComponent(id)}">${view.language === "zh" ? "查看课程体验" : "Explore course experiences"} · ${person.review_ids.length}</a>` : ""}</section>`;
  }

  function toggleWallChoice() {
    const form = $("#profile-form");
    if (!form || form.dataset.profileMode === "reading") return;
    const isPublic = !form.elements.make_private.checked;
    form.elements.is_public.checked = isPublic;
    const wallEligible = formHasFullContributorFields(form);
    const wall = form.elements.show_on_wall;
    wall.checked =
      isPublic &&
      wallEligible &&
      form.elements.wall_preference.value === "true";
    wall.disabled = !isPublic || !wallEligible;
    $("#profile-visibility-status", form).textContent =
      view.language === "zh"
        ? !isPublic
          ? "保存后，名片资料和照片仅本人及网站管理员可查看。"
          : !wallEligible
            ? "保存后名片可公开访问；补齐个人简介与照片（共 5 项）后才会具备首页名片墙展示资格。"
            : `保存后，名片资料和照片对所有访客公开${wall.checked ? "，并展示在首页名片墙" : "，不展示在首页名片墙"}。`
        : !isPublic
          ? "After saving, only you and the site administrator can view your profile details and photo."
          : !wallEligible
            ? "Your profile can be public after saving, but it stays off the homepage wall until both bio and photo (all 5 details) are completed."
            : `After saving, all visitors can view your profile details and photo${wall.checked ? ", including on the homepage wall" : "; your card stays off the homepage wall"}.`;
  }

  async function handleProfileSubmit(form, values = new FormData(form)) {
    const userId = session?.user.id;
    if (!userId)
      throw Object.assign(new Error(t("loginRequired")), {
        code: "loginRequired",
      });
    const mode = form.dataset.profileMode || "full";
    const labels = {
      display_name: t("displayName"),
      bio: t("bio"),
      programme: t("programme"),
      study_year: t("profileStudyStage"),
      avatar_path: t("avatar"),
    };

    if (mode === "reading") {
      const basics = {
        display_name: String(values.get("display_name") || "").trim(),
        programme: String(values.get("programme") || "").trim(),
        study_year: String(values.get("study_year") || "").trim(),
      };
      if (!profilePolicy.readingComplete(basics)) {
        throw new Error(
          (view.language === "zh" ? "请补齐：" : "Please complete: ") +
            profilePolicy
              .readingMissing(basics)
              .map((key) => labels[key])
              .join(view.language === "zh" ? "、" : ", "),
        );
      }
      const payload = {
        display_name: basics.display_name,
        programme: basics.programme,
        study_year: basics.study_year,
        is_public: profile ? Boolean(profile.is_public) : false,
        show_on_wall:
          profile && isWallEligibleCandidate(profile)
            ? Boolean(profile.is_public && profile.show_on_wall)
            : false,
      };
      if (session?.user.id !== userId) throw new Error(t("loginRequired"));
      const result = profile
        ? await db
            .from("reviewer_profiles")
            .update(payload)
            .eq("id", userId)
            .select("id")
            .single()
        : await db
            .from("reviewer_profiles")
            .insert(payload)
            .select("id")
            .single();
      if (result.error) throw result.error;
      if (session?.user.id !== userId) return;
      profile = { ...(profile || { id: userId }), ...payload };
      profileLoadedFor = userId;
      drafts.clear();
      view.onProfileSaved?.();
      toast(t("readingUnlocked"));
      window.location.assign(
        profilePolicy.destination(
          route().params.get("return"),
          window.location.href,
        ),
      );
      return;
    }

    const requiredProfile = Object.fromEntries(values);
    requiredProfile.avatar_path = photoDraft?.removed
      ? ""
      : selectedPhoto
        ? "selected"
        : profile?.avatar_path;

    if (mode === "contribute") {
      if (!profilePolicy.complete(requiredProfile)) {
        throw new Error(
          (view.language === "zh" ? "投稿前请补齐：" : "Complete to contribute: ") +
            profilePolicy
              .missing(requiredProfile)
              .map((key) => labels[key])
              .join(view.language === "zh" ? "、" : ", "),
        );
      }
    } else if (!profilePolicy.readingComplete(requiredProfile)) {
      throw new Error(
        (view.language === "zh" ? "请补齐：" : "Please complete: ") +
          profilePolicy
            .readingMissing(requiredProfile)
            .map((key) => labels[key])
            .join(view.language === "zh" ? "、" : ", "),
      );
    }

    const isWallEligible = isWallEligibleCandidate(requiredProfile);
    if (
      isWallEligible &&
      values.has("show_on_wall") &&
      values.has("is_public") &&
      !String(values.get("display_name") || "").trim()
    )
      throw Object.assign(new Error(t("wallNameRequired")), {
        code: "wallNameRequired",
      });
    if (photoDraft?.loading)
      throw new Error(
        view.language === "zh"
          ? "照片仍在读取，请稍候再保存。"
          : "Your photo is still loading. Please wait before saving.",
      );
    const draft = photoDraft;
    let avatarPath = draft?.removed ? null : profile?.avatar_path || null;
    let uploadedPath = "";
    if (selectedPhoto && !draft?.removed) {
      const extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      }[selectedPhoto.type];
      if (!extension || selectedPhoto.size > MAX_PHOTO_SIZE)
        throw new Error(t("photoError"));
      uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await db.storage
        .from(BUCKET)
        .upload(uploadedPath, selectedPhoto, {
          contentType: selectedPhoto.type,
          upsert: false,
          cacheControl: "3600",
        });
      if (error) throw error;
      avatarPath = uploadedPath;
    }
    const payload = {
      display_name: String(values.get("display_name") || "").trim() || null,
      programme: String(values.get("programme") || "").trim() || null,
      study_year: String(values.get("study_year") || "").trim() || null,
      prior_knowledge:
        String(values.get("prior_knowledge") || "").trim() || null,
      selection_goal: String(values.get("selection_goal") || "").trim() || null,
      bio: String(values.get("bio") || "").trim() || null,
      is_public: values.has("is_public"),
      show_on_wall:
        isWallEligible && values.has("is_public") && values.has("show_on_wall"),
      avatar_path: avatarPath,
      photo_crops: avatarPath
        ? photos.crops(draft?.crops || profile?.photo_crops)
        : null,
    };
    if (session?.user.id !== userId) throw new Error(t("loginRequired"));
    const result = profile
      ? await db
          .from("reviewer_profiles")
          .update(payload)
          .eq("id", userId)
          .select("id")
          .single()
      : await db
          .from("reviewer_profiles")
          .insert(payload)
          .select("id")
          .single();
    if (result.error) {
      if (uploadedPath) await db.storage.from(BUCKET).remove([uploadedPath]);
      throw result.error;
    }
    if (session?.user.id !== userId) return;
    photos.dispose(draft);
    photoDraft = null;
    selectedPhoto = null;
    localPhotoUrl = "";
    profile = { ...(profile || { id: userId }), ...payload };
    profileLoadedFor = userId;
    avatarUrlCache.clear();
    wallLoadedAt = 0;
    drafts.clear();
    view.onProfileSaved?.();
    toast(t("profileSaved"));
    if (route().params.has("onboarding")) {
      window.location.assign(
        profilePolicy.destination(
          route().params.get("return"),
          window.location.href,
        ),
      );
    } else await view.requestRender();
  }

  function syncContributorWall() {
    const host = $("#contributors-wall");
    if (!host) return;
    const visible = route().path === "browse";
    host.hidden = !visible;
    if (!visible) return;
    const snapshot = JSON.stringify(wallData);
    if (wallLanguage !== view.language || mountedWallData !== snapshot) {
      cleanupWall?.();
      cleanupWall = wallPresentation.mount?.(host, {
        language: view.language,
        data: wallData,
        onCourses(person) {
          view.onAuthor(person.wallKey);
        },
      });
      wallLanguage = view.language;
      mountedWallData = snapshot;
    }
  }

  const onAuth = (event) => {
    const previous = session?.user.id;
    session = event.detail.session;
    if (previous === session?.user.id) return;
    drafts.reset();
    photos.dispose(photoDraft);
    photoDraft = null;
    cleanupPhotoEditor?.();
    cleanupPhotoEditor = null;
    selectedPhoto = null;
    profile = null;
    profileLoadedFor = "";
    avatarUrlCache.clear();
    if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
    localPhotoUrl = "";
    view.onAccountChange?.();
    if (started) setTimeout(view.requestRender, 0);
  };
  window.addEventListener("sils:auth", onAuth, { signal: view.signal });
  $("#login")?.addEventListener(
    "close",
    () => {
      loginTarget = "";
      loginSaveCourseId = "";
    },
    { signal: view.signal },
  );
  const ready = Promise.resolve(auth.ready).then((value) => {
    session = value || null;
    started = true;
    return value;
  });

  function login(target = "", { saveCourseId = "" } = {}) {
    loginTarget = target;
    loginSaveCourseId = saveCourseId;
    $("#login").showModal();
  }

  return {
    auth,
    ready,
    login,
    get session() {
      return session;
    },
    get profile() {
      return profile;
    },
    get wall() {
      return wallData;
    },
    getProfile,
    readingComplete: profilePolicy.readingComplete,
    complete: profilePolicy.complete,
    signedAvatar,
    avatarStyle: photos.style,
    contributors: (language = view.language) =>
      wallPresentation.buildPeople(wallData, language),
    loadContributors,
    syncContributorWall,
    renderProfile,
    renderPerson,
    capture: drafts.capture,
    get dirty() {
      return drafts.dirty;
    },
    beforeRender() {
      cleanupPhotoEditor?.();
      cleanupPhotoEditor = null;
    },
    afterRender(current) {
      if (current.path !== "profile") return;
      drafts.restore();
      const form = $("#profile-form");
      if (form?.dataset.profileMode === "reading") return;
      if (photoDraft)
        cleanupPhotoEditor = photos.mount(
          main,
          photoDraft,
          view.language,
          () => {
            selectedPhoto = photoDraft.file;
            toggleWallChoice();
            drafts.update();
          },
          profile?.id === "d56cca0a-787e-413d-8b96-9a513beaf322"
            ? wallPresentation.buildPeople(
                {
                  people: [{ ...profile, legacy_author_key: "cindy" }],
                  replaced_legacy_keys: ["chambers", "cindy", "richard"],
                },
                view.language,
              )[0]
            : null,
          profile?.id === "f6669b7c-2104-4dcb-ba10-decd41fc130f",
        );
    },
    handleInput(event) {
      if (event.target.matches("#profile-form [name=show_on_wall]"))
        $("#profile-form").elements.wall_preference.value = String(
          event.target.checked,
        );
      if (
        event.target.matches(
          "#profile-form [name=make_private], #profile-form [name=show_on_wall], #profile-form [name=display_name], #profile-form [name=programme], #profile-form [name=study_year], #profile-form [name=bio]",
        )
      )
        toggleWallChoice();
      if (event.target.closest("#profile-form")) drafts.capture();
    },
    submit(form) {
      return saveForm(
        form,
        view,
        (values) => handleProfileSubmit(form, values),
        $(".form-error", form),
      );
    },
    async handleClick(event) {
      if (event.target.closest("[data-open-login]")) {
        login();
        return true;
      }
      if (event.target.closest("[data-close-login]")) {
        loginTarget = "";
        loginSaveCourseId = "";
        $("#login").close();
        return true;
      }
      if (event.target.closest("[data-auth-signout]")) {
        try {
          await auth.signOut();
          toast(t("signedOut"));
          location.hash = "/browse";
        } catch (error) {
          view.fail(error);
        }
        return true;
      }
      if (event.target.closest("[data-community-signin]")) {
        const fromModal = Boolean(event.target.closest("#login"));
        const target = fromModal
          ? loginTarget || "community" + (location.hash || "#/browse")
          : "community" + (location.hash || "#/browse");
        const saveCourseId = fromModal ? loginSaveCourseId : "";
        try {
          await auth.signInWithGoogle(target, { saveCourseId });
        } catch (error) {
          view.fail(error);
        }
        return true;
      }
      return false;
    },
    destroy() {
      cleanupWall?.();
      cleanupPhotoEditor?.();
      photos.dispose(photoDraft);
    },
  };
}
