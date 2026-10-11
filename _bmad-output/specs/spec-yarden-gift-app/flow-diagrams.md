# Flow Diagrams

Companion to `SPEC.md`. Holds all diagrams; the kernel carries prose only.

## Screen flow (CAP-1 → CAP-4)

```mermaid
flowchart TD
    A["OPENING<br/>one line of Hebrew, tap to begin"] --> B
    A -.->|"tap is also the autoplay gesture"| M["music starts · CAP-8"]
    B{"THE RITUAL · CAP-1<br/>Q1 nickname · Q2 whose are you"}
    B -->|"wrong"| B2["shake + warm message<br/>hint at 3 tries · first letter at 6<br/>no attempt limit, ever"]
    B2 --> B
    B -->|"both correct"| C["derive key from answers<br/>persist unlocked flag"]
    C --> D["HOME"]
    D --> E["Slideshow · CAP-2<br/>auto-advance, loops forever"]
    D --> F["Gift shelf · CAP-3"]
    F --> G{"reveal moment passed?"}
    G -->|"no"| H["locked box + live countdown<br/>trembles at T-60s"]
    H -->|"countdown hits zero"| I
    G -->|"yes"| I["openable box ✨"]
    I --> J["OPENING SEQUENCE · CAP-4<br/>shake → lid off → confetti"]
    J --> K["unseal payload · CAP-5<br/>render by gift type"]
    K --> L["stays reopenable forever"]
```

## Returning visit

`localStorage` holds the unlocked flag, so the ritual is a first-visit event. The derived key is **not** persisted — it is re-derived from the stored answer digests' preimages only during a live unlock, so a returning visitor skips the gate but a fresh unseal still requires the session that answered.

```mermaid
flowchart LR
    S["open link"] --> T{"unlocked flag set?"}
    T -->|"no"| U["OPENING → RITUAL"]
    T -->|"yes"| V["HOME directly"]
```

## Gift state machine (CAP-3, CAP-4)

```mermaid
stateDiagram-v2
    [*] --> Pending: revealAt in the future
    [*] --> Ready: revealAt null or already passed
    Pending --> Imminent: T-60s
    Imminent --> Ready: countdown reaches zero
    Ready --> Opening: she taps the box
    Opening --> Opened: unseal + render succeeds
    Opening --> Ready: unseal fails (retryable, never destructive)
    Opened --> Opened: reopened any number of times
```

`Pending → Ready` must be driven by the corrected clock (see `stack.md § Clock`), not by `Date.now()` alone.

## Build pipeline

```mermaid
flowchart LR
    I1["images/<br/>originals, HEIC included"] --> P1["build-images"]
    P1 --> O1["public/images/*.webp<br/>+ manifest.json"]
    G1["gifts-src/<br/>plaintext · gitignored"] --> P2["seal-gifts"]
    P2 --> O2["public/gifts/*.sealed.json<br/>ciphertext only"]
    O1 --> B["vite build"]
    O2 --> B
    C1["src/config.ts<br/>answer digests, gift list, reveal times"] --> B
    B --> D["dist/ → static host over HTTPS"]
```
