"use client";

// MISSION CONTROL & STRATEGIC PLANNER — strategy layer above World Engine & Activation Engine.
// Category: STRATEGY · CRITICAL. UI + localStorage + derived/mock only. No API/OAuth/secrets/actions. Additive.

import { useEffect, useMemo, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; counts: Record<string, any> };

const SECTIONS: [string, string][] = [
  ["board", "📋 Mission Board"], ["planner", "🧭 Strategic Planner"], ["roadmap", "🗺 Roadmap Center"],
  ["okr", "🎯 Objectives & Key Results"], ["portfolio", "📁 Project Portfolio"], ["priority", "📊 Priority Matrix"],
  ["dependency", "🔗 Dependency Graph"], ["risk", "⚠ Risk Center"], ["resource", "🧮 Resource Planner"], ["briefing", "🏛 Executive Briefing"],
];

const MISSIONS = [
  { id: "m1", title: "Activate EVA as Media Asset", status: "RUNNING", progress: 72, health: "Healthy", priority: "P0" },
  { id: "m2", title: "Launch Deepinside Radio v1", status: "RUNNING", progress: 58, health: "At Risk", priority: "P0" },
  { id: "m3", title: "Scale Social Empire to 10 platforms", status: "PLANNED", progress: 20, health: "Healthy", priority: "P1" },
  { id: "m4", title: "Monetization: Sponsors + Affiliate", status: "PLANNED", progress: 30, health: "Healthy", priority: "P1" },
  { id: "m5", title: "Provision GeeLark device fleet", status: "BLOCKED", progress: 35, health: "Blocked", priority: "P1" },
  { id: "m6", title: "Newsroom automation pipeline", status: "REVIEW", progress: 80, health: "Healthy", priority: "P2" },
  { id: "m7", title: "BUCH music album rollout", status: "COMPLETED", progress: 100, health: "Done", priority: "P2" },
];
const OKRS = [
  { obj: "Стать самоокупаемой медиасетью", krs: ["Доход $3k/мес", "5 активных спонсоров", "ROI > 200%"], owner: "AI COO", status: "On Track", progress: 54, priority: "P0" },
  { obj: "Активировать всех цифровых двойников", krs: ["6/6 агентов ACTIVE", "Twins readiness > 85%", "Все аккаунты привязаны"], owner: "Agent OS", status: "At Risk", progress: 62, priority: "P0" },
  { obj: "Масштабировать аудиторию x3", krs: ["+100k подписчиков", "Engagement > 8%", "9 платформ READY"], owner: "Social Empire", status: "On Track", progress: 48, priority: "P1" },
  { obj: "Запустить вещание 24/7", krs: ["Radio READY", "Schedule заполнен", "Studio ACTIVE"], owner: "Media Network", status: "Behind", progress: 40, priority: "P1" },
];
const ROADMAP: Record<string, { name: string; status: string }[]> = {
  Q1: [{ name: "World Engine", status: "Completed" }, { name: "Economy Engine", status: "Completed" }, { name: "Activation Engine", status: "Completed" }],
  Q2: [{ name: "Mission Control", status: "In Progress" }, { name: "Radio v1", status: "In Progress" }, { name: "Device Fleet", status: "Blocked" }],
  Q3: [{ name: "Monetization rollout", status: "Planned" }, { name: "Newsroom automation", status: "Planned" }, { name: "Merch store", status: "Planned" }],
  Q4: [{ name: "Premium tier", status: "Planned" }, { name: "Partner network", status: "Planned" }, { name: "Scale x3", status: "Planned" }],
};
const PROJECTS = [
  { name: "Media Network", status: "ACTIVE", readiness: 76, deps: ["Infrastructure", "Agents"], priority: "P0" },
  { name: "Advertising Factory", status: "ACTIVE", readiness: 70, deps: ["Media Network", "Sponsors"], priority: "P1" },
  { name: "Social Empire", status: "ACTIVE", readiness: 72, deps: ["Platforms", "Devices"], priority: "P0" },
  { name: "Economy Engine", status: "ACTIVE", readiness: 80, deps: ["Revenue", "Analytics"], priority: "P1" },
  { name: "World Engine", status: "ACTIVE", readiness: 88, deps: ["All domains"], priority: "P0" },
  { name: "Activation Engine", status: "ACTIVE", readiness: 78, deps: ["World Engine"], priority: "P0" },
  { name: "Premium Platform (future)", status: "PLANNED", readiness: 20, deps: ["Economy", "Audience"], priority: "P2" },
  { name: "Partner Network (future)", status: "PLANNED", readiness: 15, deps: ["Revenue", "Brand"], priority: "P2" },
];
const PRIORITY = [
  { name: "Radio v1", impact: 9, complexity: 6, cost: 4, risk: 5, revenue: 7, audience: 8 },
  { name: "Monetization", impact: 9, complexity: 5, cost: 3, risk: 4, revenue: 9, audience: 5 },
  { name: "Device Fleet", impact: 7, complexity: 8, cost: 7, risk: 8, revenue: 6, audience: 6 },
  { name: "Social scale", impact: 8, complexity: 5, cost: 4, risk: 4, revenue: 6, audience: 9 },
  { name: "Premium tier", impact: 6, complexity: 7, cost: 6, risk: 6, revenue: 8, audience: 4 },
  { name: "Newsroom auto", impact: 7, complexity: 6, cost: 4, risk: 4, revenue: 5, audience: 7 },
];
const DEP_NODES = [
  { id: "Infrastructure", x: 120, y: 90 }, { id: "Devices", x: 120, y: 230 }, { id: "Agents", x: 340, y: 60 },
  { id: "Platforms", x: 340, y: 200 }, { id: "Media Network", x: 560, y: 90 }, { id: "Social Empire", x: 560, y: 230 },
  { id: "Revenue", x: 780, y: 160 }, { id: "Projects", x: 980, y: 160 },
];
const DEP_EDGES: [string, string][] = [["Infrastructure", "Agents"], ["Infrastructure", "Platforms"], ["Devices", "Agents"], ["Devices", "Platforms"], ["Agents", "Media Network"], ["Platforms", "Social Empire"], ["Media Network", "Revenue"], ["Social Empire", "Revenue"], ["Revenue", "Projects"]];
const RISKS = [
  { domain: "Technical", risk: "ComfyUI не настроен — блок рендера", severity: "High", likelihood: "Medium", mitigation: "Настроить worker отдельно" },
  { domain: "Platform", risk: "Policy review TikTok/YouTube", severity: "Medium", likelihood: "High", mitigation: "Pre-moderation gate" },
  { domain: "Content", risk: "Copyright на музыке/каверах", severity: "High", likelihood: "Medium", mitigation: "ORIGINAL_OR_LICENSED_ONLY" },
  { domain: "Infrastructure", risk: "Android Device offline", severity: "Medium", likelihood: "Low", mitigation: "Резервное устройство" },
  { domain: "Revenue", risk: "Premium readiness низкий", severity: "Medium", likelihood: "Medium", mitigation: "Сначала Sponsors/Affiliate" },
  { domain: "Growth", risk: "Зависимость от одной платформы", severity: "Low", likelihood: "Medium", mitigation: "Диверсификация каналов" },
];
const RESOURCES = [["Time", 62, "12 нед до запуска"], ["Budget", 70, "$420/мес runway"], ["Infrastructure", 88, "VPS + Docker + n8n"], ["Devices", 64, "5/6 online"], ["Platforms", 74, "9 каналов"], ["AI Services", 86, "11 моделей"]] as [string, number, string][];

const SEV: Record<string, string> = { High: "#f87171", Medium: "#fbbf24", Low: "#4ade80" };
const ST: Record<string, string> = { RUNNING: "#4ade80", PLANNED: "#9ca3af", BLOCKED: "#f87171", REVIEW: "#fbbf24", COMPLETED: "#22c55e", ACTIVE: "#4ade80", "On Track": "#4ade80", "At Risk": "#fbbf24", Behind: "#f87171", Completed: "#22c55e", "In Progress": "#38bdf8", Healthy: "#4ade80", Blocked: "#f87171", Done: "#22c55e" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (ST[s] || "#6b7280") + "22", color: ST[s] || "#9ca3af" }}>{s}</span>; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

export function StrategyCenter({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const [sec, setSec] = useState("board");

  const running = MISSIONS.filter((m) => m.status === "RUNNING");
  const blocked = MISSIONS.filter((m) => m.status === "BLOCKED");
  const completed = MISSIONS.filter((m) => m.status === "COMPLETED");
  const avgProgress = Math.round(MISSIONS.reduce((s, m) => s + m.progress, 0) / MISSIONS.length);
  const totalReadiness = readLS("activation_engine_v1")?.totalReadiness ?? 74;

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("mission_control_v1", JSON.stringify({ ts, missions: MISSIONS.length, running: running.length, blocked: blocked.length }));
    localStorage.setItem("mission_board_v1", JSON.stringify({ ts, board: MISSIONS.map((m) => ({ id: m.id, title: m.title, status: m.status, progress: m.progress })) }));
    localStorage.setItem("strategic_planner_v1", JSON.stringify({ ts, avgProgress, totalReadiness }));
    localStorage.setItem("roadmap_center_v1", JSON.stringify({ ts, roadmap: ROADMAP }));
    localStorage.setItem("okr_center_v1", JSON.stringify({ ts, okrs: OKRS.map((o) => ({ obj: o.obj, progress: o.progress, status: o.status })) }));
    localStorage.setItem("project_portfolio_v1", JSON.stringify({ ts, projects: PROJECTS.map((p) => ({ name: p.name, status: p.status, readiness: p.readiness })) }));
    localStorage.setItem("priority_matrix_v1", JSON.stringify({ ts, items: PRIORITY }));
    localStorage.setItem("dependency_graph_v1", JSON.stringify({ ts, nodes: DEP_NODES.map((n) => n.id), edges: DEP_EDGES }));
    localStorage.setItem("risk_center_v1", JSON.stringify({ ts, risks: RISKS }));
    localStorage.setItem("executive_briefing_v1", JSON.stringify({ ts, avgProgress, blocked: blocked.map((b) => b.title) }));
  } catch {} }, [avgProgress, totalReadiness]);

  function Board() {
    const cols = [["Current", running], ["Next", MISSIONS.filter((m) => m.status === "PLANNED")], ["Blocked", blocked], ["Review", MISSIONS.filter((m) => m.status === "REVIEW")], ["Completed", completed]] as [string, typeof MISSIONS][];
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6"><div className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">Current</div><div className="text-lg font-black text-emerald-300">{running.length}</div></div><div className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">Blocked</div><div className="text-lg font-black text-red-300">{blocked.length}</div></div><div className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">Completed</div><div className="text-lg font-black text-green-300">{completed.length}</div></div><div className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">Avg Progress</div><div className="text-lg font-black">{avgProgress}%</div></div><div className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">Mission Health</div><div className="text-lg font-black" style={{ color: blocked.length ? "#fbbf24" : "#4ade80" }}>{blocked.length ? "Warning" : "Healthy"}</div></div><div className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">Readiness</div><div className="text-lg font-black text-cyan-300">{totalReadiness}%</div></div></div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{cols.map(([c, list]) => <div key={c} className="rounded-xl border border-tg-line bg-tg-panel/60 p-2"><div className="mb-1 text-[10px] font-black uppercase tracking-wider text-tg-accent">{c}</div><div className="space-y-1.5">{list.length ? list.map((m) => <div key={m.id} className="rounded-lg bg-tg-bg/50 p-2"><div className="text-[11px] font-semibold">{m.title}</div><div className="mt-1 flex items-center gap-1"><Chip s={m.priority} /><span className="ml-auto text-[10px]" style={{ color: ST[m.health] }}>{m.health}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: m.progress + "%" }} /></div></div>) : <div className="text-[10px] text-tg-muted">—</div>}</div></div>)}</div>
    </main>;
  }

  function Planner() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 lg:grid-cols-2">
      <Card t="🤖 AI COO · Strategic Report"><div className="space-y-1.5 text-[12px]">
        <div className="rounded-lg bg-emerald-500/10 p-2"><b className="text-emerald-300">Что сделано:</b> World/Economy/Activation Engine завершены, BUCH album выпущен.</div>
        <div className="rounded-lg bg-red-500/10 p-2"><b className="text-red-300">Что блокирует:</b> {blocked.map((b) => b.title).join(", ") || "—"}; ComfyUI и Android Device.</div>
        <div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Что важно сейчас:</b> Radio v1 + Monetization (P0/P1).</div>
        <div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Следующий этап:</b> Premium tier, Partner Network, масштаб x3.</div>
      </div></Card>
      <Card t="Weekly Priorities"><div className="space-y-1 text-[12px]">{["Запустить Deepinside Radio v1 (P0)", "Закрыть спонсорские сделки (P1)", "Разблокировать device fleet (P1)", "Newsroom automation → review→ready (P2)"].map((x, i) => <div key={i} className="flex gap-2"><span className="text-amber-300">{i + 1}.</span><span>{x}</span></div>)}</div></Card>
      <Card t="Roadmap Review"><div className="space-y-1 text-[12px]"><div>Q1 ✅ ядро экосистемы · Q2 🔵 Mission Control + Radio · Q3 монетизация · Q4 масштаб.</div></div></Card>
      <Card t="Risk Report (top)"><div className="space-y-1 text-[12px]">{RISKS.filter((r) => r.severity === "High").map((r, i) => <div key={i}><span style={{ color: SEV[r.severity] }}>●</span> {r.risk} <span className="text-tg-muted">({r.domain})</span></div>)}</div></Card>
    </div></main>;
  }

  function Roadmap() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{Object.entries(ROADMAP).map(([q, items]) => <Card key={q} t={q}><div className="space-y-1.5">{items.map((it) => <div key={it.name} className="rounded-lg bg-tg-bg/40 p-2"><div className="text-[12px] font-semibold">{it.name}</div><div className="mt-0.5"><Chip s={it.status} /></div></div>)}</div></Card>)}</div></main>;
  }

  function OKR() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="space-y-2">{OKRS.map((o, i) => <Card key={i}><div className="mb-1 flex items-center gap-2"><b className="flex-1">{o.obj}</b><Chip s={o.priority} /><Chip s={o.status} /></div><div className="mb-1.5 flex items-center gap-2 text-[11px] text-tg-muted">Owner: {o.owner} · Progress {o.progress}%<div className="ml-2 h-1.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: o.progress + "%" }} /></div></div><div className="flex flex-wrap gap-1.5">{o.krs.map((kr) => <span key={kr} className="rounded-full bg-tg-bg px-2.5 py-1 text-[11px] text-tg-muted">◦ {kr}</span>)}</div></Card>)}</div></main>;
  }

  function Portfolio() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{PROJECTS.map((p) => <Card key={p.name}><div className="flex items-center gap-2"><b className="flex-1">{p.name}</b><Chip s={p.status} /></div><div className="mt-1 flex items-center gap-2 text-[11px]"><Chip s={p.priority} /><span className="text-tg-muted">readiness</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: p.readiness + "%", background: p.readiness >= 80 ? "#4ade80" : p.readiness >= 50 ? "#fbbf24" : "#f87171" }} /></div><b>{p.readiness}%</b></div><div className="mt-1 text-[10px] text-tg-muted">Deps: {p.deps.join(", ")}</div></Card>)}</div></main>;
  }

  function PriorityMatrix() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Priority Matrix (1-10)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Initiative", "Impact", "Complexity", "Cost", "Risk", "Revenue", "Audience", "Score"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{PRIORITY.map((p) => { const score = Math.round((p.impact + p.revenue + p.audience) * 10 / 3 - (p.complexity + p.cost + p.risk) * 10 / 6); return <tr key={p.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{p.name}</td>{[p.impact, p.complexity, p.cost, p.risk, p.revenue, p.audience].map((v, i) => <td key={i} className="px-2"><span className="inline-block w-6 rounded text-center" style={{ background: (i === 1 || i === 2 || i === 3 ? (v >= 7 ? "#f8717133" : "#4ade8022") : (v >= 7 ? "#4ade8033" : "#fbbf2422")) }}>{v}</span></td>)}<td className="px-2 font-black" style={{ color: score >= 50 ? "#4ade80" : score >= 30 ? "#fbbf24" : "#f87171" }}>{score}</td></tr>; })}</tbody></table><div className="mt-2 text-[10px] text-tg-muted">Score = (Impact+Revenue+Audience) − (Complexity+Cost+Risk). Выше = приоритетнее.</div></Card></main>;
  }

  function Dependency() {
    const byId: Record<string, any> = {}; DEP_NODES.forEach((n) => (byId[n.id] = n));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Dependency Graph"><svg width="100%" height="320" viewBox="0 0 1100 320">{DEP_EDGES.map(([a, b], i) => <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke="rgba(120,140,200,.3)" strokeWidth={1.5} markerEnd="url(#arr)" />)}<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6" fill="rgba(120,140,200,.6)" /></marker></defs>{DEP_NODES.map((n) => <g key={n.id}><rect x={n.x - 56} y={n.y - 16} width={112} height={32} rx={8} fill={av(n.id)} opacity={0.85} /><text x={n.x} y={n.y + 4} fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle">{n.id}</text></g>)}</svg></Card></main>;
  }

  function Risk() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Risk Center"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Domain", "Risk", "Severity", "Likelihood", "Mitigation"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{RISKS.map((r, i) => <tr key={i} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{r.domain}</td><td className="px-2">{r.risk}</td><td className="px-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: SEV[r.severity] + "22", color: SEV[r.severity] }}>{r.severity}</span></td><td className="px-2 text-tg-muted">{r.likelihood}</td><td className="px-2 text-tg-muted">{r.mitigation}</td></tr>)}</tbody></table></Card></main>;
  }

  function Resource() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Resource Planner"><div className="space-y-2">{RESOURCES.map(([l, v, note]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-32 text-tg-muted">{l}</span><div className="h-2.5 w-48 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400" style={{ width: v + "%" }} /></div><span className="w-8">{v}%</span><span className="text-tg-muted">{note}</span></div>)}</div></Card></main>;
  }

  function Briefing() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 lg:grid-cols-2">
      <Card t="🏛 Executive Briefing"><div className="space-y-2 text-[12px]">
        <div><b className="text-emerald-300">Что сделано:</b> ядро экосистемы (World/Economy/Activation), 1 миссия завершена, средний прогресс {avgProgress}%.</div>
        <div><b className="text-red-300">Что блокирует:</b> {blocked.map((b) => b.title).join(", ") || "—"}.</div>
        <div><b className="text-amber-300">Что важно сейчас:</b> {running.map((m) => m.title).join(", ")}.</div>
        <div><b className="text-sky-300">Следующий этап:</b> монетизация, premium, партнёрская сеть, масштаб x3.</div>
      </div></Card>
      <div className="space-y-3">
        <Card t="Snapshot"><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-tg-bg/40 p-2"><div className="text-[10px] uppercase text-tg-muted">Missions</div><div className="text-lg font-black">{MISSIONS.length}</div></div><div className="rounded-xl bg-tg-bg/40 p-2"><div className="text-[10px] uppercase text-tg-muted">Readiness</div><div className="text-lg font-black text-cyan-300">{totalReadiness}%</div></div><div className="rounded-xl bg-tg-bg/40 p-2"><div className="text-[10px] uppercase text-tg-muted">OKRs On Track</div><div className="text-lg font-black text-emerald-300">{OKRS.filter((o) => o.status === "On Track").length}/{OKRS.length}</div></div><div className="rounded-xl bg-tg-bg/40 p-2"><div className="text-[10px] uppercase text-tg-muted">High Risks</div><div className="text-lg font-black text-red-300">{RISKS.filter((r) => r.severity === "High").length}</div></div></div></Card>
        <Card t="Strategic level"><div className="text-[12px] text-tg-muted">MISSION CONTROL стоит над World Engine (карта мира) и Activation Engine (готовность) и задаёт направление: цели → приоритеты → roadmap → ресурсы → запуск.</div></Card>
      </div>
    </div></main>;
  }

  return (
    <div className="fixed inset-0 z-[72] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🎯 MISSION CONTROL · STRATEGY</div>
        <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">CRITICAL · STRATEGY</span>
        <div className="ml-auto flex items-center gap-2 text-[11px]"><span className="rounded-full bg-tg-bg px-2.5 py-1">Avg Progress: <b>{avgProgress}%</b></span><span className="rounded-full bg-tg-bg px-2.5 py-1">Blocked: <b className="text-red-300">{blocked.length}</b></span></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2">{SECTIONS.map(([id, label]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] ${sec === id ? "bg-tg-active text-white font-semibold" : "hover:bg-tg-hover/40"}`}>{label}</button>)}</nav>
        <div className="flex min-h-0 flex-col">
          {sec === "board" && <Board />}
          {sec === "planner" && <Planner />}
          {sec === "roadmap" && <Roadmap />}
          {sec === "okr" && <OKR />}
          {sec === "portfolio" && <Portfolio />}
          {sec === "priority" && <PriorityMatrix />}
          {sec === "dependency" && <Dependency />}
          {sec === "risk" && <Risk />}
          {sec === "resource" && <Resource />}
          {sec === "briefing" && <Briefing />}
        </div>
      </div>
    </div>
  );
}
