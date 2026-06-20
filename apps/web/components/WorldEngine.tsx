"use client";

// WORLD ENGINE — central infinite-canvas world map of the whole DEEP INSIDE ecosystem.
// Category: CORE · ACTIVE · CRITICAL. UI + localStorage + derived/mock only. No API/OAuth/secrets/actions. Additive.

import { useEffect, useMemo, useRef, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; devices: any[]; slots: any[]; counts: Record<string, any> };

const LAYERS = ["agents", "platforms", "media", "economy", "devices", "infrastructure"] as const;
type Layer = typeof LAYERS[number];
const LAYER_META: Record<Layer, { label: string; color: string }> = {
  agents: { label: "🤖 AI Agents", color: "#a78bfa" }, platforms: { label: "📱 Platforms", color: "#38bdf8" },
  media: { label: "📻 Media", color: "#fb7185" }, economy: { label: "💰 Economy", color: "#4ade80" },
  devices: { label: "📱 Devices", color: "#fbbf24" }, infrastructure: { label: "🖥 Infrastructure", color: "#f472b6" },
};

const TWINS = [
  { id: "buch", name: "BUCH", emoji: "☠️", role: "AI host (male)", level: "Influencer", score: 78, revenue: 320, followers: 18000, views: 740000, platforms: ["Telegram", "YouTube", "Radio", "Music"], mission: "Cyber Radio Segment" },
  { id: "buchiha", name: "BUCHIHA", emoji: "😇", role: "AI host (female)", level: "Influencer", score: 81, revenue: 410, followers: 21500, views: 910000, platforms: ["Instagram", "Pinterest", "Radio", "Merch"], mission: "Neon Sketch Scene" },
  { id: "eva", name: "EVA NOVIKOVA", emoji: "💠", role: "AI model / host", level: "Media Asset", score: 88, revenue: 560, followers: 32000, views: 1480000, platforms: ["TikTok", "YouTube", "Telegram", "Newsroom"], mission: "Night Radio Intro" },
  { id: "nova", name: "NOVA", emoji: "🎧", role: "AI DJ", level: "Creator", score: 64, revenue: 190, followers: 12500, views: 430000, platforms: ["Radio", "Music Factory", "YouTube"], mission: "Live Mix" },
];
const TWIN_FACETS = ["Identity", "Memory", "Goals", "Knowledge", "Platforms", "Audience", "Content", "Revenue", "Assets", "Schedule", "Projects", "Relationships"];
const PLATFORMS = [
  { id: "telegram", name: "Telegram", followers: 26000, views: 540000, growth: 9, revenue: 380 },
  { id: "tiktok", name: "TikTok", followers: 41000, views: 1900000, growth: 24, revenue: 0 },
  { id: "instagram", name: "Instagram", followers: 23000, views: 720000, growth: 14, revenue: 120 },
  { id: "youtube", name: "YouTube", followers: 38000, views: 2100000, growth: 18, revenue: 640 },
  { id: "facebook", name: "Facebook", followers: 9000, views: 180000, growth: 3, revenue: 40 },
  { id: "x", name: "X", followers: 14000, views: 360000, growth: 7, revenue: 0 },
  { id: "pinterest", name: "Pinterest", followers: 11000, views: 290000, growth: 11, revenue: 30 },
  { id: "linkedin", name: "LinkedIn", followers: 4200, views: 60000, growth: 4, revenue: 0 },
  { id: "website", name: "Website", followers: 6800, views: 150000, growth: 6, revenue: 90 },
];
const DEVICES = [["GeeLark Cloud Phone 01", "online"], ["GeeLark Cloud Phone 02", "online"], ["Android Device", "offline"], ["Cloud Device", "online"], ["Contabo VPS", "online"], ["Workstation", "online"]];
const INFRA = ["Docker", "n8n", "OpenRouter", "Claude", "ChatGPT", "Grok", "Gemini", "ElevenLabs", "HuggingFace", "ComfyUI", "Cloudflare", "Contabo VPS"];
const MEDIA = ["Radio", "Music Factory", "Newsroom", "Live Studio", "Podcasts", "Advertising Factory"];
const ECONOMY = [["Revenue", 2010], ["Sponsors", 760], ["Affiliate", 310], ["Merch", 230], ["Music Income", 520], ["Radio Income", 290], ["Content Income", 235]];
const RELATIONS: [string, string][] = [
  ["buch", "buchiha"], ["buch", "Radio"], ["buch", "YouTube"], ["buchiha", "Instagram"], ["eva", "Newsroom"], ["nova", "Music Factory"], ["Sponsors", "Radio"], ["Revenue", "buch"], ["Revenue", "eva"],
];
const TIMELINE = [
  { t: "09:12", icon: "🎬", text: "EVA — Night Radio Intro: контент собран (preview)" },
  { t: "08:40", icon: "📈", text: "TikTok: +480 подписчиков за сутки" },
  { t: "08:05", icon: "💰", text: "Sponsor NeonHost: кампания ACTIVE (+$280)" },
  { t: "07:30", icon: "📻", text: "Deepinside Radio: Angel Hour в эфире" },
  { t: "06:50", icon: "🆕", text: "Новый проект: BUCHIHA Neon Sketch" },
  { t: "06:10", icon: "⚠️", text: "GeeLark Android Device offline" },
  { t: "05:30", icon: "🎵", text: "NOVA — Neon Pulse: 142k стримов" },
];

const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
const money = (n: number) => "$" + n.toLocaleString("en-US");
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

export function WorldEngine({ ctx, onClose, onOpenAgent }: { ctx: Ctx; onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [view, setView] = useState({ x: 40, y: 40, k: 0.72 });
  const [activeLayers, setActiveLayers] = useState<Record<Layer, boolean>>({ agents: true, platforms: true, media: true, economy: true, devices: true, infrastructure: true });
  const [sel, setSel] = useState<string>("eva");
  const [focus, setFocus] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"world" | "twins" | "command">("world");
  const [twinFacet, setTwinFacet] = useState("Identity");
  const [activationLayer, setActivationLayer] = useState(false);
  const [identityLayer, setIdentityLayer] = useState(false);
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  // Activation Layer: color agent nodes by readiness state from agent_activation_v1 (set by Activation Engine).
  const actMap = useMemo(() => { const m: Record<string, string> = {}; const aa = readLS("agent_activation_v1"); (aa?.agents || []).forEach((x: any) => { m[x.id] = x.state; }); return m; }, [activationLayer]);
  const actColor = (st: string) => ({ "NOT READY": "#f87171", INITIALIZING: "#fb923c", PARTIAL: "#fbbf24", READY: "#facc15", ACTIVE: "#4ade80" } as Record<string, string>)[st] || "#9ca3af";
  // Identity Layer (L11.1): mock/derived identity infra nodes (phone/email/google/device/platforms/content/revenue) per entity.
  const idStatusColor = (s: string) => ({ Mock: "#9ca3af", Ready: "#fbbf24", Connected: "#38bdf8", Live: "#4ade80" } as Record<string, string>)[s] || "#9ca3af";

  const totalRevenue = ECONOMY[0][1] as number;
  const totalAudience = PLATFORMS.reduce((s, p) => s + p.followers, 0);
  const totalAssets = TWINS.length;
  const topAgent = [...TWINS].sort((a, b) => b.score - a.score)[0];
  const topPlatform = [...PLATFORMS].sort((a, b) => b.revenue - a.revenue)[0];

  // ---- build graph nodes ----
  const { nodes, edges, byId } = useMemo(() => {
    const nodes: { id: string; label: string; layer: Layer; x: number; y: number; root?: boolean }[] = [];
    const cx = 620, cy = 420;
    const place = (layer: Layer, items: { id: string; label: string }[], radius: number, ringAngle: number) => {
      items.forEach((it, i) => { const ang = ringAngle + (i / items.length) * Math.PI * 2; nodes.push({ id: it.id, label: it.label, layer, x: cx + Math.cos(ang) * radius, y: cy + Math.sin(ang) * (radius * 0.66), root: layer === "agents" }); });
    };
    place("agents", TWINS.map((t) => ({ id: t.id, label: t.name })), 150, 0);
    place("platforms", PLATFORMS.map((p) => ({ id: p.name, label: p.name })), 360, 0.2);
    place("media", MEDIA.map((m) => ({ id: m, label: m })), 470, 1.1);
    place("economy", ECONOMY.map(([k]) => ({ id: k as string, label: k as string })), 470, 2.4);
    place("devices", DEVICES.map(([d]) => ({ id: d as string, label: (d as string).slice(0, 16) })), 540, 3.6);
    place("infrastructure", INFRA.map((n) => ({ id: n, label: n })), 560, 4.7);
    const byId: Record<string, any> = {}; nodes.forEach((n) => (byId[n.id] = n));
    const edges: [string, string][] = [];
    TWINS.forEach((t) => t.platforms.forEach((p) => { if (byId[p]) edges.push([t.id, p]); }));
    RELATIONS.forEach(([a, b]) => { if (byId[a] && byId[b]) edges.push([a, b]); });
    ECONOMY.forEach(([k]) => { if (byId[k as string] && byId["Revenue"] && k !== "Revenue") edges.push(["Revenue", k as string]); });
    INFRA.slice(0, 4).forEach((n) => byId["Docker"] && edges.push(["Docker", n]));
    return { nodes, edges, byId };
  }, []);

  // ---- Identity Layer graph (additive) ----
  const ID_ENTITIES = useMemo(() => ([
    { id: "buch", name: "BUCH", reality: 78 }, { id: "buchiha", name: "BUCHIHA", reality: 81 }, { id: "eva", name: "EVA NOVIKOVA", reality: 88 },
    { id: "nova", name: "NOVA", reality: 64 }, { id: "reporter", name: "AI REPORTER", reality: 48 }, { id: "newscaster", name: "AI NEWSCASTER", reality: 44 },
  ]), []);
  const ID_SUBS = ["Phone", "Email", "Google", "Device", "Telegram", "YouTube", "Instagram", "TikTok", "Pinterest", "Facebook", "X", "GitHub", "Website", "Content", "Revenue"];
  const idGraph = useMemo(() => {
    const idNodes: any[] = []; const idEdges: [string, string][] = []; const idById: Record<string, any> = {};
    const order = ["Live", "Connected", "Ready", "Mock"];
    ID_ENTITIES.forEach((e, ei) => {
      const anchor = byId[e.id] || { x: 200 + ei * 150, y: 700 };
      // entity identity anchor (reuse map root if present, else create a small entity node)
      const entId = "id:" + e.id;
      idNodes.push({ id: entId, label: e.name, x: anchor.x, y: anchor.y, idn: true, kind: "Entity", entity: e.id, status: e.reality >= 80 ? "Live" : e.reality >= 60 ? "Connected" : "Ready", reality: e.reality, root: true });
      ID_SUBS.forEach((s, si) => {
        const ang = (si / ID_SUBS.length) * Math.PI * 2; const r = 86;
        const nid = "id:" + e.id + ":" + s;
        const status = order[Math.min(3, Math.floor((si + (e.reality >= 80 ? 0 : e.reality >= 60 ? 1 : 2)) / 4))];
        idNodes.push({ id: nid, label: s, x: anchor.x + Math.cos(ang) * r, y: anchor.y + Math.sin(ang) * (r * 0.7), idn: true, kind: s, entity: e.id, status });
        idById[nid] = idNodes[idNodes.length - 1];
      });
      idById[entId] = idNodes[idNodes.length - 1 - ID_SUBS.length];
      const E = (a: string, b: string) => idEdges.push(["id:" + e.id + (a ? ":" + a : ""), "id:" + e.id + ":" + b] as [string, string]);
      ["Phone", "Email", "Device", "Telegram", "Instagram", "TikTok", "Pinterest", "Facebook", "X", "GitHub", "Website"].forEach((p) => idEdges.push([entId, "id:" + e.id + ":" + p]));
      E("Phone", "Google"); E("Google", "YouTube");
      ["Telegram", "YouTube", "Instagram", "TikTok", "Pinterest", "Facebook", "X", "GitHub", "Website"].forEach((p) => idEdges.push(["id:" + e.id + ":" + p, "id:" + e.id + ":Content"]));
      idEdges.push(["id:" + e.id + ":Content", "id:" + e.id + ":Revenue"]);
    });
    return { idNodes, idEdges, idById };
  }, [byId, ID_ENTITIES]);

  const dispNodes = identityLayer ? nodes.concat(idGraph.idNodes) : nodes;
  const dispEdges = identityLayer ? edges.concat(idGraph.idEdges) : edges;
  const dispById = identityLayer ? { ...byId, ...idGraph.idById } : byId;
  const idEntityOf = (id: string) => (id.startsWith("id:") ? id.split(":")[1] : null);
  const visibleNodes = dispNodes.filter((n: any) => (n.idn ? identityLayer : activeLayers[n.layer as keyof typeof activeLayers]) && (!focus || n.id === sel || idEntityOf(n.id) === idEntityOf(sel) || dispEdges.some(([a, b]) => (a === sel && b === n.id) || (b === sel && a === n.id)) || n.id === "Revenue"));
  const visibleIds = new Set(visibleNodes.map((n: any) => n.id));
  const selTwin = TWINS.find((t) => t.id === sel);
  const selIdNode = (idGraph.idById as any)[sel];

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("world_engine_v1", JSON.stringify({ ts, layers: LAYERS, nodes: nodes.length, edges: edges.length }));
    localStorage.setItem("world_canvas_v1", JSON.stringify({ ts, view, focus }));
    localStorage.setItem("world_graph_v1", JSON.stringify({ ts, nodes: nodes.map((n) => ({ id: n.id, layer: n.layer })), edges }));
    localStorage.setItem("digital_twins_v1", JSON.stringify({ ts, twins: TWINS.map((t) => ({ id: t.id, name: t.name, score: t.score, revenue: t.revenue, facets: TWIN_FACETS })) }));
    localStorage.setItem("relationship_engine_v1", JSON.stringify({ ts, relations: edges.length }));
    localStorage.setItem("world_timeline_v1", JSON.stringify({ ts, events: TIMELINE }));
    localStorage.setItem("world_search_v1", JSON.stringify({ ts, indexed: nodes.length }));
    localStorage.setItem("executive_dashboard_v1", JSON.stringify({ ts, totalAssets, totalRevenue, totalAudience, topAgent: topAgent.name, topPlatform: topPlatform.name }));
    localStorage.setItem("world_identity_layer_v1", JSON.stringify({ ts, enabled: identityLayer, entities: ID_ENTITIES.map((e) => e.id), subNodes: ID_SUBS, nodes: idGraph.idNodes.length, edges: idGraph.idEdges.length }));
  } catch {} }, [nodes, edges, view, focus, totalRevenue, totalAudience, identityLayer, idGraph]);

  useEffect(() => {
    const move = (ev: MouseEvent) => { if (pan.current) { const p = pan.current; setView((v) => ({ ...v, x: p.ox + (ev.clientX - p.sx), y: p.oy + (ev.clientY - p.sy) })); } };
    const up = () => (pan.current = null);
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const searchResults = query.trim() ? dispNodes.filter((n: any) => n.label.toLowerCase().includes(query.toLowerCase())).slice(0, 10) : [];

  function WorldCanvas() {
    return <div className="relative min-h-0 flex-1 overflow-hidden bg-[#070a10]"
      style={{ backgroundImage: "radial-gradient(rgba(120,140,200,.07) 1px, transparent 1px)", backgroundSize: 28 * view.k + "px " + 28 * view.k + "px", backgroundPosition: view.x + "px " + view.y + "px" }}
      onMouseDown={(ev) => { pan.current = { sx: ev.clientX, sy: ev.clientY, ox: view.x, oy: view.y }; }}
      onWheel={(ev) => { setView((v) => ({ ...v, k: Math.min(2, Math.max(0.35, v.k - ev.deltaY * 0.001)) })); }}>
      <svg className="absolute inset-0 h-full w-full">
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {dispEdges.filter(([a, b]) => visibleIds.has(a) && visibleIds.has(b)).map(([a, b], i) => { const idE = String(a).startsWith("id:") || String(b).startsWith("id:"); return <line key={i} x1={dispById[a].x} y1={dispById[a].y} x2={dispById[b].x} y2={dispById[b].y} stroke={(a === sel || b === sel) ? "#22d3ee" : idE ? "rgba(34,211,238,.18)" : "rgba(120,140,170,.16)"} strokeWidth={(a === sel || b === sel) ? 2 : 0.8} />; })}
          {visibleNodes.map((n: any) => { const fill = n.idn ? idStatusColor(n.status) : (n.root ? (activationLayer && actMap[n.id] ? actColor(actMap[n.id]) : av(n.label)) : LAYER_META[n.layer as keyof typeof LAYER_META].color); const big = n.root && !n.idn; const isEntId = n.idn && n.kind === "Entity"; return <g key={n.id} onClick={(ev) => { ev.stopPropagation(); setSel(n.id); }} style={{ cursor: "pointer" }}><circle cx={n.x} cy={n.y} r={big ? (sel === n.id ? 22 : 17) : isEntId ? 13 : n.idn ? 6 : 9} fill={fill} stroke={sel === n.id ? "#fff" : "none"} strokeWidth={2} opacity={0.92} /><text x={n.x} y={n.y - (big ? 24 : isEntId ? 18 : 11)} fill="#cbd5e1" fontSize={big ? 12 : isEntId ? 10 : 8} textAnchor="middle">{n.idn && n.kind !== "Entity" ? n.label : n.label}</text></g>; })}
        </g>
      </svg>
      <svg width="170" height="120" viewBox="0 0 1240 840" className="absolute bottom-3 right-3 rounded-lg border border-tg-line bg-tg-bg/80">{visibleNodes.map((n: any) => <circle key={n.id} cx={n.x} cy={n.y} r={n.idn ? (n.kind === "Entity" ? 9 : 5) : n.root ? 12 : 6} fill={n.idn ? idStatusColor(n.status) : n.root ? av(n.label) : LAYER_META[n.layer as keyof typeof LAYER_META].color} />)}</svg>
      <div className="absolute bottom-3 left-3 flex gap-1">{["+", "−", "⟳"].map((b) => <button key={b} onClick={() => setView((v) => b === "+" ? { ...v, k: Math.min(2, v.k + 0.15) } : b === "−" ? { ...v, k: Math.max(0.35, v.k - 0.15) } : { x: 40, y: 40, k: 0.72 })} className="h-7 w-7 rounded bg-[#11151f] text-white ring-1 ring-white/10">{b}</button>)}<button onClick={() => setFocus((f) => !f)} className={`h-7 rounded px-2 text-[11px] ring-1 ring-white/10 ${focus ? "bg-tg-active text-white" : "bg-[#11151f] text-tg-muted"}`}>Focus</button><button onClick={() => setActivationLayer((f) => !f)} className={`h-7 rounded px-2 text-[11px] ring-1 ring-white/10 ${activationLayer ? "bg-emerald-600 text-white" : "bg-[#11151f] text-tg-muted"}`}>🚀 Activation</button><button onClick={() => setIdentityLayer((f) => !f)} className={`h-7 rounded px-2 text-[11px] ring-1 ring-white/10 ${identityLayer ? "bg-cyan-600 text-white" : "bg-[#11151f] text-tg-muted"}`}>🪪 Identity</button></div>
      {activationLayer && <div className="absolute right-3 top-3 rounded-lg border border-tg-line bg-tg-panel/90 px-2 py-1 text-[10px] text-tg-muted">Activation Layer: 🔴 Not Ready · 🟠 Partial · 🟡 Ready · 🟢 Active</div>}
      {identityLayer && <div className="absolute right-3 top-3 rounded-lg border border-tg-line bg-tg-panel/90 px-2 py-1 text-[10px] text-tg-muted" style={{ top: activationLayer ? 44 : 12 }}>🪪 Identity Layer (mock): ⚪ Mock · 🟡 Ready · 🔵 Connected · 🟢 Live</div>}
    </div>;
  }

  function Twins() {
    if (!selTwin) return <Card><div className="text-tg-muted">Выберите сущность.</div></Card>;
    const t = selTwin;
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_320px]">
      <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Digital Twins</div>{TWINS.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${sel === x.id ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><span className="text-lg">{x.emoji}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{x.name}</div><div className="text-[10px] text-tg-muted">{x.level} · score {x.score}</div></div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-3"><div className="mb-2 flex flex-wrap gap-1">{TWIN_FACETS.map((f) => <button key={f} onClick={() => setTwinFacet(f)} className={`rounded-full px-2.5 py-1 text-[11px] ${twinFacet === f ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{f}</button>)}</div>
        <Card t={t.name + " · " + twinFacet}>{twinFacet === "Platforms" ? <div className="flex flex-wrap gap-1.5">{t.platforms.map((p) => <span key={p} className="rounded-full bg-tg-bg px-2.5 py-1 text-[11px] text-tg-muted">{p}</span>)}</div> : twinFacet === "Relationships" ? <div className="space-y-1 text-[12px]">{edges.filter(([a, b]) => a === t.id || b === t.id).map(([a, b], i) => <div key={i}>{a === t.id ? t.name : a} ↔ <b>{a === t.id ? b : t.name}</b></div>)}</div> : twinFacet === "Revenue" ? <div className="text-2xl font-black text-emerald-300">{money(t.revenue)}/mo</div> : twinFacet === "Audience" ? <div className="grid grid-cols-2 gap-2"><div className="rounded bg-tg-bg/40 p-2"><div className="text-[10px] text-tg-muted">Followers</div><b>{t.followers.toLocaleString()}</b></div><div className="rounded bg-tg-bg/40 p-2"><div className="text-[10px] text-tg-muted">Views</div><b>{(t.views / 1000).toFixed(0)}k</b></div></div> : <div className="text-sm text-tg-muted">{twinFacet} двойника {t.name} (derived/mock, preview).</div>}</Card>
      </main>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🪪 Digital Passport</div>
        <div className="flex items-center gap-2"><div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ background: av(t.name) }}>{t.emoji}</div><div><div className="font-black">{t.name}</div><div className="text-[11px] text-tg-muted">{t.role}</div></div></div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[12px]">{[["Status", "ACTIVE"], ["Level", t.level], ["Asset Score", t.score], ["Revenue", money(t.revenue)], ["Followers", t.followers.toLocaleString()], ["Views", (t.views / 1000).toFixed(0) + "k"]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-[10px] text-tg-muted">{l}</div><b>{v}</b></div>)}</div>
        <div className="mt-2 rounded bg-tg-bg/40 p-2 text-[12px]"><b className="text-tg-accent">Current Mission:</b> {t.mission}</div>
        <div className="mt-1 rounded bg-tg-bg/40 p-2 text-[12px]"><b className="text-tg-accent">Goals:</b> рост аудитории, монетизация, контент-план.</div>
        <button onClick={() => onOpenAgent?.(t.id)} className="mt-2 w-full rounded-lg bg-tg-active py-1.5 text-[12px] font-semibold text-white">Open Agent →</button>
      </aside>
    </div>;
  }

  function Command() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-3">
        <Card t="🏛 Executive Command Center"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Total Assets", totalAssets], ["Total Revenue/mo", money(totalRevenue)], ["Total Audience", (totalAudience / 1000).toFixed(0) + "k"], ["Top Agent", topAgent.name], ["Top Platform", topPlatform.name], ["Top Project", "EVA Night Intro"], ["Top Sponsor", "NeonHost"]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-sm font-black">{v}</div></div>)}</div></Card>
        <Card t="🤖 AI COO — операционный обзор"><div className="space-y-1 text-[12px] text-tg-muted"><div>• Инфраструктура: {INFRA.length} сервисов · Docker/n8n/OpenRouter online.</div><div>• Активы: {totalAssets} цифровых двойников · топ {topAgent.name} (score {topAgent.score}).</div><div>• Платформы: {PLATFORMS.length}, суммарно {(totalAudience / 1000).toFixed(0)}k аудитории.</div><div>• Доходы: {money(totalRevenue)}/мес, ведущий канал {topPlatform.name}.</div><div className="text-amber-300">⚠ GeeLark Android Device offline — требует внимания.</div></div></Card>
        <Card t="📱 Platform Layer"><div className="grid gap-1.5 sm:grid-cols-3">{PLATFORMS.map((p) => <div key={p.id} className="rounded bg-tg-bg/40 p-2 text-[11px]"><div className="font-bold">{p.name}</div><div className="text-tg-muted">{(p.followers / 1000).toFixed(0)}k · +{p.growth}% · {money(p.revenue)}</div></div>)}</div></Card>
        <Card t="🖥 Infrastructure Layer"><div className="flex flex-wrap gap-1">{INFRA.map((n) => <span key={n} className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] text-emerald-300">🟢 {n}</span>)}</div></Card>
        <Card t="📱 Device Layer"><div className="grid gap-1.5 sm:grid-cols-2">{DEVICES.map(([d, s]) => <div key={d as string} className="flex items-center justify-between rounded bg-tg-bg/40 px-2 py-1 text-[11px]"><span>{d}</span><span className={s === "online" ? "text-emerald-300" : "text-red-300"}>{s}</span></div>)}</div></Card>
      </div>
      <div className="space-y-3">
        <Card t="📊 World Snapshot"><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-tg-bg/40 p-2"><div className="text-[10px] uppercase text-tg-muted">Revenue/yr</div><div className="text-lg font-black text-emerald-300">{money(totalRevenue * 12)}</div></div><div className="rounded-xl bg-tg-bg/40 p-2"><div className="text-[10px] uppercase text-tg-muted">Audience</div><div className="text-lg font-black text-cyan-300">{(totalAudience / 1000).toFixed(0)}k</div></div></div></Card>
        <Card t="💰 Economy Layer"><div className="space-y-1">{ECONOMY.map(([k, v]) => <div key={k as string} className="flex justify-between text-[12px]"><span className="text-tg-muted">{k}</span><b className="text-emerald-300">{money(v as number)}</b></div>)}</div></Card>
        <Card t="📻 Media Layer"><div className="flex flex-wrap gap-1">{MEDIA.map((m) => <span key={m} className="rounded-full bg-tg-bg px-2 py-0.5 text-[10px] text-tg-muted">{m}</span>)}</div></Card>
        <Card t="🕒 World Timeline"><div className="space-y-1 text-[12px]">{TIMELINE.map((e, i) => <div key={i} className="flex gap-2"><span className="text-tg-muted">{e.t}</span><span>{e.icon}</span><span className="flex-1">{e.text}</span></div>)}</div></Card>
      </div>
    </div></main>;
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🌍 WORLD ENGINE</div>
        <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">CORE · CRITICAL · ACTIVE</span>
        <div className="ml-2 flex overflow-hidden rounded-lg ring-1 ring-tg-line">{([["world", "🌍 World Map"], ["twins", "🧠 Digital Twins"], ["command", "🏛 Command Center"]] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-semibold ${tab === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{label}</button>)}</div>
        <div className="relative ml-auto"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 Глобальный поиск…" className="w-56 rounded-lg border border-tg-line bg-tg-bg px-3 py-1.5 text-xs outline-none" />{searchResults.length > 0 && <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-tg-line bg-tg-panel p-1 shadow-xl">{searchResults.map((r: any) => <button key={r.id} onClick={() => { setSel(r.id); setQuery(""); setTab("world"); if (r.idn) setIdentityLayer(true); }} className="block w-full rounded px-2 py-1 text-left text-[11px] hover:bg-tg-active hover:text-white">{r.idn ? "🪪" : (LAYER_META[r.layer as keyof typeof LAYER_META] ? LAYER_META[r.layer as keyof typeof LAYER_META].label.split(" ")[0] : "•")} {r.label}{r.idn && r.kind !== "Entity" ? " · " + (r.entity || "") : ""}</button>)}</div>}</div>
      </header>

      {tab === "world" && <div className="flex min-h-0 flex-1">
        <nav className="w-44 shrink-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Layers</div>{LAYERS.map((l) => <button key={l} onClick={() => setActiveLayers((s) => ({ ...s, [l]: !s[l] }))} className={`mb-0.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] ${activeLayers[l] ? "bg-tg-bg" : "opacity-40"}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: LAYER_META[l].color }} />{LAYER_META[l].label}</button>)}
          <button onClick={() => setIdentityLayer((f) => !f)} className={`mt-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] ${identityLayer ? "bg-cyan-600/25 text-cyan-200" : "opacity-60 hover:opacity-100"}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#22d3ee" }} />🪪 Identity Layer</button>
          <button onClick={() => setActivationLayer((f) => !f)} className={`mb-0.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] ${activationLayer ? "bg-emerald-600/25 text-emerald-200" : "opacity-60 hover:opacity-100"}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#4ade80" }} />🚀 Activation Layer</button>
          <div className="mt-3 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Snapshot</div>
          <div className="mt-1 space-y-1 px-1 text-[10px] text-tg-muted"><div>Assets: <b className="text-tg-text">{totalAssets}</b></div><div>Revenue: <b className="text-emerald-300">{money(totalRevenue)}</b></div><div>Audience: <b className="text-cyan-300">{(totalAudience / 1000).toFixed(0)}k</b></div><div>Top: <b className="text-tg-text">{topAgent.name}</b></div></div>
        </nav>
        <WorldCanvas />
        <aside className="w-72 shrink-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🪪 Inspector</div>{selIdNode ? <div className="space-y-2"><div className="font-bold">{selIdNode.label}</div><div className="grid grid-cols-2 gap-1.5 text-[11px]">{[["Type", selIdNode.kind], ["Owner", "EPIC☠STAR"], ["Status", selIdNode.status], ["Linked Entity", (ID_ENTITIES.find((e) => e.id === selIdNode.entity) || {}).name || selIdNode.entity], ["Linked Device", "GeeLark (mock)"], ["Linked Platforms", selIdNode.kind === "Entity" ? "9" : "—"], ["Reality Score", (ID_ENTITIES.find((e) => e.id === selIdNode.entity) || {}).reality + "%"]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b style={{ color: l === "Status" ? idStatusColor(selIdNode.status) : undefined }}>{v}</b></div>)}</div><div className="rounded border border-cyan-500/30 bg-cyan-500/5 p-2 text-[10px] text-cyan-300">Identity-узел (mock). Без реальных номеров/email/OAuth.</div></div> : selTwin ? <div className="space-y-2"><div className="flex items-center gap-2"><span className="text-xl">{selTwin.emoji}</span><div><div className="font-bold">{selTwin.name}</div><div className="text-[10px] text-tg-muted">{selTwin.role} · {selTwin.level}</div></div></div><div className="grid grid-cols-2 gap-1.5 text-[11px]">{[["Score", selTwin.score], ["Revenue", money(selTwin.revenue)], ["Followers", selTwin.followers.toLocaleString()], ["Mission", selTwin.mission]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div><button onClick={() => setTab("twins")} className="w-full rounded-lg bg-tg-active py-1.5 text-[12px] font-semibold text-white">Открыть двойника →</button></div> : <div className="text-sm text-tg-muted">Узел: <b>{sel}</b><div className="mt-1 text-[11px]">Связанные сущности подсвечены на карте. Включите Focus для изоляции.</div></div>}
          <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🕒 Timeline</div><div className="mt-1 space-y-1 text-[11px]">{TIMELINE.slice(0, 5).map((e, i) => <div key={i} className="flex gap-1.5"><span className="text-tg-muted">{e.t}</span><span>{e.icon}</span><span className="flex-1 text-tg-muted">{e.text}</span></div>)}</div>
        </aside>
      </div>}

      {tab === "twins" && <Twins />}
      {tab === "command" && <Command />}
    </div>
  );
}
