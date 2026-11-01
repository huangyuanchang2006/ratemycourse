// The previous shell loader inserts classic scripts even when HTML says type=module.
// Dynamic import is valid in both classic and module scripts; all app code stays ESM.
void import('./workspace.js').catch(error => {
  const main = document.getElementById('main');
  if (main) {
    main.textContent = error.message;
    main.setAttribute('role', 'alert');
  }
});
