import { useEffect, useState } from 'react';
import { NOTES, NOTE_ROTATE_MS } from '../config';

/**
 * One line at a time, cross-fading to the next.
 *
 * Reserves its own height so the lines swapping never nudges the gifts above
 * it — a layout shift under a moving element is the kind of thing that reads
 * as broken rather than alive.
 */
export default function RotatingNote() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (NOTES.length <= 1) return;

    const hold = window.setInterval(() => {
      // Fade out, swap the text while invisible, fade back in.
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % NOTES.length);
        setVisible(true);
      }, 600);
    }, NOTE_ROTATE_MS);

    return () => window.clearInterval(hold);
  }, []);

  if (NOTES.length === 0) return null;

  return (
    <p
      className="flex min-h-12 items-center justify-center px-6 text-center text-lg font-light text-cream/75 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
      aria-live="polite"
    >
      {NOTES[index]}
    </p>
  );
}
