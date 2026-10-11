import type { GiftConfig, GiftKind } from '../config';
import { deriveKey, openSealed } from './crypto';

/** The on-disk shape written by `scripts/seal-gifts.mjs`. */
export interface SealedPayload {
  v: number;
  id: string;
  kind: GiftKind;
  mime: string;
  /** base64, 12 bytes. */
  iv: string;
  /** base64; AES-GCM output, tag included. */
  ciphertext: string;
}

export interface OpenedGift {
  kind: GiftKind;
  mime: string;
  /** Decoded text for textual kinds; null for binary. */
  text: string | null;
  /** Blob URL for binary kinds; null for text. Caller must revoke it. */
  objectUrl: string | null;
}

const base = import.meta.env.BASE_URL;

/** Join a configured `sealed` path onto the deploy base without doubling slashes. */
function resolve(sealedPath: string): string {
  return `${base}${sealedPath.replace(/^\//, '')}`;
}

export async function loadSealed(gift: GiftConfig): Promise<SealedPayload> {
  const res = await fetch(resolve(gift.sealed), { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`המתנה לא נמצאה (HTTP ${res.status}). הרץ npm run seal.`);
  }
  const payload = (await res.json()) as SealedPayload;
  if (payload.v !== 1) {
    throw new Error(`Unsupported seal version ${payload.v}.`);
  }
  if (!payload.iv || !payload.ciphertext) {
    throw new Error('Sealed payload is missing iv or ciphertext.');
  }
  return payload;
}

const TEXTUAL = /^text\//;

/**
 * Decrypt a gift with the key derived from her answers (CAP-5).
 *
 * A wrong key fails GCM authentication and throws rather than returning
 * garbage, so there is no "decrypted to nonsense" state to handle. Failure is
 * always retryable and never destructive.
 */
export async function openGift(material: string, gift: GiftConfig): Promise<OpenedGift> {
  const payload = await loadSealed(gift);
  const key = await deriveKey(material);
  const bytes = await openSealed(key, payload.iv, payload.ciphertext);

  if (TEXTUAL.test(payload.mime)) {
    return {
      kind: payload.kind,
      mime: payload.mime,
      text: new TextDecoder().decode(bytes),
      objectUrl: null,
    };
  }

  // Copy into a fresh buffer: Blob wants a standalone ArrayBuffer view.
  const blob = new Blob([bytes.slice()], { type: payload.mime });
  return {
    kind: payload.kind,
    mime: payload.mime,
    text: null,
    objectUrl: URL.createObjectURL(blob),
  };
}
