import { profilePolicy } from "./policy.js";

const UUID_RE = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;
const PENDING_SAVE_KEY = "rmc-pending-save";
const SAVE_FLASH_KEY = "rmc-save-flash";
const PENDING_SAVE_TTL_MS = 30 * 60 * 1000;

function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  try {
    if (value == null) storage?.removeItem(key);
    else storage?.setItem(key, JSON.stringify(value));
  } catch {}
}

export function createAuth(client) {
  let session = null;
  let initialized = false;
  let redirecting = false;
  const returnKey = "sils-odyssey-auth-return";
  const siteRoot = new URL(".", window.location.href);

  function announce(nextSession) {
    session = nextSession || null;
    initialized = true;
    window.dispatchEvent(new CustomEvent("sils:auth", { detail: { session } }));
    if (!session) profileCheck = null;
  }

  function storePendingSave(courseId) {
    if (courseId && UUID_RE.test(courseId)) {
      writeJson(window.localStorage, PENDING_SAVE_KEY, {
        courseId,
        createdAt: Date.now(),
      });
    } else {
      writeJson(window.localStorage, PENDING_SAVE_KEY, null);
    }
  }

  function readPendingSave() {
    const item = readJson(window.localStorage, PENDING_SAVE_KEY);
    if (!item || !UUID_RE.test(item.courseId || "")) {
      writeJson(window.localStorage, PENDING_SAVE_KEY, null);
      return null;
    }
    if (
      typeof item.createdAt !== "number" ||
      Date.now() - item.createdAt > PENDING_SAVE_TTL_MS
    ) {
      writeJson(window.localStorage, PENDING_SAVE_KEY, null);
      return null;
    }
    return item;
  }

  function consumeSaveFlash() {
    if (redirecting) return null;
    const flash = readJson(window.sessionStorage, SAVE_FLASH_KEY);
    writeJson(window.sessionStorage, SAVE_FLASH_KEY, null);
    return flash;
  }

  async function flushPendingSave(userId) {
    const pending = readPendingSave();
    if (!pending) return null;
    try {
      const { data, error } = await client.rpc("save_course", {
        p_course_id: pending.courseId,
      });
      if (session?.user?.id !== userId) return null;
      if (error) {
        if (error.code === "22023" || error.code === "42501")
          writeJson(window.localStorage, PENDING_SAVE_KEY, null);
        const failFlash = {
          courseId: pending.courseId,
          saved: false,
          error: error.message || "Could not save course",
        };
        writeJson(window.sessionStorage, SAVE_FLASH_KEY, failFlash);
        return failFlash;
      }
      writeJson(window.localStorage, PENDING_SAVE_KEY, null);
      const okFlash = {
        courseId: data?.course_id || pending.courseId,
        saved: true,
        alreadySaved: Boolean(data?.already_saved),
      };
      writeJson(window.sessionStorage, SAVE_FLASH_KEY, okFlash);
      return okFlash;
    } catch (error) {
      if (session?.user?.id !== userId) return null;
      const failFlash = {
        courseId: pending.courseId,
        saved: false,
        error: error?.message || "Could not save course",
      };
      writeJson(window.sessionStorage, SAVE_FLASH_KEY, failFlash);
      return failFlash;
    }
  }

  function announceSaveFlash(flash) {
    if (!flash) return;
    window.dispatchEvent(new CustomEvent("rmc:saved-change", { detail: flash }));
  }

  let profileCheck = null;
  function ensureProfile(nextSession) {
    const userId = nextSession?.user?.id;
    if (!userId) return Promise.resolve();
    if (profileCheck?.id === userId) return profileCheck.promise;
    const check = { id: userId };
    let saveFlash = null;
    check.promise = Promise.resolve()
      .then(async () => {
        // Persist any pre-OAuth course save intent immediately once authenticated,
        // before profile onboarding redirect so the save is never lost.
        saveFlash = await flushPendingSave(userId);
        if (session?.user?.id !== userId || profileCheck !== check) return;

        const { data, error } = await client
          .from("reviewer_profiles")
          .select("display_name,bio,programme,study_year,avatar_path")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;
        if (session?.user?.id !== userId || profileCheck !== check) return;
        let returnTarget = "";
        try {
          returnTarget = window.localStorage.getItem(returnKey) || "";
        } catch (_) {}
        let destination = window.location.href;
        if (returnTarget.startsWith("community#")) {
          destination = new URL(
            `./${returnTarget.slice("community".length)}`,
            siteRoot,
          ).href;
        } else if (returnTarget === "analytics")
          destination = new URL("analytics.html", siteRoot).href;
        else if (returnTarget === "index")
          destination = new URL("./#/browse", siteRoot).href;
        const policy = profilePolicy;
        if (!policy.readingComplete(data)) {
          // Reopening onboarding must not nest return URLs or discard its original target.
          if (
            !returnTarget &&
            window.location.pathname === siteRoot.pathname &&
            window.location.hash.startsWith("#/profile?onboarding=")
          ) {
            announceSaveFlash(saveFlash);
            return;
          }
          const target = policy.destination(destination, siteRoot);
          destination = new URL(
            `./#/profile?onboarding=reading&return=${encodeURIComponent(target)}`,
            siteRoot,
          ).href;
        }
        try {
          if (returnTarget) window.localStorage.removeItem(returnKey);
        } catch (_) {}
        if (destination !== window.location.href) {
          // Leave SAVE_FLASH_KEY intact in sessionStorage for the destination page to consume once.
          redirecting = true;
          window.location.replace(destination);
        } else {
          announceSaveFlash(saveFlash);
        }
      })
      .catch((error) => {
        // Keep login intent for retry; never infer a complete profile on a read failure.
        if (profileCheck === check) {
          announceSaveFlash(saveFlash);
          window.dispatchEvent(
            new CustomEvent("sils:auth-error", { detail: { error } }),
          );
        }
      });
    profileCheck = check;
    return check.promise;
  }

  const ready = client.auth
    .getSession()
    .then(async ({ data, error }) => {
      if (error) throw error;
      announce(data.session);
      await ensureProfile(data.session);
      return data.session || null;
    })
    .catch((error) => {
      window.dispatchEvent(
        new CustomEvent("sils:auth-error", { detail: { error } }),
      );
      return null;
    });

  client.auth.onAuthStateChange((_event, nextSession) => {
    announce(nextSession);
    // Supabase auth callbacks must return before querying with the same client.
    window.setTimeout(() => {
      if (session?.user?.id === nextSession?.user?.id)
        void ensureProfile(nextSession);
    }, 0);
  });

  async function signInWithGoogle(
    returnTarget = "",
    { saveCourseId = "" } = {},
  ) {
    try {
      if (returnTarget) window.localStorage.setItem(returnKey, returnTarget);
      else window.localStorage.removeItem(returnKey);
    } catch (_) {}
    storePendingSave(saveCourseId);
    // Preserve the GitHub Pages project path instead of falling back to the
    // domain root. Supabase validates this against the configured Site URL.
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: siteRoot.href },
    });
    if (error) {
      try {
        window.localStorage.removeItem(returnKey);
      } catch (_) {}
      writeJson(window.localStorage, PENDING_SAVE_KEY, null);
      throw error;
    }
  }

  async function signOut() {
    writeJson(window.localStorage, PENDING_SAVE_KEY, null);
    writeJson(window.sessionStorage, SAVE_FLASH_KEY, null);
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  return {
    client,
    ready,
    get session() {
      return session;
    },
    get initialized() {
      return initialized;
    },
    signInWithGoogle,
    signOut,
    consumeSaveFlash,
  };
}
