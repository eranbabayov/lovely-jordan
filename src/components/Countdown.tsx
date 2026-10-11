import { splitDuration } from '../lib/hebrew.js';

const LABELS = ['ימים', 'שעות', 'דקות', 'שניות'];

interface CountdownProps {
  remainingMs: number;
  /** Larger treatment for the focused/next gift. */
  size?: 'sm' | 'lg';
}

/**
 * `DD:HH:MM:SS` in tabular digits, with small Hebrew unit labels — four bare
 * numbers separated by colons are ambiguous without them.
 *
 * Rendered LTR: a clock is a numeric sequence, and letting it mirror inside
 * the RTL page would reorder the segments into seconds-first nonsense.
 */
export default function Countdown({ remainingMs, size = 'sm' }: CountdownProps) {
  const { days, hours, minutes, seconds } = splitDuration(remainingMs);
  const parts = [days, hours, minutes, seconds];

  const digit = size === 'lg' ? 'text-2xl' : 'text-lg';
  const label = size === 'lg' ? 'text-[10px]' : 'text-[8px]';

  return (
    <div dir="ltr" className="flex items-start justify-center gap-1 tabular-nums">
      {parts.map((value, i) => (
        <div key={LABELS[i]} className="flex items-start">
          <div className="flex flex-col items-center">
            <span className={`${digit} font-light leading-none text-gold-soft`}>
              {String(value).padStart(2, '0')}
            </span>
            <span className={`${label} mt-1 font-light leading-none text-cream/35`}>
              {LABELS[i]}
            </span>
          </div>
          {i < parts.length - 1 ? (
            <span className={`${digit} px-0.5 font-light leading-none text-cream/25`}>:</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
