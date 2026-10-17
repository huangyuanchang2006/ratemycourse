(() => {
  "use strict";
  const key = "odyssey-community-language";
  let language = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  try { const saved = localStorage.getItem(key); if (["zh", "en"].includes(saved)) language = saved; } catch (_) {}
  const toggle = document.getElementById("language-toggle");
  function render() {
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
})();
