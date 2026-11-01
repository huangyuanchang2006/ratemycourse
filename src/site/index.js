const version = "20261101-architecture-2";
const root = new URL("../../", import.meta.url);
const mode = () => (location.hash.startsWith("#/") ? "courses" : "landing"),
  initialMode = mode();
addEventListener("hashchange", () => {
  if (mode() !== initialMode) location.reload();
});
function stylesheet(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(href, root).href;
    link.onload = resolve;
    link.onerror = () => reject(new Error("Styles could not load."));
    document.head.append(link);
  });
}
function script(src) {
  return new Promise((resolve, reject) => {
    const node = document.createElement("script");
    node.src = new URL(src, root).href;
    node.onload = resolve;
    node.onerror = () => reject(new Error("A required script could not load."));
    document.head.append(node);
  });
}
async function boot() {
  if (initialMode === "courses") {
    const response = await fetch(
      new URL("courses-shell.html?v=" + version, root),
    );
    if (!response.ok) throw new Error("The course library could not load.");
    const shell = new DOMParser().parseFromString(
      await response.text(),
      "text/html",
    );
    await Promise.all(
      [...shell.querySelectorAll("link[rel=stylesheet]")].map((node) =>
        stylesheet(node.getAttribute("href")),
      ),
    );
    document.documentElement.lang = shell.documentElement.lang;
    document.title = shell.title;
    document.body.replaceChildren(
      ...[...shell.body.childNodes].map((node) =>
        document.importNode(node, true),
      ),
    );
    document
      .querySelector('a.skip[href="#main"]')
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        const main = document.getElementById("main");
        main?.focus();
        main?.scrollIntoView({ block: "start" });
      });
    await import("./workspace.js");
  } else {
    await stylesheet("src/site/landing/landing.css?v=" + version);
    document.body.innerHTML =
      '<a class="skip" href="#main">Skip to content</a><div id="app"></div><dialog id="modal" aria-labelledby="dialog-title"></dialog><div id="toast" role="status" aria-live="polite"></div>';
    for (const file of ["gsap.min.js", "ScrollTrigger.min.js"])
      await script("src/site/landing/vendor/" + file);
    const { mountLanding } = await import("./landing/index.js");
    mountLanding();
  }
}
void boot().catch((error) => {
  document.body.replaceChildren();
  const message = document.createElement("p");
  message.setAttribute("role", "alert");
  message.textContent = error.message;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Retry / 重试";
  retry.onclick = () => location.reload();
  document.body.append(message, retry);
});
