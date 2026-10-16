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
    if (!session) return;
    let returnTarget = "";
    try {
      returnTarget = window.localStorage.getItem(returnKey) || "";
      if (returnTarget) window.localStorage.removeItem(returnKey);
    } catch (_) {}
    if (returnTarget.startsWith("community#")) {
      const hash = returnTarget.slice("community".length);
      const destination = new URL("community.html", siteRoot);
      destination.hash = hash.replace(/^#/, "");
      if (window.location.pathname !== destination.pathname || window.location.hash !== destination.hash) {
        window.location.replace(destination.href);
      }
    }
  }

  const ready = client.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    announce(data.session);
    return data.session || null;
  }).catch((error) => {
    window.dispatchEvent(new CustomEvent("sils:auth-error", { detail: { error } }));
    return null;
  });

  client.auth.onAuthStateChange((_event, nextSession) => announce(nextSession));

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
