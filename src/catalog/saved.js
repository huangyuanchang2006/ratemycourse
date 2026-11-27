// Account-scoped saved courses state & RPC adapter (no DOM).
const UUID_RE = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;

export function createSavedCourses(client) {
  let userId = "";
  let items = [];
  let ids = new Set();
  let loaded = false;
  let loadRequest = 0;
  const inflight = new Map();

  function syncSet() {
    ids = new Set(items.map((item) => item.course_id));
  }

  function clearData() {
    items = [];
    ids = new Set();
    loaded = false;
    inflight.clear();
  }

  function reset() {
    loadRequest++;
    userId = "";
    clearData();
  }

  async function load(session, { force = false } = {}) {
    const nextUser = session?.user?.id || "";
    if (!nextUser) {
      reset();
      return items;
    }
    if (!force && loaded && userId === nextUser) return items;
    if (userId && userId !== nextUser) {
      clearData();
    }
    const req = ++loadRequest;
    userId = nextUser;
    const { data, error } = await client.rpc("my_saved_courses");
    if (error) throw error;
    if (req !== loadRequest || userId !== nextUser) return items;
    items = Array.isArray(data)
      ? data.filter((entry) => UUID_RE.test(entry?.course_id || ""))
      : [];
    syncSet();
    loaded = true;
    return items;
  }

  async function save(courseId) {
    if (!UUID_RE.test(courseId || "")) {
      throw new Error("Invalid course ID");
    }
    const existing = inflight.get(courseId);
    if (existing) return existing;
    const actor = userId;
    const task = (async () => {
      const { data, error } = await client.rpc("save_course", {
        p_course_id: courseId,
      });
      if (error) throw error;
      if (actor && userId !== actor) return data;
      const canonicalId = data?.course_id || courseId;
      const createdAt = data?.created_at || new Date().toISOString();
      if (!ids.has(canonicalId)) {
        items = [{ course_id: canonicalId, created_at: createdAt }, ...items];
        syncSet();
      }
      return {
        course_id: canonicalId,
        saved: true,
        already_saved: Boolean(data?.already_saved),
        created_at: createdAt,
      };
    })();
    inflight.set(courseId, task);
    try {
      return await task;
    } finally {
      if (inflight.get(courseId) === task) inflight.delete(courseId);
    }
  }

  async function unsave(courseId) {
    if (!UUID_RE.test(courseId || "")) {
      throw new Error("Invalid course ID");
    }
    const existing = inflight.get(courseId);
    if (existing) return existing;
    const actor = userId;
    const task = (async () => {
      const { data, error } = await client.rpc("unsave_course", {
        p_course_id: courseId,
      });
      if (error) throw error;
      if (actor && userId !== actor) return data;
      const canonicalId = data?.course_id || courseId;
      items = items.filter(
        (entry) => entry.course_id !== canonicalId && entry.course_id !== courseId,
      );
      syncSet();
      return {
        course_id: canonicalId,
        saved: false,
        removed: Boolean(data?.removed),
      };
    })();
    inflight.set(courseId, task);
    try {
      return await task;
    } finally {
      if (inflight.get(courseId) === task) inflight.delete(courseId);
    }
  }

  function toggle(courseId) {
    return ids.has(courseId) ? unsave(courseId) : save(courseId);
  }

  return {
    load,
    save,
    unsave,
    toggle,
    reset,
    has: (courseId) => ids.has(courseId),
    isBusy: (courseId) => inflight.has(courseId),
    get items() {
      return items;
    },
    get ids() {
      return ids;
    },
    get loaded() {
      return loaded;
    },
  };
}
