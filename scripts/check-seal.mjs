/**
 * Seal/unseal round trip. Run this BEFORE trusting any gift UI.
 *
 *   node scripts/check-seal.mjs       (part of: npm run check)
 *
 * The failure this guards against is the worst in the project: if sealing and
 * unsealing disagree on key derivation, gifts become PERMANENTLY unopenable and
 * the only symptom is a decrypt error at the moment she taps the box.
 *
 * Node's WebCrypto is the same API surface the browser exposes, so unsealing
 * here genuinely exercises the browser path.
 */

import { webcrypto } from 'node:crypto';
import { keyMaterial, canonicalize } from '../src/lib/normalize.js';
import { IV_BYTES, KEY_BITS, PBKDF2_ITERATIONS, PBKDF2_SALT } from '../src/lib/seal-params.js';
import { deriveKey, seal } from './seal-gifts.mjs';
import { ACCEPTED_ANSWERS, SEALING_ANSWERS, WRONG_ANSWER_PAIRS } from '../secrets/answers.mjs';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
let failures = 0;

function check(ok, label, detail = '') {
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `   ${detail}` : ''}`);
}

function fromBase64(b64) {
  const buf = Buffer.from(b64, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/** Mirrors `src/lib/crypto.ts` openSealed(). */
async function unseal(key, ivB64, ciphertextB64) {
  const iv = fromBase64(ivB64);
  if (iv.length !== IV_BYTES) throw new Error(`bad IV length ${iv.length}`);
  const plain = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    fromBase64(ciphertextB64),
  );
  return new Uint8Array(plain);
}

console.log('\nSealing parameters');
check(PBKDF2_ITERATIONS === 250_000, 'iterations', String(PBKDF2_ITERATIONS));
check(typeof PBKDF2_SALT === 'string' && PBKDF2_SALT.length > 0, 'salt present');
check(KEY_BITS === 256, 'key bits', String(KEY_BITS));
check(IV_BYTES === 12, 'iv bytes', String(IV_BYTES));

// ---- Text round trip ----
console.log('\nText round trip');
const sealingMaterial = keyMaterial(SEALING_ANSWERS);
const encryptKey = await deriveKey(sealingMaterial, ['encrypt']);

const message = 'gift1\nשורה בעברית עם ניקוד: שָׁלוֹם 💌\n';
const sealed = await seal(encryptKey, encoder.encode(message));

check(
  !Buffer.from(sealed.ciphertext, 'base64').includes(Buffer.from('gift1')),
  'ciphertext contains no plaintext',
);

const decryptKey = await deriveKey(sealingMaterial, ['decrypt']);
const opened = decoder.decode(await unseal(decryptKey, sealed.iv, sealed.ciphertext));
check(opened === message, 'plaintext survives the round trip exactly');

// ---- The critical invariant: EVERY accepted spelling must open the gift ----
console.log('\nEvery accepted spelling opens a gift sealed under the canonical one');
const [q1Spellings, q2Spellings] = ACCEPTED_ANSWERS;
for (const a1 of q1Spellings) {
  for (const a2 of q2Spellings) {
    const material = keyMaterial([a1, a2]);
    let ok = false;
    let detail = '';
    try {
      const k = await deriveKey(material, ['decrypt']);
      ok = decoder.decode(await unseal(k, sealed.iv, sealed.ciphertext)) === message;
      detail = `-> ${material}`;
    } catch (err) {
      detail = `threw: ${err.message}`;
    }
    check(ok, `"${a1}" + "${a2}"`, detail);
  }
}

// ---- Wrong answers must fail, not return garbage ----
console.log('\nWrong answers fail authentication');
for (const wrong of WRONG_ANSWER_PAIRS) {
  let threw = false;
  try {
    const k = await deriveKey(keyMaterial(wrong), ['decrypt']);
    await unseal(k, sealed.iv, sealed.ciphertext);
  } catch {
    threw = true;
  }
  check(threw, `"${wrong[0]}" + "${wrong[1]}" rejected`);
}

// ---- Tampering must be detected ----
console.log('\nTampering is detected');
{
  const bytes = Buffer.from(sealed.ciphertext, 'base64');
  bytes[0] ^= 0xff;
  let threw = false;
  try {
    await unseal(decryptKey, sealed.iv, bytes.toString('base64'));
  } catch {
    threw = true;
  }
  check(threw, 'flipped ciphertext byte rejected by the GCM tag');
}

// ---- Binary payloads survive byte-for-byte ----
console.log('\nBinary round trip');
{
  const binary = webcrypto.getRandomValues(new Uint8Array(4096));
  const s = await seal(encryptKey, binary);
  const back = await unseal(decryptKey, s.iv, s.ciphertext);
  check(
    back.length === binary.length && back.every((b, i) => b === binary[i]),
    '4 KiB of random bytes round-trip identically',
  );
}

// ---- Distinct IVs per seal ----
console.log('\nIV uniqueness');
{
  const a = await seal(encryptKey, encoder.encode('same'));
  const b = await seal(encryptKey, encoder.encode('same'));
  check(a.iv !== b.iv, 'two seals of identical content use different IVs');
  check(a.ciphertext !== b.ciphertext, 'and produce different ciphertext');
}

console.log('\nCanonical forms in use');
for (const spellings of ACCEPTED_ANSWERS) {
  for (const s of spellings) console.log(`  ${s.padEnd(10)} -> ${canonicalize(s)}`);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
