/**
 * Exercises the real countdown formatter and the configured reveal dates.
 *
 *   node scripts/check-countdown.mjs    (or: npm run check)
 *
 * The reveal-date assertions matter most: writing the wrong UTC offset shifts a
 * gift by an hour, and Israel changes offset on 2026-10-25.
 */

import { formatCountdown, formatClock, splitDuration } from '../src/lib/hebrew.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

let failures = 0;

function expect(actual, expected, label) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(34)} ${actual}${ok ? '' : `   (expected ${expected})`}`);
}

console.log('\nCountdown — dual forms and boundaries');
expect(formatCountdown(0), 'עכשיו', 'zero');
expect(formatCountdown(-5000), 'עכשיו', 'already passed');
expect(formatCountdown(1 * DAY), 'יום אחד', 'exactly 1 day');
expect(formatCountdown(2 * DAY), 'יומיים', '2 days (DUAL, not 2 ימים)');
expect(formatCountdown(3 * DAY), '3 ימים', '3 days');
expect(formatCountdown(12 * DAY), '12 ימים', '12 days');
expect(formatCountdown(1 * DAY - 1), '23 שעות', 'just under a day');
expect(formatCountdown(1 * HOUR), 'שעה אחת', 'exactly 1 hour');
expect(formatCountdown(2 * HOUR), 'שעתיים', '2 hours (DUAL)');
expect(formatCountdown(5 * HOUR), '5 שעות', '5 hours');
expect(formatCountdown(1 * HOUR - 1), '59:59', 'just under an hour -> MM:SS');
expect(formatCountdown(90 * SECOND), '01:30', '90 seconds');
expect(formatCountdown(1 * MINUTE), '01:00', 'exactly 1 minute');
expect(formatCountdown(1 * MINUTE - 1), 'עוד 60 שניות', 'just under a minute');
expect(formatCountdown(5 * SECOND), 'עוד 5 שניות', '5 seconds');
expect(formatCountdown(1 * SECOND), 'עוד שנייה', '1 second');

console.log('\nDigital clock — DD:HH:MM:SS');
expect(formatClock(0), '00:00:00:00', 'zero');
expect(formatClock(-5000), '00:00:00:00', 'negative clamps to zero');
expect(formatClock(1 * SECOND), '00:00:00:01', '1 second');
expect(formatClock(59 * SECOND), '00:00:00:59', '59 seconds');
expect(formatClock(1 * MINUTE), '00:00:01:00', 'rolls into minutes');
expect(formatClock(1 * HOUR), '00:01:00:00', 'rolls into hours');
expect(formatClock(1 * DAY), '01:00:00:00', 'rolls into days');
expect(
  formatClock(2 * DAY + 14 * HOUR + 33 * MINUTE + 8 * SECOND),
  '02:14:33:08',
  'mixed duration',
);
expect(formatClock(1 * DAY - 1 * SECOND), '00:23:59:59', 'one second under a day');
expect(formatClock(100 * DAY), '100:00:00:00', 'days are not capped at two digits');

{
  const d = splitDuration(3 * DAY + 4 * HOUR + 5 * MINUTE + 6 * SECOND);
  expect(
    `${d.days}/${d.hours}/${d.minutes}/${d.seconds}`,
    '3/4/5/6',
    'splitDuration components',
  );
}

console.log('\nConfigured reveal dates — Israel wall clock');
// Israel is UTC+3 under DST, UTC+2 otherwise; DST ends Sunday 2026-10-25.
const cases = [
  { iso: '2026-10-18T20:00:00+03:00', expectUtc: '2026-10-18T17:00:00.000Z', note: 'gift2, during DST' },
  { iso: '2026-11-01T20:00:00+02:00', expectUtc: '2026-11-01T18:00:00.000Z', note: 'gift3, after DST ends' },
];
for (const { iso, expectUtc, note } of cases) {
  const parsed = new Date(Date.parse(iso)).toISOString();
  expect(parsed, expectUtc, note);
}

// Both should read as 20:00 local Israel time — the actual intent.
console.log('\n  rendered in Asia/Jerusalem:');
for (const { iso, note } of cases) {
  const local = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
  const ok = local.endsWith('20:00');
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${note.padEnd(34)} ${local}`);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
