---
title: 'Scaffold the RTL app shell and prove static hosting'
type: 'chore'
created: '2026-10-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-yarden-gift-app/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-yarden-gift-app/stack.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository is empty, so nothing in `SPEC-yarden-gift-app` can be built or verified. Every later capability depends on two things this story establishes: a Hebrew RTL app shell, and a confirmed HTTPS static host — `crypto.subtle` does not exist outside a secure context, so CAP-1 (gate) and CAP-5 (sealed gifts) both fail silently on plain `http://`.

**Approach:** Stand up Vite + React + TypeScript + Tailwind producing a static `dist/`, with `lang="he" dir="rtl"`, the Hebrew display font, `100dvh` and safe-area insets in the base layout, and `robots.txt` noindex. Seed `src/config.ts` with the confirmed v1 configuration (`SLIDE_MS = 4000`, three placeholder gifts, config-driven count) so stories 2–7 build against a stable contract. Verify the production build locally; the deploy itself is Eran's step since it needs his hosting account.

</frozen-after-approval>

## Implementation Notes

**Toolchain pinned to Vite 6 — the one real surprise.** The first install took
current latest (Vite 8 / plugin-react 6) and `npm` warned `EBADENGINE`: both
require Node `^20.19.0 || >=22.12.0`, and the local Node is **20.12.2**. The
build then failed outright — Vite 8 bundles with rolldown and the native
`@rolldown/binding-win32-x64-msvc` was never installed. Checked every Vite
major against npm: only **Vite 6** declares `^20.0.0`. Pinned `vite@^6.4.4` +
`@vitejs/plugin-react@^4.7.0` (Tailwind's Vite plugin accepts `^5.2 || ^6 || ^7
|| ^8`, React 19.3 and TypeScript 7 are unaffected). Clean reinstall, no engine
warnings, build green.

Chose the project-local pin over upgrading Node because a global Node bump
affects Eran's other work and is his call, not a side effect of a scaffold
story. Recorded in `deferred-work.md` — Node 22 LTS would unblock Vite 8.

**Decisions made (no user-visible consequence, so taken rather than asked):**
- Font **Heebo** over Assistant; loaded from Google Fonts for now (deferred:
  self-host).
- Tailwind **v4 CSS-first** config via `@theme` in `index.css` — no
  `tailwind.config.js` exists by design.
- Host-agnostic output: `netlify.toml` plus `public/_headers`, the latter
  honoured by both Netlify and Cloudflare Pages. Nothing is locked to one host.
- `src/config.ts` seeded as the stories 2–7 contract. `ANSWERS[].digests` are
  **empty arrays**, which fail closed (nothing matches) — the correct default
  until story 4 populates them.
- `gifts-src/gift1..3.md` created with the placeholder bodies Eran asked for.
  Gitignored, so they exist locally for story 6 to seal.
- `npm run build` runs `tsc --noEmit` before `vite build`, so a type error
  fails the build rather than shipping.

**Files added:** `package.json`, `package-lock.json`, `vite.config.ts`,
`tsconfig.json`, `index.html`, `netlify.toml`, `README.md`,
`public/robots.txt`, `public/_headers`, `src/main.tsx`, `src/App.tsx`,
`src/index.css`, `src/config.ts`, `src/components/Opening.tsx`,
`gifts-src/gift{1,2,3}.md`. `.gitignore` pre-existed.

**Verified:** typecheck clean; `vite build` emits `dist/`; `dist/index.html`
retains `lang="he" dir="rtl"`, `viewport-fit=cover` and the noindex meta;
built CSS contains `100dvh`, both safe-area insets, the reduced-motion block
and `overflow-x`; the `@theme` colours really generated as utilities
(`.text-gold-soft`, `.bg-plum`, `.border-gold`, `.font-display`) rather than
silently dropping to an unstyled shell; `vite preview` serves `/`,
`/robots.txt` and the JS bundle all HTTP 200.

**Not verified — Eran's checks.** Deployment needs his hosting account, so the
HTTPS confirmation that this story exists to establish is still outstanding.
Visual rendering on a real phone (safe-area behaviour, Hebrew font, RTL
layout) cannot be confirmed from a build log either; that is the
`done_checkpoint`.

## Review Triage Log

Independent `blind-hunter` layer **not run** — spawning subagents requires the
user's say-so in this environment. Took the step's documented fallback: the
filled-in prompt is at
`_bmad-output/implementation-artifacts/review-prompt-story-1-blind-hunter.md`
for a separate session. Findings below are from an inline self-review, which
shares this session's blind spots and is weaker evidence.

| Verdict | Finding | Evidence / action |
|---|---|---|
| `medium` → **patched** | Blanket `transition-duration: 0.01ms !important` under `prefers-reduced-motion` contradicted the spec. | stack.md degrades motion to *plain fades*, not to nothing; killing all transitions would break the story-3 crossfade for reduced-motion users. Narrowed to keyframe animations plus `scroll-behavior`; added a comment warning against re-adding it. |
| `medium` → **patched** | Netlify catch-all `/* -> /index.html 200` would mask 404s for data files. | A missing `gifts/*.sealed.json` would return HTML with status 200, surfacing as an opaque JSON parse failure during story-6 unsealing instead of a clear not-found. There is no client-side router, so the rule bought nothing; removed it with the rationale recorded in `netlify.toml`. |
| `low` → deferred | Heebo loaded from a third-party CDN. | `display=swap` degrades to a fallback face rather than breaking. `deferred-work.md`. |
| `low` → deferred | No favicon; browsers log a `/favicon.ico` 404. | Cosmetic, and story 7 already owns icons. `deferred-work.md`. |
| `low` → deferred | `engines` (`>=20.12.0`) is looser than Vite 6's real range. | Node 21 would pass the former, not the latter. No impact on a single-developer local build. `deferred-work.md`. |
| `low` → rejected | `public/_headers` sets no `Cache-Control` for hashed assets. | Hosts already serve sensible defaults and the clock probe uses `cache: 'no-store'` explicitly. The fix would add configuration for no measurable gain on a site with one user. |
| not a code defect | `App.tsx` ships Hebrew placeholder text ("כאן ייכנסו השאלות, התמונות והמתנות"). | Correct for a shell, but the URL must not reach Yarden before story 4 or it reads as a broken gift. Raised with Eran rather than changed. |
