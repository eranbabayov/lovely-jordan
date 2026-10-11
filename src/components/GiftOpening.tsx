import { useEffect, useRef, useState } from 'react';
import type { GiftConfig } from '../config';
import type { OpenedGift } from '../lib/seal';
import { openGift } from '../lib/seal';
import Confetti from './Confetti';

/** Length of the box-opening beat before the content appears. */
const SHAKE_MS = 900;

type Phase = 'opening' | 'revealed' | 'failed';

interface GiftOpeningProps {
  gift: GiftConfig;
  /** Key-derivation material from the gate. */
  material: string;
  onClose: () => void;
  onOpened: (id: string) => void;
}

/**
 * The opening ceremony and content renderer (CAP-4).
 *
 * Unsealing starts immediately but the reveal waits out the animation, so the
 * moment lands even on a fast connection. A failure is always retryable and
 * never destructive.
 */
export default function GiftOpening({ gift, material, onClose, onOpened }: GiftOpeningProps) {
  const [phase, setPhase] = useState<Phase>('opening');
  const [content, setContent] = useState<OpenedGift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    openGift(material, gift)
      .then((opened) => {
        if (cancelled) {
          if (opened.objectUrl) URL.revokeObjectURL(opened.objectUrl);
          return;
        }
        objectUrl.current = opened.objectUrl;
        // Hold the ceremony for its full length even if decryption was instant.
        const wait = Math.max(0, SHAKE_MS - (Date.now() - startedAt));
        window.setTimeout(() => {
          if (cancelled) return;
          setContent(opened);
          setPhase('revealed');
          onOpened(gift.id);
        }, wait);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [gift, material, onOpened]);

  // Release the blob when the overlay goes away.
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night/95 px-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={gift.title}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {phase === 'revealed' ? <Confetti /> : null}

      {phase === 'opening' ? (
        <div className="flex flex-col items-center gap-6">
          <span className="animate-tremble text-7xl">{gift.emoji}</span>
          <p className="text-sm font-light text-cream/50">פותחת…</p>
        </div>
      ) : null}

      {phase === 'failed' ? (
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <span className="text-5xl opacity-50">🎁</span>
          <p className="text-lg font-light text-gold-soft">המתנה לא נפתחה</p>
          <p className="text-xs font-light text-cream/40">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 rounded-full border border-gold/40 px-8 py-2.5 text-gold-soft transition hover:border-gold"
          >
            סגירה
          </button>
        </div>
      ) : null}

      {phase === 'revealed' && content ? (
        <div className="animate-reveal flex max-h-full w-full max-w-lg flex-col items-center gap-6 overflow-y-auto py-4">
          <h2 className="text-2xl font-light text-gold-soft">{gift.title}</h2>

          {content.text !== null ? (
            <p className="whitespace-pre-wrap text-center text-lg font-light leading-relaxed text-cream">
              {content.text}
            </p>
          ) : null}

          {content.kind === 'photo' && content.objectUrl ? (
            <img
              src={content.objectUrl}
              alt={gift.title}
              className="max-h-[60dvh] w-auto rounded-2xl"
            />
          ) : null}

          {content.kind === 'video' && content.objectUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={content.objectUrl} controls playsInline className="max-h-[60dvh] w-full rounded-2xl" />
          ) : null}

          {content.kind === 'audio' && content.objectUrl ? (
            <audio src={content.objectUrl} controls className="w-full" />
          ) : null}

          {content.text === null && content.objectUrl && !['photo', 'video', 'audio'].includes(content.kind) ? (
            <a
              href={content.objectUrl}
              download={gift.id}
              className="rounded-full border border-gold/40 px-8 py-2.5 text-gold-soft transition hover:border-gold"
            >
              הורדה
            </a>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="mt-2 rounded-full border border-gold/40 px-8 py-2.5 text-gold-soft transition hover:border-gold active:scale-95"
          >
            סגירה
          </button>
        </div>
      ) : null}
    </div>
  );
}
