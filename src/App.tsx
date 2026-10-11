import { useState } from 'react';
import Opening from './components/Opening';

/**
 * Shell only (story 1). The screen after Opening is the gate (story 4), which
 * then reveals the slideshow (story 3) and the gift shelf (story 5). Those
 * slot in where the placeholder sits — see flow-diagrams.md for the order.
 */
export default function App() {
  const [begun, setBegun] = useState(false);

  if (!begun) return <Opening onBegin={() => setBegun(true)} />;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="text-xl font-light text-gold-soft">עוד רגע…</p>
      <p className="max-w-xs text-sm font-light text-cream/50">
        כאן ייכנסו השאלות, התמונות והמתנות
      </p>
    </main>
  );
}
