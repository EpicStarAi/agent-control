"use client";

// DEEPINSIDE WORLD ENGINE v1.0 — virtual-universe digital model (NOT a game, NOT runtime, NOT Unreal/Unity).
// PREVIEW_ONLY · READ_ONLY · LOCAL_STORAGE_ONLY. No runtime/execution/ADB/RPA/automation/publishing/OAuth/credentials/network/external APIs.
// UI + React + TS + localStorage + mock only. Additive. Separate from existing WorldEngine.tsx (digital-twins world).

import { useEffect, useMemo, useRef, useState } from "react";

const SAFETY = { mode: "PREVIEW_ONLY", read_only: true, local_storage_only: true, execution_allowed: false, network_calls: false, runtime_enabled: false, automation: false, publishing_allowed: false, credentials_stored: false, external_apis: false, game_execution: false, unreal_integration: false, unity_integration: false };

const SECTIONS: [string, string][] = [
  ["overview", "🌍 World Overview"], ["map", "🗺 World Map"], ["relationships", "🕸 Relationship Graph"], ["humans", "🧬 Digital Human City"],
  ["locations", "📍 Locations"], ["districts", "🏙 Districts"], ["studios", "🎙 Virtual Broadcast"], ["buildings", "🏢 Buildings"],
  ["mediazones", "📡 Media Zones"], ["npc", "👥 NPC Registry"], ["timeline", "🕒 World Timeline"], ["assets", "🎨 Asset Library"],
  ["scenegraph", "🎬 Scene Graph"], ["readiness", "🚀 World Readiness"],
];

const DISTRICTS = [
  { id: "core", name: "World Core", emoji: "🌐", purpose: "ядро мира · EPIC OS", readiness: 92, risk: "LOW" },
  { id: "radio", name: "Radio District", emoji: "📻", purpose: "радио и эфиры", readiness: 78, risk: "MEDIUM" },
  { id: "media", name: "Media District", emoji: "🎬", purpose: "медиазавод", readiness: 74, risk: "MEDIUM" },
  { id: "ai", name: "AI District", emoji: "🧠", purpose: "AI-модели и роутер", readiness: 86, risk: "LOW" },
  { id: "human", name: "Digital Human District", emoji: "🧬", purpose: "цифровые сущности", readiness: 70, risk: "MEDIUM" },
  { id: "infra", name: "Infrastructure District", emoji: "🏗", purpose: "VPS/контейнеры/сеть", readiness: 88, risk: "LOW" },
  { id: "creator", name: "Creator District", emoji: "🎨", purpose: "контент и креатив", readiness: 66, risk: "MEDIUM" },
  { id: "innovation", name: "Innovation District", emoji: "⚡", purpose: "эксперименты", readiness: 54, risk: "HIGH" },
  { id: "research", name: "Research District", emoji: "🔬", purpose: "исследования/знания", readiness: 80, risk: "LOW" },
  { id: "city", name: "DEEPINSIDE CITY", emoji: "🏙", purpose: "центральный хаб", readiness: 82, risk: "LOW" },
];
const HUMANS = [
  { id: "eva", name: "EVA NOVIKOVA", emoji: "💠", role: "AI Host", district: "media", readiness: 84, mission: "Night Radio Intro", platforms: ["TikTok", "YouTube", "Telegram"] },
  { id: "buch", name: "BUCH", emoji: "☠️", role: "Founder/Operator", district: "core", readiness: 70, mission: "Cyber Radio", platforms: ["Telegram", "GitHub", "Radio"] },
  { id: "buchiha", name: "BUCHIHA", emoji: "😇", role: "Media Character", district: "creator", readiness: 74, mission: "Neon Sketch", platforms: ["Instagram", "Pinterest", "TikTok"] },
  { id: "nova", name: "NOVA", emoji: "🎧", role: "AI DJ", district: "radio", readiness: 58, mission: "Live Mix", platforms: ["Radio", "Music", "YouTube"] },
  { id: "reporter", name: "AI REPORTER", emoji: "📰", role: "Reporter", district: "media", readiness: 46, mission: "Newsroom", platforms: ["Telegram", "YouTube"] },
  { id: "newscaster", name: "AI NEWSCASTER", emoji: "🎙", role: "Anchor", district: "media", readiness: 44, mission: "Broadcast", platforms: ["YouTube", "Radio"] },
  { id: "lumen", name: "LUMEN", emoji: "✨", role: "Guide NPC (mock)", district: "city", readiness: 30, mission: "Onboarding", platforms: ["Website"] },
  { id: "vega", name: "VEGA", emoji: "🛰", role: "Analyst NPC (mock)", district: "research", readiness: 34, mission: "Insights", platforms: ["Telegram"] },
];
const HUMAN_FACETS = ["Identity", "Personality", "Voice", "Visual", "Knowledge", "Memory", "Skills", "Platforms", "Infrastructure", "Relationships", "Current Mission", "Readiness", "Timeline"];
const STUDIOS = ["Radio Studio", "Podcast Studio", "News Studio", "Video Studio", "Streaming Studio", "Music Studio", "Interview Studio"];
const ASSET_CATS = ["Characters", "Voices", "Buildings", "Rooms", "Furniture", "Equipment", "Media Assets", "Logos", "Scenes", "Vehicles", "Devices"];
const BUILDINGS = ["Radio Tower", "Media HQ", "AI Core Datacenter", "Human Atrium", "Creator Loft", "Broadcast Studio Block", "Research Lab", "Innovation Garage", "Infrastructure Bunker", "City Hall"];
const NPCS = ["LUMEN (Guide)", "VEGA (Analyst)", "ORI (Concierge)", "ZED (Engineer)", "MIRA (Curator)", "KAI (Producer)"];
const MEDIA_ZONES = ["On-Air Radio Zone", "Live Stream Zone", "Sketch Stage", "Newsroom Floor", "Music Hall", "Podcast Booth"];
const TIMELINE = [
  { t: "2026-05", icon: "🌱", text: "World Core + EPIC OS созданы" }, { t: "2026-05", icon: "🏗", text: "Infrastructure District развёрнут (preview)" },
  { t: "2026-05", icon: "🧬", text: "Цифровые сущности EVA/BUCH/BUCHIHA" }, { t: "2026-06", icon: "🎬", text: "Media District + Media Factory" },
  { t: "2026-06", icon: "🌐", text: "Platform Intelligence (20 платформ)" }, { t: "2026-06", icon: "🛂", text: "Runtime Gate + Dry Run governance" },
  { t: "2026-06", icon: "🪐", text: "DEEPINSIDE Platform OS v1.0" }, { t: "2026-06", icon: "🌍", text: "World Engine v1.0 — виртуальная вселенная" },
];

const SC: Record<string, string> = { LOW: "#4ade80", MEDIUM: "#fbbf24", HIGH: "#f87171" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (SC[s] || "#6b7280") + "22", color: SC[s] || "#9ca3af" }}>{s}</span>; }
function Glass({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_4px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">{t}</div>}{children}</div>; }
function rc(v: number) { return v >= 80 ? "#4ade80" : v >= 60 ? "#fbbf24" : "#f87171"; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

export function WorldEngineCenter({ onClose, onOpenAgent }: { onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [sec, setSec] = useState("overview");
  const [selHuman, setSelHuman] = useState("eva");
  const [facet, setFacet] = useState("Identity");
  const [entityWorkspace, setEntityWorkspace] = useState<string | null>(null);
  const [view, setView] = useState({ x: 40, y: 30, k: 0.7 });
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(false);
  const [full, setFull] = useState(false);
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const worldCompletion = Math.round(DISTRICTS.reduce((s, d) => s + d.readiness, 0) / DISTRICTS.length);
  const humansReady = Math.round(HUMANS.reduce((s, h) => s + h.readiness, 0) / HUMANS.length);
  const h = HUMANS.find((x) => x.id === selHuman) || HUMANS[0];

  useEffect(() => {
    const move = (ev: MouseEvent) => { if (pan.current) { const q = pan.current; setView((v) => ({ ...v, x: q.ox + (ev.clientX - q.sx), y: q.oy + (ev.clientY - q.sy) })); } };
    const up = () => (pan.current = null);
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("deepinside.worldEngine.center.v1", JSON.stringify({ ...SAFETY, ts, completion: worldCompletion, districts: DISTRICTS.length, humans: HUMANS.length, sections: SECTIONS.map((s) => s[0]) }));
    localStorage.setItem("deepinside.world.map.v1", JSON.stringify({ ts, districts: DISTRICTS.map((d) => ({ id: d.id, name: d.name, readiness: d.readiness })) }));
    localStorage.setItem("deepinside.world.locations.v1", JSON.stringify({ ts, districts: DISTRICTS, buildings: BUILDINGS }));
    localStorage.setItem("deepinside.world.studios.v1", JSON.stringify({ ts, studios: STUDIOS }));
    localStorage.setItem("deepinside.world.assets.v1", JSON.stringify({ ts, categories: ASSET_CATS }));
    localStorage.setItem("deepinside.world.timeline.v1", JSON.stringify({ ts, events: TIMELINE }));
    localStorage.setItem("deepinside.world.relationships.v1", JSON.stringify({ ts, nodeTypes: ["agent", "entity", "location", "studio", "platform", "server", "content", "project", "risk", "approval"] }));
    localStorage.setItem("deepinside.world.readiness.v1", JSON.stringify({ ts, worldCompletion, humansReady }));
    localStorage.setItem("deepinside.world.digitalHumans.v1", JSON.stringify({ ts, humans: HUMANS.map((x) => ({ id: x.id, name: x.name, readiness: x.readiness })) }));
    localStorage.setItem("deepinside.world.sceneGraph.v1", JSON.stringify({ ts, studios: STUDIOS, mediaZones: MEDIA_ZONES }));
  } catch {} }, [worldCompletion, humansReady]);

  // ---------- shared canvas ----------
  function WorldCanvas({ mode }: { mode: "map" | "relationships" | "entity" | "scene" }) {
    const cx = 580, cy = 380;
    const nodes: any[] = []; const edges: [string, string][] = [];
    if (mode === "map") {
      DISTRICTS.forEach((d, i) => { const ang = (i / DISTRICTS.length) * Math.PI * 2; nodes.push({ id: d.id, label: d.name, x: cx + Math.cos(ang) * 300, y: cy + Math.sin(ang) * 200, hub: true, color: av(d.name) }); });
      DISTRICTS.forEach((d) => { if (d.id !== "core") edges.push(["core", d.id]); });
      DISTRICTS.forEach((d, i) => edges.push([d.id, DISTRICTS[(i + 1) % DISTRICTS.length].id]));
    } else if (mode === "entity") {
      const ent = HUMANS.find((x) => x.id === entityWorkspace) || h;
      nodes.push({ id: ent.id, label: ent.name, x: cx, y: cy, hub: true, color: av(ent.name) });
      const facets = [...HUMAN_FACETS, ...ent.platforms.map((p) => "▷ " + p)];
      facets.forEach((f, i) => { const ang = (i / facets.length) * Math.PI * 2; const nx = cx + Math.cos(ang) * 240, ny = cy + Math.sin(ang) * 160; nodes.push({ id: ent.id + ":" + f, label: f, x: nx, y: ny }); edges.push([ent.id, ent.id + ":" + f]); });
    } else if (mode === "scene") {
      STUDIOS.forEach((s, i) => { const ang = (i / STUDIOS.length) * Math.PI * 2; nodes.push({ id: "st:" + s, label: s, x: cx + Math.cos(ang) * 260, y: cy + Math.sin(ang) * 170, hub: true, color: av(s) }); });
      MEDIA_ZONES.forEach((z, i) => { nodes.push({ id: "mz:" + z, label: z, x: cx + Math.cos(i) * 110, y: cy + Math.sin(i) * 80 }); edges.push(["st:" + STUDIOS[i % STUDIOS.length], "mz:" + z]); });
    } else {
      const groups: [string, string[]][] = [["Agents", HUMANS.slice(0, 6).map((x) => x.name)], ["Entities", HUMANS.map((x) => x.name + " ◆")], ["Locations", DISTRICTS.map((d) => d.name)], ["Studios", STUDIOS], ["Platforms", ["Telegram", "YouTube", "TikTok", "Instagram", "Radio"]], ["Servers", ["VPS", "Docker", "Cloudflare", "GPU"]], ["Content", ["Ideas", "Scripts", "Video", "Posts"]], ["Risks/Approvals", ["Gate", "Consent", "Policy", "Audit"]]];
      groups.forEach((g, gi) => { const ang = (gi / groups.length) * Math.PI * 2; const gx = cx + Math.cos(ang) * 360, gy = cy + Math.sin(ang) * 240; nodes.push({ id: "g:" + g[0], label: g[0], x: gx, y: gy, hub: true, color: av(g[0]) }); g[1].forEach((n, ni) => { const a2 = ang + (ni - g[1].length / 2) * 0.2; nodes.push({ id: g[0] + ":" + n, label: n, x: gx + Math.cos(a2) * 120, y: gy + Math.sin(a2) * 90 }); edges.push(["g:" + g[0], g[0] + ":" + n]); }); });
      for (let i = 0; i < groups.length; i++) edges.push(["g:" + groups[i][0], "g:" + groups[(i + 1) % groups.length][0]]);
    }
    const byId: Record<string, any> = {}; nodes.forEach((n) => (byId[n.id] = n));
    const ql = query.trim().toLowerCase();
    const visible = nodes.filter((n) => (!ql || n.label.toLowerCase().includes(ql)) && (!focus || mode !== "relationships" || n.hub));
    const vis = new Set(visible.map((n) => n.id));
    return <div className="relative min-h-0 flex-1 overflow-hidden" style={{ background: "radial-gradient(1200px 600px at 30% 20%, rgba(124,58,237,.10), transparent), radial-gradient(900px 500px at 80% 80%, rgba(236,72,153,.08), transparent), #06070d", backgroundSize: "auto, auto, " + 30 * view.k + "px " + 30 * view.k + "px" }} onMouseDown={(ev) => (pan.current = { sx: ev.clientX, sy: ev.clientY, ox: view.x, oy: view.y })} onWheel={(ev) => setView((v) => ({ ...v, k: Math.min(2.2, Math.max(0.3, v.k - ev.deltaY * 0.001)) }))}>
      <svg className="absolute inset-0 h-full w-full"><g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>{edges.filter(([a, b]) => vis.has(a) && vis.has(b)).map(([a, b], i) => <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke={byId[a].hub && byId[b].hub ? "rgba(232,121,249,.32)" : "rgba(148,163,184,.14)"} strokeWidth={byId[a].hub && byId[b].hub ? 1.6 : 0.7} />)}{visible.map((n) => <g key={n.id} onClick={(ev) => { ev.stopPropagation(); if (mode === "map" && n.hub) setSec("districts"); if (mode === "relationships" && n.id.startsWith("Entities:")) { } }} style={{ cursor: "pointer" }}><circle cx={n.x} cy={n.y} r={n.hub ? 18 : 8} fill={n.color || "#64748b"} opacity={0.92} stroke={n.hub ? "rgba(255,255,255,.25)" : "none"} strokeWidth={1.5} /><text x={n.x} y={n.y - (n.hub ? 24 : 13)} fill="#e2e8f0" fontSize={n.hub ? 12 : 8} textAnchor="middle">{n.label}</text></g>)}</g></svg>
      <svg width="160" height="110" viewBox="0 0 1160 760" className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/40">{visible.map((n) => <circle key={n.id} cx={n.x} cy={n.y} r={n.hub ? 12 : 6} fill={n.color || "#64748b"} />)}</svg>
      <div className="absolute bottom-3 left-3 flex gap-1">{["+", "−", "⟳"].map((b) => <button key={b} onClick={() => setView((v) => b === "+" ? { ...v, k: Math.min(2.2, v.k + 0.15) } : b === "−" ? { ...v, k: Math.max(0.3, v.k - 0.15) } : { x: 40, y: 30, k: 0.7 })} className="h-7 w-7 rounded bg-white/10 text-white ring-1 ring-white/10 backdrop-blur">{b}</button>)}{mode === "relationships" && <><button onClick={() => setFocus((f) => !f)} className={`h-7 rounded px-2 text-[11px] ring-1 ring-white/10 ${focus ? "bg-fuchsia-600 text-white" : "bg-white/10 text-tg-muted"}`}>Focus</button><button onClick={() => setFull((f) => !f)} className={`h-7 rounded px-2 text-[11px] ring-1 ring-white/10 ${full ? "bg-fuchsia-600 text-white" : "bg-white/10 text-tg-muted"}`}>Full</button></>}</div>
      {(mode === "relationships") && <div className="absolute left-3 top-3"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 поиск узла…" className="w-52 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none backdrop-blur" /></div>}
    </div>;
  }

  function Overview() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{[["World Completion", worldCompletion + "%", rc(worldCompletion)], ["Districts", DISTRICTS.length], ["Digital Humans", HUMANS.length], ["Studios", STUDIOS.length], ["Asset Categories", ASSET_CATS.length], ["Buildings", BUILDINGS.length]].map(([l, v, c]) => <Glass key={l as string}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="mt-1 text-xl font-black" style={{ color: c as string || "#fff" }}>{v}</div></Glass>)}</div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Glass t="DEEPINSIDE World"><div className="text-[13px] text-tg-muted">Виртуальная вселенная DEEPINSIDE как архитектурная цифровая модель: районы, локации, студии, цифровые сущности, медиа-зоны, ассеты и связи. Не игра, не runtime — только preview-модель будущего мира.</div></Glass>
        <Glass t="Districts readiness"><div className="space-y-1">{DISTRICTS.map((d) => <div key={d.id} className="flex items-center gap-2 text-[12px]"><span className="w-44 truncate text-tg-muted">{d.emoji} {d.name}</span><div className="h-2 flex-1 overflow-hidden rounded bg-white/10"><div className="h-full" style={{ width: d.readiness + "%", background: rc(d.readiness) }} /></div><b className="w-8 text-right" style={{ color: rc(d.readiness) }}>{d.readiness}</b></div>)}</div></Glass>
      </div>
    </main>;
  }
  function Locations() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Glass t="Location Registry"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Name", "Type", "Purpose", "Linked agents", "Readiness", "Risk"].map((x) => <th key={x} className="px-2 py-1">{x}</th>)}</tr></thead><tbody>{DISTRICTS.map((d) => <tr key={d.id} className="border-t border-white/5"><td className="px-2 py-1.5 font-semibold">{d.emoji} {d.name}</td><td className="px-2 text-tg-muted">District</td><td className="px-2 text-tg-muted">{d.purpose}</td><td className="px-2 text-tg-muted">{HUMANS.filter((hh) => hh.district === d.id).map((hh) => hh.name).join(", ") || "—"}</td><td className="px-2" style={{ color: rc(d.readiness) }}>{d.readiness}%</td><td className="px-2"><Chip s={d.risk} /></td></tr>)}</tbody></table></Glass></main>;
  }
  function Districts() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{DISTRICTS.map((d) => <Glass key={d.id}><div className="flex items-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ background: av(d.name) }}>{d.emoji}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{d.name}</div><div className="text-[10px] text-tg-muted">{d.purpose}</div></div><Chip s={d.risk} /></div><div className="mt-2 flex items-center gap-2 text-[11px]"><span className="text-tg-muted">readiness</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-white/10"><div className="h-full" style={{ width: d.readiness + "%", background: rc(d.readiness) }} /></div><b style={{ color: rc(d.readiness) }}>{d.readiness}%</b></div><div className="mt-1 text-[10px] text-tg-muted">Residents: {HUMANS.filter((hh) => hh.district === d.id).map((hh) => hh.emoji).join(" ") || "—"}</div></Glass>)}</div></main>;
  }
  function Studios() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] font-bold text-amber-300">Virtual Broadcast Center — цифровые модели студий. Никакого вещания, только preview.</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{STUDIOS.map((s) => <Glass key={s} t={s}><div className="text-[11px] text-tg-muted">Цифровая модель студии. Сцена, оборудование, ведущие — preview.</div><div className="mt-1 flex flex-wrap gap-1 text-[10px]">{["scene", "equipment", "hosts (mock)", "schedule (preview)"].map((x) => <span key={x} className="rounded bg-white/5 px-1.5 py-0.5 text-tg-muted">{x}</span>)}</div></Glass>)}</div></main>;
  }
  function Buildings() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{BUILDINGS.map((b) => <Glass key={b}><div className="flex items-center gap-2"><span className="text-lg">🏢</span><span className="text-[13px] font-semibold">{b}</span></div><div className="mt-1 text-[10px] text-tg-muted">mock building · preview model</div></Glass>)}</div></main>;
  }
  function MediaZones() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{MEDIA_ZONES.map((z) => <Glass key={z}><div className="text-[13px] font-semibold">📡 {z}</div><div className="mt-1 text-[10px] text-tg-muted">media zone · preview only · no broadcast</div></Glass>)}</div></main>;
  }
  function NPC() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Glass t="NPC Registry (mock)"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{NPCS.map((n) => <div key={n} className="rounded-xl border border-white/10 bg-white/5 p-2 text-[12px]"><b>{n}</b><div className="text-[10px] text-tg-muted">non-player digital character · mock</div></div>)}</div></Glass></main>;
  }
  function Timeline() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Glass t="World Timeline · история мира"><div className="space-y-2">{TIMELINE.map((ev, i) => <div key={i} className="flex items-center gap-3"><div className="w-16 text-right text-[11px] font-black text-fuchsia-300">{ev.t}</div><div className="h-2 w-2 rounded-full bg-fuchsia-400" /><div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px]"><span>{ev.icon}</span> <b>{ev.text}</b></div></div>)}</div></Glass></main>;
  }
  function Assets() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Glass t="World Asset Library (mock)"><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">{ASSET_CATS.map((c, i) => <div key={c} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[13px] font-semibold">{c}</div><div className="text-2xl font-black text-fuchsia-300">{[6, 8, 10, 14, 9, 7, 42, 5, 11, 3, 6][i]}</div><div className="text-[9px] text-tg-muted">mock assets</div></div>)}</div></Glass></main>;
  }
  function Readiness() {
    const items: [string, number][] = [["World Completion", worldCompletion], ["Digital Humans", humansReady], ["Infrastructure", 88], ["Media Factory", 64], ["Platform Coverage", 70], ["Identity Coverage", 76]];
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]"><Glass t="World Readiness"><div className="mb-3 flex items-center gap-3"><div className="text-4xl font-black" style={{ color: rc(worldCompletion) }}>{worldCompletion}%</div><div className="text-sm text-tg-muted">общая готовность мира</div></div><div className="space-y-1.5">{items.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-40 text-tg-muted">{l}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-white/10"><div className="h-full" style={{ width: v + "%", background: rc(v) }} /></div><b className="w-9 text-right" style={{ color: rc(v) }}>{v}%</b></div>)}</div></Glass>
      <Glass t="Milestones · Bottlenecks · Risk"><div className="space-y-1.5 text-[12px]"><div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Next milestones:</b> завершить Media District, поднять Digital Human District, расширить Platform Coverage.</div><div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Bottlenecks:</b> Innovation District (54%), Creator District (66%), Media Factory.</div><div className="rounded-lg bg-red-500/10 p-2"><b className="text-red-300">Risk:</b> высокий — Innovation District (эксперименты). Остальное LOW/MEDIUM.</div></div></Glass></div></main>;
  }
  function HumanCity() {
    if (entityWorkspace) {
      const ent = HUMANS.find((x) => x.id === entityWorkspace) || h;
      return <div className="flex min-h-0 flex-1 flex-col"><div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2"><button onClick={() => setEntityWorkspace(null)} className="rounded-lg bg-white/10 px-3 py-1 text-xs">‹ Город</button><span className="text-xl">{ent.emoji}</span><div className="font-black">{ent.name}</div><span className="text-[11px] text-tg-muted">{ent.role} · {ent.readiness}%</span><button onClick={() => onOpenAgent?.(ent.id)} className="ml-auto rounded-lg bg-fuchsia-600 px-3 py-1 text-[11px] font-semibold text-white">Open Agent →</button></div><WorldCanvas mode="entity" /></div>;
    }
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr_300px]">
      <nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">Digital Humans</div>{HUMANS.map((x) => <button key={x.id} onClick={() => setSelHuman(x.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${selHuman === x.id ? "border-fuchsia-400/60 bg-fuchsia-500/10" : "border-white/10 hover:border-fuchsia-400/40"}`}><span className="text-lg">{x.emoji}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{x.name}</div><div className="text-[10px]" style={{ color: rc(x.readiness) }}>{x.readiness}% · {x.role}</div></div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-4"><div className="mb-2 flex flex-wrap gap-1">{HUMAN_FACETS.map((f) => <button key={f} onClick={() => setFacet(f)} className={`rounded-full px-2.5 py-1 text-[11px] ${facet === f ? "bg-fuchsia-600 text-white" : "bg-white/5 text-tg-muted"}`}>{f}</button>)}</div>
        <Glass t={h.name + " · " + facet}>{facet === "Platforms" ? <div className="flex flex-wrap gap-1.5">{h.platforms.map((pl) => <span key={pl} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-tg-muted">{pl}</span>)}</div> : facet === "Current Mission" ? <div className="text-sm">{h.mission}</div> : facet === "Readiness" ? <div className="flex items-center gap-3"><div className="text-3xl font-black" style={{ color: rc(h.readiness) }}>{h.readiness}%</div><div className="text-[12px] text-tg-muted">готовность сущности в мире</div></div> : <div className="text-sm text-tg-muted">{facet} сущности {h.name} (derived/mock, preview).</div>}</Glass>
        <button onClick={() => setEntityWorkspace(h.id)} className="mt-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-sm font-bold text-white">🕸 Открыть рабочую область связей →</button>
      </main>
      <aside className="min-h-0 overflow-auto border-l border-white/10 bg-white/[0.02] p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">🪪 World Passport</div><div className="flex items-center gap-2"><div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: av(h.name) }}>{h.emoji}</div><div><div className="font-black">{h.name}</div><div className="text-[11px] text-tg-muted">{h.role}</div></div></div><div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">{[["District", DISTRICTS.find((d) => d.id === h.district)?.name || "—"], ["Mission", h.mission], ["Readiness", h.readiness + "%"], ["Platforms", h.platforms.length]].map(([l, v]) => <div key={l as string} className="rounded bg-white/5 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div></aside>
    </div>;
  }

  return (
    <div className="fixed inset-0 z-[83] flex flex-col text-tg-text" style={{ background: "linear-gradient(160deg, #0a0b14 0%, #0d0a17 50%, #0a0d16 100%)" }}>
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2 backdrop-blur-xl">
        <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">‹ Назад</button>
        <div className="font-black tracking-wide">🌍 DEEPINSIDE WORLD ENGINE v1.0</div>
        <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">VIRTUAL UNIVERSE · PREVIEW_ONLY</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">READ_ONLY · MOCK</span>
        <div className="ml-auto text-[11px] text-tg-muted">World {worldCompletion}% · {DISTRICTS.length} districts · {HUMANS.length} digital humans</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2">{SECTIONS.map(([id, label]) => <button key={id} onClick={() => { setSec(id); setEntityWorkspace(null); }} className={`mb-0.5 w-full rounded-lg px-2.5 py-2 text-left text-[12px] ${sec === id ? "bg-gradient-to-r from-fuchsia-600/40 to-violet-600/30 text-white font-semibold" : "hover:bg-white/5"}`}>{label}</button>)}
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-2 text-[10px] text-tg-muted"><div className="mb-1 font-black uppercase tracking-[0.18em] text-fuchsia-300/80">World</div><div>Completion: <b style={{ color: rc(worldCompletion) }}>{worldCompletion}%</b></div><div>Humans: <b className="text-tg-text">{HUMANS.length}</b></div><div>Districts: <b className="text-tg-text">{DISTRICTS.length}</b></div></div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "overview" && <Overview />}
          {sec === "map" && <WorldCanvas mode="map" />}
          {sec === "relationships" && <WorldCanvas mode="relationships" />}
          {sec === "humans" && <HumanCity />}
          {sec === "locations" && <Locations />}
          {sec === "districts" && <Districts />}
          {sec === "studios" && <Studios />}
          {sec === "buildings" && <Buildings />}
          {sec === "mediazones" && <MediaZones />}
          {sec === "npc" && <NPC />}
          {sec === "timeline" && <Timeline />}
          {sec === "assets" && <Assets />}
          {sec === "scenegraph" && <WorldCanvas mode="scene" />}
          {sec === "readiness" && <Readiness />}
        </div>
      </div>
    </div>
  );
}
