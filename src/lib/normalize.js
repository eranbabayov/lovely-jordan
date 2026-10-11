/**
 * Hebrew answer normalization — the SINGLE implementation.
 *
 * Deliberately plain `.js` (with a sibling `.d.ts`) so the browser bundle and
 * the Node seal script import the very same code. `stack.md` is explicit that
 * a second copy would drift, and drift here means gifts that cannot be opened.
 *
 * Governing principle: being locked out of your own gift is the worst outcome
 * this app can produce. Matching is forgiving on purpose.
 */

/** Niqqud and cantillation marks. */
const NIQQUD = /[֑-ׇ]/g;
/** Bidi control marks, which paste in invisibly from other apps. */
const BIDI = /[‎‏‪-‮⁦-⁩]/g;
/** Geresh, gershayim, and the quote variants mobile keyboards produce. */
const QUOTES = /['"`׳״‘’“”]/g;
/** Everything that is not a Hebrew letter, digit, or latin letter. */
const NON_WORD = /[^א-ת0-9a-z]/gi;

/**
 * Fold word-final letter forms onto their medial equivalents, so a trailing
 * ן and נ compare equal. Harmless, and it rescues her from autocomplete.
 */
const FINALS = [
  [/ך/g, 'כ'], // ך -> כ
  [/ם/g, 'מ'], // ם -> מ
  [/ן/g, 'נ'], // ן -> נ
  [/ף/g, 'פ'], // ף -> פ
  [/ץ/g, 'צ'], // ץ -> צ
];

/**
 * Reduce input to its comparable form. Absorbs vowel points, spaces,
 * punctuation, bidi marks, quote variants, and final-letter spelling.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function normalize(input) {
  let out = String(input ?? '')
    .normalize('NFKD')
    .replace(NIQQUD, '')
    .replace(BIDI, '')
    .replace(QUOTES, '')
    .replace(NON_WORD, '');
  for (const [pattern, replacement] of FINALS) {
    out = out.replace(pattern, replacement);
  }
  return out.toLowerCase();
}

/** The Hebrew possessive proclitic "של" ("of"). */
const SHEL = 'של';

/**
 * Reduce input to its KEY-DERIVATION form.
 *
 * Verification compares against a list of accepted digests, so two spellings
 * of one answer are fine there. Key derivation cannot work that way: both
 * spellings must produce the *same* key, or a gift sealed under one spelling
 * is unopenable by someone who typed the other.
 *
 * Collapsing a leading "של" does it — "של ערן" and "ערן" both canonicalize to
 * the same string — without putting any answer plaintext in the bundle.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function canonicalize(input) {
  const n = normalize(input);
  return n.startsWith(SHEL) ? n.slice(SHEL.length) : n;
}

/**
 * Join per-question canonical forms into the key-derivation material.
 * Order is the question order; the separator cannot occur in a canonical form.
 *
 * @param {readonly unknown[]} answers
 * @returns {string}
 */
export function keyMaterial(answers) {
  return answers.map((a) => canonicalize(a)).join('|');
}
