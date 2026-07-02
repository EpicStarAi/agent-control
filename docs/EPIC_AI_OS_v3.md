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
