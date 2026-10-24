(() => {
  "use strict";
  const key = "odyssey-community-language";
  let language = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  try { const saved = localStorage.getItem(key); if (["zh", "en"].includes(saved)) language = saved; } catch (_) {}
  const toggle = document.getElementById("language-toggle");
  function render() {
    const directory = document.getElementById("school-directory");
    const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    directory.innerHTML = window.SILS_COMMUNITY_MODEL.providerCatalog.map(item => `<article>
      <span class="pill">${escapeHtml(item.kind === "school" ? (language === "zh" ? "本科学部" : "UNDERGRADUATE SCHOOL") : (language === "zh" ? "项目／中心" : "PROGRAMME / CENTRE"))}</span>
      <h3>${escapeHtml(item[language])}</h3>${language === "zh" && item.zh !== item.ja ? `<p class="small">${escapeHtml(item.ja)}</p>` : ""}
      <ul class="guide-links">
        <li><a class="text-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${language === "zh" ? "官方资料" : "Official website"} ↗</a></li>
        <li><a class="text-link" href="./#/browse?provider=${encodeURIComponent(item.id)}">${language === "zh" ? "浏览课程体验" : "Browse course experiences"}</a></li>
        <li><a class="text-link" href="./#/share?provider=${encodeURIComponent(item.id)}">${language === "zh" ? "添加课程并分享体验" : "Add a course and share an experience"} →</a></li>
      </ul></article>`).join("");
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = language === "zh" ? "选课指南 · RateMyCourse" : "Registration guide · RateMyCourse";
    document.querySelectorAll("[data-zh][data-en]").forEach(node => { node.textContent = node.dataset[language]; });
    document.querySelector(".brand small").textContent = language === "zh" ? "课程体验" : "COURSE EXPERIENCES";
    toggle.textContent = language === "zh" ? "English" : "中文";
    toggle.hidden = false;
  }
  toggle.addEventListener("click", () => {
    language = language === "zh" ? "en" : "zh";
    try { localStorage.setItem(key, language); } catch (_) {}
    render();
  });
  render();
  window.SILS_ANALYTICS?.page({ page: "guide" });
})();
