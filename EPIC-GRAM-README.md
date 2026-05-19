# EPIC💀GRAM

Telegram-like AI communication console for lawful, consent-based account automation.

## Product shape

- Telegram Mini App / Web App / PWA
- Android / iOS via PWA shell
- Windows desktop wrapper via Tauri or Electron
- Multi-account workspace
- AI agents, subagents, bots, groups and channels
- Memory, logs, tasks and operator dashboard

## Safety boundary

This project is designed for authorized accounts, owned bots, support workflows, creator operations, moderation and virtual-streamer infrastructure. It does not include credential theft, hidden access, impersonation without consent or bypassing platform authorization.

## MVP modules

1. Auth and workspace
2. Telegram integration via official APIs
3. Agent registry
4. Chat console
5. Memory/log service
6. Operator dashboard
7. Mobile-first UI

## Suggested stack

- Frontend: Next.js, React, Tailwind, Telegram WebApp SDK
- Backend: NestJS or FastAPI
- DB: PostgreSQL + Redis
- Agent runtime: LangGraph / OpenAI Agents SDK compatible adapter
- Desktop: Tauri
- Mobile: PWA first, then native wrappers
