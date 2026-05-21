# EPIC☠️GRAM Architecture

## Current MVP

The current milestone is a static Next.js frontend prototype. It uses local mock data and renders the operator workspace without connecting to Telegram, a backend, or any credential store.

## Planned layers

```txt
apps/web
  Next.js UI, PWA shell, Telegram Mini App surface

services/api
  Auth, workspace permissions, audit logs, account registry

packages/telegram
  TDLib adapter, Bot API adapter, Telegram WebApp SDK adapter

packages/agents
  Agent registry, tool permission model, approval queues

storage
  PostgreSQL for durable state
  Redis for queues and cache
```

## Integration principle

Telegram integrations must be explicit, official, and consent-based. The UI must keep outbound actions review-gated until a backend permission model and audit log are in place.
