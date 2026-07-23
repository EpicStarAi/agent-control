# Replit dev environment: EPICGRAM Web now runs as a managed artifact

In the Replit workspace, the browser Preview pane no longer runs the Next.js
app in `apps/web` directly. It is served by the registered `react-vite`
artifact at `artifacts/epicgram-web` (previewPath `/`), which proxies its
read-only API calls through `artifacts/api-server` (`/api/*`) to this
project's real backend (`services/api/src/server.mjs`, workflow
`EPICGRAM API`, port 8788).

The old Replit workflow that ran `cd epicgram/apps/web && npx next dev
--hostname 0.0.0.0 --port 3000` has been removed from `.replit` — it is
unreachable through the Replit Preview proxy anyway, and running it
alongside the new artifact would just be a duplicate, unused process.

**This does not affect the standalone Next.js app itself.** The `dev`,
`build`, `start`, `start:host`, and `lint` scripts in `epicgram/package.json`
still point at `apps/web` and remain the canonical way to build/run/deploy
this app outside Replit (see `epicgram/docs/*VPS*` for the production
deployment path). Do not re-add a Replit workflow that starts `apps/web` on
port 3000 — it will not be reachable via the Preview pane; use the
`artifacts/epicgram-web` artifact instead.
