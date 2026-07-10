# EPIC☠️GRAM Site Mirror

The web client is ready to deploy as a PWA mirror of the desktop/web client.

## Recommended MVP Deployment

- Host: Vercel or Netlify.
- App root: repository root.
- Build command: `npm run build`.
- Dev command: `npm run dev:host`.
- Public app path: `/`.
- Domain example: `epicgram.epicstar.ai` or another domain owned by the project.

## DNS

After choosing the real domain, create the DNS records required by the hosting provider:

- `CNAME` for a subdomain such as `epicgram` pointing to the provider target.
- Or provider `A` records for an apex domain.

Do not publish real Telegram authorization until the TDLib backend is deployed over HTTPS and session storage is encrypted.

## Current Runtime Contract

The deployed mirror may show the interface and PWA install flow now. Telegram login remains disabled until the backend endpoints under `/api/telegram/*` are wired to an official TDLib runtime.
