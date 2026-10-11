import { useEffect, useRef, useState } from 'react';
import type { GiftConfig } from '../config';
import { GIFTS, LOCKED_MESSAGE, LOCKED_MESSAGE_MS } from '../config';
import { giftState } from '../lib/gifts';
import { useNow } from '../lib/useNow';
import { playChime } from '../lib/audio';
import GiftBox from './GiftBox';

interface GiftShelfProps {
  openedIds: readonly string[];
  onOpen: (gift: GiftConfig) => void;
}

/**
 * The shelf (CAP-3). Renders whatever `GIFTS` holds — the count is never
 * structural, so adding or removing a gift is a config-only edit.
 */
export default function GiftShelf({ openedIds, onOpen }: GiftShelfProps) {
  // Shared corrected clock — the same tick the birthday counter runs on.
  const tick = useNow();

  /** Which box was tapped too early, and how many times (to replay the nudge). */
  const [tease, setTease] = useState<{ id: string; count: number } | null>(null);
  const teaseTimer = useRef<number | null>(null);

  const onLockedTap = (gift: GiftConfig) => {
    setTease((previous) => ({
      id: gift.id,
      count: previous?.id === gift.id ? previous.count + 1 : 1,
    }));
    if (teaseTimer.current !== null) window.clearTimeout(teaseTimer.current);
    teaseTimer.current = window.setTimeout(() => setTease(null), LOCKED_MESSAGE_MS);
  };

  useEffect(
    () => () => {
      if (teaseTimer.current !== null) window.clearTimeout(teaseTimer.current);
    },
    [],
  );

  // Chime the instant a countdown reaches zero — but only on an actual
  // transition, never on first render, or every already-open gift would
  // chime on arrival.
  const wasReady = useRef<Map<string, boolean> | null>(null);
  useEffect(() => {
    const current = new Map(
      GIFTS.map((g) => [g.id, giftState(g, tick).status === 'ready']),
    );
    const previous = wasReady.current;
    if (previous) {
      for (const [id, ready] of current) {
        if (ready && previous.get(id) === false) {
          playChime();
          break;
        }
      }
    }
    wasReady.current = current;
  }, [tick]);

  if (GIFTS.length === 0) return null;

  return (
    <section className="w-full px-4" aria-label="המתנות שלך">
      {/* One column on a phone so each box is genuinely large; side by side
          once there is room. Never a fixed 3-wide grid — the gift count is
          config-driven and must not be baked into the layout. */}
      <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GIFTS.map((gift) => (
          <GiftBox
            key={gift.id}
            gift={gift}
            state={giftState(gift, tick)}
            opened={openedIds.includes(gift.id)}
            onOpen={onOpen}
            onLockedTap={onLockedTap}
            nudge={tease?.id === gift.id ? tease.count : 0}
          />
        ))}
      </div>

      {/* Height is reserved so the message appearing never shifts the boxes. */}
      <p
        className="mt-4 flex min-h-7 items-center justify-center text-center text-base font-light text-gold-soft transition-opacity duration-300"
        style={{ opacity: tease ? 1 : 0 }}
        aria-live="polite"
      >
        {tease ? LOCKED_MESSAGE : ''}
      </p>
    </section>
  );
}
