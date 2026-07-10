# EPIC GRAM — RUNBOOK (P0)

Operational runbook for running EPIC GRAM locally and (later) in production.
Secrets live only in `.env` / `.env.local` — never commit them, never paste in chat.

## Components
- **Web (canonical):** Next.js `apps/web` — `npm run dev` (port 3000) / `npm run dev:host` (3015).
- **Backend API:** `services/api/src/server.mjs` — `npm run api:dev` (port 8788).
- **Desktop:** Electron `apps/desktop/main.cjs` — `npm run desktop`.
- **Legacy (frozen):** Vite `src/` — `npm run vite:dev`. NOT the product surface; do not extend.

## Start (dev)
```
# backend
npm run api:dev          # :8788
# web (use 3015 to avoid open-webui on :3000)
npm run dev:host         # :3015
```
Unified runtime control (whole DEEPINSIDE stack): `deepinside-platform\ops\deepinside.ps1 status|start|stop|restart|health|checkpoint`.

## Health
- Web: open the dev URL.
- API: `GET http://127.0.0.1:8788/` (health route).
- Full stack: `.\ops\deepinside.ps1 status`.

## Secrets
- All keys in `.env.local` (gitignored). Rotate any key that is ever exposed.
- Telegram bot token / API keys: never echo, never commit, never paste into chat.
- **Single source of truth: workspace-root `.env.local`.** `next dev apps/web` would
  otherwise look inside `apps/web/`, but `apps/web/next.config.mjs` explicitly
  loads `.env.local` and `.env` from the workspace root (via `dotenv`, resolved
  from `import.meta.url`, `override:false`). Do not create
  `apps/web/.env.local` — there is nothing to copy.

## Admin gate (`/admin`)
- Set the operator password hash with **`ops/set-operator-hash.ps1`** (PowerShell):
  prompts via `Read-Host -AsSecureString`, runs `npm run operator:hash`, and
  writes only `EPICGRAM_OPERATOR_PASSWORD_SCRYPT=scrypt:…` to root `.env.local`.
  The plaintext password is never echoed or persisted.
- Restart `npm run dev` after rotating the hash so Next picks up the new value.
- Sanity: `POST /api/admin/login {"password":"wrong"}` must return **401**, not 503.
  503 means root env loading is broken; check `apps/web/next.config.mjs`.

## Telegram / publishing
- All outbound (posting, messaging) is **MANUAL_APPROVAL_ONLY**. No autonomous sends.

## Common issues
- **Port 3000 busy:** open-webui container holds it — use `dev:host` (3015).
- **git index.lock stuck:** close GitHub Desktop / VS Code Source Control, remove stale `.git/index.lock` only if no git process is running.
- **API down:** `RESTART_API.bat` or `npm run api:dev`.

## Deploy (prod) — placeholder
Production runs on VPS (Contabo) behind Caddy via docker-compose (`DEEPINSIDE/deploy`).
Deploy is a separate, manually-approved step (see RELEASE-CHECKLIST.md). Not automated in P0.
