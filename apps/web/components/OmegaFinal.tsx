"use client";
// DEEPINSIDE PHASE Ω-FINAL · additive module (BLUEPRINT_ONLY · localStorage · mock · read-only).
// No backend/API/OAuth/network/automation/publish/credentials. Does not touch Runtime Gate / Agent Registry / Agent Brain / routes.
import { useEffect, useMemo, useRef, useState } from "react";
import { ENTITIES_FULL, personaUltra, PERSONA_ULTRA_FIELDS, PERSONA_IDS, identityCompleteness, KNOWLEDGE_SECTIONS, ASSET_CATEGORIES, assetLibrary, CONTENT_HUB_SECTIONS, contentHub, EVA_LAUNCH, ecosystemReadiness, omegaExecutiveReport, omegaExecMarkdown, persistOmega, WORLD_MEMORY, MEDIA_UNIVERSES, GAP_ANALYSIS } from "./deepinsideContent";

const rc = (v: number) => (v >= 80 ? "#4ade80" : v >= 55 ? "#fbbf24" : "#f87171");
function Glass({ t, children }: { t?: string; children: any }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_4px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">{t}</div>}{children}</div>; }
function Bar({ v }: { v: number }) { return <div className="h-2 flex-1 overflow-hidden rounded bg-white/10"><div className="h-full" style={{ width: v + "%", background: rc(v) }} /></div>; }
function dl(name: string, text: string, type: string) { try { const b = new Blob([text], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); } catch {} }

const SECTIONS: [string, string][] = [
  ["persona", "🧬 Persona Engine"], ["canvas", "♾ Infinite Canvas"], ["knowledge", "📚 KnowledgeVerse"], ["assets", "🎞 Media Factory Assets"],
  ["content", "🌐 Content Hub"], ["eva", "💠 EVA Launch Pack"], ["readiness", "📊 Readiness Center"], ["ceo", "👑 CEO Executive Report"],
];

export function OmegaFinal({ onClose }: { onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [sec, setSec] = useState("persona");
  const [pid, setPid] = useState("eva");
  const [view, setView] = useState({ x: 60, y: 40, k: 0.7 });
  const [mode, setMode] = useState<"world" | "agent">("world");
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => { persistOmega(); }, []);
  useEffect(() => {
    const move = (e: MouseEvent) => { if (pan.current) { const q = pan.current; setView((v) => ({ ...v, x: q.ox + (e.clientX - q.sx), y: q.oy + (e.clientY - q.sy) })); } };
    const up = () => (pan.current = null);
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  // ── Ω.2 canvas nodes ──
  const { nodes, edges } = useMemo(() => {
    const N: { id: string; label: string; layer: string; x: number; y: number; c: string }[] = [];
    const E: { a: string; b: string }[] = [];
    const COL: Record<string, string> = { Agent: "#d946ef", Persona: "#a78bfa", Goal: "#22d3ee", Memory: "#f472b6", Platform: "#34d399", Project: "#fbbf24", Content: "#60a5fa", Revenue: "#4ade80", Knowledge: "#f59e0b", Infrastructure: "#94a3b8", Roadmap: "#fb7185" };
    const ring = (items: any[], layer: string, r: number, cx = 0, cy = 0, lab = (x: any) => x) => items.forEach((it, i) => { const a = (i / items.length) * Math.PI * 2; N.push({ id: layer + ":" + i, label: lab(it), layer, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, c: COL[layer] }); });
    ENTITIES_FULL.forEach((e, i) => { const a = (i / ENTITIES_FULL.length) * Math.PI * 2; N.push({ id: "Agent:" + e.id, label: e.emoji + " " + e.name, layer: "Agent", x: Math.cos(a) * 180, y: Math.sin(a) * 180, c: COL.Agent }); });
    ring(["Цели x8", "Мечты", "Миссии"], "Goal", 320);
    ring(WORLD_MEMORY.slice(0, 8).map((w) => w.type), "Memory", 430, 0, 0, (x) => "🧠 " + x);
    ring(["Telegram", "TikTok", "YouTube", "Instagram", "Radio", "GitHub"], "Platform", 540, 0, 0, (x) => "📡 " + x);
    ring(MEDIA_UNIVERSES.slice(0, 6).map((m) => m.name), "Content", 360, 700, 200, (x) => "🎬 " + x);
    ring(["Subscriptions", "Donations", "Ads", "Merch"], "Revenue", 300, -700, 250, (x) => "💰 " + x);
    ring(KNOWLEDGE_SECTIONS.slice(0, 8).map((k) => k.name), "Knowledge", 380, 700, -250, (x) => "📚 " + x);
    ring(["VPS", "Docker", "GPU", "Storage", "DB"], "Infrastructure", 300, -700, -260, (x) => "🏗 " + x);
    ring(["90 days", "180 days", "365 days"], "Roadmap", 230, 0, 760, (x) => "🗺 " + x);
    // edges: agents → first node of each ring
    ENTITIES_FULL.forEach((e) => { ["Goal:0", "Memory:0", "Platform:0", "Knowledge:0"].forEach((b) => E.push({ a: "Agent:" + e.id, b })); });
    return { nodes: N, edges: E };
  }, []);
  const visNodes = nodes.filter((n) => (filter === "all" || n.layer === filter) && (!query || n.label.toLowerCase().includes(query.toLowerCase())));
  const T = (x: number, y: number) => `translate(${view.x + x * view.k},${view.y + y * view.k})`;

  function Persona() {
    const u = personaUltra(pid); const e = ENTITIES_FULL.find((x) => x.id === pid)!; const score = identityCompleteness(pid);
    return <div className="grid min-h-0 flex-1 grid-cols-[180px_1fr]">
      <nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2">{PERSONA_IDS.map((id) => { const en = ENTITIES_FULL.find((x) => x.id === id)!; return <button key={id} onClick={() => setPid(id)} className={`mb-0.5 flex w-full items-center justify-between gap-1 rounded px-2 py-1.5 text-left text-[11px] ${pid === id ? "bg-fuchsia-500/15 text-white" : "text-tg-muted hover:text-white"}`}><span>{en.emoji} {en.name}</span><b style={{ color: rc(identityCompleteness(id)) }}>{identityCompleteness(id)}</b></button>; })}<div className="mt-2 px-1 text-[9px] text-tg-muted">AI RADIO HOST = NOVA 🎧</div></nav>
      <main className="min-h-0 overflow-auto p-4">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl"><div className="text-4xl">{e.emoji}</div><div><div className="text-lg font-black text-fuchsia-200">{e.name}</div><div className="text-[11px] text-tg-muted">{e.role}</div></div><div className="ml-auto text-center"><div className="text-[10px] uppercase text-tg-muted">Identity Completeness</div><div className="text-2xl font-black" style={{ color: rc(score) }}>{score}%</div></div></div>
        <Glass t="Persona Inspector · 21 поле">
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{PERSONA_ULTRA_FIELDS.map((f) => <div key={f} className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="text-[9px] uppercase text-fuchsia-300/70">{f}</div><div className="mt-0.5">{u[f]}</div></div>)}</div>
        </Glass>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Glass t="Persona Timeline · Life Journey"><div className="space-y-0.5 text-[11px]">{e.timeline.map((t, i) => <div key={i} className="flex gap-2"><span className="w-16 shrink-0 text-fuchsia-300/70">{t.t}</span><span>{t.e}</span></div>)}{WORLD_MEMORY.filter((w) => w.e.toUpperCase().includes(e.name.split(" ")[0]) || w.e.includes(e.id.toUpperCase())).map((w, i) => <div key={"w" + i} className="flex gap-2"><span className="w-16 shrink-0 text-fuchsia-300/70">{w.t}</span><span className="text-tg-muted">{w.e}</span></div>)}</div></Glass>
          <Glass t="Relationship Map"><svg viewBox="-150 -110 300 220" className="h-48 w-full"><circle cx="0" cy="0" r="20" fill="#d946ef" /><text x="0" y="4" textAnchor="middle" fontSize="9" fill="#fff">{e.emoji}</text>{e.relationships.slice(0, 6).map((r, i, arr) => { const a = (i / arr.length) * Math.PI * 2; const x = Math.cos(a) * 90, y = Math.sin(a) * 70; return <g key={i}><line x1="0" y1="0" x2={x} y2={y} stroke="#ffffff30" /><circle cx={x} cy={y} r="13" fill="#a78bfa" /><text x={x} y={y + 22} textAnchor="middle" fontSize="6" fill="#cbd5e1">{r.split("↔")[1] || r}</text></g>; })}</svg></Glass>
        </div>
      </main>
    </div>;
  }

  function Canvas() {
    const layers = ["all", "Agent", "Persona", "Goal", "Memory", "Platform", "Content", "Revenue", "Knowledge", "Infrastructure", "Roadmap"];
    return <main className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute left-2 top-2 z-10 flex flex-wrap items-center gap-1.5">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 node search" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] outline-none" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px]">{layers.map((l) => <option key={l} value={l} className="bg-black">{l}</option>)}</select>
        <button onClick={() => setMode(mode === "world" ? "agent" : "world")} className="rounded-lg bg-white/10 px-2 py-1 text-[11px]">{mode === "world" ? "🌍 World Mode" : "🤖 Agent Mode"}</button>
        <button onClick={() => setView((v) => ({ ...v, k: Math.min(2, v.k + 0.15) }))} className="rounded-lg bg-white/10 px-2 py-1 text-[11px]">＋</button>
        <button onClick={() => setView((v) => ({ ...v, k: Math.max(0.3, v.k - 0.15) }))} className="rounded-lg bg-white/10 px-2 py-1 text-[11px]">－</button>
        <button onClick={() => setView({ x: 60, y: 40, k: 0.7 })} className="rounded-lg bg-white/10 px-2 py-1 text-[11px]">⟲</button>
        <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-300">{visNodes.length} nodes · BLUEPRINT_ONLY</span>
      </div>
      <svg className="h-full w-full cursor-grab" style={{ background: "radial-gradient(circle at 50% 40%, #14122080, #0a0a12)" }} onMouseDown={(e) => (pan.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y })} onWheel={(e) => setView((v) => ({ ...v, k: Math.max(0.3, Math.min(2, v.k - e.deltaY * 0.001)) }))}>
        {edges.map((ed, i) => { const a = nodes.find((n) => n.id === ed.a), b = nodes.find((n) => n.id === ed.b); if (!a || !b) return null; return <line key={i} x1={view.x + a.x * view.k} y1={view.y + a.y * view.k} x2={view.x + b.x * view.k} y2={view.y + b.y * view.k} stroke="#ffffff14" />; })}
        {visNodes.map((n) => <g key={n.id} transform={T(n.x, n.y)} onClick={() => setFocus(n.id)} className="cursor-pointer"><circle r={n.layer === "Agent" ? 13 : 8} fill={n.c} opacity={focus && focus !== n.id ? 0.35 : 1} /><text y={n.layer === "Agent" ? 26 : 18} textAnchor="middle" fontSize={9 * view.k + 3} fill="#e2e8f0">{n.label}</text></g>)}
      </svg>
      <svg viewBox="-800 -400 1600 1300" className="absolute bottom-2 right-2 h-28 w-40 rounded-lg border border-white/10 bg-black/50">{nodes.map((n) => <circle key={n.id} cx={n.x} cy={n.y} r="10" fill={n.c} />)}</svg>
      {focus && <div className="absolute bottom-2 left-2 z-10 max-w-xs rounded-lg border border-white/10 bg-black/70 p-2 text-[11px] backdrop-blur"><div className="font-bold text-fuchsia-200">Node Inspector</div><div className="text-tg-muted">{nodes.find((n) => n.id === focus)?.label} · слой {nodes.find((n) => n.id === focus)?.layer}</div><button onClick={() => setFocus(null)} className="mt-1 rounded bg-white/10 px-2 py-0.5">закрыть</button></div>}
    </main>;
  }

  function Knowledge() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 knowledge search" className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] outline-none" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{KNOWLEDGE_SECTIONS.filter((k) => !query || k.name.toLowerCase().includes(query.toLowerCase())).map((k) => <Glass key={k.name} t={k.name}><div className="flex items-center gap-2 text-[12px]"><Bar v={k.score} /><b style={{ color: rc(k.score) }}>{k.score}%</b></div><div className="mt-1 text-[10px] text-tg-muted">health: {k.health} · growth: {k.growth}</div></Glass>)}</div>
      <div className="mt-3"><Glass t="Knowledge Graph · связи"><svg viewBox="-260 -120 520 240" className="h-56 w-full"><circle cx="0" cy="0" r="22" fill="#f59e0b" /><text x="0" y="4" textAnchor="middle" fontSize="8" fill="#000">KB</text>{KNOWLEDGE_SECTIONS.map((k, i, arr) => { const a = (i / arr.length) * Math.PI * 2; const x = Math.cos(a) * 200, y = Math.sin(a) * 95; return <g key={k.name}><line x1="0" y1="0" x2={x} y2={y} stroke="#ffffff20" /><circle cx={x} cy={y} r="9" fill="#fbbf24" /><text x={x} y={y - 13} textAnchor="middle" fontSize="6" fill="#cbd5e1">{k.name}</text></g>; })}</svg><div className="text-[10px] text-tg-muted">связано с: Agent Brain · Persona Engine · World Memory · Infinite Canvas</div></Glass></div>
    </main>;
  }

  function Assets() {
    const lib = assetLibrary(); const total = lib.reduce((s, a) => s + a.count, 0); const score = Math.round(lib.reduce((s, a) => s + a.readiness, 0) / lib.length);
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl"><div><div className="text-[10px] uppercase text-tg-muted">Media Factory Dashboard</div><div className="text-lg font-black text-fuchsia-200">{total} ассетов · {ASSET_CATEGORIES.length} категорий</div></div><div className="ml-auto text-center"><div className="text-[10px] uppercase text-tg-muted">Asset Score</div><div className="text-2xl font-black" style={{ color: rc(score) }}>{score}%</div></div></div>
      <Glass t="Asset Library"><div className="overflow-auto"><table className="w-full text-[11px]"><thead><tr className="text-fuchsia-300/70">{["Категория", "Count", "Usage", "Dependencies", "Readiness"].map((h) => <th key={h} className="px-1 py-0.5 text-left">{h}</th>)}</tr></thead><tbody>{lib.map((a) => <tr key={a.cat} className="border-t border-white/5"><td className="px-1 py-0.5 text-tg-text">{a.cat}</td><td className="px-1 py-0.5 text-tg-muted">{a.count}</td><td className="px-1 py-0.5 text-tg-muted">{a.usage}</td><td className="px-1 py-0.5 text-tg-muted">{a.deps}</td><td className="px-1 py-0.5"><div className="flex items-center gap-1"><Bar v={a.readiness} /><b style={{ color: rc(a.readiness) }}>{a.readiness}</b></div></td></tr>)}</tbody></table></div></Glass>
    </main>;
  }

  function Content() {
    const c = contentHub(); const total = Object.values(c).reduce((a, b) => a + b, 0);
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl"><div className="text-[10px] uppercase text-tg-muted">DEEPINSIDE.LIFE Content Hub</div><div className="text-lg font-black text-fuchsia-200">{total} единиц контента · {CONTENT_HUB_SECTIONS.length} разделов</div></div>
      <Glass t="Content Matrix / Dashboard"><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">{Object.entries(c).map(([s, n]) => <div key={s} className="rounded-lg bg-white/5 p-2 text-center text-[11px]"><div className="text-base font-black text-fuchsia-200">{n}</div><div className="text-[9px] text-tg-muted">{s}</div></div>)}</div></Glass>
      <div className="mt-3"><Glass t="Content Calendar (preview)"><div className="grid gap-1.5 sm:grid-cols-4">{["Q1 запуск/охват", "Q2 серии/рост", "Q3 коллабы/кампании", "Q4 монетизация"].map((q) => <div key={q} className="rounded-lg bg-white/5 p-2 text-[11px] text-tg-muted">{q}</div>)}</div></Glass></div>
    </main>;
  }

  function Eva() {
    const E = EVA_LAUNCH;
    const row = (l: string, v: string) => <div className="rounded-lg bg-white/5 p-2 text-[11px]"><div className="text-[9px] uppercase text-fuchsia-300/70">{l}</div><div className="mt-0.5">{v}</div></div>;
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 backdrop-blur-xl"><div className="text-4xl">💠</div><div><div className="text-lg font-black text-fuchsia-200">EVA NOVIKOVA · Launch Dossier</div><div className="text-[11px] text-tg-muted">{E.identity}</div></div><div className="ml-auto text-center"><div className="text-[10px] uppercase text-tg-muted">Launch Score</div><div className="text-3xl font-black" style={{ color: rc(E.launchScore) }}>{E.launchScore}%</div></div></div>
      <Glass t="Launch Inspector"><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{row("Biography", E.biography)}{row("Voice Profile", E.voice)}{row("Visual Profile", E.visual)}{row("Style Guide", E.styleGuide)}{row("Personality Guide", E.personalityGuide)}{row("Content Strategy", E.contentStrategy)}{row("Platform Strategy", E.platformStrategy)}{row("Audience Profile", E.audience)}{row("Relationship Network", E.relationships)}{row("Growth Roadmap", E.growth)}{row("Monetization Preview", E.monetization)}{row("Brand Kit", E.brandKit.join(", "))}</div></Glass>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">{([["30 Days Plan", E.d30], ["90 Days Plan", E.d90], ["365 Days Plan", E.d365]] as [string, string[]][]).map(([t, arr]) => <Glass key={t} t={t}>{arr.map((x) => <div key={x} className="text-[11px] text-tg-muted">· {x}</div>)}</Glass>)}</div>
      <div className="mt-3"><Glass t="Launch Readiness"><div className="flex items-center gap-2 text-[12px]"><Bar v={E.launchReadiness} /><b style={{ color: rc(E.launchReadiness) }}>{E.launchReadiness}%</b></div><div className="mt-1 text-[10px] text-amber-300">safe-mode: пред-записанные эфиры + ручной постинг · voice/consent обязателен перед генерацией</div></Glass></div>
    </main>;
  }

  function Readiness() {
    const r = ecosystemReadiness(); const L: any = r.layers;
    const rows: [string, number][] = [["Architecture", L.architecture], ["Persona", L.persona], ["Knowledge", L.knowledge], ["Media", L.media], ["Platform", L.platform], ["Infrastructure", L.infrastructure], ["Content", L.content], ["Revenue", L.revenue], ["Launch", L.launch]];
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"><div className="text-center"><div className="text-[10px] uppercase text-tg-muted">Blueprint</div><div className="text-3xl font-black text-emerald-400">{r.blueprintScore}%</div></div><div className="text-center"><div className="text-[10px] uppercase text-tg-muted">Production</div><div className="text-3xl font-black" style={{ color: rc(r.productionScore) }}>{r.productionScore}%</div></div><div className="ml-auto text-center"><div className="text-[10px] uppercase text-tg-muted">Overall Ecosystem</div><div className="text-3xl font-black" style={{ color: rc(r.overall) }}>{r.overall}%</div></div></div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Glass t="Readiness Dashboard"><div className="space-y-1.5">{rows.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-32 text-tg-muted">{l}</span><Bar v={v} /><b className="w-9 text-right" style={{ color: rc(v) }}>{v}%</b></div>)}</div></Glass>
        <Glass t="Gap / Priority / Risk Matrix"><div className="overflow-auto"><table className="w-full text-[10.5px]"><thead><tr className="text-fuchsia-300/70">{["Area", "Gap", "Prio", "Risk", "Next"].map((h) => <th key={h} className="px-1 text-left">{h}</th>)}</tr></thead><tbody>{GAP_ANALYSIS.map((g) => <tr key={g.area} className="border-t border-white/5"><td className="px-1 py-0.5 text-tg-text">{g.area}</td><td className="px-1 py-0.5 text-tg-muted">{g.gap}</td><td className="px-1 py-0.5"><b className="text-fuchsia-300">{g.prio}</b></td><td className="px-1 py-0.5 text-tg-muted">{g.risk}</td><td className="px-1 py-0.5 text-tg-muted">{g.next}</td></tr>)}</tbody></table></div></Glass>
      </div>
    </main>;
  }

  function CEO() {
    const r = omegaExecutiveReport();
    const copy = () => { try { navigator.clipboard.writeText(JSON.stringify(r, null, 2)); } catch {} };
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"><div className="text-4xl font-black" style={{ color: rc(r.finalScore) }}>{r.finalScore}%</div><div><div className="text-[11px] uppercase text-tg-muted">CEO Executive Report · Final Score</div><div className="text-[11px] text-tg-muted">{r.mode}</div></div><div className="ml-auto flex flex-wrap gap-1.5">
        <button onClick={copy} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">📋 Copy JSON</button>
        <button onClick={() => dl("deepinside-executive.json", JSON.stringify(r, null, 2), "application/json")} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">⬇ JSON</button>
        <button onClick={() => dl("deepinside-executive.md", omegaExecMarkdown(), "text/markdown")} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">⬇ Markdown</button>
        <button onClick={() => dl("deepinside-executive-report.md", omegaExecMarkdown(), "text/markdown")} className="rounded-lg bg-fuchsia-600/30 px-2.5 py-1.5 text-[11px] hover:bg-fuchsia-600/50">👑 Executive Report</button>
      </div></div>
      <Glass t="Executive Summary"><div className="text-[12px] text-tg-muted">{r.executiveSummary}</div></Glass>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Glass t="Completed Systems"><div className="grid gap-1 text-[11px]">{r.completedSystems.map((x) => <div key={x} className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-200">✓ {x}</div>)}</div></Glass>
        <Glass t="Remaining Gaps"><div className="grid gap-1 text-[11px]">{r.remainingGaps.map((x) => <div key={x} className="rounded bg-amber-500/10 px-2 py-1 text-amber-200">• {x}</div>)}</div></Glass>
        <Glass t="Top Priorities"><div className="grid gap-1 text-[11px]">{r.topPriorities.map((x) => <div key={x} className="rounded bg-sky-500/10 px-2 py-1 text-sky-200">→ {x}</div>)}</div></Glass>
        <Glass t="Launch Candidates"><div className="grid gap-1 text-[11px]">{r.launchCandidates.map((x) => <div key={x} className="rounded bg-white/5 px-2 py-1 text-tg-muted">{x}</div>)}</div></Glass>
        <Glass t="Growth Opportunities"><div className="grid gap-1 text-[11px]">{r.growthOpportunities.map((x) => <div key={x} className="rounded bg-white/5 px-2 py-1 text-tg-muted">↗ {x}</div>)}</div></Glass>
        <Glass t="Risk Areas"><div className="grid gap-1 text-[11px]">{r.riskAreas.map((x) => <div key={x} className="rounded bg-rose-500/10 px-2 py-1 text-rose-200">⚠ {x}</div>)}</div></Glass>
      </div>
      <div className="mt-3"><Glass t="Roadmap"><div className="grid gap-2 lg:grid-cols-3 text-[11px]">{([["90", r.roadmap.d90], ["180", r.roadmap.d180], ["365", r.roadmap.d365]] as [string, string[]][]).map(([t, arr]) => <div key={t} className="rounded-lg bg-white/5 p-2"><div className="font-bold text-fuchsia-200">{t} дней</div>{arr.map((x) => <div key={x} className="text-tg-muted">· {x}</div>)}</div>)}</div></Glass></div>
    </main>;
  }

  return (
    <div className="fixed inset-0 z-[86] flex flex-col text-tg-text" style={{ background: "linear-gradient(160deg, #08070f 0%, #0c0916 50%, #08080f 100%)" }}>
      <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">‹ Назад</button>
        <div className="font-black tracking-wide">♾ DEEPINSIDE Ω FINAL</div>
        <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">COMPLETE BLUEPRINT</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">BLUEPRINT_ONLY · READ_ONLY</span>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2">{SECTIONS.map(([id, lb]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-2 text-left text-[12px] ${sec === id ? "bg-gradient-to-r from-fuchsia-600/40 to-violet-600/30 text-white font-semibold" : "hover:bg-white/5"}`}>{lb}</button>)}
          <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[9px] text-emerald-300/80">8 ключей localStorage · без runtime/API/network/credentials/automation/publish.</div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "persona" && <Persona />}
          {sec === "canvas" && <Canvas />}
          {sec === "knowledge" && <Knowledge />}
          {sec === "assets" && <Assets />}
          {sec === "content" && <Content />}
          {sec === "eva" && <Eva />}
          {sec === "readiness" && <Readiness />}
          {sec === "ceo" && <CEO />}
        </div>
      </div>
    </div>
  );
}
