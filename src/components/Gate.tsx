import { useEffect, useRef, useState } from 'react';
import { ANSWERS } from '../config';
import { hasSecureCrypto, sha256Hex } from '../lib/crypto';
import { keyMaterial, normalize } from '../lib/normalize.js';

const HINT_AFTER = 3;
const LETTER_AFTER = 6;

interface GateProps {
  /** Receives the key-derivation material. Memory only — never logged. */
  onUnlock: (material: string) => void;
}

/**
 * The ritual (CAP-1).
 *
 * There is no attempt limit, no cooldown and no lockout, by design: the worst
 * outcome this app can produce is Yarden locked out of her own gift. Wrong
 * answers escalate to a hint, then to the first letter, and never to a dead
 * end.
 */
export default function Gate({ onUnlock }: GateProps) {
  const [step, setStep] = useState(0);
  const [value, setValue] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const given = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const question = ANSWERS[step];

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!hasSecureCrypto()) {
      setFatal('הדף צריך לרוץ על HTTPS כדי שהשאלות יעבדו.');
    }
  }, []);

  if (fatal) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-lg font-light text-gold-soft">{fatal}</p>
        <p className="max-w-xs text-xs font-light text-cream/40">
          crypto.subtle is unavailable outside a secure context.
        </p>
      </main>
    );
  }

  if (!question) return null;

  // No event parameter: @types/react 19 deprecates the FormEvent aliases, and
  // the caller handles preventDefault inline so no React event type is named.
  const submit = async () => {
    if (checking || value.trim() === '') return;
    setChecking(true);
    try {
      const digest = await sha256Hex(normalize(value));
      if (question.digests.includes(digest)) {
        given.current = [...given.current, value];
        setValue('');
        setAttempts(0);
        if (step + 1 < ANSWERS.length) {
          setStep(step + 1);
        } else {
          onUnlock(keyMaterial(given.current));
        }
      } else {
        setAttempts((a) => a + 1);
        setValue('');
        inputRef.current?.focus();
      }
    } catch {
      setFatal('משהו נתקע. נסי לרענן את הדף.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
      <div className="flex gap-2" aria-hidden>
        {ANSWERS.map((a, i) => (
          <span
            key={a.q}
            className={`h-1.5 w-8 rounded-full transition-colors ${
              i < step ? 'bg-gold' : i === step ? 'bg-gold/50' : 'bg-cream/15'
            }`}
          />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        key={attempts}
        className={`flex w-full max-w-sm flex-col items-center gap-6 ${attempts > 0 ? 'animate-shake' : ''}`}
      >
        <h2 className="text-center text-2xl font-light text-cream">{question.q}</h2>

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label={question.q}
          className="w-full rounded-2xl border border-gold/25 bg-plum/40 px-5 py-3.5 text-center text-cream outline-none transition focus:border-gold/70"
        />

        <button
          type="submit"
          disabled={checking || value.trim() === ''}
          className="rounded-full border border-gold/40 bg-plum/60 px-10 py-3 text-gold-soft transition hover:border-gold hover:bg-plum-soft/70 active:scale-95 disabled:opacity-40"
        >
          {checking ? '…' : 'יאללה'}
        </button>
      </form>

      <div className="min-h-16 max-w-sm text-center" aria-live="polite">
        {attempts > 0 ? (
          <p className="text-sm font-light text-cream/70">לא בדיוק… תחשבי שוב 💭</p>
        ) : null}
        {attempts >= HINT_AFTER ? (
          <p className="mt-2 text-sm font-light text-gold-soft/80">{question.hint}</p>
        ) : null}
        {attempts >= LETTER_AFTER ? (
          <p className="mt-2 text-sm font-light text-gold-soft/80">
            מתחיל באות <span className="font-medium text-gold">{question.firstLetter}</span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
