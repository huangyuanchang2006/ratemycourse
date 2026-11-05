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

  const BUCKET = "reviewer-avatars",
    MAX_PHOTO_SIZE = 5 * 1024 * 1024;
  let session = auth.session || null,
    profile = null,
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

  async function getProfile() {
    if (!session?.user) {
      profile = null;
      return null;
    }
    const userId = session.user.id;
    const { data, error } = await db
      .from("reviewer_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (session?.user.id !== userId) return null;
    profile = data || null;
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

  function profileFormMarkup() {
    const visibility = profilePolicy.defaults(profile);
    const onboarding = route().params.has("onboarding");
    const zh = view.language === "zh";
    return `<div class="page-heading profile-heading"><div><p class="eyebrow">${zh ? "属于你的空间" : "YOUR SPACE"}</p><h1>${zh ? (onboarding ? "让大家认识你的视角。" : "你的个人名片。") : onboarding ? "A little about you." : "Your profile. Your perspective."}</h1><p class="subtext">${zh ? "用你喜欢的方式介绍自己，并选择资料的公开范围。" : "Introduce yourself in your own way. You choose what becomes public."}</p></div><a class="btn btn-outline-secondary" href="./#/browse">${zh ? "返回课程" : "Back to courses"} ↗</a></div>
      <div class="detail-layout profile-editor-layout"><section class="form-shell"><form id="profile-form" class="profile-form">
        <section class="profile-basics card" aria-labelledby="profile-basics-title"><div class="card-header"><span class="section-number" aria-hidden="true">01</span><div><h2 class="card-title" id="profile-basics-title">${zh ? "基本资料" : "The essentials"}</h2><p class="hint">${zh ? "昵称、自我介绍、学部／项目和年级为必填。" : "Your nickname, introduction, programme, and year are required."}</p></div></div><div class="card-body">
        <div class="field"><label for="profile-name">${escapeHtml(t("displayName"))} *</label><input class="form-control" id="profile-name" name="display_name" type="text" required maxlength="60" value="${escapeHtml(profile?.display_name || "")}" placeholder="${view.language === "zh" ? "填写你希望使用的昵称，无需真实姓名" : "Choose a nickname; your real name is not required"}"></div>
        <div class="field"><label for="profile-bio">${escapeHtml(t("bio"))} *</label><textarea class="form-control" id="profile-bio" name="bio" required maxlength="500">${escapeHtml(profile?.bio || "")}</textarea></div>
        <div class="field-grid"><div class="field"><label for="profile-programme">${escapeHtml(t("programme"))} *</label><input class="form-control" id="profile-programme" name="programme" required maxlength="100" value="${escapeHtml(profile?.programme || "")}" placeholder="${view.language === "zh" ? "例如：SILS／商学部／CJL" : "e.g. SILS / School of Commerce / CJL"}"></div><div class="field"><label for="profile-year">${escapeHtml(t("profileStudyStage"))} *</label><input class="form-control" id="profile-year" name="study_year" required maxlength="60" value="${escapeHtml(profile?.study_year || "")}" placeholder="${view.language === "zh" ? "例如：大二／2026年春入学" : "e.g. Year 2 / Spring 2026 entry"}"></div></div>
        <p class="hint">${view.language === "zh" ? "以上是当前个人资料；每条评价的实际修课年级及背景单独填写。" : "These are your current details. Enter the year and background for each course separately in its review."}</p>
        </div></section>
        <section class="profile-photo-card card" aria-labelledby="profile-photo-title"><div class="card-header"><span class="section-number" aria-hidden="true">02</span><div><h2 class="card-title" id="profile-photo-title">${zh ? "选择一张照片" : "Put a face to your perspective"}</h2><p class="hint">${zh ? "照片为必填，也可以使用插画或风景图。" : "A photo is required. An illustration or landscape is welcome, too."}</p></div></div><div class="card-body">${photos.markup(view.language)}</div></section>
        <section class="profile-extra card"><div class="card-body">
        <details class="profile-background"><summary>${view.language === "zh" ? "补充背景（可选）" : "Additional background (optional)"}</summary><p class="hint">${view.language === "zh" ? "填写后也会按下方的名片公开设置展示。" : "If supplied, these details follow your profile visibility setting below."}</p><div class="field-grid"><div class="field"><label for="profile-prior">${escapeHtml(t("priorKnowledge"))}</label><textarea class="form-control" id="profile-prior" name="prior_knowledge" maxlength="500">${escapeHtml(profile?.prior_knowledge || "")}</textarea></div><div class="field"><label for="profile-goal">${escapeHtml(t("selectionGoal"))}</label><textarea class="form-control" id="profile-goal" name="selection_goal" maxlength="500">${escapeHtml(profile?.selection_goal || "")}</textarea></div></div></details>
        </div></section>
        <section class="profile-visibility card" aria-labelledby="profile-visibility-title"><h2 id="profile-visibility-title">${view.language === "zh" ? "保存后的公开范围" : "Visibility after saving"}</h2>
        <label class="check"><input type="checkbox" name="make_private" ${visibility.is_public ? "" : "checked"}><span><strong>${view.language === "zh" ? "不公开我的个人名片" : "Keep my profile card private"}</strong><small>${view.language === "zh" ? "勾选后，名片资料和照片仅本人及网站管理员可查看，也不展示在首页名片墙。" : "When checked, only you and the site administrator can view your profile details and photo. Your card stays off the homepage wall."}</small></span></label>
        <input type="hidden" name="wall_preference" value="${visibility.show_on_wall || !visibility.is_public ? "true" : "false"}">
        <input type="checkbox" name="is_public" hidden ${visibility.is_public ? "checked" : ""}>
        <label class="check" ${profile ? "" : "hidden"}><input type="checkbox" name="show_on_wall" data-preferred="${visibility.show_on_wall}" ${visibility.show_on_wall ? "checked" : ""} ${visibility.is_public ? "" : "disabled"}><span>${view.language === "zh" ? "在首页名片墙展示（保留你已有的选择）" : "Show on the homepage wall (your existing choice)"}</span></label>
        <p id="profile-visibility-status" class="notice" role="status"></p><p class="hint">${view.language === "zh" ? "无论是否公开，网站管理员都可查看你已保存的资料和照片。每条课程评价仍可单独选择匿名。" : "The site administrator can view your saved details and photo whether your card is public or private. Each course review can still be anonymous."}</p></section>
        <p class="form-error error" role="alert" tabindex="-1" hidden></p><div class="form-actions"><a class="text-link" href="./#/browse">${view.language === "zh" ? "先浏览课程" : "Browse courses for now"}</a><button class="button btn btn-outline-primary" type="button" data-photo-action="preview">${view.language === "zh" ? "预览公开效果" : "Preview public appearance"}</button><button class="button btn btn-primary" type="submit">${escapeHtml(t("save"))}</button></div>
      </form></section><aside class="profile-preview-aside"><div class="preview-intro"><p class="eyebrow">${zh ? "你的名片" : "YOUR CALLING CARD"}</p><h2>${zh ? "看看你的公开形象。" : "See how you’ll appear."}</h2><p>${zh ? "预览会跟随输入更新。保存前，请检查公开范围。" : "The preview follows your edits. Check your visibility choices before saving."}</p></div>${photos.previewMarkup(view.language)}</aside></div>`;
  }

  async function renderProfile(version) {
    if (!session) {
      gated(t("profile"), t("loginRequired"));
      return;
    }
    await getProfile();
    const source = await signedAvatar(profile?.avatar_path);
    if (version !== view.version) return;
    if (!photoDraft) photoDraft = photos.create(profile, source);
    else photoDraft.source = source;
    main.innerHTML = profileFormMarkup();
    const preview = main.querySelector("#live-preview");
    if (preview) preview.open = window.matchMedia("(min-width: 1001px)").matches;
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
    if (!form) return;
    const isPublic = !form.elements.make_private.checked;
    form.elements.is_public.checked = isPublic;
    const wall = form.elements.show_on_wall;
    wall.checked = isPublic && form.elements.wall_preference.value === "true";
    wall.disabled = !isPublic;
    $("#profile-visibility-status", form).textContent =
      view.language === "zh"
        ? isPublic
          ? `保存后，名片资料和照片对所有访客公开${wall.checked ? "，并展示在首页名片墙" : "，不展示在首页名片墙"}。`
          : "保存后，名片资料和照片仅本人及网站管理员可查看。"
        : isPublic
          ? `After saving, all visitors can view your profile details and photo${wall.checked ? ", including on the homepage wall" : "; your card stays off the homepage wall"}.`
          : "After saving, only you and the site administrator can view your profile details and photo.";
  }

  async function handleProfileSubmit(form, values = new FormData(form)) {
    const userId = session?.user.id;
    if (!userId)
      throw Object.assign(new Error(t("loginRequired")), {
        code: "loginRequired",
      });
    const requiredProfile = Object.fromEntries(values);
    requiredProfile.avatar_path = photoDraft?.removed
      ? ""
      : selectedPhoto
        ? "selected"
        : profile?.avatar_path;
    if (!profilePolicy.complete(requiredProfile)) {
      const labels = {
        display_name: t("displayName"),
        bio: t("bio"),
        programme: t("programme"),
        study_year: t("profileStudyStage"),
        avatar_path: t("avatar"),
      };
      throw new Error(
        (view.language === "zh" ? "请补齐：" : "Please complete: ") +
          profilePolicy
            .missing(requiredProfile)
            .map((key) => labels[key])
            .join(view.language === "zh" ? "、" : ", "),
      );
    }
    if (
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
      show_on_wall: values.has("is_public") && values.has("show_on_wall"),
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
    avatarUrlCache.clear();
    wallLoadedAt = 0;
    drafts.clear();
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
    avatarUrlCache.clear();
    if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
    localPhotoUrl = "";
    view.onAccountChange?.();
    if (started) setTimeout(view.requestRender, 0);
  };
  window.addEventListener("sils:auth", onAuth, { signal: view.signal });
  const ready = Promise.resolve(auth.ready).then((value) => {
    session = value || null;
    started = true;
    return value;
  });
  function login(target = "") {
    loginTarget = target;
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
      if (photoDraft)
        cleanupPhotoEditor = photos.mount(
          main,
          photoDraft,
          view.language,
          () => {
            selectedPhoto = photoDraft.file;
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
          "#profile-form [name=make_private], #profile-form [name=show_on_wall]",
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
        try {
          await auth.signInWithGoogle(
            loginTarget || "community" + (location.hash || "#/browse"),
          );
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
