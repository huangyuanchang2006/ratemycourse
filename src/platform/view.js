// Shared browser presentation primitives, configured by the site. No business queries.
export const $ = (selector, root = document) => root.querySelector(selector);
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};
export const link = (href, label, klass = "text-link") =>
  `<a class="${klass}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
export const button = (action, label, klass = "button") =>
  `<button class="${klass}" type="button" data-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`;
export function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (node.hidden = true), 3600);
}
export function gated(view, title, description) {
  view.main.innerHTML = `<section class="gated"><b class="brand-mark login-mark">r.</b><p class="eyebrow">GOOGLE SIGN-IN</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><button class="button" type="button" data-open-login>${escapeHtml(view.t("signIn"))}</button></section>`;
}
// Restore disabled controls even after failure; UI never implies a successful write.
export async function saveForm(
  form,
  view,
  run,
  errorNode,
  previewButton = null,
) {
  const submit = $("button[type=submit]", form),
    label = submit.textContent,
    previewLabel = previewButton?.textContent;
  const values = new FormData(form),
    controls = [...form.elements].map((control) => [control, control.disabled]);
  submit.textContent = view.language === "zh" ? "正在保存…" : "Saving…";
  if (previewButton) {
    previewButton.disabled = true;
    previewButton.textContent = submit.textContent;
  }
  if (errorNode) errorNode.hidden = true;
  controls.forEach(([control]) => (control.disabled = true));
  form.setAttribute("aria-busy", "true");
  try {
    await run(values);
  } catch (error) {
    const message =
      error.code === "40001"
        ? view.language === "zh"
          ? "这条投稿已更新，请刷新后再编辑。"
          : "This contribution has changed. Reload before editing."
        : view.t(error.code) || error.message || view.t("notReady");
    if (errorNode) {
      errorNode.textContent = message;
      errorNode.hidden = false;
      errorNode.focus();
    } else toast(message);
  } finally {
    controls.forEach(([control, disabled]) => (control.disabled = disabled));
    form.removeAttribute("aria-busy");
    submit.textContent = label;
    if (previewButton) {
      previewButton.disabled = false;
      previewButton.textContent = previewLabel;
    }
  }
}
