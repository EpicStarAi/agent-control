# EPIC☠GRAM — Architecture

EPIC GRAM is **not** "Telegram with AI". It is a **platform** where Telegram is one runtime among many, and AI lives *on top of* a stable client core.

## Layers
```
UI            Web · Desktop(Electron) · Android · iOS · WebApp
Platform API  /api/v1/*   versioned + frozen (see API.md)
Identity+Acct one identity → many accounts → many runtime slots (see ACCOUNT_MODEL.md)
Runtimes      telegram · browser · discord · whatsapp · local-ai · cloud-ai (see RUNTIME.md)
Services      operator · production-gate · analytics · live-ops · media · memory
Infra         TDLib · Postgres · Redis · MinIO · Ollama/OpenRouter · n8n
```
Cross-cutting: **Event Bus** (SSE/WS, see EVENTS.md) and **Plugins** (see PLUGIN_API.md).

## Package/service map (repo)
```
apps/web           Next.js UI, PWA shell, Telegram Mini App surface, /api proxies
apps/desktop       Electron shell
services/api       HTTP API (:8788): runtimes, operator, auth, audit, account registry
  src/telegram-runtime.mjs   multi-account slots (state + lifecycle)
  src/tdlib-adapter.mjs      TDLib client per slot (isolated session dir)
  src/operator-*.mjs         operator core, agent, analytics, production-gate
  openapi.yaml               API contract (source of truth)
storage            PostgreSQL (durable), Redis (queues/cache), MinIO (objects)
```

## Core principles
1. **Platform, not client.** Telegram is `runtime/telegram`. New channels plug in as new runtimes without touching core.
2. **Thin client.** All logic (account switching, sessions, TDLib) lives server-side. Client: `GET /accounts` → `POST /accounts/{slot}/switch` → `GET /telegram/dialogs`.
3. **One frozen contract.** `/api/v1/*` serves every client. See API.md.
4. **Capabilities over device checks.** UI adapts by `GET /v1/system/capabilities`, never `if (android)`. See CAPABILITIES.md.
5. **Events over polling.** Runtime changes pushed via Event Bus. See EVENTS.md.
6. **AI is an overlay.** Telegram client fully usable with AI off. AI extends, never replaces.
7. **Consent + safety first.** Telegram integrations explicit, official, consent-based. Outbound (send/publish/bulk/finance) is review-gated via the operator Approval Gate; Kill Switch (production-gate) can lock the runtime. See safety.md, operator-auth.md.

## Current state (2026-07)
✅ P16 auth guard · P17 session manager + instant switch · P17.2/P17.4 account API · P18 OpenAPI + /v1/docs + freeze baseline · P19 (in progress) Capability API + runtime namespace. ⏳ P19 Event Bus · Plugin Runtime · Identity layer. See ROADMAP.md.
