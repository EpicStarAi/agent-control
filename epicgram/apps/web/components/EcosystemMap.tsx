"use client";

// EcosystemMap — WORLD: central navigation hub for the whole DEEPINSIDE.LIFE ecosystem.
// Additive, read-only, localStorage only. No backend / TDLib / external API / Telegram actions.

import { useEffect, useMemo, useRef, useState } from "react";

type Ctx = {
  agents: any[];
  missions: any[];
  exec: any[];
  devices: any[];
  slots: any[];
  bind: Record<string, string>;
  counts: Record<string, { d: number; c: number; g: number; u: number }>;
  activeId: string;
};

type WNode = { id: string; type: string; layer: string; label: string; sub?: string; ref?: string; status: "ok" | "warn" | "error" };
type WEdge = [string, string];

const LS = "epic_world_v1";
const WSTATE = "epic_world_state_v1";
const WACT = "epic_world_activity_v1";
const CLR: Record<string, string> = {
  agent: "#ff2d6b", session: "#e879f9", channel: "#60a5fa", group: "#34d399", device: "#06b6d4",
  mission: "#22c55e", task: "#38bdf8", brain: "#b14dff", memory: "#f0abfc", goal: "#fbbf24",
  knowledge: "#0ea5e9", service: "#f59e0b", model: "#a78bfa", hub: "#ffffff", dialog: "#9ca3af", bot: "#f97316", contact: "#c084fc",
};
const STATUS_CLR: Record<string, string> = { ok: "#4ade80", warn: "#fbbf24", error: "#f87171" };
const MODELS = ["ChatGPT", "Claude", "Grok", "Gemini", "OpenRouter", "HuggingFace", "ElevenLabs", "Ollama"];
const INFRA = ["Docker", "N8N", "Cloudflare", "PostgreSQL", "Redis"];

const LAYERS = ["all", "agents", "telegram", "channels", "infrastructure", "ai", "missions", "errors"] as const;
const LAYER_LABEL: Record<string, string> = { all: "All", agents: "Agents", telegram: "Telegram", channels: "Channels", infrastructure: "Infrastructure", ai: "AI Services", missions: "Missions", errors: "Errors / Warnings" };
const VIEWS = ["map", "cluster", "runtime", "telegram", "infrastructure"] as const;
const VIEW_LABEL: Record<string, string> = { map: "Map View", cluster: "Cluster View", runtime: "Runtime View", telegram: "Telegram View", infrastructure: "Infrastructure View" };

export function EcosystemMap({ ctx, onClose, onOpenAgent, onOpenNode, onOpenHtml }: {
  ctx: Ctx; onClose: () => void; onOpenAgent: (id: string) => void;
  onOpenNode?: (n: WNode) => void; onOpenHtml?: () => void;
}) {
  const [view, setView] = useState({ tx: 40, ty: 20, scale: 0.7 });
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [sel, setSel] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<string>("map");
  const [loaded, setLoaded] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string>("");
  const [pathIds, setPathIds] = useState<string[]>([]);
  const [activity, setActivity] = useState<{ t: string; kind: string; text: string }[]>([]);
  const [lastCommand, setLastCommand] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const [tgChats, setTgChats] = useState<any[]>([]);
  const [tgContacts, setTgContacts] = useState<any[]>([]);
  const devReg = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_device_center_v1") || "null"); } catch { return null; } }, []);

  // READ-ONLY: render real Telegram objects as WORLD nodes.
  // Prefer the Discovery Index (epic_telegram_index_v1) if present; else live Telegram Layer fetch.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const idx = JSON.parse(localStorage.getItem("epic_telegram_index_v1") || "null");
        if (idx && (idx.dialogs || idx.channels)) {
          const list = [
            ...(idx.dialogs || []).map((c: any) => ({ id: c.id, title: c.title, category: "private" })),
            ...(idx.channels || []).map((c: any) => ({ id: c.id, title: c.title, category: "channel" })),
            ...(idx.groups || []).map((c: any) => ({ id: c.id, title: c.title, category: "group" })),
            ...(idx.bots || []).map((c: any) => ({ id: c.id, title: c.title, category: "bot" })),
          ];
          if (alive) { setTgChats(list.slice(0, 24)); setTgContacts((idx.contacts || []).slice(0, 12)); }
          return;
        }
        const s = await fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        const active = (s?.accounts || []).find((a: any) => (a.slotId || a.label) === ctx.activeId) || (s?.accounts || [])[0];
        if (!active) return;
        const cj = await fetch("/api/telegram/chats?accountId=" + encodeURIComponent(ctx.activeId || active.slotId || ""), { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        const list = cj?.chats || (cj?.body && cj.body.chats) || [];
        if (alive && Array.isArray(list)) { setTgChats(list.slice(0, 24)); setTgContacts(list.filter((c: any) => c.category === "private").slice(0, 12)); }
      } catch {}
    })();
    return () => { alive = false; };
  }, [ctx.activeId]);

  function logAct(kind: string, text: string) {
    setActivity((a) => { const next = [{ t: new Date().toISOString().slice(11, 19), kind, text }, ...a].slice(0, 30); try { localStorage.setItem("epic_world_activity_v1", JSON.stringify(next)); } catch {} return next; });
  }
  const drag = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number }>({ mode: null, sx: 0, sy: 0, ox: 0, oy: 0 });

  const agentSession = (aid: string) => {
    const sid = Object.entries(ctx.bind).find(([, a]) => a === aid)?.[0];
    return ctx.slots.find((s) => (s.slotId || s.label) === sid);
  };
  const agentStatus = (a: any): "ok" | "warn" | "error" => (a.state === "ACTIVE" ? (a.readiness >= 50 ? "ok" : "warn") : "warn");

  // ---------- NODES ----------
  const nodes = useMemo(() => {
    const n: WNode[] = [];
    n.push({ id: "hub", type: "hub", layer: "infrastructure", label: "Deepinside.life", sub: "platform hub", status: "ok" });
    ctx.agents.forEach((a) => {
      n.push({ id: "a_" + a.id, type: "agent", layer: "agents", label: a.name, sub: a.role, ref: a.id, status: agentStatus(a) });
      n.push({ id: "mem_" + a.id, type: "memory", layer: "agents", label: "Memory", sub: ((a.shortMem?.length || 0) + (a.longMem?.length || 0)) + " items", status: "ok" });
      n.push({ id: "goal_" + a.id, type: "goal", layer: "agents", label: "Goals", sub: (a.goals?.length || 0) + " goals", status: "ok" });
      n.push({ id: "task_" + a.id, type: "task", layer: "agents", label: "Tasks", sub: (a.tasks?.length || ctx.exec.filter((e) => e.agentId === a.id).length) + " tasks", status: "ok" });
    });
    ctx.slots.forEach((s) => n.push({ id: "s_" + (s.slotId || s.label), type: "session", layer: "telegram", label: (s.displayName || s.slotId || "session").slice(0, 14), sub: "telegram", ref: s.slotId || s.label, status: (s.status === "authorized" || s.active) ? "ok" : "warn" }));
    const ac = ctx.counts?.[ctx.activeId];
    if (ac) { n.push({ id: "ch_active", type: "channel", layer: "channels", label: "Channels", sub: (ac.c ?? 0) + " channels", status: "ok" }); n.push({ id: "gr_active", type: "group", layer: "channels", label: "Groups", sub: (ac.g ?? 0) + " groups", status: "ok" }); }
    ctx.devices.forEach((d) => n.push({ id: "d_" + d.id, type: "device", layer: "infrastructure", label: d.name, sub: d.type?.slice(0, 14), ref: d.id, status: "ok" }));
    INFRA.forEach((s) => n.push({ id: "svc_" + s, type: "service", layer: "infrastructure", label: s, sub: "service", ref: s, status: "ok" }));
    MODELS.forEach((m) => n.push({ id: "model_" + m, type: "model", layer: "ai", label: m, sub: "AI service", ref: m, status: "ok" }));
    ctx.missions.forEach((m) => n.push({ id: "m_" + m.id, type: "mission", layer: "missions", label: m.title.slice(0, 16), sub: m.status, ref: m.id, status: m.status === "BLOCKED" ? "error" : (m.status === "WAITING_APPROVAL" ? "warn" : "ok") }));
    // real Telegram chats as WORLD nodes (read-only)
    tgChats.forEach((c: any) => {
      const k = c.category === "channel" || c.isChannel ? "channel" : c.category === "bot" || c.isBot ? "bot" : c.category === "group" ? "group" : "dialog";
      const layer = k === "channel" || k === "group" ? "channels" : "telegram";
      n.push({ id: "tg_" + c.id, type: k, layer, label: (c.title || k).slice(0, 14), sub: k, ref: String(c.id), status: "ok" });
    });
    tgContacts.forEach((c: any) => n.push({ id: "tgct_" + c.id, type: "contact", layer: "telegram", label: (c.title || "contact").slice(0, 14), sub: "contact", ref: String(c.id), status: "ok" }));
    // device layer (from Device Control Center registry)
    (devReg?.devices || []).slice(0, 6).forEach((d: any) => n.push({ id: "dev_" + d.id, type: "device", layer: "infrastructure", label: d.id, sub: "cloud phone", ref: d.id, status: d.status === "offline" ? "error" : d.status === "idle" ? "warn" : "ok" }));
    (devReg?.proxies || []).slice(0, 6).forEach((p: any) => n.push({ id: "prx_" + p.name, type: "service", layer: "infrastructure", label: p.name, sub: "proxy", status: p.status === "healthy" ? "ok" : "warn" }));
    return n;
  }, [ctx, tgChats, tgContacts, devReg]);

  // ---------- EDGES ----------
  const edges = useMemo(() => {
    const e: WEdge[] = [];
    ctx.agents.forEach((a) => {
      const s = agentSession(a.id);
      if (s) e.push(["a_" + a.id, "s_" + (s.slotId || s.label)]);
      if (a.deviceId) { e.push(["a_" + a.id, "d_" + a.deviceId]); if (s) e.push(["s_" + (s.slotId || s.label), "d_" + a.deviceId]); }
      const mm = MODELS.find((m) => (a.model || "").toLowerCase().includes(m.toLowerCase()) || (m === "OpenRouter" && (a.integrations || []).includes("OpenRouter")));
      if (mm) e.push(["a_" + a.id, "model_" + mm]);
      (a.integrations || []).forEach((ig: string) => { const sv = INFRA.find((s) => ig.toLowerCase().includes(s.toLowerCase())); if (sv) e.push(["a_" + a.id, "svc_" + sv]); });
      // voice service
      if ((a.integrations || []).some((ig: string) => /eleven|voice|tts/i.test(ig)) || /eva|music/i.test(a.id)) e.push(["a_" + a.id, "model_ElevenLabs"]);
      // cognition
      e.push(["a_" + a.id, "mem_" + a.id]); e.push(["a_" + a.id, "goal_" + a.id]); e.push(["a_" + a.id, "task_" + a.id]);
      e.push(["a_" + a.id, "hub"]);
    });
    ctx.missions.forEach((m) => { if (m.agentId) e.push(["a_" + m.agentId, "m_" + m.id]); });
    const act = ctx.slots.find((s) => (s.slotId || s.label) === ctx.activeId) || ctx.slots[0];
    if (act && ctx.counts?.[ctx.activeId]) { e.push(["s_" + (act.slotId || act.label), "ch_active"]); e.push(["s_" + (act.slotId || act.label), "gr_active"]); }
    ctx.devices.forEach((d) => e.push(["hub", "d_" + d.id]));
    INFRA.forEach((s) => e.push(["hub", "svc_" + s]));
    // real Telegram chats → active session (or hub)
    const actSlot = ctx.slots.find((s) => (s.slotId || s.label) === ctx.activeId) || ctx.slots[0];
    const anchor = actSlot ? "s_" + (actSlot.slotId || actSlot.label) : "hub";
    tgChats.forEach((c: any) => e.push([anchor, "tg_" + c.id]));
    tgContacts.forEach((c: any) => e.push(["tg_" + c.id, "tgct_" + c.id]));
    (devReg?.devices || []).slice(0, 6).forEach((d: any) => { e.push(["svc_DeepInside", "dev_" + d.id]); if (d.proxy && d.proxy !== "—") e.push(["dev_" + d.id, "prx_" + d.proxy]); });
    return e;
  }, [ctx, tgChats, tgContacts, devReg]);

  // ---------- VISIBILITY (view mode + filter) ----------
  const viewLayers: Record<string, string[]> = {
    map: ["agents", "telegram", "channels", "infrastructure", "ai", "missions"],
    cluster: ["agents", "telegram", "channels", "infrastructure", "ai", "missions"],
    runtime: ["agents", "ai", "infrastructure"],
    telegram: ["agents", "telegram", "channels"],
    infrastructure: ["infrastructure"],
  };
  const visible = (n: WNode) => {
    if (n.type === "hub") return true;
    if (!viewLayers[viewMode].includes(n.layer) && !(viewMode === "runtime" && ["memory", "goal", "task"].includes(n.type))) return false;
    if (filter === "all") return true;
    if (filter === "errors") return n.status !== "ok";
    return n.layer === filter;
  };
  const visNodes = useMemo(() => nodes.filter(visible), [nodes, filter, viewMode]);
  const visIds = useMemo(() => new Set(visNodes.map((n) => n.id)), [visNodes]);
  const visEdges = useMemo(() => edges.filter(([a, b]) => visIds.has(a) && visIds.has(b)), [edges, visIds]);

  // ---------- LAYOUT ----------
  const defaultPos = useMemo(() => {
    const p: Record<string, { x: number; y: number }> = {};
    const idx: Record<string, number> = {};
    if (viewMode === "cluster" || viewMode === "infrastructure") {
      const cx = 700, cy = 400; p["hub"] = { x: cx, y: cy };
      const ring = visNodes.filter((n) => n.type !== "hub");
      ring.forEach((n, i) => { const a = (i / Math.max(1, ring.length)) * Math.PI * 2; p[n.id] = { x: Math.round(cx + Math.cos(a) * 360), y: Math.round(cy + Math.sin(a) * 300) }; });
    } else if (viewMode === "runtime") {
      const cols: Record<string, number> = { agent: 60, memory: 320, goal: 320, task: 320, model: 620, service: 900, device: 1180, hub: 900 };
      visNodes.forEach((n) => { const c = idx[n.type] = (idx[n.type] ?? -1) + 1; p[n.id] = { x: cols[n.type] ?? 700, y: 60 + c * 80 }; });
    } else if (viewMode === "telegram") {
      const cols: Record<string, number> = { agent: 80, session: 480, channel: 880, group: 1060, hub: 480 };
      visNodes.forEach((n) => { const c = idx[n.type] = (idx[n.type] ?? -1) + 1; p[n.id] = { x: cols[n.type] ?? 700, y: 80 + c * 90 }; });
    } else {
      const cols: Record<string, number> = { hub: 40, service: 40, mission: 200, agent: 380, memory: 600, goal: 600, task: 600, session: 820, dialog: 1020, bot: 1020, contact: 1180, channel: 1320, group: 1460, device: 1620, model: 1780 };
      visNodes.forEach((n) => { const c = idx[n.type] = (idx[n.type] ?? -1) + 1; p[n.id] = { x: cols[n.type] ?? 700, y: 60 + c * 78 }; });
    }
    return p;
  }, [visNodes, viewMode]);

  function applyState(d: any) {
    if (!d || typeof d !== "object") return false;
    if (d.pos && typeof d.pos === "object") setPos(d.pos);
    if (d.pan && typeof d.pan === "object") setView((v) => ({ ...v, tx: d.pan.tx ?? v.tx, ty: d.pan.ty ?? v.ty, scale: d.zoom ?? v.scale }));
    else if (d.view) setView(d.view);
    if (typeof d.activeLayerFilter === "string" && (LAYERS as readonly string[]).includes(d.activeLayerFilter)) setFilter(d.activeLayerFilter);
    else if (typeof d.filter === "string") setFilter(d.filter);
    if (typeof d.viewMode === "string" && (VIEWS as readonly string[]).includes(d.viewMode)) setViewMode(d.viewMode);
    if (typeof d.selectedNodeId === "string") setSel(d.selectedNodeId);
    if (typeof d.focusId === "string") setFocusId(d.focusId);
    if (Array.isArray(d.pathIds)) setPathIds(d.pathIds.filter((x: any) => typeof x === "string"));
    if (typeof d.lastSearchQuery === "string") setQuery(d.lastSearchQuery);
    if (typeof d.lastCommand === "string") setLastCommand(d.lastCommand);
    return true;
  }
  // valid only if it carries our schema marker and known fields
  function validState(d: any): boolean {
    if (!d || typeof d !== "object" || d.schema !== WSTATE) return false;
    if (d.viewMode && !(VIEWS as readonly string[]).includes(d.viewMode)) return false;
    if (d.activeLayerFilter && !(LAYERS as readonly string[]).includes(d.activeLayerFilter)) return false;
    return true;
  }

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(WSTATE) || "null"); if (s) applyState(s); else { const d = JSON.parse(localStorage.getItem(LS) || "{}"); if (d.pos) setPos(d.pos); if (d.view) setView(d.view); if (d.filter) setFilter(d.filter); if (d.viewMode) setViewMode(d.viewMode); } } catch {}
    try { const a = JSON.parse(localStorage.getItem(WACT) || "[]"); if (Array.isArray(a)) setActivity(a); } catch {}
    setLoaded(true);
  }, []);

  const worldState = () => ({
    schema: WSTATE,
    selectedNodeId: sel, activeLayerFilter: filter, viewMode,
    zoom: view.scale, pan: { tx: view.tx, ty: view.ty },
    highlightedNodeIds: focusId ? [focusId, ...connOf(focusId)] : pathIds,
    highlightedEdgeIds: pathIds.length ? pathIds.slice(0, -1).map((id, i) => id + "|" + pathIds[i + 1]) : [],
    focusId, pathIds, lastCommand, lastSearchQuery: query, inspectorOpen: !!sel,
    timestamp: new Date().toISOString(),
  });
  useEffect(() => { if (!loaded) return; try { localStorage.setItem(WSTATE, JSON.stringify(worldState())); localStorage.setItem(LS, JSON.stringify({ pos, view, filter, viewMode })); } catch {} }, [pos, view, filter, viewMode, sel, focusId, pathIds, query, lastCommand, loaded]);

  const P = (id: string) => pos[id] || defaultPos[id] || { x: 700, y: 360 };

  function down(e: React.MouseEvent, id?: string) {
    const d = drag.current; d.sx = e.clientX; d.sy = e.clientY;
    if (id) { d.mode = "node"; d.id = id; const p = P(id); d.ox = p.x; d.oy = p.y; setSel(id); } else { d.mode = "pan"; d.ox = view.tx; d.oy = view.ty; }
    e.stopPropagation();
  }
  useEffect(() => {
    function mv(e: MouseEvent) { const d = drag.current; if (!d.mode) return; if (d.mode === "node" && d.id) { const dx = (e.clientX - d.sx) / view.scale, dy = (e.clientY - d.sy) / view.scale; setPos((p) => ({ ...p, [d.id as string]: { x: d.ox + dx, y: d.oy + dy } })); } else if (d.mode === "pan") setView((v) => ({ ...v, tx: d.ox + (e.clientX - d.sx), ty: d.oy + (e.clientY - d.sy) })); }
    function up() { drag.current.mode = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [view.scale]);
  const zoom = (d: number) => setView((v) => ({ ...v, scale: Math.max(0.3, Math.min(2, +(v.scale + d).toFixed(2))) }));
  const reset = () => { setView({ tx: 40, ty: 20, scale: 0.7 }); setPos({}); };

  // ---------- HEALTH ----------
  const h = useMemo(() => ({
    agents: ctx.agents.length,
    active: ctx.agents.filter((a) => a.state === "ACTIVE").length,
    sessions: ctx.slots.length,
    ai: MODELS.length,
    infra: INFRA.length + ctx.devices.length + 1,
    missions: ctx.missions.length,
    warns: nodes.filter((n) => n.status !== "ok").length,
  }), [ctx, nodes]);

  const timeline = useMemo(() => {
    const ev: { t: string; text: string }[] = [];
    for (const a of ctx.agents) for (const ac of a.activity || []) ev.push({ t: ac.t || "", text: a.name + ": " + ac.action });
    for (const m of ctx.missions) ev.push({ t: m.updatedAt || "", text: "Mission " + m.title + " → " + m.status });
    return ev.sort((x, y) => (x.t < y.t ? 1 : -1)).slice(0, 10);
  }, [ctx]);

  // ---------- EXPORT SNAPSHOT (no secrets) ----------
  function exportSnapshot() {
    const snap = {
      title: "DEEPINSIDE.LIFE — World Snapshot",
      timestamp: new Date().toISOString(),
      viewMode, filter, selectedNode: sel || null,
      counts: h,
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, layer: n.layer, label: n.label, status: n.status })),
      edges: edges.map(([from, to]) => ({ from, to })),
      note: "Visual planning snapshot. No secrets, tokens or credentials included.",
    };
    try { localStorage.setItem("epic_world_snapshot_v1", JSON.stringify(snap)); } catch {}
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "deepinside_world_snapshot.json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    logAct("export", "Export World Snapshot");
  }

  // ---------- INSPECTOR DATA ----------
  const sn = nodes.find((n) => n.id === sel);
  const connOf = (id: string) => edges.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));
  const inspector = useMemo(() => {
    if (!sn) return null;
    const conn = connOf(sn.id).map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as WNode[];
    let owner = "—", linkedAgent = "—", lastAct = "—";
    if (sn.type === "agent" && sn.ref) {
      const a = ctx.agents.find((x) => x.id === sn.ref);
      owner = a?.owner || "—"; linkedAgent = a?.name || "—";
      lastAct = a?.activity?.[0]?.t ? a.activity[0].t + " · " + a.activity[0].action : "—";
    } else {
      const ag = conn.find((c) => c.type === "agent");
      if (ag) linkedAgent = ag.label;
    }
    return {
      services: conn.filter((c) => c.type === "service" || c.type === "model").map((c) => c.label),
      sessions: conn.filter((c) => c.type === "session").map((c) => c.label),
      conn, owner, linkedAgent, lastAct,
    };
  }, [sn, nodes, edges, ctx]);

  function fireOpen(n: WNode) { if (n.type === "agent" && n.ref) onOpenAgent(n.ref); else onOpenNode?.(n); }

  // ---------- COMMAND ROUTER ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setPaletteOpen((v) => !v); setQuery(""); }
      if (e.key === "Escape") { setPaletteOpen(false); setFocusId(""); setPathIds([]); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // BFS path from a node to Deepinside.life hub
  function pathToHub(start: string): string[] {
    if (start === "hub") return ["hub"];
    const adj: Record<string, string[]> = {};
    edges.forEach(([a, b]) => { (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); });
    const q = [[start]]; const seen = new Set([start]);
    while (q.length) { const p = q.shift() as string[]; const last = p[p.length - 1]; if (last === "hub") return p;
      for (const nb of adj[last] || []) if (!seen.has(nb)) { seen.add(nb); q.push([...p, nb]); } }
    return [];
  }
  function focusConnected(id: string) { setPathIds([]); setFocusId(id); setSel(id); logAct("focus", "Focus Connected · " + id); }
  function showPath(id: string) { setFocusId(""); setPathIds(pathToHub(id)); setSel(id); logAct("path", "Path → Deepinside · " + id); }
  function copyNodeJson(n: WNode) {
    const data = { id: n.id, type: n.type, layer: n.layer, label: n.label, status: n.status, connected: connOf(n.id) };
    try { navigator.clipboard?.writeText(JSON.stringify(data, null, 2)); } catch {}
    logAct("copy", "Copy JSON · " + n.label);
  }
  function exportNodeSnapshot(n: WNode) {
    const conn = connOf(n.id);
    const path = pathToHub(n.id);
    const snap = {
      title: "DEEPINSIDE.LIFE — Node Snapshot",
      timestamp: new Date().toISOString(),
      selectedNode: { id: n.id, type: n.type, layer: n.layer, label: n.label, status: n.status },
      connectedNodes: conn.map((id) => { const c = nodes.find((x) => x.id === id); return c ? { id: c.id, type: c.type, label: c.label, status: c.status } : { id }; }),
      connectedEdges: edges.filter(([a, b]) => a === n.id || b === n.id).map(([from, to]) => ({ from, to })),
      pathToDeepinside: path,
      note: "Visual planning snapshot. No secrets, tokens or credentials included.",
    };
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "deepinside_node_" + n.id + "_snapshot.json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    logAct("export", "Export Node Snapshot · " + n.label);
  }

  // ---------- STATE MEMORY ACTIONS ----------
  function restoreLast() { try { const s = JSON.parse(localStorage.getItem(WSTATE) || "null"); if (s && applyState(s)) logAct("restore", "Restore Last View"); } catch {} }
  function clearState() { try { localStorage.removeItem(WSTATE); localStorage.removeItem(WACT); localStorage.removeItem(LS); } catch {}; setSel(""); setFocusId(""); setPathIds([]); setFilter("all"); setViewMode("map"); setView({ tx: 40, ty: 20, scale: 0.7 }); setPos({}); setActivity([]); setQuery(""); setLastCommand(""); }
  function restoreDefaultMap() { setViewMode("map"); setFilter("all"); setView({ tx: 40, ty: 20, scale: 0.7 }); setPos({}); setFocusId(""); setPathIds([]); setSel(""); logAct("restore", "Restore Default Map"); }
  function reopenLastNode() { try { const s = JSON.parse(localStorage.getItem(WSTATE) || "null"); if (s?.selectedNodeId) { setSel(s.selectedNodeId); logAct("restore", "Reopen " + s.selectedNodeId); } } catch {} }
  function exportState() {
    const blob = new Blob([JSON.stringify(worldState(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "deepinside_world_state.json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); logAct("export", "Export World State");
  }
  function importStateFile(file: File) {
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(String(r.result || "{}")); if (!validState(d)) { logAct("import", "Import rejected: unknown schema"); alert("Импорт отклонён: неизвестная схема состояния (ожидается " + WSTATE + ")."); return; } applyState(d); logAct("import", "Import World State"); } catch { logAct("import", "Import rejected: invalid JSON"); alert("Импорт отклонён: некорректный JSON."); } };
    r.readAsText(file);
  }

  // highlight sets
  const focusSet = useMemo(() => { if (!focusId) return null; const s = new Set<string>([focusId]); connOf(focusId).forEach((id) => s.add(id)); return s; }, [focusId, edges]);
  const pathSet = useMemo(() => (pathIds.length ? new Set(pathIds) : null), [pathIds]);
  const pathEdge = (a: string, b: string) => { if (!pathIds.length) return false; for (let i = 0; i < pathIds.length - 1; i++) { if ((pathIds[i] === a && pathIds[i + 1] === b) || (pathIds[i] === b && pathIds[i + 1] === a)) return true; } return false; };
  const dimNode = (id: string) => (focusSet ? !focusSet.has(id) : pathSet ? !pathSet.has(id) : false);

  // command palette items
  const COMMANDS = [
    { id: "c_html", label: "Open HTML Canvas", run: () => { setPaletteOpen(false); onOpenHtml?.(); } },
    { id: "c_export", label: "Export World Snapshot", run: () => { setPaletteOpen(false); exportSnapshot(); } },
    { id: "c_reset", label: "Reset View", run: () => { setPaletteOpen(false); reset(); } },
    { id: "c_errors", label: "Focus Errors", run: () => { setPaletteOpen(false); setViewMode("map"); setFilter("errors"); } },
    { id: "c_missions", label: "Focus Missions", run: () => { setPaletteOpen(false); setFilter("missions"); } },
    { id: "c_tg", label: "Focus Telegram Layer", run: () => { setPaletteOpen(false); setViewMode("telegram"); setFilter("telegram"); } },
    { id: "c_infra", label: "Open Infrastructure Canvas", run: () => { setPaletteOpen(false); onOpenHtml?.(); } },
    { id: "c_ai", label: "Open AI Service Canvas", run: () => { setPaletteOpen(false); onOpenHtml?.(); } },
  ];
  const ql = query.trim().toLowerCase();
  const cmdMatches = COMMANDS.filter((c) => !ql || c.label.toLowerCase().includes(ql));
  const nodeMatches = useMemo(() => {
    if (!ql) return [] as WNode[];
    return nodes.filter((n) => {
      const owner = n.type === "agent" && n.ref ? (ctx.agents.find((a) => a.id === n.ref)?.owner || "") : "";
      return [n.label, n.type, n.layer, n.status, n.sub || "", owner].join(" ").toLowerCase().includes(ql);
    }).slice(0, 20);
  }, [ql, nodes, ctx]);
  function runNode(n: WNode) { setPaletteOpen(false); setSel(n.id); if (n.type === "agent" || n.type === "session" || n.type === "mission") fireOpen(n); }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070509] text-tg-text">
      {/* TOP PANEL */}
      <header className="flex flex-wrap items-center gap-2 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🌐 WORLD · ECOSYSTEM MAP</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE</span>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {([["Agents", h.agents], ["Sessions", h.sessions], ["Dialogs", tgChats.filter((c: any) => (c.category === "private")).length], ["Channels", tgChats.filter((c: any) => c.category === "channel" || c.isChannel).length], ["Groups", tgChats.filter((c: any) => c.category === "group").length], ["Bots", tgChats.filter((c: any) => c.category === "bot" || c.isBot).length], ["Contacts", tgContacts.length], ["AI", h.ai], ["Infra", h.infra], ["Missions", h.missions]] as const).map(([l, v]) => (
            <span key={l} className="rounded-full border border-tg-line bg-tg-bg px-2.5 py-1"><span className="text-tg-muted">{l} </span><b>{v}</b></span>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setPaletteOpen(true); setQuery(""); }} className="rounded-lg border border-cyan-500/40 bg-cyan-600/15 px-3 py-1.5 text-xs font-semibold text-cyan-200">⌘K Commands</button>
          <button onClick={reset} className="rounded-lg bg-tg-bg px-3 py-1.5 text-xs ring-1 ring-tg-line hover:text-white">Reset View</button>
          <button onClick={() => onOpenHtml?.()} className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-600/20 px-3 py-1.5 text-xs font-semibold text-fuchsia-200">Open HTML Canvas</button>
          <button onClick={exportSnapshot} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Export World Snapshot ↓</button>
        </div>
      </header>

      {/* FILTERS + VIEW MODES */}
      <div className="flex flex-wrap items-center gap-2 border-b border-tg-line bg-tg-bg/40 px-4 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-tg-muted">Layers:</span>
        {LAYERS.map((l) => (
          <button key={l} onClick={() => { setFilter(l); logAct("filter", "Layer: " + LAYER_LABEL[l]); }} className={`rounded-full px-2.5 py-1 text-[11px] ${filter === l ? "bg-tg-active text-white" : "bg-tg-panel text-tg-muted hover:text-white"}`}>{LAYER_LABEL[l]}</button>
        ))}
        <span className="ml-3 text-[10px] font-bold uppercase tracking-wide text-tg-muted">View:</span>
        {VIEWS.map((v) => (
          <button key={v} onClick={() => { setViewMode(v); logAct("view", "View: " + VIEW_LABEL[v]); }} className={`rounded-full px-2.5 py-1 text-[11px] ${viewMode === v ? "bg-cyan-600 text-white" : "bg-tg-panel text-tg-muted hover:text-white"}`}>{VIEW_LABEL[v]}</button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_310px]">
        <main className="relative min-h-0 overflow-hidden bg-[#0a0712]">
          <div className="absolute left-3 top-3 z-10 flex gap-1">
            <button onClick={() => zoom(0.2)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">+</button>
            <button onClick={() => zoom(-0.2)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">−</button>
            <button onClick={reset} className="rounded-lg bg-tg-panel px-2 text-xs ring-1 ring-tg-line">reset</button>
          </div>
          <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={(e) => down(e)} style={{ backgroundImage: "linear-gradient(rgba(177,77,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(177,77,255,.05) 1px,transparent 1px)", backgroundSize: "30px 30px" }}>
            <div style={{ transform: `translate(${view.tx}px,${view.ty}px) scale(${view.scale})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
              <svg className="pointer-events-none absolute" style={{ overflow: "visible", left: 0, top: 0 }} width="1" height="1">
                {visEdges.map(([a, b], i) => { const pa = P(a), pb = P(b); const onPath = pathEdge(a, b); const onFocus = focusId && (a === focusId || b === focusId); const dim = (focusSet || pathSet) && !onPath && !onFocus; return <line key={i} x1={pa.x + 50} y1={pa.y + 18} x2={pb.x + 50} y2={pb.y + 18} stroke={onPath ? "#fbbf24" : onFocus ? "#ff2d6b" : "rgba(255,45,107,.25)"} strokeWidth={onPath ? 3 : onFocus ? 2 : 1.3} opacity={dim ? 0.12 : 1} />; })}
              </svg>
              {visNodes.map((n) => { const p = P(n.id); const dim = dimNode(n.id); return (
                <div key={n.id} onMouseDown={(e) => down(e, n.id)} onDoubleClick={() => fireOpen(n)} title="Двойной клик — открыть Workspace" className={`absolute w-[104px] cursor-grab rounded-lg border bg-tg-panel px-2 py-1 text-center text-[10px] active:cursor-grabbing ${sel === n.id ? "ring-2 ring-white" : ""} ${pathSet?.has(n.id) ? "ring-2 ring-amber-400" : ""}`} style={{ left: p.x, top: p.y, borderColor: CLR[n.type], opacity: dim ? 0.18 : 1 }}>
                  <div className="truncate font-bold" style={{ color: CLR[n.type] }}><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: STATUS_CLR[n.status] }} />{n.label}</div>
                  <div className="truncate text-tg-muted">{n.sub}</div>
                </div>
              ); })}
            </div>
          </div>
          <div className="absolute bottom-24 right-3 h-28 w-44 overflow-hidden rounded-lg border border-tg-line bg-tg-panel/90">
            <svg width="176" height="112" viewBox="0 0 1700 820">
              {visEdges.map(([a, b], i) => { const pa = P(a), pb = P(b); return <line key={i} x1={pa.x + 50} y1={pa.y + 18} x2={pb.x + 50} y2={pb.y + 18} stroke="rgba(255,45,107,.25)" strokeWidth={3} />; })}
              {visNodes.map((n) => { const p = P(n.id); return <circle key={n.id} cx={p.x + 50} cy={p.y + 18} r={11} fill={CLR[n.type]} />; })}
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 max-h-20 overflow-auto border-t border-tg-line bg-tg-panel/95 px-3 py-1.5">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-tg-accent">Ecosystem Timeline</div>
            <div className="flex flex-wrap gap-2 text-[11px] text-tg-muted">{timeline.map((e, i) => <span key={i} className="rounded bg-tg-bg px-2 py-0.5"><b className="text-tg-text">{e.t || "—"}</b> {e.text}</span>)}</div>
          </div>
        </main>

        {/* NODE INSPECTOR */}
        <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3">
          {/* STATE MEMORY */}
          <div className="mb-2 rounded-xl border border-tg-line bg-tg-bg/40 p-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">World State</div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button onClick={restoreLast} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line hover:text-white">Restore Last View</button>
              <button onClick={restoreDefaultMap} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line hover:text-white">Restore Default Map</button>
              <button onClick={reopenLastNode} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line hover:text-white">Reopen Last Node</button>
              <button onClick={clearState} className="rounded-lg border border-rose-500/40 bg-rose-600/15 px-2 py-1.5 text-[11px] text-rose-200">Clear World State</button>
              <button onClick={exportState} className="rounded-lg bg-cyan-600 px-2 py-1.5 text-[11px] font-semibold text-white">Export State ↓</button>
              <button onClick={() => importRef.current?.click()} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line hover:text-white">Import State ↑</button>
              <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importStateFile(f); e.currentTarget.value = ""; }} />
            </div>
          </div>
          {/* RECENT ACTIVITY */}
          <div className="mb-2 rounded-xl border border-tg-line bg-tg-bg/40 p-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Recent Activity ({activity.length})</div>
            <div className="mt-1 max-h-32 space-y-0.5 overflow-auto text-[11px]">
              {activity.length ? activity.slice(0, 10).map((e, i) => (
                <div key={i} className="flex gap-1.5"><span className="text-tg-muted">{e.t}</span><span className="rounded bg-tg-bg px-1 text-[9px] uppercase text-cyan-300">{e.kind}</span><span className="truncate text-tg-text">{e.text}</span></div>
              )) : <div className="text-tg-muted">Действий пока нет.</div>}
            </div>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Node Inspector</div>
          {sn && inspector ? (
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: CLR[sn.type] }} /><div className="font-bold text-tg-text">{sn.label}</div></div>
              <div className="text-tg-muted">Type: <b className="text-tg-text">{sn.type}</b></div>
              <div className="text-tg-muted">Status: <b style={{ color: STATUS_CLR[sn.status] }}>{sn.status.toUpperCase()}</b></div>
              <div className="text-tg-muted">Owner: <b className="text-tg-text">{inspector.owner}</b></div>
              <div className="text-tg-muted">Linked agent: <b className="text-tg-text">{inspector.linkedAgent}</b></div>
              <div className="text-tg-muted">Linked services: <b className="text-tg-text">{inspector.services.length ? inspector.services.join(", ") : "—"}</b></div>
              <div className="text-tg-muted">Linked Telegram: <b className="text-tg-text">{inspector.sessions.length ? inspector.sessions.join(", ") : "—"}</b></div>
              <div className="text-tg-muted">Last activity: <b className="text-tg-text">{inspector.lastAct}</b></div>
              <div className="mt-2 text-[10px] uppercase tracking-wide text-tg-accent">Available actions</div>
              <button onClick={() => fireOpen(sn)} className="w-full rounded-lg bg-tg-active px-3 py-2 text-xs font-semibold text-white">Open Workspace →</button>
              <div className="grid grid-cols-2 gap-1.5">
                {onOpenHtml && <button onClick={() => onOpenHtml()} className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-600/20 px-2 py-1.5 text-[11px] font-semibold text-fuchsia-200">HTML Canvas</button>}
                <button onClick={() => copyNodeJson(sn)} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Copy Node JSON</button>
                <button onClick={() => focusConnected(sn.id)} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Focus Connected</button>
                <button onClick={() => showPath(sn.id)} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Path → Deepinside</button>
                <button onClick={() => exportNodeSnapshot(sn)} className="col-span-2 rounded-lg bg-cyan-600 px-2 py-1.5 text-[11px] font-semibold text-white">Export Node Snapshot ↓</button>
                {(focusId || pathIds.length) ? <button onClick={() => { setFocusId(""); setPathIds([]); }} className="col-span-2 rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Clear highlight</button> : null}
              </div>
              {pathIds.length > 0 && (
                <div className="mt-2"><div className="text-[10px] uppercase tracking-wide text-amber-400">Path → Deepinside.life ({pathIds.length})</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">{pathIds.map((id, i) => { const c = nodes.find((x) => x.id === id); return <span key={i}><span className="rounded bg-tg-bg px-1.5 py-0.5" style={{ color: c ? CLR[c.type] : "#fff" }}>{c ? c.label : id}</span>{i < pathIds.length - 1 && <span className="px-0.5 text-amber-400">→</span>}</span>; })}</div></div>
              )}
              <div className="mt-2 text-[10px] uppercase tracking-wide text-tg-accent">Connected Nodes ({inspector.conn.length})</div>
              <div className="flex flex-wrap gap-1 text-[11px]">{inspector.conn.slice(0, 16).map((c, i) => <span key={i} className="rounded bg-tg-bg px-1.5 py-0.5" style={{ color: CLR[c.type] }}>{c.label}</span>)}</div>
            </div>
          ) : <div className="mt-2 text-tg-muted">Клик по узлу — детали и действия. Двойной клик — открыть Workspace. ⌘K — Command Palette.</div>}
        </aside>
      </div>

      {/* COMMAND PALETTE */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 pt-24" onMouseDown={() => setPaletteOpen(false)}>
          <div className="w-[560px] max-w-[92vw] overflow-hidden rounded-2xl border border-cyan-500/30 bg-tg-panel shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск: агенты, Telegram, каналы, инфраструктура, AI, миссии, статусы, owners…  или команда"
              className="w-full border-b border-tg-line bg-tg-bg px-4 py-3 text-sm outline-none" />
            <div className="max-h-[52vh] overflow-auto p-2">
              {cmdMatches.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-tg-muted">Commands</div>}
              {cmdMatches.map((c) => (
                <button key={c.id} onClick={() => { setLastCommand(c.label); logAct("command", c.label); c.run(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/60">
                  <span className="text-cyan-300">⌁</span>{c.label}
                </button>
              ))}
              {nodeMatches.length > 0 && <div className="px-2 py-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-tg-muted">Nodes · Global Search ({nodeMatches.length})</div>}
              {nodeMatches.map((n) => (
                <button key={n.id} onClick={() => runNode(n)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/60">
                  <span className="h-2 w-2 rounded-full" style={{ background: CLR[n.type] }} />
                  <span className="font-semibold" style={{ color: CLR[n.type] }}>{n.label}</span>
                  <span className="text-[11px] text-tg-muted">{n.type} · {n.layer}</span>
                  <span className="ml-auto text-[10px]" style={{ color: STATUS_CLR[n.status] }}>{n.status}</span>
                </button>
              ))}
              {ql && cmdMatches.length === 0 && nodeMatches.length === 0 && <div className="px-3 py-3 text-sm text-tg-muted">Ничего не найдено.</div>}
            </div>
            <div className="border-t border-tg-line px-3 py-1.5 text-[10px] text-tg-muted">Enter/клик — выполнить · Esc — закрыть · ⌘K/Ctrl+K — переключить</div>
          </div>
        </div>
      )}
    </div>
  );
}
