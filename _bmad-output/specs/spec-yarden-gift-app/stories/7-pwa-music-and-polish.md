---
title: 'Installable app shell, ambient music, and final polish'
type: 'feature'
created: '2026-10-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-yarden-gift-app/stack.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CAP-7 wants the gift installable to her home screen so it reads as an app Eran made rather than a webpage, and CAP-8 wants sound that can always be silenced — without shipping a broken control when no track exists.

**Approach:** A web manifest with generated icons and the iOS meta tags, plus an audio layer whose chime is synthesized rather than loaded, so the mute control stays meaningful with no music file.

</frozen-after-approval>

## Implementation Notes

**The chime is synthesized, not a file.** Two sine oscillators a fifth apart
through a short gain envelope, via WebAudio. This is the decision that makes
CAP-8 coherent with no track supplied: there is no asset to ship, nothing to
fail to load, it works offline — and crucially the mute control is a real
control rather than a dead switch. The spec's "ship silent with no broken
control" is satisfied by having something real to mute.

**Icons generated from one inline SVG** via `scripts/build-icons.mjs`, at four
sizes. The maskable variant carries 18% inset padding because Android's
adaptive shapes crop roughly the outer 10%, and the Apple touch icon is
unrounded since iOS applies its own corner radius. Output is committed rather
than built, since icons change approximately never and a missing one degrades
the install prompt silently rather than failing a build.

**Decisions:**
- `unlock()` is called from inside the Opening tap handler, which is the entire
  reason that screen exists — mobile browsers only permit audio to start from a
  user gesture.
- The chime fires only on a genuine `pending → ready` transition, tracked in a
  ref. Without that guard every already-open gift would chime on arrival.
- Mute preference persists and suppresses the chime as well as music.
- `apple-mobile-web-app-*` meta tags alongside the manifest, since iOS still
  does not read the manifest for standalone display.
- Manifest uses relative `start_url`/`scope` so a subdirectory deploy works.
- Mute button sits under the safe-area inset so the notch never covers it.

**Bug fixed:** `unlock` from the audio module collided with a local `unlock`
for the gate, so the import was silently shadowed — the audio one was never
called and TypeScript flagged it as unused. Renamed the local to
`rememberUnlock` and aliased the import.

**Verified:** typecheck and build clean; production build smoke-tested through
`vite preview` with all ten critical paths returning HTTP 200 — page, manifest,
favicon, both icon variants, robots, photo manifest, a photo, and two sealed
gifts. Total deployed payload **5.23 MB**. Icon rendering inspected visually
rather than assumed.

**Not verified:** the install flow itself on iOS Safari and Android Chrome,
whether the chime is audible and pleasant on a phone speaker, and whether the
standalone launch looks right. All require real devices.
