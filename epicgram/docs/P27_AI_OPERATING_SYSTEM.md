# P27 — EPIC💀GRAM AI Operating System (product roadmap)

Not a set of pages — a product. Telegram stops being "client → chat → bot" and becomes:

> **Telegram Runtime → AI Operator → Approval → Mission → Execution → Audit → Analytics**

An operating system on top of Telegram, driven from one workspace.

## North-star layout (single workspace)
```
┌ left: module nav ┐┌ center: AI Command Center ┐┌ right: Live Dashboard ┐
│ Operator          ││  operator chat + cards     ││ agents status         │
│ Missions          ││  commands / approvals      ││ approvals queue       │
│ Approvals         ││  module panels             ││ active accounts       │
│ Accounts          ││                            ││ SSE / Audit stream    │
│ Channels          ││                            ││ metrics               │
│ Publisher · Agents ││                            ││                       │
│ Analytics · Security│                            ││                       │
│ Network · Runtime  ││                            ││                       │
│ Knowledge          ││                            ││                       │
└───────────────────┘└────────────────────────────┘└──────────────────────┘
```

## Module map (16)
1. **AI Command Center** — central entry point (chat + commands + cards + approvals + voice + memory + suggestions)
2. **Telegram Runtime** — TDLib, accounts, sessions, auth, folders, chats, groups, channels, stories, calls, notifications
3. **Account Center** — accounts, sessions, devices, proxies, VPN/MTProxy, status, health, risk, limits
4. **Channel Center** — channels, groups, folders, media, scheduling, crossposting, comments, moderation
5. **Mission Center** — Mission → Guardian → Approval → Execution Queue → Audit → Result (all AI actions pass through)
6. **Approval Center** — waiting/approved/rejected/cancelled/executed/failed; card: title, source, risk, payload, Approve/Reject/Cancel
7. **AI Publisher** — ideas, generator, planner, queue, approval, publish, history, analytics
8. **AI Growth** — ads, channel growth, Telegram Ads
9. **AI Analytics** — accounts, channels, views, posts, revenue, Stars, TON, errors, performance
10. **AI Security** — Risk Engine, spam, limits, flood, Guardian, audit, logs, permissions
11. **AI Knowledge Hub (RAG)** — Telegram, TDLib, Bot API, Mini Apps, TON, Fragment, VPN, security, project docs
12. **Automation Engine** — workflows, triggers, schedules, conditions, n8n, webhooks, API
13. **Network Center** — VPN, MTProxy, SOCKS5, HTTP, cloud, geo, latency
14. **AI Agents Registry** — Operator-Core, Guardian, Publisher, Analytics, Growth, Security, Vision, Voice, Knowledge, Router, Scheduler (each runnable)
15. **Plugin SDK** — plugins, providers (LLM/Voice/Image/Video), tools
16. **Settings**

Invariant across all: **MANUAL_APPROVAL_ONLY** — AI proposes/explains/prepares; execution only after operator approve; everything audited.

## Sequencing (value-first)
- **Now (done / green):** AI Operator chat, Approval Gate API (P26.1), green build, LIVE PREVIEW = AI Command Center demo (operator cards, commands, create-mission→approval→approve loop, live dashboard).
- **P26.2** — Approval UI on real `/api/approvals` (list, filters, cards, Approve/Reject/Cancel, source=db/fallback, SSE).
- **P27.1** — Unified Workspace Shell: left module nav · center Command Center · right Live Dashboard (unify EXISTING: Operator + Missions + Approvals + dashboard; other modules as "planned" panels).
- **P27.2** — Mission Center (queue, create, status, history) on real store.
- **P27.3** — Account Center (Telegram accounts + TDLib sessions).
- **P27.4** — Telegram Workspace (channels, folders, chats + AI in one window).
- **P27.5** — Knowledge Hub / RAG (operator answers from our own KB, not templates).

After Mission Center + Account Center + Telegram Workspace, EPIC💀GRAM reads as a real AI platform, not a demo.

Relates to [[epicgram-platform-modules-v1]] (15-module v1 map) and [[epic-ai-platform-model]] (4-level arch). This P27 doc is the canonical product roadmap; use its sequencing for increments.
