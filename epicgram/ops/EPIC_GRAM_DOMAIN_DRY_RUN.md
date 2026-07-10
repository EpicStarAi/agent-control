# EPIC GRAM — Domain Deploy Dry-Run

**Mode:** DRY-RUN ONLY · **Date:** 2026-06-26 · **Author:** ops planning pass
**Target:** expose EPIC GRAM private beta on `epicgram.deepinside.life`
**Apply state:** nothing has been applied. No Caddy edit, no service restart,
no DNS change, no deploy, no push.

---

## Status

| Item | State |
|---|---|
| `origin/main` HEAD | `7a2a73b` — *Fix EPIC GRAM root env loading for admin gate* |
| GitHub Actions CI | ✅ success (`CI / web (lint + build)`, run 28214771295) |
| `npm run lint --if-present` (local) | ✅ exit 0 (only legacy warnings) |
| `npm run build` (local) | ✅ exit 0 |
| `/admin` gate | ✅ functional from root `.env.local` (smoke: wrong-pw → 401, no-pw → 400, no fallback) |
| root `.env.local` loading | ✅ fixed in `apps/web/next.config.mjs` (dotenv + `import.meta.url`) |
| P0 readiness | ✅ in repo, beta-grade |
| Deploy on VPS | ❌ not done |
| Caddy block for subdomain | ❌ not added |
| DNS record `epicgram.deepinside.life` | ❌ not created |

---

## Target domain

`https://epicgram.deepinside.life` (subdomain of `deepinside.life`).
Chosen per `docs/EPIC_GRAM_DOMAIN_DEPLOY.md` Option A (cleanest separation,
own SSL cert, trivial rollback). Option B (`/epicgram` path) is rejected —
would require `basePath` in `next.config.mjs` and a rebuild.

---

## Current repo state

- Workspace: `C:\Users\Admin\Documents\Codex\2026-05-21\prior-conversation-with-codex-conversation-role\agent-control`
- `git status --short`: clean
- `git remote -v`:
  - `origin` → `https://github.com/EpicStarAi/agent-control.git` (canonical, has HEAD `7a2a73b`)
  - `private` → `https://github.com/EpicStarAi/epicgram-client.git` (separate, untouched)
- In-repo deploy artefacts:
  - **no** `deploy/` directory
  - **no** in-repo `Caddyfile`
  - **no** `docker-compose.yml` for the Next app
  - **no** `Dockerfile`
  - **no** `pm2.config.*` / `ecosystem.config.*`
  - **no** systemd unit
  - the only `docker-compose.yml` in repo is `infra/self-hosted-ai/docker-compose.yml`
    (unrelated — self-hosted AI stack: ollama + open-webui)
- External deploy umbrella referenced (out of this repo):
  - `DEEPINSIDE/deploy` (production docker-compose + Caddy host config)
  - `deepinside-platform\ops\deepinside.ps1` (status/start/stop/restart/health)

Implication: deploy of `epicgram.deepinside.life` is **not yet codified inside
this repo**. The plan below assumes the operator places the artefacts on the
VPS by hand the first time, then later folds them into `DEEPINSIDE/deploy` if
desired.

---

## Deploy architecture

```
                   Cloudflare DNS (A record, optional proxy)
                                │
                                ▼
                ┌──────────── VPS (Contabo) ────────────┐
                │                                       │
                │      Caddy (host) :443                │
                │            │                          │
                │   epicgram.deepinside.life            │
                │     reverse_proxy 127.0.0.1:3015 ─────┼──┐
                │                                       │  │
                │   (existing prod blocks untouched)    │  │
                │                                       │  │
                └───────────────────────────────────────┘  │
                                                           ▼
                           ┌───────────── Next.js app (systemd) ─────────────┐
                           │ /opt/epicgram/agent-control                      │
                           │   npm ci --production=false                      │
                           │   npm run build      (next build apps/web)       │
                           │   npm run start:host (next start :3015 0.0.0.0)  │
                           │   reads /opt/epicgram/agent-control/.env.local   │
                           │     via apps/web/next.config.mjs (dotenv)        │
                           └──────────────────────────────────────────────────┘
```

**Runtime mode:** `next start` driven by **systemd** unit. Rationale:
- One process, no extra runtime to babysit (pm2 adds Node code we have to keep current).
- Restart/`journalctl` already familiar on the VPS.
- Docker would be cleaner long-term, but ships next.js, node_modules, and build artefacts on every deploy; defer until `DEEPINSIDE/deploy` is the home for this app.

**App port:** `127.0.0.1:3015` (loopback only — Caddy is the only public ingress).
3015 is the canonical EPIC GRAM port per `docs/RUNBOOK.md` (3000 is held by
the `open-webui` Docker container locally, and standardising on 3015 avoids
the same clash on the VPS).

**Backend API (`services/api`):** **not in scope for P0 subdomain.**
The current admin gate and landing rely only on `apps/web` and its API routes
(`/api/admin/login`, `/api/operators/status`). The dedicated backend service
on `:8788` is not yet required behind the public subdomain. If/when it is,
add a `handle_path /api-be/* { reverse_proxy 127.0.0.1:8788 }` block (already
sketched in `docs/EPIC_GRAM_DOMAIN_DEPLOY.md`).

---

## DNS plan (Cloudflare)

| Field | Value |
|---|---|
| Record type | **A** |
| Name | `epicgram` |
| Target | `<VPS_PUBLIC_IPv4>` (placeholder — operator fills from the Cloudflare zone for `deepinside.life`; do not put the real IP into this doc) |
| TTL | Auto |
| Proxy status | **DNS only (grey cloud)** for the initial cutover. Caddy provisions a Let's Encrypt cert directly. |
| SSL/TLS mode (Cloudflare → Origin), if/when proxy is enabled later | **Full (strict)** + a Cloudflare Origin Certificate, OR keep DNS-only so Caddy stays the cert authority |
| Cache rules | none for P0. Once stable, set a *Cache Rule* bypassing `/api/*` and `/admin`; cache static `_next/static/*` aggressively. |
| IPv6 (AAAA) | optional; only add if VPS has a real IPv6 address — otherwise omit |

**Why DNS-only first:** simplest path to provable success. The cert is owned
by Caddy on the box, so `curl --resolve` debugging shows the real chain.
Switch to *Proxied* only after the origin is healthy for ≥24h.

**Verification commands (post-DNS, pre-Caddy):**
```bash
dig +short epicgram.deepinside.life
# expect: <VPS_PUBLIC_IPv4>

dig epicgram.deepinside.life @1.1.1.1
# expect: same answer with reasonable TTL
```

---

## Caddy plan (PROPOSED — DO NOT APPLY)

Add as a new top-level block in the production Caddyfile. Existing blocks
remain untouched. Caddy auto-provisions the Let's Encrypt cert on first hit
(DNS must already resolve to the box).

```caddy
epicgram.deepinside.life {
    encode zstd gzip

    # EPIC GRAM web (Next.js apps/web) — running as a systemd service on :3015 (loopback)
    reverse_proxy 127.0.0.1:3015

    # Security headers (private beta — keep conservative)
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        # remove Server banner
        -Server
    }

    # Logs to a dedicated file so prod-monitoring tooling can tail them separately
    log {
        output file /var/log/caddy/epicgram.access.log {
            roll_size 10MiB
            roll_keep 5
        }
        format console
    }
}
```

**Notes:**
- No `handle_path /api-be/* { ... }` — backend `:8788` not exposed in P0.
- No `basic_auth` — `/admin` route does its own scrypt-gated login.
- Keep this block **out of the production Caddyfile until DNS, the systemd
  unit, and the local smoke have all gone green** (see operator checklist
  below). The Caddyfile lives in `DEEPINSIDE/deploy` (not this repo).

**Validate before reload (operator runs locally on VPS):**
```bash
caddy validate --config /etc/caddy/Caddyfile
# expect: Valid configuration
```

---

## Env plan

Server-side `.env.local` location: **`/opt/epicgram/agent-control/.env.local`**
(workspace root, next to `.env.example`). Loaded by `apps/web/next.config.mjs`
via dotenv (`import.meta.url`, `override:false`) — same mechanism that the
smoke test verified locally.

Keys **required** for `/admin` to work (no values shown here):
- `EPICGRAM_OPERATOR_EMAIL` — owner email
- `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` — `scrypt:<salt>:<hash>` produced by `ops/set-operator-hash.ps1` (or the cross-platform `EPICGRAM_OPERATOR_PASSWORD='…' npm run operator:hash` fallback)

Keys **optional / off in private beta** (leave unset to keep features dark):
- `NEXT_PUBLIC_TELEGRAM_WEBAPP_ENABLED` — defaults to off
- `NEXT_PUBLIC_API_BASE_URL` / `EPICGRAM_API_BASE_URL` — set only when backend API is exposed behind `/api-be/*`
- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_BOT_TOKEN` — **do not set** unless the Telegram pathway is intentionally enabled on prod. Outbound TG remains MANUAL_APPROVAL_ONLY.
- `EPICGRAM_TDLIB_ENABLED`, `EPICGRAM_TDLIB_DATABASE_KEY` — TDLib runtime; leave disabled
- `EPICGRAM_AI_*`, `EPICGRAM_OPENAI_MODEL`, `EPICGRAM_AI_API_KEY` — only if AI features are flipped on
- `OPERATOR_*` (NAME, MODE, PRIMARY_MODEL, FALLBACK_MODEL, MODEL_PROVIDER, MODEL_ENDPOINT, MODEL_TIMEOUT_MS, AUTO_SEND_ALLOWED, APPROVAL_REQUIRED, EXTERNAL_AI_RUNTIME_ALLOWED) — operator brain knobs; defaults are safe (auto-send false, approval required true)

Process env override (`override:false` is set in `next.config.mjs`) means if a
secrets manager or CI later injects any of the above into `process.env`, the
file value will not clobber it.

File permissions on the VPS:
- owner: deploy user (e.g. `epicgram`)
- mode: `600` (`chmod 600 /opt/epicgram/agent-control/.env.local`)
- **never** world-readable; **never** in git (root `.gitignore` already
  excludes `.env.local`, `.env`, `.env.*.local`)

---

## Commands (build / start) — what the systemd unit will run

```bash
# one-time install location
sudo install -d -o epicgram -g epicgram /opt/epicgram

# clone
sudo -u epicgram git clone https://github.com/EpicStarAi/agent-control.git /opt/epicgram/agent-control
cd /opt/epicgram/agent-control

# Node 20+ (Next 14.2 requires ≥18.18; we used Node 20 in CI)
node -v   # expect v20.x or v22.x

# install (lockfile present → ci is reproducible)
npm ci

# build
npm run build      # next build apps/web

# write env (operator does this locally on VPS — see checklist below)
# chmod 600 .env.local

# start (foreground for smoke; systemd takes over for real)
npm run start:host   # next start apps/web --hostname 0.0.0.0 --port 3015
```

**Proposed systemd unit (file only — DO NOT install yet):**
```ini
# /etc/systemd/system/epicgram-web.service
[Unit]
Description=EPIC GRAM web (Next.js apps/web)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=epicgram
Group=epicgram
WorkingDirectory=/opt/epicgram/agent-control
# Bind to loopback only — Caddy is the public ingress
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3015
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5
# Hardening (private beta — conservative)
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/epicgram/agent-control/.next
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```
Notes:
- `ExecStart=npm run start` (not `start:host`) because the unit forces
  `HOSTNAME=127.0.0.1 PORT=3015` via `Environment=`. This keeps the public
  surface limited to Caddy.
- `ReadWritePaths` lets Next write its `.next/cache`; everything else is
  read-only.

---

## Health checks

After each step in the operator checklist:

| Step | Check | Expected |
|---|---|---|
| systemd up | `systemctl status epicgram-web` | active (running) |
| port bound | `ss -ltnp \| grep :3015` | LISTEN on 127.0.0.1 by node |
| local web | `curl -sI http://127.0.0.1:3015/` | `HTTP/1.1 200 OK` |
| admin gate alive | `curl -sI http://127.0.0.1:3015/admin` | `200` + HTML contains `Operator password` |
| env loaded (key check) | `curl -sX POST -H 'content-type: application/json' --data '{"password":"wrong"}' http://127.0.0.1:3015/api/admin/login` | **`401 {"ok":false}`** ← not 503 |
| Caddy reload | `caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy` | exit 0, no error in `journalctl -u caddy -n 50` |
| DNS resolves | `dig +short epicgram.deepinside.life` | answers with `<VPS_PUBLIC_IPv4>` |
| public TLS | `curl -sI https://epicgram.deepinside.life/` | `HTTP/2 200`, valid cert in `--verbose` |
| public admin gate | `curl -sI https://epicgram.deepinside.life/admin` | `200` + `Operator password` |
| legal pages | `curl -sI https://epicgram.deepinside.life/{terms,privacy,abuse}` | `200` for each |
| no 503 path | `curl -sX POST -H 'content-type: application/json' --data '{"password":"x"}' https://epicgram.deepinside.life/api/admin/login` | `401 {"ok":false}` |

Browser pass: open `https://epicgram.deepinside.life/admin`, enter the
operator password → admin dashboard renders. **Do not test through Cloudflare
proxy until DNS-only path is green** — otherwise a failure could be DNS,
Caddy, the app, or Cloudflare.

---

## Rollback

Rollback is fast and surgical because nothing about the existing site changes.

| Failure | Action | Time |
|---|---|---|
| Caddy block bad (validate fails or 502 at edge) | Remove the `epicgram.deepinside.life { … }` block from `/etc/caddy/Caddyfile`; `caddy reload` | < 1 min |
| App crashes / wedged | `sudo systemctl stop epicgram-web`; site returns 502 from Caddy. Operator decides: roll back to previous commit (`git -C /opt/epicgram/agent-control reset --hard <prev-sha>` + `npm ci` + `npm run build` + `systemctl start`) or leave down. | 2–5 min |
| Env wrong (503 on `/api/admin/login`) | Fix `/opt/epicgram/agent-control/.env.local`; `systemctl restart epicgram-web`. No Caddy change. | < 2 min |
| DNS wrong | Cloudflare → revert / delete the `epicgram` A record. No app change. | < 5 min (TTL-bound) |
| Need to fully un-publish | Remove Caddy block + delete DNS record. App stays running on `:3015` (loopback) until `systemctl stop`. | < 5 min |

No data migration. The web is stateless. The API service (`:8788`) is not in
this deploy. Rollback never touches data.

---

## Risks (private beta, not production)

1. **Admin gate is client-state, not RBAC.**
   `apps/web/app/admin/page.tsx` keeps `authed` in React `useState` after a
   successful `POST /api/admin/login`. There is **no session cookie, no JWT,
   no server-side session store**. Refreshing the page logs the operator
   out — fine for private beta, **insufficient for production**. Anyone with
   the operator password sees the dashboard; there is no per-user audit.
2. **No rate-limit / lockout on `/api/admin/login`.**
   scrypt is slow enough to make naive brute-force expensive (~40-50 ms per
   attempt locally, more on a small VPS), but **without `fail2ban` or an
   in-app counter, an attacker can hammer it.** Add a Caddy rate-limit
   directive or fail2ban filter before any public announcement.
3. **Legal pages are drafts.**
   `/terms`, `/privacy`, `/abuse` exist (200), but `docs/EPIC-GRAM-P0-READINESS.md`
   and the closeout report both flag them as **DRAFT — require lawyer review
   before public launch.** Private beta is fine; **do not announce** until
   reviewed.
4. **Keys still need rotation.**
   The closeout's "Remaining owner actions" list includes:
   - Rotate Telegram bot token (`@BotFather /revoke`) — **DONE this session**
     for the operator account; the *original* exposed token should also be
     revoked if not already.
   - Rotate Moonshot/Kimi API key — the value pasted into chat earlier in
     this session is compromised; the in-config token is whatever was set
     locally afterwards. Verify the live key is post-rotation **before** any
     prod traffic.
5. **Monitoring / backups not production-grade.**
   - No external uptime check on the subdomain.
   - No log shipping (`/var/log/caddy/epicgram.access.log` stays on the box).
   - No structured app metrics; only `journalctl`.
   - No DB → there is nothing to back up at this layer, but if the operator
     adds `services/api` later, backups become mandatory.
6. **No CI/CD deploy hook.**
   GitHub Actions CI runs lint+build only. Promotion to prod is manual
   (intentional — `MANUAL_APPROVAL_ONLY`). Document the steps you took so
   the next deploy is reproducible.
7. **Cloudflare proxy off initially.**
   DNS-only means no DDoS shield and the VPS IP is public via `dig`. For
   private beta with no public announcement this is acceptable; before any
   announcement, flip to Proxied + Full (strict).
8. **No public announcement before manual approval.**
   The `MANUAL_APPROVAL_ONLY` policy in `RUNBOOK.md` covers outbound TG /
   publishing; treat the subdomain going live the same way — owner approval
   is required before linking from any public surface (X, Telegram channel,
   landing CTA elsewhere).

---

## Final go / no-go checklist (operator runs)

### Code & build (in repo) — must all be ✅ before going to the VPS
- [x] `origin/main` HEAD is `7a2a73b` (or newer, intentional).
- [x] GitHub Actions `CI / web (lint + build)` green on the chosen SHA.
- [x] `git status --short` clean locally.
- [ ] `npm run lint --if-present` and `npm run build` reproduced on the **VPS** at the deploy SHA.

### Secrets — must all be ✅ before going public
- [ ] `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` set in `/opt/epicgram/agent-control/.env.local` (use the helper script).
- [ ] `.env.local` is `chmod 600` and owned by the `epicgram` deploy user.
- [ ] Any key ever pasted to chat (Telegram bot token, Moonshot/Kimi key, scrypt hash) **rotated** and the new value not echoed anywhere.
- [ ] `git -C /opt/epicgram/agent-control ls-files | grep -E '\.env'` is empty.

### App health on VPS
- [ ] `systemctl status epicgram-web` shows active (running).
- [ ] `curl -sI http://127.0.0.1:3015/` → 200.
- [ ] `curl -sX POST -H 'content-type: application/json' --data '{"password":"wrong"}' http://127.0.0.1:3015/api/admin/login` → **401**, not 503.

### DNS
- [ ] Cloudflare A record `epicgram` → `<VPS_PUBLIC_IPv4>` created.
- [ ] Proxy status: **DNS only** for this cutover.
- [ ] `dig +short epicgram.deepinside.life` answers correctly from at least two resolvers.

### Caddy
- [ ] Caddyfile block added (see the **Caddy plan** section above).
- [ ] `caddy validate --config /etc/caddy/Caddyfile` → exit 0.
- [ ] `systemctl reload caddy` (NOT restart — avoid drop).
- [ ] `journalctl -u caddy -n 50` shows no error and a cert was provisioned for `epicgram.deepinside.life`.

### Public smoke
- [ ] `curl -sI https://epicgram.deepinside.life/` → 200, valid TLS chain.
- [ ] `/admin`, `/terms`, `/privacy`, `/abuse` → 200.
- [ ] `POST /api/admin/login {"password":"wrong"}` → **401**.
- [ ] Browser: enter operator password → post-auth dashboard renders.

### Hold lines
- [ ] No public announcement (X, TG, blog) until lawyer review of `/terms` `/privacy` `/abuse` is done and signed off.
- [ ] No Cloudflare Proxied switch until origin is healthy ≥ 24h.
- [ ] No exposure of backend `:8788` until `services/api` has been audited
      and `/api-be/*` is intentionally enabled.

If any line above is unchecked, **no-go**. Roll back per the *Rollback* section.

---

## Out of scope for this dry-run
- Editing the production Caddyfile (lives in `DEEPINSIDE/deploy`, not this repo).
- Pushing this document to `origin/main` (no commit, no push — review first).
- Touching Telegram, Moonshot, or Kimi tokens / configs.
- Deploying anything. **Nothing in this document has been applied.**

---

## What this document is, in one line
A repeatable, mistake-resistant playbook for taking the just-pushed EPIC GRAM
P0 build to `epicgram.deepinside.life` — with every step justified, every
secret kept off the page, and a working rollback at every layer.
