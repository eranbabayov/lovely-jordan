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
   *
   * Regenerate with `npm run digests`.
   */
  digests: string[];
  /** Revealed after 3 wrong attempts. */
  hint: string;
  /**
   * Shown after 6 wrong attempts. Only the first character, because the
   * plaintext answer is deliberately not in the bundle — this one letter is
   * the intended leak, not an accident.
   */
  firstLetter: string;
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
 * The gate. Digests are `sha256(normalize(answer))` — the plaintext answers
 * exist only in the gitignored `secrets/answers.mjs`, never here.
 *
 * Both questions accept two spellings and so carry two digests each. Every
 * spelling collapses to the same key-derivation form via `canonicalize()`,
 * which is what lets a gift sealed under one spelling open for someone who
 * typed another. `npm run check` asserts that across all four combinations.
 */
export const ANSWERS: AnswerConfig[] = [
  {
    q: 'איך אני קורא לך?',
    digests: [
      'e5e1b42c783cd22089abc3d1d919962bbd583a4289a51ef38b6ca82dc84d7943',
      '4a1e2a038664d23b46fd2db8664fa89d6b4c0c243315ac6aa168e65cffe4f927',
    ],
    hint: 'ככה אני קורא לך כשאת מתעוררת',
    firstLetter: 'י',
  },
  {
    q: 'של מי את?',
    digests: [
      '7176db2669ca14f6f72e3b803bac71c9e94db4f00a44bd832512e21d51933c05',
      'dcbfa43013ed114b83c306346ef79bcec327687efed56581ea3b2eaee58573bf',
    ],
    hint: 'שתי מילים. השנייה זה השם שלי',
    firstLetter: 'ש',
  },
];

/** Placeholder content for all three; real content substituted later. */
export const GIFTS: GiftConfig[] = [
  {
    id: 'gift1',
    title: 'מכתב בשבילך',
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
 * Yarden's birthday, as ISO-8601 with an explicit offset.
 *
 * 2026-12-01 falls after Israeli DST ends on 2026-10-25, so the offset is
 * +02:00. Midnight, so the countdown hits zero as the day itself begins.
 *
 * Set to `null` to hide the birthday counter entirely.
 */
export const BIRTHDAY: string | null = '2026-12-01T00:00:00+02:00';

/**
 * Shown when she taps a gift that has not unlocked yet.
 *
 * The doubled letters are the playful drawn-out spelling as written — left
 * exactly as given rather than "corrected".
 */
export const LOCKED_MESSAGE = 'סבלנותת יפיופהה 💛';

/** How long that message lingers before fading out. */
export const LOCKED_MESSAGE_MS = 3000;

/** Shown above the counter while it is still counting down. */
export const BIRTHDAY_LABEL = 'עוד רגע ליום ההולדת שלך';

/** Shown instead of the counter once the day arrives. */
export const BIRTHDAY_ARRIVED = 'יום הולדת שמח 🎂';

/**
 * Short birthday wishes that fade one into the next under the gifts.
 *
 * All second-person feminine, matching the rest of the copy. Edit freely —
 * any number of lines works, and an empty array hides the element entirely.
 */
export const NOTES: string[] = [
  'יום הולדת שמח, יפיופה שלי 🎂',
  'אני שרוף לך על פלח ימין❤️',
  'כמה טוב שהורדת אוקיי קיופד🦔',
  'כל מה שתבקשי - שיתגשם✨',
  'את המתנה הכי יפה שלי🎁',
  'עוד הרבה ימי הולדת ביחד ❤️',
   'שתעלי מעלה מעלה📈',
];

/** How long each line holds before fading to the next. */
export const NOTE_ROTATE_MS = 4000;

/**
 * Background track, served from `public/`. Set to `null` to ship silent.
 *
 * Starts on the Opening tap — mobile browsers refuse to begin audio outside a
 * user gesture, which is the whole reason that screen exists.
 */
export const MUSIC_SRC: string | null = 'audio/birthday-song.mp3';

/**
 * Whether the track repeats. A sung birthday song on endless repeat gets old
 * fast, so this is off: it plays once and stops.
 */
export const MUSIC_LOOP = false;

/** Playback volume, 0–1. Low enough to sit under the moment, not over it. */
export const MUSIC_VOLUME = 0.5;

/** localStorage keys. */
export const STORAGE_KEYS = {
  unlocked: 'yg.unlocked',
  muted: 'yg.muted',
  opened: 'yg.opened',
} as const;
