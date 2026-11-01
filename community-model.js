(function (root, factory) {
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  else root.SILS_COMMUNITY_MODEL = model;
})(typeof window === "object" ? window : globalThis, function () {
  "use strict";

  // Waseda official undergraduate listing, checked 2026-10-24.
  // IDs are application keys; retain PSE / JCulP / SILS / CJL for historical data.
  const providerCatalog = [
    {
      "id": "PSE",
      "zh": "政治经济学部",
      "ja": "政治経済学部",
      "en": "School of Political Science and Economics",
      "url": "https://www.waseda.jp/fpse/pse/",
      "kind": "school"
    },
    {
      "id": "LAW",
      "zh": "法学部",
      "ja": "法学部",
      "en": "School of Law",
      "url": "https://www.waseda.jp/folaw/law/",
      "kind": "school"
    },
    {
      "id": "CMS",
      "zh": "文化构想学部",
      "ja": "文化構想学部",
      "en": "School of Culture, Media and Society",
      "url": "https://www.waseda.jp/flas/cms/",
      "kind": "school"
    },
    {
      "id": "HSS",
      "zh": "文学部",
      "ja": "文学部",
      "en": "School of Humanities and Social Sciences",
      "url": "https://www.waseda.jp/flas/hss/",
      "kind": "school"
    },
    {
      "id": "EDU",
      "zh": "教育学部",
      "ja": "教育学部",
      "en": "School of Education",
      "url": "https://www.waseda.jp/fedu/edu/",
      "kind": "school"
    },
    {
      "id": "COMM",
      "zh": "商学部",
      "ja": "商学部",
      "en": "School of Commerce",
      "url": "https://www.waseda.jp/fcom/soc/",
      "kind": "school"
    },
    {
      "id": "FSE",
      "zh": "基干理工学部",
      "ja": "基幹理工学部",
      "en": "School of Fundamental Science and Engineering",
      "url": "https://www.fse.sci.waseda.ac.jp/",
      "kind": "school"
    },
    {
      "id": "CSE",
      "zh": "创造理工学部",
      "ja": "創造理工学部",
      "en": "School of Creative Science and Engineering",
      "url": "https://souzou.w.waseda.jp/",
      "kind": "school"
    },
    {
      "id": "ASE",
      "zh": "先进理工学部",
      "ja": "先進理工学部",
      "en": "School of Advanced Science and Engineering",
      "url": "https://www.ase.sci.waseda.ac.jp/",
      "kind": "school"
    },
    {
      "id": "SSS",
      "zh": "社会科学部",
      "ja": "社会科学部",
      "en": "School of Social Sciences",
      "url": "https://www.waseda.jp/fsss/sss/",
      "kind": "school"
    },
    {
      "id": "HUM",
      "zh": "人间科学部",
      "ja": "人間科学部",
      "en": "School of Human Sciences",
      "url": "https://www.waseda.jp/fhum/hum/",
      "kind": "school"
    },
    {
      "id": "SPORT",
      "zh": "体育科学部",
      "ja": "スポーツ科学部",
      "en": "School of Sport Sciences",
      "url": "https://www.waseda.jp/fsps/sps/",
      "kind": "school"
    },
    {
      "id": "SILS",
      "zh": "国际教养学部",
      "ja": "国際教養学部",
      "en": "School of International Liberal Studies",
      "url": "https://www.waseda.jp/fire/sils/",
      "kind": "school"
    },
    {
      "id": "JCulP",
      "zh": "JCulP 日本文化研究项目（文化构想学部）",
      "ja": "国際日本文化論プログラム",
      "en": "JCulP · Global Studies in Japanese Cultures (CMS)",
      "url": "https://www.waseda.jp/flas/cms/en/applicants-2/admission/jculp/",
      "kind": "programme",
      "school": "CMS"
    },
    {
      "id": "CJL",
      "zh": "CJL 日语教育研究中心",
      "ja": "日本語教育研究センター",
      "en": "CJL · Center for Japanese Language",
      "url": "https://www.waseda.jp/inst/cjl/en/students/registration/",
      "kind": "centre"
    }
  ];
  const providers = providerCatalog.map(provider => provider.id);
  const providerInfo = value => providerCatalog.find(provider => provider.id === value);
  const providerLabel = (value, language = "en") => {
    const item = providerInfo(value);
    if (!item) return value || "";
    const name = item[language] || item.en;
    return name.startsWith(`${item.id} `) ? name : `${item.id} · ${name}`;
  };
  const providerMatches = (actual, selected) => actual === selected || providerInfo(actual)?.school === selected;
  const providerSearchText = value => {
    const item = providerInfo(value);
    const school = providerInfo(item?.school);
    return [value, item?.zh, item?.ja, item?.en, school?.zh, school?.ja, school?.en].filter(Boolean).join(" ");
  };
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
  const normalizeTerm = (value) => {
    if (["unknown", "Unknown"].includes(value)) return "Unknown";
    const match = /^(\d{4})-(spring|fall)$/i.exec(value || "");
    return match ? `${match[2].toLowerCase() === "spring" ? "Spring" : "Fall"} ${match[1]}` : terms.find((term) => [term.value, term.zh, term.en].includes(value))?.value || value || "";
  };
  const termLabel = (value, language) => {
    const normalized = normalizeTerm(value);
    if (normalized === "Unknown") return language === "zh" ? "修读学期不详" : "Term taken not known";
    const match = /^(Spring|Fall) (\d{4})$/.exec(normalized);
    return match ? (language === "zh" ? `${match[2]} 年${match[1] === "Spring" ? "春季" : "秋季"}` : normalized) : value || "";
  };
  const authored = (value) => String(value ?? "");
  const authoredOptional = (value) => authored(value).trim() ? authored(value) : null;

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

  function reviewPayload(values, profile, userId, language, previous = null) {
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
      term: previous && values.term === previous.term ? previous.term : values.term === "other" ? text(values.term_other) : normalizeTerm(text(values.term)),
      teacher: optional(values.teacher),
      workload: values.workload && values.workload !== "unknown" ? Number(values.workload) : null,
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
      reviewer_programme: shareBackground ? previous?.reviewer_programme ?? null : null,
      reviewer_year: shareBackground ? previous?.reviewer_year ?? null : null,
      reviewer_prior_knowledge: shareBackground ? authoredOptional(values.reviewer_prior_knowledge) : null,
      reviewer_selection_goal: shareBackground ? authoredOptional(values.reviewer_selection_goal) : null,
      share_background: shareBackground,
      show_name: showName,
      show_avatar: showAvatar,
      public_display_name: showName ? text(profile.display_name) : null,
      public_avatar_path: showAvatar ? profile.avatar_path : null,
      public_avatar_crop: showAvatar ? profile.photo_crops?.avatar || null : null,
      public_profile_id: showProfile ? userId : null
    };
    if ((!isNew && !payload.course_id) || (isNew && (!payload.suggested_course_title || !providers.includes(payload.suggested_course_provider))) || !payload.term || !payload.experience.trim() || (payload.workload !== null && (!Number.isInteger(payload.workload) || payload.workload < 1 || payload.workload > 5)) || (payload.group_work !== null && ![...groups, "unknown"].includes(payload.group_work)) || (payload.attendance !== null && !["required", "not_required", "conditional", "unknown"].includes(payload.attendance)) || (payload.take_again !== null && !["yes", "no", "unsure"].includes(payload.take_again))) reject("required");
    return payload;
  }

  function filterCatalog(courses, reviews, filters) {
    const searchableText = value => text(value).normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu, "");
    const includes = (value, needle) => searchableText(value).includes(searchableText(needle));
    const authorIds = Array.isArray(filters.authorReviewIds) ? new Set(filters.authorReviewIds) : null;
    const hasReviewFilters = Boolean(filters.workload || filters.group || text(filters.fit) || text(filters.avoid) || filters.author || authorIds);
    return courses.flatMap((course) => {
      if ((filters.provider && !providerMatches(course.provider, filters.provider)) || (filters.language && course.language !== filters.language)) return [];
      const all = reviews.filter((review) => review.course_id === course.id);
      const matching = all.filter((review) =>
        (authorIds ? authorIds.has(review.id) : !filters.author || review.public_display_name === filters.author) &&
        (!filters.workload || (filters.workload === "light" ? review.workload <= 2 : filters.workload === "heavy" ? review.workload >= 4 : Number(review.workload) === Number(filters.workload))) &&
        (!filters.group || review.group_work === filters.group) && includes(review.fit, filters.fit) && includes(review.avoid, filters.avoid)
      );
      if (hasReviewFilters && !matching.length) return [];
      const searchable = hasReviewFilters ? matching : all;
      const courseText = `${course.title} ${course.course_code || ""} ${providerSearchText(course.provider)}`;
      if (text(filters.query) && !includes(courseText, filters.query) && !searchable.some((review) => includes([review.teacher, review.experience, review.assessment, review.fit, review.avoid, review.notes].join(" "), filters.query))) return [];
      return [{ course, reviews: matching, totalReviews: all.length, hasReviewFilters }];
    });
  }

  return { providerCatalog, providerInfo, providerLabel, providerMatches, providers, groups, contentLanguages, terms, normalizeTerm, termLabel, reviewPayload, filterCatalog, syllabusUrls };
});
