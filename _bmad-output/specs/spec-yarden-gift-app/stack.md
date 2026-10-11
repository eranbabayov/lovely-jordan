# Stack, Layout and Conventions

Companion to `SPEC.md`. Holds the implementation prescription the kernel deliberately omits.

## Stack

**Vite + React + TypeScript + Tailwind**, building to a static `dist/`.

The gate → countdown → unseal → open flow is genuinely stateful, and React keeps that legible; TypeScript catches config and date mistakes at build time; Vite still emits plain static files, so the no-backend constraint holds. A zero-build vanilla ES-modules variant remains viable if the toolchain is ever unwanted — the architecture does not depend on React.

## Repository layout

```
lovely-jordan/
├─ images/                     ← originals, HEIC included (gitignored)
├─ gifts-src/                  ← PLAINTEXT gift content (gitignored — see threat-model.md)
├─ scripts/
│  ├─ build-images.mjs         ← convert, resize, manifest  (image-pipeline.md)
│  └─ seal-gifts.mjs           ← encrypt gifts-src → sealed JSON
├─ src/
│  ├─ config.ts                ← the one file Eran edits
│  ├─ lib/{normalize,crypto,time,hebrew}.ts
│  └─ components/{Opening,Gate,Slideshow,GiftShelf,GiftBox,Countdown,Confetti}.tsx
├─ public/
│  ├─ images/… manifest.json
│  ├─ gifts/*.sealed.json      ← ciphertext only
│  ├─ manifest.webmanifest     ← CAP-7
│  └─ robots.txt               ← noindex
└─ index.html                  ← <html lang="he" dir="rtl">
```

## Crypto (CAP-5)

```
key  = PBKDF2-SHA256( normalize(a1) + '|' + normalize(a2), salt, 250_000 iterations ) → AES-256-GCM
seal = { iv, ciphertext }  base64, one JSON file per gift
```

`seal-gifts.mjs` performs the identical derivation in Node, so sealing and unsealing cannot drift. Q2 has two accepted answers (`hebrew-matching.md`), so sealing uses one canonical choice and unsealing tries each accepted normalization until the GCM tag validates — a wrong key fails authentication cleanly rather than yielding garbage.

Derived key is session-memory only: never persisted, never logged.

## Clock (CAP-3)

```js
const res = await fetch(location.href, { method: 'HEAD', cache: 'no-store' });
const serverNow = new Date(res.headers.get('Date'));
// cache (serverNow - Date.now()) as an offset; re-apply on every tick
```

Reads the host's own `Date` response header — no third-party time API, no extra dependency. Cache the offset once per session and apply it to every countdown tick. On failure (offline, header stripped by a CDN) fall back to `Date.now()`; a soft lock is acceptable, a broken countdown is not.

Reveal times are ISO-8601 with an **explicit offset**, wall-clock intent pinned to `Asia/Jerusalem`:

```
2026-02-14T20:00:00+02:00   ← Israel standard time (winter)
2026-07-14T20:00:00+03:00   ← Israel daylight time (summer)
```

Writing the wrong offset shifts a reveal by an hour. Verify per gift against the target date's DST state.

## Config — the one file Eran edits (CAP-6)

```ts
export const SLIDE_MS = 4000;

export const ANSWERS = [
  { q: 'איך אני קורא לך?', digests: ['…'],      hint: 'ככה אני קורא לך כשאת מתעוררת' },
  { q: 'של מי את?',        digests: ['…', '…'], hint: 'שתי מילים. השנייה זה השם שלי' },
];

export const GIFTS = [
  { id: 'g1', title: 'מכתב',  emoji: '💌', kind: 'letter',
    revealAt: null,                        sealed: '/gifts/g1.sealed.json' },
  { id: 'g2', title: 'הפתעה', emoji: '🎁', kind: 'video',
    revealAt: '2026-02-14T20:00:00+02:00', sealed: '/gifts/g2.sealed.json' },
];
```

`revealAt: null` = open immediately. Gift `kind` drives the renderer: `letter | photo | video | audio | voucher | link`.

Adding a gift later: drop the file in `gifts-src/`, add one entry here, `npm run seal`, redeploy.

## Visual direction

Warm and intimate, not corporate. Deep plum/night ground, soft gold accents, generous whitespace, one rounded Hebrew display face (Heebo or Assistant — both have genuinely good Hebrew). Gift boxes as CSS 3D forms with a ribbon, a slow idle float, a tremble at T-60s, and a satisfying lid-off. A soft chime the instant a countdown reaches zero, and confetti on open — both suppressed while muted (CAP-8). All motion degrades to fades under `prefers-reduced-motion`.

## Platform rules

- `100dvh`, never `100vh` — iOS Safari clips the latter behind the address bar.
- Respect `env(safe-area-inset-*)` for notch and home-indicator margins.
- Tap targets ≥ 44px; the gate input must not trigger zoom on focus (font-size ≥ 16px).
- RTL-aware animation direction: slide and swipe directions mirror.

## Deploy

`npm run build` → `dist/` to Cloudflare Pages or Netlify from a **private** repo. Free tier, HTTPS by default (mandatory — see `SPEC.md § Constraints`), auto-deploy on push. `robots.txt` with `noindex`, plus a non-guessable URL. A custom domain is optional and purely sentimental.

## Build order

1. Vite + RTL shell, deployed empty — prove hosting and HTTPS before anything depends on them
2. Image pipeline + slideshow (CAP-2)
3. Gate: normalization, digests, hint escalation (CAP-1)
4. Gift shelf, countdowns, clock offset (CAP-3)
5. Seal script, unseal, opening sequence (CAP-4, CAP-5)
6. PWA, music, confetti, polish (CAP-7, CAP-8)
7. Test on Yarden's actual phone model before she ever sees it
