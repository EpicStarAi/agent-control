"use client";

// EPIC ARCHITECT — master infinite architecture editor for the whole DEEPINSIDE.LIFE ecosystem.
// Category: CORE · Status: ACTIVE. Additive, UI + localStorage only. No backend / TDLib / routes / external API.

import { useEffect, useMemo, useRef, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; exec: any[]; devices: any[]; slots: any[]; bind: Record<string, string>; counts: Record<string, any>; activeId: string };
type N = { id: string; type: string; layer: string; label: string; sub?: string; ref?: string; x: number; y: number };

const KL = "epic_architect_layout_v1", KV = "epic_architect_view_v1", KH = "epic_architect_history_v1", KS = "epic_architect_snapshot_v1";
const CLR: Record<string, string> = {
  agent: "#ff2d6b", session: "#e879f9", dialog: "#9ca3af", channel: "#3ea6ff", group: "#34d399", bot: "#f97316", contact: "#c084fc",
  mission: "#22c55e", task: "#38bdf8", media: "#fb7185", character: "#ff5db1", voice: "#e879f9", video: "#22d3ee", image: "#60a5fa",
  infra: "#14b8a6", service: "#f59e0b", ai: "#a78bfa", workflow: "#84cc16", publishing: "#22c55e", analytics: "#38bdf8", hub: "#ffffff",
};
const LAYERS = ["all", "agents", "telegram", "missions", "media", "infrastructure", "ai", "automation", "publishing", "analytics", "security"];
const PALETTE = ["Agent", "Telegram", "Mission", "Workflow", "Infrastructure", "AI Service", "Database", "Docker", "N8N", "Cloudflare", "VPS", "Character", "Voice", "Prompt", "Script", "Image", "Video", "Publishing", "Analytics", "Folder", "Group", "Comment", "Label"];
const INFRA = ["Cloudflare", "Contabo VPS", "Docker", "N8N", "PostgreSQL", "Redis", "TDLib", "OpenRouter", "Storage", "RunPod", "Domain", "SSL"];
const AISVC = ["ChatGPT", "Claude", "Gemini", "Grok", "Perplexity", "OpenRouter", "HuggingFace", "ElevenLabs", "ComfyUI", "DeepFace", "FaceFusion", "FFmpeg", "Whisper", "Codex"];
const PUB = ["TikTok", "Instagram", "YouTube", "Telegram", "Facebook", "X"];

export function EpicArchitect({ ctx, onClose, onOpenAgent }: { ctx: Ctx; onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [view, setView] = useState({ tx: 30, ty: 20, s: 0.6 });
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [sel, setSel] = useState("");
  const [layer, setLayer] = useState("all");
  const [exec, setExecView] = useState<"architect" | "executive">("architect");
  const [focus, setFocus] = useState("");
  const [path, setPath] = useState<string[]>([]);
  const [extra, setExtra] = useState<N[]>([]);
  const [palette, setPalette] = useState(false);
  const [pq, setPq] = useState("");
  const [hist, setHist] = useState<Record<string, { x: number; y: number }>[]>([]);
  const [redo, setRedo] = useState<Record<string, { x: number; y: number }>[]>([]);
  const drag = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number }>({ mode: null, sx: 0, sy: 0, ox: 0, oy: 0 });

  const mediaIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_media_ops_v1") || "null"); } catch { return null; } }, []);
  const tgIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_telegram_index_v1") || "null"); } catch { return null; } }, []);
  const devIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_device_center_v1") || "null"); } catch { return null; } }, []);

  // base nodes
  const base = useMemo(() => {
    const n: N[] = [];
    n.push({ id: "hub", type: "hub", layer: "infrastructure", label: "DEEPINSIDE.LIFE", sub: "platform", x: 40, y: 40 });
    ctx.agents.forEach((a, i) => n.push({ id: "ag_" + a.id, type: "agent", layer: "agents", label: a.name, sub: a.role, ref: a.id, x: 320, y: 40 + i * 90 }));
    ctx.slots.forEach((s, i) => n.push({ id: "se_" + (s.slotId || s.label), type: "session", layer: "telegram", label: (s.displayName || s.slotId || "session").slice(0, 14), sub: "session", ref: s.slotId, x: 600, y: 40 + i * 80 }));
    (tgIdx?.channels || []).slice(0, 6).forEach((c: any, i: number) => n.push({ id: "ch_" + c.id, type: "channel", layer: "telegram", label: (c.title || "channel").slice(0, 14), sub: "channel", x: 840, y: 40 + i * 70 }));
    (tgIdx?.groups || []).slice(0, 6).forEach((c: any, i: number) => n.push({ id: "gr_" + c.id, type: "group", layer: "telegram", label: (c.title || "group").slice(0, 14), sub: "group", x: 840, y: 480 + i * 70 }));
    (tgIdx?.dialogs || []).slice(0, 6).forEach((c: any, i: number) => n.push({ id: "dl_" + c.id, type: "dialog", layer: "telegram", label: (c.title || "dialog").slice(0, 14), sub: "dialog", x: 600, y: 480 + i * 70 }));
    ctx.missions.forEach((m, i) => n.push({ id: "mi_" + m.id, type: "mission", layer: "missions", label: m.title.slice(0, 16), sub: m.status, ref: m.id, x: 320, y: 700 + i * 80 }));
    const chars = mediaIdx?.characters || ctx.agents.slice(0, 3).map((a) => ({ id: a.id, name: a.name }));
    chars.forEach((c: any, i: number) => n.push({ id: "cha_" + c.id, type: "character", layer: "media", label: (c.name || "char").slice(0, 14), sub: "character", x: 1120, y: 40 + i * 80 }));
    (mediaIdx?.videos || ["clip_eva.mp4"]).slice(0, 4).forEach((v: string, i: number) => n.push({ id: "vid_" + i, type: "video", layer: "media", label: String(v).slice(0, 14), sub: "video", x: 1360, y: 40 + i * 70 }));
    INFRA.forEach((s, i) => n.push({ id: "in_" + s, type: "infra", layer: "infrastructure", label: s, sub: "infra", x: 40, y: 220 + i * 64 }));
    AISVC.forEach((s, i) => n.push({ id: "ai_" + s, type: "ai", layer: "ai", label: s, sub: "AI service", x: 1600, y: 40 + i * 60 }));
    ["Content Pipeline", "Render Notify", "Drops Publisher", "Discovery Sync"].forEach((w, i) => n.push({ id: "wf_" + i, type: "workflow", layer: "automation", label: w, sub: "n8n", x: 1120, y: 420 + i * 70 }));
    PUB.forEach((p, i) => n.push({ id: "pb_" + p, type: "publishing", layer: "publishing", label: p, sub: "publish", x: 1360, y: 360 + i * 64 }));
    n.push({ id: "an_main", type: "analytics", layer: "analytics", label: "Analytics", sub: "KPI", x: 1600, y: 920 });
    // device layer (from Device Control Center registry)
    (devIdx?.devices || []).slice(0, 6).forEach((d: any, i: number) => n.push({ id: "dv_" + d.id, type: "infra", layer: "infrastructure", label: d.id, sub: "cloud phone", x: 280, y: 1080 + i * 64 }));
    (devIdx?.proxies || []).slice(0, 6).forEach((p: any, i: number) => n.push({ id: "px_" + p.name, type: "infra", layer: "infrastructure", label: p.name, sub: "proxy", x: 520, y: 1080 + i * 64 }));
    (devIdx?.automationTasks || []).slice(0, 4).forEach((a: any, i: number) => n.push({ id: "au_" + i, type: "workflow", layer: "automation", label: a.task, sub: "automation", x: 760, y: 1080 + i * 64 }));
    return n;
  }, [ctx, tgIdx, mediaIdx, devIdx]);

  const nodes = useMemo(() => [...base, ...extra], [base, extra]);
  const edges = useMemo(() => {
    const e: [string, string][] = [];
    ctx.agents.forEach((a) => {
      const sid = Object.entries(ctx.bind).find(([, ag]) => ag === a.id)?.[0];
      if (sid) e.push(["ag_" + a.id, "se_" + sid]);
      e.push(["ag_" + a.id, "hub"]);
      const mm = AISVC.find((m) => (a.model || "").toLowerCase().includes(m.toLowerCase())); if (mm) e.push(["ag_" + a.id, "ai_" + mm]);
      ctx.missions.filter((m) => m.agentId === a.id).forEach((m) => e.push(["ag_" + a.id, "mi_" + m.id]));
      e.push(["ag_" + a.id, "cha_" + a.id]);
    });
    nodes.filter((n) => n.type === "session").forEach((s) => { nodes.filter((n) => ["channel", "group", "dialog"].includes(n.type)).forEach((c) => e.push([s.id, c.id])); });
    nodes.filter((n) => n.type === "character").forEach((c) => { nodes.filter((n) => n.type === "video").slice(0, 2).forEach((v) => e.push([c.id, v.id])); });
    nodes.filter((n) => n.type === "video").forEach((v) => PUB.slice(0, 2).forEach((p) => e.push([v.id, "pb_" + p])));
    PUB.forEach((p) => e.push(["pb_" + p, "an_main"]));
    INFRA.forEach((s) => e.push(["hub", "in_" + s]));
    ["Content Pipeline", "Render Notify", "Drops Publisher", "Discovery Sync"].forEach((_, i) => e.push(["hub", "wf_" + i]));
    // device layer edges
    (devIdx?.devices || []).slice(0, 6).forEach((d: any) => { e.push(["hub", "dv_" + d.id]); if (d.proxy && d.proxy !== "—") e.push(["dv_" + d.id, "px_" + d.proxy]); });
    return e;
  }, [ctx, nodes, devIdx]);

  const P = (n: N) => pos[n.id] || { x: n.x, y: n.y };
  const visible = (n: N) => layer === "all" || n.layer === layer || n.type === "hub";
  const visNodes = useMemo(() => nodes.filter(visible), [nodes, layer]);
  const visIds = useMemo(() => new Set(visNodes.map((n) => n.id)), [visNodes]);
  const visEdges = useMemo(() => edges.filter(([a, b]) => visIds.has(a) && visIds.has(b)), [edges, visIds]);

  useEffect(() => { try { const l = JSON.parse(localStorage.getItem(KL) || "null"); if (l) setPos(l); const v = JSON.parse(localStorage.getItem(KV) || "null"); if (v) { setView(v.view || view); setLayer(v.layer || "all"); setExecView(v.exec || "architect"); } } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(KL, JSON.stringify(pos)); localStorage.setItem(KV, JSON.stringify({ view, layer, exec })); } catch {} }, [pos, view, layer, exec]);

  useEffect(() => {
    function mv(e: MouseEvent) { const d = drag.current; if (!d.mode) return; if (d.mode === "node" && d.id) { const dx = (e.clientX - d.sx) / view.s, dy = (e.clientY - d.sy) / view.s; setPos((p) => ({ ...p, [d.id as string]: { x: d.ox + dx, y: d.oy + dy } })); } else if (d.mode === "pan") setView((v) => ({ ...v, tx: d.ox + (e.clientX - d.sx), ty: d.oy + (e.clientY - d.sy) })); }
    function up() { drag.current.mode = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up); return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [view.s]);
  useEffect(() => { function k(e: KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setPalette((v) => !v); setPq(""); } if (e.key === "Escape") { setPalette(false); setFocus(""); setPath([]); } } window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  function pushHist() { setHist((h) => [...h.slice(-19), { ...pos }]); setRedo([]); }
  function down(e: React.MouseEvent, id?: string) { const d = drag.current; d.sx = e.clientX; d.sy = e.clientY; if (id) { const n = nodes.find((x) => x.id === id)!; d.mode = "node"; d.id = id; const p = P(n); d.ox = p.x; d.oy = p.y; setSel(id); pushHist(); } else { d.mode = "pan"; d.ox = view.tx; d.oy = view.ty; } e.stopPropagation(); }
  const zoom = (dz: number) => setView((v) => ({ ...v, s: Math.max(0.25, Math.min(2, +(v.s + dz).toFixed(2))) }));
  function undo() { setHist((h) => { if (!h.length) return h; const prev = h[h.length - 1]; setRedo((r) => [{ ...pos }, ...r]); setPos(prev); return h.slice(0, -1); }); }
  function redoFn() { setRedo((r) => { if (!r.length) return r; const nx = r[0]; setHist((h) => [...h, { ...pos }]); setPos(nx); return r.slice(1); }); }
  function autoLayout() { pushHist(); const idx: Record<string, number> = {}; const cols: Record<string, number> = { hub: 40, infra: 40, agent: 340, mission: 340, session: 620, dialog: 620, channel: 880, group: 880, character: 1140, workflow: 1140, video: 1400, publishing: 1400, ai: 1660, analytics: 1660 }; const p: Record<string, { x: number; y: number }> = {}; nodes.forEach((n) => { const c = idx[n.type] = (idx[n.type] ?? -1) + 1; p[n.id] = { x: cols[n.type] ?? 800, y: 40 + c * 72 }; }); setPos(p); }
  function neighbors(id: string) { return edges.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a)); }
  function bfs(start: string, target = "hub") { if (start === target) return [start]; const adj: Record<string, string[]> = {}; edges.forEach(([a, b]) => { (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); }); const q = [[start]]; const seen = new Set([start]); while (q.length) { const pa = q.shift()!; const last = pa[pa.length - 1]; if (last === target) return pa; for (const nb of adj[last] || []) if (!seen.has(nb)) { seen.add(nb); q.push([...pa, nb]); } } return []; }
  function addPaletteNode(kind: string) { pushHist(); const id = "x" + Date.now(); const map: Record<string, string> = { Agent: "agent", Telegram: "session", Mission: "mission", Workflow: "workflow", Infrastructure: "infra", "AI Service": "ai", Database: "infra", Docker: "infra", N8N: "workflow", Cloudflare: "infra", VPS: "infra", Character: "character", Voice: "voice", Prompt: "media", Script: "media", Image: "image", Video: "video", Publishing: "publishing", Analytics: "analytics", Folder: "media", Group: "group", Comment: "media", Label: "media" }; const ty = map[kind] || "media"; const lay = ty === "agent" ? "agents" : ty === "session" || ty === "channel" || ty === "group" || ty === "dialog" ? "telegram" : ty === "mission" ? "missions" : ty === "ai" ? "ai" : ty === "workflow" ? "automation" : ty === "publishing" ? "publishing" : ty === "analytics" ? "analytics" : ["character", "video", "image", "voice", "media"].includes(ty) ? "media" : "infrastructure"; setExtra((e) => [...e, { id, type: ty, layer: lay, label: kind, sub: "new", x: 700 - view.tx / view.s + 100, y: 300 - view.ty / view.s + 100 }]); setSel(id); }

  // AI ARCHITECT ASSISTANT
  const assistant = useMemo(() => {
    const w: string[] = [];
    const idleAgents = ctx.agents.filter((a) => a.state !== "ACTIVE"); if (idleAgents.length) w.push("⚠ " + idleAgents.length + " неактивных агента: " + idleAgents.map((a) => a.name).slice(0, 3).join(", "));
    if (!ctx.slots.length) w.push("⚠ Нет Telegram-сессии — цепочка Agent→Telegram разорвана.");
    if (!tgIdx) w.push("ℹ Telegram Index пуст — запустите Discovery для полной карты.");
    const noMissionAgents = ctx.agents.filter((a) => !ctx.missions.some((m) => m.agentId === a.id)); if (noMissionAgents.length) w.push("ℹ Агенты без миссий: " + noMissionAgents.map((a) => a.name).slice(0, 3).join(", "));
    if ((mediaIdx?.publishing || []).length) w.push("ℹ Publishing требует Review перед публикацией.");
    const unused = nodes.filter((n) => n.type !== "hub" && !neighbors(n.id).length); if (unused.length) w.push("ℹ Несвязанные узлы: " + unused.length);
    w.push("✓ Рекомендация: используйте Auto Layout и Show Path для аудита зависимостей.");
    return w;
  }, [ctx, nodes, tgIdx, mediaIdx]);

  // EXPORT
  function dl(name: string, content: string, mime: string) { const b = new Blob([content], { type: mime }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
  function svgString() { const W = 1900, H = 1100; let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0a0710"/>`; visEdges.forEach(([a, b]) => { const na = nodes.find((n) => n.id === a)!, nb = nodes.find((n) => n.id === b)!; const pa = P(na), pb = P(nb); s += `<line x1="${pa.x + 60}" y1="${pa.y + 18}" x2="${pb.x + 60}" y2="${pb.y + 18}" stroke="rgba(255,45,107,.3)" stroke-width="1.4"/>`; }); visNodes.forEach((n) => { const p = P(n); s += `<rect x="${p.x}" y="${p.y}" width="120" height="36" rx="8" fill="rgba(20,14,26,.9)" stroke="${CLR[n.type] || "#fff"}"/><text x="${p.x + 8}" y="${p.y + 22}" fill="${CLR[n.type] || "#fff"}" font-size="11" font-family="sans-serif">${(n.label || "").replace(/[<&]/g, "")}</text>`; }); return s + "</svg>"; }
  function exportPng() { const svg = svgString(); const img = new Image(); const blob = new Blob([svg], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob); img.onload = () => { const c = document.createElement("canvas"); c.width = 1900; c.height = 1100; const cx = c.getContext("2d")!; cx.drawImage(img, 0, 0); URL.revokeObjectURL(url); const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "epic_architect.png"; document.body.appendChild(a); a.click(); a.remove(); }; img.src = url; }
  function exportJson() { const data = { schema: "epic_architect", timestamp: new Date().toISOString(), nodes: nodes.map((n) => ({ id: n.id, type: n.type, layer: n.layer, label: n.label, pos: P(n) })), edges: edges.map(([a, b]) => ({ from: a, to: b })) }; try { localStorage.setItem(KS, JSON.stringify(data)); } catch {} dl("epic_architect.json", JSON.stringify(data, null, 2), "application/json"); }
  function exportMd() { let m = "# EPIC ARCHITECT — DEEPINSIDE.LIFE\n\n_" + new Date().toISOString() + "_\n\n"; LAYERS.filter((l) => l !== "all").forEach((l) => { const ns = nodes.filter((n) => n.layer === l); if (ns.length) m += "## " + l.toUpperCase() + "\n" + ns.map((n) => "- " + n.label + " (" + n.type + ")").join("\n") + "\n\n"; }); dl("epic_architect.md", m, "text/markdown"); }
  function exportHtml() { dl("epic_architect.html", `<!doctype html><meta charset=utf-8><title>EPIC ARCHITECT</title><body style="margin:0;background:#0a0710">${svgString()}</body>`, "text/html"); }

  const sn = nodes.find((n) => n.id === sel);
  const focusSet = focus ? new Set([focus, ...neighbors(focus)]) : null;
  const pathSet = path.length ? new Set(path) : null;
  const dim = (id: string) => focusSet ? !focusSet.has(id) : pathSet ? !pathSet.has(id) : false;
  const onPathEdge = (a: string, b: string) => { for (let i = 0; i < path.length - 1; i++) if ((path[i] === a && path[i + 1] === b) || (path[i] === b && path[i + 1] === a)) return true; return false; };

  const cmds = [
    { l: "Auto Layout", r: autoLayout }, { l: "Export Diagram (JSON)", r: exportJson }, { l: "Export PNG", r: exportPng },
    { l: "Show Problems", r: () => setLayer("all") }, { l: "Focus Agents", r: () => setLayer("agents") }, { l: "Focus Telegram", r: () => setLayer("telegram") },
    { l: "Open Media", r: () => setLayer("media") }, { l: "Open Infrastructure", r: () => setLayer("infrastructure") },
  ].filter((c) => !pq || c.l.toLowerCase().includes(pq.toLowerCase()));
  const nodeMatches = pq ? nodes.filter((n) => n.label.toLowerCase().includes(pq.toLowerCase())).slice(0, 12) : [];

  return (
    <div className="fixed inset-0 z-[62] flex flex-col bg-[#08060d] text-tg-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-[rgba(177,77,255,.25)] bg-[#120c18] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🏛 EPIC ARCHITECT</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · CORE</span>
        <div className="ml-1 flex flex-wrap gap-1">{LAYERS.map((l) => <button key={l} onClick={() => setLayer(l)} className={`rounded-full px-2 py-0.5 text-[10px] ${layer === l ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{l}</button>)}</div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <div className="flex overflow-hidden rounded-lg ring-1 ring-tg-line"><button onClick={() => setExecView("architect")} className={`px-2.5 py-1 text-[11px] ${exec === "architect" ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>Architect</button><button onClick={() => setExecView("executive")} className={`px-2.5 py-1 text-[11px] ${exec === "executive" ? "bg-cyan-600 text-white" : "bg-tg-bg text-tg-muted"}`}>Executive</button></div>
          <button onClick={undo} className="rounded-lg bg-tg-bg px-2 py-1 text-[11px] ring-1 ring-tg-line">↶</button>
          <button onClick={redoFn} className="rounded-lg bg-tg-bg px-2 py-1 text-[11px] ring-1 ring-tg-line">↷</button>
          <button onClick={autoLayout} className="rounded-lg bg-tg-bg px-2.5 py-1 text-[11px] ring-1 ring-tg-line">Auto Layout</button>
          <button onClick={() => { setPalette(true); setPq(""); }} className="rounded-lg border border-cyan-500/40 bg-cyan-600/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">⌘K</button>
          <button onClick={exportPng} className="rounded-lg bg-tg-bg px-2 py-1 text-[11px] ring-1 ring-tg-line">PNG</button>
          <button onClick={() => dl("epic_architect.svg", svgString(), "image/svg+xml")} className="rounded-lg bg-tg-bg px-2 py-1 text-[11px] ring-1 ring-tg-line">SVG</button>
          <button onClick={exportJson} className="rounded-lg bg-tg-bg px-2 py-1 text-[11px] ring-1 ring-tg-line">JSON</button>
          <button onClick={exportMd} className="rounded-lg bg-tg-bg px-2 py-1 text-[11px] ring-1 ring-tg-line">MD</button>
          <button onClick={exportHtml} className="rounded-lg bg-tg-bg px-2 py-1 text-[11px] ring-1 ring-tg-line">HTML</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[150px_1fr_260px]">
        {/* PALETTE */}
        <nav className="min-h-0 overflow-auto border-r border-[rgba(177,77,255,.15)] bg-[#120c18] p-2">
          <div className="mb-1 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">Palette</div>
          {PALETTE.map((p) => <button key={p} onClick={() => addPaletteNode(p)} className="mb-0.5 w-full rounded-lg px-2 py-1 text-left text-[12px] text-tg-muted hover:bg-tg-bg/40 hover:text-white">+ {p}</button>)}
        </nav>

        {/* CANVAS */}
        <main className="relative min-h-0 overflow-hidden bg-[#0a0710]" style={{ backgroundImage: "linear-gradient(rgba(177,77,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(177,77,255,.05) 1px,transparent 1px)", backgroundSize: "26px 26px" }}>
          <div className="absolute left-3 top-3 z-10 flex gap-1"><button onClick={() => zoom(0.15)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">+</button><button onClick={() => zoom(-0.15)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">−</button><button onClick={() => setView({ tx: 30, ty: 20, s: 0.6 })} className="rounded-lg bg-tg-panel px-2 text-xs ring-1 ring-tg-line">fit</button></div>
          <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={(e) => down(e)}>
            <div style={{ transform: `translate(${view.tx}px,${view.ty}px) scale(${view.s})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
              <svg className="pointer-events-none absolute" style={{ overflow: "visible", left: 0, top: 0 }} width="1" height="1">{visEdges.map(([a, b], i) => { const na = nodes.find((n) => n.id === a)!, nb = nodes.find((n) => n.id === b)!; const pa = P(na), pb = P(nb); const gold = onPathEdge(a, b); const f = focus && (a === focus || b === focus); return <line key={i} x1={pa.x + 60} y1={pa.y + 18} x2={pb.x + 60} y2={pb.y + 18} stroke={gold ? "#fbbf24" : f ? "#ff2d6b" : "rgba(177,77,255,.22)"} strokeWidth={gold ? 3 : f ? 2 : 1.2} opacity={(focusSet || pathSet) && !gold && !f ? 0.1 : 1} />; })}</svg>
              {visNodes.map((n) => { const p = P(n); return (
                <div key={n.id} onMouseDown={(e) => down(e, n.id)} onDoubleClick={() => { if (n.type === "agent" && n.ref && onOpenAgent) onOpenAgent(n.ref); else setSel(n.id); }} className={`absolute w-[120px] cursor-grab rounded-lg border bg-[rgba(20,14,26,.85)] px-2 py-1 text-[10px] backdrop-blur active:cursor-grabbing ${sel === n.id ? "ring-2 ring-white" : ""} ${pathSet?.has(n.id) ? "ring-2 ring-amber-400" : ""}`} style={{ left: p.x, top: p.y, borderColor: CLR[n.type] || "#fff", opacity: dim(n.id) ? 0.15 : 1 }}>
                  <div className="truncate font-bold" style={{ color: CLR[n.type] || "#fff" }}>{n.label}</div><div className="truncate text-tg-muted">{n.sub || n.type}</div></div>); })}
            </div>
          </div>
          <div className="absolute bottom-3 right-3 h-28 w-44 overflow-hidden rounded-lg border border-tg-line bg-tg-panel/90"><svg width="176" height="112" viewBox="0 0 1900 1100">{visEdges.map(([a, b], i) => { const na = nodes.find((n) => n.id === a)!, nb = nodes.find((n) => n.id === b)!; const pa = P(na), pb = P(nb); return <line key={i} x1={pa.x + 60} y1={pa.y + 18} x2={pb.x + 60} y2={pb.y + 18} stroke="rgba(177,77,255,.3)" strokeWidth={3} />; })}{visNodes.map((n) => { const p = P(n); return <circle key={n.id} cx={p.x + 60} cy={p.y + 18} r={12} fill={CLR[n.type] || "#fff"} />; })}</svg></div>
        </main>

        {/* INSPECTOR + AI ARCHITECT */}
        <aside className="min-h-0 overflow-auto border-l border-[rgba(177,77,255,.15)] bg-[#120c18] p-3">
          {exec === "executive" ? (
            <div className="space-y-2 text-xs"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Executive View</div>
              {([["Agents", ctx.agents.length], ["Active", ctx.agents.filter((a) => a.state === "ACTIVE").length], ["Sessions", ctx.slots.length], ["Missions", ctx.missions.length], ["AI Services", AISVC.length], ["Infra", INFRA.length], ["Warnings", assistant.filter((x) => x.startsWith("⚠")).length]] as const).map(([l, v]) => <div key={l} className="flex justify-between rounded bg-tg-bg/40 px-2 py-1"><span className="text-tg-muted">{l}</span><b>{v}</b></div>)}
              <div className="mt-1 text-[10px] uppercase text-tg-accent">Recommendations</div>{assistant.slice(0, 4).map((a, i) => <div key={i} className="rounded bg-tg-bg/40 px-2 py-1 text-[11px] text-tg-muted">{a}</div>)}
            </div>
          ) : (<>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Node Inspector</div>
            {sn ? (<div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: CLR[sn.type] }} /><b>{sn.label}</b></div>
              <div className="text-tg-muted">Type: <b className="text-tg-text">{sn.type}</b> · Layer: {sn.layer}</div>
              <div className="text-tg-muted">Status: <b className="text-tg-text">active</b> · Connected: {neighbors(sn.id).length}</div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {sn.type === "agent" && sn.ref && onOpenAgent && <button onClick={() => onOpenAgent(sn.ref!)} className="col-span-2 rounded-lg bg-tg-active px-2 py-1.5 text-[11px] font-semibold text-white">Open →</button>}
                <button onClick={() => { setPath([]); setFocus(focus === sn.id ? "" : sn.id); }} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Focus</button>
                <button onClick={() => { setFocus(""); setPath(bfs(sn.id)); }} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Show Path</button>
                <button onClick={() => { setPath([]); setFocus(sn.id); }} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Relations</button>
                <button onClick={exportJson} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Export</button>
              </div>
              {path.length > 0 && <div className="mt-1 text-[11px]"><span className="text-amber-400">Path → hub ({path.length}):</span> {path.map((id) => nodes.find((n) => n.id === id)?.label || id).join(" → ")}</div>}
              <div className="mt-1 text-[10px] uppercase text-tg-accent">Connected</div><div className="flex flex-wrap gap-1 text-[11px]">{neighbors(sn.id).slice(0, 14).map((id) => { const c = nodes.find((n) => n.id === id); return <span key={id} className="rounded bg-tg-bg px-1.5 py-0.5" style={{ color: c ? CLR[c.type] : "#888" }}>{c?.label || id}</span>; })}</div>
            </div>) : <div className="mt-2 text-tg-muted">Клик по узлу — детали и действия.</div>}
            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">AI Architect Assistant</div>
            <div className="mt-1 space-y-1 text-[11px]">{assistant.map((a, i) => <div key={i} className={`rounded px-2 py-1 ${a.startsWith("⚠") ? "bg-rose-600/15 text-rose-200" : "bg-tg-bg/40 text-tg-muted"}`}>{a}</div>)}</div>
          </>)}
        </aside>
      </div>

      {palette && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 pt-24" onMouseDown={() => setPalette(false)}>
          <div className="w-[540px] max-w-[92vw] overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#120c18] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <input autoFocus value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Команда или поиск узла…" className="w-full border-b border-tg-line bg-[#0a0710] px-4 py-3 text-sm outline-none" />
            <div className="max-h-[52vh] overflow-auto p-2">
              {cmds.map((c) => <button key={c.l} onClick={() => { c.r(); setPalette(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/60"><span className="text-cyan-300">⌁</span>{c.l}</button>)}
              {nodeMatches.map((n) => <button key={n.id} onClick={() => { setSel(n.id); setPalette(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/60"><span className="h-2 w-2 rounded-full" style={{ background: CLR[n.type] }} />{n.label} <span className="ml-auto text-[11px] text-tg-muted">{n.type}</span></button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
