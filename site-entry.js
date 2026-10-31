(() => {
  'use strict';
  const version = '20261031-landing-1';
  const root = new URL('.', location.href);
  const mode = () => location.hash.startsWith('#/') ? 'courses' : 'landing';
  const initialMode = mode();
  // Keep established root hash links and the OAuth callback. Cross-app navigation
  // reloads once; section links and course routes retain their own state handling.
  addEventListener('hashchange', () => { if (mode() !== initialMode) location.reload(); });
  function stylesheet(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = new URL(href, root).href;
      link.onload = resolve; link.onerror = () => reject(new Error('Styles could not load.'));
      document.head.append(link);
    });
  }
  function script(src) {
    return new Promise((resolve, reject) => {
      const node = document.createElement('script');
      node.src = new URL(src, root).href; node.async = false;
      node.onload = resolve; node.onerror = () => reject(new Error('A required script could not load.'));
      document.head.append(node);
    });
  }
  async function courses() {
    const response = await fetch(new URL(`courses-shell.html?v=${version}`, root));
    if (!response.ok) throw new Error('The course library could not load.');
    const shell = new DOMParser().parseFromString(await response.text(), 'text/html');
    const styles = [...shell.querySelectorAll('link[rel="stylesheet"]')].map(node => node.getAttribute('href'));
    const scripts = [...shell.querySelectorAll('script[src]')].map(node => node.getAttribute('src'));
    await Promise.all(styles.map(stylesheet));
    document.documentElement.lang = shell.documentElement.lang;
    document.title = shell.title;
    document.body.replaceChildren(...[...shell.body.childNodes].map(node => document.importNode(node, true)));
    const skip = document.querySelector('a.skip[href="#main"]');
    skip?.addEventListener('click', event => {
      event.preventDefault();
      const main = document.getElementById('main');
      main?.focus(); main?.scrollIntoView({ block: 'start' });
    });
    for (const src of scripts) await script(src);
  }
  async function landing() {
    await stylesheet(`landing/landing.css?v=${version}`);
    document.body.innerHTML = '<a class="skip" href="#main">Skip to content</a><div id="app"></div><dialog id="modal" aria-labelledby="dialog-title"></dialog><div id="toast" role="status" aria-live="polite"></div>';
    // Render the public page before auth; preserve the real client and callback.
    for (const src of ['landing/vendor/gsap.min.js', 'landing/vendor/ScrollTrigger.min.js', `landing/landing.js?v=${version}`]) await script(src);
    try {
      for (const src of ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'supabase-config.js', 'profile-policy.js?v=20261028-profile-3', 'auth-client.js?v=20261028-profile-3', 'analytics-client.js?v=20261020-test-session']) await script(src);
      dispatchEvent(new Event('sils:auth-ready'));
    } catch (_) { dispatchEvent(new Event('sils:auth-unavailable')); }
  }
  (initialMode === 'courses' ? courses() : landing()).catch(error => {
    document.body.replaceChildren();
    const message = document.createElement('p');
    message.setAttribute('role', 'alert'); message.textContent = error.message;
    const retry = document.createElement('button'); retry.type = 'button';
    retry.textContent = 'Retry / 重试'; retry.onclick = () => location.reload();
    document.body.append(message, retry);
  });
})();
