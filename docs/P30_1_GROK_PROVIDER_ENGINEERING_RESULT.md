# P30.1 — Grok Provider Engineering Result (CLOSED)

_Date: 2026-07-03 · Provider: `grok_imagine_browser` · Mode: `attach_default` (CDP → operator real Chrome)_

## Verdict
**P30.1 Engineering: CLOSED (strong PARTIAL PASS).**
Acceptance is not fully closed only because of the identity-likeness gate, which is
tracked separately as P30.2 (NOVIKOVA Identity Reference / Seed Consistency).

## Proven
- **CDP attach to the real Chrome — PROVEN.** The adapter connects via
  `playwright.chromium.connectOverCDP(EPIC_GROK_CDP_URL)` to the operator's own logged-in
  Chrome (dedicated profile `C:\GrokCDP`, `--remote-debugging-port=9222`). `grok.com/imagine`
  loads with **no Cloudflare block** — the earlier block only affected a fresh
  Playwright-launched Chromium (`automation_profile`). No anti-bot / CAPTCHA bypass is used.
- **Prompt-fidelity — PASS.** Input is cleared, `job.prompt` is inserted, the entered text is
  read back and hashed (`extracted_prompt_hash want==got`, match=true). On mismatch the adapter
  returns `PROMPT_FIDELITY_MISMATCH` and refuses to generate (no wasted paid run).
- **Paid-run control — PASS.** Exactly one controlled run is possible; `EPIC_GROK_BROWSER_DRY_RUN`
  gates any submission; generation is never auto-triggered.

## First paid run
- The single controlled paid run **proved the prompt + generate path** (prompt entered,
  Generate clicked, generation started — loading tiles visible in `after_generate` debug shot).
- It ended in **`GENERATION_TIMEOUT` on capture**: the old result selector only matched a new
  `img[src^="http"]` in the Discover grid, which never appeared — Grok renders the operator's
  result as `data:`/`blob:`/`assets.grok.com/users/*` and in a separate generation view.

## Rescue capture (no new generation)
- A CDP-attach rescue extracted the already-generated asset from the live `C:\GrokCDP` Chrome
  **without any new paid run**.
- Captured a real **NOVIKOVA passport-headshot** grid (10 frames, `data:` URIs) plus the stable
  operator-owned URL
  `https://assets.grok.com/users/4a26ab94-.../generated/b79d28ab-.../preview_image.jpg`.
- Discover/public content (`imagine-public.x.ai/share-videos/*`) was excluded.

## Capture embedded into the adapter
`apps/web/lib/renderProviders/grokImagineBrowser.ts`:
- baseline media snapshot **before** Generate;
- after Generate, `collectMedia()` gathers `img[src]/currentSrc`, `data:image/*`, `blob:`,
  `http`, `video[src]/[poster]`, `source[src]`, computed `background-image`, `canvas.toDataURL`;
- excludes Discover (`imagine-public.x.ai/share-videos/*`) and baseline items;
- accepts only operator-owned new assets (`data:image/`, `blob:`, `assets.grok.com/users/`);
- writes `*.manifest.json` of candidates to `.local/avatar-renders/` (URLs truncated);
- result timeout raised to **300s** via `EPIC_GROK_RESULT_TIMEOUT_MS=300000`.

## Registration
- `asset_grokcap_mr4n5grl` added to workspace **`ws_p294_mr3hy0t8`** (NOVIKOVA · U / S1 / E3)
  in the fs-fallback store as **`status: pending_review`** (`providerId=grok_imagine_browser`).
  Non-destructive append (2 → 3 assets); existing data untouched.

## Quality Gate (passport headshot)
| Criterion | Result |
|---|---|
| Photorealism | PASS |
| Wardrobe (business blazer) | PASS |
| Background (gray seamless) | PASS |
| Framing (head-and-shoulders, ~4:5) | PASS |
| No cartoon / 3D / CGI (negatives) | PASS |
| Usable as Identity Passport (format) | PASS |
| **Identity likeness to NOVIKOVA** | **PENDING** — no reference uploaded; `>=85%` not verifiable |

## Safety
- **No secrets printed** — cookies/keys/headers never logged.
- **No additional paid run after rescue** — capture, registration and verification were all
  read-only / dry (`browserCheck` + DRY attach), zero further generations.

## Status board
```
Provider path      PROVEN
Prompt fidelity    PROVEN
Paid run control   PROVEN
Asset capture      EMBEDDED in adapter (+ rescue proven)
Asset registered   pending_review in ws_p294
Quality Gate       format PASS
Build / check      green
Identity likeness  PENDING -> P30.2
```

## Next gate
**P30.2 — NOVIKOVA Identity Reference Upload / Seed Consistency.**
Not started; requires 1–3 real NOVIKOVA reference images, then identity-source binding.
Generation only on explicit go.
