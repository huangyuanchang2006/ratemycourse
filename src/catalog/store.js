export function createCatalogStore(client, clock = Date.now) {
  const COURSE_FIELDS =
      "id,course_code,title,provider,credits,language,syllabus_url,syllabus_urls,created_at,canonical_course_id",
    PUBLIC_REVIEW_FIELDS =
      "id,course_id,suggested_course_title,suggested_course_provider,suggested_course_code,suggested_course_credits,suggested_course_language,suggested_course_syllabus_url,term,teacher,workload,workload_unknown,group_work,attendance,take_again,assessment,fit,avoid,experience,notes,content_language,created_at,share_background,reviewer_programme,reviewer_year,reviewer_prior_knowledge,reviewer_selection_goal,public_display_name,public_avatar_path,public_avatar_crop,public_profile_id,legacy_source_id,legacy_source_url,legacy_offered_term,translation_en";
  let courses = [],
    reviews = [],
    aliases = new Map(),
    loadedAt = 0,
    inflight = null,
    generation = 0;
  async function load() {
    if (loadedAt && clock() - loadedAt < 60000) return;
    if (inflight) return inflight;
    const version = generation;
    const request = (async () => {
      const result = await client
        .from("courses")
        .select(COURSE_FIELDS)
        .order("title");
      if (result.error) throw result.error;
      const response = await client
        .from("reviews")
        .select(
          "id,course_id,workload,workload_unknown,group_work,attendance,take_again,fit,avoid,experience,assessment,teacher,notes,term,content_language,public_display_name,public_profile_id,legacy_source_id,legacy_source_url,legacy_offered_term,translation_en",
        )
        .eq("status", "published")
        .not("course_id", "is", null);
      if (response.error) throw response.error;
      if (version !== generation) return;
      const rows = result.data || [];
      aliases = new Map(
        rows
          .filter((c) => c.canonical_course_id)
          .map((c) => [c.id, c.canonical_course_id]),
      );
      courses = rows.filter((c) => !c.canonical_course_id);
      reviews = response.data || [];
      loadedAt = clock() || 1;
    })();
    inflight = request;
    try {
      await request;
    } finally {
      if (inflight === request) inflight = null;
    }
  }
  const canonical = (id) => aliases.get(id) || id;
  return {
    load,
    invalidate() {
      generation++;
      loadedAt = 0;
      inflight = null;
    },
    canonical,
    get loaded() {
      return !!loadedAt;
    },
    get courses() {
      return courses;
    },
    get reviews() {
      return reviews;
    },
    async detail(id) {
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
      const response = await client
        .from("reviews")
        .select(PUBLIC_REVIEW_FIELDS)
        .eq("course_id", id)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (response.error) throw response.error;
      return { course: result.data, reviews: response.data || [] };
    },
  };
}
