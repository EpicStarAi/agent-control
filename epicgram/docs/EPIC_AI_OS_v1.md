# EPIC💀GRAM — AI Company OS (canonical concept)

Not a Telegram client. Not just an AI OS. An **AI Company OS**: the user doesn't come for a chat —
they come to build a **digital organization**. Humans and AI are equal participants; Telegram is
one execution provider among many (GitHub, Gmail, Wallet, Notion…).

## Finalized layer stack (fixed 2026-07-02)
The canonical full stack. Modules attach to Identity + Workspace, never to a "user":
```
Identity → Organization → Workspace → Projects → Memory → Knowledge
        → Business Intelligence → Economy → Router AI → AI Operator → Services
Services = Telegram · Email · WhatsApp · Discord · X · Instagram · VPN · Storage · Wallet · CRM · Voice · Vision · Research · Publishing
```
- **Identity owns the system** (not "user owns modules"). Telegram is just one module of the Identity.
- **Organization** is first-class: Hide My Name / DEEP INSIDE / NOVIKOVA / THE ШАРФ / clients — each with own staff, AI, budgets, Telegrams, channels, docs. Isolated per org.
- **Business Intelligence** is its own layer above Economy: answers "what is profitable / which channel pays / cost per lead / per subscriber / per video / per post / per GPT-Grok-ElevenLabs call / storage / proxy". Router AI decides using these numbers (cost-aware routing).
- **Economy** central chain: Revenue → Costs → ROI → Growth → Forecast; funnel Organization → Project → Channel → Content → Lead → Client → Revenue.
- The operator answers "which channel makes money?", not "how many views?".

## Build order & key abstractions (fixed 2026-07-02)
Revised development order — Telegram is NOT special, it comes after the business core:
```
Identity → Workspace → Organization → Projects → Memory → Economy → (Connect Service) → Telegram/…
```
- **Project = the core unit of work** (introduced before Telegram). Org → Project → { channels · AI · wallets · docs · team · CRM · leads · analytics }. E.g. Hide My Name → RU · EN · Ads · Support · Affiliate · Media, each isolated.
- **Connect Service** (not "Telegram Login"): every provider connects identically — Telegram · WhatsApp · Instagram · Discord · X · Email all just `Connect`. Router only ever sees a **Communication Provider**; it doesn't know it's Telegram. New channels attach with zero architecture change.
- **Workflow Engine** — separate from model selection: owns chains · pipelines · automation. "Создать ролик" = one user action → Router builds ChatGPT(text)→Grok Imagine(image)→Veo(video)→Grok Voice(voice)→FFmpeg(edit)→publish(TG/IG/YT/TikTok).
- **Digital Twin** — each Organization has a twin that knows sales · costs · staff · KPI · clients · docs · memory · connections. AI talks to the Twin, not a raw DB. Enables NL business questions: "почему прибыль упала на этой неделе?", "какие каналы дают лучший ROI?", "за что мы переплачиваем в AI?", "какие публикации дали больше лидов?", "какие проекты требуют внимания сегодня?" — answered across memory+economy+analytics+comms+projects at once.
- North-star: not "AI умеет работать с Telegram" but "AI понимает весь бизнес как единую цифровую систему" — an **operating system for running a digital business**.

## Universal Connect Layer (fixed 2026-07-02, backend built — commit 08229fb)
Connect Service generalized to a **Universal Connect Layer**: every external service is an adapter. Telegram is not the center — it is the first implemented adapter (TDLib ✅), the rest are 🔌. Two content-facing classes + a service bucket:
- **Communication Providers** — Telegram · WhatsApp · Discord · Email · Slack · Teams (operator talks through these).
- **Media Providers** — YouTube · TikTok · Instagram · Facebook · X · Threads · Twitch · LinkedIn · Pinterest · Reddit (Media Hub publishes + analyzes through these).
- **Service Providers** — GitHub · Notion · Google Drive · Google Calendar · CRM · TON Wallet · VPN · RSS · VK.

Real backend (session→workspace scoped, DB+fallback, NO tokens/keys stored — only an opaque `session_ref`): `apps/web/lib/connections*.ts` + `app/api/connections` GET(catalog+status) / POST(connect). Router sees only a `Provider {class,id}`; "publish" fans out across chosen providers; adding a channel = new adapter, zero architecture change.

Derived objects: **Social Identity** — all of a person's socials under one Identity (BUCH → TG·IG·TikTok·YT·FB·Threads·Discord). **Media project** — one project spans many platforms (THE ШАРФ → TG·TikTok·IG·YT·FB·Twitch·Spotify·Apple Podcasts). **Media Analytics** (not "Telegram Analytics") — followers·growth·revenue·leads·CPA·ROI·engagement·cost-per-video·cost-per-subscriber across ALL platforms at once ("TikTok fastest-growing", "YouTube = 67% revenue", "Telegram best LTV"). **Media Hub** — videos·images·thumbnails·subtitles·scripts·voiceovers·sources·brand-packs.

## Concept hierarchy (earlier direction, superseded by the stack above)
```
Identity → Organization → Department → Operator → Mission → Execution → Audit
```
- **Identity** (replaces "User") — the person's core; services (Telegram, Discord, Gmail, GitHub, Wallet, Google, Apple) attach to it. None is the center.
- **Organization** — the digital company (EPIC STAR / HIDE MY NAME / DEEP INSIDE / Client #N). Owns humans, AI operators, assets, wallets, roles, limits, models. Fully isolated per org.
- **Departments** — Marketing · Sales · Media · Development · Security · Finance · Support. Each has its own Telegram, AI, wallet, budget, KPI.
- **Humans + AI Operators** are peers inside the org: Founder/Operator/Publisher/Designer/Developer/Analyst alongside Research AI / Voice AI / Vision AI / Publisher AI / Marketing AI / Finance AI.
- **AI Command Center** — main screen (not Telegram). Missions launch from here.

## Referral = invitation into an organization
```
Invite code → "Вы приглашены в EPIC STAR · роль Publisher · лимит 500 USDT" → Принять
→ Identity + Workspace in that org → AI Operator Initialization → Command Center
```

## Marketplace = App Store of AI capabilities
Cards like: `Research AI ★★★★★ · OpenAI o3 · 0.03$ · Install` · `Video AI · Runway · Install` · `Voice AI · ElevenLabs · Install`.
Each: execution cost · required models · avg time · token spend · providers (OpenAI/Anthropic/Gemini/xAI/local).

## Economy (nested budgets)
```
Organization Budget → Department Budget → Agent Budget → Execution Cost
```
Approval example: an agent proposes a task → "Research 2.4$ + Image 0.8$ + Telegram Ads 5$" → Approve → Execute → Logs.
Every agent run is an economic operation through budget + audit. MANUAL_APPROVAL_ONLY throughout.

## Telegram = execution provider (not core)
```
Command Center → Missions → { Telegram | GitHub | Gmail | Wallet | … } → Execution → Audit Log
```
New channels attach later without architecture changes.

## Build discipline (near-term — do NOT over-engineer yet)
Organizations / departments / full hierarchy stay as **architecture direction**, NOT code, for the first working release.
Practical order (user-set 2026-07-02):
1. **Finish the personal Workspace** (single-tenant, working end-to-end).
2. **Real Telegram login + TDLib** (per-user session isolation).
3. **Missions + Approval + Economy** to a working state.
4. **THEN** expand the model to Organization → Departments → Teams.
This ships a working product first, then scales without fundamental rework.

## Status
Done (DB-backed, simulated, pushed): Approval API (P26.1) · Wallet Economy (P28) · Access Gate/Referral (P30) · Multi-Tenant Core + AI Operator Initialization (P31). Demo shell on gh-pages (Command Center · Telegram Workspace · AI Economy · Situation Awareness).
Next per discipline above: finish personal Workspace → Telegram Authorization → TDLib. Organization layer deferred.

Relates to [[p27-ai-operating-system]] (module/roadmap detail). This doc is the top concept.
