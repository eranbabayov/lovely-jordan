/**
 * Corrected clock (CAP-3).
 *
 * Reveal gating must not be trivially bypassed by changing the device clock,
 * so time comes from the host's own HTTP `Date` response header — no
 * third-party time API and no extra dependency. The offset is read once per
 * session and applied to every tick.
 *
 * This is a SOFT lock, deliberately: devtools still defeats it. See
 * threat-model.md — the adversary is an impatient girlfriend, not an attacker.
 */

let offsetMs = 0;
let synced = false;

/**
 * Read the server's clock and cache its delta from the local one.
 *
 * Never throws and never blocks the UI: if the header is missing (some CDNs
 * strip it) or the request fails offline, the local clock stands in. A soft
 * lock is acceptable; a broken countdown is not.
 */
export async function syncClock(): Promise<void> {
  try {
    const res = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
    const header = res.headers.get('Date');
    if (!header) return;
    const serverNow = Date.parse(header);
    if (Number.isNaN(serverNow)) return;
    offsetMs = serverNow - Date.now();
    synced = true;
  } catch {
    // Offline or blocked: fall back to the local clock.
  }
}

/** Current time in ms, corrected toward the server where possible. */
export function now(): number {
  return Date.now() + offsetMs;
}

/** Whether `now()` is server-corrected or just the device clock. */
export function isSynced(): boolean {
  return synced;
}

/**
 * The `Date` header carries only second precision, so the correction is
 * accurate to about a second. Exposed for diagnostics, not for display.
 */
export function clockOffsetMs(): number {
  return offsetMs;
}
