export function createCatalogStore(client, clock = Date.now) {
  const COURSE_FIELDS =
      "id,course_code,title,provider,credits,language,syllabus_url,syllabus_urls,created_at,canonical_course_id",
    PUBLIC_REVIEW_FIELDS =
      "id,course_id,suggested_course_title,suggested_course_provider,suggested_course_code,suggested_course_credits,suggested_course_language,suggested_course_syllabus_url,term,teacher,workload,workload_unknown,group_work,attendance,take_again,assessment,fit,avoid,experience,notes,content_language,created_at,share_background,reviewer_programme,reviewer_year,reviewer_prior_knowledge,reviewer_selection_goal,public_display_name,public_avatar_path,public_avatar_crop,public_profile_id,legacy_source_id,legacy_source_url,legacy_offered_term,translation_en";
  let courses = [],
    reviews = [],
    reviewCounts = {},
    aliases = new Map(),
    fullReviewsUnlocked = false,
    loadedMode = "",
    loadedAt = 0,
    inflight = null,
    inflightMode = "",
    generation = 0;

  async function fetchReviewCounts() {
    if (typeof client?.rpc !== "function") return {};
    const { data, error } = await client.rpc("get_course_review_counts");
    if (error) throw error;
    return data && typeof data === "object" ? data : {};
  }

  async function load({ canReadFull = true } = {}) {
    const mode = canReadFull ? "full" : "counts";
    if (loadedAt && loadedMode === mode && clock() - loadedAt < 60000) return;
    if (inflight && inflightMode === mode) return inflight;
    if (inflight && inflightMode !== mode) generation++;
    const version = generation;
    const request = (async () => {
      const result = await client
        .from("courses")
        .select(COURSE_FIELDS)
        .order("title");
      if (result.error) throw result.error;
      let nextReviews = [];
      let counts = {};
      let unlocked = false;
      if (canReadFull) {
        const response = await client
          .from("reviews")
          .select(
            "id,course_id,workload,workload_unknown,group_work,attendance,take_again,fit,avoid,experience,assessment,teacher,notes,term,content_language,public_display_name,public_profile_id,legacy_source_id,legacy_source_url,legacy_offered_term,translation_en",
          )
          .eq("status", "published")
          .not("course_id", "is", null);
        if (response.error) throw response.error;
        nextReviews = response.data || [];
        unlocked = true;
      } else {
        counts = await fetchReviewCounts();
      }
      if (version !== generation) return;
      const rows = result.data || [];
      aliases = new Map(
        rows
          .filter((c) => c.canonical_course_id)
          .map((c) => [c.id, c.canonical_course_id]),
      );
      courses = rows.filter((c) => !c.canonical_course_id);
      reviews = nextReviews.map((review) => ({
        ...review,
        course_id: aliases.get(review.course_id) || review.course_id,
      }));
      if (unlocked) {
        counts = {};
        for (const review of reviews) {
          counts[review.course_id] = (counts[review.course_id] || 0) + 1;
        }
      }
      reviewCounts = counts;
      fullReviewsUnlocked = unlocked;
      loadedMode = mode;
      loadedAt = clock() || 1;
    })();
    inflight = request;
    inflightMode = mode;
    try {
      await request;
    } finally {
      if (inflight === request) {
        inflight = null;
        inflightMode = "";
      }
    }
  }

  const canonical = (id) => aliases.get(id) || id;

  function aliasIdsFor(canonicalId) {
    const list = [canonicalId];
    for (const [aliasId, target] of aliases.entries()) {
      if (target === canonicalId) list.push(aliasId);
    }
    return list;
  }

  function reviewCount(courseId) {
    const id = canonical(courseId);
    if (fullReviewsUnlocked) {
      return reviews.filter((review) => canonical(review.course_id) === id)
        .length;
    }
    return Number(reviewCounts[id] || 0);
  }

  return {
    load,
    invalidate() {
      generation++;
      loadedAt = 0;
      loadedMode = "";
      inflight = null;
      inflightMode = "";
      fullReviewsUnlocked = false;
      reviews = [];
    },
    canonical,
    reviewCount,
    get loaded() {
      return !!loadedAt;
    },
    get fullReviewsUnlocked() {
      return fullReviewsUnlocked;
    },
    get courses() {
      return courses;
    },
    get reviews() {
      return reviews;
    },
    get reviewCounts() {
      return reviewCounts;
    },
    async detail(id, { canReadFull = true } = {}) {
      id = canonical(id);
      const cached = courses.find((c) => c.id === id);
      const result = cached
        ? { data: cached }
        : await client
            .from("courses")
            .select(COURSE_FIELDS)
            .eq("id", id)
            .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return null;
      const resolvedCourse = result.data.canonical_course_id
        ? (
            await client
              .from("courses")
              .select(COURSE_FIELDS)
              .eq("id", result.data.canonical_course_id)
              .maybeSingle()
          ).data || result.data
        : result.data;
      const targetId = resolvedCourse.id;
      if (!canReadFull) {
        if (!loadedAt) {
          try {
            reviewCounts = await fetchReviewCounts();
          } catch {}
        }
        return {
          course: resolvedCourse,
          reviews: [],
          reviewCount: Number(reviewCounts[targetId] || 0),
          fullReviewsUnlocked: false,
        };
      }
      const courseIds = aliasIdsFor(targetId);
      const query = client
        .from("reviews")
        .select(PUBLIC_REVIEW_FIELDS)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      const response =
        courseIds.length > 1
          ? await query.in("course_id", courseIds)
          : await query.eq("course_id", targetId);
      if (response.error) throw response.error;
      const rows = response.data || [];
      return {
        course: resolvedCourse,
        reviews: rows,
        reviewCount: rows.length,
        fullReviewsUnlocked: true,
      };
    },
  };
}
