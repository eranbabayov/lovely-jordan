import { useEffect, useState } from 'react';
import Opening from './components/Opening';
import Slideshow from './components/Slideshow';
import type { Photo } from './lib/photos';
import { loadManifest } from './lib/photos';

/**
 * Story 3 wires Opening -> Slideshow. The gate (story 4) slots between them,
 * and the gift shelf (story 5) sits alongside the slideshow on Home — see
 * flow-diagrams.md for the order.
 */
export default function App() {
  const [begun, setBegun] = useState(false);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadManifest()
      .then(setPhotos)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!begun) return <Opening onBegin={() => setBegun(true)} />;

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
    </main>
  );
}
