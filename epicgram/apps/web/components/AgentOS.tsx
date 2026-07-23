"use client";

// AGENT OS — Agent Operating System + Digital Twin Center + Mission Control.
// Category: CORE · ACTIVE. UI + localStorage + derived data only. No backend/TDLib/actions. Additive.

import { useEffect, useMemo, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; exec: any[]; devices: any[]; slots: any[]; bind: Record<string, string>; counts: Record<string, any>; activeId: string };
const PLATFORMS = ["Telegram", "TikTok", "Instagram", "YouTube", "Facebook", "X", "Pinterest", "LinkedIn", "Website"];
const AGENT_TABS = ["Overview", "Identity", "Brain", "Memory", "Knowledge", "Goals", "Tasks", "Accounts", "Devices", "Voice", "Face", "Media", "Publishing", "Analytics", "History", "Lifecycle"];
const TWIN_TABS = ["Identity", "Appearance", "Voice", "Personality", "Memory", "Accounts", "Devices", "Media", "Analytics", "Relationships", "History"];
const MISSION_TABS = ["Overview", "Objectives", "Agents", "Devices", "Content", "Publishing", "Analytics", "Timeline", "Reports"];
const LIFECYCLE = ["Created", "Configured", "Ready", "Active", "Scaling", "Paused", "Archived", "Retired"];
const BOARD = ["Planned", "Ready", "Running", "Review", "Completed", "Failed", "Archived"];
const STATUS_TO_COL: Record<string, string> = { DRAFT: "Planned", PLANNING: "Planned", READY: "Ready", APPROVED: "Ready", ACTIVE: "Running", RUNNING: "Running", WAITING_APPROVAL: "Review", REVIEW: "Review", COMPLETED: "Completed", DONE: "Completed", FAILED: "Failed", BLOCKED: "Failed", ARCHIVED: "Archived" };

const SCLR: Record<string, string> = { ACTIVE: "#4ade80", active: "#4ade80", READY: "#38bdf8", Running: "#4ade80", RUNNING: "#4ade80", Completed: "#22c55e", Review: "#fb7185", Failed: "#f87171", Planned: "#9ca3af", Ready: "#38bdf8", Archived: "#6b7280", IDLE: "#fbbf24" };
function Dot({ s }: { s: string }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCLR[s] || "#9ca3af" }} />; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
const ini = (s: string) => (s || "•").replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function AgentOS({ ctx, onClose, onOpenAgent }: { ctx: Ctx; onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [mode, setMode] = useState<"agents" | "twins" | "missions">("agents");
  const [sel, setSel] = useState(ctx.agents[0]?.id || "");
  const [atab, setAtab] = useState("Overview");
  const [twin, setTwin] = useState(ctx.agents[0]?.id || "");
  const [ttab, setTtab] = useState("Identity");
  const [mis, setMis] = useState(ctx.missions[0]?.id || "");
  const [mtab, setMtab] = useState("Overview");

  const a = ctx.agents.find((x) => x.id === sel) || ctx.agents[0];
  const tw = ctx.agents.find((x) => x.id === twin) || ctx.agents[0];
  const m = ctx.missions.find((x) => x.id === mis) || ctx.missions[0];
  const dev = (ag: any) => ctx.devices.find((d) => d.id === ag?.deviceId);
  const agExec = (id: string) => ctx.exec.filter((e) => e.agentId === id);
  const lcIndex = (ag: any) => ag?.state === "ACTIVE" ? 3 : ag?.state === "READY" ? 2 : 1;

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("epic_agent_os_v1", JSON.stringify({ ts, agents: ctx.agents.length }));
    localStorage.setItem("epic_agent_registry_v2", JSON.stringify({ ts, agents: ctx.agents.map((x) => ({ id: x.id, name: x.name, role: x.role, state: x.state, readiness: x.readiness })) }));
    localStorage.setItem("epic_agent_brain_v1", JSON.stringify({ ts }));
    localStorage.setItem("epic_agent_memory_v1", JSON.stringify({ ts }));
    localStorage.setItem("epic_agent_goals_v1", JSON.stringify({ ts }));
    localStorage.setItem("epic_agent_tasks_v1", JSON.stringify({ ts, tasks: ctx.exec.length }));
    localStorage.setItem("epic_twin_center_v1", JSON.stringify({ ts, twins: ctx.agents.map((x) => x.name) }));
    localStorage.setItem("epic_twin_graph_v1", JSON.stringify({ ts }));
    localStorage.setItem("epic_mission_control_v1", JSON.stringify({ ts, missions: ctx.missions.length }));
    localStorage.setItem("epic_mission_board_v1", JSON.stringify({ ts, board: BOARD.map((c) => ({ col: c, count: ctx.missions.filter((mm) => STATUS_TO_COL[mm.status] === c).length })) }));
    localStorage.setItem("epic_mission_reports_v1", JSON.stringify({ ts }));
    localStorage.setItem("epic_lifecycle_v1", JSON.stringify({ ts, stages: LIFECYCLE }));
  } catch {} }, [ctx]);

  function AgentProfile() {
    if (!a) return <Card><div className="text-tg-muted">Нет агентов.</div></Card>;
    const myExec = agExec(a.id); const d = dev(a); const myMissions = ctx.missions.filter((x) => x.agentId === a.id);
    if (atab === "Overview") return <div className="grid gap-2 sm:grid-cols-2">{([["Name", a.name], ["Role", a.role], ["State", a.state], ["Readiness", (a.readiness ?? "—") + "%"], ["Mission", myMissions[0]?.title || "—"], ["Owner", a.owner || "—"], ["Device", d?.name || "—"], ["Model", a.model || "—"]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-sm font-bold">{v}</div></Card>)}</div>;
    if (atab === "Identity") return <Card t="Identity"><div className="grid gap-1 text-sm sm:grid-cols-2">{([["Name", a.name], ["Role", a.role], ["Description", a.personality || "AI entity"], ["Owner", a.owner || "—"], ["Priority", a.priority || "HIGH"], ["Status", a.state], ["Created", "2026-06"], ["Version", "v2"]] as const).map(([l, v]) => <div key={l}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>;
    if (atab === "Brain") return <Card t="Brain Center"><div className="grid gap-1 text-sm sm:grid-cols-2">{([["Current Goal", a.currentGoal || a.goals?.[0]?.title || "—"], ["Long Term Goal", "Масштабирование медиасети"], ["Current Mission", myMissions[0]?.title || "—"], ["Skills", (a.integrations || []).join(", ") || "—"], ["Tools", "WORLD · Telegram · Media · Devices"], ["Capabilities", "контент, эфир, аналитика"], ["Limitations", "read-only runtime"], ["Dependencies", d?.name || "—"]] as const).map(([l, v]) => <div key={l}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>;
    if (atab === "Memory") return <div className="space-y-2"><Card t="Memory Center"><div className="grid gap-2 sm:grid-cols-3">{([["Short Term", (a.shortMem || []).length], ["Long Term", (a.longMem || []).length], ["Semantic", a.knowledge?.length || 0], ["Project", 4], ["Mission", myMissions.length], ["Conversation", 12]] as const).map(([l, v]) => <div key={l} className="rounded-lg bg-tg-bg/40 p-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-lg font-black text-cyan-300">{v}</div></div>)}</div></Card>
      <Card t="Timeline"><div className="space-y-0.5 text-[12px]">{(a.activity || []).slice().reverse().slice(0, 8).map((x: any, i: number) => <div key={i}><b className="text-tg-text">{x.t}</b> <span className="text-tg-muted">{x.action}</span></div>)}{!(a.activity || []).length && <div className="text-tg-muted">Событий нет.</div>}</div></Card></div>;
    if (atab === "Knowledge") return <Card t="Knowledge Center"><div className="flex flex-wrap gap-1 text-[11px]">{(a.knowledge || ["—"]).map((k: string, i: number) => <span key={i} className="rounded-full bg-tg-bg px-2 py-0.5 text-tg-muted">✓ {k}</span>)}</div></Card>;
    if (atab === "Goals") return <Card t="Goals Center"><div className="space-y-1">{(a.goals || []).length ? a.goals.map((g: any, i: number) => <div key={i} className="flex items-center gap-2 text-sm"><Dot s={g.status || "active"} /><span className="flex-1">{g.title}</span><span className="text-[11px] text-tg-muted">{g.priority || "—"} · {g.status || "active"}</span></div>) : <div className="text-tg-muted text-sm">Целей нет.</div>}</div></Card>;
    if (atab === "Tasks") return <Card t="Task Center"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Task", "Status", "Priority", "Mission"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{myExec.length ? myExec.map((e) => <tr key={e.id} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{e.title}</td><td className="px-2">{e.status}</td><td className="px-2 text-tg-muted">{e.priority}</td><td className="px-2 text-tg-muted">{ctx.missions.find((mm) => mm.id === e.missionId)?.title || "—"}</td></tr>) : <tr><td colSpan={4} className="px-2 py-3 text-tg-muted">Задач нет.</td></tr>}</tbody></table></Card>;
    if (atab === "Accounts") return <Card t="Accounts Center"><div className="grid gap-1.5 sm:grid-cols-3">{PLATFORMS.map((p) => <div key={p} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-2.5 py-1.5 text-[12px]"><span>{p}</span><span className="ml-auto text-emerald-400">✓</span></div>)}</div></Card>;
    if (atab === "Devices") return <Card t="Device Center"><div className="grid gap-1 text-sm sm:grid-cols-2">{([["GeeLark Device", d?.name || "PHONE-01"], ["Cloud Phone", d?.name || "—"], ["Proxy", "PRX-EU-01"], ["VPN", "active"], ["Browser", "Chrome"], ["Session", ctx.bind && Object.entries(ctx.bind).find(([, ag]) => ag === a.id)?.[0] || "—"]] as const).map(([l, v]) => <div key={l}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>;
    if (atab === "Voice") return <Card t="Voice Center"><div className="grid gap-1 text-sm sm:grid-cols-2">{[["Voice", a.voice || "ElevenLabs"], ["Engine", "ElevenLabs / OpenVoice"], ["Clones", "2"], ["Presets", "warm · energetic · night"]].map(([l, v]) => <div key={l as string}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>;
    if (atab === "Face") return <Card t="Face Center"><div className="grid gap-1 text-sm sm:grid-cols-2">{[["Face Model", "DeepFace v3"], ["FaceFusion", "ready"], ["Character Images", "12"], ["Live Avatar", "configured"]].map(([l, v]) => <div key={l as string}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}<div className="col-span-2 mt-1 text-[10px] text-tg-muted">Identity-validation only · consent required.</div></div></Card>;
    if (atab === "Media") return <Card t="Media Center"><div className="flex flex-wrap gap-1.5 text-[11px]">{["Scripts", "Assets", "Images", "Videos", "Audio", "Projects", "Campaigns", "Publishing"].map((s) => <span key={s} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{s}</span>)}</div></Card>;
    if (atab === "Publishing") return <Card t="Publishing Center"><div className="flex flex-wrap gap-1.5 text-[11px]">{["Draft", "Review", "Ready", "Scheduled", "Published", "Archived"].map((s) => <span key={s} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{s}</span>)}</div></Card>;
    if (atab === "Analytics") return <Card t="Analytics Center"><div className="space-y-1.5">{([["Views", 64], ["Reach", 52], ["Followers", 71], ["Engagement", 48], ["Growth", 40], ["Revenue", 30], ["Activity", 80]] as const).map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-24 text-tg-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: v + "%" }} /></div><span className="w-8 text-right">{v}</span></div>)}</div></Card>;
    if (atab === "History") return <Card t="History Center"><div className="space-y-0.5 text-[12px]">{(a.activity || []).slice().reverse().map((x: any, i: number) => <div key={i}><b className="text-tg-text">{x.t}</b> <span className="text-tg-muted">{x.action}{x.result ? " · " + x.result : ""}</span></div>)}{!(a.activity || []).length && <div className="text-tg-muted">Истории нет.</div>}</div></Card>;
    // Lifecycle
    const li = lcIndex(a);
    return <Card t="Lifecycle Center"><div className="flex flex-wrap items-center gap-1.5 text-[11px]">{LIFECYCLE.map((s, i) => <span key={s} className="flex items-center gap-1.5"><span className={`rounded-lg px-2.5 py-1 ${i === li ? "bg-tg-active text-white font-bold" : i < li ? "bg-emerald-600/20 text-emerald-300" : "bg-tg-bg text-tg-muted"}`}>{s}</span>{i < LIFECYCLE.length - 1 && <span className="text-tg-muted">→</span>}</span>)}</div></Card>;
  }

  function TwinProfile() {
    if (!tw) return <Card><div className="text-tg-muted">Нет двойников.</div></Card>;
    if (ttab === "Appearance") return <Card t="Appearance"><div className="flex flex-wrap gap-1.5 text-[11px]">{["Photo", "Face Models", "Reference Packs", "Body Presets", "Style Presets", "Wardrobe"].map((s) => <span key={s} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{s}</span>)}</div></Card>;
    if (ttab === "Personality") return <Card t="Personality"><div className="grid gap-1 text-sm sm:grid-cols-2">{[["Traits", tw.personality || "bold · witty"], ["Tone", "energetic"], ["Behavior", "host-driven"], ["Speaking Style", "fast, punchy"], ["Content Style", "shorts, sketches"], ["Knowledge Domains", "AI, music, cyber"]].map(([l, v]) => <div key={l as string}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>;
    if (ttab === "Relationships") return <Card t="Relationships"><div className="space-y-1 text-sm">{[["Twin ↔ Agent", tw.name], ["Twin ↔ Device", dev(tw)?.name || "PHONE-01"], ["Twin ↔ Account", "Telegram, TikTok, Instagram"], ["Twin ↔ Media", "EVA Shorts"], ["Twin ↔ Mission", ctx.missions.find((x) => x.agentId === tw.id)?.title || "—"]].map(([l, v]) => <div key={l as string} className="flex gap-2"><span className="w-32 text-tg-muted">{l}</span><b>{v}</b></div>)}</div></Card>;
    // default Identity/others reuse simple
    return <Card t={ttab}><div className="grid gap-1 text-sm sm:grid-cols-2">{([["Name", tw.name], ["Role", tw.role], ["Voice", tw.voice || "ElevenLabs"], ["Memory items", (tw.shortMem?.length || 0) + (tw.longMem?.length || 0)], ["Accounts", PLATFORMS.length], ["Device", dev(tw)?.name || "—"]] as const).map(([l, v]) => <div key={l}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>;
  }

  function TwinGraph() {
    const nodes = [{ id: "t", label: tw?.name, x: 340, y: 180 }, ...["Device", "Account", "Media", "Mission", "Voice", "Face"].map((p, i) => { const ang = (i / 6) * Math.PI * 2; return { id: p, label: p, x: 340 + Math.cos(ang) * 230, y: 180 + Math.sin(ang) * 130 }; })];
    return <Card t="Digital Twin Graph"><svg width="100%" height="300" viewBox="0 0 680 360">{nodes.slice(1).map((n, i) => <line key={i} x1={340} y1={180} x2={n.x} y2={n.y} stroke="rgba(232,121,249,.25)" strokeWidth={1.3} />)}{nodes.map((n) => <g key={n.id}><circle cx={n.x} cy={n.y} r={n.id === "t" ? 26 : 16} fill={n.id === "t" ? av(tw?.name || "twin") : "#e879f9"} opacity={0.85} /><text x={n.x} y={n.y + (n.id === "t" ? 42 : 30)} fill="#cbd5e1" fontSize="11" textAnchor="middle">{n.label}</text></g>)}</svg></Card>;
  }

  function MissionProfile() {
    if (!m) return <Card><div className="text-tg-muted">Нет миссий.</div></Card>;
    const ag = ctx.agents.find((x) => x.id === m.agentId);
    if (mtab === "Objectives") return <Card t="Objectives"><div className="space-y-1.5">{(m.steps || [{ title: "Цель миссии", status: "PENDING" }]).map((s: any, i: number) => <div key={i} className="flex items-center gap-2 text-sm"><Dot s={s.status === "DONE" ? "Completed" : "Ready"} /><span className="flex-1">{s.title}</span><span className="text-[11px] text-tg-muted">{s.status}</span></div>)}<div className="mt-1 text-[11px] text-tg-muted">Progress: {m.readiness ?? 50}% · Priority: {m.priority}</div></div></Card>;
    if (mtab === "Agents") return <Card t="Agents"><div className="flex items-center gap-2 text-sm"><div className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: av(ag?.name || "a") }}>{ini(ag?.name || "—")}</div><span>{ag?.name || "—"}</span><button onClick={() => ag && onOpenAgent?.(ag.id)} className="ml-auto rounded bg-tg-active px-2 py-1 text-[10px] font-semibold text-white">Open</button></div></Card>;
    if (mtab === "Devices") return <Card t="Devices"><div className="text-sm">{dev(ag)?.name || "PHONE-01"} · proxy PRX-EU-01</div></Card>;
    if (mtab === "Content") return <Card t="Content"><div className="flex flex-wrap gap-1.5 text-[11px]">{["Scripts", "Images", "Videos", "Audio"].map((s) => <span key={s} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{s}</span>)}</div></Card>;
    if (mtab === "Publishing") return <Card t="Publishing"><div className="flex flex-wrap gap-1.5 text-[11px]">{["Telegram", "TikTok", "Instagram", "YouTube", "Facebook", "X", "Website"].map((s) => <span key={s} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{s}</span>)}</div></Card>;
    if (mtab === "Analytics") return <Card t="Analytics"><div className="space-y-1.5">{([["Reach", 60], ["Engagement", 48], ["Conversions", 32]] as const).map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-24 text-tg-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: v + "%" }} /></div><span className="w-8 text-right">{v}</span></div>)}</div></Card>;
    if (mtab === "Timeline") return <Card t="Timeline"><div className="space-y-0.5 text-[12px]">{[["created", m.createdAt], ["updated", m.updatedAt], ["status", m.status]].map(([l, v]) => <div key={l}><b className="text-tg-text">{l}</b> <span className="text-tg-muted">{v}</span></div>)}</div></Card>;
    if (mtab === "Reports") return <Card t="Reports"><div className="text-sm text-tg-muted">Mission «{m.title}» · {m.status} · агент {ag?.name || "—"}. Отчёт mock.</div></Card>;
    return <Card t="Overview"><div className="grid gap-1 text-sm sm:grid-cols-2">{([["Title", m.title], ["Status", m.status], ["Priority", m.priority], ["Agent", ag?.name || "—"], ["Progress", (m.readiness ?? 50) + "%"], ["Created", m.createdAt]] as const).map(([l, v]) => <div key={l}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>;
  }

  const tabRow = (tabs: string[], cur: string, set: (s: string) => void) => <div className="mb-2 flex flex-wrap gap-1">{tabs.map((t) => <button key={t} onClick={() => set(t)} className={`rounded-full px-2.5 py-1 text-[11px] ${cur === t ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{t}</button>)}</div>;

  return (
    <div className="fixed inset-0 z-[64] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🤖 AGENT OS</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · CORE</span>
        <div className="ml-2 flex overflow-hidden rounded-lg ring-1 ring-tg-line">{([["agents", "🤖 Agent OS"], ["twins", "👤 Digital Twins"], ["missions", "🎯 Mission Control"]] as const).map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`px-3 py-1.5 text-xs font-semibold ${mode === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{label}</button>)}</div>
        <div className="ml-auto text-[11px] text-tg-muted">{ctx.agents.length} агентов · {ctx.missions.length} миссий</div>
      </header>

      {mode === "agents" && <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Agent Registry 2.0</div>{ctx.agents.map((ag) => <button key={ag.id} onClick={() => setSel(ag.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${sel === ag.id ? "border-tg-accent bg-tg-active/20" : "border-tg-line hover:border-tg-accent/50"}`}><div className="flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: av(ag.name) }}>{ini(ag.name)}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{ag.name}</div><div className="flex items-center gap-1 text-[10px] text-tg-muted"><Dot s={ag.state} />{ag.role} · {ag.readiness ?? 0}%</div></div></button>)}</nav>
        <main className="min-h-0 overflow-auto p-4"><div className="mb-2 flex items-center gap-2"><div className="text-lg font-black">{a?.name}</div><button onClick={() => a && onOpenAgent?.(a.id)} className="rounded-lg bg-tg-active px-3 py-1 text-[11px] font-semibold text-white">Open Workspace →</button></div>{tabRow(AGENT_TABS, atab, setAtab)}<AgentProfile /></main>
      </div>}

      {mode === "twins" && <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">Twin Registry</div>{ctx.agents.map((ag) => <button key={ag.id} onClick={() => setTwin(ag.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${twin === ag.id ? "border-fuchsia-400 bg-fuchsia-600/15" : "border-tg-line hover:border-fuchsia-400/50"}`}><div className="flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: av(ag.name) }}>{ini(ag.name)}</div><div className="truncate text-sm font-semibold">{ag.name}</div></button>)}</nav>
        <main className="min-h-0 overflow-auto p-4"><div className="mb-2 text-lg font-black">{tw?.name} · Digital Twin</div>{tabRow(TWIN_TABS, ttab, setTtab)}{ttab === "Relationships" ? <div className="space-y-3"><TwinProfile /><TwinGraph /></div> : <TwinProfile />}</main>
      </div>}

      {mode === "missions" && <div className="grid min-h-0 flex-1 grid-cols-[1fr_260px]">
        <main className="min-h-0 overflow-auto p-4">
          <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-7">{BOARD.map((c) => <div key={c} className="rounded-xl border border-tg-line bg-tg-panel/60 p-2"><div className="text-[10px] uppercase text-tg-muted">{c}</div><div className="mt-1 space-y-1">{ctx.missions.filter((mm) => STATUS_TO_COL[mm.status] === c).map((mm) => <button key={mm.id} onClick={() => setMis(mm.id)} className={`block w-full truncate rounded bg-tg-bg/50 px-1.5 py-1 text-left text-[10px] ${mis === mm.id ? "ring-1 ring-tg-accent" : ""}`}>{mm.title}</button>)}{!ctx.missions.some((mm) => STATUS_TO_COL[mm.status] === c) && <div className="text-[9px] text-tg-muted">—</div>}</div></div>)}</div>
          <div className="mb-2 text-lg font-black">{m?.title}</div>{tabRow(MISSION_TABS, mtab, setMtab)}<MissionProfile />
        </main>
        <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Agent Commander</div>
          <Card t="Current Missions"><div className="text-2xl font-black text-cyan-300">{ctx.missions.filter((x) => ["ACTIVE", "RUNNING", "WAITING_APPROVAL"].includes(x.status)).length}</div></Card>
          <div className="mt-2"><Card t="Mission Health"><div className="text-sm text-emerald-300">{ctx.missions.filter((x) => x.status === "BLOCKED").length === 0 ? "Healthy" : "Warning"}</div></Card></div>
          <div className="mt-2"><Card t="Blocked"><div className="text-sm">{ctx.missions.filter((x) => x.status === "BLOCKED").length}</div></Card></div>
          <div className="mt-2"><Card t="Recommendations"><div className="space-y-1 text-[11px] text-tg-muted">{ctx.missions.filter((x) => x.status === "WAITING_APPROVAL").map((x) => <div key={x.id}>• Подтвердить: {x.title}</div>)}<div>• Назначить агентов на Planned-миссии.</div></div></Card></div>
        </aside>
      </div>}
    </div>
  );
}
