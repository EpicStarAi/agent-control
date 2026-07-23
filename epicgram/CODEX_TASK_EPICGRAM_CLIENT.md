# Codex Task: EPIC☠️GRAM Custom Telegram Client

## Goal

Build a lawful custom Telegram client shell named **EPIC☠️GRAM** with a Matrix-style interface and AI-agent workspace.

Use official Telegram APIs only:

- TDLib / Telegram API for a real custom Telegram client
- Bot API + Telegram Mini Apps for bot-side workflows
- No credential theft, no hidden sessions, no auth bypass, no unsolicited impersonation

## Target platforms

1. Web app
2. Telegram Mini App
3. PWA for Android/iOS
4. Windows desktop wrapper via Tauri

## MVP scope

### 1. Frontend

- Next.js + React + TypeScript
- Matrix cyber UI theme
- Sidebar: chats, private, groups, channels, bots, archive, settings
- Chat list
- Chat window
- Agent panel
- Multi-account switcher
- Logs console
- Memory panel
- Responsive mobile layout

### 2. Backend

- FastAPI or NestJS API
- PostgreSQL for persistent state
- Redis for event queue/cache
- Agent runtime abstraction
- Audit logging
- Role-based permissions

### 3. Telegram integration

- TDLib adapter for user-authorized Telegram accounts
- Bot API adapter for owned bots
- Telegram WebApp SDK adapter for Mini App mode
- Session encryption at rest
- Explicit consent during account connection

### 4. Agent system

Each authorized account gets a linked virtual agent:

- agent_id
- owner_user_id
- linked_telegram_account_id
- skills[]
- tools[]
- memory profile
- action logs
- permissions

### 5. Safety rules

- Every Telegram account must be connected by its owner or an authorized operator.
- All agent actions must be logged.
- Human approval is required for external message sending in MVP.
- No scraping private chats without consent.
- No automated deception or covert impersonation.

## Suggested repository structure

```txt
apps/
  web/                  # Next.js UI
  desktop/              # Tauri wrapper
packages/
  ui/                   # Shared components
  telegram/             # TDLib/Bot API/WebApp adapters
  agents/               # Agent runtime abstractions
  config/               # Shared config
services/
  api/                  # Backend API
  worker/               # Event workers
infra/
  docker-compose.yml
  postgres/
  redis/
docs/
  architecture.md
  safety.md
  ui-matrix-mode.md
```

## First implementation milestone

Create a static Matrix-style frontend prototype with mocked data:

- `/` dashboard
- `/chats`
- `/agents`
- `/accounts`
- `/logs`
- `/settings`

Include mock data for:

- 3 accounts
- 6 chats
- 4 agents
- 20 log events

## Acceptance criteria

- `npm install && npm run dev` starts the web app.
- UI matches EPIC☠️GRAM Matrix Mode.
- No real Telegram credentials are committed.
- All API keys are `.env.example` placeholders.
- README includes setup steps and legal/safety constraints.
