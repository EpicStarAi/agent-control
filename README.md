# Agent Control Center

Telegram WebApp / mobile-first панель управления AI-агентами EPIC⭐STAR.

## Что уже есть

- Vite + React frontend
- Telegram WebApp bootstrap через `telegram-web-app.js`
- Mobile-first dark/neon UI концепт

## Следующий слой

Чтобы панель стала аналогом Dispatch, ей нужен локальный runtime-agent на ноуте:

```text
Agent Control Center UI
        ↓
Backend / WebSocket API
        ↓
Local Runtime Agent
        ↓
Tools: browser, terminal, files, OBS, Telegram, vision
```

## Быстрый запуск frontend

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## План MVP

1. Добавить React UI: dashboard, agents, AI copilot, statistics, system.
2. Подключить backend API.
3. Сделать локальный runtime-agent.
4. Добавить реальные tools: Playwright, terminal, files, OBS WebSocket.
5. Подключить Telegram Bot/WebApp commands.
