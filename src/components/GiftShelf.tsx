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
    <section
      className="pointer-events-auto w-full bg-gradient-to-t from-night via-night/95 to-transparent pb-6 pt-12"
      aria-label="המתנות שלך"
    >
      <div className="flex justify-center gap-2 overflow-x-auto px-4">
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
