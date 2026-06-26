# EPIC GRAM — Release Checklist (P0)

Channels: **dev** (local) → **staging** (VPS preview) → **production** (domain).
All external/publish actions are MANUAL_APPROVAL_ONLY.

## Pre-release (every release)
- [ ] `git status` clean; work committed (no `.env*`, no `*.log`, no session files).
- [ ] Secret scan passes (no real keys/tokens in diff).
- [ ] `npm run lint` clean.
- [ ] `npm run build` (Next `apps/web`) succeeds.
- [ ] API boots: `npm run api:dev` → health 200.
- [ ] `.\ops\deepinside.ps1 status` — required services UP.
- [ ] Legal pages reachable: `/terms`, `/privacy`, `/abuse`.
- [ ] No console errors on main routes (`/`, `/accounts`, `/chats`, `/agents`, `/settings`).

## Security
- [ ] No secrets in repo/history; keys only in `.env.local`.
- [ ] Any exposed key rotated.
- [ ] Outbound (Telegram posting/messaging) behind manual-approval gate.
- [ ] Dual-use security tools kept OUT of the product perimeter.

## Staging
- [ ] Deploy to VPS preview (manual).
- [ ] Smoke test core flows.
- [ ] Backup current prod DB before promoting.

## Production (manual approval required)
- [ ] Tag release (`vX.Y.Z`).
- [ ] Deploy via docker-compose (Caddy/VPS).
- [ ] Verify SSL + domain.
- [ ] Post-deploy health + rollback plan ready.

## Rollback triggers
- Health check failing > 5 min · auth broken · data write errors · secret leak.
Rollback = redeploy previous tag; restore DB backup if schema changed.
