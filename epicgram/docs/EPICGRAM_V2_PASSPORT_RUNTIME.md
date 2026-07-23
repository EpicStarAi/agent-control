# EPIC💀GRAM v2 — Passport ⇄ Runtime (ecosystem architecture)

> Fixed 2026-07-02 by EPIC⭐STAR. Direction doc for v2.0 (post–Release-1.0). **DOC ONLY — no code
> under Feature Freeze.** Extends `CHARACTER_PASSPORT_ASSET_PACKS.md` (v1/v2 packs) and
> `EPIC_AI_OS_v3.md` (Story Universe). Supersedes the linear "Passport → Runtime" arrow.

## Core primitive: separation, not a pipeline
The base architecture of EPIC💀GRAM is **not** a 12-step linear conveyor. It is a **separation of two
sentities with different lifecycles**:

```
        Character Passport  (portable spec — DATA)
                 ⇅  load / sync / version
        Operator Runtime    (execution env — PROCESS)
```

- **Character Passport (`.epic`)** = a versioned, serializable, portable specification of a digital
  human. Declarative. Exportable/importable. The interchange format across every EPIC product.
- **Operator Runtime** = a live service that *loads* a passport and executes it in a concrete
  environment (Telegram / Web / Mobile / future). Stateful. Not portable.

Analogy (with its limits, see §3): Docker image ↔ engine · HTML ↔ browser · game assets ↔ game engine.

## Ecosystem shape
```
          ┌────────────────────────────┐
          │  Character Passport (.epic) │   ← portable spec, versioned
          │  Identity · Personality ·   │
          │  Knowledge · Assets ·       │
          │  Provider Assets            │
          └──────────────┬─────────────┘
                    load / sync / version
        ┌──────────────┬─┴────────────┬──────────────┐
   Telegram Runtime   Web Runtime   Mobile Runtime   (future runtimes)
        └──────────────┴─────────────┴──────────────┘
              Publisher · Voice · Browser Agent
                          │
                   Memory Authority        ← single writer (see §3.1)
                          │
                    Approval Gate           ← MANUAL_APPROVAL_ONLY
                          │
                   Social Platforms
```
One passport, many runtimes. Each runtime implements its own capabilities but reads the same passport.
New providers (Grok · Veo · Kling · ElevenLabs · HeyGen · LivePortrait) are **plug-in modules under the
Render Router — they never change the passport structure.**

## §3 — Design constraints (the hard parts the diagram hides)
The Docker analogy breaks in three places. These are binding constraints, not footnotes.

### 3.1 State write-back / concurrency — the real problem
A Docker image is immutable; a Character Passport **accumulates state** (memory, new assets) while
running. If TG + Web + Mobile runtimes load the same passport at once, N runtimes writing memory =
merge conflicts. **Rule: the passport is read-mostly master; there is exactly ONE Memory Authority
(canonical store). Runtimes are clients that propose writes through it — they never each own memory.**
"Sync" in the diagram is where all the difficulty lives; it is a single-writer sync, not peer-to-peer.

### 3.2 Secrets never live in the passport
A portable `.epic` file that carried OAuth tokens/cookies would be a security disaster and violates the
no-stored-secrets invariant. **The passport REFERENCES accounts (provider{class,id}); the runtime holds
the live tokens.** Identity/personality/assets are portable; credentials are environment-bound and stay
in the runtime.

### 3.3 Versioned schema (forward/backward compatible)
`.epic` is a **versioned schema** (v1, v2, …). An older runtime must still load a newer passport
(ignore-unknown), a newer runtime must still load an older passport (defaults). Matches the schema-first,
backward-compatible invariant. Without an explicit export/import format, "portable" is just a word — the
**format itself is the real "Digital Human Standard" deliverable.**

## §4 — What already exists (seed of this model)
- Passport packs: Identity (P27.8) · Personality/Knowledge (Character Profile P29.2) · Visual Assets
  (Template Cards) · Story (Story Planner P29.3 + Relationship Graph P29.1) · Provider Assets partial
  (Render Router already emits per-provider outputs).
- Runtime skeleton: the operator vertical (operator-core / production-gate / live-ops-monitor /
  operator-analytics + `/operator/*` + EpicGramAgentOS UI) + Economy Engine tab — all mock, but the
  contour stands. Telegram Runtime = real TDLib (`services/api`, 2 accounts).
- Memory Authority seed = `/api/memory` (owner/project/org scopes). Approval Gate = Quality Gate +
  manual approval. Social = Universal Connect Layer (`/api/connections`).

So Runtime is **not a blank — it is an under-filled existing layer.** v2 names the separation and the
`.epic` format; it does not invent a parallel system.

## §5 — What is v2.0 (NOT before 1.0)
- The `.epic` export/import format + version negotiation.
- Provider Assets as a materialized layer.
- Multi-runtime concurrent load + single-writer Memory sync.
- Everything realtime: voice dialogs, streams, cross-character live interaction, autonomous chat, full
  economy, always-on Operator Runtime.
- Release 1.0 ships only the manual loop: character → scene → media → approval.

## §6 — Why this is the ecosystem base
One data format, many execution engines. The passport becomes the interchange format across all EPIC
products (VPN hub, DEEP INSIDE, future clients); the runtime is what any product instantiates over it.
This scales to a multi-operator, multi-client platform in a way a linear conveyor never could — **as long
as §3.1–3.3 hold.** The separation is the primitive; the linear formula was a simplification that hid the
loop and the portability boundary.

## Discipline
Becomes official EPIC💀GRAM v2 architecture **after P30.1 (first real Grok asset) closes and Release 1.0
ships.** Provider Assets and Operator Runtime cannot be proven until ≥1 real provider yields an asset —
P30.1 is the hard prerequisite for the entire v2 direction.
