(() => {
  "use strict";
  const header = document.querySelector(".site-header");
  if (!header) return;
  const updateHeight = () => document.documentElement.style.setProperty("--site-header-height", `${Math.ceil(header.getBoundingClientRect().height)}px`);
  updateHeight();
  if (window.ResizeObserver) new ResizeObserver(updateHeight).observe(header);
  else window.addEventListener("resize", updateHeight, { passive: true });
})();
