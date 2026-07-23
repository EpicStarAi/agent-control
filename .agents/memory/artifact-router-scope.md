---
name: artifact-router-scope
description: Why a legacy/non-artifact dev server (correct bind, correct port) still shows "couldn't reach this app" in Replit Preview.
---

In this repl (pnpm workspace + artifacts system), the shared reverse proxy on port 80 —
bound to the domain shown in Preview / `$REPLIT_DEV_DOMAIN` — routes traffic **only** by
consulting each registered artifact's `artifacts/<slug>/.replit-artifact/artifact.toml`
`[[services]] paths = [...]` entries. It has no fallback route to arbitrary ports.

A workflow defined directly in `.replit` (not backed by an `artifact.toml`) that binds
`0.0.0.0:<port>` and answers curl locally (`curl localhost:<port>`) is still **invisible**
to the browser-facing Preview/domain, because the proxy never learned about that port.
Adding a `[[ports]]` mapping in `.replit` does not fix this either — port 80 is already
owned by the artifact router.

**Why:** the router config lives per-artifact; there is no root/global artifact.toml and
no callback to register a bare custom service. `createArtifact()` only supports a fixed
list of scaffolded types (expo, openscad, react-vite, slides, video-js) — none of which
fit "wrap an existing hand-rolled Next.js/Node app" without scaffolding conflicting new
files over it. `verifyAndReplaceArtifactToml` also refuses to create a new artifact.toml
from scratch (NOT_FOUND) — it only replaces an existing one.

**How to apply:** if a legacy/standalone service (outside `artifacts/`) needs to be
reachable through the normal Preview pane, there is currently no supported non-invasive
path. Verify and hand off such services via direct port curl/logs instead of expecting
Preview to reach them, and say so explicitly rather than repeatedly restarting workflows
or tweaking `[[ports]]`. If the user insists on visual Preview access, the real fix is
migrating the service into the artifacts system (new artifact + its own toml), which is
a scope decision the user must approve, not a routing tweak.
