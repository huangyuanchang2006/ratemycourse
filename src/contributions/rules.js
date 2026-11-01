import {
  providers,
  groups,
  contentLanguages,
  normalizeTerm,
} from "../catalog/index.js";
const text = (value) => String(value ?? "").trim();
const optional = (value) => text(value) || null;
const enabled = (value) => value === true || value === "on";
const reject = (code) => {
  throw Object.assign(new Error(code), { code });
};
const authored = (value) => String(value ?? "");
const authoredOptional = (value) =>
  authored(value).trim() ? authored(value) : null;

function syllabusUrls(value) {
  const lines = text(value).split(/\r?\n/).map(text).filter(Boolean);
  if (lines.length > 10) reject("invalidSyllabus");
  return [
    ...new Set(
      lines.map((line) => {
        let url;
        try {
          url = new URL(line);
        } catch (_) {
          reject("invalidSyllabus");
        }
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password
        )
          reject("invalidSyllabus");
        return url.href;
      }),
    ),
  ];
}

function reviewPayload(values, profile, userId, language, previous = null) {
  const isNew = values.course_mode === "new";
  const showName = enabled(values.show_name);
  const showAvatar = enabled(values.show_avatar);
  const showProfile = enabled(values.show_profile);
  const shareBackground = enabled(values.share_background);
  if (!userId) reject("loginRequired");
  if (!contentLanguages.includes(values.content_language))
    reject("invalidContentLanguage");
  if (showName && !text(profile?.display_name)) reject("ownProfile");
  if (showAvatar && !profile?.avatar_path) reject("profilePhoto");
  if (showProfile && !profile?.is_public) reject("publicProfileNeeded");
  const credits =
    isNew && text(values.suggested_course_credits)
      ? Number(values.suggested_course_credits)
      : null;
  if (
    credits !== null &&
    (!Number.isFinite(credits) ||
      credits < 0 ||
      credits > 999.9 ||
      Math.abs(credits * 10 - Math.round(credits * 10)) > 1e-8)
  )
    reject("invalidCredits");
  const urls = isNew ? syllabusUrls(values.suggested_course_syllabus_urls) : [];
  const payload = {
    course_id: isNew ? null : text(values.course_id),
    suggested_course_title: isNew ? text(values.suggested_course_title) : null,
    suggested_course_provider: isNew
      ? text(values.suggested_course_provider)
      : null,
    suggested_course_code: isNew
      ? optional(values.suggested_course_code)
      : null,
    suggested_course_credits: credits,
    suggested_course_language: isNew
      ? optional(values.suggested_course_language)
      : null,
    suggested_course_syllabus_url: urls[0] || null,
    suggested_course_syllabus_urls: urls,
    term:
      previous && values.term === previous.term
        ? previous.term
        : values.term === "other"
          ? text(values.term_other)
          : normalizeTerm(text(values.term)),
    teacher: optional(values.teacher),
    workload:
      values.workload && values.workload !== "unknown"
        ? Number(values.workload)
        : null,
    workload_unknown: values.workload === "unknown",
    group_work: optional(values.group_work),
    attendance: optional(values.attendance),
    take_again: optional(values.take_again),
    assessment: authoredOptional(values.assessment),
    fit: authoredOptional(values.fit),
    avoid: authoredOptional(values.avoid),
    experience: authored(values.experience),
    notes: authoredOptional(values.notes),
    content_language: values.content_language,
    reviewer_programme: shareBackground
      ? (previous?.reviewer_programme ?? null)
      : null,
    reviewer_year: shareBackground ? (previous?.reviewer_year ?? null) : null,
    reviewer_prior_knowledge: shareBackground
      ? authoredOptional(values.reviewer_prior_knowledge)
      : null,
    reviewer_selection_goal: shareBackground
      ? authoredOptional(values.reviewer_selection_goal)
      : null,
    share_background: shareBackground,
    show_name: showName,
    show_avatar: showAvatar,
    public_display_name: showName ? text(profile.display_name) : null,
    public_avatar_path: showAvatar ? profile.avatar_path : null,
    public_avatar_crop: showAvatar ? profile.photo_crops?.avatar || null : null,
    public_profile_id: showProfile ? userId : null,
  };
  if (
    (!isNew && !payload.course_id) ||
    (isNew &&
      (!payload.suggested_course_title ||
        !providers.includes(payload.suggested_course_provider))) ||
    !payload.term ||
    !payload.experience.trim() ||
    (payload.workload !== null &&
      (!Number.isInteger(payload.workload) ||
        payload.workload < 1 ||
        payload.workload > 5)) ||
    (payload.group_work !== null &&
      ![...groups, "unknown"].includes(payload.group_work)) ||
    (payload.attendance !== null &&
      !["required", "not_required", "conditional", "unknown"].includes(
        payload.attendance,
      )) ||
    (payload.take_again !== null &&
      !["yes", "no", "unsure"].includes(payload.take_again))
  )
    reject("required");
  return payload;
}

export { reviewPayload, syllabusUrls };
