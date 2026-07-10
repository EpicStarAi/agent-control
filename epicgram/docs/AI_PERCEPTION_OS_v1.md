# AI Perception OS v1.0 — EPIC💀GRAM v2 sense/act layer

> Track detail for EPIC AI OS v3 §13–16. Fixed 2026-07-02 by EPIC⭐STAR.
> Thesis: the level after AI Operator is not a "chat agent" but a **perception layer** that
> sees the screen, hears voice, understands the browser, geo-context, memory and Telegram
> events, and holds a World Model. AI Operator = answers/acts. AI Perception OS = gives the
> agent senses, memory, a map of the world, and a **safe execution loop**.
>
> Invariants: MANUAL_APPROVAL_ONLY · dry-run → approval → execute → audit · every
> perception source **consent-gated per source, never auto-on** · providers are pluggable
> adapters (mock-first, env-gated) · we never assert an external product's current state as
> fact in code — capability flags only.

---

## 1. Core architecture

```
EPIC💀GRAM AI OS v2
├─ AI Perception OS
│  ├─ Vision Layer   camera / screen / images / video / OCR / object / face
│  ├─ Voice Layer    mic / realtime STT / TTS / voice agent / speaker-id / emotion
│  ├─ Browser Layer  web actions / computer use / browser use / DOM / MCP
│  ├─ Geo Layer      maps / Street View / places / routes
│  ├─ Memory Layer   user · project · agents · channels · history
│  └─ World Model    unified state of screen + user + environment
├─ Operator Runtime  Realtime/Agents/Computer-Use · Gemini Live/Astra · browser auto · gates
├─ Avatar Runtime    HeyGen · HyperFrames · Tavus CVI · LiveKit Agents · Live Portrait/lipsync
├─ Media Render Eng.  Grok Imagine · Flow/Veo/Gemini video · HyperFrames HTML→MP4 · publisher
└─ Agent Mesh        Main Operator · NOVIKOVA · Publisher · Content · Support · Analytics ·
                     Security/OSINT (defensive/audit ONLY)
```

The **Agent Mesh** = the Cast of *operator* agents. It is the same entity family as the
Story-Universe Cast (§4 of v3): a Character can own an operator; roles never blur. So the
P29 Cast Layer is the substrate the Agent Mesh registry sits on.

## 2. Target technologies (design seams — capability-flagged, not asserted-current)

| Direction | Candidate provider | Why | Honesty |
|---|---|---|---|
| Realtime voice | OpenAI Realtime API | low-latency voice operator | mature-ish, API-gated |
| Computer use | OpenAI Computer-Use / Agents SDK | agent sees UI, acts under gate | gated, approval-loop required |
| Live see/hear/remember | Gemini Live / Project Astra | mobile camera+screen+memory | provider/region-dependent |
| Deterministic video | HyperFrames HTML/CSS/JS→MP4 | video-as-code for agents | fits our deterministic render |
| Realtime video avatar | Tavus CVI | face-to-face perception+dialogue+render | provider-gated |
| Voice/video infra | LiveKit Agents (WebRTC) | prod realtime transport | infra, self-hostable |
| Geo-grounded media | Google Flow + Street View | scenes on real locations | **Street View-feature unconfirmed** (user noted only social mentions); largely US |

## 3. Module map v1.0 (A–G)

- **A. Perception Gateway** — ingests: screen · mic · camera · browser · Telegram · geo · files.
- **B. Context Router** — decides which agent: Operator · Publisher · Support · Avatar · Analytics.
- **C. World Model DB** — state: who the user is · account · channels · tasks · what's on screen · latest events.
- **D. Action Runtime** — acts ONLY through the gate: dry-run → approval → execute → audit log.
- **E. Avatar Runtime** — voice · face · lipsync · realtime video · scenes.
- **F. Media Render Engine** — Grok / Flow / HyperFrames / HeyGen / Shorts / Telegram posts (= §7 Media Pipeline).
- **G. Agent Mesh** — main operator orchestrates subagents, roles never mixed (= Cast of operators).

## 4. Numbering reconciliation (IMPORTANT)

The user's original v1.0 roadmap numbered Perception P28→P36. In the single canonical
P-line those numbers are already taken (**P28 = Social Connect Layer**, **P29 = Story
Universe spine**). To avoid collision, Perception OS is the **P30.x track**; the user's
stages map 1:1:

| v1.0 stage | Canonical | What |
|---|---|---|
| P28 | **P30.1** | Perception schema: tables/types + `/api/perception/*` (mock, no real capture) |
| P29 | **P30.2** | Screen + Browser perception: screenshot · DOM · browser events (reuse Playwright/MCP) |
| P30 | **P30.3** | Voice runtime: OpenAI Realtime / LiveKit basic |
| P31 | **P30.4** | Avatar Runtime: HeyGen + HyperFrames provider router |
| P32 | **P30.5** | World Model: memory + channels + accounts + tasks |
| P33 | **P30.6** | Media Render Engine: Grok + Flow + deterministic video |
| P34 | **P30.7** | Agent Mesh Registry: NOVIKOVA / Publisher / Support / Analytics |
| P35 | **P30.8** | Geo layer: maps · places · Street-View-style scene grounding |
| P36 | **P30.9** | Full realtime camera/mic/screen/browser unified mode (most sensitive, last) |

Three parallel tracks, one linear build queue picked brick-by-brick:
- **P28.x** Social Connect Layer (OAuth publish per Character account)
- **P29.x** Story Universe spine (Cast · Scene · Story hierarchy · Story Engine)
- **P30.x** Perception OS (this doc)

Leaves (image-identity / video providers) plug under Scene + Media Render Engine whenever.

## 5. Build discipline

Same as every prior increment: schema-first, mock-first, non-destructive migrations
(CREATE/ALTER IF NOT EXISTS), tsc + build + fallback/DB probe green before commit, session→
workspace scoping, no stored secrets/logins, no auto-publish, no face recognition/impersonation.
Real-time capture (P30.2+) is env-gated AND consent-gated; least-sensitive first
(screen/browser → geo → camera/mic/live-avatar last).

Recommended next code brick: the **spine** — P29.1 Cast Layer — because the Agent Mesh (§G)
and Perception's "who am I talking to / who acts" both resolve against Character+role. Then
P30.1 Perception Contract + World Model shell (mock) immediately after.
