/**
 * Audio layer (CAP-8).
 *
 * Mobile browsers refuse to start audio outside a user gesture — which is
 * exactly why the Opening screen's tap exists. `unlock()` must be called from
 * that handler.
 *
 * No music track is supplied, so the app ships silent. The chime is
 * SYNTHESIZED with WebAudio rather than loaded from a file, so it needs no
 * asset and works offline. That means the mute control is meaningful even
 * with `MUSIC_SRC === null`, rather than being a dead switch.
 */

import { MUSIC_SRC, STORAGE_KEYS } from '../config';

let context: AudioContext | null = null;
let music: HTMLAudioElement | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.muted) === '1';
  } catch {
    return false;
  }
}

function persistMuted(value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.muted, value ? '1' : '0');
  } catch {
    // Preference only.
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  persistMuted(value);
  if (music) music.muted = value;
}

/**
 * Call from the Opening tap. Creates the AudioContext inside the gesture, and
 * starts the track if one is configured.
 */
export function unlock(): void {
  try {
    if (!context) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) context = new Ctor();
    }
    void context?.resume();

    if (MUSIC_SRC && !music) {
      music = new Audio(MUSIC_SRC);
      music.loop = true;
      music.volume = 0.35;
      music.muted = muted;
      void music.play().catch(() => {
        // Autoplay still refused: the mute toggle can retry later.
      });
    }
  } catch {
    // Audio is a nicety; never let it break the app.
  }
}

/**
 * A soft two-note chime for the moment a countdown reaches zero.
 * Synthesized, so there is no file to ship or fail to load.
 */
export function playChime(): void {
  if (muted || !context) return;
  try {
    const now = context.currentTime;
    // A perfect fifth, quiet and short — a nudge, not an alarm.
    for (const [index, frequency] of [880, 1320].entries()) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.14;

      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);

      osc.connect(gain).connect(context.destination);
      osc.start(start);
      osc.stop(start + 0.95);
    }
  } catch {
    // Never let a chime failure surface to her.
  }
}

/** Whether there is a music track at all, as opposed to only the chime. */
export function hasMusic(): boolean {
  return MUSIC_SRC !== null;
}
