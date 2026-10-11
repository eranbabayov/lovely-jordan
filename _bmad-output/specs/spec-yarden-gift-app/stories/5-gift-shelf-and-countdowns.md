---
title: 'Gift shelf with live countdowns on a corrected clock'
type: 'feature'
created: '2026-10-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-yarden-gift-app/hebrew-matching.md'
  - '{project-root}/_bmad-output/specs/spec-yarden-gift-app/flow-diagrams.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CAP-3 requires every gift visible as a box showing whether it is open yet and how long remains, counted against a clock Yarden cannot trivially change, in correctly pluralised Hebrew.

**Approach:** One session clock correction from the host's `Date` header, a per-gift state machine derived from that corrected time, and a shelf that renders whatever the config array holds.

</frozen-after-approval>

## Implementation Notes

**Converted the Hebrew formatter to plain `.js` + `.d.ts`** so
`scripts/check-countdown.mjs` exercises the real implementation rather than a
copy. The dual form is precisely the kind of thing that silently regresses, and
testing a duplicate would prove nothing. Same pattern as `normalize.js`.

**Decisions:**
- Clock offset read once per session via `HEAD` on the page's own URL, then
  applied to a local 1s tick. Falls back to `Date.now()` when the header is
  missing or the fetch fails — a soft lock is acceptable, a broken countdown is
  not.
- An unparseable `revealAt` fails **closed** as `misconfigured` and renders
  `תאריך שגוי` rather than opening early. A visibly broken date is recoverable;
  a gift that silently unlocks ahead of time has already spoiled the surprise.
- Countdown granularity: days, then hours, then ticking `MM:SS` inside the last
  hour, then a seconds count under a minute. The fine granularity is reserved
  for where the anticipation actually is.
- Locked boxes still show themselves and their countdown — never hidden,
  because anticipation is half the gift. Greyscale + reduced opacity on the
  emoji carries the locked state.
- `animate-float` on openable boxes, `animate-tremble` inside the last minute.
  Both keyframe animations, so reduced motion drops them.
- The shelf maps over `GIFTS` with no assumption about length, and returns
  `null` on an empty array. Adding or removing a gift stays a config-only edit.
- Shelf overlays the slideshow with `pointer-events-auto` inside a
  `pointer-events-none` wrapper, so taps on a box do not also reach the
  slideshow's pause handler.
- `tabular-nums` on the countdown so the ticking digits do not shift the layout.

**Verified:** `npm run check` passes all 16 countdown cases including both dual
forms (`יומיים`, `שעתיים`) and every boundary (just-under-a-day → `23 שעות`,
just-under-an-hour → `59:59`). Both configured reveal dates were asserted to
render as **20:00 in Asia/Jerusalem** — `+03:00` for 2026-10-18 during DST and
`+02:00` for 2026-11-01 after it ends on 2026-10-25 — which is the specific
mistake that would shift a gift by an hour. Typecheck and build clean.

**Not verified:** the clock correction against a real host. `vite preview` and
the dev server do send a `Date` header, but whether the production host passes
it through un-stripped is only observable once deployed. The fallback means the
countdown works either way; what is unconfirmed is whether the lock is
soft-but-corrected or soft-and-local.

**Deferred to story 6:** tapping an openable box currently just marks it
opened. The opening sequence and content rendering are story 6.
