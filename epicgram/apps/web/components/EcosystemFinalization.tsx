"use client";

// DEEPINSIDE ECOSYSTEM v1.0 COMPLETE — finalization layer uniting StoryVerse, MediaVerse, Social Universe,
// Audience Engine, Campaign Engine, KnowledgeVerse, Digital Twin Center, Ecosystem Map + CEO View.
// PREVIEW_ONLY · READ_ONLY · LOCAL_STORAGE_ONLY · mock. No runtime/execution/ADB/RPA/automation/publishing/OAuth/
// credentials/tokens/webhooks/network/external APIs/Unreal/Unity/game. Additive. Per-entity personal canvas.

import { useEffect, useRef, useState } from "react";
import { ENTITIES_FULL, DISTRICTS_FULL, MEDIA_UNIVERSES, ENCYCLOPEDIA, TWIN_NAMES_FULL, PERSONA_FIELDS, PERSONA_EXT_FIELDS, WORLD_MEMORY, COMPLETION, AUDIENCE_SEGMENTS, CAMPAIGNS as CAMPAIGNS_FULL, MONETIZATION, CONTENT_TYPES, entityAchievements, entityStatus, entityPersonaExt, contentMatrix, PRODUCTION, RUNTIME_TRANSITION, CEO_MASTER, productionScore, runtimeGateReport, runtimeGateMarkdown, runtimeGateCEO, persistContent } from "./deepinsideContent";

const SAFETY = { mode: "PREVIEW_ONLY", read_only: true, local_storage_only: true, execution_allowed: false, network_calls: false, runtime_enabled: false, automation: false, publishing_allowed: false, credentials_stored: false, external_integrations: false, unreal_runtime: false, unity_runtime: false, game_execution: false };

const SECTIONS: [string, string][] = [
  ["map", "🌐 Ecosystem Map"], ["ceo", "👑 CEO View"], ["story", "📖 StoryVerse"], ["media", "🎬 MediaVerse"],
  ["social", "📡 Social Universe"], ["audience", "👥 Audience Engine"], ["campaigns", "📣 Campaign Engine"],
  ["knowledge", "📚 KnowledgeVerse"], ["twins", "🪞 Digital Twin Center"], ["entity", "🧬 Entity Workspace"],
  ["manual", "📕 Operating Manual"], ["audit", "✅ Completion Audit"], ["production", "🚀 Production R"],
];

const ENTITIES = [
  { id: "eva", name: "EVA NOVIKOVA", emoji: "💠", role: "AI Host", readiness: 84, followers: 32000, mission: "Night Radio Intro", origin: "Рождена как ночной радио-голос DEEPINSIDE.", platforms: ["TikTok", "YouTube", "Telegram"] },
  { id: "buch", name: "BUCH", emoji: "☠️", role: "Founder/Operator", readiness: 70, followers: 18000, mission: "Cyber Radio", origin: "Оператор и основатель, киберпанк-архетип.", platforms: ["Telegram", "GitHub", "Radio"] },
  { id: "buchiha", name: "BUCHIHA", emoji: "😇", role: "Media Character", readiness: 74, followers: 21500, mission: "Neon Sketch", origin: "Неоновый ангел медиасцены.", platforms: ["Instagram", "Pinterest", "TikTok"] },
  { id: "nova", name: "NOVA", emoji: "🎧", role: "AI DJ", readiness: 58, followers: 12500, mission: "Live Mix", origin: "Экспериментальный DJ-двойник.", platforms: ["Radio", "Music", "YouTube"] },
  { id: "reporter", name: "AI REPORTER", emoji: "📰", role: "Reporter", readiness: 46, followers: 8600, mission: "Newsroom", origin: "Фактовый новостной голос.", platforms: ["Telegram", "YouTube"] },
  { id: "newscaster", name: "AI NEWSCASTER", emoji: "🎙", role: "Anchor", readiness: 44, followers: 7400, mission: "Broadcast", origin: "Авторитетный ведущий выпусков.", platforms: ["YouTube", "Radio"] },
];
const STORY_FACETS = ["Origin Story", "Biography", "Life Events", "Milestones", "Achievements", "Relationships", "Character Arc", "Future Roadmap", "Mission History", "Story Timeline"];
const MEDIA_KINDS: [string, number][] = [["Videos", 24], ["Shorts", 58], ["Streams", 9], ["Podcasts", 7], ["Radio Shows", 14], ["News", 31], ["Posts", 86], ["Campaigns", 6], ["Series", 4], ["Projects", 11]];
const SOCIAL = [
  { id: "telegram", name: "Telegram", aud: 26000, growth: 9, eng: 7.4, readiness: 84 }, { id: "tiktok", name: "TikTok", aud: 41000, growth: 24, eng: 8.1, readiness: 70 },
  { id: "youtube", name: "YouTube", aud: 38000, growth: 18, eng: 6.8, readiness: 78 }, { id: "instagram", name: "Instagram", aud: 23000, growth: 14, eng: 7.0, readiness: 66 },
  { id: "facebook", name: "Facebook", aud: 9000, growth: 3, eng: 3.2, readiness: 50 }, { id: "x", name: "X", aud: 14000, growth: 7, eng: 4.1, readiness: 54 },
  { id: "discord", name: "Discord", aud: 6000, growth: 11, eng: 9.0, readiness: 58 }, { id: "website", name: "Website", aud: 6800, growth: 6, eng: 2.5, readiness: 64 },
  { id: "blog", name: "Blog", aud: 3200, growth: 4, eng: 3.0, readiness: 48 }, { id: "email", name: "Email", aud: 2100, growth: 5, eng: 12.0, readiness: 60 },
];
const AUDIENCE = { Segments: ["Cyber youth", "AI enthusiasts", "Music fans", "Tech creators"], Communities: ["DEEP INSIDE core", "Radio listeners", "Sketch fans"], Interests: ["AI", "Music", "Cyberpunk", "News"], Regions: ["EU", "CIS", "Global"], Languages: ["RU", "EN", "UA"], Personas: ["Night Listener", "Creator", "Fan"] };
const CAMPAIGNS = [
  { id: "c1", name: "EVA Night Launch", goal: "awareness", channels: ["YouTube", "TikTok", "Telegram"], status: "READY_PREVIEW", perf: 64 },
  { id: "c2", name: "Sponsor Wave Q3", goal: "revenue", channels: ["Telegram", "YouTube"], status: "NEEDS_REVIEW", perf: 52 },
  { id: "c3", name: "BUCHIHA Sketch Push", goal: "growth", channels: ["TikTok", "Instagram"], status: "READY_PREVIEW", perf: 70 },
  { id: "c4", name: "Radio Brand Story", goal: "brand", channels: ["Radio", "Telegram"], status: "DRAFT", perf: 40 },
  { id: "c5", name: "Newsroom Trust", goal: "trust", channels: ["YouTube", "Telegram"], status: "DRAFT", perf: 44 },
  { id: "c6", name: "NOVA Mix Series", goal: "engagement", channels: ["Music", "YouTube"], status: "NEEDS_REVIEW", perf: 56 },
];
const KNOWLEDGE: [string, number][] = [["Documents", 28], ["Prompts", 64], ["Knowledge", 40], ["Research", 12], ["Ideas", 22], ["Scripts", 18], ["Assets", 42], ["Playbooks", 7], ["Guides", 9], ["Templates", 11]];
const TWIN_FACETS = ["Identity Twin", "Voice Twin", "Visual Twin", "Personality Twin", "Knowledge Twin", "Memory Twin", "Platform Twin", "Infrastructure Twin", "Media Twin", "Relationship Twin", "Timeline Twin", "Readiness Twin"];

const SC: Record<string, string> = { READY_PREVIEW: "#4ade80", NEEDS_REVIEW: "#fbbf24", DRAFT: "#9ca3af", BLOCKED: "#f87171" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (SC[s] || "#6b7280") + "22", color: SC[s] || "#9ca3af" }}>{s}</span>; }
function Glass({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_4px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">{t}</div>}{children}</div>; }
function rc(v: number) { return v >= 80 ? "#4ade80" : v >= 60 ? "#fbbf24" : "#f87171"; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

export function EcosystemFinalization({ onClose, onOpenAgent }: { onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [sec, setSec] = useState("map");
  const [prodTab, setProdTab] = useState("blueprint");
  const [selEntity, setSelEntity] = useState("eva");
  const [storyFacet, setStoryFacet] = useState("Origin Story");
  const [twinFacet, setTwinFacet] = useState("Identity Twin");
  const [entityTab, setEntityTab] = useState("story");
  const [view, setView] = useState({ x: 40, y: 30, k: 0.66 });
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(false);
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const e = ENTITIES.find((x) => x.id === selEntity) || ENTITIES[0];
  const entReady = COMPLETION.scores.entity;
  const socReady = COMPLETION.scores.platform;
  const overall = COMPLETION.finalScore;

  useEffect(() => {
    const move = (ev: MouseEvent) => { if (pan.current) { const q = pan.current; setView((v) => ({ ...v, x: q.ox + (ev.clientX - q.sx), y: q.oy + (ev.clientY - q.sy) })); } };
    const up = () => (pan.current = null);
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("deepinside.ecosystem.v1.complete", JSON.stringify({ ...SAFETY, ts, overall, entities: ENTITIES.length, sections: SECTIONS.map((s) => s[0]) }));
    localStorage.setItem("deepinside.storyverse.v1", JSON.stringify({ ts, entities: ENTITIES.map((x) => x.id), facets: STORY_FACETS }));
    localStorage.setItem("deepinside.mediaverse.v1", JSON.stringify({ ts, kinds: MEDIA_KINDS }));
    localStorage.setItem("deepinside.socialUniverse.v1", JSON.stringify({ ts, platforms: SOCIAL.map((x) => ({ id: x.id, readiness: x.readiness })) }));
    localStorage.setItem("deepinside.audienceEngine.v1", JSON.stringify({ ts, segments: AUDIENCE.Segments.length }));
    localStorage.setItem("deepinside.campaignEngine.v1", JSON.stringify({ ts, campaigns: CAMPAIGNS.map((c) => ({ id: c.id, status: c.status })) }));
    localStorage.setItem("deepinside.knowledgeUniverse.v1", JSON.stringify({ ts, kinds: KNOWLEDGE }));
    localStorage.setItem("deepinside.digitalTwinCenter.v1", JSON.stringify({ ts, entities: ENTITIES.map((x) => x.id), twins: TWIN_FACETS }));
    localStorage.setItem("deepinside.ecosystemMap.v1", JSON.stringify({ ts, verses: ["Platform OS", "World Engine", "StoryVerse", "MediaVerse", "KnowledgeVerse", "Audience", "Campaign", "Digital Twins"] }));
    localStorage.setItem("deepinside.ceoView.v1", JSON.stringify({ ts, overall, entReady, socReady }));
    persistContent();
  } catch {} }, [overall]);
  const audit = persistContent();

  function Canvas({ mode }: { mode: "map" | "entity" }) {
    const cx = 600, cy = 400; const nodes: any[] = []; const edges: [string, string][] = [];
    if (mode === "map") {
      const verses: [string, string[]][] = [["Platform OS", ["Platforms", "Infra", "Blueprints"]], ["World Engine", ["Districts", "Studios", "City"]], ["StoryVerse", ENTITIES.slice(0, 4).map((x) => x.name)], ["MediaVerse", MEDIA_KINDS.slice(0, 5).map((m) => m[0])], ["KnowledgeVerse", ["Docs", "Prompts", "Playbooks"]], ["Audience", AUDIENCE.Segments], ["Campaign", CAMPAIGNS.slice(0, 4).map((c) => c.name.split(" ")[0])], ["Digital Twins", ENTITIES.slice(0, 4).map((x) => x.name + " ◆")]];
      verses.forEach((g, gi) => { const ang = (gi / verses.length) * Math.PI * 2; const gx = cx + Math.cos(ang) * 360, gy = cy + Math.sin(ang) * 250; nodes.push({ id: "v:" + g[0], label: g[0], x: gx, y: gy, hub: true, color: av(g[0]) }); g[1].forEach((n, ni) => { const a2 = ang + (ni - g[1].length / 2) * 0.22; nodes.push({ id: g[0] + ":" + n, label: n, x: gx + Math.cos(a2) * 125, y: gy + Math.sin(a2) * 92 }); edges.push(["v:" + g[0], g[0] + ":" + n]); }); });
      for (let i = 0; i < verses.length; i++) edges.push(["v:" + verses[i][0], "v:" + verses[(i + 1) % verses.length][0]]);
    } else {
      nodes.push({ id: e.id, label: e.name, x: cx, y: cy, hub: true, color: av(e.name) });
      const facets: [string, string[]][] = [["Story", STORY_FACETS.slice(0, 4)], ["Content", ["Videos", "Shorts", "Posts"]], ["Relationships", ENTITIES.filter((x) => x.id !== e.id).slice(0, 3).map((x) => x.name)], ["Assets", ["Voice", "Visual", "Logo"]], ["Knowledge", ["Docs", "Prompts"]], ["Platforms", e.platforms], ["Infrastructure", ["Device", "VPS"]], ["Audience", ["Segment", "Region"]], ["Digital Twin", ["Identity", "Voice", "Memory"]]];
      facets.forEach((g, gi) => { const ang = (gi / facets.length) * Math.PI * 2; const gx = cx + Math.cos(ang) * 250, gy = cy + Math.sin(ang) * 175; nodes.push({ id: "f:" + g[0], label: g[0], x: gx, y: gy, hub: true, color: av(g[0]) }); edges.push([e.id, "f:" + g[0]]); g[1].forEach((n, ni) => { const a2 = ang + (ni - g[1].length / 2) * 0.3; nodes.push({ id: g[0] + ":" + n, label: n, x: gx + Math.cos(a2) * 80, y: gy + Math.sin(a2) * 60 }); edges.push(["f:" + g[0], g[0] + ":" + n]); }); });
    }
    const byId: Record<string, any> = {}; nodes.forEach((n) => (byId[n.id] = n));
    const ql = query.trim().toLowerCase();
    const visible = nodes.filter((n) => (!ql || n.label.toLowerCase().includes(ql)) && (!focus || n.hub));
    const vis = new Set(visible.map((n) => n.id));
    return <div className="relative min-h-0 flex-1 overflow-hidden" style={{ background: "radial-gradient(1200px 600px at 25% 15%, rgba(124,58,237,.10), transparent), radial-gradient(900px 500px at 85% 85%, rgba(34,211,238,.07), transparent), #06070d", backgroundSize: "auto, auto, " + 30 * view.k + "px " + 30 * view.k + "px" }} onMouseDown={(ev) => (pan.current = { sx: ev.clientX, sy: ev.clientY, ox: view.x, oy: view.y })} onWheel={(ev) => setView((v) => ({ ...v, k: Math.min(2.2, Math.max(0.3, v.k - ev.deltaY * 0.001)) }))}>
      <svg className="absolute inset-0 h-full w-full"><g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>{edges.filter(([a, b]) => vis.has(a) && vis.has(b)).map(([a, b], i) => <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke={byId[a].hub && byId[b].hub ? "rgba(232,121,249,.32)" : "rgba(148,163,184,.13)"} strokeWidth={byId[a].hub && byId[b].hub ? 1.6 : 0.7} />)}{visible.map((n) => <g key={n.id} style={{ cursor: "pointer" }}><circle cx={n.x} cy={n.y} r={n.hub ? 18 : 8} fill={n.color || "#64748b"} opacity={0.92} stroke={n.hub ? "rgba(255,255,255,.22)" : "none"} strokeWidth={1.5} /><text x={n.x} y={n.y - (n.hub ? 24 : 13)} fill="#e2e8f0" fontSize={n.hub ? 12 : 8} textAnchor="middle">{n.label}</text></g>)}</g></svg>
      <svg width="160" height="110" viewBox="0 0 1200 800" className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/40">{visible.map((n) => <circle key={n.id} cx={n.x} cy={n.y} r={n.hub ? 12 : 6} fill={n.color || "#64748b"} />)}</svg>
      <div className="absolute bottom-3 left-3 flex gap-1">{["+", "−", "⟳"].map((b) => <button key={b} onClick={() => setView((v) => b === "+" ? { ...v, k: Math.min(2.2, v.k + 0.15) } : b === "−" ? { ...v, k: Math.max(0.3, v.k - 0.15) } : { x: 40, y: 30, k: 0.66 })} className="h-7 w-7 rounded bg-white/10 text-white ring-1 ring-white/10 backdrop-blur">{b}</button>)}<button onClick={() => setFocus((f) => !f)} className={`h-7 rounded px-2 text-[11px] ring-1 ring-white/10 ${focus ? "bg-fuchsia-600 text-white" : "bg-white/10 text-tg-muted"}`}>Focus</button></div>
      <div className="absolute left-3 top-3"><input value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="🔎 поиск узла…" className="w-52 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none backdrop-blur" /></div>
    </div>;
  }

  function CEO() {
    const items: [string, number][] = [["Общая готовность", overall], ["Сущности", entReady], ["Платформы", socReady], ["Инфраструктура", 88], ["Медиазавод", 64], ["Контент", 66], ["Знания", 70], ["Аудитории", 62]];
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Project Readiness", overall + "%", rc(overall)], ["Cost (est)", "$50-120/mo"], ["Top Risk", "Innovation/Premium"], ["Next Stage", "Real integrations (gated)"]].map(([l, v, c]) => <Glass key={l as string}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="mt-1 text-lg font-black" style={{ color: c as string || "#fff" }}>{v}</div></Glass>)}</div>
      <div className="grid gap-3 lg:grid-cols-2"><Glass t="CEO View · готовность по слоям"><div className="space-y-1.5">{items.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-40 text-tg-muted">{l}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-white/10"><div className="h-full" style={{ width: v + "%", background: rc(v) }} /></div><b className="w-9 text-right" style={{ color: rc(v) }}>{v}%</b></div>)}</div></Glass>
      <Glass t="Риски · Узкие места · Следующие этапы"><div className="space-y-1.5 text-[12px]"><div className="rounded-lg bg-red-500/10 p-2"><b className="text-red-300">Риски:</b> платформенные политики (TikTok/IG), Premium revenue, Innovation District.</div><div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Узкие места:</b> медиазавод (64%), аудитории (62%), контент (66%).</div><div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Следующие этапы:</b> расширить контент/кампании, поднять платформ-readiness, governance-гейты, затем — реальные интеграции через Runtime Gate.</div></div></Glass></div></main>;
  }
  function Story() {
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]"><nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">Entities</div>{ENTITIES.map((x) => <button key={x.id} onClick={() => setSelEntity(x.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${selEntity === x.id ? "border-fuchsia-400/60 bg-fuchsia-500/10" : "border-white/10 hover:border-fuchsia-400/40"}`}><span className="text-lg">{x.emoji}</span><div className="truncate text-sm font-semibold">{x.name}</div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-4"><div className="mb-2 flex flex-wrap gap-1">{STORY_FACETS.map((f) => <button key={f} onClick={() => setStoryFacet(f)} className={`rounded-full px-2.5 py-1 text-[11px] ${storyFacet === f ? "bg-fuchsia-600 text-white" : "bg-white/5 text-tg-muted"}`}>{f}</button>)}</div>
        <Glass t={e.name + " · " + storyFacet}>{storyFacet === "Origin Story" ? <div className="text-sm">{e.origin}</div> : storyFacet === "Mission History" ? <div className="text-sm">{e.mission} (current) · предыдущие миссии — preview.</div> : storyFacet === "Relationships" ? <div className="space-y-1 text-[12px]">{ENTITIES.filter((x) => x.id !== e.id).map((x) => <div key={x.id}>{e.name} ↔ <b>{x.name}</b></div>)}</div> : <div className="text-sm text-tg-muted">{storyFacet} сущности {e.name} (mock/preview).</div>}</Glass>
        <button onClick={() => { setSec("entity"); setEntityTab("story"); }} className="mt-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-sm font-bold text-white">🧬 Открыть Entity Workspace →</button></main></div>;
  }
  function Media() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Glass t="MediaVerse · контент как объекты мира"><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">{MEDIA_KINDS.map(([k, n]) => <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[12px] font-semibold">{k}</div><div className="text-2xl font-black text-cyan-300">{n}</div><div className="text-[9px] text-tg-muted">preview objects</div></div>)}</div></Glass></main>;
  }
  function Social() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Glass t="Social Universe"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Platform", "Audience", "Growth", "Engagement", "Readiness"].map((x) => <th key={x} className="px-2 py-1">{x}</th>)}</tr></thead><tbody>{SOCIAL.map((s) => <tr key={s.id} className="border-t border-white/5"><td className="px-2 py-1.5 font-semibold">{s.name}</td><td className="px-2">{(s.aud / 1000).toFixed(0)}k</td><td className="px-2 text-emerald-300">+{s.growth}%</td><td className="px-2">{s.eng}</td><td className="px-2" style={{ color: rc(s.readiness) }}>{s.readiness}%</td></tr>)}</tbody></table></Glass></main>;
  }
  function Audience() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(AUDIENCE).map(([k, arr]) => <Glass key={k} t={k}><div className="flex flex-wrap gap-1.5">{(arr as string[]).map((a) => <span key={a} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-tg-muted">{a}</span>)}</div></Glass>)}</div></main>;
  }
  function Campaigns() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Glass t="Campaign Engine (preview · no publishing)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Campaign", "Goal", "Channels", "Performance", "Status"].map((x) => <th key={x} className="px-2 py-1">{x}</th>)}</tr></thead><tbody>{CAMPAIGNS.map((c) => <tr key={c.id} className="border-t border-white/5"><td className="px-2 py-1.5 font-semibold">{c.name}</td><td className="px-2 text-tg-muted">{c.goal}</td><td className="px-2 text-tg-muted">{c.channels.join(", ")}</td><td className="px-2" style={{ color: rc(c.perf) }}>{c.perf}%</td><td className="px-2"><Chip s={c.status} /></td></tr>)}</tbody></table></Glass></main>;
  }
  function Knowledge() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Glass t="KnowledgeVerse · единая память"><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">{KNOWLEDGE.map(([k, n]) => <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[12px] font-semibold">{k}</div><div className="text-2xl font-black text-fuchsia-300">{n}</div><div className="text-[9px] text-tg-muted">mock items</div></div>)}</div></Glass></main>;
  }
  function Twins() {
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]"><nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">Entities</div>{ENTITIES.map((x) => <button key={x.id} onClick={() => setSelEntity(x.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${selEntity === x.id ? "border-fuchsia-400/60 bg-fuchsia-500/10" : "border-white/10 hover:border-fuchsia-400/40"}`}><span className="text-lg">{x.emoji}</span><div className="truncate text-sm font-semibold">{x.name}</div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-4"><div className="mb-2 flex flex-wrap gap-1">{TWIN_FACETS.map((f) => <button key={f} onClick={() => setTwinFacet(f)} className={`rounded-full px-2.5 py-1 text-[11px] ${twinFacet === f ? "bg-fuchsia-600 text-white" : "bg-white/5 text-tg-muted"}`}>{f}</button>)}</div>
        <Glass t={e.name + " · " + twinFacet}><div className="text-sm text-tg-muted">{twinFacet} — полный цифровой двойник аспекта сущности {e.name} (mock/preview, read-only).</div></Glass>
        <div className="mt-2"><Glass t="Digital Passport"><div className="grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-3">{TWIN_FACETS.map((f) => <div key={f} className="rounded bg-white/5 p-1.5"><div className="text-tg-muted">{f}</div><b className="text-emerald-300">configured</b></div>)}</div></Glass></div></main></div>;
  }
  function EntityWorkspace() {
    const tabs = [["story", "📖 Story"], ["content", "🎬 Content"], ["relationships", "🔗 Relationships"], ["assets", "🎨 Assets"], ["knowledge", "📚 Knowledge"], ["platforms", "📡 Platforms"], ["infra", "🏗 Infrastructure"], ["audience", "👥 Audience"], ["twin", "🪞 Digital Twin"], ["canvas", "🕸 Personal Canvas"]];
    return <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2"><span className="text-xl">{e.emoji}</span><div className="font-black">{e.name}</div><span className="text-[11px] text-tg-muted">{e.role} · {e.readiness}% · {e.followers.toLocaleString()} followers</span><button onClick={() => onOpenAgent?.(e.id)} className="ml-auto rounded-lg bg-fuchsia-600 px-3 py-1 text-[11px] font-semibold text-white">Open Agent →</button></div>
      <div className="flex flex-wrap gap-1 border-b border-white/10 px-3 py-1.5">{tabs.map(([id, label]) => <button key={id} onClick={() => setEntityTab(id)} className={`rounded-lg px-2.5 py-1 text-[11px] ${entityTab === id ? "bg-fuchsia-600 text-white" : "bg-white/5 text-tg-muted"}`}>{label}</button>)}</div>
      {entityTab === "canvas" ? <Canvas mode="entity" /> : <main className="min-h-0 flex-1 overflow-auto p-4"><Glass t={e.name + " · " + (tabs.find((t) => t[0] === entityTab)?.[1] || "")}>{entityTab === "story" ? <div className="text-sm">{e.origin} · миссия: {e.mission}.</div> : entityTab === "platforms" ? <div className="flex flex-wrap gap-1.5">{e.platforms.map((pl) => <span key={pl} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-tg-muted">{pl}</span>)}</div> : entityTab === "relationships" ? <div className="space-y-1 text-[12px]">{ENTITIES.filter((x) => x.id !== e.id).map((x) => <div key={x.id}>{e.name} ↔ <b>{x.name}</b></div>)}</div> : entityTab === "audience" ? <div className="text-sm">{e.followers.toLocaleString()} followers · segments: Cyber youth, AI enthusiasts.</div> : entityTab === "twin" ? <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-3">{TWIN_FACETS.map((f) => <div key={f} className="rounded bg-white/5 p-1.5"><div className="text-tg-muted">{f}</div><b className="text-emerald-300">ok</b></div>)}</div> : <div className="text-sm text-tg-muted">{tabs.find((t) => t[0] === entityTab)?.[1]} сущности {e.name} (mock/preview).</div>}</Glass>
        <div className="mt-2 text-[11px] text-tg-muted">Персональная рабочая область сущности · вкладка «🕸 Personal Canvas» открывает отдельное бесконечное полотно связей.</div></main>}
    </div>;
  }

  function Manual() {
    const me = ENTITIES_FULL.find((x) => x.id === selEntity) || ENTITIES_FULL[0];
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">
      <nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">Энциклопедия</div>{ENCYCLOPEDIA.map(([k]) => <div key={k} className="rounded px-2 py-1 text-[11px] text-tg-muted">📄 {k}</div>)}<div className="mt-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">Сущности</div>{ENTITIES_FULL.map((x) => <button key={x.id} onClick={() => setSelEntity(x.id)} className={`mb-0.5 flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] ${selEntity === x.id ? "bg-fuchsia-500/15 text-white" : "text-tg-muted hover:text-white"}`}>{x.emoji} {x.name}</button>)}</nav>
      <main className="min-h-0 overflow-auto p-4">
        <Glass t="Operating Manual · если открываешь DEEPINSIDE впервые">
          <div className="space-y-2">{ENCYCLOPEDIA.map(([title, body]) => <div key={title} className="rounded-lg border border-white/10 bg-white/5 p-2.5"><div className="text-[12px] font-bold text-fuchsia-200">{title}</div><div className="mt-0.5 text-[12px] text-tg-muted">{body}</div></div>)}</div>
        </Glass>
        <div className="mt-3"><Glass t={"Полный профиль · " + me.name + " (19 полей)"}>
          <div className="grid gap-1.5 sm:grid-cols-2">{([["Identity", me.identity], ["Biography", me.biography], ["Origin Story", me.origin], ["Personality", me.personality], ["Voice", me.voice], ["Visual Style", me.visual], ["Knowledge", me.knowledge], ["Memory", me.memory], ["Skills", me.skills.join(" · ")], ["Goals", me.goals.join(" · ")], ["Mission", me.mission], ["Relationships", me.relationships.join(" · ")], ["Infrastructure", me.infrastructure], ["Platforms", me.platforms.join(", ")], ["Media Presence", me.mediaPresence], ["World Passport", me.passport], ["Readiness", me.readiness + "%"]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="text-[9px] uppercase text-fuchsia-300/70">{l}</div><div className="mt-0.5">{v}</div></div>)}</div>
          <div className="mt-2"><div className="text-[9px] uppercase text-fuchsia-300/70">Timeline</div><div className="mt-0.5 space-y-0.5 text-[11px] text-tg-muted">{me.timeline.map((tl, i) => <div key={i}><b className="text-tg-text">{tl.t}</b> · {tl.e}</div>)}</div></div>
          <div className="mt-2"><div className="text-[9px] uppercase text-fuchsia-300/70">Digital Twin (12)</div><div className="mt-0.5 flex flex-wrap gap-1">{TWIN_NAMES_FULL.map((tn) => <span key={tn} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-tg-muted" title={me.twins[tn]}>{tn} ✓</span>)}</div></div>
        </Glass></div>
        <div className="mt-3"><Glass t={"Persona · " + me.name + " (Big Five + 14 черт)"}>
          <div className="grid gap-1.5 sm:grid-cols-3">{PERSONA_FIELDS.map((pf) => <div key={pf} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="text-[9px] uppercase text-fuchsia-300/70">{pf}</div><div className="mt-0.5">{me.persona?.[pf]}</div></div>)}</div>
          <div className="mt-2"><div className="text-[9px] uppercase text-fuchsia-300/70">Core Values</div><div className="mt-0.5 flex flex-wrap gap-1">{(me.values || []).map((v) => <span key={v} className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] text-fuchsia-200">{v}</span>)}</div></div>
        </Glass></div>
        <div className="mt-3"><Glass t={"Social Graph · " + me.name + " (без пустых связей)"}>
          <div className="grid gap-1.5 sm:grid-cols-3">{Object.entries(me.links || {}).map(([cat, arr]) => <div key={cat} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="text-[9px] uppercase text-fuchsia-300/70">{cat} ({arr.length})</div><div className="mt-0.5 text-tg-muted">{arr.join(" · ")}</div></div>)}</div>
        </Glass></div>
        <div className="mt-3"><Glass t={"World Memory · timeline мира (" + WORLD_MEMORY.length + " событий)"}>
          <div className="space-y-0.5 text-[11px]">{WORLD_MEMORY.map((w, i) => <div key={i} className="flex gap-2"><span className="w-20 shrink-0 text-fuchsia-300/70">{w.t}</span><span className="w-32 shrink-0 text-tg-muted">{w.type}</span><span>{w.e}</span></div>)}</div>
        </Glass></div>
        <div className="mt-3"><Glass t="Мир · районы (полное наполнение)"><div className="grid gap-2 sm:grid-cols-2">{DISTRICTS_FULL.map((d) => <div key={d.id} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="font-bold">{d.emoji} {d.name}</div><div className="text-tg-muted">{d.desc}</div><div className="mt-0.5 text-[10px] text-tg-muted">Assets: {d.assets.join(", ")} · Residents: {d.entities.join(", ")} · Roadmap: {d.roadmap}</div></div>)}</div></Glass></div>
        <div className="mt-3"><Glass t="Медиа-вселенные (8)"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{MEDIA_UNIVERSES.map((m) => <div key={m.id} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="font-bold">{m.name}</div><div className="text-[10px] text-tg-muted">Pillars: {m.pillars.join(", ")}</div><div className="text-[10px] text-tg-muted">Series: {m.series.join(", ")} · {m.audience} · assets {m.assets}</div></div>)}</div></Glass></div>
        <div className="mt-3"><Glass t={"Extended Persona · " + me.name + " (routine/logic/profiles)"}>
          <div className="mb-1 text-[11px] text-tg-muted">Status: <b className="text-emerald-300">{entityStatus(me.id)}</b></div>
          <div className="grid gap-1.5 sm:grid-cols-3">{PERSONA_EXT_FIELDS.map((pf) => <div key={pf} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="text-[9px] uppercase text-fuchsia-300/70">{pf}</div><div className="mt-0.5">{entityPersonaExt(me.id)[pf]}</div></div>)}</div>
          <div className="mt-2"><div className="text-[9px] uppercase text-fuchsia-300/70">Achievements</div><div className="mt-0.5 flex flex-wrap gap-1">{entityAchievements(me.id).map((a) => <span key={a} className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-200">🏆 {a}</span>)}</div></div>
        </Glass></div>
        <div className="mt-3"><Glass t={"Content Matrix · " + me.name}><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">{Object.entries(contentMatrix(me.id)).map(([c, n]) => <div key={c} className="rounded-lg bg-white/5 p-2 text-center text-[11px]"><div className="text-base font-black text-fuchsia-200">{n}</div><div className="text-[9px] text-tg-muted">{c}</div></div>)}</div></Glass></div>
        <div className="mt-3"><Glass t={"Audience (" + AUDIENCE_SEGMENTS.length + " сегментов)"}><div className="grid gap-2 sm:grid-cols-2">{AUDIENCE_SEGMENTS.map((a) => <div key={a.name} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="font-bold">{a.name} · {a.persona}</div><div className="text-[10px] text-tg-muted">Langs {a.langs.join("/")} · {a.regions.join(", ")} · {a.engagement} · entities: {a.entities.join(", ")}</div><div className="text-[10px] text-tg-muted">Interests: {a.interests.join(", ")} · growth {a.growth}</div></div>)}</div></Glass></div>
        <div className="mt-3"><Glass t={"Campaigns (" + CAMPAIGNS_FULL.length + ")"}><div className="grid gap-2 sm:grid-cols-2">{CAMPAIGNS_FULL.map((c) => <div key={c.name} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="font-bold">{c.name} <span className="text-emerald-300">· {c.readiness}%</span></div><div className="text-[10px] text-tg-muted">Goal: {c.goal} · {c.audience} · {c.channels.join("/")} · {c.timeline}</div><div className="text-[10px] text-tg-muted">Content: {c.content} · perf {c.perf} · deps {c.deps.join(", ")}</div></div>)}</div></Glass></div>
        <div className="mt-3"><Glass t={"Monetization · симуляция (" + MONETIZATION.length + " потоков)"}><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">{MONETIZATION.map((m) => <div key={m.name} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="font-bold">{m.name}</div><div className="text-[10px] text-tg-muted">{m.model}</div><div className="text-[10px] text-tg-muted">{m.entities.join(", ")} · {m.readiness}%</div></div>)}</div><div className="mt-1 text-[9px] text-emerald-300/80">Симуляция · без реальных платежей/транзакций.</div></Glass></div>
      </main>
    </div>;
  }
  function Audit() {
    const sc: any = COMPLETION.scores; const rows: [string, number][] = [["Entity Readiness", sc.entity], ["Persona Readiness", sc.persona], ["Platform Readiness", sc.platform], ["World Readiness", sc.world], ["Media Readiness", sc.media], ["Audience Readiness", sc.audience], ["Campaign Readiness", sc.campaign], ["Knowledge Readiness", sc.knowledge], ["Infrastructure Readiness", sc.infrastructure], ["Digital Twin Readiness", sc.digitalTwin]];
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"><div className="text-5xl font-black" style={{ color: rc(audit.finalScore) }}>{audit.finalScore}%</div><div><div className="text-[11px] uppercase text-tg-muted">Final Ecosystem Score</div><div className="text-lg font-black text-fuchsia-200">DIGITAL OPERATING ECOSYSTEM</div><div className="text-[11px] text-emerald-300">naполнение завершено · PREVIEW_ONLY</div></div><div className="ml-auto rounded-xl border border-emerald-400/40 px-4 py-2 text-center"><div className="text-[10px] uppercase text-tg-muted">Status</div><div className="text-lg font-black text-emerald-300">READY</div></div></div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Glass t="Completion Audit · готовность по слоям"><div className="space-y-1.5">{rows.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-44 text-tg-muted">{l}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-white/10"><div className="h-full" style={{ width: v + "%", background: rc(v) }} /></div><b className="w-9 text-right" style={{ color: rc(v) }}>{v}%</b></div>)}</div></Glass>
        <Glass t="Completion Audit · наполнение"><div className="space-y-1 text-[12px]">{[["Сущности", ENTITIES_FULL.length + " × 19 полей + 12 twins"], ["Районы мира", DISTRICTS_FULL.length + " (purpose/desc/assets/entities/history/roadmap)"], ["Медиа-вселенные", MEDIA_UNIVERSES.length + " (pillars/series/formats/audience/assets)"], ["Энциклопедия", ENCYCLOPEDIA.length + " разделов Operating Manual"], ["Digital Twins", "12 на сущность, все заполнены"]].map(([l, v]) => <div key={l} className="rounded-lg bg-white/5 p-2"><b className="text-fuchsia-200">{l}:</b> {v}</div>)}</div></Glass>
      </div>
      <div className="mt-3"><Glass t="Final Audit · покрытие (нулевые пробелы)"><div className="grid gap-1.5 sm:grid-cols-3">{Object.entries(COMPLETION.coverage).map(([k, v]) => <div key={k} className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-2 text-[11px]"><span className="text-tg-muted">{k}</span><b className="text-emerald-300">{v} ✓</b></div>)}</div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-3 text-[11px]"><div className="rounded-lg bg-white/5 p-2"><b className="text-fuchsia-200">Relationship Coverage:</b> {COMPLETION.relationshipCoverage}/9 категорий</div><div className="rounded-lg bg-white/5 p-2"><b className="text-fuchsia-200">World Memory:</b> {COMPLETION.worldMemoryEvents} событий</div><div className="rounded-lg bg-white/5 p-2"><b className="text-fuchsia-200">Operating Manual:</b> {COMPLETION.manualSections} разделов</div></div></Glass></div>
      <div className="mt-3"><Glass t="Success Criteria · Ω"><div className="grid gap-1 sm:grid-cols-2 text-[11px]">{["нет пустых профилей", "нет сущностей без памяти", "нет сущностей без отношений", "нет сущностей без цифрового двойника", "нет районов без истории", "нет платформ без контента", "нет знаний без описания", "нет узлов без связей", "Completion Audit = 100%", "Final Ecosystem Score = 100%"].map((c) => <div key={c} className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-200">✓ {c}</div>)}</div></Glass></div>
      <div className="mt-3 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-3 text-center text-[12px] font-black text-fuchsia-200">DEEPINSIDE ECOSYSTEM STATUS: COMPLETE · Ω</div>
    </main>;
  }

  function dl(name: string, text: string, type: string) { try { const b = new Blob([text], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); } catch {} }
  const STBAD: Record<string, string> = { READY: "bg-emerald-500/20 text-emerald-300", PARTIAL: "bg-amber-500/20 text-amber-300", BLOCKED: "bg-rose-500/20 text-rose-300", NOT_STARTED: "bg-white/10 text-tg-muted" };
  const RKBAD: Record<string, string> = { low: "bg-emerald-500/15 text-emerald-300", med: "bg-amber-500/15 text-amber-300", high: "bg-orange-500/15 text-orange-300", critical: "bg-rose-500/20 text-rose-300" };
  function GateReport() {
    const r = runtimeGateReport(); const es = r.executiveSummary;
    const copy = () => { try { navigator.clipboard.writeText(JSON.stringify(r, null, 2)); } catch {} };
    return <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
        <div className="text-4xl font-black" style={{ color: rc(es.currentScore) }}>{es.currentScore}%</div>
        <div><div className="text-[11px] uppercase text-tg-muted">Current → Target Production</div><div className="text-base font-black text-fuchsia-200">{es.currentScore}% → {es.targetScore}%</div><div className="text-[10px] text-amber-300">BLUEPRINT_ONLY · execution_allowed: false · network_calls: false</div></div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={copy} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">📋 Copy JSON</button>
          <button onClick={() => dl("deepinside-runtime-gate.json", JSON.stringify(r, null, 2), "application/json")} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">⬇ JSON</button>
          <button onClick={() => dl("deepinside-runtime-gate.md", runtimeGateMarkdown(), "text/markdown")} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">⬇ Markdown</button>
          <button onClick={() => dl("deepinside-ceo-report.md", runtimeGateCEO(), "text/markdown")} className="rounded-lg bg-fuchsia-600/30 px-2.5 py-1.5 text-[11px] hover:bg-fuchsia-600/50">👑 CEO Report</button>
        </div>
      </div>
      <Glass t="1 · Executive Summary"><div className="grid gap-2 sm:grid-cols-2 text-[11px]">
        <div className="rounded-lg bg-emerald-500/10 p-2"><b className="text-emerald-300">Готово:</b> {es.ready.join(" · ")}</div>
        <div className="rounded-lg bg-rose-500/10 p-2"><b className="text-rose-300">Блокирует runtime:</b> {es.blockers.join(" · ")}</div>
        <div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Запускать первым:</b> {es.launchFirst.join(", ")}</div>
        <div className="rounded-lg bg-white/5 p-2"><b className="text-fuchsia-200">Чеклист:</b> {Object.entries(es.checklistCounts).map(([k, v]) => k + " " + v).join(" · ")}</div>
      </div></Glass>
      <Glass t="2 · Roadmap 90 / 180 / 365"><div className="grid gap-2 lg:grid-cols-3 text-[11px]">
        {([["90 дней", r.roadmap.d90], ["180 дней", r.roadmap.d180], ["365 дней", r.roadmap.d365]] as [string, string[]][]).map(([t, arr]) => <div key={t} className="rounded-lg bg-white/5 p-2"><div className="font-bold text-fuchsia-200">{t}</div>{arr.map((x) => <div key={x} className="text-tg-muted">· {x}</div>)}</div>)}
      </div></Glass>
      <Glass t="3 · Runtime Gate Checklist (15 категорий)"><div className="overflow-auto"><table className="w-full text-[10.5px]"><thead><tr className="text-fuchsia-300/70">{["Категория", "Status", "Risk", "Owner", "Action", "Proof", "Eff", "Dep"].map((h) => <th key={h} className="px-1 py-0.5 text-left font-bold">{h}</th>)}</tr></thead><tbody>{r.checklist.map((c) => <tr key={c.cat} className="border-t border-white/5"><td className="px-1 py-0.5 text-tg-text">{c.cat}</td><td className="px-1 py-0.5"><span className={"rounded px-1 py-0.5 text-[9px] font-bold " + STBAD[c.status]}>{c.status}</span></td><td className="px-1 py-0.5"><span className={"rounded px-1 py-0.5 text-[9px] " + RKBAD[c.risk]}>{c.risk}</span></td><td className="px-1 py-0.5 text-tg-muted">{c.owner}</td><td className="px-1 py-0.5 text-tg-muted">{c.action}</td><td className="px-1 py-0.5 text-tg-muted">{c.proof}</td><td className="px-1 py-0.5 text-tg-muted">{c.effort}</td><td className="px-1 py-0.5 text-tg-muted">{c.dep}</td></tr>)}</tbody></table></div></Glass>
      <Glass t="4 · Gap Analysis"><div className="overflow-auto"><table className="w-full text-[10.5px]"><thead><tr className="text-fuchsia-300/70">{["Area", "Now", "Target", "Gap", "Prio", "Risk", "Next"].map((h) => <th key={h} className="px-1 py-0.5 text-left font-bold">{h}</th>)}</tr></thead><tbody>{r.gapAnalysis.map((g) => <tr key={g.area} className="border-t border-white/5"><td className="px-1 py-0.5 text-tg-text">{g.area}</td><td className="px-1 py-0.5 text-tg-muted">{g.now}</td><td className="px-1 py-0.5 text-tg-muted">{g.target}</td><td className="px-1 py-0.5 text-tg-muted">{g.gap}</td><td className="px-1 py-0.5"><b className="text-fuchsia-300">{g.prio}</b></td><td className="px-1 py-0.5"><span className={"rounded px-1 text-[9px] " + RKBAD[g.risk]}>{g.risk}</span></td><td className="px-1 py-0.5 text-tg-muted">{g.next}</td></tr>)}</tbody></table></div></Glass>
      <Glass t="5 · Launch Candidate Matrix"><div className="grid gap-2 sm:grid-cols-2">{r.launchCandidates.map((c) => <div key={c.name} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="flex items-center justify-between"><b className="text-fuchsia-200">{c.name}</b><span style={{ color: rc(c.readiness) }} className="font-black">{c.readiness}%</span></div><div className="mt-0.5 h-1.5 overflow-hidden rounded bg-white/10"><div className="h-full" style={{ width: c.readiness + "%", background: rc(c.readiness) }} /></div><div className="mt-1 text-[10px] text-tg-muted">Infra: {c.infra} · ⛔ {c.blockedBy}</div><div className="text-[10px] text-tg-muted">Safe: {c.safeMode} · 💰 {c.monet}</div></div>)}</div></Glass>
      <Glass t="6 · Runtime Approval Packet (preview)"><div className="grid gap-2 sm:grid-cols-2 text-[11px]">
        <div className="rounded-lg bg-white/5 p-2 sm:col-span-2"><b className="text-fuchsia-200">Scope:</b> {r.approvalPacket.scope}</div>
        <div className="rounded-lg bg-emerald-500/10 p-2"><b className="text-emerald-300">Allowed:</b> {r.approvalPacket.allowed.join("; ")}</div>
        <div className="rounded-lg bg-rose-500/10 p-2"><b className="text-rose-300">Forbidden:</b> {r.approvalPacket.forbidden.join("; ")}</div>
        <div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Human approval:</b> {r.approvalPacket.humanApproval.join("; ")}</div>
        <div className="rounded-lg bg-white/5 p-2"><b className="text-fuchsia-200">API keys:</b> {r.approvalPacket.apiKeys.join("; ")}</div>
        <div className="rounded-lg bg-sky-500/10 p-2 sm:col-span-2"><b className="text-sky-300">Rollback:</b> {r.approvalPacket.rollback}</div>
      </div></Glass>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">Safety: {Object.entries(r.safety).map(([k, v]) => k + "=" + v).join(" · ")}</div>
    </div>;
  }
  function Production() {
    const ps = productionScore(); const L = ps.layers;
    const bar = (v: number) => <div className="h-2 flex-1 overflow-hidden rounded bg-white/10"><div className="h-full" style={{ width: v + "%", background: rc(v) }} /></div>;
    if (prodTab === "report") return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-3 flex gap-1.5">{[["blueprint", "📊 Blueprint"], ["report", "🛂 Runtime Gate Master Plan Report"]].map(([id, lb]) => <button key={id} onClick={() => setProdTab(id)} className={`rounded-lg px-3 py-1.5 text-[12px] ${prodTab === id ? "bg-gradient-to-r from-fuchsia-600/40 to-violet-600/30 text-white font-semibold" : "bg-white/5 hover:bg-white/10"}`}>{lb}</button>)}</div><GateReport /></main>;
    const card = (title: string, rows: any[], cols: [string, (r: any) => any][]) => <Glass t={title}><div className="overflow-auto"><table className="w-full text-[10.5px]"><thead><tr className="text-fuchsia-300/70">{cols.map(([h]) => <th key={h} className="px-1 py-0.5 text-left font-bold">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-white/5">{cols.map(([h, fn], j) => <td key={j} className="px-1 py-0.5 align-top text-tg-muted">{fn(r)}</td>)}</tr>)}</tbody></table></div></Glass>;
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex gap-1.5">{[["blueprint", "📊 Blueprint"], ["report", "🛂 Runtime Gate Master Plan Report"]].map(([id, lb]) => <button key={id} onClick={() => setProdTab(id)} className={`rounded-lg px-3 py-1.5 text-[12px] ${prodTab === id ? "bg-gradient-to-r from-fuchsia-600/40 to-violet-600/30 text-white font-semibold" : "bg-white/5 hover:bg-white/10"}`}>{lb}</button>)}</div>
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
        <div className="text-5xl font-black" style={{ color: rc(ps.final) }}>{ps.final}%</div>
        <div><div className="text-[11px] uppercase text-tg-muted">Final Production Score</div><div className="text-lg font-black text-fuchsia-200">PREVIEW → PRODUCTION BLUEPRINT</div><div className="text-[11px] text-amber-300">цифровая модель 100% · production {ps.final}% · BLUEPRINT_ONLY (без runtime)</div></div>
        <div className="ml-auto rounded-xl border border-amber-400/40 px-4 py-2 text-center"><div className="text-[10px] uppercase text-tg-muted">Gate</div><div className="text-lg font-black text-amber-300">PLANNED</div></div>
      </div>
      <div className="mb-3"><Glass t="Production Readiness · по слоям"><div className="space-y-1.5">{Object.entries(L).map(([k, v]) => <div key={k} className="flex items-center gap-2 text-[12px]"><span className="w-40 text-tg-muted">{k}</span>{bar(v as number)}<b className="w-9 text-right" style={{ color: rc(v as number) }}>{v as number}%</b></div>)}</div></Glass></div>
      <div className="grid gap-3 lg:grid-cols-2">
        {card("R1 · Infrastructure", PRODUCTION.infrastructure, [["Узел", (r) => r.name], ["Now→Target", (r) => r.cur + " → " + r.tgt], ["Risk", (r) => r.risk], ["%", (r) => <b style={{ color: rc(r.ready) }}>{r.ready}</b>]])}
        {card("R2 · Platforms", PRODUCTION.platforms, [["Платформа", (r) => r.name], ["Purpose", (r) => r.purpose], ["Personas", (r) => r.personas], ["%", (r) => <b style={{ color: rc(r.ready) }}>{r.ready}</b>]])}
      </div>
      <div className="mt-3"><Glass t="R3 · Digital Human Production Readiness"><div className="overflow-auto"><table className="w-full text-[10.5px]"><thead><tr className="text-fuchsia-300/70"><th className="px-1 text-left">Сущность</th>{Object.keys(PRODUCTION.digitalHumans[0].dims).map((d) => <th key={d} className="px-1">{d}</th>)}</tr></thead><tbody>{PRODUCTION.digitalHumans.map((h) => <tr key={h.name} className="border-t border-white/5"><td className="px-1 py-0.5 text-tg-text">{h.name}</td>{Object.values(h.dims).map((v, i) => <td key={i} className="px-1 py-0.5 text-center"><b style={{ color: rc(v) }}>{v}</b></td>)}</tr>)}</tbody></table></div></Glass></div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {card("R4 · Media Factory", PRODUCTION.mediaFactory, [["Этап", (r) => r.stage], ["In→Out", (r) => r.in + " → " + r.out], ["%", (r) => <b style={{ color: rc(r.ready) }}>{r.ready}</b>]])}
        {card("R7 · Revenue", PRODUCTION.revenue, [["Поток", (r) => r.name], ["Model", (r) => r.model], ["%", (r) => <b style={{ color: rc(r.ready) }}>{r.ready}</b>]])}
      </div>
      <div className="mt-3"><Glass t="R8 · Runtime Gate Master Plan"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">{([["✅ Готово", RUNTIME_TRANSITION.ready, "emerald"], ["⛔ Не готово", RUNTIME_TRANSITION.notReady, "rose"], ["🔍 Проверить", RUNTIME_TRANSITION.needsVerification, "amber"], ["🧱 Инфра", RUNTIME_TRANSITION.needsInfra, "sky"], ["🔌 Интеграции", RUNTIME_TRANSITION.needsIntegration, "violet"], ["🎬 Контент", RUNTIME_TRANSITION.needsContent, "fuchsia"], ["👥 Аудитории", RUNTIME_TRANSITION.needsAudience, "cyan"], ["💰 Монетизация", RUNTIME_TRANSITION.needsMonetization, "lime"]] as [string, string[], string][]).map(([t, arr]) => <div key={t} className="rounded-lg bg-white/5 p-2"><div className="mb-1 font-bold text-fuchsia-200">{t}</div>{arr.map((x) => <div key={x} className="text-tg-muted">· {x}</div>)}</div>)}</div></Glass></div>
      <div className="mt-3"><Glass t="CEO Master Report · Roadmap & Risks"><div className="grid gap-2 lg:grid-cols-3 text-[11px]">
        <div className="rounded-lg bg-white/5 p-2"><div className="font-bold text-fuchsia-200">Next 90 days</div>{CEO_MASTER.next90.map((x) => <div key={x} className="text-tg-muted">· {x}</div>)}</div>
        <div className="rounded-lg bg-white/5 p-2"><div className="font-bold text-fuchsia-200">Next 180 days</div>{CEO_MASTER.next180.map((x) => <div key={x} className="text-tg-muted">· {x}</div>)}</div>
        <div className="rounded-lg bg-white/5 p-2"><div className="font-bold text-fuchsia-200">Next 365 days</div>{CEO_MASTER.next365.map((x) => <div key={x} className="text-tg-muted">· {x}</div>)}</div>
      </div><div className="mt-2 grid gap-2 sm:grid-cols-2 text-[11px]"><div className="rounded-lg bg-rose-500/10 p-2"><b className="text-rose-300">Risks:</b> {CEO_MASTER.risks.join(" · ")}</div><div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Bottlenecks:</b> {CEO_MASTER.bottlenecks.join(" · ")}</div></div></Glass></div>
      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center text-[12px] font-black text-amber-200">DEEPINSIDE · PRODUCTION BLUEPRINT READY · BLUEPRINT_ONLY (без runtime/execution/integrations)</div>
    </main>;
  }

  return (
    <div className="fixed inset-0 z-[84] flex flex-col text-tg-text" style={{ background: "linear-gradient(160deg, #090a12 0%, #0c0916 50%, #090c15 100%)" }}>
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2 backdrop-blur-xl">
        <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">‹ Назад</button>
        <div className="font-black tracking-wide">🌠 DEEPINSIDE ECOSYSTEM v1.0 COMPLETE</div>
        <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">UNIFIED · PREVIEW_ONLY</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">READ_ONLY · MOCK</span>
        <div className="ml-auto text-[11px] text-tg-muted">Project {overall}% · {ENTITIES.length} entities · 8 verses</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2">{SECTIONS.map(([id, label]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-2 text-left text-[12px] ${sec === id ? "bg-gradient-to-r from-fuchsia-600/40 to-violet-600/30 text-white font-semibold" : "hover:bg-white/5"}`}>{label}</button>)}
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-2 text-[10px] text-tg-muted"><div className="mb-1 font-black uppercase tracking-[0.18em] text-fuchsia-300/80">Ecosystem</div><div>Project: <b style={{ color: rc(overall) }}>{overall}%</b></div><div>Entities: <b className="text-tg-text">{ENTITIES.length}</b></div><div>Verses: <b className="text-tg-text">8</b></div></div>
          <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[9px] text-emerald-300/80">PREVIEW_ONLY · без runtime/API/credentials/automation/Unreal/Unity.</div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "map" && <Canvas mode="map" />}
          {sec === "ceo" && <CEO />}
          {sec === "story" && <Story />}
          {sec === "media" && <Media />}
          {sec === "social" && <Social />}
          {sec === "audience" && <Audience />}
          {sec === "campaigns" && <Campaigns />}
          {sec === "knowledge" && <Knowledge />}
          {sec === "twins" && <Twins />}
          {sec === "entity" && <EntityWorkspace />}
          {sec === "manual" && <Manual />}
          {sec === "audit" && <Audit />}
          {sec === "production" && <Production />}
        </div>
      </div>
    </div>
  );
}
