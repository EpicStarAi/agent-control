# EPIC GRAM / TG EPIC STAR — VPS P2 Real Deploy Plan

> **Replit workspace note:** this plan targets the standalone `apps/web`
> Next.js app for an external VPS deploy. It is unrelated to the Replit
> workspace's Preview pane, which runs the `artifacts/epicgram-web`
> react-vite artifact — see `REPLIT_MIGRATION_NOTE.md` at the repo root.

Status: **PLAN ONLY / NO DEPLOY EXECUTED**
Scope: first real VPS deploy plan for `epic-gram.com` contour.
This document is an execution plan, not proof that deployment happened.

## 1. Current checkpoint

Expected repository state before real deploy:

- `origin/main`: `21296e7` or newer reviewed commit
- Working tree: clean
- GitHub Actions: green
- P0 private beta: closed
- P1 dry-run checklist: completed and pushed
- Domain runbook: sanitized
- No real VPS IP committed
- No real secrets committed

## 2. Deployment boundary

P2 first deploy is **admin-gate-only**.

Allowed runtime env on VPS:

```env
EPICGRAM_OPERATOR_EMAIL=<OPERATOR_EMAIL>
EPICGRAM_OPERATOR_PASSWORD_SCRYPT=<SCRYPT_HASH>
```

Forbidden during first deploy:

```env
TELEGRAM_BOT_TOKEN=
MOONSHOT_API_KEY=
KIMI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
XAI_API_KEY=
```

Rules:

- Do not activate Telegram outbound automation.
- Do not add AI provider keys.
- Do not bind `api.epic-gram.com` to active backend yet.
- Do not commit real `.env.local`.
- Real env values live only on VPS runtime.

## 3. Target domain contour

P2 target:

- `epic-gram.com`
- `www.epic-gram.com`
- `app.epic-gram.com`
- `tma.epic-gram.com`

Later only:

- `api.epic-gram.com`

## 4. Pre-flight gates

Before touching VPS:

```bash
git fetch origin main
git status --branch --short
git rev-parse --short HEAD
git rev-parse --short origin/main
npm install
npm run lint
npm run build
```

Required:

- `HEAD == origin/main`
- working tree clean
- CI green in GitHub Actions
- local build green or documented reason if build is CI-only
- deploy approval explicitly granted

## 5. VPS filesystem layout

Recommended placeholder layout:

```text
/opt/epic-gram/app
/opt/epic-gram/releases
/opt/epic-gram/backups
/opt/epic-gram/logs
```

Runtime env placeholder:

```text
/opt/epic-gram/app/.env.local
```

Permissions:

```bash
chmod 600 /opt/epic-gram/app/.env.local
```

## 6. VPS deploy sequence — manual approval required

This section is not executed by this document.

### 6.1 Connect

```bash
ssh <VPS_USER>@<VPS_PUBLIC_IPv4>
```

### 6.2 Prepare app directory

```bash
sudo mkdir -p /opt/epic-gram/app
sudo mkdir -p /opt/epic-gram/releases
sudo mkdir -p /opt/epic-gram/backups
sudo mkdir -p /opt/epic-gram/logs
```

### 6.3 Fetch code

Preferred mode:

```bash
cd /opt/epic-gram/app
git fetch origin main
git checkout main
git pull --ff-only origin main
git rev-parse --short HEAD
```

Expected commit:

```text
21296e7 or newer reviewed commit
```

### 6.4 Install/build

Use repository-defined scripts:

```bash
npm install
npm run lint
npm run build
```

If production run script exists:

```bash
npm run start
```

Repo scripts present at `21296e7`:

- `dev`, `dev:host` — dev only, not used in P2
- `build` → `next build apps/web`
- `start` → `next start apps/web` (loopback via `HOSTNAME`/`PORT` env)
- `start:host` → `next start apps/web --hostname 0.0.0.0 --port 3015` (NOT for systemd; hostname/port comes from env there)
- `lint` → `next lint apps/web`
- `api:dev` — backend not deployed in P2
- `operator:hash` — for the operator gate hash, see `ops/set-operator-hash.ps1`

If project requires PM2/systemd, define service only after build is green.
See `ops/EPIC_GRAM_VPS_ENV_PREP_DRY_RUN.md` for a proposed `epicgram-web.service`
systemd unit with hardening (`ProtectSystem=strict`, `NoNewPrivileges`, etc.).

## 7. Runtime env setup

Create only this runtime env on VPS:

```env
EPICGRAM_OPERATOR_EMAIL=<OPERATOR_EMAIL>
EPICGRAM_OPERATOR_PASSWORD_SCRYPT=<SCRYPT_HASH>
```

Forbidden:

```env
TELEGRAM_BOT_TOKEN=
MOONSHOT_API_KEY=
KIMI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
XAI_API_KEY=
```

Validation:

```bash
grep -nE 'TELEGRAM_BOT_TOKEN|MOONSHOT_API_KEY|KIMI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|XAI_API_KEY' .env.local && exit 1 || true
```

Env file load path:

- `apps/web/next.config.mjs` loads workspace-root `.env.local` via dotenv
  (`import.meta.url`, `override:false`). Same mechanism on VPS — no per-app
  `apps/web/.env.local` needed.

## 8. Caddy contour

Placeholder Caddy config:

```caddy
epic-gram.com, www.epic-gram.com {
    reverse_proxy 127.0.0.1:<APP_PORT>
}

app.epic-gram.com {
    reverse_proxy 127.0.0.1:<APP_PORT>
}

tma.epic-gram.com {
    header {
        -X-Frame-Options
        Content-Security-Policy "frame-ancestors https://web.telegram.org https://*.telegram.org;"
    }

    reverse_proxy 127.0.0.1:<APP_PORT>
}

# api.epic-gram.com is intentionally not activated in P2 first deploy.
```

Rules:

- Replace `<APP_PORT>` only during real deploy. Canonical port per RUNBOOK: `3015`.
- TMA must be embeddable inside Telegram.
- Do not send `X-Frame-Options: DENY` on TMA.
- Backup current Caddy config before change.
- Run config validation before reload.

Validation pattern:

```bash
caddy validate --config <CADDYFILE_PATH>
```

Reload pattern:

```bash
sudo systemctl reload caddy
```

Reload only after explicit approval.

## 9. Cloudflare / DNS plan

Expected DNS records:

```text
A     @      <VPS_PUBLIC_IPv4>
A     www    <VPS_PUBLIC_IPv4>
A     app    <VPS_PUBLIC_IPv4>
A     tma    <VPS_PUBLIC_IPv4>
A     api    <VPS_PUBLIC_IPv4>    later only
```

P2 rule:

- Do not activate `api.epic-gram.com`.
- If Caddy issues TLS directly, start with DNS-only.
- If Cloudflare proxy is enabled later, use Full strict.
- Do not use Flexible SSL for final strict production mode.

## 10. Smoke tests after deploy

HTTP checks:

```bash
curl -I https://epic-gram.com
curl -I https://www.epic-gram.com
curl -I https://app.epic-gram.com
curl -I https://tma.epic-gram.com
```

TMA header checks:

```bash
curl -I https://tma.epic-gram.com | grep -i 'x-frame-options' || true
curl -I https://tma.epic-gram.com | grep -i 'content-security-policy' || true
```

Admin gate health (key signal — confirms root env is loaded):

```bash
curl -sX POST -H 'content-type: application/json' \
     --data '{"password":"definitely-wrong-probe"}' \
     https://app.epic-gram.com/api/admin/login
```

Expected:

- no `X-Frame-Options: DENY`
- `Content-Security-Policy` allows Telegram frame ancestors
- admin gate loads (`/admin` → 200 with operator password form)
- wrong-password POST returns **401 `{"ok":false}`**, not 503 (503 means env not loaded)
- login requires configured operator credentials
- no Telegram bot outbound actions

## 11. Rollback plan

Before deploy:

```bash
git rev-parse --short HEAD
sudo cp <CADDYFILE_PATH> /opt/epic-gram/backups/Caddyfile.before-p2
sudo cp .env.local /opt/epic-gram/backups/env.local.before-p2
```

Rollback concept:

```bash
cd /opt/epic-gram/app
git checkout <PREVIOUS_GOOD_COMMIT>
npm install
npm run build
sudo cp /opt/epic-gram/backups/Caddyfile.before-p2 <CADDYFILE_PATH>
caddy validate --config <CADDYFILE_PATH>
sudo systemctl reload caddy
```

Do not execute rollback unless needed.

## 12. P2 Go / No-Go

Go only if:

- [ ] GitHub Actions green
- [ ] local repo clean
- [ ] `HEAD == origin/main`
- [ ] deployment approval granted
- [ ] only admin-gate env available
- [ ] no Telegram/Moonshot/Kimi/AI keys
- [ ] Caddy config validated
- [ ] rollback backup prepared
- [ ] `api.epic-gram.com` remains inactive
- [ ] TMA headers reviewed

No-Go if:

- [ ] CI red
- [ ] repo dirty
- [ ] unknown origin/main
- [ ] real secrets appear in git
- [ ] real public IP appears in docs
- [ ] TMA blocked by frame headers
- [ ] rollback path missing

## 13. Completion criteria

P2 real deploy is complete only when:

- app is running on VPS
- apex/www/app/tma domains resolve correctly
- TLS works
- admin gate works
- TMA route is embeddable
- no Telegram outbound automation is active
- no AI provider keys are present
- rollback path is documented
- post-deploy smoke test is saved

This document does not execute deployment.

## 14. Related docs

- `ops/EPIC_GRAM_DOMAIN_DRY_RUN.md` — broader domain-deploy runbook (DNS + Caddy + systemd); the DNS/Caddy shape sections still apply to the `epic-gram.com` cutover.
- `ops/EPIC_GRAM_VPS_ENV_PREP_DRY_RUN.md` — companion env-prep playbook with systemd unit draft, loopback smoke checks, rollback table.
- `docs/EPIC_GRAM_DOMAIN_DEPLOY.md` — sanitized public-facing domain deploy plan for `epic-gram.com` (apex + www + app + tma + api-later).
- `docs/EPIC_GRAM_VPS_P1_DRY_RUN.md` — P1 dry-run checklist (admin-gate-only env, no Telegram/AI keys).
- `docs/RUNBOOK.md` — local dev runbook + secrets policy.
- `docs/operator-auth.md` — operator gate, scrypt helper, env source-of-truth.

This file is the **executable plan** for the first real cutover. It mirrors
P1's scope (admin-gate-only env, no Telegram/AI keys) and adds the actual
deploy sequence, rollback, and smoke tests an operator runs by hand on the VPS.
