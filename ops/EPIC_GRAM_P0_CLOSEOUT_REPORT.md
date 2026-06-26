# EPIC GRAM — P0 Closeout Report
**Date:** 2026-06-26 · **Branch:** main · **Push:** PUSHED to origin (2026-06-26) — `d257724..8ed90e8`

## Admin route (#4) — DONE
- `apps/web/app/admin/page.tsx` — `/admin` route. Operator gate (password) → status dashboard.
- `apps/web/app/api/admin/login/route.ts` — server-side verify against `EPICGRAM_OPERATOR_PASSWORD_SCRYPT`
  (scrypt, same scheme as `scripts/create-operator-hash.mjs`). No password/secret in repo.
- If the env hash is unset → gate returns "not configured" and blocks access (safe by default).
- Dashboard shows: EPIC GRAM web status, backend API status (via `/api/operator/status`),
  Telegram Web App status, PWA status, release-checklist pointer, links to `/terms /privacy /abuse`,
  PRIVATE BETA warning. Session-only (no cookie/persistence).

## Landing route (#5) — DONE
- `apps/web/app/landing/page.tsx` — `/landing`: EPIC GRAM · AI Media Console · Telegram Workspace ·
  PRIVATE BETA · "Open App" → `/` · Operator Admin link · Telegram Web App note · legal links ·
  explicit "not a public production service" disclaimer.
- Root `apps/web/app/page.tsx` was **left unchanged** (still the app) to avoid breaking current UX.
  Repointing `/` to the landing is available later but intentionally deferred (non-breaking choice).

## Domain deploy (#5 docs) — DONE (docs only)
- `docs/EPIC_GRAM_DOMAIN_DEPLOY.md` — Option A (subdomain `epicgram.deepinside.life`, recommended) +
  Option B (path `/epicgram`), Caddy reverse_proxy examples (placeholders), DNS A record, Cloudflare
  proxy/SSL, health check, rollback. **Production Caddyfile NOT modified.**

## Validation
- To be confirmed by build run: `npm run build` (Next apps/web). New routes: `/admin`, `/landing`,
  `/api/admin/login`. Expected green (server components + one client page + one node route).
- `git status --short` must show only the new safe files; no `.env`, session, logs, or local Claude settings.

## Local smoke-test (2026-06-26)
Started `npm run dev:host` (port 3015; `:3000` is held by `open-webui` Docker container so
the default dev port is unusable in this environment) and probed routes.

- Route status codes (all 200):

  | Route      | Code |
  |------------|------|
  | `/`        | 200  |
  | `/landing` | 200  |
  | `/admin`   | 200  |
  | `/terms`   | 200  |
  | `/privacy` | 200  |
  | `/abuse`   | 200  |

- `POST /api/admin/login` with `{"password":"x"}` while
  `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` is unset →
  **HTTP 503**, body
  `{"ok":false,"configured":false,"message":"Admin gate not configured. Set EPICGRAM_OPERATOR_PASSWORD_SCRYPT in .env.local (npm run operator:hash)."}`
  — gate is **closed by default** (no fallback that would let an arbitrary password through).
- `/admin` pre-auth HTML inspection: operator-password form visible (`type="password"`,
  `autoComplete="current-password"`), `Private beta` warning present, env-hash placeholder
  (`scrypt hash`) referenced, **0** literal `password = "..."` assignments in HTML,
  **0** post-auth markers leaked (dashboard / control panel / operator console / telegram
  accounts / operator brain / owned target).
- Post-smoke `npm run build` → `✓ Compiled successfully`.
- Post-smoke `npm run lint --if-present` → **0 errors, 47 warnings**
  (all pre-existing `react-hooks/exhaustive-deps` and `@next/next/no-img-element` in legacy
  components, not introduced by P0).

## Files changed
- NEW: `apps/web/app/admin/page.tsx`, `apps/web/app/api/admin/login/route.ts`,
  `apps/web/app/landing/page.tsx`, `docs/EPIC_GRAM_DOMAIN_DEPLOY.md`,
  `ops/EPIC_GRAM_P0_CLOSEOUT_REPORT.md`.
- `.env.example`: no change needed (`EPICGRAM_OPERATOR_PASSWORD_SCRYPT` placeholder already present).

## Commit
- Commit hash: `19e294c` (message: "Close EPIC GRAM P0 admin and landing readiness").
- Closeout smoke commit: `8ed90e8` (message: "P0 closeout: local smoke-test results").

## Push status
- **PUSHED** to `origin/main` on 2026-06-26 (owner approved).
- Range pushed: `d257724..8ed90e8` (5 commits):
  - `4c8629c` PHASE P0: EPIC GRAM agent OS + operator sidebar + infra/media/operator API routes + world view (WIP snapshot)
  - `1c60fc9` P0: CI skeleton + legal pages + RUNBOOK + release checklist + freeze Vite legacy
  - `98de484` P0: Telegram Web App init (Mini App SDK + safe no-op outside Telegram)
  - `19e294c` Close EPIC GRAM P0 admin and landing readiness
  - `8ed90e8` P0 closeout: local smoke-test results
- Local `main` is now up-to-date with `origin/main` (ahead = 0).

## Remaining owner actions
1. ~~Approve `git push origin main`.~~ **Done** (2026-06-26).
2. Rotate Telegram bot token (@BotFather `/revoke`).
3. Rotate Moonshot/Kimi API key.
4. Review legal pages (`/terms /privacy /abuse`) with a lawyer before public launch.
5. Set `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` in server `.env.local` (`npm run operator:hash`) to enable `/admin`.
