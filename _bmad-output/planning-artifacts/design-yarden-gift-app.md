# Yarden Gift App — Design Document

**Author:** Eran · **Date:** 2026-10-11 · **Status:** Draft for review

A private, static web app: a looping photo slideshow plus a shelf of time-locked
gifts that Yarden unlocks by answering two personal questions. Hebrew, RTL,
mobile-first, no database, free static hosting.

---

## 1. Scope

| | |
|---|---|
| **Audience** | One person (Yarden). No accounts, no analytics, no multi-user. |
| **Primary device** | Her phone. Desktop is a nice-to-have. |
| **Language** | Hebrew only, `dir="rtl"`. |
| **Backend** | None. Pure static files. |
| **Hosting** | Cloudflare Pages / Netlify / Vercel free tier (all give HTTPS). |
| **Longevity** | Must be easy to add gifts and photos later. |

### Out of scope
Real authentication, server-enforced time locks, image upload UI, i18n.

---

## 2. User flow

```
┌─────────────────────────────────────────────────────────┐
│  1. OPENING                                             │
│     Soft animated intro, one line of text, "התחילי" tap │
│     (this tap is also the browser gesture that unlocks  │
│      audio autoplay — see §7)                           │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  2. THE RITUAL (gate)                                   │
│     Q1: איך אני קורא לך?      → יפיופה                   │
│     Q2: של מי את?             → של ערן │ ערן             │
│     Unlimited attempts, gentle hints, never locks out   │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  3. HOME (unlocked, remembered in localStorage)         │
│     ┌───────────────────────────────────────────────┐   │
│     │  Full-bleed slideshow, auto-advancing loop    │   │
│     └───────────────────────────────────────────────┘   │
│     ┌───────────────────────────────────────────────┐   │
│     │  🎁 GIFT SHELF                                │   │
│     │  [locked 🎁]  [locked 🎁]  [OPEN NOW ✨]      │   │
│     │   03:12:44      12 ימים                        │   │
│     └───────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  4. GIFT OPENING                                        │
│     Box shakes → lid flies off → confetti → content     │
│     Content: letter / photo / video / voucher / map      │
│     Opened gifts stay openable forever                  │
└─────────────────────────────────────────────────────────┘
```

**Design decision — one gate, not per-gift.** You asked for the questions to
guard the gifts. I'd put the gate in front of the *whole app* instead: the
photos are personal too, and anyone with the URL would otherwise see them. One
ritual at entry, remembered in `localStorage` so she isn't re-interrogated every
visit. Per-gift questions are easy to add later if you want each gift to have
its own riddle — the gate component is reusable.

---

## 3. The honest part: what the locks actually do

This matters, so it's stated plainly rather than buried.

**With no backend, every secret ships to the browser.** The answers, the gift
contents, and the reveal dates are all in files the client downloads. The design
below raises the effort bar a lot, but none of it is real security:

| Threat | Protection | Real? |
|---|---|---|
| Yarden casually peeks at View Source and spoils the surprise | Answers stored as SHA-256 hashes; gift contents AES-GCM encrypted | **Yes** — genuinely unreadable without the answers |
| Yarden guesses the answers early and decrypts all gifts | — | **No.** She knows the answers; they're about her |
| Yarden changes her phone clock to skip a countdown | Time fetched from the server's HTTP `Date` header | **Mostly** — stops the casual trick, not devtools |
| A determined person with devtools | — | **No** |

**The threat model is "my impatient girlfriend", not an attacker.** For that,
this is more than enough. Encryption keyed on the answers means the Q&A does
actual cryptographic work instead of being a UI check that anyone can skip by
editing a variable — that alone is worth doing.

**If you want a genuinely unbreakable time lock**, there is exactly one way
without a backend: don't ship the gift's key until reveal time. A GitHub Actions
cron job can commit the key and redeploy at the chosen moment. It's maybe 30
extra lines. My recommendation: **skip it for v1**, use the soft lock, and add it
later only for a gift where premature opening would genuinely ruin something
(a proposal, a surprise trip).

---

## 4. Answer matching

The single biggest UX risk in this app is **locking Yarden out over a space or a
niqqud mark.** Matching must be aggressively forgiving.

```js
// src/lib/normalize.js
export function normalize(input) {
  return input
    .normalize('NFKD')
    .replace(/[֑-ׇ]/g, '')            // niqqud + cantillation
    .replace(/[‎‏‪-‮]/g, '') // bidi control marks
    .replace(/[״׳"'`]/g, '')                     // geresh / gershayim / quotes
    .replace(/[^א-ת0-9a-z]/gi, '')     // drop spaces & punctuation
    .replace(/ך/g, 'כ').replace(/ם/g, 'מ')       // fold final letters
    .replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ')
    .toLowerCase();
}
```

Resulting accepted values:

| Question | Accepts | Normalized |
|---|---|---|
| `איך אני קורא לך?` | יפיופה | `יפיופה` |
| `של מי את?` | של ערן · ערן · שֶׁל עֵרָן · " ערן " | `שלערנ` · `ערנ` |

Final-letter folding means `ערן` and `ערנ` both pass — harmless, and it saves
her if autocomplete does something odd.

**Storage.** Config holds `sha256(normalize(answer))` hex digests, never the
plaintext, so the answers aren't sitting in the JS bundle.

> ⚠️ **Deployment constraint:** `crypto.subtle` (needed for hashing and
> decryption) only exists in a **secure context** — HTTPS or `localhost`. Serving
> this over plain `http://` from a bare IP will silently break the gate. Every
> recommended host gives you HTTPS by default, so just don't self-host over HTTP.

**Failure UX:** no attempt limit ever. Wrong answer → gentle shake, a warm
message ("לא בדיוק… תחשבי שוב 💭"). After 3 tries, reveal a hint. After 6, show
the first letter. She must never hit a dead end on her own gift.

---

## 5. Gift reveal timing

Reveal moments are stored as **ISO strings with an explicit offset**, so the
countdown is correct no matter where her device thinks it is:

```js
revealAt: '2026-02-14T20:00:00+03:00'  // Israel DST (summer)
revealAt: '2026-12-25T20:00:00+02:00'  // Israel standard (winter)
```

Pin the wall-clock intent to `Asia/Jerusalem` and write the matching offset.
Getting DST wrong shifts a reveal by an hour — worth double-checking per gift.

**Clock source.** A neat trick that needs no third-party API: read the `Date`
header off your own site.

```js
const res = await fetch(location.href, { method: 'HEAD', cache: 'no-store' });
const serverNow = new Date(res.headers.get('Date'));   // ± a second
// cache the offset from local clock, fall back to Date.now() if it fails
```

**Countdown display.** Hebrew pluralization done properly, not `2 יום`:

| Amount | Text |
|---|---|
| 1 | `יום אחד` |
| 2 | `יומיים` |
| 3–10 | `3 ימים` |
| < 1 hour | live `MM:SS`, ticking |

A locked gift shows its silhouette and countdown — anticipation is half the
gift. At `T-60s` the box starts trembling. At zero: confetti and a chime.

---

## 6. Photo slideshow

### On the 1-second interval
You asked for 1s. I'd push back gently: at one second per photo with a hard cut,
a romantic slideshow reads as a strobe, and it's rough on the eyes on a bright
phone screen. Two options, both configurable in one constant:

- **`4000ms` + 800ms crossfade + slow Ken-Burns zoom** — my recommendation. Feels
  like a memory, gives each photo room to land.
- **`1000ms` rapid montage** — works *as a deliberate effect* if it's a burst at
  the opening and then settles into the slower pace.

Shipping it as `SLIDE_MS` means you can try both in ten seconds and keep what
feels right. (If you do keep 1s: cap it there, don't go faster — rapid flashing
is a genuine accessibility concern.)

### The manifest problem
Static hosts don't expose directory listings, so the app can't discover
`images/` at runtime. A build script generates a manifest:

```
node scripts/build-images.mjs
  images/*.{jpg,png,heic,webp}
    → resize to max 1600px, encode WebP q80
    → emit 2 sizes (phone / desktop) + a tiny blurred LQIP placeholder
    → write public/images/manifest.json
```

```json
[
  { "src": "img/001.webp", "w": 1600, "h": 1067,
    "lqip": "data:image/webp;base64,UklGR…",
    "caption": "הפעם הראשונה בחוף" }
]
```

Optional `caption` per photo — a line of Hebrew text fading in over the corner
of a picture is a disproportionately large emotional payoff for the effort.

### Things that will bite
- **HEIC.** iPhone photos are HEIC and **browsers can't display them.** The
  build script must convert them (`heic-convert`, or `sharp` with libheif).
  Don't discover this with 300 photos already in the folder.
- **EXIF rotation.** Phone photos carry orientation flags; `sharp().rotate()`
  bakes them in, otherwise half your portraits show up sideways.
- **Preloading.** At a fast interval, decode time causes visible stutter.
  Preload the next 3 images and call `img.decode()` before swapping.
- **Battery.** Pause the loop on `visibilitychange` when the tab is hidden.
- **Order.** Shuffle, or sort chronologically by EXIF date for a
  "our story so far" arc? Chronological is the stronger choice if the photos
  span the relationship.

### Controls
Tap to pause/play · swipe for next/previous · long-press to hold on one photo.
Minimal chrome — the photos are the interface.

---

## 7. Extra suggestions

You asked, so here are the ones I think actually earn their complexity:

**High value, low effort**
1. **Make it installable (PWA).** A `webmanifest` + icon means she can add it to
   her home screen and it opens fullscreen with no browser bars — it stops
   feeling like a webpage and starts feeling like *an app you made her*. Biggest
   perception win available for ~20 lines.
2. **Music.** One soft track, muted toggle always visible. Autoplay is blocked
   by every mobile browser, which is exactly why the opening "התחילי" tap exists
   — use that gesture to start playback.
3. **`robots.txt` with `noindex` + a non-guessable URL.** Keeps her photos out
   of search engines.
4. **`100dvh`, not `100vh`.** On iOS Safari `100vh` is taller than the visible
   area and your layout will be cut off by the address bar. Classic trap.
5. **A real letter as the first gift**, already unlocked, no countdown. She opens
   the app and immediately gets something — then discovers the locked ones.

**Worth considering**
6. **Varied gift types** so the shelf isn't repetitive: a letter, a voice note
   (very underrated — your actual voice), a video, a photo with a story, a
   real-world voucher ("שובר לעיסוי אחד"), a Spotify playlist, a map pin for a
   date you've booked.
7. **A physical hint.** Write the first question's answer on a paper note and
   leave it with the link. Bridging screen and real world makes it a gift rather
   than a website.
8. **A hidden gift.** Something that only appears after she's opened all the
   others, or after a long-press on a specific photo. Easter eggs are delightful
   and cost nothing.
9. **Per-gift questions.** If a particular gift deserves its own riddle, the gate
   component already supports it.

**Skip for now**
Share buttons, light/dark toggle, multi-language, any form of analytics. Wrong
app for all of it.

---

## 8. Technical design

### Stack
**Vite + React + TypeScript + Tailwind.** Rationale: the gate → countdown →
unlock state machine is genuinely stateful and React keeps it readable; Vite
outputs a plain static `dist/` that drops onto any host; TS catches date and
config mistakes at build time. A zero-build vanilla ES-modules version is viable
if you'd rather have no toolchain at all — say so and I'll design that instead.

### Layout
```
lovely-jordan/
├─ images/                     ← you drop originals here (gitignored)
├─ gifts-src/                  ← PLAINTEXT gift content (gitignored!)
│  ├─ 01-letter.md
│  └─ 02-voice.m4a
├─ scripts/
│  ├─ build-images.mjs         ← resize, convert HEIC, write manifest
│  └─ seal-gifts.mjs           ← encrypt gifts-src → public/gifts/*.sealed.json
├─ src/
│  ├─ config.ts                ← gift list, reveal dates, answer hashes
│  ├─ lib/{normalize,crypto,time,hebrew}.ts
│  └─ components/{Opening,Gate,Slideshow,GiftShelf,GiftBox,Countdown,Confetti}.tsx
├─ public/
│  ├─ images/…  manifest.json
│  ├─ gifts/*.sealed.json
│  ├─ manifest.webmanifest
│  └─ robots.txt
└─ index.html                  ← <html lang="he" dir="rtl">
```

> 🔒 **`gifts-src/` must be gitignored.** If it's committed, the entire surprise
> is one `git log` away — and if the repo is ever public, it's just sitting there.
> Only the sealed ciphertext belongs in version control.

### Crypto
```
key   = PBKDF2-SHA256(normalize(a1) + '|' + normalize(a2), salt, 250_000) → AES-256-GCM
seal  = { iv, ciphertext } base64, one JSON file per gift
```
Decryption happens once at unlock; plaintext is held in memory only. `seal-gifts.mjs`
runs the same derivation in Node, so sealing and opening can't drift apart.

### Config — the one file you'll edit
```ts
export const SLIDE_MS = 4000;

export const ANSWERS = [
  { q: 'איך אני קורא לך?', hash: '…', hint: 'ככה אני קורא לך כשאת מתעוררת' },
  { q: 'של מי את?',        hash: '…', hint: 'שתי מילים. השנייה זה השם שלי' },
];

export const GIFTS = [
  { id: 'g1', title: 'מכתב',  emoji: '💌', kind: 'letter',
    revealAt: null,                        sealed: '/gifts/g1.sealed.json' },
  { id: 'g2', title: 'הפתעה', emoji: '🎁', kind: 'video',
    revealAt: '2026-02-14T20:00:00+02:00', sealed: '/gifts/g2.sealed.json' },
];
```
`revealAt: null` = available immediately. Adding a gift later is: drop the file
in `gifts-src/`, add a line here, run `npm run seal`, redeploy.

### Visual direction
Warm and intimate, not corporate: deep plum/night background, soft gold accents,
generous whitespace, one rounded Hebrew display font (Heebo or Assistant, both
have excellent Hebrew). Gift boxes as CSS 3D shapes with a ribbon, a slow idle
float, and a satisfying lid-off animation. Respect
`prefers-reduced-motion` by swapping the Ken-Burns and confetti for plain fades.

### Deploy
`npm run build` → drag `dist/` to Netlify, or connect a **private** repo to
Cloudflare Pages for auto-deploy on push. Free, HTTPS, custom domain if you want
one (`yarden.co.il`-style domains are cheap and would be a lovely touch).

---

## 9. Open items

| # | Item | Needed by |
|---|---|---|
| 1 | The photos → `images/` | before first build |
| 2 | How many gifts, and what's inside each | before sealing |
| 3 | Reveal datetimes (Israel time) | can be set/changed any time |
| 4 | Slideshow pace: 4s crossfade or 1s montage | one-constant change |
| 5 | Gate the whole app, or just the gifts? (recommend: whole app) | before build |
| 6 | Background music track | optional |

## 10. Build order

1. Scaffold Vite + RTL shell, deploy an empty page — prove hosting works first
2. Image pipeline + slideshow (the part that needs your photos)
3. Gate: normalization, hashing, hint escalation
4. Gift shelf, countdowns, server-time offset
5. Seal script + decryption + opening animation
6. PWA, music, confetti, polish
7. Test on *her* actual phone model before showing her
