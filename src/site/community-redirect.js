(() => {
  "use strict";
  // Keep existing bookmarks, shared course links, and in-flight OAuth returns.
  const destination = new URL("./", window.location.href);
  destination.search = window.location.search;
  destination.hash = window.location.hash || "#/browse";
  window.location.replace(destination.href);
})();
