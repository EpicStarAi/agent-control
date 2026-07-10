---
name: EPICGRAM Next.js app is VPS-only, kept intentionally
description: apps/web (Next.js) was NOT retired despite Replit now using the react-vite artifact — user explicitly chose to keep it for external VPS deploys.
---

`epicgram/apps/web` (Next.js) and its `package.json` scripts (`dev`, `build`, `start`, `lint`, etc.) are kept intentionally — the user decided against retiring them.

**Why:** they remain the canonical deploy path for the external VPS production setup (epic-gram.com), which is separate from and unaffected by the Replit workspace's Preview pane (served by the `artifacts/epicgram-web` react-vite artifact).

**How to apply:** don't propose removing `apps/web`, its scripts, or the VPS docs (`epicgram/docs/*VPS*`, `epicgram/ops/*`) again as "dead code" — they're live for a different deploy target. Docs (`README.md`, `docs/RUNBOOK.md`, `docs/EPIC_GRAM_VPS_P2_REAL_DEPLOY_PLAN.md`) now carry explicit notes clarifying this split; keep that pattern if adding more VPS-facing docs.
