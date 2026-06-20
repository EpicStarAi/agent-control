"use client";

// AUTOMATION FABRIC & WORKFLOW ORCHESTRATION — process layer connecting the whole DEEP INSIDE ecosystem.
// Category: AUTOMATION · CRITICAL · MAX. UI + localStorage + derived/mock only. No real n8n/API/OAuth/secrets/publish/runs. Additive.

import { useEffect, useMemo, useRef, useState } from "react";

const SECTIONS: [string, string][] = [
  ["center", "🔄 Workflow Center"], ["triggers", "🎯 Trigger Engine"], ["queue", "📋 Task Queue"],
  ["graph", "🕸 Process Graph"], ["approval", "✅ Approval Pipeline"], ["library", "📚 Automation Library"],
  ["analytics", "📊 Workflow Analytics"], ["timeline", "⏱ Execution Timeline"], ["agentwf", "🤖 Agent Workflows"],
  ["systemwf", "🛰 System Workflows"], ["n8n", "⚙ n8n Layer"], ["dependency", "🔗 Dependency Map"], ["fabric", "🌌 Fabric Map"],
];

const WORKFLOWS = [
  { id: "wf1", name: "Media Production", status: "RUNNING", success: 92, agent: "EVA NOVIKOVA", trigger: "Content Created" },
  { id: "wf2", name: "Social Distribution", status: "RUNNING", success: 88, agent: "BUCHIHA", trigger: "Content Approved" },
  { id: "wf3", name: "News Pipeline", status: "WAITING", success: 80, agent: "AI REPORTER", trigger: "Schedule" },
  { id: "wf4", name: "Radio Broadcast", status: "RUNNING", success: 90, agent: "BUCH", trigger: "Schedule" },
  { id: "wf5", name: "Music Release", status: "COMPLETED", success: 95, agent: "NOVA", trigger: "Mission Completed" },
  { id: "wf6", name: "Sponsor Campaign", status: "WAITING", success: 76, agent: "EVA NOVIKOVA", trigger: "Revenue Target Reached" },
  { id: "wf7", name: "Audience Growth", status: "RUNNING", success: 82, agent: "BUCHIHA", trigger: "Event" },
  { id: "wf8", name: "Knowledge Update", status: "COMPLETED", success: 98, agent: "AI COO", trigger: "Mission Completed" },
  { id: "wf9", name: "Mission Review", status: "FAILED", success: 40, agent: "AI COO", trigger: "Mission Started" },
];
const TRIGGERS = ["Schedule", "Event", "Content Created", "Content Approved", "Agent Activated", "Platform Ready", "Revenue Target Reached", "Mission Started", "Mission Completed", "Manual Trigger"];
const TRIGGER_COUNTS: Record<string, number> = { Schedule: 4, Event: 3, "Content Created": 5, "Content Approved": 4, "Agent Activated": 2, "Platform Ready": 1, "Revenue Target Reached": 2, "Mission Started": 3, "Mission Completed": 2, "Manual Trigger": 6 };
const TASKS = [
  { id: "t1", task: "Render EVA intro", status: "Running", wf: "Media Production" }, { id: "t2", task: "Caption + hashtags", status: "Queued", wf: "Social Distribution" },
  { id: "t3", task: "Schedule TikTok post", status: "Waiting", wf: "Social Distribution" }, { id: "t4", task: "Newsroom fetch", status: "Running", wf: "News Pipeline" },
  { id: "t5", task: "Radio playlist build", status: "Completed", wf: "Radio Broadcast" }, { id: "t6", task: "Sponsor brief", status: "Paused", wf: "Sponsor Campaign" },
  { id: "t7", task: "Mission KPI sync", status: "Failed", wf: "Mission Review" }, { id: "t8", task: "Re-run KPI sync", status: "Retry", wf: "Mission Review" },
];
const APPROVAL_STAGES = ["Draft", "Review", "Approve", "Publish", "Analyze", "Archive"];
const PROCESSES = [
  { name: "EVA Night Intro", stage: "Review" }, { name: "BUCHIHA Sketch", stage: "Draft" }, { name: "BUCH Radio Segment", stage: "Approve" },
  { name: "Sponsor Promo", stage: "Publish" }, { name: "NOVA Mix", stage: "Analyze" },
];
const LIBRARY: Record<string, string[]> = {
  Content: ["Script→Render→Review", "Thumbnail batch"], Social: ["Cross-post preview", "Best-time scheduler"], Media: ["Radio intro builder", "Live studio cue"],
  Radio: ["Playlist rotation", "Show handoff"], Music: ["Release checklist", "Royalty sync"], Analytics: ["Daily digest", "Anomaly flag"],
  Growth: ["Follower funnel", "Engagement loop"], Operations: ["Provision approve", "Incident triage"], Infrastructure: ["Health check", "Backup preview"], Monetization: ["Sponsor matcher", "Affiliate sync"],
};
const AGENT_WF = [
  { name: "BUCH", emoji: "☠️", assigned: 4, completed: 12, running: 1, blocked: 0, success: 90 },
  { name: "BUCHIHA", emoji: "😇", assigned: 5, completed: 15, running: 2, blocked: 0, success: 88 },
  { name: "EVA NOVIKOVA", emoji: "💠", assigned: 6, completed: 22, running: 2, blocked: 0, success: 93 },
  { name: "NOVA", emoji: "🎧", assigned: 3, completed: 8, running: 0, blocked: 1, success: 80 },
  { name: "AI REPORTER", emoji: "📰", assigned: 2, completed: 6, running: 1, blocked: 0, success: 78 },
  { name: "AI NEWSCASTER", emoji: "🎙", assigned: 2, completed: 4, running: 0, blocked: 1, success: 72 },
];
const SYSTEM_WF = ["Media Production", "Social Distribution", "News Pipeline", "Radio Broadcast", "Music Release", "Sponsor Campaign", "Audience Growth", "Knowledge Update", "Mission Review"];
const EXEC_TIMELINE = [
  { t: "09:24", icon: "▶️", text: "Media Production started" }, { t: "09:10", icon: "✅", text: "Approval granted: BUCH Radio Segment" },
  { t: "08:52", icon: "🏁", text: "Music Release completed (95%)" }, { t: "08:30", icon: "❌", text: "Mission KPI sync failed" },
  { t: "08:31", icon: "🔁", text: "Retry executed: KPI sync" }, { t: "08:05", icon: "🎯", text: "Mission triggered: Activate EVA" },
];
const N8N = { workflows: 9, nodes: 64, executions: 312, status: "Ready (UI preview)" };
const DEP_MAP: [string, string][] = [["Media Production", "EVA NOVIKOVA"], ["Social Distribution", "Platforms"], ["Media Production", "Content"], ["Sponsor Campaign", "Revenue"], ["Mission Review", "Mission Control"]];
const FABRIC_CHAIN = ["Mission", "Workflow", "Agent", "Content", "Approval", "Platform", "Audience", "Revenue"];

const ST: Record<string, string> = { RUNNING: "#4ade80", Running: "#4ade80", WAITING: "#fbbf24", Waiting: "#fbbf24", Queued: "#38bdf8", Paused: "#9ca3af", COMPLETED: "#22c55e", Completed: "#22c55e", FAILED: "#f87171", Failed: "#f87171", Retry: "#fb923c" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (ST[s] || "#6b7280") + "22", color: ST[s] || "#9ca3af" }}>{s}</span>; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");

export function AutomationFabric({ onClose }: { onClose: () => void }) {
  const [sec, setSec] = useState("center");
  const [view, setView] = useState({ x: 30, y: 20, k: 0.8 });
  const [selNode, setSelNode] = useState("trigger");
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const running = WORKFLOWS.filter((w) => w.status === "RUNNING").length;
  const waiting = WORKFLOWS.filter((w) => w.status === "WAITING").length;
  const failed = WORKFLOWS.filter((w) => w.status === "FAILED").length;
  const completed = WORKFLOWS.filter((w) => w.status === "COMPLETED").length;
  const successRate = Math.round(WORKFLOWS.reduce((s, w) => s + w.success, 0) / WORKFLOWS.length);
  const health = failed === 0 ? "Healthy" : failed <= 1 ? "Warning" : "Critical";

  useEffect(() => {
    const move = (ev: MouseEvent) => { if (pan.current) { const p = pan.current; setView((v) => ({ ...v, x: p.ox + (ev.clientX - p.sx), y: p.oy + (ev.clientY - p.sy) })); } };
    const up = () => (pan.current = null);
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("automation_fabric", JSON.stringify({ ts, workflows: WORKFLOWS.length, running, successRate, health }));
    localStorage.setItem("workflow_center", JSON.stringify({ ts, total: WORKFLOWS.length, running, waiting, failed, completed, successRate }));
    localStorage.setItem("trigger_engine", JSON.stringify({ ts, triggers: TRIGGER_COUNTS }));
    localStorage.setItem("task_queue", JSON.stringify({ ts, tasks: TASKS }));
    localStorage.setItem("process_graph", JSON.stringify({ ts, nodes: ["Trigger", "Condition", "Agent", "Tool", "Content", "Approval", "Publish", "Analytics", "Revenue"] }));
    localStorage.setItem("approval_pipeline", JSON.stringify({ ts, stages: APPROVAL_STAGES, processes: PROCESSES }));
    localStorage.setItem("automation_library", JSON.stringify({ ts, categories: Object.keys(LIBRARY) }));
    localStorage.setItem("workflow_analytics", JSON.stringify({ ts, successRate, failures: failed, throughput: TASKS.length }));
    localStorage.setItem("execution_timeline", JSON.stringify({ ts, events: EXEC_TIMELINE }));
    localStorage.setItem("agent_workflows", JSON.stringify({ ts, agents: AGENT_WF }));
    localStorage.setItem("system_workflows", JSON.stringify({ ts, system: SYSTEM_WF }));
    localStorage.setItem("automation_health", JSON.stringify({ ts, health, running, queued: TASKS.filter((t) => t.status === "Queued" || t.status === "Waiting").length, failed, successRate, topWorkflow: WORKFLOWS.slice().sort((a, b) => b.success - a.success)[0].name }));
  } catch {} }, [running, successRate, health, failed]);

  function Center() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{[["Total", WORKFLOWS.length, "#fff"], ["Running", running, "#4ade80"], ["Waiting", waiting, "#fbbf24"], ["Failed", failed, "#f87171"], ["Completed", completed, "#22c55e"], ["Success Rate", successRate + "%", "#38bdf8"], ["Health", health, health === "Healthy" ? "#4ade80" : "#fbbf24"]].map(([l, v, c]) => <div key={l as string} className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-lg font-black" style={{ color: c as string }}>{v}</div></div>)}</div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card t="Workflows"><div className="space-y-1.5">{WORKFLOWS.map((w) => <div key={w.id} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-3 py-2"><span className="flex-1 text-sm font-semibold">{w.name}</span><span className="text-[10px] text-tg-muted">{w.agent}</span><span className="text-[11px]" style={{ color: w.success >= 80 ? "#4ade80" : "#fbbf24" }}>{w.success}%</span><Chip s={w.status} /></div>)}</div></Card>
        <Card t="🤖 AI COO · Automation Report"><div className="space-y-1.5 text-[12px]">
          <div className="rounded-lg bg-emerald-500/10 p-2"><b className="text-emerald-300">Health:</b> {health} · success {successRate}% · {running} running.</div>
          <div className="rounded-lg bg-red-500/10 p-2"><b className="text-red-300">Bottleneck:</b> Mission Review (FAILED, KPI sync) · Sponsor Campaign ждёт revenue target.</div>
          <div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Workflow Health:</b> {waiting} ожидают триггера; News Pipeline по расписанию.</div>
          <div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Optimization:</b> добавить retry-policy для KPI sync; распараллелить рендер; кэшировать caption-генерацию.</div>
        </div></Card>
      </div>
    </main>;
  }
  function Triggers() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Trigger Engine · типы триггеров"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{TRIGGERS.map((tg) => <div key={tg} className="rounded-xl bg-tg-bg/40 p-3"><div className="text-[12px] font-semibold">{tg}</div><div className="text-xl font-black text-cyan-300">{TRIGGER_COUNTS[tg]}</div><div className="text-[10px] text-tg-muted">привязок</div></div>)}</div></Card></main>;
  }
  function Queue() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Task Queue"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Task", "Workflow", "Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{TASKS.map((t) => <tr key={t.id} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{t.task}</td><td className="px-2 text-tg-muted">{t.wf}</td><td className="px-2"><Chip s={t.status} /></td></tr>)}</tbody></table></Card></main>;
  }
  function Graph() {
    const nodes = [
      { id: "trigger", label: "Trigger", x: 80, y: 200 }, { id: "condition", label: "Condition", x: 250, y: 200 }, { id: "agent", label: "Agent", x: 420, y: 120 },
      { id: "tool", label: "Tool", x: 420, y: 280 }, { id: "content", label: "Content", x: 600, y: 200 }, { id: "approval", label: "Approval", x: 770, y: 200 },
      { id: "publish", label: "Publish", x: 940, y: 140 }, { id: "analytics", label: "Analytics", x: 940, y: 280 }, { id: "revenue", label: "Revenue", x: 1110, y: 200 },
    ];
    const edges: [string, string][] = [["trigger", "condition"], ["condition", "agent"], ["condition", "tool"], ["agent", "content"], ["tool", "content"], ["content", "approval"], ["approval", "publish"], ["approval", "analytics"], ["publish", "revenue"], ["analytics", "revenue"]];
    const byId: Record<string, any> = {}; nodes.forEach((n) => (byId[n.id] = n));
    return <div className="grid min-h-0 flex-1 grid-cols-[1fr_280px]">
      <div className="relative min-h-0 overflow-hidden bg-[#070a10]" onMouseDown={(ev) => (pan.current = { sx: ev.clientX, sy: ev.clientY, ox: view.x, oy: view.y })} onWheel={(ev) => setView((v) => ({ ...v, k: Math.min(2, Math.max(0.4, v.k - ev.deltaY * 0.001)) }))}>
        <svg className="absolute inset-0 h-full w-full"><g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>{edges.map(([a, b], i) => <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke="rgba(120,200,160,.3)" strokeWidth={1.6} />)}{nodes.map((n) => <g key={n.id} onClick={(ev) => { ev.stopPropagation(); setSelNode(n.id); }} style={{ cursor: "pointer" }}><rect x={n.x - 50} y={n.y - 16} width={100} height={32} rx={8} fill={av(n.label)} stroke={selNode === n.id ? "#fff" : "none"} strokeWidth={2} opacity={0.9} /><text x={n.x} y={n.y + 4} fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle">{n.label}</text></g>)}</g></svg>
        <svg width="150" height="100" viewBox="0 0 1200 400" className="absolute bottom-3 right-3 rounded border border-tg-line bg-tg-bg/80">{nodes.map((n) => <rect key={n.id} x={n.x - 50} y={n.y - 16} width={100} height={32} fill={av(n.label)} />)}</svg>
        <div className="absolute bottom-3 left-3 flex gap-1">{["+", "−", "⟳"].map((b) => <button key={b} onClick={() => setView((v) => b === "+" ? { ...v, k: Math.min(2, v.k + 0.15) } : b === "−" ? { ...v, k: Math.max(0.4, v.k - 0.15) } : { x: 30, y: 20, k: 0.8 })} className="h-7 w-7 rounded bg-[#11151f] text-white ring-1 ring-white/10">{b}</button>)}</div>
      </div>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Node Inspector</div><div className="text-sm font-bold">{byId[selNode]?.label}</div><div className="mt-1 rounded bg-tg-bg/40 p-2 text-[12px] text-tg-muted">Узел процесса «{byId[selNode]?.label}». Входы/выходы — связи на полотне. Preview-only, без реальных запусков.</div></aside>
    </div>;
  }
  function Approval() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Approval Pipeline"><div className="space-y-2">{PROCESSES.map((p) => { const idx = APPROVAL_STAGES.indexOf(p.stage); return <div key={p.name}><div className="mb-1 text-sm font-semibold">{p.name}</div><div className="flex flex-wrap items-center gap-1 text-[11px]">{APPROVAL_STAGES.map((s, i) => <span key={s} className="flex items-center gap-1"><span className={`rounded px-2 py-0.5 ${i === idx ? "bg-tg-active text-white font-bold" : i < idx ? "bg-emerald-600/20 text-emerald-300" : "bg-tg-bg text-tg-muted"}`}>{s}</span>{i < APPROVAL_STAGES.length - 1 && <span className="text-tg-muted">→</span>}</span>)}</div></div>; })}</div></Card></main>;
  }
  function Library() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(LIBRARY).map(([cat, arr]) => <Card key={cat} t={cat}><div className="space-y-1 text-[12px]">{arr.map((x) => <div key={x} className="rounded bg-tg-bg/40 px-2 py-1">⚙ {x}</div>)}</div></Card>)}</div></main>;
  }
  function Analytics() {
    const top = WORKFLOWS.slice().sort((a, b) => b.success - a.success).slice(0, 5);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 lg:grid-cols-2">
      <Card t="Metrics"><div className="grid grid-cols-2 gap-2">{[["Executions", N8N.executions], ["Success Rate", successRate + "%"], ["Failure Rate", Math.round(failed / WORKFLOWS.length * 100) + "%"], ["Avg Duration", "4.2 min"], ["Throughput", TASKS.length + "/h"], ["Bottlenecks", "Mission Review"]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-tg-bg/40 p-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-sm font-black">{v}</div></div>)}</div></Card>
      <Card t="Top Workflows"><div className="space-y-1.5">{top.map((w) => <div key={w.id} className="flex items-center gap-2 text-[12px]"><span className="flex-1">{w.name}</span><div className="h-2 w-32 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: w.success + "%" }} /></div><b>{w.success}%</b></div>)}</div></Card>
    </div></main>;
  }
  function Timeline() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Execution Timeline"><div className="space-y-1 text-[12px]">{EXEC_TIMELINE.map((e, i) => <div key={i} className="flex gap-2"><span className="text-tg-muted">{e.t}</span><span>{e.icon}</span><span className="flex-1">{e.text}</span></div>)}</div></Card></main>;
  }
  function AgentWF() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Agent Workflows"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Agent", "Assigned", "Completed", "Running", "Blocked", "Success"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{AGENT_WF.map((a) => <tr key={a.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{a.emoji} {a.name}</td><td className="px-2">{a.assigned}</td><td className="px-2">{a.completed}</td><td className="px-2 text-emerald-300">{a.running}</td><td className="px-2 text-red-300">{a.blocked}</td><td className="px-2 font-bold" style={{ color: a.success >= 80 ? "#4ade80" : "#fbbf24" }}>{a.success}%</td></tr>)}</tbody></table></Card></main>;
  }
  function SystemWF() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{SYSTEM_WF.map((s) => { const w = WORKFLOWS.find((x) => x.name === s); return <Card key={s}><div className="flex items-center gap-2"><b className="flex-1">{s}</b>{w && <Chip s={w.status} />}</div>{w && <div className="mt-1 text-[11px] text-tg-muted">Trigger: {w.trigger} · {w.success}%</div>}</Card>; })}</div></main>;
  }
  function N8nLayer() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="n8n Layer (UI preview only — без реального n8n)"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-tg-bg/40 p-3"><div className="text-[10px] uppercase text-tg-muted">Workflows</div><div className="text-2xl font-black">{N8N.workflows}</div></div><div className="rounded-xl bg-tg-bg/40 p-3"><div className="text-[10px] uppercase text-tg-muted">Nodes</div><div className="text-2xl font-black">{N8N.nodes}</div></div><div className="rounded-xl bg-tg-bg/40 p-3"><div className="text-[10px] uppercase text-tg-muted">Executions</div><div className="text-2xl font-black">{N8N.executions}</div></div><div className="rounded-xl bg-tg-bg/40 p-3"><div className="text-[10px] uppercase text-tg-muted">Status</div><div className="text-sm font-black text-emerald-300">{N8N.status}</div></div></div><div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-300">Только визуализация готовности. Подключения к реальному n8n нет.</div></Card></main>;
  }
  function Dependency() {
    const ids = Array.from(new Set(DEP_MAP.flat()));
    const nodes = ids.map((id, i) => ({ id, x: 120 + (i % 3) * 320, y: 80 + Math.floor(i / 3) * 130 }));
    const byId: Record<string, any> = {}; nodes.forEach((n) => (byId[n.id] = n));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Dependency Map"><svg width="100%" height="300" viewBox="0 0 1000 320">{DEP_MAP.map(([a, b], i) => <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke="rgba(120,140,200,.3)" strokeWidth={1.5} />)}{nodes.map((n) => <g key={n.id}><rect x={n.x - 70} y={n.y - 16} width={140} height={32} rx={8} fill={av(n.id)} opacity={0.85} /><text x={n.x} y={n.y + 4} fill="#fff" fontSize="10" fontWeight="700" textAnchor="middle">{n.id}</text></g>)}</svg><div className="mt-1 text-[10px] text-tg-muted">Workflow → Agent / Platform / Content / Revenue / Mission</div></Card></main>;
  }
  function Fabric() {
    const nodes = FABRIC_CHAIN.map((id, i) => ({ id, x: 90 + i * 145, y: 160 }));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Automation Fabric Map · Mission → … → Revenue"><svg width="100%" height="240" viewBox="0 0 1200 240">{nodes.slice(0, -1).map((n, i) => <line key={i} x1={n.x + 50} y1={n.y} x2={nodes[i + 1].x - 50} y2={nodes[i + 1].y} stroke="rgba(167,139,250,.45)" strokeWidth={2} markerEnd="url(#fa)" />)}<defs><marker id="fa" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="rgba(167,139,250,.7)" /></marker></defs>{nodes.map((n) => <g key={n.id}><circle cx={n.x} cy={n.y} r={42} fill={av(n.id)} opacity={0.85} /><text x={n.x} y={n.y + 4} fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">{n.id}</text></g>)}</svg><div className="mt-1 text-[11px] text-tg-muted">Нервная система: связывает стратегию, контент, аудиторию и экономику в единый процессный слой.</div></Card></main>;
  }

  return (
    <div className="fixed inset-0 z-[74] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">⚡ AUTOMATION FABRIC</div>
        <span className="rounded-full border border-yellow-500/40 bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold text-yellow-300">CRITICAL · MAX · AUTOMATION</span>
        <div className="ml-auto flex items-center gap-2 text-[11px]"><span className="rounded-full bg-tg-bg px-2.5 py-1">Running: <b className="text-emerald-300">{running}</b></span><span className="rounded-full bg-tg-bg px-2.5 py-1">Success: <b className="text-cyan-300">{successRate}%</b></span><span className="rounded-full bg-tg-bg px-2.5 py-1">Health: <b style={{ color: health === "Healthy" ? "#4ade80" : "#fbbf24" }}>{health}</b></span></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2">{SECTIONS.map(([id, label]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] ${sec === id ? "bg-tg-active text-white font-semibold" : "hover:bg-tg-hover/40"}`}>{label}</button>)}</nav>
        <div className="flex min-h-0 flex-col">
          {sec === "center" && <Center />}
          {sec === "triggers" && <Triggers />}
          {sec === "queue" && <Queue />}
          {sec === "graph" && <Graph />}
          {sec === "approval" && <Approval />}
          {sec === "library" && <Library />}
          {sec === "analytics" && <Analytics />}
          {sec === "timeline" && <Timeline />}
          {sec === "agentwf" && <AgentWF />}
          {sec === "systemwf" && <SystemWF />}
          {sec === "n8n" && <N8nLayer />}
          {sec === "dependency" && <Dependency />}
          {sec === "fabric" && <Fabric />}
        </div>
      </div>
    </div>
  );
}
