---
title: 'Seal, unseal, and the gift-opening sequence'
type: 'feature'
created: '2026-10-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-yarden-gift-app/threat-model.md'
  - '{project-root}/_bmad-output/specs/spec-yarden-gift-app/stack.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CAP-5 requires gift contents unreadable from the delivered files without the gate answers, and CAP-4 requires opening to be a moment of ceremony rather than a page transition.

**Approach:** A Node seal script encrypts `gifts-src/` into ciphertext-only JSON under a key derived from the canonical answers; the browser derives the same key from her answers and decrypts on open, behind a box-opening sequence and a renderer per gift kind.

</frozen-after-approval>

## Implementation Notes

> ⚠️ This story carried `spec_checkpoint: true`, waived by "continue to all the
> other steps". The security finding below is the item most worth your review.

### Security finding in my own earlier work

Story 4 committed the **plaintext answers** inside
`scripts/answer-digests.mjs`. Anyone with repository access could derive the
gift key and open every gift — defeating CAP-5 for exactly the reason
`gifts-src/` is gitignored. Fixed forward: the answers (and the test cases that
embed them) now live in `secrets/answers.mjs`, which is gitignored, and both
scripts import from there.

**The git history still contains them** in commit `862a578`. Nothing has been
pushed, so this is recoverable, but it needs Eran's decision: leave it and rely
on the repository being private, or rewrite that commit. Rewriting history is
destructive, so I did not do it unasked.

### Crypto

**Node's WebCrypto on both sides, not `createCipheriv`.** This removes the
single most dangerous failure mode in the project. The legacy Node API returns
the GCM auth tag *separately*, while the browser's `crypto.subtle.decrypt`
expects it appended to the ciphertext — a mismatch that would produce gifts
that seal fine and never open. Using `webcrypto.subtle` for sealing means both
sides run the same algorithm through the same interface, with no manual tag
handling to get wrong. Shared parameters live in `seal-params.js` so they
cannot drift.

**The round-trip test came before the UI**, as the dispatch note required.
`scripts/check-seal.mjs` asserts: plaintext survives exactly; ciphertext
contains no plaintext; **every** accepted spelling of question 2 opens a gift
sealed under the canonical one (the invariant the whole canonicalize design
exists for); wrong answers fail authentication rather than returning garbage;
a single flipped ciphertext byte is rejected by the GCM tag; 4 KiB of random
binary round-trips byte-identically; and two seals of identical content use
different IVs.

### Bug found during implementation

`npm run seal` silently did nothing and wrote no files. The CLI guard compared
`import.meta.url` against a hand-built `` `file://${process.argv[1]}` ``, but on
Windows `import.meta.url` is `file:///C:/...` with three slashes, so the
comparison never matched and `main()` never ran. Now uses `pathToFileURL`.
Worth remembering: this failed *silently*, with exit code 0.

**Decisions:**
- Seal script discovers gifts by filename in `gifts-src/`, inferring kind and
  MIME from the extension, rather than parsing `config.ts` from Node. The
  config lists ids; the filesystem supplies content.
- The reveal waits out the full `SHAKE_MS` even when decryption is instant, so
  the ceremony lands on a fast connection instead of flashing past.
- Binary kinds become blob URLs, revoked on unmount and on cancelled loads.
- Failure is retryable and never destructive: no attempt counting, no state
  wiped, just a close button.
- Unsupported seal versions and missing `iv`/`ciphertext` are rejected with a
  clear message rather than throwing deep inside WebCrypto.
- Opened ids persist in `localStorage`, so the shelf's "פתוח" label stays
  truthful across visits. Gifts remain reopenable regardless.
- Escape closes the overlay.

**Verified:** all three check suites pass (`npm run check`); three gifts sealed
to 157-byte ciphertext-only JSON; the sealed payload decodes to opaque bytes
with no readable plaintext; `dist/gifts/` receives all three; the dev server
serves them at HTTP 200; typecheck and build clean.

**Not verified:** the opening animation and content rendering in a real
browser. The crypto path is tested end to end through Node's WebCrypto, which
is the same API the browser exposes, but nothing has driven the actual UI.
