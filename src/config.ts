/**
 * The one file to edit.
 *
 * Adding, removing or retiming a gift is a change here plus `npm run seal` —
 * never a component change. Nothing downstream may assume how many gifts
 * exist (SPEC.md § Constraints: the count is config-driven, never structural).
 */

export type GiftKind = 'letter' | 'photo' | 'video' | 'audio' | 'voucher' | 'link';

export interface GiftConfig {
  /** Stable id; also the sealed filename stem. */
  id: string;
  /** Hebrew label shown under the box. */
  title: string;
  /** Shown on the box face. */
  emoji: string;
  /** Drives which renderer opens the payload. */
  kind: GiftKind;
  /**
   * ISO-8601 with an EXPLICIT offset, expressing Israel wall-clock intent.
   * `null` means open immediately.
   *
   * Israel is UTC+03:00 under DST and UTC+02:00 otherwise; DST ends on the
   * last Sunday of October (2026-10-25). Writing the wrong offset shifts a
   * reveal by an hour — check it against each target date.
   */
  revealAt: string | null;
  /** Sealed payload path, served from `public/`. */
  sealed: string;
}

export interface AnswerConfig {
  /** The question, in Hebrew. */
  q: string;
  /**
   * SHA-256 hex digests of `normalize(answer)`. More than one entry means
   * more than one accepted answer. An EMPTY array matches nothing, which is
   * the correct fail-closed default while these are unpopulated.
   */
  digests: string[];
  /** Revealed after 3 wrong attempts. */
  hint: string;
}

/**
 * Milliseconds each photo holds before advancing.
 *
 * 4000 is the confirmed choice. 1000 (the original request) is supported.
 * Never go below 1000: rapid flashing is an accessibility hazard.
 */
export const SLIDE_MS = 4000;

/** Crossfade duration between photos; must stay well under SLIDE_MS. */
export const CROSSFADE_MS = 800;

/**
 * The gate. Digests are populated in story 4 — see the spec companion
 * `hebrew-matching.md` for the accepted answers and the normalization that
 * must be applied identically at hash time and compare time.
 *
 * Question 2 accepts two answers, so it will carry two digests.
 */
export const ANSWERS: AnswerConfig[] = [
  {
    q: 'איך אני קורא לך?',
    digests: [], // TODO(story-4): sha256(normalize('יפיופה'))
    hint: 'ככה אני קורא לך כשאת מתעוררת',
  },
  {
    q: 'של מי את?',
    digests: [], // TODO(story-4): sha256(normalize('של ערן')), sha256(normalize('ערן'))
    hint: 'שתי מילים. השנייה זה השם שלי',
  },
];

/** Placeholder content for all three; real content substituted later. */
export const GIFTS: GiftConfig[] = [
  {
    id: 'gift1',
    title: 'מתנה ראשונה',
    emoji: '💌',
    kind: 'letter',
    revealAt: null, // open immediately, so the app gives something at once
    sealed: '/gifts/gift1.sealed.json',
  },
  {
    id: 'gift2',
    title: 'מתנה שנייה',
    emoji: '🎁',
    kind: 'letter',
    revealAt: '2026-10-18T20:00:00+03:00', // Israel DST
    sealed: '/gifts/gift2.sealed.json',
  },
  {
    id: 'gift3',
    title: 'מתנה שלישית',
    emoji: '✨',
    kind: 'letter',
    revealAt: '2026-11-01T20:00:00+02:00', // after DST ends 2026-10-25
    sealed: '/gifts/gift3.sealed.json',
  },
];

/**
 * No track supplied, so the app ships silent (SPEC.md § Assumptions).
 * Set a path under `public/` to enable audio; the mute control and the
 * countdown chime stay behind this flag so nothing broken is shown.
 */
export const MUSIC_SRC: string | null = null;

/** localStorage keys. */
export const STORAGE_KEYS = {
  unlocked: 'yg.unlocked',
  muted: 'yg.muted',
} as const;
