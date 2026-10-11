import type { GiftConfig } from '../config';

/** Milliseconds before reveal at which the box starts trembling. */
export const IMMINENT_MS = 60_000;

export type GiftStatus =
  /** Reveal time has passed, or there was never one. */
  | 'ready'
  /** Inside the last minute. */
  | 'imminent'
  /** Still locked. */
  | 'pending'
  /** `revealAt` is not a parseable date — a config mistake, surfaced loudly. */
  | 'misconfigured';

export interface GiftState {
  status: GiftStatus;
  /** Milliseconds until reveal; 0 once ready. */
  remainingMs: number;
}

/**
 * Derive a gift's state from the CORRECTED clock, never `Date.now()` directly.
 *
 * An unparseable `revealAt` fails closed as `misconfigured` rather than
 * opening early: a gift that visibly reports a broken date is recoverable,
 * whereas one that silently unlocks ahead of time has already spoiled the
 * surprise.
 */
export function giftState(gift: GiftConfig, nowMs: number): GiftState {
  if (gift.revealAt === null) return { status: 'ready', remainingMs: 0 };

  const target = Date.parse(gift.revealAt);
  if (Number.isNaN(target)) return { status: 'misconfigured', remainingMs: 0 };

  const remainingMs = target - nowMs;
  if (remainingMs <= 0) return { status: 'ready', remainingMs: 0 };
  if (remainingMs <= IMMINENT_MS) return { status: 'imminent', remainingMs };
  return { status: 'pending', remainingMs };
}

/** Whether the gift can be opened right now. */
export function isOpenable(status: GiftStatus): boolean {
  return status === 'ready';
}
