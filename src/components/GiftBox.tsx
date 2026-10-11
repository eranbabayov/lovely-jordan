import type { GiftConfig } from '../config';
import type { GiftState } from '../lib/gifts';
import { isOpenable } from '../lib/gifts';
import { formatCountdown } from '../lib/hebrew.js';

interface GiftBoxProps {
  gift: GiftConfig;
  state: GiftState;
  opened: boolean;
  onOpen: (gift: GiftConfig) => void;
}

/**
 * One gift as a box on the shelf (CAP-3).
 *
 * A locked box still shows itself and its countdown — anticipation is half the
 * gift, so it is never hidden.
 */
export default function GiftBox({ gift, state, opened, onOpen }: GiftBoxProps) {
  const openable = isOpenable(state.status);
  const broken = state.status === 'misconfigured';

  return (
    <button
      type="button"
      onClick={() => openable && onOpen(gift)}
      disabled={!openable}
      aria-label={
        openable
          ? `${gift.title} — אפשר לפתוח`
          : `${gift.title} — ${formatCountdown(state.remainingMs)}`
      }
      className={`group flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl p-2 transition ${
        openable ? 'cursor-pointer active:scale-95' : 'cursor-default'
      }`}
    >
      <span
        className={`relative flex h-20 w-20 items-center justify-center rounded-2xl border text-3xl transition ${
          openable
            ? 'border-gold/60 bg-plum-soft/70 shadow-[0_0_24px_-6px_var(--color-gold)] group-hover:border-gold'
            : 'border-cream/15 bg-plum/40'
        } ${state.status === 'imminent' ? 'animate-tremble' : ''} ${
          openable && !opened ? 'animate-float' : ''
        }`}
      >
        {/* Ribbon. Purely decorative, hidden from assistive tech. */}
        <span
          aria-hidden
          className={`absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 ${
            openable ? 'bg-gold/50' : 'bg-cream/15'
          }`}
        />
        <span
          aria-hidden
          className={`absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 ${
            openable ? 'bg-gold/50' : 'bg-cream/15'
          }`}
        />
        <span className={openable ? '' : 'opacity-40 grayscale'}>{gift.emoji}</span>
      </span>

      <span className={`text-xs font-light ${openable ? 'text-cream/90' : 'text-cream/50'}`}>
        {gift.title}
      </span>

      <span
        className={`text-[11px] font-light tabular-nums ${
          broken ? 'text-red-300' : openable ? 'text-gold-soft' : 'text-cream/40'
        }`}
      >
        {broken
          ? 'תאריך שגוי'
          : openable
            ? opened
              ? 'פתוח'
              : 'אפשר לפתוח ✨'
            : formatCountdown(state.remainingMs)}
      </span>
    </button>
  );
}
