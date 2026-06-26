# EPIC GRAM — Domain Deploy (epic-gram.com) — DRY-RUN

Private-beta cutover plan for **epic-gram.com** (Cloudflare DNS + Caddy on the VPS).
**DRY-RUN ONLY** — do not modify Cloudflare, do not edit the production Caddyfile, do not SSH,
do not deploy, do not commit without owner approval. First cutover excludes Telegram and AI keys.

Origin (confirm before use): VPS **<VPS_PUBLIC_IPv4>** (Contabo). App = Next `apps/web` on `:3015`
(`npm run start:host`). API = `services/api` on `:8788` (NOT exposed in first cutover).

## 1. DNS records (Cloudflare)
First go DNS-only (grey cloud) so Caddy can issue Let's Encrypt certs directly; flip Proxy ON later.

| Type | Name | Content | First | Later | TTL |
|------|------|---------|-------|-------|-----|
| A | `@` (epic-gram.com) | <VPS_PUBLIC_IPv4> | **DNS only** | Proxied | Auto |
| A | `www` | <VPS_PUBLIC_IPv4> | **DNS only** | Proxied | Auto |
| A | `app` | <VPS_PUBLIC_IPv4> | **DNS only** | Proxied | Auto |
| A | `tma` | <VPS_PUBLIC_IPv4> | **DNS only** | Proxied | Auto |
| A | `api` *(later phase)* | <VPS_PUBLIC_IPv4> | — (add later) | Proxied | Auto |

(Alt: `www`, `app`, `tma` can be CNAME to `epic-gram.com` instead of A. A-records are simplest.)
No `admin` subdomain — `/admin` stays under `app.epic-gram.com/admin`.

## 2. Cloudflare SSL/TLS mode
- **First (DNS-only):** Cloudflare is not in the path; **Caddy gets the cert** (Let's Encrypt, TLS-ALPN/HTTP-01). Nothing to set in CF.
- **Later (Proxy ON):** set SSL/TLS mode to **Full (strict)** — CF to origin over Caddy's valid LE cert (end-to-end TLS). **Never use Flexible** (insecure, breaks redirects).

## 3. Caddy block (for the VPS — apply manually after review)
```caddy
# --- Landing (apex + www) ---
epic-gram.com, www.epic-gram.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3015
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

# --- App (canonical Next web; includes /admin) ---
app.epic-gram.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3015
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

# --- Telegram Mini App entry ---
# MUST be embeddable inside Telegram -> do NOT send X-Frame-Options DENY.
tma.epic-gram.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3015
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -X-Frame-Options
    }
}

# --- API (LATER phase, not in first cutover) ---
# api.epic-gram.com {
#     reverse_proxy 127.0.0.1:8788
# }
```
Note: if Next emits its own `X-Frame-Options`/CSP, ensure `tma.epic-gram.com` allows
`frame-ancestors https://*.telegram.org` (or omits frame restrictions) so the Mini App loads.

## 4. Deploy order (execute later, with approval)
1. **DNS:** add A records `@ www app tma` to <VPS_PUBLIC_IPv4>, **DNS-only**. Verify: `dig app.epic-gram.com +short`.
2. **App on VPS:** pull repo, `npm ci`, `npm run build`, run `npm run start:host` (:3015) under a process manager (pm2/systemd). Health: `curl -I http://127.0.0.1:3015/`.
3. **Caddy:** add the blocks above, `caddy validate`, `caddy reload`. Certs auto-issue (LE).
4. **Verify HTTPS:** `https://app.epic-gram.com/`, `/landing`, `/terms`, `/privacy`, `/abuse` -> 200; `/admin` -> gate closed.
5. **Later:** flip Cloudflare Proxy ON for the 4 records + SSL/TLS **Full (strict)**.
6. **Later:** add `api.epic-gram.com` block + record; wire Telegram (BotFather Mini App URL = `https://tma.epic-gram.com`) and AI keys — separate approved phase.

## 5. Go / No-Go checklist (first cutover)
- [ ] Origin IP confirmed (<VPS_PUBLIC_IPv4>) and VPS reachable.
- [ ] DNS A records added (DNS-only) and propagated (`dig`).
- [ ] App builds on VPS (`npm run build` green) and runs on :3015 (health 200).
- [ ] Caddy blocks added, `caddy validate` OK, reload done.
- [ ] LE certs issued for `epic-gram.com`, `www`, `app`, `tma`.
- [ ] `https://app.epic-gram.com/` + `/landing /terms /privacy /abuse` -> 200.
- [ ] `/admin` gate closed (401/503); `EPICGRAM_OPERATOR_PASSWORD_SCRYPT` set on VPS `.env.local` only if /admin needed.
- [ ] `tma.epic-gram.com` loads and is framable by Telegram (no `X-Frame-Options: DENY`).
- [ ] **No Telegram bot token / AI keys in this cutover.**
- [ ] Rollback ready: remove Caddy blocks + `caddy reload`; revert DNS.

## Rollback
Remove the Caddy blocks (or revert the file) -> `caddy reload`. DNS: delete/restore records.
Stateless web -> no data migration. Production deepinside stack on the VPS is untouched.
