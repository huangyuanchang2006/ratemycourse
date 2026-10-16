(function () {
  "use strict";
  const slot = document.getElementById("account-nav");
  const auth = window.SILS_AUTH;
  if (!slot || !auth) return;

  function render(session) {
    const text = document.documentElement.lang.startsWith("zh")
      ? { signIn: "Google 登录", mine: "我的投稿", signOut: "退出" }
      : { signIn: "Sign in with Google", mine: "My contributions", signOut: "Sign out" };
    slot.innerHTML = session
      ? `<a class="button secondary compact" href="community.html#/mine">${text.mine}</a><button class="quiet" type="button" data-auth-signout>${text.signOut}</button>`
      : `<button class="button secondary compact" type="button" data-auth-signin>${text.signIn}</button>`;
  }

  auth.ready.then(render);
  window.addEventListener("sils:auth", (event) => render(event.detail.session));
  new MutationObserver(() => render(auth.session)).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  slot.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-auth-signin], [data-auth-signout]");
    if (!button) return;
    button.disabled = true;
    try {
      if (button.hasAttribute("data-auth-signin")) await auth.signInWithGoogle("index");
      else await auth.signOut();
    } catch (error) {
      button.disabled = false;
      window.alert(error?.message || "Authentication could not be completed. Please try again.");
    }
  });
})();
