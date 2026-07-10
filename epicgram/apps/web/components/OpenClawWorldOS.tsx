"use client";

// OPENCLAW_WORLD_OS_CORE_VISUAL_LAYER — CORE UI LAYER (PHASE T12).
// Standalone full-screen World OS at /world. Self-contained: does NOT depend on AgentRegistry
// ctx, does NOT touch Telegram/Publisher/Operator runtime. Visualization-only. Reads existing
// epicgram.* localStorage read-only to draw the graph; falls back to a mock graph if empty.

import { Component, useEffect, useMemo, useState } from "react";

const WORLD_LS = "deepinside.worldos.visualization.v1";
const NODE_COLOR: Record<string, string> = { Agent: "#e879f9", Channel: "#38bdf8", Campaign: "#fbbf24", Core: "#22d3ee", District: "#a5b4fc", Node: "#a78bfa" };

const now = () => new Date().toISOString();
function load<T>(k: string, def: T): T { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch { return def; } }
function save(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

type GNode = { id: string; label: string; sub?: string; x: number; y: number; type: string };
type GEdge = [string, string];

// ---- error boundary (class component, allowed inside a client module) ----
class WorldOSErrorBoundary extends Component<{ children: any }, { err: boolean }> {
  constructor(p: any) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() { /* UI-only event; no secrets logged */ }
  render() {
    if (this.state.err) {
      return <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-black text-tg-text">
        <div className="text-lg font-black text-rose-300">OPENCLAW WORLD OS failed to render.</div>
        <div className="flex gap-2">
          <button onClick={() => location.reload()} className="rounded bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">Reload World OS</button>
          <button onClick={() => { try { localStorage.removeItem(WORLD_LS); } catch {} location.reload(); }} className="rounded bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">Reset View State</button>
        </div>
      </div>;
    }
    return this.props.children;
  }
}

function buildGraph(): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = []; const edges: GEdge[] = [];
  const brains = load<Record<string, any>>("epicgram.agentBrain.v1", {});
  const assigns = load<any[]>("epicgram.channelAssignments.v1", []);
  const camps = load<any[]>("epicgram.campaigns.v1", []);
  const drafts = load<any[]>("epicgram.drafts.v1", []);
  const agents = Object.keys(brains);
  if (agents.length === 0 && assigns.length === 0 && camps.length === 0) {
    // mock graph
    nodes.push({ id: "core", label: "DEEPINSIDE", sub: "World Core", x: 480, y: 120, type: "Core" });
    ["NOVIKOVA", "EVA", "AI NEWSCASTER", "AI MUSIC PUBLIC"].forEach((a, i) => { nodes.push({ id: "a" + i, label: a, x: 180 + i * 220, y: 340, type: "Agent" }); edges.push(["core", "a" + i]); });
    nodes.push({ id: "ch0", label: "NOVIKOVA NEWS", x: 180, y: 540, type: "Channel" }); edges.push(["a0", "ch0"]);
    return { nodes, edges };
  }
  nodes.push({ id: "core", label: "DEEPINSIDE", sub: "World Core", x: 480, y: 110, type: "Core" });
  const aList = agents.length ? agents : ["NOVIKOVA"];
  aList.forEach((a, i) => { nodes.push({ id: "ag:" + a, label: a, x: 160 + i * 220, y: 320, type: "Agent" }); edges.push(["core", "ag:" + a]); });
  const chSet: Record<string, boolean> = {};
  assigns.forEach((x) => { if (x.channel) chSet[x.channel] = true; });
  drafts.forEach((d) => { const c = d.channelTitle || d.channelId; if (c) chSet[c] = true; });
  Object.keys(chSet).forEach((c, i) => { nodes.push({ id: "ch:" + c, label: c, x: 120 + i * 200, y: 520, type: "Channel" }); const owner = (assigns.find((x) => x.channel === c) || {}).agent; if (owner) edges.push(["ag:" + owner, "ch:" + c]); });
  camps.forEach((c, i) => { nodes.push({ id: "cp:" + c.id, label: c.name, sub: c.status, x: 760, y: 300 + i * 80, type: "Campaign" }); if (c.agent) edges.push(["ag:" + c.agent, "cp:" + c.id]); });
  return { nodes, edges };
}

export function OpenClawWorldOS() {
  const [vis, setVis] = useState<any>({ enabled: true, coreLayer: true, protected: true, route: "/world", lastZoom: 0.6, showGrid: true, showMiniMap: true, showNavigator: true, worldMode: "1" });
  const [scale, setScale] = useState(0.6);
  const [showGrid, setShowGrid] = useState(true);
  const [showMini, setShowMini] = useState(true);
  const [showNav, setShowNav] = useState(true);
  const [mode, setMode] = useState("1");

  useEffect(() => {
    const v = load<any>(WORLD_LS, null);
    const merged = { enabled: true, coreLayer: true, protected: true, route: "/world", lastZoom: 0.6, showGrid: true, showMiniMap: true, showNavigator: true, worldMode: "1", ...(v || {}) };
    setVis(merged); setScale(merged.lastZoom || 0.6); setShowGrid(merged.showGrid !== false); setShowMini(merged.showMiniMap !== false); setShowNav(merged.showNavigator !== false); setMode(merged.worldMode || "1");
    save(WORLD_LS, { ...merged, lastOpenedAt: now(), updatedAt: now() });
  }, []);

  const persist = (patch: any) => { const next = { ...vis, ...patch, updatedAt: now() }; setVis(next); save(WORLD_LS, next); };
  const { nodes, edges } = useMemo(() => buildGraph(), []);
  const W = 1000, H = 640;
  const resetView = () => { setScale(0.6); setMode("1"); persist({ lastZoom: 0.6, worldMode: "1" }); };
  const zoom = (d: number) => { const s = Math.max(0.2, Math.min(2, +(scale + d).toFixed(2))); setScale(s); persist({ lastZoom: s }); };
  const pos: Record<string, GNode> = {}; nodes.forEach((n) => { pos[n.id] = n; });

  const tBtn = (active: boolean, on: () => void, label: string) => <button onClick={on} className={"rounded px-2 py-1 text-[11px] " + (active ? "bg-fuchsia-600/40 text-white" : "bg-white/5 text-tg-muted hover:bg-white/10")}>{label}</button>;

  return <WorldOSErrorBoundary>
    <div className="fixed inset-0 flex flex-col overflow-hidden text-tg-text" style={{ background: "radial-gradient(circle at 50% 0%, #14092a 0%, #080611 60%, #050409 100%)" }}>
      {/* TOP BAR */}
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        <a href="/agents" className="rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20">← App</a>
        <b className="text-sm font-black tracking-wide text-fuchsia-200">OPENCLAW · WORLD OS</b>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-300">CORE UI LAYER</span>
        <span className="text-[11px] text-tg-muted">{Math.round(scale * 100)}%</span>
        <div className="ml-2 flex flex-wrap gap-1">
          {tBtn(false, () => {}, "Поделиться")}
          {tBtn(showNav, () => { setShowNav(!showNav); persist({ showNavigator: !showNav }); }, "Навигатор")}
          {tBtn(false, () => {}, "Редактирование")}
          {tBtn(showGrid, () => { setShowGrid(!showGrid); persist({ showGrid: !showGrid }); }, "Сетка")}
          {["1", "2", "3", "4"].map((m) => tBtn(mode === m, () => { setMode(m); persist({ worldMode: m }); }, "Мир " + m))}
          {tBtn(false, () => {}, "Архитектор")}
          {tBtn(false, () => {}, "Рабочий стол")}
        </div>
        <button onClick={resetView} className="ml-auto rounded bg-white/10 px-3 py-1 text-[11px] hover:bg-white/20">Reset View</button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* LEFT TOOLBAR */}
        <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-white/10 py-2">
          {[["⌂", resetView], ["＋", () => zoom(0.1)], ["－", () => zoom(-0.1)], ["⤢", () => { setScale(0.6); persist({ lastZoom: 0.6 }); }], ["🧭", () => { setShowNav(!showNav); persist({ showNavigator: !showNav }); }], ["▦", () => { setShowGrid(!showGrid); persist({ showGrid: !showGrid }); }], ["▤", () => {}], ["◳", () => {}]].map(([ic, fn], i) => <button key={i} onClick={fn as any} className="h-8 w-8 rounded bg-white/5 text-[13px] hover:bg-white/15">{ic as any}</button>)}
        </nav>

        {/* CENTRAL CANVAS */}
        <main className="relative min-w-0 flex-1 overflow-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
          <svg width={W * scale} height={H * scale} viewBox={"0 0 " + W + " " + H} style={{ display: "block" }}>
            {showGrid && <defs><pattern id="wgrid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#ffffff10" strokeWidth="1" /></pattern></defs>}
            {showGrid && <rect width={W} height={H} fill="url(#wgrid)" />}
            {edges.map(([a, b], i) => { const p = pos[a], q = pos[b]; if (!p || !q) return null; return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#ffffff22" strokeWidth={2} />; })}
            {nodes.map((n) => <g key={n.id} transform={"translate(" + (n.x - 66) + "," + (n.y - 24) + ")"}>
              <rect width={132} height={48} rx={12} fill={(NODE_COLOR[n.type] || "#888") + "22"} stroke={(NODE_COLOR[n.type] || "#888") + "99"} />
              <text x={66} y={21} textAnchor="middle" fontSize={12} fontWeight={700} fill={NODE_COLOR[n.type] || "#ddd"}>{n.label.slice(0, 18)}</text>
              <text x={66} y={36} textAnchor="middle" fontSize={8} fill="#9ca3af">{(n.sub || n.type)}</text>
            </g>)}
          </svg>

          {/* STATUS BADGE bottom-left */}
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">World OS Stable · core_visualization · /world · Мир {mode}</div>

          {/* MINIMAP bottom-right */}
          {showMini && <div className="absolute bottom-3 right-3 w-40 rounded-lg border border-white/15 bg-black/50 p-1">
            <div className="mb-0.5 text-center text-[8px] uppercase tracking-wider text-fuchsia-300/70">Миникарта · Навигатор</div>
            <svg width="100%" viewBox={"0 0 " + W + " " + H} style={{ display: "block", height: 90 }}>
              <rect width={W} height={H} fill="#0a0816" />
              {edges.map(([a, b], i) => { const p = pos[a], q = pos[b]; if (!p || !q) return null; return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#ffffff22" strokeWidth={3} />; })}
              {nodes.map((n) => <circle key={n.id} cx={n.x} cy={n.y} r={14} fill={NODE_COLOR[n.type] || "#888"} />)}
            </svg>
          </div>}
        </main>
      </div>
    </div>
  </WorldOSErrorBoundary>;
}
