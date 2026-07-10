# EPIC GRAM — Production Deploy Runbook (epic-gram.com) — NGINX, real VPS

**Plan only. Nothing is executed by this document.** Built from the read-only VPS audit
(2026-06-26), not from assumptions. All Caddy assumptions from earlier plans are **obsolete**.

## Audited reality (source of truth)
- Host: `vmi3376363`, Ubuntu 24.04.4, kernel 6.8, **root**, IPv4 **194.163.140.26** (+IPv6).
- Reverse proxy: **nginx** (active, enabled). **Caddy NOT installed. Docker NOT installed** (the brief said "Docker ACTIVE" — incorrect; the box has no docker).
- App: `/opt/epicgram` (git repo), served by **pm2 `epicgram-web`** = `next-server v14.2.35` on **0.0.0.0:3015**. API = pm2 `epicgram-api` on `127.0.0.1:8788`. Also pm2 `control-panel` (:8099), `deepinside-life` (:8097). Node v22.22.3.
- Certbot installed. LE certs live: `deepinside.life`(+www), `live.deepinside.life`. Cloudflare origin cert at `/etc/nginx/ssl/origin.crt|.key` (used by `gram.deepinside.life`).
- nginx vhost dir: `/etc/nginx/sites-available` ⇄ `/etc/nginx/sites-enabled`. Basic-auth file: `/etc/nginx/.gram_htpasswd`.
- Cloudflare DNS for epic-gram.com: `@ www app tma → 194.163.140.26`, **DNS only (grey)**. Resolves correctly from the VPS.
- UFW active (22 confirmed; 80/443 effectively open — existing HTTPS + LE prove it).
- **No epic-gram.com nginx vhost and no epic-gram.com TLS cert yet** — that is this runbook's work.
- Current `/opt/epicgram` build is an older snapshot branch **without** the new operator login window. Domain comes up on the current build; new build is a separate task.

## Decisions to confirm before execution
1. **Gating:** basic-auth (private beta, reuse `/etc/nginx/.gram_htpasswd`, same login as `gram.deepinside.life`) **[recommended]** — or fully open.
2. **Subdomains in first cut:** `epic-gram.com` + `www` only **[recommended]**, or also `app` + `tma` now. `tma` (Telegram Mini App) must NOT send `X-Frame-Options: DENY`.

---

# Phase 1 — Infrastructure validation (read-only)
Confirm the base is healthy before any change.
```bash
nginx -t                                             # config currently valid
pm2 describe epicgram-web | grep -E 'status|script|cwd'
ps -eo pid,cmd | grep -E 'next-server' | grep -v grep
curl -sS -o /dev/null -w 'localhost:3015 -> %{http_code}\n' http://127.0.0.1:3015/
certbot certificates                                 # existing LE certs valid
getent hosts epic-gram.com www.epic-gram.com app.epic-gram.com tma.epic-gram.com
```
Pass criteria: `nginx -t` ok · `epicgram-web` online · `:3015` returns 200 · all 4 names resolve to `194.163.140.26`.

# Phase 2 — Nginx integration
**Create a NEW site file** (`/etc/nginx/sites-available/epic-gram.com`) — do **not** edit the existing `epicgram`/`gram.deepinside.life` block. All four hostnames proxy to the same origin `127.0.0.1:3015` (one Next instance serves them by Host header).

- `epic-gram.com` and `www` → proxy `:3015` (www can 301→apex if you prefer one canonical host).
- `app` → proxy `:3015` (same app; reserved for future split).
- `tma` → proxy `:3015` **without** `X-Frame-Options: DENY` (Telegram embeds it in an iframe).

HTTP bootstrap block (port 80, before certbot adds TLS):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name epic-gram.com www.epic-gram.com app.epic-gram.com tma.epic-gram.com;

    location ^~ /.well-known/acme-challenge/ {
        auth_basic off; allow all; root /var/www/letsencrypt;
    }
    location / {
        auth_basic "EPIC GRAM";                       # remove these 2 lines for "open"
        auth_basic_user_file /etc/nginx/.gram_htpasswd;
        proxy_pass http://127.0.0.1:3015;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```
Enable + reload:
```bash
mkdir -p /var/www/letsencrypt
ln -sf /etc/nginx/sites-available/epic-gram.com /etc/nginx/sites-enabled/epic-gram.com
nginx -t && systemctl reload nginx
```
Note: `tma` needs `proxy_hide_header X-Frame-Options;` (and/or no DENY) — add a dedicated `tma.epic-gram.com` server block if its headers must differ from the others.

# Phase 3 — SSL (reuse existing certbot, Let's Encrypt)
DNS is **DNS-only (grey)** so HTTP-01 reaches the VPS directly — issue a real LE cert now.
```bash
certbot --nginx \
  -d epic-gram.com -d www.epic-gram.com -d app.epic-gram.com -d tma.epic-gram.com \
  --redirect --agree-tos -m <admin-email> --no-eff-email
```
- Certbot adds `listen 443 ssl` blocks + HTTP→HTTPS redirect into the same site file.
- Cert location: `/etc/letsencrypt/live/epic-gram.com/{fullchain,privkey}.pem`.
- Renewal: handled by the existing `certbot.timer` (auto). Validate: `certbot renew --dry-run`.
- Validation: `certbot certificates | grep -A2 epic-gram.com` → VALID, 4 domains.
- Rollback (SSL only): `certbot delete --cert-name epic-gram.com`, then restore the HTTP-only site file + `systemctl reload nginx`.

# Phase 4 — PM2 (app already running)
No new process is required — `epicgram-web` already serves `:3015` from `/opt/epicgram`. This runbook does **not** restart it (zero impact on the live app).
- Inspect: `pm2 describe epicgram-web` · logs: `pm2 logs epicgram-web --lines 50`.
- If a future build is deployed: `cd /opt/epicgram && npm ci && npm run build && pm2 reload epicgram-web --update-env` (`reload` = zero-downtime for cluster mode; current mode is `fork`, so a brief sub-second blip on `restart`). Persist: `pm2 save`.
- Restart strategy: pm2 auto-restarts on crash. Rollback: `pm2 reload epicgram-web` to previous build dir, or `git -C /opt/epicgram checkout <prev>` + rebuild + reload.

# Phase 5 — Verification
```bash
for h in epic-gram.com www.epic-gram.com app.epic-gram.com tma.epic-gram.com; do
  echo "== $h =="
  curl -skI https://$h/ | head -1                    # expect 200 (or 401 if basic-auth)
  curl -skI https://$h/ | grep -iE 'server|strict-transport|x-frame-options'
done
curl -sk https://epic-gram.com/agents -o /dev/null -w '/agents -> %{http_code}\n'
echo | openssl s_client -servername epic-gram.com -connect epic-gram.com:443 2>/dev/null | openssl x509 -noout -issuer -dates
```
Pass: HTTPS 200 (or 401 with basic-auth), valid LE cert (issuer = Let's Encrypt), `tma` has **no** `X-Frame-Options: DENY`.

# Phase 6 — Cloudflare
- Keep **DNS only (grey)** until Phase 5 passes on the LE cert. (Grey = certbot HTTP-01 works and you test the origin directly.)
- After verification: switch records to **Proxied (orange)**, then set SSL/TLS mode to **Full (strict)** (CF→origin over the valid LE cert; never "Flexible").
- Keep disabled until production-verified: "Always Use HTTPS" auto-rewrite (until LE+redirect confirmed), Rocket Loader, Auto Minify, Email Obfuscation, and any caching rules on `tma`/`app` (Mini App + dynamic app should bypass cache). Re-enable caching selectively only for static assets after testing.

# Phase 7 — Rollback (full)
1. **Disable the site:** `rm -f /etc/nginx/sites-enabled/epic-gram.com && nginx -t && systemctl reload nginx`. epic-gram.com stops being served; all existing sites untouched.
2. **Remove cert (optional):** `certbot delete --cert-name epic-gram.com`.
3. **DNS:** in Cloudflare, set records back to DNS-only or remove (epic-gram.com simply won't resolve to a served vhost).
4. **App:** no change needed (we never restarted it). If a new build was deployed: `git -C /opt/epicgram checkout <prev-commit> && npm ci && npm run build && pm2 reload epicgram-web`.
5. Stateless web → no data migration, no DB rollback. Existing deepinside/gram services are never modified by this runbook.

# Phase 8 — Risk assessment
| Risk | Likelihood | Severity | Rank | Mitigation |
|------|-----------|----------|------|-----------|
| Editing a wrong/shared nginx block breaks live sites | Low | High | **MEDIUM** | New separate site file only; `nginx -t` before every reload; reload (graceful), not restart |
| Certbot HTTP-01 fails (UFW blocks 80, or rate limit) | Low | Med | **LOW** | 80 already open (existing LE proves it); ACME location is auth-off; LE rate limit far from hit |
| `tma` not embeddable in Telegram (X-Frame-Options) | Med | Med | **MEDIUM** | Dedicated `tma` block without DENY; verify header in Phase 5 |
| Public exposure of console on open build (no app gate) | Med | High | **HIGH if "open"** | Use basic-auth (recommended); old build has no app-level gate |
| Cloudflare Flexible SSL chosen by mistake | Low | High | **MEDIUM** | Explicitly use Full (strict) only after LE cert valid |
| Port 3015 contention / app crash mid-deploy | Low | Med | **LOW** | App untouched by this runbook; pm2 auto-restart |
| Leaked GitHub PAT embedded in `/opt/epicgram` git remote | Confirmed | High | **HIGH (separate)** | Rotate the PAT; rewrite remote to credential-helper. Not triggered by deploy, but fix soon |
| New login-window build not on server | Confirmed | Low | **LOW** | Cosmetic; deploy current build now, ship new build separately |

---

## READY FOR P3 DEPLOY: **YES**
- **Deployment time:** ~10–15 min (nginx site file + reload, certbot issue, verification).
- **Downtime:** ~0 — purely additive; `:3015` app and all existing vhosts are untouched; nginx `reload` is graceful.
- **Rollback time:** ~2–3 min (remove symlink + reload; optional `certbot delete`).
- **Probability of successful deployment:** ~95% (healthy infra, DNS already correct, proven LE + nginx pattern; residual risk = certbot edge cases / `tma` header tuning).

**Open items before "go":** confirm (1) gating = basic-auth vs open, (2) subdomains = apex+www vs +app+tma, (3) admin email for certbot, (4) keep or remove the temporary `epicstar.space` vhost.
