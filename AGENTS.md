# RateMyCourse repository navigation

- Start with `ARCH.md`; read the relevant behavior in `PRD.md`, and `DESIGN.md` for presentation changes.
- Keep those three documents current in the same change when behavior, module interfaces/dependencies, or design rules change. Distinguish implemented behavior from future plans.
- Work through the six modules under `src/`. Use another module's `index.js` interface; keep its private state, query projections and workflow coordination inside it.
- Preserve author review text, whitespace, missing/unknown distinctions, consent, ownership, revision checks and public/owner/admin read contracts. Do not infer author-provided fields.
- Preserve existing root/hash links, OAuth return paths and GitHub Pages project subpaths. Deploy only to GitHub Pages; do not push or deploy unless the task authorizes publication.
- Historical demos are archived outside this public repo. Do not restore them as active modules without a specific need.
- Never add local research, QA, archives, credentials, private sessions or secret keys to this repo. Browser publishable configuration is not a secret key.
- Before a subsequent Pages release, retain the currently deployed module revision in `src/site/pages-compatibility.json`; do not remove cached release graphs or classic compatibility resources without checking upgrade and rollback. See ARCH for the main-only Pages workflow.
- Stage an explicit list of files; do not use `git add -A`.
