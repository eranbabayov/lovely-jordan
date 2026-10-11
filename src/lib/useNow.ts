import { useEffect, useState } from 'react';
import { now, syncClock } from './time';

/**
 * Ticking corrected time, shared by every countdown on screen.
 *
 * One clock sync per session regardless of how many components ask — the
 * `syncClock()` call is idempotent and cheap after the first.
 */
export function useNow(intervalMs = 1000): number {
  const [tick, setTick] = useState(() => now());

  useEffect(() => {
    let active = true;
    void syncClock().finally(() => {
      if (active) setTick(now());
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick(now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return tick;
}
