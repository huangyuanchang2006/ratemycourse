(() => {
  "use strict";
  const header = document.querySelector(".site-header");
  if (!header) return;
  const nav = header.querySelector("nav");
  if (nav && nav.querySelectorAll("a").length > 1) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-toggle";
    nav.id ||= "site-navigation";
    toggle.setAttribute("aria-controls", nav.id);
    toggle.setAttribute("aria-expanded", "false");
    const label = () => {
      const zh = document.documentElement.lang.startsWith("zh");
      toggle.textContent = header.hasAttribute("data-menu-open") ? (zh ? "关闭菜单" : "Close menu") : (zh ? "菜单" : "Menu");
    };
    const close = () => { header.removeAttribute("data-menu-open"); toggle.setAttribute("aria-expanded", "false"); label(); };
    toggle.addEventListener("click", () => {
      const open = !header.hasAttribute("data-menu-open");
      header.toggleAttribute("data-menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      label();
    });
    nav.before(toggle);
    nav.addEventListener("click", event => { if (event.target.closest("a")) close(); });
    header.addEventListener("keydown", event => {
      if (event.key === "Escape" && header.hasAttribute("data-menu-open")) { close(); toggle.focus(); }
    });
    new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    label();
  }
  const updateHeight = () => document.documentElement.style.setProperty("--site-header-height", `${Math.ceil(header.getBoundingClientRect().height)}px`);
  updateHeight();
  if (window.ResizeObserver) new ResizeObserver(updateHeight).observe(header);
  else window.addEventListener("resize", updateHeight, { passive: true });
})();
