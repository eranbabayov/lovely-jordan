import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Photo } from '../lib/photos';
import { pickSrc, preload } from '../lib/photos';
import { CROSSFADE_MS, SLIDE_MS } from '../config';

const PRELOAD_AHEAD = 3;
const LONG_PRESS_MS = 400;
const SWIPE_PX = 40;

interface SlideshowProps {
  photos: Photo[];
}

/**
 * Endless auto-advancing loop (CAP-2).
 *
 * Two persistent layers crossfade by opacity TRANSITION — deliberately not a
 * keyframe animation, because the global reduced-motion rule suppresses
 * animations and the spec degrades motion to plain fades rather than to
 * nothing. Ken-Burns *is* a keyframe animation, so it drops out under reduced
 * motion exactly as intended.
 */
export default function Slideshow({ photos }: SlideshowProps) {
  const count = photos.length;

  /**
   * `slots` is which photo each of the two layers holds; `active` is which
   * layer is visible. They live in ONE state object on purpose: advancing has
   * to change both together, and nesting one setState inside another updater
   * is impure — StrictMode double-invokes updaters and would double-advance.
   */
  const [{ slots, active }, setSlide] = useState<{
    slots: [number, number];
    active: 0 | 1;
  }>({ slots: [0, count > 1 ? 1 : 0], active: 0 });

  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [hidden, setHidden] = useState(false);

  const currentIndex = slots[active];

  const step = useCallback(
    (delta: number) => {
      // Pure: same input state always yields the same result, so a repeated
      // invocation is harmless.
      setSlide((s) => {
        const nextActive: 0 | 1 = s.active === 0 ? 1 : 0;
        const from = s.slots[s.active];
        const target = (((from + delta) % count) + count) % count;
        const next: [number, number] = [s.slots[0], s.slots[1]];
        next[nextActive] = target;
        return { slots: next, active: nextActive };
      });
    },
    [count],
  );

  // Spare her battery: a slideshow ticking in a backgrounded tab is pure waste.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const running = !paused && !holding && !hidden && count > 1;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => step(1), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [running, step]);

  // Decode the next few so an advance never waits on the decoder.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 1; i <= PRELOAD_AHEAD; i += 1) {
        if (cancelled) return;
        const photo = photos[(currentIndex + i) % count];
        if (photo) await preload(pickSrc(photo));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentIndex, photos, count]);

  // ---- Controls: tap pauses, swipe steps, long-press holds ----
  const pointerStart = useRef<{ x: number; t: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Typed structurally rather than with React's event aliases, which
  // @types/react 19 deprecates. These handlers only need the x coordinate.
  const onPointerDown = (e: { clientX: number }) => {
    pointerStart.current = { x: e.clientX, t: Date.now() };
    longPressTimer.current = window.setTimeout(() => setHolding(true), LONG_PRESS_MS);
  };

  const onPointerUp = (e: { clientX: number }) => {
    clearLongPress();
    const start = pointerStart.current;
    pointerStart.current = null;

    if (holding) {
      setHolding(false);
      return;
    }
    if (!start) return;

    const dx = e.clientX - start.x;
    if (Math.abs(dx) >= SWIPE_PX) {
      // RTL: a swipe toward the start of the reading direction goes forward.
      step(dx > 0 ? 1 : -1);
      return;
    }
    setPaused((p) => !p);
  };

  const onPointerCancel = () => {
    clearLongPress();
    pointerStart.current = null;
    setHolding(false);
  };

  useEffect(() => clearLongPress, []);

  return (
    <div
      className="absolute inset-0 touch-none select-none overflow-hidden bg-night"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      role="img"
      aria-label="תמונות שלנו"
    >
      {([0, 1] as const).map((slot) => {
        const photo = photos[slots[slot]];
        if (!photo) return null;
        const isActive = slot === active;
        return (
          <div
            key={slot}
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{
              opacity: isActive ? 1 : 0,
              transitionDuration: `${CROSSFADE_MS}ms`,
            }}
            aria-hidden={!isActive}
          >
            {/* Keyed on the photo so Ken-Burns restarts per photo, while the
                parent persists so its opacity transition still runs. */}
            <div
              key={photo.origin}
              className="ken-burns h-full w-full"
              style={{ '--kb-duration': `${SLIDE_MS + CROSSFADE_MS}ms` } as CSSProperties}
            >
              <img
                src={pickSrc(photo)}
                width={photo.w}
                height={photo.h}
                alt=""
                draggable={false}
                decoding="async"
                className="h-full w-full object-cover"
                style={{
                  backgroundImage: `url(${photo.lqip})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </div>
            {photo.caption ? (
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/85 to-transparent px-6 pb-10 pt-16 text-center text-base font-light text-cream/90">
                {photo.caption}
              </p>
            ) : null}
          </div>
        );
      })}

      {/* The photos are the interface — the only chrome is a brief pause hint. */}
      {paused ? (
        <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
          <span className="rounded-full bg-night/70 px-4 py-1 text-xs font-light text-cream/70">
            מושהה
          </span>
        </div>
      ) : null}
    </div>
  );
}
