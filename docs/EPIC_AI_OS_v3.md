# EPIC💀GRAM AI OS v3 — Story Universe / Digital Cast OS

> Canonical architecture, fixed 2026-07-02 by EPIC⭐STAR.
> Supersedes the "avatar = project" model. Axis of the system is no longer a single
> avatar, nor a Telegram channel — it is the **Project Graph**. Telegram, accounts and
> avatars are leaves, not the core. Invariant everywhere: **MANUAL_APPROVAL_ONLY**,
> no auto-publish, schema-first & backward-compatible, no stored logins/secrets.

---

## 1. Canonical hierarchy

```
ORGANIZATION
   │
PROJECT (Universe)          → Goals · Knowledge · Business
   │
STORY ENGINE               → Season → Episode → Scene
   │
CAST ORCHESTRATOR          → selects who appears, who leads the frame
   │
CHARACTER                  → Main Hero · Side Hero · NPC/Guest (Relationship Graph)
   │
AI OPERATOR                → one operator per character
   │
ACCOUNTS                   → Universal Connect Layer (TG/IG/YT/TikTok/X/…)
   │
MEDIA PIPELINE             → idea → … → publish
   │
PUBLISHING
   │
ANALYTICS
   │
ECONOMY
   │
KNOWLEDGE GRAPH
   │
MEMORY
```

Above all per-character operators sits one **Director** (EPIC Director) that distributes
roles, tasks and publications across every character operator.

---

## 2. Project (Universe)

A Project is a brand / universe, owned by an Organization. It carries three faces:
- **Goals** — what the universe is trying to achieve.
- **Knowledge** — the universe's knowledge graph slice (lore, brands, locations, events).
- **Business** — revenue, costs, ROI for the universe.

A Project owns a **Cast** (the set of Characters) and a **Story Engine**.

---

## 3. Story Engine

```
Universe → Season → Episode → Scene → Cast (in scene) → Dialogue → Media Pipeline
```

- **Timeline / Story Arcs** keep chronology and continuity.
- **Cast Orchestrator** resolves, per Scene, which Characters can appear together, who
  conflicts, who leads the dialogue, who is primary in frame — using the Relationship Graph.
- A **Scene** is multi-character (a cast list + a template) and is the unit that spawns
  render jobs (reuses the P27.8 template → N-candidate pipeline, now scene-level).

This turns the system from *content generation* into *series generation*.

---

## 4. Character — a full digital actor (not an "avatar")

```
Character
├── Identity        ├── Voice          ├── Knowledge
├── Biography       ├── Face            ├── Schedule
├── Personality     ├── LoRA            ├── Tasks
├── Memory          ├── InstantID       ├── AI Operator
├── Goals           ├── Motion          └── Analytics
├── Skills          ├── Clothes
├── Prompt          ├── Props
```

Each Character is an independent unit with its own memory, accounts, goals and AI operator.
The current `avatars` entity + passport is the seed of Character — evolved in place, not rewritten.

### Roles
`main` · `side` · `enemy` · `friend` · `narrator` · `npc` (guest / brand / random).

### Relationship Graph
Directed edges Character↔Character with a relation type:
`friend · husband · manager · cameraman · rival · sponsor · …`

Example:
```
NOVIKOVA
├── friend    → EVA
├── husband   → AI CHIP
├── manager   → EPIC STAR
├── cameraman → SHO SHO
├── rival     → X
└── sponsor   → Brand
```

The graph is what lets the AI reason about co-presence, conflict, dialogue turns and
frame priority — the real unlock over a flat list of avatars.

---

## 5. Social layer (Accounts) — on the Universal Connect Layer

Each Character owns Accounts across many providers; the Router only ever sees a
`Provider{class,id}`, never "Telegram" specifically. New platforms plug in with zero
architecture change.

```
Character → Accounts
  Telegram (User · Bot · Channels · Groups · Stories) · Instagram · Facebook ·
  Threads · TikTok · YouTube · X · Discord · Reddit · LinkedIn · Twitch · Kick ·
  VK · Pinterest · Website
```

This is the same Universal Connect Layer already built (`/api/connections`); publishing
stays behind an approval gate. No stored logins; OAuth-based (P28 Social Connect Layer).

---

## 6. AI Operator (per character) + Director (over all)

Each Character has its own operator that sees: memory · tasks · calendar · messages ·
comments · analytics · ads · deals · revenue · subscribers · scripts.

One **EPIC Director** coordinates all character operators (NOVIKOVA AI · EVA AI · BUCH AI ·
THE ШАРФ AI · HIDE MY NAME AI · AI CHIP AI · TUBER FACTS AI · …), assigning roles, tasks
and publications across the whole cast.

---

## 7. Media Pipeline (one shared conveyor)

```
Idea → Story → Scene → Cast → Image → Video → Voice → Music → Edit →
Subtitle → Translate → Publish → Analytics → Memory
```

Provider-pluggable at every media leaf via the RenderProviderAdapter contract:
Grok Imagine · Gemini · Seedance · Veo · Kling · Runway · HeyGen · ElevenLabs · future.
Image identity (InstantID / PuLID / PhotoMaker) and video/lipsync are **leaves under
Scene**, not the spine. The P27.1–P27.8 job → candidate → quality-gate → asset pipeline
is the current implementation of this conveyor's core.

---

## 8. Economy

```
Organization → Revenue
  Ads · Telegram Stars · Donations · Sponsorship · Affiliate · Merchandise ·
  Courses · VPN · SaaS · AI Services · Marketplace
```

Every Character knows how much it brings to the Project. Economy stays the center;
Router is cost-aware; every run is an economic op via budget + Approval.

---

## 9. Knowledge Graph

A Character `knows` → Characters · Projects · Brands · Locations · Events · Subscribers ·
Clients · Companies · Topics · Documents · Media · Products · Campaigns.

The AI stops operating on scattered files and starts operating on a graph of knowledge —
one of the strongest differentiators of the system.

---

## 10. What this gives

Scales not to 5–10 characters but to hundreds/thousands of digital entities. Each stays an
independent unit (memory · accounts · goals · operator); the Director coordinates them.
This is not a multimodal content generator — it is an **operating system for managing
digital personalities and media universes**.

---

## 11. Mapping onto the current build (honest state, 2026-07-02)

Already built (real Next app, `apps/web`, all mock-safe / approval-gated):
- **Media Pipeline core** — P27.1→P27.8: avatars · passports · render packs · render jobs
  (8-status queue + provider router) · candidates + Quality Gate · Grok browser skeleton ·
  Identity Intake + Template Cards. → becomes the Scene/Media-Pipeline leaf.
- **Universal Connect Layer** — `/api/connections` (communication/media/service providers,
  no tokens stored). → becomes the Accounts layer.
- **Memory** — owner/project/organization scopes (`/api/memory`). → Character/Project memory.
- **Operator + Approval + Economy/Wallet + Access Gate/Referral + Multi-tenant core** —
  earlier P26–P36 increments. → Organization/Operator/Economy layers.

Not yet built: Project(Universe) entity, Character role + Relationship Graph, Scene (multi-
character), Story hierarchy (Season/Episode/Timeline), Story Engine/Router, per-character
Director orchestration, Knowledge Graph as a first-class layer.

## 12. Build sequencing (schema-first, non-destructive)

Spine before providers — so identity/video/publish attach to Character-in-Cast-in-Scene:

- **P29.1 Cast Layer** — Project(Universe) + Character(role, projectId) + Relationship graph.
  Backward-compatible: existing `avatars` → default Project, evolve in place (ADD COLUMN
  role/project_id + new `character_relationships` table, CREATE/ALTER IF NOT EXISTS only).
  UI: Avatar → Персонаж, group by Project, role, simple relationship graph.
- **P29.2 Scene (multi-character)** — Scene entity (cast list + template) → template→jobs at
  scene level.
- **P29.3 Story hierarchy** — Universe → Season → Episode → Scene + Timeline.
- **P29.4 Story Engine / Router** — episode → pick cast via graph → dialogue → media
  pipeline → publish (the series conveyor). + Director orchestration over character operators.
- **Leaves, in parallel / after:** P27.9 Real Image Identity Provider Adapter (contract-first:
  identity_provider_mock + placeholders photomaker/pulid/instantid/comfyui), P27.10 Video/
  Lipsync provider, P28.1→ Social Connect Layer (OAuth publish per Character account).

Invariants: MANUAL_APPROVAL_ONLY, no auto-publish, no face recognition/impersonation,
no stored credentials, non-destructive migrations, Telegram = one provider not the core.

---

## 13. Perception OS (capability layer under AI Operator)

The next layer after LLM-only operators: the operator that **sees, hears and understands
context** in real time. Perception is NOT a new paradigm to invent and NOT a replacement
for the Project/Cast spine — it is a **provider/adapter family + a fused World Model** that
the AI Operator consumes, sitting alongside Decision Engine + Memory Engine. Same pattern
already used across the codebase (RenderProviderAdapter · SocialConnectorAdapter · Universal
Connect Layer): every perception source is a pluggable adapter, **mock-first, real providers
env-gated AND consent-gated**.

```
AI OPERATOR
   ├── Decision Engine
   ├── Memory Engine
   └── PERCEPTION LAYER
         👁 Vision      Camera · Screen · OCR · Object detection · Face tracking
         🎤 Audio       STT · Speaker ID · Emotion · Noise filtering
         🗺 Geo         Google Maps · Street View · Places · Earth
         🧠 Context     Memory · Calendar · Gmail · Telegram · Browser state
         🌐 Web         Browser Agent · DOM · Playwright · MCP
         🎭 Avatar I/O  HeyGen · Tavus · Live Portrait (live conversational avatar)
         🎬 Generation  Flow · Veo · Gemini · Grok Imagine · Seedance · Kling · Runway
         📡 Publish     Universal Connect Layer (TG/YT/TikTok/IG/FB/X/…)
```

Contract sketch — `PerceptionProviderAdapter { id, name, kind(vision|audio|geo|context|web|
avatar|generation), mode(mock|api|browser|stream), enabled(), start()/stop()|read(),
toContext() }` → normalizes raw signals into the World Model. Generation sources here are the
same Media-Pipeline leaves from §7; Avatar-I/O is the live/interactive counterpart.

## 14. World Model (fused perceptual state)

The Operator never consumes raw feeds — adapters normalize into a **World Model**: where am I ·
what is around me · what is happening now · who am I talking to · what is on screen · what is on
the desk · which services are open · what the user is doing. This is *digital perception of the
world*, not a chat window. Ten-level flow above the operator:

```
1 Vision → 2 Voice → 3 Browser → 4 Geo → 5 Memory →
6 Reasoning → 7 Planning → 8 Execution → 9 Generation → 10 Publishing
```

Every action stays MANUAL_APPROVAL_ONLY; **each perception source is consent-gated
per-source** (camera/mic/screen/geo are a heavy privacy surface — never auto-on).

## 15. Geo Intelligence (sub-module)

`Google Maps · Street View · Places · Earth → Flow Scene Builder`. Lets the Operator anchor a
**Scene** to a real-world location ("NOVIKOVA выходит из Starbucks на Times Square", "реклама у
Apple Store Fifth Avenue"). Ties into §3 / P29.2: a Scene may carry a geo-anchor consumed by
the Generation leaf. Region-limited today (largely US), expanding — modelled as a provider with
capability flags, never a guarantee.

## 16. Maturity honesty & sequencing update

Real-time multimodal perception (live camera/mic/screen, low-latency voice, live conversational
avatars, geo-anchored video generation) is the direction the major players are moving toward, but
it is **cutting-edge, provider-dependent and region-limited** — we design the seams now and plug
real providers as they mature and as the user explicitly opts in. We do NOT assert any specific
external product's current state as fact in code.

**Spine still first.** Perception becomes its own track, contract-first & mock (heavy infra +
privacy surface → consent-gated, provider-gated, never auto-on):
- **P29.1–P29.4** — Story Universe spine (Cast · Scene · Story hierarchy · Story Engine), as fixed.
- **P30.1** — Perception Provider Contract + World Model shell (mock adapters, no real capture).
- **P30.2+** — real sources env-gated + consent-gated, one at a time; least-sensitive first
  (screen/browser via existing Playwright/MCP → geo → camera/mic/live-avatar last).
