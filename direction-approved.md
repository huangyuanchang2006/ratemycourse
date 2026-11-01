# Odyssey redesign approval

User selected: 「没问题，那就按照你说的`C + B航线 + A按钮反馈`」

Directions reviewed: design-demos/direction-a-collage-chart.html,
design-demos/direction-b-night-passage.html, design-demos/direction-c-atlas-system.html.
Screenshots: design-demos/screenshots/direction-{a,b,c}-1440.png.

Apply C's editorial hierarchy and warm paper/burgundy palette across the existing site,
B's chapter-linked voyage feedback, and A's press feedback on actionable buttons.
Chambers is the website author and occupies the middle card on desktop.
Preserve real course data, bilingual copy, native scrolling, social links and inline WeChat ID copy.
No staged registration copy from the prototypes: use the existing date-driven source.

## Course detail reading rules · 2026-10-31

- User confirmed: compact course name and reported instructor/term/credits, followed by four simultaneously visible information blocks: Workload, Group work, Attendance and Would take again. They are not interactive tabs.
- User confirmed: original experience, fit/avoid, assessment/notes, then contributor identity and voluntarily shared background; shared official course information comes last.
- User confirmed: preserve the five stored author text fields. Do not summarize, rewrite, infer missing answers, or insert generated grades. Existing translations are explicitly labeled and closed by default, separate from the unchanged main text.
- Implementation: author URLs remain character-for-character intact and become keyboard-accessible links. Unknown indicators say Not provided; the historical source-sheet link is removed from the reading UI.
- Implementation: preserve the existing palette and native scrolling. Fit/avoid stack on phones; labels wrap without hiding values. Reuse existing feedback and reduced-motion behavior.

## Contribution flow · 2026-11-01

- User reviewed the local contribution design, specified the term selector and removed the repeated programme/year inputs, then explicitly requested main/Pages publication.
- One click-triggered term field: year, then Spring/Fall; no preselection. Chinese and English follow the website display language. Back, Escape, outside click and keyboard access retain committed input.
- New-contribution window rolls from the Japan current year minus six; future semesters remain unavailable. Use verified official semester starts, not the first class date. Unverified calendar years stay unavailable until updated. Published historical reviews are retained.
- Allow an explicit unknown term without forcing an invented date. Preserve historical raw term values on owner edits.
- Keep all five authored text fields verbatim, including whitespace. Fill in reading order, preview with the shared review renderer, then submit through the existing ownership/version/approval paths.
- Four indicators are optional; absence and explicit uncertainty remain distinct. No inference from narrative or personal grades. Review preview must not claim publication.
- Do not collect programme or year again on every review. Keep those in Profile; do not infer year from semester. Historical opted-in review background survives edits; missing fields do not copy profile data into new public reviews.
- Explicit account/form-scoped drafts survive reload in the same tab. Errors retain text and publication choices. Figma synchronization remains pending; no substitute file or Page created.


## RateMyCourse refinement · 2026-10-18

- User confirmed: use RateMyCourse in place of the visible Odyssey wordmark; remove the duplicated programme shortcut strip above Browse. Keep the programme select.
- User requested: restore the historical Richard / Chambers / Cindy cards, slow motion from left to right, with shadows. Reuse the established public portraits, descriptions and contacts; do not enumerate private profiles.
- User requested: consistent selected-language reading and clearer information hierarchy for the pitch demonstration.
- Agent implementation: two-column desktop course results; fit guidance first and complete, full course narrative and assessment in detail; advanced fit/avoid filters collapse by default. Native scrolling remains.
- Agent implementation: a Contributors navigation destination leads to the wall; each card filters real experiences by author. The wall stays out of the main reading flow. Mobile and reduced-motion users scroll cards manually; hover/focus, persistent pause and offscreen suspension control desktop motion.
- Agent implementation: entry movement, button press response and a restrained scroll-linked wall entrance. No pinned scenes or scroll interception in the course browser.
- Supporting prose is at least 13px; real course names and instructor names remain in their source naming conventions. New translations are reading copies, with original-text disclosure and source checks; contribution editing keeps original content.
- Figma synchronization is pending edit access to the existing designated Page; no substitute file/Page created.
