---
title: 'Endless auto-advancing photo slideshow'
type: 'feature'
created: '2026-10-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-yarden-gift-app/image-pipeline.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CAP-2 requires the photos to advance by themselves and loop forever, so the app feels alive without Yarden touching it. The manifest exists (story 2) but nothing renders it.

**Approach:** Two persistent cross-fading layers over the manifest, advancing on `SLIDE_MS`, wrapping seamlessly, decoding ahead so advances never hitch, pausing when the tab is hidden, with tap/swipe/long-press controls and no persistent chrome.

</frozen-after-approval>

## Implementation Notes

**Crossfade is an opacity TRANSITION; Ken-Burns is a keyframe ANIMATION.** This split is load-bearing, not incidental. The global reduced-motion rule suppresses animations but leaves transitions alone, so under `prefers-reduced-motion` the drift disappears while the fade survives — which is exactly "degrade to plain fades" from `stack.md`, rather than killing all motion.

**Bug caught and fixed during implementation.** The first `step()` called `setSlots` from inside the `setActive` updater. Updater functions must be pure, and StrictMode deliberately double-invokes them — so every advance would have fired twice, skipping a photo. Collapsed `slots` and `active` into one state object with a single pure updater, which is now safe to re-invoke.

**Decisions:**
- Size variant chosen once up front (`pickSrc`) rather than via `srcset`, because the preloader needs the exact URL it is going to decode. 900px below ~1100 effective px, 1600px above.
- `PRELOAD_AHEAD = 3` with `img.decode()` awaited, per the decode-stutter trap.
- Ken-Burns restarts per photo by keying the inner wrapper on `photo.origin`, while the outer layer persists so its opacity transition still runs. Keying the outer element would have killed the fade.
- Animation duration passed as a `--kb-duration` CSS variable derived from `SLIDE_MS + CROSSFADE_MS`, so the drift keeps moving through the fade and the pace stays driven by the single config constant.
- Swipe direction is RTL-aware: a positive dx advances.
- Long-press (400ms) holds the current photo and releases on pointer-up, distinguished from a tap by the same handler.
- `touch-none select-none` so dragging does not scroll or select the page.
- LQIP set as the `<img>` background, so a slow network shows a blurred placeholder instead of a black rectangle.
- A single `מושהה` pill is the only chrome, shown only while paused.
- Captions render when present; all are currently `null`.

**Verified:** typecheck and build clean; `dist/images/` receives all 50 WebP files plus the manifest (4.94 MB); dev server serves `manifest.json` (25 photos) and the first photo (56 KB) at HTTP 200.

**Not verified:** the motion itself — crossfade smoothness, Ken-Burns feel, swipe and long-press on a touchscreen, and whether 4s is the right pace, are all judgments that need a real device. Part of Eran's checkpoint.
