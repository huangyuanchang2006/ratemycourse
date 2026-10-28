(function () {
  "use strict";

  const config = window.SILS_SUPABASE_CONFIG;
  if (!window.supabase || !config?.url || !config?.publishableKey) {
    window.SILS_AUTH = { ready: Promise.resolve(null), client: null, error: new Error("Supabase client configuration is unavailable.") };
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });
  let session = null;
  let initialized = false;
  const returnKey = "sils-odyssey-auth-return";
  const siteRoot = new URL(".", window.location.href);

  function announce(nextSession) {
    session = nextSession || null;
    initialized = true;
    window.dispatchEvent(new CustomEvent("sils:auth", { detail: { session } }));
    if (!session) profileCheck = null;
  }

  let profileCheck = null;
  function ensureProfile(nextSession) {
    const userId = nextSession?.user?.id;
    if (!userId) return Promise.resolve();
    if (profileCheck?.id === userId) return profileCheck.promise;
    const check = { id: userId };
    check.promise = Promise.resolve().then(async () => {
      const { data, error } = await client.from("reviewer_profiles").select("display_name,bio,programme,study_year,avatar_path").eq("id", userId).maybeSingle();
      if (error) throw error;
      if (session?.user?.id !== userId || profileCheck !== check) return;
      let returnTarget = "";
      try { returnTarget = window.localStorage.getItem(returnKey) || ""; } catch (_) {}
      let destination = window.location.href;
      if (returnTarget.startsWith("community#")) {
        destination = new URL(`./${returnTarget.slice("community".length)}`, siteRoot).href;
      } else if (returnTarget === "analytics") destination = new URL("analytics.html", siteRoot).href;
      else if (returnTarget === "index") destination = new URL("./#/browse", siteRoot).href;
      const policy = window.SILS_PROFILE_POLICY;
      if (!policy.complete(data)) {
        // Reopening onboarding must not nest return URLs or discard its original target.
        if (!returnTarget && window.location.pathname === siteRoot.pathname && window.location.hash.startsWith("#/profile?onboarding=1")) return;
        const target = policy.destination(destination, siteRoot);
        destination = new URL(`./#/profile?onboarding=1&return=${encodeURIComponent(target)}`, siteRoot).href;
      }
      try { if (returnTarget) window.localStorage.removeItem(returnKey); } catch (_) {}
      if (destination !== window.location.href) window.location.replace(destination);
    }).catch(error => {
      // Keep login intent for retry; never infer a complete profile on a read failure.
      if (profileCheck === check) window.dispatchEvent(new CustomEvent("sils:auth-error", { detail: { error } }));
    });
    profileCheck = check;
    return check.promise;
  }

  const ready = client.auth.getSession().then(async ({ data, error }) => {
    if (error) throw error;
    announce(data.session);
    await ensureProfile(data.session);
    return data.session || null;
  }).catch((error) => {
    window.dispatchEvent(new CustomEvent("sils:auth-error", { detail: { error } }));
    return null;
  });

  client.auth.onAuthStateChange((_event, nextSession) => {
    announce(nextSession);
    // Supabase auth callbacks must return before querying with the same client.
    window.setTimeout(() => { if (session?.user?.id === nextSession?.user?.id) void ensureProfile(nextSession); }, 0);
  });

  async function signInWithGoogle(returnTarget = "") {
    try {
      if (returnTarget) window.localStorage.setItem(returnKey, returnTarget);
    } catch (_) {}
    // Preserve the GitHub Pages project path instead of falling back to the
    // domain root. Supabase validates this against the configured Site URL.
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: siteRoot.href }
    });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  window.SILS_AUTH = {
    client,
    ready,
    get session() { return session; },
    get initialized() { return initialized; },
    signInWithGoogle,
    signOut
  };
})();
