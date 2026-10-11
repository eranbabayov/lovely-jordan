/**
 * Hebrew countdown formatting.
 *
 * Hebrew has a DUAL form, so two of something is its own word: `יומיים`, not
 * `2 ימים`. Getting this wrong is exactly the detail that makes a gift read as
 * machine-generated.
 *
 * Plain `.js` with a sibling `.d.ts` so `scripts/check-countdown.mjs` can
 * exercise the real implementation rather than a copy of it.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const DAYS = { one: 'יום אחד', two: 'יומיים', many: 'ימים' };
const HOURS = { one: 'שעה אחת', two: 'שעתיים', many: 'שעות' };
const MINUTES = { one: 'דקה אחת', two: 'שתי דקות', many: 'דקות' };

/**
 * @param {number} n
 * @param {{one: string, two: string, many: string}} unit
 * @returns {string}
 */
function plural(n, unit) {
  if (n === 1) return unit.one;
  if (n === 2) return unit.two;
  return `${n} ${unit.many}`;
}

/**
 * Zero-padded `MM:SS`, for the final stretch under an hour.
 * @param {number} ms
 * @returns {string}
 */
function clock(ms) {
  const total = Math.max(0, Math.floor(ms / SECOND));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Human countdown text for the remaining milliseconds.
 *
 * Coarse while far away (days, then hours), switching to a live ticking
 * `MM:SS` inside the last hour — that is where the anticipation lives.
 *
 * @param {number} remainingMs
 * @returns {string}
 */
export function formatCountdown(remainingMs) {
  if (remainingMs <= 0) return 'עכשיו';
  if (remainingMs >= DAY) return plural(Math.floor(remainingMs / DAY), DAYS);
  if (remainingMs >= HOUR) return plural(Math.floor(remainingMs / HOUR), HOURS);
  if (remainingMs >= MINUTE) return clock(remainingMs);
  const seconds = Math.ceil(remainingMs / SECOND);
  return seconds === 1 ? 'עוד שנייה' : `עוד ${seconds} שניות`;
}

/**
 * Split remaining time into whole days / hours / minutes / seconds.
 *
 * Used for the digital `DD:HH:MM:SS` display. The prose `formatCountdown`
 * above is still used for the accessible label, where "יומיים" reads far
 * better than "02:00:00:00".
 *
 * @param {number} remainingMs
 * @returns {{days: number, hours: number, minutes: number, seconds: number}}
 */
export function splitDuration(remainingMs) {
  const t = Math.max(0, remainingMs);
  return {
    days: Math.floor(t / DAY),
    hours: Math.floor((t % DAY) / HOUR),
    minutes: Math.floor((t % HOUR) / MINUTE),
    seconds: Math.floor((t % MINUTE) / SECOND),
  };
}

/**
 * `DD:HH:MM:SS`, zero-padded. Days are not capped at two digits — a reveal
 * more than 99 days out renders as `100:…` rather than silently wrapping.
 *
 * @param {number} remainingMs
 * @returns {string}
 */
export function formatClock(remainingMs) {
  const { days, hours, minutes, seconds } = splitDuration(remainingMs);
  return [days, hours, minutes, seconds]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

export const units = { DAYS, HOURS, MINUTES, plural, clock };
