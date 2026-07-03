#!/usr/bin/env python3
"""
P30.3b.0 — local identity-lock environment audit (REPORT ONLY).
No downloads of model weights. No image generation. No Grok. No paid providers.
Reports CUDA / torch / torchvision / xformers / onnxruntime(-gpu) / insightface / diffusers status.
"""
import json, importlib, importlib.metadata as md, subprocess, sys, platform

def ver(mod):
    try:
        m = importlib.import_module(mod)
        return getattr(m, "__version__", "unknown")
    except Exception as e:
        return f"NOT_INSTALLED ({type(e).__name__})"

def dist(name):
    try:
        return md.version(name)
    except Exception:
        return "NOT_INSTALLED"

report = {"phase": "P30.3b.0", "mode": "env-audit (no downloads, no generation)",
          "python": sys.version.split()[0], "platform": platform.platform()}

# nvidia-smi
try:
    out = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version",
                          "--format=csv,noheader"], capture_output=True, text=True, timeout=15)
    report["nvidia_smi"] = out.stdout.strip() or out.stderr.strip()
except Exception as e:
    report["nvidia_smi"] = f"unavailable ({e})"

# core packages
report["packages"] = {
    "torch": ver("torch"),
    "torchvision": ver("torchvision"),
    "xformers": ver("xformers"),
    "onnxruntime(dist)": dist("onnxruntime"),
    "onnxruntime-gpu(dist)": dist("onnxruntime-gpu"),
    "insightface": ver("insightface"),
    "diffusers": ver("diffusers"),
    "transformers": ver("transformers"),
    "accelerate": ver("accelerate"),
    "opencv(cv2)": ver("cv2"),
    "numpy": ver("numpy"),
}

# torch CUDA detail
try:
    import torch
    report["torch_cuda"] = {
        "is_available": bool(torch.cuda.is_available()),
        "cuda_version": getattr(torch.version, "cuda", None),
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }
except Exception as e:
    report["torch_cuda"] = f"torch not usable ({type(e).__name__})"

# onnxruntime providers
try:
    import onnxruntime as ort
    report["onnx_providers"] = ort.get_available_providers()
except Exception as e:
    report["onnx_providers"] = f"onnxruntime not usable ({type(e).__name__})"

# insightface functional check (uses already-downloaded antelopev2; no new download)
try:
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name="antelopev2", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(320, 320))
    report["insightface_scorer"] = "OK (antelopev2 loads on CPU)"
except Exception as e:
    report["insightface_scorer"] = f"FAIL ({type(e).__name__}: {e})"

print(json.dumps(report, indent=2))
