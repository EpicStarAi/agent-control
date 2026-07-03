# P30.3b.0 — Local Identity-Lock Implementation Prep (PREP ONLY)

Status: **P30.3b.0 LOCAL IDENTITY LOCK PREP READY**
Date: 2026-07-03 · Predecessors: P30.3 plan (`f3c72d4`), scorer scaffold (`dd0a8cb`), integrity repair (`b4b0063`)

> No image generation, no Grok, no Generate click, no paid providers, no large weight downloads in this phase.
> P30.1 untouched; P30.2 assets read-only.

## 1. Why we moved off Grok capture
P30.2b browser-capture integrity **failed**: the embedded capture swept the uploaded references + an unrelated
asset and never recorded the true generated URL. All three fetchable candidates were rejected —
`65903f57` = ref_front echo, `21d8b635` = starfield (0 faces), `296662cf` = ref_34 echo (byte-identical, MSE 0.0).
`asset_idrun_mr4t3mtd` stays `needs_repair`. Best valid score remains the screenshot (P30.3a.1 cos_centroid 0.8046).
A local deterministic pipeline **writes the asset straight to disk** — no browser capture, so this
reference-vs-result confusion is impossible by construction. Another paid Grok rerun is therefore postponed.

## 2. Environment audit (measured this phase)
`scripts/identity/check_identity_env.py` output:

| item | value |
|---|---|
| GPU | NVIDIA GeForce RTX 5060, **8151 MiB**, driver 576.88 |
| Python | 3.13.13 (Windows 11) |
| torch | **2.11.0+cu128** — `cuda.is_available()=True`, cuda 12.8, device RTX 5060 ✅ |
| torchvision | 0.26.0+cu128 ✅ |
| xformers | NOT installed (optional) |
| onnxruntime (CPU) | 1.27.0 **installed** |
| onnxruntime-gpu | 1.24.4 **installed** |
| onnx providers (effective) | Azure, CPU — **CPU build shadows GPU** |
| insightface | 1.0.1 — scorer **OK** (antelopev2 loads) |
| diffusers / transformers / accelerate | NOT installed |
| opencv / numpy | 4.13.0 / 2.2.1 |

**Headline:** the hard part is already solved — PyTorch is a **cu128 Blackwell-ready build** and sees the GPU. The
SDXL stack can run on CUDA today. Two gaps: (a) onnxruntime CPU/GPU shadow, (b) no diffusers/ComfyUI yet.

## 3. Scorer environment fix (proposed — NOT executed this phase)
The scorer currently **works** (CPU provider), so nothing is broken and nothing was changed. To restore CUDA for
onnxruntime (used by InsightFace / InstantID face analysis) in P30.3b.1, run and **test immediately after**:

```
pip uninstall onnxruntime -y            # remove the CPU build that shadows GPU (keep onnxruntime-gpu 1.24.4)
python scripts/identity/check_identity_env.py   # expect CUDAExecutionProvider in onnx_providers, scorer OK
# if the scorer breaks: pip install onnxruntime-gpu==1.24.4 --force-reinstall   (or align to a cu12.8-matched build)
```

Rule honored: not touched now because the scorer is functional; CUDA-for-onnx is an optimization, not a blocker
(ArcFace scoring on CPU is fast enough for single images).

## 4. Recommended low-VRAM workflow (RTX 5060 / 8 GB)
Runtime: **ComfyUI** (best low-VRAM offload: `--lowvram`, tiled VAE, fp16). Run it against a **cu128 torch** env
(reuse the working system torch, or a venv with torch cu128 pinned) — do **not** let a portable build pull a
non-Blackwell torch (cu121 wheels lack `sm_120` kernels for the RTX 5060).

| tier | method | base | refs | 8 GB verdict | notes |
|---|---|---|---|---|---|
| **primary** | **PuLID-SDXL** | SDXL | 1–n | feasible w/ lowvram | best identity + prompt-editability balance; most natural faces |
| **fallback** | **InstantID (SDXL)** | SDXL | 1 | feasible w/ lowvram | most turnkey/stable node; very strong lock, pose can stick |
| lightweight | IP-Adapter FaceID PlusV2 (SDXL) | SDXL | 1–n | safest on 8 GB | lightest; lower fidelity, good as a stack component |
| multi-ref | PhotoMaker v2 (SDXL) | SDXL | **3** | feasible | consumes our 3 refs natively; style-flexible, moderate fidelity |
| **REJECTED** | **FLUX-PuLID** | FLUX | — | **NOT feasible on 8 GB** (~24 GB) | explicitly out locally |

Realism checkpoint: **RealVisXL V5.0** or **Juggernaut-XL** (fp16). Generate at ≤1024px with tiled VAE on 8 GB.
Recommendation: **PuLID-SDXL primary**; if its node stack is fiddly on this box, fall back to **InstantID** (more
turnkey) without losing the phase.

## 5. Dependency plan (installs — require approval, deferred to P30.3b.1)
- ComfyUI (git clone) + ComfyUI-Manager; run on cu128 torch.
- Custom nodes: `ComfyUI_InstantID`, PuLID-SDXL node (`cubiq/PuLID_ComfyUI`), `ComfyUI_IPAdapter_plus`,
  optional `ComfyUI-PhotoMaker`.
- Python: `facexlib`, keep `insightface`, restore `onnxruntime-gpu`. (diffusers/transformers/accelerate only if we
  script outside ComfyUI.) xformers optional — ComfyUI `--use-pytorch-cross-attention` works without it.

## 6. Model weights (downloads — require approval, deferred)
| weight | ~size |
|---|---|
| SDXL realism checkpoint (RealVisXL V5 / Juggernaut-XL) | ~6.5–7 GB |
| InstantID: IdentityNet ControlNet + ip-adapter | ~2.5 GB + ~1.7 GB |
| PuLID-SDXL weights + EVA-CLIP | ~1.1 GB + ~4 GB |
| IP-Adapter FaceID PlusV2 (SDXL) + image encoder | ~1–2 GB |
| antelopev2 face pack | already present |
| **est. total (SDXL + PuLID + scorer)** | **~15–20 GB** (disk free on box ≫ 1 TB) |

## 7. License caveats
InsightFace `antelopev2` / ArcFace and several identity nodes ship for **non-commercial research**. InstantID
(Apache-2.0 code; models vary), PuLID, PhotoMaker each carry their own terms; SDXL checkpoints (RealVisXL/Juggernaut)
have their own licenses. **Legal review required before any commercial NOVIKOVA/EPIC deployment** — swap to a
commercially-licensed embedder/checkpoint if needed. Prototype use is research-scope.

## 8. Acceptance criteria — first local run (P30.3b.2)
- **Local only**, asset written directly to disk (no browser capture) → integrity by construction.
- **Deterministic:** fixed seed + pinned weights/nodes → reproducible output.
- **Automated gate:** ArcFace (existing scorer) `cos_centroid ≥ 0.60` AND `cos_min ≥ 0.50` (calibrated ≥90%)
  vs refs #2/#3/#4; raw cosine always reported.
- **Manual gate:** photoreal business headshot, NOVIKOVA identity, no cartoon/3D/CGI, no artifacts.
- **Reproducibility:** identity holds across **3 distinct prompts**, each passing the automated gate.

## 9. Phase ledger
No generation, no Grok, no paid providers, no weight downloads this phase. onnxruntime NOT modified (scorer left
working). P30.1 untouched; P30.2 assets read-only (`asset_idrun_mr4t3mtd` stays `needs_repair`). New files additive:
`scripts/identity/check_identity_env.py`, this doc.

---
**Final status: P30.3b.0 LOCAL IDENTITY LOCK PREP READY**
Next (P30.3b.1, requires GO + install/download approval): restore CUDA onnxruntime, install ComfyUI + PuLID/InstantID
nodes, download SDXL + PuLID/InstantID weights. Then P30.3b.2: first local identity-lock run under the gate above.