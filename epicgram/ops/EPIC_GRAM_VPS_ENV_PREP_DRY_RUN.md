# EPIC GRAM — VPS Env Prep Dry-Run

**Mode:** DRY-RUN ONLY · **Date:** 2026-06-26 · **Scope:** prepare the VPS host
for the first private-beta cutover of EPIC GRAM (`apps/web` only) up to and
including a green loopback smoke test. **Public exposure (DNS + Caddy) is out
of scope for this document** — that lives in
`ops/EPIC_GRAM_DOMAIN_DRY_RUN.md` and runs after this prep is signed off.

**Apply state:** nothing has been applied. No SSH session has been opened by
this run. No VPS change, no Caddy edit, no service restart, no deploy.

---

## Status

| Item | State |
|---|---|
| `origin/main` HEAD | `527af55` — *Add EPIC GRAM domain deploy dry-run* |
| GitHub Actions CI on `527af55` | ✅ success (`CI / web (lint + build)`) |
| Local build / lint | ✅ green |
| Admin gate | ✅ works from workspace-root `.env.local` (`POST /api/admin/login` wrong → 401, not 503) |
| Domain runbook in repo | ✅ `ops/EPIC_GRAM_DOMAIN_DRY_RUN.md` |
| VPS env prep | ❌ not done |
| Caddy block / DNS record | ❌ not added — out of scope for this doc |
| Secrets rotation | ⚠ partial — Telegram bot token + Moonshot key rotated in OpenClaw earlier in the session; the leaked Moonshot `sk-Os2…vKhU` must be confirmed revoked in the Moonshot console before any AI feature is enabled on VPS (we are not enabling AI in P0 anyway). |

### Domain contour (informational)

The deploy target is a dedicated `epic-gram.com` apex. This document is still
VPS-prep only — no DNS or Caddy command is added here.

| Role | Hostname | Owner of cert in P0 | Status |
|---|---|---|---|
| Apex / marketing | `epic-gram.com` | future | not provisioned |
| **Next.js web (this VPS)** | **`app.epic-gram.com`** | Caddy (Let's Encrypt) | not provisioned |
| Telegram Mini App surface | `tma.epic-gram.com` | future | not provisioned |

When this VPS prep is green, the public-exposure step uses `app.epic-gram.com`
as the only hostname pointed at this box. `tma.epic-gram.com` and the apex
are out of scope until the Mini App and landing stories are ready.

---

## Target paths

| Path | Owner | Mode | Purpose |
|---|---|---|---|
| `/opt/epicgram` | `epicgram:epicgram` | `0755` | parent dir for all EPIC GRAM artefacts on this VPS |
| `/opt/epicgram/agent-control` | `epicgram:epicgram` | `0755` | git checkout of `https://github.com/EpicStarAi/agent-control.git` |
| `/opt/epicgram/agent-control/.env.local` | `epicgram:epicgram` | **`0600`** | server env file (see *Env plan* below); never world-readable |
| `/opt/epicgram/agent-control/.next` | `epicgram:epicgram` | `0755` | Next.js build output + runtime cache; only path the service writes to |
| `/etc/systemd/system/epicgram-web.service` | `root:root` | `0644` | proposed systemd unit (see *systemd draft*) |
| `/var/log/journal/...` | system | — | service logs via `journalctl -u epicgram-web` |

Deploy user: **`epicgram`** (dedicated system user, no shell — `nologin`).

---

## Env plan

### Required for first cutover (admin-gate only)

| Key | Source of value | Format check |
|---|---|---|
| `EPICGRAM_OPERATOR_EMAIL` | owner email; placeholder `<OWNER_EMAIL>` | non-empty, contains `@` |
| `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` | generated **locally** by `ops/set-operator-hash.ps1` (Windows) or `EPICGRAM_OPERATOR_PASSWORD='…' npm run operator:hash` (any OS); placeholder `<SCRYPT_HASH>` | matches `^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$` |

### Explicitly EXCLUDED for first cutover

Following the security decision in the task brief, these keys are **not**
placed on the VPS for the first P0 deploy. They stay unset; the corresponding
features stay dark. AI features are flagged off; outbound Telegram remains
MANUAL_APPROVAL_ONLY (no env is enough to *make* it send anyway).

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`
- `EPICGRAM_AI_ENABLED`
- `EPICGRAM_AI_PROVIDER`
- `EPICGRAM_AI_BASE_URL`
- `EPICGRAM_OPENAI_MODEL`
- `EPICGRAM_AI_API_KEY`

Also intentionally left unset (no operational reason yet on prod):
`NEXT_PUBLIC_TELEGRAM_WEBAPP_ENABLED`, `NEXT_PUBLIC_API_BASE_URL`,
`EPICGRAM_API_BASE_URL`, `EPICGRAM_TDLIB_*`, `OPERATOR_*`.

### Proposed `.env.local` content for the VPS

```bash
# EPIC GRAM — server env (P0 private beta)
# File: /opt/epicgram/agent-control/.env.local
# Owner: epicgram:epicgram   Mode: 0600
# Loaded by apps/web/next.config.mjs via dotenv from workspace root.

EPICGRAM_OPERATOR_EMAIL=<OWNER_EMAIL>
EPICGRAM_OPERATOR_PASSWORD_SCRYPT=<SCRYPT_HASH>
```

**That is the entire file.** Two lines. Anything else is a private-beta scope
creep risk and goes on the deferred list.

### How the file gets there (without exposing the hash in chat)

Recommended path (no scrypt hash ever crosses the chat / network):
1. Owner runs `ops/set-operator-hash.ps1` **locally on the dev box** — fills
   the workspace-root `.env.local` with the new `EPICGRAM_OPERATOR_PASSWORD_SCRYPT`.
2. Owner extracts only those two lines locally (e.g. `grep
   -E '^(EPICGRAM_OPERATOR_EMAIL|EPICGRAM_OPERATOR_PASSWORD_SCRYPT)='
   .env.local > /tmp/epicgram-server.env`).
3. Owner transfers via `scp -p /tmp/epicgram-server.env
   epicgram@<VPS>:/opt/epicgram/agent-control/.env.local` (or `rsync -e ssh
   --chmod=u+rw,go=`).
4. Owner removes the local stash: `rm -f /tmp/epicgram-server.env`.
5. On VPS: `chmod 600 .env.local && chown epicgram:epicgram .env.local`.

Alternative: regenerate the scrypt hash *on the VPS* by typing the operator
password into a `Read-Host`-equivalent prompt (`read -s` in bash) so the hash
is born on the VPS and never travels. Tradeoff: requires Node + the
`scripts/create-operator-hash.mjs` checked out first.

---

## VPS prep commands (DO NOT EXECUTE — owner runs them by hand)

> All commands assume owner is `root` (or has `sudo`). Where useful, run
> non-root steps as the `epicgram` deploy user via `sudo -u epicgram ...`.

### 0. Pre-checks (before touching anything)

```bash
# OS / Node availability
cat /etc/os-release
node -v 2>/dev/null || echo "node MISSING"
npm  -v 2>/dev/null || echo "npm  MISSING"
git  --version

# Required: Node ≥ 18.18 (Next.js 14.2.x). The CI uses Node 20 — match it.
# If missing, install via your usual channel (nodesource / nvm / packaged).
```

### 1. Create deploy user `epicgram` if missing

```bash
# Idempotent: does nothing if the user already exists
if ! id epicgram >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /opt/epicgram \
          --shell /usr/sbin/nologin epicgram
fi
id epicgram
```

### 2. Create `/opt/epicgram` tree

```bash
install -d -o epicgram -g epicgram -m 0755 /opt/epicgram
# (useradd above already created /opt/epicgram with the right owner;
#  the install -d call is idempotent and asserts the mode.)
```

### 3. Clone or fast-forward `agent-control`

```bash
# First clone:
if [ ! -d /opt/epicgram/agent-control/.git ]; then
  sudo -u epicgram git clone \
    https://github.com/EpicStarAi/agent-control.git \
    /opt/epicgram/agent-control
else
  # Subsequent updates (fast-forward only — refuse to overwrite local changes):
  sudo -u epicgram git -C /opt/epicgram/agent-control fetch --all --prune
  sudo -u epicgram git -C /opt/epicgram/agent-control status --short
  # Expect empty. If not empty, STOP and investigate.
  sudo -u epicgram git -C /opt/epicgram/agent-control pull --ff-only origin main
fi
```

### 4. Pin to the audited SHA

```bash
sudo -u epicgram git -C /opt/epicgram/agent-control checkout 527af55
sudo -u epicgram git -C /opt/epicgram/agent-control rev-parse HEAD
# Expect: 527af55e288ed9d434bdcd85b4ff556b0246ea26
```

> Why pin rather than ride `main`: deploys must be reproducible. If you want
> to follow `main` automatically, switch to `git pull --ff-only origin main`
> later, after the prod path is hardened.

### 5. Install + build

```bash
cd /opt/epicgram/agent-control
sudo -u epicgram npm ci                # honours package-lock.json
sudo -u epicgram NEXT_TELEMETRY_DISABLED=1 npm run build
# Expected: `next build apps/web` succeeds and writes apps/web/.next
ls -la apps/web/.next/BUILD_ID 2>/dev/null && echo "build OK"
```

### 6. Create `.env.local` (placeholders only — owner replaces in-place)

```bash
# Write the skeleton with placeholders, then fill it in *as the deploy user*
# using a no-history editor session.
sudo -u epicgram tee /opt/epicgram/agent-control/.env.local >/dev/null <<'EOF'
# EPIC GRAM — server env (P0 private beta)
# Loaded from this workspace-root file by apps/web/next.config.mjs (dotenv).
EPICGRAM_OPERATOR_EMAIL=<OWNER_EMAIL>
EPICGRAM_OPERATOR_PASSWORD_SCRYPT=<SCRYPT_HASH>
EOF

# Now fill in the two placeholders. Recommended editor: visudo-style locked
# editor, with no shell history. Example with vipw-equivalent:
sudo -u epicgram editor /opt/epicgram/agent-control/.env.local
# (If you used the scp path described above, skip this step — the file is
#  already filled with real values.)
```

### 7. Lock permissions

```bash
chmod 600 /opt/epicgram/agent-control/.env.local
chown epicgram:epicgram /opt/epicgram/agent-control/.env.local
stat -c '%a %U:%G  %n' /opt/epicgram/agent-control/.env.local
# Expect: 600 epicgram:epicgram  /opt/epicgram/agent-control/.env.local

# Sanity: file is not world-readable, no group-read either
test "$(stat -c '%a' /opt/epicgram/agent-control/.env.local)" = "600" \
  && echo "perms OK" || echo "PERMS WRONG — DO NOT START SERVICE"
```

### 8. Install systemd unit (file write — does not start anything)

```bash
# Write the unit file (see "systemd draft" section for the contents).
sudo install -m 0644 -o root -g root \
     /opt/epicgram/agent-control/ops/epicgram-web.service \
     /etc/systemd/system/epicgram-web.service
# NOTE: the .service file does NOT exist in the repo yet. Either:
#   (a) write it on the VPS by hand from the "systemd draft" block below, or
#   (b) commit it to the repo in a later, dedicated change (out of this dry-run).

sudo systemctl daemon-reload
sudo systemctl status epicgram-web --no-pager || true
# Expect: "Loaded: loaded ... disabled; vendor preset" and "inactive (dead)".
```

### 9. Start the service — **only after approval**

```bash
# enable (auto-start on boot) and start once.
sudo systemctl enable epicgram-web
sudo systemctl start  epicgram-web
sudo systemctl status epicgram-web --no-pager
# Expect: Active: active (running). If failed, see "Rollback".
```

### 10. Loopback health checks (see *Validation commands* below)

Stop here. **DO NOT** add the Caddy block, **DO NOT** create the DNS record
until every loopback check is green. Public exposure happens in
`ops/EPIC_GRAM_DOMAIN_DRY_RUN.md`'s playbook, after this one is green.

---

## systemd draft (file only — do not install yet)

```ini
# /etc/systemd/system/epicgram-web.service
# EPIC GRAM web (Next.js apps/web) — private-beta loopback service.
# Public exposure is provided separately by Caddy reverse_proxy.

[Unit]
Description=EPIC GRAM web (Next.js apps/web)
Documentation=https://github.com/EpicStarAi/agent-control
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=epicgram
Group=epicgram
WorkingDirectory=/opt/epicgram/agent-control

# Bind to loopback only. Caddy is the only public ingress (set up later).
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3015
Environment=NEXT_TELEMETRY_DISABLED=1
# .env.local is loaded by apps/web/next.config.mjs (dotenv); we do NOT
# inject EPICGRAM_OPERATOR_PASSWORD_SCRYPT via systemd Environment= here,
# to keep one canonical source of truth and to avoid putting the hash in
# the unit file (which is world-readable by default).

# `npm run start` -> `next start apps/web` (port comes from $PORT env above).
ExecStart=/usr/bin/npm run start

# Restart policy
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5

# Hardening (private beta — conservative; tighten further later)
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
RestrictRealtime=true
SystemCallArchitectures=native
# Next.js writes its build/runtime cache here; nothing else needs RW.
ReadWritePaths=/opt/epicgram/agent-control/apps/web/.next

[Install]
WantedBy=multi-user.target
```

Notes:
- `ExecStart=/usr/bin/npm run start` resolves to `next start apps/web`. The
  bound host:port comes from the `HOSTNAME`/`PORT` env injected by systemd
  (Next.js honours both). That's why **we use `npm run start`, not
  `npm run start:host`** — `start:host` hard-codes `0.0.0.0:3015` and would
  expose the service on every interface.
- The unit file should eventually be checked into the repo (e.g.
  `ops/epicgram-web.service`) so it's reviewable, but that is a follow-up
  change — outside this dry-run.

---

## Validation commands

Run these *on the VPS* as `root` (or with `sudo` where indicated). They print
status only — no secret values.

### Pre-start checks
```bash
# 1. Pinned SHA matches the approved deploy
sudo -u epicgram git -C /opt/epicgram/agent-control rev-parse HEAD
# Expect: 527af55e288ed9d434bdcd85b4ff556b0246ea26

# 2. Toolchain
node -v   # expect v20.x or v22.x
npm  -v   # expect ≥ 9

# 3. Reproduce build (no side-effects on already-installed deps)
cd /opt/epicgram/agent-control
sudo -u epicgram npm ci
sudo -u epicgram NEXT_TELEMETRY_DISABLED=1 npm run lint --if-present
sudo -u epicgram NEXT_TELEMETRY_DISABLED=1 npm run build
echo "lint/build exit: $?"

# 4. Port 3015 is free
sudo ss -ltnp '( sport = :3015 )'
# Expect: empty. If something is listening, STOP and resolve before starting service.

# 5. Env file is present, locked down, and contains only the two expected keys
stat -c '%a %U:%G  %n' /opt/epicgram/agent-control/.env.local
# Expect: 600 epicgram:epicgram  /opt/epicgram/agent-control/.env.local
sudo -u epicgram grep -cE '^(EPICGRAM_OPERATOR_EMAIL|EPICGRAM_OPERATOR_PASSWORD_SCRYPT)=' \
  /opt/epicgram/agent-control/.env.local
# Expect: 2

# 6. No leaked-shape secrets anywhere in the env file
sudo -u epicgram grep -cE 'sk-[A-Za-z0-9_-]{20,}|^TELEGRAM_BOT_TOKEN=' \
  /opt/epicgram/agent-control/.env.local
# Expect: 0
```

### Service start + loopback HTTP

```bash
# 7. Start
sudo systemctl daemon-reload
sudo systemctl enable epicgram-web
sudo systemctl start  epicgram-web
sudo systemctl status epicgram-web --no-pager

# 8. Bound to loopback only
sudo ss -ltnp '( sport = :3015 )'
# Expect: 127.0.0.1:3015 owned by node, NOT 0.0.0.0:3015 or :::3015

# 9. Home page
curl -sI http://127.0.0.1:3015/
# Expect: HTTP/1.1 200 OK

# 10. Admin gate page renders
curl -s http://127.0.0.1:3015/admin | grep -c 'Operator password'
# Expect: 1 (or more)

# 11. KEY TEST — env is loaded if wrong-password returns 401, not 503
curl -sX POST -H 'content-type: application/json' \
     --data '{"password":"definitely-wrong-probe"}' \
     http://127.0.0.1:3015/api/admin/login
# Expect: {"ok":false}    HTTP 401
# If you see {"ok":false,"configured":false}  HTTP 503  ->  env not loaded.
#   Stop the service, fix .env.local + re-check apps/web/next.config.mjs.

# 12. No-body / no-password handling
curl -sX POST http://127.0.0.1:3015/api/admin/login
# Expect: 400 {"ok":false,"message":"password required"}

# 13. Common passwords still rejected (no fallback)
curl -sX POST -H 'content-type: application/json' \
     --data '{"password":"admin"}' \
     http://127.0.0.1:3015/api/admin/login
# Expect: 401 {"ok":false}

# 14. Legal pages reachable
for p in / /admin /landing /terms /privacy /abuse; do
  printf "%-12s %s\n" "$p" "$(curl -sIo /dev/null -w '%{http_code}' http://127.0.0.1:3015$p)"
done
# Expect: 200 across the board.
```

### Service log sanity

```bash
# 15. No errors in last 50 lines, no secret-shaped strings
sudo journalctl -u epicgram-web -n 50 --no-pager
sudo journalctl -u epicgram-web --since '10 minutes ago' --no-pager \
  | grep -Ei 'error|fatal|unhandled|warn' | head -20

# 16. No scrypt hash, no telegram token in logs
sudo journalctl -u epicgram-web --since '10 minutes ago' --no-pager \
  | grep -cE 'scrypt:[0-9a-f]{16,}|sk-[A-Za-z0-9_-]{20,}|[0-9]{6,12}:[A-Za-z0-9_-]{30,}'
# Expect: 0
```

If any of 1–16 fails, **stop**. Do not proceed to DNS/Caddy.

---

## Rollback

Rollback at this stage is cheap because no public surface has been touched.

| Failure | Rollback | Time |
|---|---|---|
| Build fails (step 5) | Do nothing on the VPS; investigate locally; the service was never started. | < 1 min |
| `.env.local` wrong / unreadable / world-readable | `sudo -u epicgram editor /opt/epicgram/agent-control/.env.local` to fix; re-`chmod 600`; `systemctl restart epicgram-web`. | < 2 min |
| Service won't start (`systemctl status` shows failed) | `sudo journalctl -u epicgram-web -n 100 --no-pager` to diagnose; `systemctl stop epicgram-web` if running; fix and `start` again. | 5–10 min |
| 503 on `/api/admin/login` (env not loaded) | Confirm `apps/web/next.config.mjs` is at the post-fix version (commit `7a2a73b` or newer); confirm `.env.local` has the SCRYPT line; `systemctl restart`. | 2–5 min |
| Wrong SHA deployed | `git -C /opt/epicgram/agent-control fetch && git checkout <correct-sha>`; rebuild; restart. | 5–10 min |
| Need to back the host out entirely | `systemctl stop epicgram-web && systemctl disable epicgram-web`; optionally `rm -rf /opt/epicgram/agent-control/.next /opt/epicgram/agent-control/node_modules`. The user, source, and env file are still in place if you want to retry. Full removal: `userdel -r epicgram` after backing up `.env.local` if desired. | 5–15 min |

No DNS or Caddy changes are taken at this stage, so there is **nothing public
to revert**. Rollback never touches data.

---

## Risks

1. **Admin gate is client-state, not server session.** Same caveat as in
   the domain dry-run: a successful `POST /api/admin/login` flips a React
   `useState` and that's it. No cookie, no JWT. Acceptable for private beta,
   insufficient for production. **Do not announce.**
2. **No rate-limiting at this stage.** Even on loopback this is fine, but
   the next step (Caddy + public DNS) MUST add a `rate_limit` directive or
   fail2ban filter before public announcement.
3. **`.env.local` carries the operator hash.** A `0600` file + dedicated
   non-shell deploy user is the right minimum. Verify backups exclude this
   file or encrypt it; rotation procedure is in the *Secrets Rotation
   Checklist* response earlier in this session.
4. **`npm ci` pulls the lockfile graph from npm.** No supply-chain audit was
   re-run on the VPS (CI runs it on GitHub). Two practical mitigations:
   (a) compare `package-lock.json` SHA against the value at commit `527af55`
   before `npm ci`; (b) run `npm audit --omit=dev` after install and review
   *high+* advisories. Neither is enforced in this dry-run.
5. **Build runs as `epicgram`, which has write access to `.next`.** That's
   the minimum needed; the systemd `ReadWritePaths` matches. Do not relax
   `ProtectSystem=strict`.
6. **Node + npm version drift.** If the VPS Node is older than 18.18,
   Next.js 14.2 will refuse to start. Pin via nodesource/nvm and lock the
   version in the runbook before the next deploy.
7. **systemd unit file is not yet in the repo.** Owner writes it by hand on
   the VPS this round. A follow-up commit should land `ops/epicgram-web.service`
   so the next operator doesn't recreate it from this doc. Out of scope here.
8. **Leaked Moonshot key (`sk-Os2…vKhU`) still has unconfirmed revocation
   status.** AI features are off in P0 anyway and `EPICGRAM_AI_API_KEY` is
   not in the proposed `.env.local`, so the leaked key cannot affect this
   VPS. But it should still be **confirmed revoked** in the Moonshot console
   before any future change that turns AI on.
9. **No backup / monitoring of the service yet.** journalctl is the only
   log surface; no Prometheus, no uptime probe. Acceptable for private beta;
   *not* acceptable post-announcement.

---

## Go / no-go checklist (operator runs by hand)

### Pre-flight (do these BEFORE touching the VPS)
- [ ] `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` regenerated locally for prod use
      (do not reuse the dev-laptop hash if it ever left the laptop unencrypted).
- [ ] Owner email decided; will be written into `EPICGRAM_OPERATOR_EMAIL`.
- [ ] VPS SSH access confirmed (key-only auth, no password).
- [ ] No deploy already in progress on the host (`ls /opt/epicgram` clean).

### On VPS — user + tree
- [ ] `epicgram` system user exists, shell `nologin`, home `/opt/epicgram`.
- [ ] `/opt/epicgram` is `0755`, owned by `epicgram:epicgram`.

### On VPS — code
- [ ] `git -C /opt/epicgram/agent-control rev-parse HEAD` = `527af55…`.
- [ ] `git status --short` empty.
- [ ] `npm ci` succeeded (matches `package-lock.json`).
- [ ] `npm run lint --if-present` exit 0.
- [ ] `npm run build` exit 0; `apps/web/.next/BUILD_ID` exists.

### On VPS — env file
- [ ] `/opt/epicgram/agent-control/.env.local` exists.
- [ ] `stat -c '%a %U:%G'` = `600 epicgram:epicgram`.
- [ ] File contains exactly two lines starting with `EPICGRAM_OPERATOR_EMAIL=`
      and `EPICGRAM_OPERATOR_PASSWORD_SCRYPT=` (counted: 2).
- [ ] File contains **zero** `TELEGRAM_BOT_TOKEN`, `EPICGRAM_AI_*`,
      `OPERATOR_*` lines (counted: 0).
- [ ] No `sk-…` shape in the file (counted: 0).

### On VPS — systemd
- [ ] `/etc/systemd/system/epicgram-web.service` matches the *systemd draft* above.
- [ ] `systemctl daemon-reload` ran without error.
- [ ] `systemctl enable epicgram-web` (deferred to start step — optional now).

### On VPS — service + loopback smoke
- [ ] `systemctl start epicgram-web` → `Active: active (running)`.
- [ ] `ss -ltnp` shows `127.0.0.1:3015` owned by node; not `0.0.0.0` and not `:::`.
- [ ] `curl -sI http://127.0.0.1:3015/` → `200 OK`.
- [ ] `curl http://127.0.0.1:3015/admin` HTML contains `Operator password`.
- [ ] `POST /api/admin/login {"password":"wrong"}` → **401** `{"ok":false}` (the gate-loaded test).
- [ ] `POST /api/admin/login {}` → **400** `password required`.
- [ ] `/`, `/admin`, `/landing`, `/terms`, `/privacy`, `/abuse` all → **200**.
- [ ] `journalctl -u epicgram-web --since '10 minutes ago'` has no `error|fatal|unhandled` lines.
- [ ] `journalctl …` has **zero** lines matching `scrypt:…`, `sk-…`, or TG token shape.

### Stop here
- [ ] **DO NOT** add a Cloudflare A record yet.
- [ ] **DO NOT** add a Caddy block yet.
- [ ] Move to `ops/EPIC_GRAM_DOMAIN_DRY_RUN.md` only after every line above is checked ✅.

---

## Out of scope for this dry-run
- DNS plan / Cloudflare A record / Cloudflare proxy decisions — see the
  *DNS plan* section of `ops/EPIC_GRAM_DOMAIN_DRY_RUN.md`.
- Caddyfile edits / `caddy reload` / `systemctl reload caddy`.
- Public TLS testing via `app.epic-gram.com`.
- Telegram, Moonshot, and Kimi config or token usage. Those features stay
  off in P0. Their rotation flow is documented separately (chat: *EPIC GRAM
  — Secrets Rotation Checklist*).
- Backend API (`services/api`, port 8788). Not deployed in P0; not required
  for the admin gate or landing.
- Repository changes other than this very document. No code change is
  proposed by this dry-run; the systemd unit file is described, not added.

---

## What this document is, in one line
A reproducible, secret-safe playbook for getting an EPIC GRAM private-beta
VPS to a green `127.0.0.1:3015` smoke without spilling tokens, exposing it
publicly, or coupling to features that are still dark in P0.
