# Threat Model

Companion to `SPEC.md`, governing CAP-1, CAP-3, CAP-5.

**The adversary is an impatient girlfriend, not an attacker.** Every design call below is calibrated to that and to nothing stronger. This file exists so no downstream reader mistakes the protections for security.

## The root fact

There is no backend. Every byte the app needs — answer digests, sealed gift payloads, reveal timestamps — is downloaded by the browser. Anything the client can eventually compute, a person holding the client can compute now.

## What each protection actually buys

| Threat | Protection | Real? |
|---|---|---|
| She views source and spoils a gift's contents | Payloads AES-256-GCM encrypted; key derived from the answers (CAP-5) | **Yes.** Ciphertext without the answers is unreadable |
| She reads the answers out of the bundle | Answers stored only as SHA-256 of their normalized form | **Yes.** Digests are not reversible at a glance |
| She knows the answers and unseals every gift early | — | **No.** The answers are *about her*; she knows them |
| She changes her device clock to skip a countdown | Reveal evaluated against the server `Date` header | **Mostly.** Defeats the casual trick |
| She opens devtools and edits the gate or clock | — | **No** |
| A stranger with the URL sees her photos | Gate covers the whole app; `noindex`; non-guessable URL | **Partially.** Deters discovery, not a determined visitor |

## Why encrypt at all, given row 3

Because it changes the failure mode. Without it, the gate is an `if` statement any curious person can step over, and the gift text sits in plain view in a JSON file that a mistyped URL or a shoulder-glance could expose. With it, spoiling a gift requires *deliberately* deciding to unseal it early — which is a choice she has to make, not an accident she can stumble into. That distinction is the whole product.

## The one real time lock, deliberately deferred

Withholding a gift's key until its reveal moment is the only backend-free construction that genuinely enforces time: a scheduled job (GitHub Actions cron) commits the key and redeploys at the chosen instant, so the ciphertext is undecryptable until then — by anyone, devtools included.

**Deferred for v1.** It adds a deploy dependency and a failure mode where a cron hiccup means the gift never opens, which is a worse outcome than early opening. Adopt it per-gift, only where premature discovery would genuinely ruin something (a proposal, a booked trip).

## Non-negotiables this implies

- Never describe the gate as security in code comments, commit messages, or UI copy.
- `gifts-src/` is gitignored. A committed plaintext gift defeats CAP-5 entirely and silently.
- The derived key lives in memory for the session only; never written to `localStorage`, never logged.
- Failed unseal is always retryable and never destructive — no "too many attempts", no wiping local state.
