import { BIRTHDAY, BIRTHDAY_ARRIVED, BIRTHDAY_LABEL } from '../config';
import { useNow } from '../lib/useNow';
import Countdown from './Countdown';

/**
 * Counts down to Yarden's birthday.
 *
 * Shares the gift countdowns' digits and the same corrected clock, so the two
 * read as one system rather than two unrelated timers.
 */
export default function BirthdayCountdown() {
  const now = useNow();

  if (!BIRTHDAY) return null;

  const target = Date.parse(BIRTHDAY);
  if (Number.isNaN(target)) return null;

  const remaining = target - now;

  // The day itself: hold the greeting for a full 24h rather than flipping
  // back to a countdown one second after midnight.
  if (remaining <= 0) {
    const sinceStart = -remaining;
    if (sinceStart < 24 * 60 * 60 * 1000) {
      return (
        <p className="animate-reveal text-center text-3xl font-light text-gold-soft">
          {BIRTHDAY_ARRIVED}
        </p>
      );
    }
    return null;
  }

  return (
    <section className="flex flex-col items-center gap-3" aria-live="off">
      <p className="text-sm font-light tracking-wide text-cream/60">{BIRTHDAY_LABEL}</p>
      <Countdown remainingMs={remaining} size="lg" />
    </section>
  );
}
