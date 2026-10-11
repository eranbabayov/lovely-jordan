# בשבילך — a gift for Yarden

A private, static, no-backend web app: a looping photo slideshow and a shelf of
time-locked gifts behind two personal questions.

The contract lives in `_bmad-output/specs/spec-yarden-gift-app/` — `SPEC.md`
plus its companions. Read those before changing behaviour.

## Commands

| | |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | typecheck, then build to `dist/` |
| `npm run preview` | serve the built `dist/` locally |
| `npm run images` | rebuild photos + manifest from `images/` |
| `npm run seal` | encrypt `gifts-src/` into `public/gifts/` |
| `npm run icons` | regenerate app icons |
| `npm run digests` | print answer digests for `src/config.ts` |
| `npm run check` | run every correctness check |

**Run `npm run check` before deploying.** It verifies answer normalization,
Hebrew countdown dual forms, the reveal-date DST offsets, and the full
seal/unseal round trip — including that every accepted spelling opens a gift
sealed under the canonical one.

## Changing things later

| To do this | Change this |
|---|---|
| Swap a gift's content | edit `gifts-src/<id>.md`, `npm run seal` |
| Add or remove a gift | add the file, add one entry to `GIFTS` in `src/config.ts`, `npm run seal` |
| Change a reveal time | `revealAt` in `src/config.ts` (ISO with explicit offset) |
| Change slideshow pace | `SLIDE_MS` in `src/config.ts` |
| Add photos | drop them in `images/`, `npm run images` |
| Add music | put the file in `public/`, set `MUSIC_SRC` in `src/config.ts` |
| Add a photo caption | `caption` in `public/images/manifest.json` (survives re-runs) |

## Deploying

Output is a plain static `dist/`. Any of these free tiers work and all give
HTTPS:

- **Netlify** — `netlify.toml` is already here; drag `dist/` in, or connect the repo.
- **Cloudflare Pages** — build `npm run build`, output directory `dist`.
- **Vercel** — framework preset Vite, no config needed.

Two rules:

1. **HTTPS is mandatory, not a nicety.** `crypto.subtle` only exists in a
   secure context, so the gate and the gift decryption both fail silently over
   plain `http://`. All three hosts above give it by default; do not self-host
   over HTTP.
2. **Keep the repo private.** `gifts-src/` is gitignored, but a private repo is
   the belt to that braces.

`public/_headers` sets `noindex` on Netlify and Cloudflare Pages.

## What is where

```
images/        original photos (gitignored) — 25 JPEGs
gifts-src/     PLAINTEXT gift content (gitignored, never commit)
secrets/       PLAINTEXT gate answers (gitignored, never commit)
src/config.ts  the one file to edit: pace, questions, gifts, reveal times
public/        static assets; generated images and sealed gifts land here
```

Two directories are gitignored because they hold secrets, not because they are
noise: `gifts-src/` and `secrets/`. Committing either defeats the sealing
entirely — anyone with repo access could derive the key and open every gift.

## Status

All 7 stories complete. The app builds to a 5.23 MB static `dist/` and has not
yet been deployed or opened on a real phone.

