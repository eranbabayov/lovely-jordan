/**
 * Browser-side hashing and key derivation.
 *
 * Everything here needs `crypto.subtle`, which exists ONLY in a secure
 * context — HTTPS or localhost. Over plain http it is `undefined` and the gate
 * fails in a way that looks like nothing happening, so the absence is checked
 * explicitly and reported.
 */

import { IV_BYTES, KEY_BITS, PBKDF2_ITERATIONS, PBKDF2_SALT } from './seal-params.js';

const encoder = new TextEncoder();

export class InsecureContextError extends Error {
  constructor() {
    super(
      'הדף חייב לרוץ על HTTPS. (crypto.subtle unavailable — serve over https:// or localhost)',
    );
    this.name = 'InsecureContextError';
  }
}

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) throw new InsecureContextError();
  return crypto.subtle;
}

/** True when the crypto the gate and unsealing both need is actually present. */
export function hasSecureCrypto(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await subtle().digest('SHA-256', encoder.encode(value));
  return toHex(digest);
}

/**
 * Derive the AES-GCM key from the canonical answer material.
 *
 * Must match `scripts/seal-gifts.mjs` exactly — same material, salt,
 * iteration count and key length — or sealed gifts cannot be opened. The
 * parameters are shared via `seal-params.js` precisely so they cannot drift.
 */
export async function deriveKey(material: string): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', encoder.encode(material), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return subtle().deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(PBKDF2_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['decrypt'],
  );
}

/**
 * Decrypt `iv || ciphertext`. WebCrypto expects the GCM tag appended to the
 * ciphertext, which is why the seal script concatenates Node's separate auth
 * tag onto its output.
 *
 * A wrong key fails authentication and throws, rather than returning garbage.
 */
export async function openSealed(
  key: CryptoKey,
  ivB64: string,
  ciphertextB64: string,
): Promise<Uint8Array> {
  const iv = fromBase64(ivB64);
  if (iv.length !== IV_BYTES) {
    throw new Error(`Sealed payload has a ${iv.length}-byte IV; expected ${IV_BYTES}.`);
  }
  const plain = await subtle().decrypt(
    { name: 'AES-GCM', iv },
    key,
    fromBase64(ciphertextB64),
  );
  return new Uint8Array(plain);
}

/**
 * Returns `Uint8Array<ArrayBuffer>` rather than plain `Uint8Array`: the view
 * must be backed by a real ArrayBuffer (not a SharedArrayBuffer) to satisfy
 * WebCrypto's `BufferSource`, and allocating the buffer explicitly is what
 * pins that down.
 */
export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
