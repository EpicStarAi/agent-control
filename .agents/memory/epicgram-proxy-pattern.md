---
name: EPICGRAM Next.js-to-Vite port proxy pattern
description: How the EPICGRAM Telegram client frontend was ported to a react-vite artifact while keeping the real TDLib backend service untouched and safe.
---

When porting a Next.js app's frontend to a `react-vite` artifact (for artifact-router compatibility) while a real backend service keeps running as an unregistered workflow, add a thin passthrough proxy router inside an already-registered `api` artifact (e.g. `artifacts/api-server`) instead of duplicating backend logic or exposing the bare backend port through the proxy.

**Why:** the shared artifact proxy only routes registered artifacts; a raw workflow's port is never reachable from the browser/preview. Re-implementing backend logic risks diverging from the real TDLib/session-handling code, which must stay untouched.

**How to apply:**
- The proxy only forwards **GET/HEAD** requests; every mutating verb is rejected with 403 before reaching the backend. This is the safety boundary when the frontend must never be able to trigger real sends/auth/account mutations from a dev preview surface.
- Forward original request headers (minus hop-by-hop ones: host/connection/content-length/transfer-encoding) and pass response headers through similarly, so auth/session-dependent GETs behave like the original Next.js API-route proxies.
- Frontend calls the proxy via `/api/<segment>/...` — matches the `api-server` artifact's fixed `previewPath = "/api"`, so `apiUrl(path)` can just be `` `/api${path}` `` with no BASE_URL prefixing needed (it's a top-level route, not nested under the web artifact's own base path).
