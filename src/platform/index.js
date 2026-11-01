import { config } from "./config.js";
import { metricsCore } from "./metrics.js";
let connection;
let metrics;
export function getMetrics() {
  return (metrics ||= metricsCore.create(window, config));
}
export function getPlatform() {
  return (connection ||= (async () => {
    if (!window.supabase)
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Supabase could not load."));
        document.head.append(script);
      });
    const client = window.supabase.createClient(
      config.url,
      config.publishableKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      },
    );
    return { client, metrics: getMetrics() };
  })());
}

export {
  $,
  escapeHtml,
  safeUrl,
  link,
  button,
  toast,
  gated,
  saveForm,
} from "./view.js";
export { createDrafts } from "./drafts.js";
