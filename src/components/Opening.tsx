interface OpeningProps {
  /**
   * Tapping "התחילי" is deliberately the first user gesture in the app: mobile
   * browsers only allow audio playback to start from one, so CAP-8 hangs off
   * this callback. Do not auto-advance past this screen.
   */
  onBegin: () => void;
}

export default function Opening({ onBegin }: OpeningProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-8 text-center">
      <div className="space-y-4">
        <h1 className="font-display text-5xl font-light tracking-wide text-gold-soft">
          בשבילך
        </h1>
        <p className="text-lg font-light text-cream/70">משהו קטן שהכנתי לך</p>
      </div>

      <button
        type="button"
        onClick={onBegin}
        className="rounded-full border border-gold/40 bg-plum/60 px-12 py-4 text-lg font-medium text-gold-soft transition hover:border-gold hover:bg-plum-soft/70 active:scale-95"
      >
        התחילי
      </button>
    </main>
  );
}
