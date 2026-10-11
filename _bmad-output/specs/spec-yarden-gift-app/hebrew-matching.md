# Hebrew Matching and Copy

Companion to `SPEC.md`, governing CAP-1 and the countdown text in CAP-3.

**Governing principle: being locked out of your own gift is the worst outcome this app can produce.** Matching is forgiving by design, and every ambiguity resolves toward admitting her.

## The questions and their accepted answers

| | Question | Accepted input | Normalized form | Canonical (key) |
|---|---|---|---|---|
| Q1 | `איך אני קורא לך?` | `יפיופה` · `יפיופה שלי` | `יפיופה` · `יפיופהשלי` | `יפיופה` |
| Q2 | `של מי את?` | `של ערן` · `ערן` · `שֶׁל עֵרָן` · `" ערן "` | `שלערנ` · `ערנ` | `ערנ` |

Each question holds **two** accepted digests, one per spelling.

## Two normalizations, and why

Verification and key derivation need different things, so there are two functions:

- **`normalize()`** — used to compare against the digest list. Several spellings may map to several digests; that is fine and intended.
- **`canonicalize()`** — used to derive the gift key. Here every accepted spelling of a question **must** collapse to one string, because a gift sealed under one spelling would otherwise be permanently unopenable by someone who typed another.

`canonicalize()` achieves that by stripping two Hebrew possessives: a trailing `שלי` (so `יפיופה שלי` ≡ `יפיופה`) and a leading `של` (so `של ערן` ≡ `ערן`). Trailing first, so a phrase carrying both loses both ends.

Resulting key material across all **four** combinations: `יפיופה|ערנ`. `npm run check` asserts this exhaustively — adding a spelling that breaks it fails the suite rather than silently bricking the gifts.

## Normalization

Applied to her input and to the answers at seal/hash time — the same function, or they drift apart.

```js
// src/lib/normalize.ts
export function normalize(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[֑-ׇ]/g, '')              // niqqud + cantillation
    .replace(/[‎‏‪-‮]/g, '')  // bidi control marks
    .replace(/[׳״"'`]/g, '')            // geresh, gershayim, quotes
    .replace(/[^א-ת0-9a-z]/gi, '')      // drop spaces + punctuation
    .replace(/ך/g, 'כ').replace(/ם/g, 'מ')        // fold final letters
    .replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ')
    .toLowerCase();
}
```

What this absorbs: vowel points, trailing and interior spaces, question marks and periods, mobile-keyboard quote variants, bidi marks pasted from elsewhere, and final-letter spelling. Folding finals means `ערן` and `ערנ` both pass — harmless, and it rescues her from autocomplete.

Storage: `sha256(normalize(answer))` hex, never plaintext (see `threat-model.md`).

## Failure escalation

No attempt limit, no cooldown, no lockout — ever.

| Attempt | Response |
|---|---|
| 1–2 | Gentle shake, warm message: `לא בדיוק… תחשבי שוב 💭` |
| 3–5 | Show that question's hint |
| 6+ | Reveal the answer's first letter |

Suggested hints: Q1 — `ככה אני קורא לך כשאת מתעוררת`; Q2 — `שתי מילים. השנייה זה השם שלי`.

## Countdown pluralization

Hebrew pluralizes unlike English and has a dual form. `2 ימים` is wrong.

| Remaining | Text |
|---|---|
| 1 day | `יום אחד` |
| 2 days | `יומיים` |
| 3–10 days | `3 ימים` |
| 1 hour | `שעה אחת` |
| 2 hours | `שעתיים` |
| 3+ hours | `5 שעות` |
| under 1 hour | live `MM:SS`, ticking each second |

Same dual-form rule for `שבועיים` and `דקותיים`-class units if used. Numerals render as Western digits inside RTL text — verify they do not visually reorder in the final layout.

## Copy direction

Warm, lowercase-feeling, second-person feminine throughout (`את`, `תחשבי`, `לך`). Never formal, never system-voiced: no `שגיאה`, no `אנא נסה שוב`. Error states are affectionate, not corrective.
