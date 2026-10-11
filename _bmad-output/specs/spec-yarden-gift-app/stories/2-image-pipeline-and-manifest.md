---
title: 'Build the image pipeline and photo manifest'
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

**Problem:** Static hosts expose no directory listing, so the app cannot discover `images/` at runtime. Without a build-time manifest, CAP-2 has no data contract and the slideshow cannot be written.

**Approach:** `scripts/build-images.mjs` reads the originals, bakes EXIF orientation, resizes to two WebP sizes plus an inline LQIP placeholder, orders chronologically by EXIF capture date with mtime/filename fallbacks, and writes `public/images/manifest.json`.

</frozen-after-approval>

## Implementation Notes

Used `sharp` 0.35.5 for processing and `exifr` 7.1.3 for dates.

**Long-edge cap, not width cap.** First pass used `resize({ width: 1600 })`, which caps width only — and since the set is almost entirely 9:16 phone portraits, that produced 1600x2844 images: 12.3 MB total, largest 915 KB. Switched to `fit: 'inside'` with both dimensions bounded, capping the long edge. Result: **4.92 MB total, largest 359 KB**, portraits now 900x1600. This matters directly to the decode-stutter trap `image-pipeline.md` calls out.

**All 25 photos carry real EXIF `DateTimeOriginal`** — including the GUID-named ones I expected to have stripped metadata. So chronological ordering is genuine rather than a filename fallback. Range: 2026-04-01 to 2026-09-24.

**Decisions:**
- `.rotate()` with no argument on every pipeline, baking orientation into pixels.
- Captions preserved across runs, keyed by original filename, so re-running never destroys hand-written text. The manifest carries `origin` for that purpose.
- `OUT_DIR` is wiped each run so deleted photos do not linger as orphans in `public/`.
- Undated photos sort last, then by filename, so order stays stable rather than arbitrary. Never dropped.
- Unreadable files are reported and skipped, not fatal — one bad file must not break the other 24. HEIC failures additionally print the libheif hint, per the spec's retained-but-not-critical-path branch.
- `dateSource` recorded per entry (`exif` / `mtime` / `none`) so a future run can see how trustworthy the ordering is.

**Verified:** `npm run images` processes all 25 with zero failures; manifest is 12.1 KB with correct dimensions, ISO dates and ~267-byte LQIP data URIs; max long edge across the set is 1600; re-run is idempotent.

**Not verified:** the HEIC branch — this set contains none, so that path is unexercised. It will stay unexercised until someone drops a HEIC in.
