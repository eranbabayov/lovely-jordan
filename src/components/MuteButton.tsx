import { useState } from 'react';
import { isMuted, setMuted } from '../lib/audio';

/**
 * Always visible, because the synthesized countdown chime exists even with no
 * music track — so this is never a dead control.
 */
export default function MuteButton() {
  const [muted, setLocalMuted] = useState(isMuted);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setLocalMuted(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'הפעלת צלילים' : 'השתקה'}
      aria-pressed={muted}
      className="pointer-events-auto rounded-full bg-night/60 p-2.5 text-cream/60 backdrop-blur-sm transition hover:text-cream active:scale-95"
    >
      <span aria-hidden className="text-base">
        {muted ? '🔇' : '🔊'}
      </span>
    </button>
  );
}
