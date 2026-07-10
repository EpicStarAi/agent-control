# EPIC☠️GRAM

Lawful Matrix-mode Telegram-style client shell with an AI-agent workspace.

This repository currently contains the first MVP frontend prototype. It starts from a clean Telegram state, includes local AI folders, and does not connect to real Telegram credentials until the official TDLib backend is implemented.

## What is included

- Next.js, React, TypeScript, Tailwind CSS frontend in `apps/web`
- Electron desktop shell in `apps/desktop`
- Matrix/cyberpunk Telegram-style app shell
- Routes: `/`, `/chats`, `/agents`, `/accounts`, `/logs`, `/settings`
- Default local folders: `Чаты` and `Каналы`
- AI memory channels and technical AI groups created locally by default
- Telegram authorization UI for QR and phone-number flows
- API contracts for future TDLib integration under `/api/telegram/*`
- PWA manifest and service worker for installable web usage
- Human approval model for outbound message sending

## Quick start

```bash
npm install
npm run dev:host
```

Open `http://127.0.0.1:3015`.

For phone testing on the same Wi-Fi network, open the host machine LAN address with port `3015`, for example `http://192.168.68.101:3015`.

## Desktop shell

Start the web client first, then launch the desktop window:

```bash
npm run dev:host
npm run desktop:dev
```

The desktop shell opens `http://127.0.0.1:3015` by default. To point it at a deployed site mirror:

```bash
EPICGRAM_WEB_URL=https://your-domain.example npm run desktop
```

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
  desktop/              # Electron desktop shell
packages/
  ui/                   # Shared UI placeholder
  agents/               # Agent runtime abstraction placeholder
  telegram/             # Official Telegram adapter placeholder
services/
  api/                  # TDLib backend contract notes
docs/
  architecture.md
  safety.md
  site-and-domain.md
  telegram-client-functional-spec.md
  ui-matrix-mode.md
```

## MVP status

This is still a frontend-first prototype. Real Telegram account authorization, encrypted session storage, dialog sync, and message sending require the TDLib backend/runtime described in `services/api/README.md`.
