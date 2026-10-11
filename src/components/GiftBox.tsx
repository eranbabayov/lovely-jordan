import type { GiftConfig } from '../config';
import type { GiftState } from '../lib/gifts';
import { isOpenable } from '../lib/gifts';
import { formatCountdown } from '../lib/hebrew.js';
import Countdown from './Countdown';

interface GiftBoxProps {
  gift: GiftConfig;
  state: GiftState;
  opened: boolean;
  onOpen: (gift: GiftConfig) => void;
  /** Tapped before its time — answered with a nudge and a message. */
  onLockedTap: (gift: GiftConfig) => void;
  /** Increments per locked tap, so the nudge replays on every attempt. */
  nudge: number;
}

/**
 * One gift, centre stage (CAP-3, CAP-4).
 *
 * A locked box still shows itself and its countdown — never hidden, because
 * anticipation is half the gift.
 */
export default function GiftBox({
  gift,
  state,
  opened,
  onOpen,
  onLockedTap,
  nudge,
}: GiftBoxProps) {
  const openable = isOpenable(state.status);
  const broken = state.status === 'misconfigured';

  return (
    <button
      type="button"
      // Deliberately NOT disabled when locked: a box that ignores a tap reads
      // as broken. It answers instead — a nudge and a message.
      onClick={() => (openable ? onOpen(gift) : onLockedTap(gift))}
      // Digits for the eye, prose for a screen reader: "יומיים" reads far
      // better than "02:00:00:00".
      aria-label={
        openable
          ? `${gift.title} — אפשר לפתוח`
          : `${gift.title} — ${formatCountdown(state.remainingMs)}`
      }
      className={`flex w-full cursor-pointer flex-col items-center gap-4 rounded-3xl border p-5 transition active:scale-[0.97] ${
        openable
          ? 'border-gold/50 bg-plum-soft/40 shadow-[0_0_40px_-12px_var(--color-gold)] hover:border-gold'
          : 'border-cream/10 bg-plum/25 hover:border-cream/20'
      }`}
    >
      <span
        // Keyed on the nudge counter so the animation restarts on every tap,
        // not only the first.
        key={nudge}
        className={`relative flex h-28 w-28 items-center justify-center rounded-3xl border-2 text-5xl transition sm:h-32 sm:w-32 sm:text-6xl ${
          nudge > 0 ? 'animate-nudge' : ''
        } ${
          openable ? 'border-gold/60 bg-plum-soft/60' : 'border-cream/15 bg-plum/40'
        } ${state.status === 'imminent' ? 'animate-tremble' : ''} ${
          openable && !opened ? 'animate-float' : ''
        }`}
      >
        {/* Ribbon. Decorative only. */}
        <span
          aria-hidden
          className={`absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 ${
            openable ? 'bg-gold/50' : 'bg-cream/12'
          }`}
        />
        <span
          aria-hidden
          className={`absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 ${
            openable ? 'bg-gold/50' : 'bg-cream/12'
          }`}
        />
        <span className={openable ? '' : 'opacity-35 grayscale'}>{gift.emoji}</span>
      </span>

      <span
        className={`text-base font-light ${openable ? 'text-cream' : 'text-cream/55'}`}
      >
        {gift.title}
      </span>

      {broken ? (
        <span className="text-xs font-light text-red-300">תאריך שגוי</span>
      ) : openable ? (
        <span className="text-sm font-light text-gold-soft">
          {opened ? 'פתוח — אפשר לפתוח שוב' : 'אפשר לפתוח ✨'}
        </span>
      ) : (
        <Countdown remainingMs={state.remainingMs} size="lg" />
      )}
    </button>
  );
}
