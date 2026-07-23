# EPIC GRAM — Domain Deploy (epicstar.space) — DRY-RUN

Production cutover plan for **epicstar.space** (GoDaddy DNS + Caddy on the VPS, path A).
**DRY-RUN ONLY** — do not change GoDaddy DNS, do not edit the production Caddyfile, do not SSH,
do not deploy, do not commit without owner approval (`APPROVE_DEPLOY` / `APPROVE_SSH`).

## Decisions (owner)
- Path **A** — production on the VPS, served 24/7 (not the local dev PC).
- Gating: **leave as-is** — only `/agents` is behind the operator password; `/`, `/chats`, etc. stay open for now.
- First cutover excludes Telegram bot token and AI keys.

## Current state of epicstar.space (from registrar screenshots)
- Nameservers = **GoDaddy** (`ns13.domaincontrol.com`, `ns14.domaincontrol.com`, `_domainconnect.gd.domaincontrol.com`).
  The "Вілстар" panel is a reseller wrapper; DNS is edited on the GoDaddy side.
- Domain is **parked**: `A @ -> 34.111.179.205` plus a "Parked" A record; status НЕАКТИВНИЙ.
- `CNAME www -> www.epicstar.space`, plus the default SOA.
- **No Cloudflare in the path** -> Caddy issues Let's Encrypt directly (TLS-ALPN/HTTP-01).

## Origin
- VPS **<VPS_PUBLIC_IPv4>** (Contabo). App = Next `apps/web` on `:3015`.
- The same Next instance on `:3015` can serve multiple domains (Caddy routes each host to `127.0.0.1:3015`),
  so epicstar.space and any future epic-gram.com share one origin process.

## 1. DNS records (GoDaddy) — replace the parking records
| Action | Type | Name | Value | TTL |
|--------|------|------|-------|-----|
| **edit** | A | `@` | `34.111.179.205` -> **`<VPS_PUBLIC_IPv4>`** | 600 |
| **delete** | A | `@` | the extra **"Parked"** A record | — |
| **add/edit** | A | `www` | **`<VPS_PUBLIC_IPv4>`** | 600 |

Notes:
- The existing `CNAME www -> www.epicstar.space` is self-referential/parking — replace `www` with an **A record** to the VPS (or CNAME `www -> epicstar.space`). Don't keep both.
- Leave NS / SOA / `_domainconnect` untouched.
- Verify after propagation: `dig epicstar.space +short` and `dig www.epicstar.space +short` -> `<VPS_PUBLIC_IPv4>`.

## 2. App on the VPS
```bash
# on the VPS, in the agent-control repo
git pull
npm ci
npm run build
# run under a process manager on :3015 (pm2 example)
pm2 start "npm run start:host" --name epicgram-web   # serves 0.0.0.0:3015
pm2 save
# health
curl -I http://127.0.0.1:3015/
```
- Confirm the prod start script name on the VPS (`start:host` = `next start -H 0.0.0.0 -p 3015`). If it doesn't exist, use `npx next start -H 0.0.0.0 -p 3015` from `apps/web`.
- `:3015` must be free on the VPS (not already taken by another service).

## 3. Operator gate on the VPS
- Set `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` in the **VPS** workspace-root `.env.local` (via `ops/set-operator-hash.ps1` equivalent, or `npm run operator:hash`). Without it, `/agents` returns "not configured" and stays closed.
- `.env.local` stays gitignored — never commit it.

## 4. Caddy block (add to the VPS Caddyfile after review)
```caddy
epicstar.space, www.epicstar.space {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3015
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```
Then: `caddy validate` -> `caddy reload`. LE cert auto-issues (DNS is GoDaddy, no Cloudflare proxy in front).

## 5. Deploy order (execute later, only with APPROVE_DEPLOY)
1. **App on VPS:** pull, `npm ci`, `npm run build`, `pm2 start`, health 200 on `:3015`.
2. **Operator hash:** set `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` in VPS `.env.local`.
3. **Caddy:** add block, `caddy validate`, `caddy reload`.
4. **DNS (GoDaddy):** edit `A @` and `A www` to `<VPS_PUBLIC_IPv4>`, delete the "Parked" record. Wait for propagation (`dig`).
5. **Verify HTTPS:** `https://epicstar.space/`, `/landing`, `/agents` (gate closed), `/terms /privacy /abuse` -> 200; LE cert valid.

## 6. Go / No-Go checklist
- [ ] VPS reachable; `:3015` free on the VPS.
- [ ] App builds on VPS (`npm run build` green) and runs on `:3015` (health 200).
- [ ] `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` set on the VPS (so `/agents` gate is closed, not 503).
- [ ] Caddy block added, `caddy validate` OK, reload done.
- [ ] GoDaddy: `A @` + `A www` -> `<VPS_PUBLIC_IPv4>`; "Parked" A removed; propagated (`dig`).
- [ ] LE cert issued for `epicstar.space` + `www`.
- [ ] `https://epicstar.space/` and `/agents` load; `/agents` shows the operator login window.
- [ ] **No Telegram bot token / AI keys in this cutover.**
- [ ] Rollback ready.

## Rollback
- Caddy: remove the block -> `caddy reload`.
- DNS: restore `A @ -> 34.111.179.205` (parking) / prior records.
- App: `pm2 stop epicgram-web`. Stateless web -> no data migration. Production deepinside stack on the VPS is untouched.

## Risks / notes
- Public exposure: only `/agents` is gated; `/`, `/chats`, etc. are open. It's PRIVATE BETA — consider gating the whole app before wider sharing.
- One origin, many domains: epicstar.space shares the `:3015` Next instance; keep one canonical build.
- Secrets: never echo/commit tokens; operator hash and any keys live only in VPS `.env.local`.

## To execute
Reply **`APPROVE_DEPLOY`** (and **`APPROVE_SSH`** for the VPS steps) to run this for real, step by step with checks. Until then: plan only, nothing changed.
