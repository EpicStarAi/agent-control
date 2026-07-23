# EPIC GRAM — P0 Launch Readiness Report
**Date:** 2026-06-26 · **Branch:** main (ahead of origin by 3 commits, not pushed) · **Build:** ✅ `next build` green, 39 routes

## Scope
Move EPIC GRAM from MVP toward a launch-ready P0 product contour, additively, without breaking
existing architecture or refactoring. Flagship pick (per CTO audit): **EPIC GRAM + 1 entity**.

## Status of the 14 P0 deliverables
| # | Deliverable | Status | Notes |
|---|---|---|---|
| 1 | Web frontend | ✅ done | Canonical **Next.js `apps/web`** (39 routes build green). Vite `src/` frozen. |
| 2 | Backend API | ✅ done | `services/api` :8788. |
| 3 | Telegram Web App | ✅ done | SDK init added (`lib/telegram.ts` + `TelegramInit`), safe no-op outside TG. |
| 4 | Admin Panel | ⚠️ partial | Operator UI exists (EpicGramAgentOS, GlobalAIOperatorSidebar). **TODO:** dedicated `/admin` route + auth gate (operator hash already in `scripts/create-operator-hash.mjs`). |
| 5 | Public landing | ⚠️ partial | Draft `epicgram-landing.html` exists. **TODO:** wire to domain via Caddy. |
| 6 | GitHub repo structure | ⚠️ partial | 3 P0 commits local; **push pending manual approval**. Monorepo workspaces not formalized (optional). |
| 7 | CI/CD skeleton | ✅ done | `.github/workflows/ci.yml` — lint + build (no deploy/secrets). |
| 8 | Health/status scripts | ✅ done | `deepinside-platform/ops/deepinside.ps1` (status/health/start/stop/restart/checkpoint). |
| 9 | Release checklist | ✅ done | `docs/RELEASE-CHECKLIST.md`. |
| 10 | Android APK plan | ✅ plan (below) | Reuse Capacitor; wrap `apps/web`. |
| 11 | Windows Desktop plan | ✅ plan (below) | Finalize `apps/desktop` (Electron). |
| 12 | iOS/TestFlight plan | ✅ plan (below) | Same Capacitor project; needs macOS/Xcode. |
| 13 | Security/legal | ✅ done | `/terms` `/privacy` `/abuse` (DRAFT, need lawyer review) + secret hygiene. |
| 14 | P0 readiness report | ✅ this doc | — |

**Fully done: 1,2,3,7,8,9,10,11,12,13,14 (plans count for 10–12). Concrete remaining: 4 (admin route), 5 (landing→domain), 6 (push).**

## What was done this session
- Committed 41-file WIP snapshot (de-risked uncommitted work); removed personal `.claude/settings.local.json` from history (amend).
- Added CI workflow, legal pages, RUNBOOK, release checklist, Vite-legacy marker.
- Added Telegram Web App init.
- PWA already installable (manifest + icons + appleWebApp); SW is an intentional kill-switch — left as-is.
- Hardened `.gitignore` (`*.log`, `build-*.log`, `*.session`, `.claude/settings.local.json`).

## Mobile / Desktop plans

### Android APK (plan)
- **Approach:** Capacitor wrapper around the EPIC GRAM web (reuse pattern from `epic-star-mobile`, which is already Capacitor 7 + React + Vite).
- Next App Router uses API routes, so static export is partial → **Capacitor in "server" mode pointing at the hosted EPIC GRAM URL** (or a thin static shell that calls the API) is the pragmatic path.
- Steps: `npm i @capacitor/core @capacitor/cli @capacitor/android` → `npx cap init` → set `server.url` to hosted app → `npx cap add android` → `npx cap sync` → build APK in Android Studio (you have it installed).
- Output: signed APK for sideload / Play internal testing. **No mass distribution, owned use first.**

### Windows Desktop (plan)
- **Approach:** finalize existing `apps/desktop/main.cjs` (Electron) with `electron-builder`.
- Dev loads `http://127.0.0.1:3015` (dev:host); prod loads the hosted URL or a packaged build.
- Steps: add `electron-builder` config (appId, win target nsis), `npm run desktop` for dev, `electron-builder --win` for installer.
- Output: Windows installer (.exe/nsis).

### iOS / TestFlight (plan)
- **Approach:** same Capacitor project as Android, add `@capacitor/ios` + `npx cap add ios`.
- **Hard constraint:** iOS build + TestFlight require **macOS + Xcode + Apple Developer account** ($99/yr). You are on Windows → use a Mac, a cloud-Mac CI (e.g. macOS GitHub runner / MacStadium), or defer iOS.
- Structure is cross-platform-ready; the blocker is the Apple toolchain, not the code.

## Security / Legal checklist (P0)
- [x] Secrets only in `.env.local`; none in repo/history (scanned, 0 real values).
- [x] `.gitignore` covers env/logs/session/personal settings.
- [x] Legal pages present (DRAFT — **require lawyer review before public launch**).
- [x] Outbound Telegram/publishing behind MANUAL_APPROVAL_ONLY.
- [ ] Rotate any key exposed during development (Telegram bot token, Moonshot/Kimi key) — **action on owner.**
- [x] Dual-use security tools (andriller/LockKnife/MailRip) kept OUT of product perimeter.

## Immediate next steps
1. **Admin (#4):** add `/admin` route gated by operator hash; surface existing operator UI there.
2. **Landing (#5):** deploy `epicgram-landing.html` (or a Next `/` landing) behind Caddy on the domain.
3. **Push (#6):** `git push origin main` — **requires explicit owner approval** (external action). 3 commits ready.
4. **Rotate exposed keys** (BotFather `/revoke`, Moonshot key) — owner action.
5. Then: wrap Android (Capacitor) → finalize Desktop (Electron) → iOS when a Mac is available.

## Honest P0 verdict
EPIC GRAM now has a **coherent launch contour**: one canonical web (Next), backend, Telegram Mini App init, PWA, CI skeleton, health tooling, release + legal docs, and de-risked git history. It is **P0 launch-ready as a private/beta contour**, NOT yet public-production (needs: admin gate, landing on domain, key rotation, lawyer-reviewed legal, and the deploy/monitoring/backup story from the ecosystem audit). Readiness moved from ~55% → ~**70%** for the EPIC GRAM vertical.
