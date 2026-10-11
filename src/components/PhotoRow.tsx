import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Photo } from '../lib/photos';
import { photoUrl } from '../lib/photos';
import { SLIDE_MS } from '../config';

interface PhotoRowProps {
  photos: Photo[];
  /** Slide the opposite way, so a second strip mirrors the first. */
  reverse?: boolean;
  /** Offset the starting position so both strips are not in lockstep. */
  offset?: boolean;
}

/**
 * A continuously sliding strip of photos (CAP-2).
 *
 * Replaces the earlier full-bleed crossfade: at full height the photos
 * dominated the screen and left no room for the gifts, which are the point.
 *
 * The loop is a CSS marquee over the list duplicated once, translating to
 * exactly -50% — so the second copy lands precisely where the first began and
 * the seam is invisible. No JS ticking, no index arithmetic.
 */
export default function PhotoRow({ photos, reverse = false, offset = false }: PhotoRowProps) {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (photos.length === 0) return null;

  // Hold each photo on screen for roughly SLIDE_MS, so the one pace constant
  // still governs the feel.
  const durationMs = photos.length * SLIDE_MS;
  const running = !paused && !hidden;

  return (
    <div
      // LTR: the strip is a visual sequence, not text. Letting it mirror would
      // fight the translate direction.
      dir="ltr"
      className="photo-strip relative w-full overflow-hidden"
      onClick={() => setPaused((p) => !p)}
      role="img"
      aria-label="תמונות שלנו"
    >
      <div
        className="animate-marquee flex w-max gap-3"
        style={
          {
            animationDuration: `${durationMs}ms`,
            animationPlayState: running ? 'running' : 'paused',
            animationDirection: reverse ? 'reverse' : 'normal',
            // A negative delay starts the animation already part-way through,
            // so the two strips show different photos instead of marching in
            // lockstep. Still seamless — the loop is continuous.
            animationDelay: offset ? `-${Math.round(durationMs / 2)}ms` : '0ms',
          } as CSSProperties
        }
      >
        {[0, 1].map((copy) =>
          photos.map((photo) => (
            <img
              key={`${copy}-${photo.origin}`}
              src={photoUrl(photo.srcSmall)}
              width={photo.w}
              height={photo.h}
              alt=""
              draggable={false}
              loading={copy === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-32 w-auto shrink-0 rounded-xl object-cover sm:h-44"
              style={{
                backgroundImage: `url(${photo.lqip})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )),
        )}
      </div>

      {/* Soft edges so photos enter and leave rather than being cut off. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-night to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-night to-transparent"
      />
    </div>
  );
}
