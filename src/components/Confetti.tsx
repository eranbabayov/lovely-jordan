import { useMemo } from 'react';
import type { CSSProperties } from 'react';

const PIECES = 36;
const COLORS = ['#d4af6a', '#e8c88a', '#f5ede4', '#c98fa8', '#9f7fc0'];

/**
 * Dependency-free confetti. Pure CSS keyframes, so the global reduced-motion
 * rule suppresses it without any extra branch here.
 */
export default function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        key: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.6 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 120,
        size: 5 + Math.random() * 6,
        color: COLORS[i % COLORS.length] as string,
        spin: Math.random() * 720 - 360,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.key}
          className="confetti-piece absolute top-0 block rounded-[1px]"
          style={
            {
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 1.6}px`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
