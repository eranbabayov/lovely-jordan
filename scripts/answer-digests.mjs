/**
 * Prints the SHA-256 digests to paste into `src/config.ts`, and asserts that
 * every accepted spelling in `hebrew-matching.md` really normalizes the way the
 * spec claims.
 *
 *   node scripts/answer-digests.mjs
 *
 * The plaintext answers are NOT in this file — they live in the gitignored
 * `secrets/answers.mjs`, because anyone holding them can derive the gift key
 * and open everything. Only digests belong in version control.
 */

import { createHash } from 'node:crypto';
import { normalize, canonicalize, keyMaterial } from '../src/lib/normalize.js';
import { ACCEPTED_ANSWERS, FORGIVENESS_CASES } from '../secrets/answers.mjs';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

/** Question text is not secret; the answers come from secrets/. */
const QUESTION_TEXT = ['איך אני קורא לך?', 'של מי את?'];

const QUESTIONS = QUESTION_TEXT.map((q, i) => ({
  q,
  accepted: ACCEPTED_ANSWERS[i] ?? [],
}));

let failures = 0;

console.log('\nNormalization');
for (const { q, accepted } of QUESTIONS) {
  console.log(`  ${q}`);
  for (const a of accepted) {
    console.log(`    ${a.padEnd(10)} normalize=${normalize(a).padEnd(10)} canonical=${canonicalize(a)}`);
  }
}

console.log('\nForgiveness (messy input must match an accepted spelling)');
for (const [messy, expectedSameAs] of FORGIVENESS_CASES) {
  const ok = normalize(messy) === normalize(expectedSameAs);
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${JSON.stringify(messy).padEnd(22)} -> ${normalize(messy)}`);
}

// The critical invariant: both spellings of question 2 must canonicalize
// identically, or a gift sealed under one is unopenable by the other.
console.log('\nKey-derivation invariant');
const [q2a, q2b] = QUESTIONS[1].accepted;
const sameCanonical = canonicalize(q2a) === canonicalize(q2b);
if (!sameCanonical) failures += 1;
console.log(`  ${sameCanonical ? 'ok  ' : 'FAIL'}  canonicalize(${q2a}) === canonicalize(${q2b}) -> ${canonicalize(q2a)}`);

const material = keyMaterial(['יפיופה', 'של ערן']);
const materialAlt = keyMaterial(['יפיופה', 'ערן']);
const sameMaterial = material === materialAlt;
if (!sameMaterial) failures += 1;
console.log(`  ${sameMaterial ? 'ok  ' : 'FAIL'}  both spellings yield identical key material -> ${material}`);

// The browser hashes with crypto.subtle, not node:crypto. If those two ever
// disagreed, the gate would reject every correct answer. webcrypto here is the
// same implementation the browser exposes.
console.log('\nNode createHash vs WebCrypto subtle.digest');
const { webcrypto } = await import('node:crypto');
const enc = new TextEncoder();
for (const { accepted } of QUESTIONS) {
  for (const a of accepted) {
    const n = normalize(a);
    const viaNode = sha256(n);
    const viaSubtle = Buffer.from(
      await webcrypto.subtle.digest('SHA-256', enc.encode(n)),
    ).toString('hex');
    const ok = viaNode === viaSubtle;
    if (!ok) failures += 1;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${n.padEnd(10)} ${viaNode.slice(0, 16)}…`);
  }
}

console.log('\nDigests for src/config.ts');
for (const { q, accepted } of QUESTIONS) {
  const digests = accepted.map((a) => sha256(normalize(a)));
  console.log(`  ${q}`);
  for (const d of digests) console.log(`    '${d}',`);
  console.log(`    firstLetter: '${accepted[0].trim()[0]}'`);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
