# EPIC GRAM — Domain Deploy (P0)

How to expose EPIC GRAM (Next `apps/web` + `services/api`) on the domain.
**Do not edit the production Caddyfile automatically — apply manually after review.**
All placeholders (`<...>`) must be filled with real values locally; never commit real secrets.

## Option A — subdomain: `epicgram.deepinside.life`
- Cleanest separation; own SSL cert; easy to roll back (remove the block).

### DNS (Cloudflare)
- A record: `epicgram` → `<VPS_IP>` (e.g. 194.163.140.26)
- Proxy status: **Proxied (orange cloud)** for Cloudflare SSL + DDoS, or DNS-only if you terminate TLS at Caddy.

### Caddy (reverse proxy) — example block
```caddy
epicgram.deepinside.life {
    encode zstd gzip

    # Next.js web (apps/web) — running on the VPS (e.g. :3015 via `npm run start:host`)
    handle {
        reverse_proxy 127.0.0.1:3015
    }

    # Backend API (services/api) under /api-be/* if you want it same-origin
    handle_path /api-be/* {
        reverse_proxy 127.0.0.1:8788
    }

    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

## Option B — path: `deepinside.life/epicgram`
- Reuses existing site cert; trickier because Next needs `basePath`.
- In `apps/web/next.config.mjs` set `basePath: "/epicgram"` (test build first).
- Caddy:
```caddy
deepinside.life {
    handle_path /epicgram/* {
        reverse_proxy 127.0.0.1:3015
    }
    # ... existing site blocks ...
}
```
- Trade-off: extra config + asset path changes. **Option A (subdomain) is recommended for P0.**

## SSL
- Caddy auto-provisions Let&apos;s Encrypt certs (Option A) when DNS resolves to the VPS.
- If Cloudflare proxied: use Full (strict) SSL mode and a Cloudflare Origin cert, or DNS-only so Caddy gets the cert.

## Health check
- After deploy: `curl -I https://epicgram.deepinside.life/` → 200.
- API: `curl https://epicgram.deepinside.life/api-be/` (or the API health route).
- Local stack control: `deepinside-platform\ops\deepinside.ps1 status`.

## Rollback
- Remove the Caddy block (or revert the file) and `caddy reload`.
- DNS: set the record back / remove it.
- No data migration involved — web is stateless; API state is unchanged.

## Pre-deploy checklist
- [ ] `npm run build` green; `npm run start:host` serves on :3015.
- [ ] Legal pages reachable: `/terms /privacy /abuse`.
- [ ] `/admin` gate configured (EPICGRAM_OPERATOR_PASSWORD_SCRYPT set in server `.env.local`).
- [ ] No secrets in repo; keys only in `.env.local`.
- [ ] Owner approval for going live (MANUAL_APPROVAL_ONLY).
