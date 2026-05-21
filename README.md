# EPIC☠️GRAM

Lawful Matrix-mode Telegram-style client shell with an AI-agent workspace.

This repository currently contains the first static MVP frontend prototype. It uses mocked local data only and does not connect to real Telegram credentials.

## What is included

- Next.js, React, TypeScript, Tailwind CSS frontend in `apps/web`
- Matrix/cyberpunk Telegram-style app shell
- Routes: `/`, `/chats`, `/agents`, `/accounts`, `/logs`, `/settings`
- Mock data for 3 accounts, 6 chats, 4 agents, and 20 log events
- Multi-account switcher, chat list, chat window, AI-agent side panel, logs console, and memory console
- Human approval gate for outbound message drafts
- `.env.example` with placeholders only

## Quick start

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js, usually `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

## Safety and legal constraints

EPIC☠️GRAM is designed only for authorized accounts, owned bots, Telegram Mini App flows, support operations, creator operations, moderation, and virtual-streamer infrastructure.

Allowed future integration paths:

- TDLib / official Telegram API for user-authorized accounts
- Bot API for owned bots
- Telegram Mini App / WebApp SDK after explicit user launch
- Session encryption at rest
- Audit logging for all agent actions
- Human approval for external message sending in the MVP

Not allowed:

- Credential theft
- Hidden sessions
- Auth bypass
- Scraping private chats without consent
- Covert impersonation
- Spam automation
- Mass account creation
- Unapproved external message sending

## Repository structure

```txt
apps/
  web/                  # Next.js UI prototype
packages/
  ui/                   # Shared UI placeholder
  agents/               # Agent runtime abstraction placeholder
  telegram/             # Official Telegram adapter placeholder
docs/
  architecture.md
  safety.md
  ui-matrix-mode.md
```

## MVP status

This is a frontend-only prototype. Backend services, database storage, TDLib, Bot API, and Telegram WebApp SDK integrations are intentionally not implemented yet.
