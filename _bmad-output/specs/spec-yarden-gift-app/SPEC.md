---
id: SPEC-yarden-gift-app
companions:
  - flow-diagrams.md
  - threat-model.md
  - hebrew-matching.md
  - image-pipeline.md
  - stack.md
sources:
  - ../../planning-artifacts/design-yarden-gift-app.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Yarden Gift App

## Why

A vision to realize: Eran wants to give his girlfriend Yarden a surprise that behaves like a small private world rather than a message — her photos looping endlessly, and a shelf of gifts that stay sealed until moments he chooses. The emotional mechanism *is* anticipation: a gift she can see, count down to, and not yet open is worth more than one handed over immediately. It is built for exactly one person on her phone, which is why no account system, no analytics, and no server exist anywhere in this spec. Every trade-off resolves toward her experience in the thirty seconds after she taps the link.

## Capabilities

- **CAP-1** — Entry gate
  - **intent:** Yarden answers two fixed personal questions and thereby reaches the app's content; nothing is viewable before she does.
  - **success:** Both correct answers (in any of their accepted spellings per `hebrew-matching.md`) admit her; a wrong answer never ends the attempt, and no input sequence can produce a locked-out state. Her unlocked status survives closing and reopening the browser.

- **CAP-2** — Endless photo slideshow
  - **intent:** Yarden sees the photo set Eran supplied advance automatically and loop forever, so the app always feels alive without her touching it.
  - **success:** Every photo in the supplied set appears in chronological order, advances unattended at the configured interval, wraps from last to first with no visible gap or stall, and pauses while the tab is hidden.

- **CAP-3** — Gift shelf with countdowns
  - **intent:** Yarden sees every gift as a gift-box, each showing whether it is open yet and how long remains until it is.
  - **success:** A gift whose reveal moment has passed is visibly openable; one still pending shows a correctly pluralised Hebrew countdown that ticks and reaches zero at its reveal instant, computed identically regardless of her device's timezone or clock setting.

- **CAP-4** — Gift opening
  - **intent:** Yarden opens an unlocked gift and receives its contents through a moment of ceremony rather than a page transition.
  - **success:** Opening plays the box-opening sequence and then renders the gift's content by type (letter, photo, video, audio, voucher, link); an already-opened gift can be reopened indefinitely.

- **CAP-5** — Sealed gift contents
  - **intent:** A gift's contents cannot be read from the delivered files without the gate answers, so inspecting the source cannot spoil the surprise.
  - **success:** Gift payloads at rest contain no recoverable plaintext; unsealing succeeds only from the correct answers; no plaintext gift content exists in version control. See `threat-model.md` for what this does and does not protect against.

- **CAP-6** — Author workflow
  - **intent:** Eran adds or changes photos, gifts, and reveal times later without modifying component code.
  - **success:** Adding a gift is: place its source file, add one config entry, run the seal step, redeploy. Adding photos is: drop files in the photo folder and run the image step. Neither touches a component.

- **CAP-7** — Installable app shell
  - **intent:** Yarden can keep the gift on her home screen and open it fullscreen, so it reads as an app Eran made her rather than a webpage.
  - **success:** The deployed site satisfies install criteria on iOS Safari and Android Chrome, launches without browser chrome, and shows a custom name and icon.

- **CAP-8** — Ambient music *(optional)*
  - **intent:** Yarden hears a chosen track from the moment she enters, and can silence it at any time.
  - **success:** Audio begins on the opening tap (satisfying mobile autoplay policy), a mute control is visible on every screen, and the muted choice persists across visits. Absent a supplied track, the app ships silent with no broken control.

## Constraints

- **No backend, no database, no server-side code.** Deployable as static files to a free tier. This rules out server-enforced time locks and any secret not shipped to the client.
- **Must be served over HTTPS.** `crypto.subtle` exists only in a secure context, so serving over plain `http://` silently breaks both the gate and gift decryption.
- **Every secret reaches the client.** No lock here is enforceable against a determined inspector; protections raise effort only. Non-negotiable consequence of the no-backend constraint.
- **Hebrew only, `dir="rtl"`.** Rules out any layout, animation direction, or copy that assumes LTR.
- **Mobile-first, iOS Safari as reference browser.** Use `100dvh` rather than `100vh` and respect safe-area insets, or the layout is clipped by the address bar.
- **Static hosts expose no directory listing.** The photo set must be enumerated by a build-time manifest; runtime discovery of the images folder is impossible.
- **Browsers cannot render HEIC.** The native iPhone photo format must be converted at build time, and EXIF orientation baked in, or photos fail to display or appear rotated.
- **Plaintext gift sources must never be committed.** Only sealed ciphertext is tracked. A committed plaintext gift puts the whole surprise one `git log` away.
- **`prefers-reduced-motion` is honoured.** Ken-Burns and confetti degrade to plain fades.
- **The gate has no attempt limit.** No lockout, no cooldown, no captcha — ever.
- **Single-maintainer editability.** Adding a gift must not require touching component code.

## Non-goals

- Real authentication, or any server-enforced time lock, in v1.
- Multi-user support, accounts, sessions, or analytics of any kind.
- Internationalisation or any language other than Hebrew.
- An upload UI or CMS for adding photos and gifts; the author workflow is files plus config.
- Light/dark toggle, share buttons, SEO. The site is deliberately unindexed.
- Desktop-optimised layout. Desktop must be usable, not polished.

## Success signal

Yarden taps the link on her own phone with Eran not in the room, answers both questions on the first try, and lands on her photos already looping with a shelf of gift-boxes counting down beside them. At a reveal moment she chose nothing about, a box becomes openable and gives her what Eran sealed inside it. Demonstrable end to end with no server, by setting a reveal time a minute out and watching the box unlock on a real phone.

## Assumptions

- The gate guards the whole app rather than only the gifts; Eran's brief asked for gift-level questions, and this widens it for photo privacy.
- Slideshow pace defaults to 4000ms with crossfade; the originally requested 1000ms stays supported as a one-constant change.
- Time gating is soft for v1 (server `Date` header, not a withheld key).
- Photos are ordered chronologically by EXIF capture date.
- Reveal wall-clock times are intended as Israel local time (`Asia/Jerusalem`).
- Three gifts in v1, carrying placeholder content (`gift1`, `gift2`, `gift3`). The count is config-driven, never structural — adding or removing a gift later must stay a config-only edit.
- The first gift ships already unlocked so the app gives something immediately; the other two carry placeholder reveal times (`2026-10-18T20:00:00+03:00`, `2026-11-01T20:00:00+02:00`), chosen to straddle the end of Israeli DST on 2026-10-25 so both offset cases are exercised.
- CAP-8 ships silent: no music track supplied. The audio layer and mute control are still built so a track is a config-only addition, but nothing broken is shown in its absence.
- Photo set is 25 JPEGs (42.8 MB) supplied and present in `images/`; no HEIC in this set, so that conversion path is retained for future drops but is not on the critical path. Small enough that the slideshow can preload the entire set.
- Yarden's browser is a current mobile browser with WebP, `crypto.subtle`, and CSS 3D transform support.

## Open Questions

- Real content for each of the three gifts, replacing the `gift1`/`gift2`/`gift3` placeholders. Not blocking: the seal step is re-runnable, so content can be swapped at any time without touching code.
- Final reveal datetime per gift, replacing the placeholders. Config-only edit.
- Adopt either suggestion left out of scope — a hidden easter-egg gift, or per-gift riddles instead of the single gate?
