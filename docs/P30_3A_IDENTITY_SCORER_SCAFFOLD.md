# P30.3a — NOVIKOVA Identity Scorer Scaffold (SCORER-ONLY)

Status: **P30.3a SCORER SCAFFOLD READY**
Date: 2026-07-03 · Predecessor: P30.3 plan (`f3c72d4`)

> Scorer-only phase. **No image generation**, no Grok, no paid providers, no model-weight
> downloads. Runtime store and approved asset inspected **read-only**.

## What was built
- `scripts/identity/score_novikova_identity.py` — local ArcFace (InsightFace) identity scorer.
  - Resolves the 3 registered refs (`ref_front` / `ref_34` / `ref_alt`).
  - Locates approved asset `asset_idrun_mr4t3mtd` in the runtime store (searches repo-root
    **and** `apps/web/` `.avatar-studio-data.json`), read-only.
  - Resolves a local target image (explicit path → asset local field → clean render →
    optional `--allow-screenshot`); clean asset is remote-only on `assets.grok.com`.
  - Detects/crops the largest face, computes embeddings, cosine vs each ref + centroid.
  - Emits a JSON report (`.local/identity-scores/<assetId>_<ts>.json`).
  - If `insightface` is absent → exits cleanly with `MISSING_DEPENDENCIES` + exact install plan.

## Scaffold dry-run result (this run)
- `refCount`: **3** (all refs found).
- `assetStatusInStore`: **ok** · `assetStatusField`: **approved** (read-only, unchanged).
- `onnxProviders`: **TensorRT / CUDA / CPU** already available (onnxruntime-gpu present).
- `depsMissing`: **`insightface`** → `deps_status = MISSING_DEPENDENCIES`, `result = pending`.
- `targetImage`: **none local** — clean P30.2b output lives at `assets.grok.com` (download needs approval).
- Sample report: `.local/identity-scores/asset_idrun_mr4t3mtd_<ts>.json` (gitignored runtime).

## Scoring gate (as implemented)
- Metric: InsightFace `antelopev2` ArcFace cosine. **Cosine ≠ naive %.**
- Calibration (logistic): `k=11`, `c0=0.40` → cos 0.40≈0.50, 0.60≈0.90, 0.70≈0.96.
- Pass: `cos_centroid ≥ 0.60` **and** `cos_min ≥ 0.50`; else fail; `pending` if deps/target/face missing.

## RTX 5060 8GB assessment
- **Scorer (this phase):** trivial load — ArcFace/antelopev2 runs comfortably on 8GB (even CPU). ✅
- **Later generation (P30.3b):**
  - **SDXL + InstantID / PuLID:** feasible but **tight** on 8GB — requires `--lowvram`/med-vram,
    fp16, sequential CPU offload, ≤1024px, tiled VAE. Expect offloading / slower runs; OOM risk at high res.
  - **FLUX-PuLID:** needs ~24GB → **NOT feasible locally on 8GB.** Rule out FLUX on this GPU; use SDXL
    locally, or a hosted GPU for FLUX later.
  - **Blackwell note:** RTX 5060 is `sm_120`; needs recent CUDA 12.8+ / PyTorch cu128 wheels — older
    torch builds lack kernels for this GPU.

## License caveat (before any commercial use)
InsightFace pretrained packs (`buffalo_l`, `antelopev2`) and the ArcFace models are distributed for
**non-commercial research**. Using them to gate a **commercial** NOVIKOVA/EPIC avatar requires a
licensed alternative embedder or explicit permission. Flag for legal review before commercial deployment.
The scorer scaffold itself is license-neutral; the gate can swap embedders behind the same interface.

## Non-destructive / safety
- No generation, no Grok, no paid provider, no weight download.
- Approved `asset_idrun_mr4t3mtd` untouched (read-only). P30.1/P30.2 runtime intact.
- New files are additive: `scripts/identity/score_novikova_identity.py`, this doc.
  Score reports under `.local/` are gitignored runtime.

## Next gate — P30.3b (requires explicit GO + download approval)
ComfyUI + PuLID/InstantID (SDXL, low-VRAM profile) local implementation:
1. Approve InsightFace model-pack download (one-time) so the scorer can actually embed.
2. Approve SDXL + PuLID/InstantID weight downloads.
3. First local identity-lock generation, auto-scored by this scaffold, across the 3-prompt reproducibility gate.

---
**P30.3a status: SCORER SCAFFOLD READY.**

## P30.3a.1 — Real Identity Score (2026-07-03) — PASS

Ran the scaffold for real against the 3 NOVIKOVA references and the approved P30.2b asset.

- **Dependency install:** `insightface 1.0.1` + `onnxruntime 1.27.0` installed (numpy/opencv already present).
- **Model-pack download:** `antelopev2` (~352 MB) downloaded to `~/.insightface/models/`. The release zip
  extracts one level too deep (`antelopev2/antelopev2/*.onnx`) → fixed by moving the 5 `.onnx` files up one level.
- **Target image source:** **local capture screenshot** `.local/avatar-renders/idrun_mr4t3mtd.result_view.png`
  (the pristine asset is remote-only on `assets.grok.com`; per environment web-fetch policy it was **not** pulled
  via curl/python, and the manifest's embedded base64 copy is truncated/unusable). Face detection found **exactly 1
  face** (bbox ~165×229, det 0.937) = the generated headshot; the composer ref thumbnails were not detected → no
  cross-contamination.
- **Scorer model:** `insightface/antelopev2` (ArcFace), CPU provider (see note).

| metric | value |
|---|---|
| cos_front | **0.6016** |
| cos_34 | **0.9420** |
| cos_alt | **0.5127** |
| cos_centroid | **0.8046** |
| cos_min | **0.5127** |
| calibratedScoreEstimate | **0.9885** |
| result | **pass** (centroid ≥ 0.60 AND min ≥ 0.50) |

- **JSON report:** `.local/identity-scores/asset_idrun_mr4t3mtd_20260703T110946Z.json` (gitignored runtime).

### Honest caveats
- **Wide per-reference spread:** `ref_34` cos 0.942 is unusually high (near-duplicate territory for ArcFace),
  while `ref_alt` is a modest 0.513. The centroid gate passes comfortably, but the identity match is uneven
  across references rather than uniformly strong.
- **Generous calibration:** the sigmoid maps cos_centroid 0.80 → 98.85%. The **raw cosine (0.80 centroid /
  0.51 min) is the honest figure**; do not over-read the 98.85%.
- **Target is a screenshot,** not the pristine remote asset — screenshot compression/scaling can only *lower*
  scores, so the true asset score is likely ≥ this. Re-scoring the pristine image is a future refinement.
- **onnxruntime note:** installing `insightface` pulled CPU `onnxruntime`, which now shadows `onnxruntime-gpu`
  (providers dropped to Azure/CPU). Scoring on CPU is fine. To restore CUDA for P30.3b: `pip uninstall onnxruntime -y`.
- **License:** InsightFace/antelopev2 remain non-commercial research — swap embedder before commercial use.

**Final status: P30.3a.1 REAL IDENTITY SCORE PASS** (cos_centroid 0.8046, cos_min 0.5127, calibrated 0.9885;
target = capture screenshot, uneven per-ref spread noted).


## P30.3a.2 — Pristine Rescore (2026-07-03) — FAIL (integrity finding)

Re-scored against a pristine local target (operator-saved from the operator-owned asset URL after browser
egress paths were exhausted).

- **Target image source:** operator-saved from `assets.grok.com/.../65903f57-.../content` (the URL recorded as
  `asset_idrun_mr4t3mtd.found`).
- **Target local path:** `apps/web/.local/identity-scores/targets/asset_idrun_mr4t3mtd.jpg` (177,152 bytes, 1280×720, readable).
- **Face detection count:** 1 (det 0.839).

| metric | value |
|---|---|
| cos_front | **1.0000** |
| cos_34 | 0.6004 |
| cos_alt | 0.6428 |
| cos_centroid | 0.8777 |
| cos_min | 0.6004 |
| calibratedScoreEstimate | 0.9948 |
| scorer verdict | pass (mechanically) |

- **JSON report:** `.local/identity-scores/asset_idrun_mr4t3mtd_20260703T112702Z.json`

### Integrity finding (why this is a FAIL, not a PASS)
`cos_front = 1.0000` is a self-comparison signature. Direct byte check confirms it:

```
tgt  177152 bytes  sha256[:16] e66a315e19c8ad37
ref_front 177152 bytes  sha256[:16] e66a315e19c8ad37
PIXEL_MSE 0.0
```

The "pristine asset" is **byte-identical to `ref_front.jpg`**. Therefore the asset content served at the
recorded `found` URL (`65903f57`) is a **reference echo — one of the uploaded reference images — not the
generated headshot.** The score is ref-vs-ref and says nothing about the generated output's likeness.

**Consequence for P30.2b:** the embedded capture that produced `asset_idrun_mr4t3mtd` latched onto a
reference-image URL, not the generation. The genuine generated business-headshot exists only in the capture
**screenshot** (`idrun_mr4t3mtd.result_view.png`), which is what P30.3a.1 actually scored
(cos_centroid 0.8046 — a *distinct* image, cos_front 0.60 / cos_34 0.94).

- The manifest listed a **second** operator-owned candidate `assets.grok.com/.../296662cf-.../content` — a
  likely candidate for the *true* generated image. Verifying/registering it is a future step (browser egress
  is currently CSP-blocked; not done here).
- **No approved asset was modified** (forbidden this phase); the concern is recorded for follow-up.

**Final status: P30.3a.2 PRISTINE RESCORE FAIL** (supplied pristine target is byte-identical to ref_front;
`cos_front=1.0` is a self-comparison, not a valid generated-image likeness. Best real generated-image score
remains P30.3a.1 screenshot: cos_centroid 0.8046.)

## P30.2b/P30.3a Integrity Repair (2026-07-03) — TRUE ASSET NOT YET RECOVERED; asset demoted

Attempted to recover the true generated image from the existing P30.2b run.

- **Candidates in manifest:** `assets.grok.com/.../65903f57` (= ref echo, confirmed), `assets.grok.com/.../296662cf`,
  and public `imagine-public.x.ai/.../21d8b635-...png`.
- **Identified true generated image:** **`21d8b635`** renders at **402×536** (portrait), a resolution distinct
  from every reference (ref_front 1280×720, ref_34 912×1136, ref_alt 1536×1024) — consistent with the Grok Imagine
  headshot aspect. High-confidence this is the real generation.
- **Retrieval blocked:** every automated egress path from the browser failed — page CSP blocks `fetch` (even
  same-origin), Chrome Private-Network-Access blocks POST/`sendBeacon` to `127.0.0.1`, programmatic `<a download>`
  does not persist, and the browser tool blocks base64 return. Per policy no curl/python URL fetch was used.
  Bytes could not be scored this turn.
- **Runtime action (integrity):** `asset_idrun_mr4t3mtd` **demoted** `approved → needs_repair`,
  `qualityStatus = failed_integrity`, with history: `previousUrlWasReferenceEcho=true`,
  `refEchoMatch=ref_front.jpg (byte-identical)`, `repairCandidates=[296662cf, 21d8b635 402×536]`,
  `repairReason=P30.3a.2 integrity failure`. Non-destructive (assets 4, identitySources 4, refs untouched;
  approved count now 0).
- **Best valid score** remains **P30.3a.1 screenshot** (cos_centroid 0.8046) until the true image is scored.

**Recovery is one step away:** operator saves the already-open `21d8b635` image (tab is on it) to
`apps/web/.local/identity-scores/targets/asset_idrun_mr4t3mtd_true_generated.jpg`; then rescore + re-promote if it
passes integrity (not byte-identical to any ref) + scorer gate.

**Final status: P30.2b CAPTURE INTEGRITY BLOCKED / TRUE GENERATED ASSET NOT RECOVERED** (asset demoted to needs_repair; true candidate 21d8b635 identified but not retrievable via automation).

## P30.2b Integrity Repair — candidate 21d8b635 RETRIEVED & REJECTED (2026-07-03)

Operator manually saved candidate `21d8b635` (via authenticated Chrome). Retrieved and checked:

- **Local target:** `apps/web/.local/identity-scores/targets/asset_idrun_mr4t3mtd_true_generated.jpg`
  (177/295 KB, 402×536, readable) — now renamed `…​true_generated.REJECTED_starfield_0faces.jpg`.
- **Integrity vs refs:** distinct — sha ≠ any ref; pixel MSE 13609 / 16246 / 3955 (ref_front / ref_34 / ref_alt). Not a reference echo. ✓
- **Face detection:** **0 faces.** Visual inspection: the image is a **starfield / nebula (cosmic dust)** — **not a NOVIKOVA headshot at all.** `21d8b635` is an unrelated operator-owned Grok asset the capture also swept up.
- **Verdict:** **REJECTED** (face count 0 ≠ 1). Scorer report: `.local/identity-scores/asset_idrun_mr4t3mtd_20260703T114839Z.json` (all cosines null, result pending — face not detected).
- **Asset:** remains `needs_repair` / `failed_integrity`. Candidate list updated: `21d8b635` REJECTED; **`296662cf` (assets.grok.com) is the last untested candidate.**
- Best valid generated-image score remains **P30.3a.1 screenshot** (cos_centroid 0.8046).

**Finding:** the P30.2b embedded capture swept multiple operator-owned asset URLs, of which two are now known to be NOT the generation (`65903f57` = ref_front echo; `21d8b635` = starfield). The genuine NOVIKOVA business-headshot is confirmed present only in `idrun_mr4t3mtd.result_view.png`. Retrieving `296662cf` (or re-capturing the true asset) is the remaining path.

**Final status: P30.2b TRUE GENERATED RESCORE FAIL** (candidate 21d8b635 is a starfield, 0 faces — not the headshot; asset stays needs_repair; 296662cf untested).

## P30.2b Integrity Repair — candidate 296662cf REJECTED; all candidates exhausted (2026-07-03)

Operator saved candidate `296662cf` (912×1136). Checked:

- **Local target:** `apps/web/.local/identity-scores/targets/asset_idrun_mr4t3mtd_true_generated.jpg`
  (255,385 B, 1136×912, readable; 1 face det 0.896) — renamed `…​true_generated.REJECTED_ref34_echo.jpg`.
- **Integrity vs refs:** **byte-identical to `ref_34.jpg`** — sha256[:16] `05937fb0ec8d3fa2` == ref_34, **pixel MSE 0.0**.
  (vs ref_front MSE 10852, vs ref_alt MSE 14143.)
- **Verdict:** **REJECTED** (rule: byte-identical to a reference). It looks like a business headshot with 1 face only
  because `ref_34` is itself a NOVIKOVA business-style reference photo. Not scored (would be ref_34-vs-itself, cos=1.0).

### Conclusion — capture integrity failure confirmed
All three fetchable operator-owned capture candidates are exhausted and **none is the generated image**:
| candidate | verdict |
|---|---|
| `65903f57` | ref_front echo (byte-identical) — REJECTED |
| `21d8b635` | starfield/nebula, 0 faces — REJECTED |
| `296662cf` | ref_34 echo (byte-identical) — REJECTED |

The P30.2b embedded capture swept the uploaded references + an unrelated cosmic asset and **never recorded the
true generated asset URL**. The genuine NOVIKOVA business-headshot exists only in `idrun_mr4t3mtd.result_view.png`
(P30.3a.1: cos_centroid 0.8046, cos_34 0.94 — distinct from ref_34, i.e. a real separate image, not an echo).

- `asset_idrun_mr4t3mtd` remains **`needs_repair` / `failed_integrity`** (approved count 0). Non-destructive.
- **Real repair options:** (a) P30.2b **capture-repair rerun** (new generation — separate GO), or (b) proceed to
  **P30.3b** local deterministic pipeline (ComfyUI + PuLID/InstantID), which avoids capture ambiguity by design.
- Best valid generated-image score remains **P30.3a.1 screenshot** (cos_centroid 0.8046).

**Final status: P30.2b TRUE GENERATED RESCORE FAIL** (296662cf = ref_34 echo; all capture candidates exhausted; asset stays needs_repair).