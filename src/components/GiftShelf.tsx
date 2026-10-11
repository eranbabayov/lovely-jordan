import { useEffect, useRef, useState } from 'react';
import type { GiftConfig } from '../config';
import { GIFTS } from '../config';
import { giftState } from '../lib/gifts';
import { now, syncClock } from '../lib/time';
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
  const [tick, setTick] = useState(() => now());

  // One session-wide clock correction, then tick locally against it.
  useEffect(() => {
    let active = true;
    syncClock().finally(() => {
      if (active) setTick(now());
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick(now()), 1000);
    return () => window.clearInterval(id);
  }, []);

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
          />
        ))}
      </div>
    </section>
  );
}
