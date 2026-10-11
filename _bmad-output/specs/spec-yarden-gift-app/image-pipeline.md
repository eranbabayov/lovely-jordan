# Image Pipeline

Companion to `SPEC.md`, governing CAP-2 and part of CAP-6.

## Why a build step is unavoidable

Static hosts serve no directory listing, so the app cannot discover `images/` at runtime. The photo set must be enumerated into a manifest at build time. This is a constraint, not a preference.

## Stages

```
images/*.{jpg,jpeg,png,heic,heif,webp}   ← Eran drops originals here (gitignored)
  1. convert HEIC/HEIF → raster
  2. bake EXIF orientation into pixels
  3. read EXIF DateTimeOriginal → sort key
  4. resize: 900px (phone) + 1600px (desktop) long edge
  5. encode WebP q80
  6. emit LQIP: ~20px blurred WebP as a data URI
  7. write public/images/manifest.json, chronologically ordered
```

## Manifest shape

```json
[
  {
    "src": "images/001-1600.webp",
    "srcSmall": "images/001-900.webp",
    "w": 1600,
    "h": 1067,
    "lqip": "data:image/webp;base64,UklGR…",
    "takenAt": "2024-07-14T19:22:03",
    "caption": "הפעם הראשונה בחוף"
  }
]
```

`caption` is optional per photo. A line of Hebrew fading in over a corner is a large emotional return for trivial effort — worth offering Eran a pass over the set once the photos exist.

## Traps that will bite

- **HEIC is the default iPhone format and browsers cannot display it.** Conversion is mandatory (`heic-convert`, or `sharp` built against libheif). Confirm the toolchain handles it on a single file *before* several hundred photos are in the folder.
- **EXIF orientation.** Phone photos carry a rotation flag. `sharp().rotate()` with no argument bakes it in; skip it and roughly half the portrait shots render sideways.
- **Decode stutter.** At a fast interval, swapping to an undecoded image visibly hitches. Preload the next 3 entries and `await img.decode()` before the swap.
- **Missing EXIF.** Screenshots, downloads, and WhatsApp-forwarded images often carry no `DateTimeOriginal`. Fall back to file mtime, then to filename order; never crash and never silently drop a photo.
- **Live Photos / HEIC pairs.** iPhone exports may include a paired `.mov`. Ignore video siblings in this pipeline.
- **Total payload.** A few hundred photos at two sizes is tens of megabytes. Acceptable on a free tier, but the slideshow must stream rather than block on a full preload.

## Playback rules (CAP-2)

- Pace is a single exported constant `SLIDE_MS`, default `4000`, with an 800ms crossfade and a slow Ken-Burns zoom. `1000` — Eran's original request — stays valid; see `SPEC.md § Assumptions`.
- Never go below 1000ms: rapid flashing is a genuine accessibility hazard.
- Two stacked layers cross-fading; never a hard cut at the loop seam.
- Order is chronological, giving the loop an "our story so far" arc.
- Pause on `visibilitychange` when hidden, to spare her battery.
- Under `prefers-reduced-motion`: drop Ken-Burns, keep a plain fade.
- Controls, minimal: tap to pause/resume, swipe for next/previous, long-press to hold. The photos are the interface — no persistent chrome.
