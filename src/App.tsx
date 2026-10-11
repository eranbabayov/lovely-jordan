import { useEffect, useState } from 'react';
import Opening from './components/Opening';
import Gate from './components/Gate';
import Slideshow from './components/Slideshow';
import GiftShelf from './components/GiftShelf';
import type { Photo } from './lib/photos';
import { loadManifest } from './lib/photos';
import { STORAGE_KEYS } from './config';

function readStoredMaterial(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.unlocked);
  } catch {
    // Private browsing can throw on access; treat as not-yet-unlocked.
    return null;
  }
}

/**
 * Opening -> Gate -> Home. The gift shelf (story 5) joins the slideshow on
 * Home; see flow-diagrams.md.
 *
 * Two deliberate departures from that diagram, both recorded in the story spec:
 *
 * 1. The key material IS persisted. The diagram had it memory-only, which
 *    would have left a returning visitor able to skip the gate but unable to
 *    open any gift — the key would be gone. Storing it on her own device
 *    costs nothing against the real threat model (it protects against reading
 *    the shipped source, not against holding her unlocked phone).
 * 2. A returning visitor still sees Opening, and only the Gate is skipped.
 *    The opening tap is the one user gesture mobile browsers accept for
 *    starting audio, so removing it would break CAP-8 on repeat visits.
 */
export default function App() {
  const [begun, setBegun] = useState(false);
  const [material, setMaterial] = useState<string | null>(readStoredMaterial);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openedIds, setOpenedIds] = useState<string[]>([]);

  useEffect(() => {
    loadManifest()
      .then(setPhotos)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const unlock = (value: string) => {
    setMaterial(value);
    try {
      window.localStorage.setItem(STORAGE_KEYS.unlocked, value);
    } catch {
      // Persistence is a convenience; the session still works without it.
    }
  };

  if (!begun) return <Opening onBegin={() => setBegun(true)} />;
  if (material === null) return <Gate onUnlock={unlock} />;

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-lg font-light text-gold-soft">התמונות לא נטענו</p>
        <p className="max-w-sm text-xs font-light text-cream/40">{error}</p>
      </main>
    );
  }

  if (!photos) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm font-light text-cream/40">רק רגע…</p>
      </main>
    );
  }

  return (
    <main className="relative flex-1">
      <Slideshow photos={photos} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <GiftShelf
          openedIds={openedIds}
          onOpen={(gift) =>
            setOpenedIds((ids) => (ids.includes(gift.id) ? ids : [...ids, gift.id]))
          }
        />
      </div>
    </main>
  );
}
