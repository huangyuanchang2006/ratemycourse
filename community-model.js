(function (root, factory) {
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  else root.SILS_COMMUNITY_MODEL = model;
})(typeof window === "object" ? window : globalThis, function () {
  "use strict";

  const providers = ["SILS", "PSE", "JCulP", "CJL"];
  const groups = ["none", "some", "heavy", "mixed"];
  const contentLanguages = ["zh", "en", "ja", "mixed", "other"];
  const terms = [
    { value: "Spring 2026", zh: "2026 年春季", en: "Spring 2026" },
    { value: "Fall 2026", zh: "2026 年秋季", en: "Fall 2026" },
    { value: "Fall 2025", zh: "2025 年秋季", en: "Fall 2025" }
  ];
  const text = (value) => String(value ?? "").trim();
  const optional = (value) => text(value) || null;
  const enabled = (value) => value === true || value === "on";
  const reject = (code) => { throw Object.assign(new Error(code), { code }); };
  const normalizeTerm = (value) => terms.find((term) => [term.value, term.zh, term.en].includes(value))?.value || value || "";
  const termLabel = (value, language) => terms.find((term) => term.value === normalizeTerm(value))?.[language] || value || "";

  function syllabusUrls(value) {
    const lines = text(value).split(/\r?\n/).map(text).filter(Boolean);
    if (lines.length > 10) reject("invalidSyllabus");
    return [...new Set(lines.map((line) => {
      let url;
      try { url = new URL(line); } catch (_) { reject("invalidSyllabus"); }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) reject("invalidSyllabus");
      return url.href;
    }))];
  }

  function reviewPayload(values, profile, userId, language) {
    const isNew = values.course_mode === "new";
    const showName = enabled(values.show_name);
    const showAvatar = enabled(values.show_avatar);
    const showProfile = enabled(values.show_profile);
    const shareBackground = enabled(values.share_background);
    if (!userId) reject("loginRequired");
    if (!contentLanguages.includes(values.content_language)) reject("invalidContentLanguage");
    if (showName && !text(profile?.display_name)) reject("ownProfile");
    if (showAvatar && !profile?.avatar_path) reject("profilePhoto");
    if (showProfile && !profile?.is_public) reject("publicProfileNeeded");
    const credits = isNew && text(values.suggested_course_credits) ? Number(values.suggested_course_credits) : null;
    if (credits !== null && (!Number.isFinite(credits) || credits < 0 || credits > 999.9 || Math.abs(credits * 10 - Math.round(credits * 10)) > 1e-8)) reject("invalidCredits");
    const urls = isNew ? syllabusUrls(values.suggested_course_syllabus_urls) : [];
    const payload = {
      course_id: isNew ? null : text(values.course_id),
      suggested_course_title: isNew ? text(values.suggested_course_title) : null,
      suggested_course_provider: isNew ? text(values.suggested_course_provider) : null,
      suggested_course_code: isNew ? optional(values.suggested_course_code) : null,
      suggested_course_credits: credits,
      suggested_course_language: isNew ? optional(values.suggested_course_language) : null,
      suggested_course_syllabus_url: urls[0] || null,
      suggested_course_syllabus_urls: urls,
      term: values.term === "other" ? text(values.term_other) : normalizeTerm(text(values.term)),
      teacher: optional(values.teacher),
      workload: Number(values.workload),
      group_work: text(values.group_work),
      assessment: optional(values.assessment),
      fit: optional(values.fit),
      avoid: optional(values.avoid),
      experience: text(values.experience),
      notes: optional(values.notes),
      content_language: values.content_language,
      reviewer_programme: shareBackground ? optional(values.reviewer_programme) : null,
      reviewer_year: shareBackground ? optional(values.reviewer_year) : null,
      reviewer_prior_knowledge: shareBackground ? optional(values.reviewer_prior_knowledge) : null,
      reviewer_selection_goal: shareBackground ? optional(values.reviewer_selection_goal) : null,
      share_background: shareBackground,
      show_name: showName,
      show_avatar: showAvatar,
      public_display_name: showName ? text(profile.display_name) : null,
      public_avatar_path: showAvatar ? profile.avatar_path : null,
      public_profile_id: showProfile ? userId : null
    };
    if ((!isNew && !payload.course_id) || (isNew && (!payload.suggested_course_title || !providers.includes(payload.suggested_course_provider))) || !payload.term || !payload.experience || !Number.isInteger(payload.workload) || payload.workload < 1 || payload.workload > 5 || !groups.includes(payload.group_work)) reject("required");
    return payload;
  }

  function filterCatalog(courses, reviews, filters) {
    const searchableText = value => text(value).normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu, "");
    const includes = (value, needle) => searchableText(value).includes(searchableText(needle));
    const authorIds = Array.isArray(filters.authorReviewIds) ? new Set(filters.authorReviewIds) : null;
    const hasReviewFilters = Boolean(filters.workload || filters.group || text(filters.fit) || text(filters.avoid) || filters.author || authorIds);
    return courses.flatMap((course) => {
      if ((filters.provider && course.provider !== filters.provider) || (filters.language && course.language !== filters.language)) return [];
      const all = reviews.filter((review) => review.course_id === course.id);
      const matching = all.filter((review) =>
        (authorIds ? authorIds.has(review.id) : !filters.author || review.public_display_name === filters.author) &&
        (!filters.workload || (filters.workload === "light" ? review.workload <= 2 : filters.workload === "heavy" ? review.workload >= 4 : Number(review.workload) === Number(filters.workload))) &&
        (!filters.group || review.group_work === filters.group) && includes(review.fit, filters.fit) && includes(review.avoid, filters.avoid)
      );
      if (hasReviewFilters && !matching.length) return [];
      const searchable = hasReviewFilters ? matching : all;
      const courseText = `${course.title} ${course.course_code || ""} ${course.provider || ""}`;
      if (text(filters.query) && !includes(courseText, filters.query) && !searchable.some((review) => includes([review.teacher, review.experience, review.assessment, review.fit, review.avoid, review.notes].join(" "), filters.query))) return [];
      return [{ course, reviews: matching, totalReviews: all.length, hasReviewFilters }];
    });
  }

  return { providers, groups, contentLanguages, terms, normalizeTerm, termLabel, reviewPayload, filterCatalog, syllabusUrls };
});
