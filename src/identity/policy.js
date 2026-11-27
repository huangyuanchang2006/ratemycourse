export const profilePolicy = (() => {
  "use strict";
  const readingFields = ["display_name", "programme", "study_year"];
  const fields = [
    "display_name",
    "bio",
    "programme",
    "study_year",
    "avatar_path",
  ];
  const blank = (value) =>
    !String(value || "")
      .replace(/[\s\u00a0\u3000]+/g, "")
      .trim();
  const readingMissing = (profile) =>
    readingFields.filter((key) => blank(profile?.[key]));
  const readingComplete = (profile) => readingMissing(profile).length === 0;
  const missing = (profile) => fields.filter((key) => blank(profile?.[key]));
  const complete = (profile) => missing(profile).length === 0;
  const defaults = (profile, { fullStep = true } = {}) => {
    if (profile) {
      return {
        is_public: Boolean(profile.is_public),
        show_on_wall: Boolean(profile.is_public && profile.show_on_wall),
      };
    }
    return fullStep
      ? { is_public: true, show_on_wall: true }
      : { is_public: false, show_on_wall: false };
  };
  function destination(value, base) {
    try {
      const root = new URL(".", base),
        url = new URL(value || "./#/browse", root);
      if (
        url.origin !== root.origin ||
        ![
          root.pathname,
          `${root.pathname}analytics.html`,
          `${root.pathname}guide.html`,
        ].includes(url.pathname)
      )
        return new URL("./#/browse", root).href;
      if (url.pathname === root.pathname && url.hash.startsWith("#/profile"))
        return new URL("./#/browse", root).href;
      return url.href;
    } catch (_) {
      return new URL("./#/browse", base).href;
    }
  }
  return Object.freeze({
    readingFields,
    fields,
    readingMissing,
    readingComplete,
    missing,
    complete,
    defaults,
    destination,
  });
})();
