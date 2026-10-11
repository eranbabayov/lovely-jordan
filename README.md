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
src/config.ts  the one file to edit: pace, questions, gifts, reveal times
public/        static assets; build output for images and sealed gifts lands here
```

## Status

Story 1 of 7 complete: RTL shell, build, deploy config. Stories 2–7 add the
image pipeline, slideshow, gate, countdowns, sealing, and the PWA shell —
see `stories.yaml` in the spec folder.
