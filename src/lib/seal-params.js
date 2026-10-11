/**
 * Shared sealing parameters. Imported by BOTH the browser unsealer and the
 * Node seal script — if these two ever disagree, every gift becomes
 * permanently unopenable, so there is exactly one copy.
 */

/** PBKDF2-SHA256 iterations. High enough to be costly, low enough for a phone. */
export const PBKDF2_ITERATIONS = 250_000;

/**
 * Fixed salt. A per-user random salt buys nothing here: there is one user, no
 * password database to protect against rainbow tables, and the salt would have
 * to ship alongside the ciphertext anyway.
 */
export const PBKDF2_SALT = 'yarden-gift-app/v1';

/** AES-GCM key length in bits. */
export const KEY_BITS = 256;

/** AES-GCM IV length in bytes. */
export const IV_BYTES = 12;
