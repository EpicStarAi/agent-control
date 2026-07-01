# Roadmap

Order: **stable Telegram-client core → Platform Core → AI overlay.** Each increment ships green (build passes) and is committed. AI extends the client, never replaces it.

## Done
- **P16** — auth guard: a ready slot no longer breaks QR/phone; new login = fresh slot. `d539aa6`
- **P17.5** — instant account switch, `Ctrl/Cmd+1..9`, no re-auth. `b42e4fa`
- **P17.2 / P17.4** — read-only account API `/v1/telegram/account/{info,storage,devices,statistics}` (getMe/premium, storage, getActiveSessions, counters). `3a6d54b`
- **P18** — OpenAPI 3.1 + `/v1/docs` + `/v1/system/health` + v1 freeze baseline. `01a6ea4`
- **P19 (partial)** — Capability API `/v1/system/capabilities` + runtime namespace `/v1/runtime/telegram/*`. `1b919c2`
- Architecture docs set (this folder).

## P19 — EPIC Platform Core (in progress)
1. ✅ Capability API + runtime namespace.
2. ⏳ Event Bus (SSE `/v1/runtime/events`, then WS). See EVENTS.md.
3. ⏳ `accounts` domain facade (`/v1/accounts`, `/{slot}/switch|logout`). See ACCOUNT_MODEL.md.
4. ⏳ Plugin Runtime (loader for `plugins/*`). See PLUGIN_API.md.
5. ⏳ Identity/Account layer unification.
6. ✅ Architecture + API docs (living).

## P20 — Account Info & Device Manager UI
Panels consuming the account API (Premium/Storage/Dialogs/Channels + devices with "current"; slot actions Open/Export/Logout).

## P21 — Telegram Workspace parity
Telegram-Desktop-level UI: folders, archive, saved, search, devices, downloads, themes, notifications, privacy, data & storage, proxy, advanced. Client must be fully usable with AI off.

## P22+ — AI overlay (on stable core)
AI Operator · AI Agents · Publisher · Workflow · Automation · Deep Research · Memory · Knowledge — as plugins/overlays over the frozen v1 contract.

## Notes
- Prod: epic-gram.com (VPS, pm2 `epicgram-web` :3015, `epicgram-api` :8788). Deploy is a separate, explicit step after green build + commit.
- Local dev: `npm run api:dev` (:8788) + `npm run dev:host` (:3015).
