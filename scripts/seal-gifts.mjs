/**
 * Encrypts everything in `gifts-src/` into `public/gifts/<id>.sealed.json`.
 *
 *   node scripts/seal-gifts.mjs        (or: npm run seal)
 *
 * Deliberately uses Node's **WebCrypto** (`node:crypto`.webcrypto), not the
 * legacy `createCipheriv` API. WebCrypto's AES-GCM already appends the auth tag
 * to the ciphertext, exactly as the browser's `crypto.subtle.decrypt` expects —
 * so there is no manual tag concatenation to get wrong, and sealing and
 * unsealing run the same algorithm through the same interface.
 *
 * Re-runnable at any time: swapping a gift's content is edit the file, re-run.
 */

import { webcrypto } from 'node:crypto';
import { readdir, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { keyMaterial } from '../src/lib/normalize.js';
import {
  IV_BYTES,
  KEY_BITS,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT,
} from '../src/lib/seal-params.js';
import { SEALING_ANSWERS } from '../secrets/answers.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(ROOT, 'gifts-src');
const OUT_DIR = path.join(ROOT, 'public', 'gifts');

const SEAL_VERSION = 1;

/** Extension -> gift kind and media type. Unknown types seal as opaque bytes. */
const TYPES = {
  '.md': { kind: 'letter', mime: 'text/markdown' },
  '.txt': { kind: 'letter', mime: 'text/plain' },
  '.jpg': { kind: 'photo', mime: 'image/jpeg' },
  '.jpeg': { kind: 'photo', mime: 'image/jpeg' },
  '.png': { kind: 'photo', mime: 'image/png' },
  '.webp': { kind: 'photo', mime: 'image/webp' },
  '.mp4': { kind: 'video', mime: 'video/mp4' },
  '.webm': { kind: 'video', mime: 'video/webm' },
  '.mov': { kind: 'video', mime: 'video/quicktime' },
  '.m4a': { kind: 'audio', mime: 'audio/mp4' },
  '.mp3': { kind: 'audio', mime: 'audio/mpeg' },
  '.ogg': { kind: 'audio', mime: 'audio/ogg' },
  '.wav': { kind: 'audio', mime: 'audio/wav' },
};

const encoder = new TextEncoder();

/**
 * Derive the AES-GCM key. Must match `src/lib/crypto.ts` exactly; the shared
 * `seal-params.js` is what keeps them from drifting.
 *
 * @param {string} material
 * @param {KeyUsage[]} usages
 */
export async function deriveKey(material, usages = ['encrypt']) {
  const base = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(material),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(PBKDF2_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    usages,
  );
}

/**
 * Encrypt bytes under the key, returning base64 iv and ciphertext.
 *
 * @param {CryptoKey} key
 * @param {Uint8Array} bytes
 */
export async function seal(key, bytes) {
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return {
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(ciphertext).toString('base64'),
  };
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error(`No gifts-src/ directory at ${SRC_DIR}`);
    process.exit(1);
  }

  const files = (await readdir(SRC_DIR)).filter((f) => !f.startsWith('.'));
  if (files.length === 0) {
    console.error('gifts-src/ is empty — nothing to seal.');
    process.exit(1);
  }

  const material = keyMaterial(SEALING_ANSWERS);
  const key = await deriveKey(material, ['encrypt']);

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Sealing ${files.length} gift(s)\n`);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const id = path.basename(file, ext);
    const type = TYPES[ext] ?? { kind: 'letter', mime: 'application/octet-stream' };

    const bytes = await readFile(path.join(SRC_DIR, file));
    const { iv, ciphertext } = await seal(key, bytes);

    const payload = {
      v: SEAL_VERSION,
      id,
      kind: type.kind,
      mime: type.mime,
      iv,
      ciphertext,
    };

    const out = path.join(OUT_DIR, `${id}.sealed.json`);
    await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    console.log(
      `  ${id.padEnd(12)} ${type.kind.padEnd(7)} ${String(bytes.length).padStart(9)} B -> ${path.basename(out)}`,
    );
  }

  console.log(`\nSealed into public/gifts/. Only ciphertext is written.`);
  console.log('Make sure src/config.ts lists an entry for each id above.');
}

// Importable by the round-trip test without running the CLI.
// pathToFileURL, not string concatenation: on Windows import.meta.url is
// `file:///C:/...` with three slashes, so a hand-built `file://${path}` never
// matches and main() silently never runs.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
