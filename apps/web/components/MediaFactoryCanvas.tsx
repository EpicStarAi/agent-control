"use client";

// MEDIA FACTORY CANVAS v1 — Grok/PaperDraw-style infinite preview canvas for DEEPINSIDE.LIFE media factory.
// PREVIEW_ONLY · LOCAL_STORAGE_ONLY. No runtime, no network, no API/OAuth/webhook, no publishing, no automation.
// UI + localStorage + preview/export ONLY. Additive.

import { useEffect, useMemo, useRef, useState } from "react";

const LS = "deepinside.mediaFactory.canvas.v1";

type NType = "character" | "avatar" | "image" | "video" | "voice" | "music" | "stream" | "review" | "render" | "monet";
type Node = { id: string; type: NType; title: string; x: number; y: number; fields: Record<string, any> };
type Edge = { from: string; to: string };

const TYPE_META: Record<NType, { label: string; color: string; icon: string }> = {
  character: { label: "Character", color: "#a78bfa", icon: "🎭" },
  avatar: { label: "Avatar Tool", color: "#f472b6", icon: "🧑‍🎤" },
  image: { label: "Image Tool", color: "#38bdf8", icon: "🖼" },
  video: { label: "Video Tool", color: "#60a5fa", icon: "🎬" },
  voice: { label: "Voice Tool", color: "#34d399", icon: "🎙" },
  music: { label: "Music Tool", color: "#fbbf24", icon: "🎵" },
  stream: { label: "Stream", color: "#fb7185", icon: "📡" },
  review: { label: "Review Gate", color: "#f87171", icon: "🛡" },
  render: { label: "Render Queue", color: "#c084fc", icon: "🧩" },
  monet: { label: "Monetization", color: "#4ade80", icon: "💰" },
};

const SAFETY = {
  mode: "PREVIEW_ONLY", execution_allowed: false, network_calls: false, automation: false,
  runtime_enabled: false, external_platform_actions: false, tools_connected: false,
};

function demoNodes(): { nodes: Node[]; edges: Edge[] } {
  const n: Node[] = [];
  const add = (id: string, type: NType, title: string, x: number, y: number, fields: any) => n.push({ id, type, title, x, y, fields });
  // Chain 1: EVA → ComfyUI → FaceFusion → FFmpeg → Manual Review → TG/YT Preview
  add("eva", "character", "EVA NOVIKOVA", 60, 60, { characterId: "eva", role: "AI host / model", visualProfile: "neon-cyber portrait pack", voiceProfile: "ElevenLabs warm", platformTargets: ["Telegram", "YouTube", "TikTok"], contentStyle: "shorts, sketches", safetyStatus: "CONSENT_OK" });
  add("comfy", "image", "ComfyUI", 320, 40, { toolName: "ComfyUI", purpose: "image gen pipeline", modelType: "SDXL/Flux", localOrCloud: "local", runtimeStatus: "NOT_CONNECTED" });
  add("facefusion", "avatar", "FaceFusion", 580, 60, { toolName: "FaceFusion", purpose: "face swap / avatar", inputType: "image+video", outputType: "video", runtimeStatus: "NOT_CONNECTED", safetyStatus: "CONSENT_REQUIRED" });
  add("ffmpeg", "video", "FFmpeg", 840, 60, { toolName: "FFmpeg", purpose: "encode/compose", renderType: "cpu/gpu", runtimeStatus: "NOT_CONNECTED" });
  add("rev1", "review", "Manual Review", 1100, 60, { gateName: "Manual Approval", required: true, status: "PENDING" });
  add("prev1", "stream", "Telegram/YouTube Preview", 1360, 60, { streamTarget: "TG/YT preview", status: "PLANNED", requiresManualApproval: true });
  // Chain 2: BUCH → Voice Lab → Music Lab → Radio → Stream Review → RTMP Preview
  add("buch", "character", "BUCH", 60, 280, { characterId: "buch", role: "AI host (male)", visualProfile: "skull-neon", voiceProfile: "RVC clone", platformTargets: ["Telegram", "Radio"], contentStyle: "talk, music", safetyStatus: "CONSENT_OK" });
  add("voicelab", "voice", "Voice Lab (ElevenLabs/RVC)", 320, 260, { toolName: "ElevenLabs / RVC", purpose: "voice synth/clone", consentRequired: true, runtimeStatus: "NOT_CONNECTED" });
  add("musiclab", "music", "Music Lab (Suno/Udio)", 580, 280, { toolName: "Suno / Udio", purpose: "track gen", copyrightRisk: "HIGH", allowedMode: "ORIGINAL_OR_LICENSED_ONLY" });
  add("radio", "stream", "Deepinside Radio", 840, 280, { streamTarget: "Deepinside Radio", status: "PLANNED", requiresManualApproval: true });
  add("rev2", "review", "Stream Review", 1100, 280, { gateName: "Platform Policy Review", required: true, status: "PENDING" });
  add("rtmp", "stream", "RTMP Preview", 1360, 280, { streamTarget: "RTMP Output", status: "PLANNED", requiresManualApproval: true });
  // Chain 3: BUCHIHA → Script Gen → Video Lab → Render Queue → Policy Review → Monetization Locked
  add("buchiha", "character", "BUCHIHA", 60, 500, { characterId: "buchiha", role: "AI host (female)", visualProfile: "angel-neon", voiceProfile: "XTTS", platformTargets: ["TikTok", "Instagram", "YouTube"], contentStyle: "sketches, vlogs", safetyStatus: "CONSENT_OK" });
  add("script", "image", "Script Generator", 320, 480, { toolName: "LLM Script Gen", purpose: "scenario/script", modelType: "router", localOrCloud: "cloud", runtimeStatus: "NOT_CONNECTED" });
  add("videolab", "video", "Video Lab (Kling/Veo/LTX)", 580, 500, { toolName: "Kling / Veo / LTX", purpose: "text2video", renderType: "cloud", runtimeStatus: "NOT_CONNECTED" });
  add("render", "render", "Render Queue", 840, 500, { queueId: "RQ-001", taskType: "video render", priority: "normal", status: "DRAFT", estimatedCost: "$0 (preview)", manualApprovalRequired: true });
  add("rev3", "review", "Platform Policy Review", 1100, 500, { gateName: "Platform Policy Review", required: true, status: "PENDING" });
  add("monet", "monet", "Monetization (Locked)", 1360, 500, { thresholdRequired: "1k subs / policy", platform: "YouTube/TikTok/Telegram Stars", status: "LOCKED_UNTIL_THRESHOLD" });
  const e: Edge[] = [
    ["eva", "comfy"], ["comfy", "facefusion"], ["facefusion", "ffmpeg"], ["ffmpeg", "rev1"], ["rev1", "prev1"],
    ["buch", "voicelab"], ["voicelab", "musiclab"], ["musiclab", "radio"], ["radio", "rev2"], ["rev2", "rtmp"],
    ["buchiha", "script"], ["script", "videolab"], ["videolab", "render"], ["render", "rev3"], ["rev3", "monet"],
  ].map(([from, to]) => ({ from, to }));
  return { nodes: n, edges: e };
}

function loadState(): { nodes: Node[]; edges: Edge[]; selectedNodeId: string | null } {
  try { const s = JSON.parse(localStorage.getItem(LS) || "null"); if (s?.nodes?.length) return { nodes: s.nodes, edges: s.edges || [], selectedNodeId: s.selectedNodeId ?? null }; } catch {}
  const d = demoNodes(); return { ...d, selectedNodeId: null };
}
function saveState(nodes: Node[], edges: Edge[], selectedNodeId: string | null) {
  try { localStorage.setItem(LS, JSON.stringify({ ...SAFETY, nodes, edges, selectedNodeId, updatedAt: new Date().toISOString() })); } catch {}
}

export function MediaFactoryCanvas({ onClose }: { onClose: () => void }) {
  const init = useMemo(loadState, []);
  const [nodes, setNodes] = useState<Node[]>(init.nodes);
  const [edges] = useState<Edge[]>(init.edges);
  const [sel, setSel] = useState<string | null>(init.selectedNodeId);
  const [view, setView] = useState({ x: 20, y: 20, k: 0.78 });
  const [full, setFull] = useState(false);
  const [toast, setToast] = useState("");
  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => { saveState(nodes, edges, sel); }, [nodes, edges, sel]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };

  useEffect(() => {
    const move = (ev: MouseEvent) => {
      if (drag.current) { const d = drag.current; setNodes((ns) => ns.map((n) => n.id === d.id ? { ...n, x: d.ox + (ev.clientX - d.sx) / view.k, y: d.oy + (ev.clientY - d.sy) / view.k } : n)); }
      else if (pan.current) { const p = pan.current; setView((v) => ({ ...v, x: p.ox + (ev.clientX - p.sx), y: p.oy + (ev.clientY - p.sy) })); }
    };
    const up = () => { drag.current = null; pan.current = null; };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [view.k]);

  const byId = useMemo(() => { const m: Record<string, Node> = {}; nodes.forEach((n) => (m[n.id] = n)); return m; }, [nodes]);
  const counts = useMemo(() => ({
    characters: nodes.filter((n) => n.type === "character").length,
    tools: nodes.filter((n) => ["avatar", "image", "video", "voice", "music"].includes(n.type)).length,
    gates: nodes.filter((n) => n.type === "review").length,
  }), [nodes]);

  function toMarkdown() {
    const chars = nodes.filter((n) => n.type === "character");
    const tools = nodes.filter((n) => ["avatar", "image", "video", "voice", "music"].includes(n.type));
    const chains = edges.map((e) => `${byId[e.from]?.title} → ${byId[e.to]?.title}`);
    return [
      "# MEDIA FACTORY CANVAS v1 — DEEPINSIDE.LIFE", "",
      "**Mode:** PREVIEW_ONLY · **Storage:** LOCAL_STORAGE_ONLY", "",
      "## Персонажи", ...chars.map((c) => `- ${c.title} (${c.fields.role || ""}) → ${(c.fields.platformTargets || []).join(", ")}`), "",
      "## Инструменты", ...tools.map((t) => `- [${TYPE_META[t.type].label}] ${t.title} — ${t.fields.purpose || ""} (runtime: ${t.fields.runtimeStatus || "NOT_CONNECTED"})`), "",
      "## Цепочки производства", ...chains.map((c) => `- ${c}`), "",
      "## Safety Confirmation",
      "- Execution Allowed: false", "- Network Calls: false", "- Runtime Enabled: false", "- Automation: false",
      "- External Platform Actions: false", "- Credentials Required: false",
      "- Consent Required (Identity/Voice): true", "- Copyright Review (Music/Covers/Remixes): true", "",
      "## Future Activation Checklist (NOT active)",
      "- [ ] Получить явное consent на identity/voice инструменты",
      "- [ ] Пройти copyright review для музыки/каверов/ремиксов",
      "- [ ] Ручное ревью каждого выходного клипа",
      "- [ ] Подключить runtime через отдельный безопасный worker (вне этого preview)",
      "- [ ] Соблюсти policy платформ перед любой публикацией",
    ].join("\n");
  }
  function exportJSON() { return JSON.stringify({ name: "MEDIA_FACTORY_CANVAS_V1", ...SAFETY, nodes, edges, selectedNodeId: sel, updatedAt: new Date().toISOString() }, null, 2); }
  function download(name: string, content: string, type: string) { const b = new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); flash("Экспортировано: " + name); }
  function resetDemo() { const d = demoNodes(); setNodes(d.nodes); setSel(null); saveState(d.nodes, d.edges, null); flash("Демо сброшено"); }

  const s = byId[sel || ""];

  function NodeCard(n: Node) {
    const m = TYPE_META[n.type];
    return <div key={n.id} onMouseDown={(ev) => { ev.stopPropagation(); setSel(n.id); drag.current = { id: n.id, sx: ev.clientX, sy: ev.clientY, ox: n.x, oy: n.y }; }}
      className={`absolute w-[190px] cursor-grab select-none rounded-xl border bg-[#0d1018]/95 p-2.5 shadow-lg ${sel === n.id ? "border-white ring-2 ring-white/40" : "border-[rgba(255,255,255,.12)]"}`}
      style={{ left: n.x, top: n.y, borderTopColor: m.color, borderTopWidth: 3 }}>
      <div className="flex items-center gap-1.5"><span>{m.icon}</span><span className="truncate text-[13px] font-bold text-white">{n.title}</span></div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider" style={{ color: m.color }}>{m.label}</div>
      {(n.fields.runtimeStatus || n.fields.status) && <div className="mt-1 inline-block rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-red-300">{n.fields.runtimeStatus || n.fields.status}</div>}
      {n.fields.consentRequired || n.fields.safetyStatus === "CONSENT_REQUIRED" ? <div className="mt-1 ml-1 inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">CONSENT</div> : null}
      {n.fields.copyrightRisk === "HIGH" ? <div className="mt-1 ml-1 inline-block rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-fuchsia-300">COPYRIGHT</div> : null}
    </div>;
  }

  function Canvas() {
    const w = 1700, h = 760;
    return <div className="relative h-full w-full overflow-hidden bg-[#070a10]"
      style={{ backgroundImage: "radial-gradient(rgba(120,140,200,.08) 1px, transparent 1px)", backgroundSize: 26 * view.k + "px " + 26 * view.k + "px", backgroundPosition: view.x + "px " + view.y + "px" }}
      onMouseDown={(ev) => { pan.current = { sx: ev.clientX, sy: ev.clientY, ox: view.x, oy: view.y }; setSel(null); }}
      onWheel={(ev) => { setView((v) => ({ ...v, k: Math.min(2, Math.max(0.35, v.k - ev.deltaY * 0.0011)) })); }}>
      <div className="absolute origin-top-left" style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.k})`, width: w, height: h }}>
        <svg width={w} height={h} className="pointer-events-none absolute left-0 top-0">{edges.map((e, i) => { const a = byId[e.from], b = byId[e.to]; if (!a || !b) return null; const x1 = a.x + 190, y1 = a.y + 28, x2 = b.x, y2 = b.y + 28; const mx = (x1 + x2) / 2; return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="rgba(167,139,250,.4)" strokeWidth={2} />; })}</svg>
        {nodes.map((n) => NodeCard(n))}
      </div>
      <div className="absolute bottom-3 left-3 flex gap-1">{["+", "−", "⟳"].map((b) => <button key={b} onClick={() => setView((v) => b === "+" ? { ...v, k: Math.min(2, v.k + 0.15) } : b === "−" ? { ...v, k: Math.max(0.35, v.k - 0.15) } : { x: 20, y: 20, k: 0.78 })} className="h-7 w-7 rounded bg-[#11151f] text-white ring-1 ring-white/10">{b}</button>)}</div>
    </div>;
  }

  const safetyBar = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-tg-muted sm:grid-cols-3">
      {[["Mode", "PREVIEW_ONLY"], ["Execution Allowed", "false"], ["Network Calls", "false"], ["Runtime Enabled", "false"], ["Automation", "false"], ["External Platform Actions", "false"], ["Credentials Required", "false"], ["Consent (Identity/Voice)", "true"], ["Copyright Review (Music)", "true"]].map(([l, v]) => <div key={l}><span>{l}: </span><b className={v === "true" && (l.includes("Consent") || l.includes("Copyright")) ? "text-amber-300" : v === "false" ? "text-emerald-300" : "text-cyan-300"}>{v}</b></div>)}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[68] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🏭 МЕДИАЗАВОД · MEDIA FACTORY CANVAS v1</div>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">PREVIEW_ONLY</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">LOCAL_STORAGE_ONLY</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={() => { navigator.clipboard?.writeText(exportJSON()); flash("JSON скопирован"); }} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Copy JSON</button>
          <button onClick={() => download("media-factory-canvas-v1.json", exportJSON(), "application/json")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export JSON</button>
          <button onClick={() => download("media-factory-canvas-v1.md", toMarkdown(), "text/markdown")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export Markdown</button>
          <button onClick={resetDemo} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Reset Demo</button>
          <button onClick={() => setFull((f) => !f)} className="rounded-lg bg-tg-active px-2.5 py-1.5 text-xs font-semibold text-white">{full ? "Exit Fullscreen" : "Open Fullscreen Canvas"}</button>
        </div>
      </header>

      <div className="border-b border-tg-line bg-tg-panel/60 px-4 py-2">{safetyBar}</div>

      <div className={`grid min-h-0 flex-1 ${full ? "grid-cols-1" : "grid-cols-[1fr_320px]"}`}>
        <Canvas />
        {!full && <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3">
          <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Inspector</div>
          {!s ? <div className="text-sm text-tg-muted">Кликните ноду на полотне.</div> : <div className="space-y-2">
            <div className="flex items-center gap-2"><span className="text-lg">{TYPE_META[s.type].icon}</span><div><div className="font-bold">{s.title}</div><div className="text-[10px] uppercase" style={{ color: TYPE_META[s.type].color }}>{TYPE_META[s.type].label}</div></div></div>
            <div className="rounded-lg bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Описание:</b> {s.fields.purpose || s.fields.role || s.fields.gateName || s.fields.streamTarget || s.fields.taskType || s.fields.platform || "—"}</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">Входы</div><b>{s.fields.inputType || (edges.filter((e) => e.to === s.id).map((e) => byId[e.from]?.title).join(", ") || "—")}</b></div>
              <div className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">Выходы</div><b>{s.fields.outputType || (edges.filter((e) => e.from === s.id).map((e) => byId[e.to]?.title).join(", ") || "—")}</b></div>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[11px]"><b className="text-red-300">Safety flags:</b><div className="mt-0.5 flex flex-wrap gap-1">{["runtime: " + (s.fields.runtimeStatus || "NOT_CONNECTED"), s.fields.consentRequired || s.fields.safetyStatus === "CONSENT_REQUIRED" ? "CONSENT_REQUIRED" : null, s.fields.copyrightRisk === "HIGH" ? "COPYRIGHT_REVIEW" : null, s.fields.requiresManualApproval || s.fields.manualApprovalRequired ? "MANUAL_APPROVAL" : null, s.fields.status === "LOCKED_UNTIL_THRESHOLD" ? "LOCKED" : null].filter(Boolean).map((f) => <span key={f as string} className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-300">{f}</span>)}</div></div>
            <div className="rounded-lg bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Статус подключения:</b> <span className="text-emerald-300">NOT_CONNECTED (preview)</span></div>
            <div className="rounded-lg bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Для реального подключения (в будущем):</b> отдельный безопасный worker, явный consent, copyright/policy review, ручное ревью — вне этого preview-слоя.</div>
            <div><div className="mb-1 text-[10px] uppercase text-tg-muted">JSON preview</div><pre className="max-h-44 overflow-auto rounded-lg bg-black/50 p-2 text-[10px] text-emerald-200">{JSON.stringify(s, null, 2)}</pre></div>
          </div>}
        </aside>}
      </div>

      <footer className="border-t border-tg-line bg-tg-panel px-4 py-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-black uppercase tracking-wider text-tg-accent">Production Pipeline Summary:</span>
          {[["Characters", counts.characters], ["Tools", counts.tools], ["Review Gates", counts.gates], ["Runtime Connected", 0], ["External Calls", 0]].map(([l, v]) => <span key={l as string} className="rounded-full bg-tg-bg px-2.5 py-1">{l}: <b>{v}</b></span>)}
          <span className="rounded-full bg-tg-bg px-2.5 py-1">Automation: <b className="text-emerald-300">false</b></span>
          <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-bold text-red-300">Safety Mode: PREVIEW_ONLY</span>
        </div>
      </footer>

      {toast && <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}
