# EPIC GRAM / TG EPIC STAR — VPS P1 Deploy Prep Dry-Run

Status: **DRY-RUN ONLY**
Scope: first VPS deploy preparation for `epic-gram.com` contour.
No production deployment is performed by this document.

## 1. Current checkpoint

- `origin/main` expected HEAD: `8569161`
- P0 private beta: closed
- Domain runbook: sanitized
- Real VPS IP: not committed
- GitHub push: completed
- GitHub Actions: must be checked before real deploy

## 2. Domain contour

Target domains:

- `epic-gram.com`
- `www.epic-gram.com`
- `app.epic-gram.com`
- `tma.epic-gram.com`
- `api.epic-gram.com` — later only

P1 activation rule:

- `epic-gram.com`, `www.epic-gram.com`, `app.epic-gram.com`, `tma.epic-gram.com` may be prepared.
- `api.epic-gram.com` must remain future/later and must not be bound to an active backend in P1.

## 3. Allowed first-deploy env

Only admin gate env is allowed in the first VPS deploy:

```env
EPICGRAM_OPERATOR_EMAIL=<OPERATOR_EMAIL>
EPICGRAM_OPERATOR_PASSWORD_SCRYPT=<SCRYPT_HASH>
```

Rules:

- Use real values only on VPS runtime.
- Do not commit real operator email.
- Do not commit real scrypt hash.
- Do not put secrets into docs.
- Do not put secrets into GitHub commits.

## 4. Explicitly forbidden in first deploy

Do not add these in P1:

```env
TELEGRAM_BOT_TOKEN=
MOONSHOT_API_KEY=
KIMI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
XAI_API_KEY=
```

Rationale:

- First VPS deploy is admin-gate-only.
- No outbound Telegram automation.
- No AI provider calls.
- No production bot/token blast radius.

## 5. Pre-deploy local checks

Before any real VPS work:

```bash
git fetch origin main
git status --branch --short
git rev-parse --short HEAD
git rev-parse --short origin/main
```

Required:

- local branch: `main`
- working tree: clean
- `HEAD == origin/main`
- `origin/main == 8569161` or newer reviewed commit

Build/lint gate:

```bash
npm install
npm run lint
npm run build
```

If monorepo scripts differ, use the repo-defined package scripts from `package.json`.
Scripts present at `8569161`: `dev`, `dev:host`, `start`, `start:host`, `build`, `lint`,
`api:dev`, `operator:hash`, `desktop`, `desktop:dev`, `vite:*` (legacy, not used in P1).

## 6. VPS preparation checklist — manual only

This section is a manual checklist. It is not an instruction to execute now.

### 6.1 Base packages

Expected runtime class:

- Node.js runtime matching project requirements (Next.js 14 → Node 20.x or 22.x)
- package manager matching lockfile (npm with `package-lock.json`)
- process manager or service unit (systemd unit `epicgram-web.service`, see existing
  draft in `ops/EPIC_GRAM_VPS_ENV_PREP_DRY_RUN.md`)
- Caddy or equivalent reverse proxy
- TLS enabled only after DNS is correct

### 6.2 Repository placement

Recommended layout placeholder:

```text
/opt/epic-gram/app
```

No real server path is required in Git.
The companion env-prep dry-run uses `/opt/epicgram/agent-control` — pick one canonical
path on the VPS and use it consistently; do not mix.

### 6.3 Runtime env file

Recommended placeholder path:

```text
/opt/epic-gram/app/.env.local
```

Allowed contents only:

```env
EPICGRAM_OPERATOR_EMAIL=<OPERATOR_EMAIL>
EPICGRAM_OPERATOR_PASSWORD_SCRYPT=<SCRYPT_HASH>
```

Permissions:

```bash
chmod 600 .env.local
```

Do not commit this file. Workspace-root `.env.local` is loaded by
`apps/web/next.config.mjs` via dotenv (`import.meta.url`, `override:false`); this
runs identically on VPS.

## 7. Caddy dry-run contour

Placeholder-only Caddy contour:

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

# api.epic-gram.com is intentionally later-only in P1.
# Do not bind api.epic-gram.com to an active backend yet.
```

Rules:

- This is dry-run only.
- Do not reload Caddy from this document.
- Do not apply Cloudflare changes from this document.
- Replace `<APP_PORT>` only during real deploy. Canonical port per RUNBOOK: `3015`.
- TMA route must be embeddable inside Telegram.
- Do not send `X-Frame-Options: DENY` on TMA.

## 8. Cloudflare dry-run notes

Manual future checklist:

- DNS records point to `<VPS_PUBLIC_IPv4>`
- Start with DNS-only if TLS is issued directly by Caddy
- Later Cloudflare proxy mode may use Full strict
- Do not use Flexible SSL for final production strict TLS
- Do not activate `api.epic-gram.com` during P1

No Cloudflare action is performed in this dry-run.

## 9. Go / No-Go checklist

Go only if:

- [ ] GitHub Actions green after push
- [ ] `origin/main` reviewed
- [ ] Working tree clean
- [ ] No real public IP committed
- [ ] No real operator email committed
- [ ] No real scrypt hash committed
- [ ] No Telegram bot credentials committed
- [ ] No AI provider keys committed
- [ ] TMA headers reviewed
- [ ] `api.epic-gram.com` remains later-only
- [ ] Rollback path documented

No-Go if:

- [ ] Any secret appears in git
- [ ] Any real public IP appears in docs
- [ ] Cloudflare/DNS is unclear
- [ ] Caddy TMA headers would block Telegram iframe
- [ ] `api.epic-gram.com` is accidentally activated
- [ ] Build/lint is red

## 10. Rollback concept

Rollback should be prepared before real deploy:

- previous Git commit hash
- previous Caddy config backup
- previous runtime env backup stored only on VPS
- process manager restart command
- DNS rollback notes if Cloudflare changes are made later

This document does not execute rollback or deploy.

## 11. P1 boundary

P1 is complete when:

- dry-run doc exists
- no secrets are committed
- no real IP is committed
- deploy path is clear
- GitHub state remains clean
- real deploy still requires explicit approval

## 12. Related docs

- `ops/EPIC_GRAM_DOMAIN_DRY_RUN.md` — broader domain-deploy runbook (DNS + Caddy + systemd).
- `ops/EPIC_GRAM_VPS_ENV_PREP_DRY_RUN.md` — companion env-prep playbook with systemd unit draft, loopback smoke checks, rollback table.
- `docs/EPIC_GRAM_DOMAIN_DEPLOY.md` — sanitized public-facing domain deploy plan for `epic-gram.com`.
- `docs/RUNBOOK.md` — local dev runbook + secrets policy.
- `docs/operator-auth.md` — operator gate, scrypt helper, env source-of-truth.

This file is intentionally narrower than the others: it pins the **first** VPS cutover
to admin-gate-only env (`EPICGRAM_OPERATOR_EMAIL`, `EPICGRAM_OPERATOR_PASSWORD_SCRYPT`)
and explicitly forbids Telegram and AI provider keys.
