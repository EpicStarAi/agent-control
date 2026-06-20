"use client";

// OPERATIONS CENTER & LAUNCH READINESS (L10) — final pre-launch HQ for DEEP INSIDE.
// Category: OPERATIONS · CRITICAL. UI + localStorage + derived/mock only. All tests/checks are SIMULATIONS. Additive.
// NOTE: separate from the existing K1-K8 OperationsCenter.tsx — this is the launch-readiness / war-room layer.

import { useEffect, useState } from "react";

const SECTIONS: [string, string][] = [
  ["launch", "🚀 Launch Readiness"], ["health", "💚 System Health"], ["tests", "🧪 Test Center"],
  ["scenarios", "🎭 Scenario Simulator"], ["incidents", "🚨 Incident Center"], ["monitoring", "📡 Monitoring"],
  ["checklist", "📋 Launch Checklist"], ["audit", "🔍 Audit Center"], ["release", "📦 Release Control"], ["warroom", "⚔ War Room"],
];

function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }
function st(v: number) { return v >= 90 ? "Launch Ready" : v >= 75 ? "Ready" : v >= 50 ? "Partial" : "Not Ready"; }
const SC: Record<string, string> = { "Launch Ready": "#4ade80", Ready: "#38bdf8", Partial: "#fbbf24", "Not Ready": "#f87171" };
function rc(v: number) { return SC[st(v)]; }

function readiness() {
  const act = readLS("activation_engine_v1");
  const af = readLS("automation_fabric");
  const base: Record<string, number> = { Infrastructure: 92, Agents: 80, Platforms: 72, Media: 74, Content: 70, Revenue: 60, Automation: af?.successRate ?? 82, Knowledge: 88 };
  if (act?.domains) { (act.domains as [string, number][]).forEach(([k, v]) => { if (k === "Infrastructure") base.Infrastructure = v; if (k === "Agents") base.Agents = v; if (k === "Platforms") base.Platforms = v; if (k === "Media Factory") base.Media = v; if (k === "Revenue") base.Revenue = v; }); }
  return base;
}
const TESTS = [
  { type: "Agent Test", pass: 9, fail: 1, status: "Pass" }, { type: "Platform Test", pass: 7, fail: 2, status: "Pass" },
  { type: "Workflow Test", pass: 8, fail: 1, status: "Pass" }, { type: "Content Test", pass: 6, fail: 0, status: "Pass" },
  { type: "Media Test", pass: 5, fail: 1, status: "Pass" }, { type: "Revenue Test", pass: 4, fail: 2, status: "Warn" },
  { type: "Integration Test", pass: 11, fail: 1, status: "Pass" }, { type: "Simulation Test", pass: 6, fail: 0, status: "Pass" },
];
const SCENARIOS = [
  { name: "Launch Day", impact: "Пиковая нагрузка, нужен мониторинг и manual approval", risk: "Medium" },
  { name: "First 100 Followers", impact: "Базовый рост, контент-план держит темп", risk: "Low" },
  { name: "First 1000 Followers", impact: "Рост вовлечённости, усилить модерацию", risk: "Low" },
  { name: "First Sponsor", impact: "Активируется Sponsor Campaign workflow", risk: "Low" },
  { name: "First Radio Broadcast", impact: "Studio/Schedule должны быть READY", risk: "Medium" },
  { name: "First Music Release", impact: "Проверить royalties + copyright gate", risk: "Medium" },
  { name: "Platform Outage", impact: "Деградация одного канала, fallback на другие", risk: "High" },
  { name: "Revenue Drop", impact: "Пересмотр приоритетов, упор на sponsors", risk: "High" },
  { name: "Growth Surge", impact: "Нагрузка на рендер/очередь, нужен autoscale-план", risk: "Medium" },
];
const INCIDENTS = [
  { id: "INC-001", title: "Android Device offline", cat: "Infrastructure", status: "Investigating", sev: "Medium" },
  { id: "INC-002", title: "ComfyUI не настроен", cat: "Infrastructure", status: "Open", sev: "High" },
  { id: "INC-003", title: "Mission KPI sync failed", cat: "Automation", status: "Mitigated", sev: "Medium" },
  { id: "INC-004", title: "TikTok policy review pending", cat: "Platform", status: "Open", sev: "Low" },
  { id: "INC-005", title: "Premium revenue readiness low", cat: "Revenue", status: "Investigating", sev: "Low" },
];
const MONITORING = { critical: 1, warnings: 3, info: 6 };
const MON_EVENTS = [
  { t: "09:30", lvl: "Critical", text: "ComfyUI render unavailable (preview)" }, { t: "09:12", lvl: "Warning", text: "Revenue readiness < 65%" },
  { t: "08:50", lvl: "Info", text: "EVA activation reached 88%" }, { t: "08:20", lvl: "Warning", text: "Device fleet 5/6 online" },
  { t: "07:55", lvl: "Info", text: "Knowledge update completed" },
];
const CHECKLIST: Record<string, [string, string][]> = {
  Infrastructure: [["VPS online", "Completed"], ["Docker stack", "Completed"], ["ComfyUI", "Pending"]],
  Agents: [["Identity ready", "Completed"], ["Voice/Face", "Ready"], ["Activation gates", "Ready"]],
  Content: [["Content plan", "Ready"], ["Templates", "Ready"], ["Render queue", "Pending"]],
  Media: [["Radio schedule", "Ready"], ["Studio cue", "Pending"]],
  Platforms: [["Profiles", "Completed"], ["Policy review", "Pending"]],
  Knowledge: [["Playbooks", "Completed"], ["Decision log", "Completed"]],
  Automation: [["Workflows", "Ready"], ["Triggers", "Ready"], ["Retry policy", "Pending"]],
  Economy: [["Revenue streams", "Ready"], ["Premium", "Pending"]],
};
const AUDITS = [
  { name: "Architecture Audit", result: "Pass", note: "Аддитивные модули, маршруты целы" },
  { name: "Data Audit", result: "Pass", note: "localStorage схемы с safety-флагами" },
  { name: "Workflow Audit", result: "Warn", note: "Mission Review нуждается в retry" },
  { name: "Content Audit", result: "Pass", note: "Consent/copyright гейты на месте" },
  { name: "Knowledge Audit", result: "Pass", note: "Decision log актуален" },
  { name: "Readiness Audit", result: "Warn", note: "Revenue/Premium ниже порога" },
];
const RELEASE = { current: "v0.9 (architecture)", candidate: "v1.0-rc Operations", approved: "v0.9", rollback: "v0.8", notes: ["L1-L10 модули собраны", "Preview-only, без runtime", "Все проверки — симуляции"] };

function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
function Ring({ v, size = 96 }: { v: number; size?: number }) { const r = size / 2 - 6; const c = 2 * Math.PI * r; return <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={6} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={rc(v)} strokeWidth={6} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} strokeLinecap="round" /><text x="50%" y="50%" transform={`rotate(90 ${size / 2} ${size / 2})`} textAnchor="middle" dominantBaseline="central" fill={rc(v)} fontSize={size / 4} fontWeight="900">{v}</text></svg>; }
const SEV: Record<string, string> = { High: "#f87171", Medium: "#fbbf24", Low: "#4ade80", Critical: "#f87171", Warning: "#fbbf24", Info: "#38bdf8", Open: "#f87171", Investigating: "#fbbf24", Mitigated: "#38bdf8", Resolved: "#4ade80", Closed: "#6b7280", Pass: "#4ade80", Warn: "#fbbf24", Completed: "#22c55e", Ready: "#38bdf8", Pending: "#9ca3af" };

export function LaunchOpsCenter({ onClose }: { onClose: () => void }) {
  const [sec, setSec] = useState("launch");
  const dom = readiness();
  const domains = Object.entries(dom) as [string, number][];
  const overall = Math.round(domains.reduce((s, d) => s + d[1], 0) / domains.length);
  const openIncidents = INCIDENTS.filter((i) => i.status === "Open" || i.status === "Investigating").length;
  const criticalRisks = INCIDENTS.filter((i) => i.sev === "High").length;
  const goNoGo = overall >= 85 && criticalRisks === 0 ? "GO" : overall >= 70 ? "CONDITIONAL GO" : "NO-GO";
  const goColor = goNoGo === "GO" ? "#4ade80" : goNoGo === "CONDITIONAL GO" ? "#fbbf24" : "#f87171";

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("operations_center", JSON.stringify({ ts, overall, goNoGo, openIncidents }));
    localStorage.setItem("launch_readiness", JSON.stringify({ ts, overall, domains: dom, state: st(overall) }));
    localStorage.setItem("test_center", JSON.stringify({ ts, tests: TESTS }));
    localStorage.setItem("scenario_simulator", JSON.stringify({ ts, scenarios: SCENARIOS.map((s) => s.name) }));
    localStorage.setItem("incident_center", JSON.stringify({ ts, incidents: INCIDENTS }));
    localStorage.setItem("monitoring_center", JSON.stringify({ ts, ...MONITORING, events: MON_EVENTS }));
    localStorage.setItem("launch_checklist", JSON.stringify({ ts, sections: Object.keys(CHECKLIST) }));
    localStorage.setItem("audit_center", JSON.stringify({ ts, audits: AUDITS }));
    localStorage.setItem("release_control", JSON.stringify({ ts, ...RELEASE }));
    localStorage.setItem("war_room", JSON.stringify({ ts, overall, goNoGo, openIncidents, criticalRisks }));
  } catch {} }, [overall, goNoGo, openIncidents]);

  function Launch() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-tg-line bg-tg-panel/60 p-4"><Ring v={overall} /><div><div className="text-[11px] uppercase text-tg-muted">Overall Launch Readiness</div><div className="text-3xl font-black" style={{ color: rc(overall) }}>{overall}% · {st(overall)}</div></div><div className="ml-auto rounded-xl border px-4 py-2" style={{ borderColor: goColor }}><div className="text-[10px] uppercase text-tg-muted">Go / No-Go</div><div className="text-2xl font-black" style={{ color: goColor }}>{goNoGo}</div></div></div>
      <Card t="Readiness by domain"><div className="space-y-1.5">{domains.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-32 text-tg-muted">{l}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: rc(v) }} /></div><b className="w-24 text-right" style={{ color: rc(v) }}>{v}% · {st(v)}</b></div>)}</div></Card>
    </main>;
  }
  function Health() {
    const items: [string, number][] = [["Infrastructure Health", dom.Infrastructure], ["Agent Health", dom.Agents], ["Automation Health", dom.Automation], ["Content Health", dom.Content], ["Economy Health", dom.Revenue], ["World Health", overall]];
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map(([l, v]) => <div key={l} className="flex items-center gap-3 rounded-xl bg-tg-bg/40 p-3"><Ring v={v} size={60} /><div><div className="text-sm font-bold">{l}</div><div className="text-[11px]" style={{ color: rc(v) }}>{st(v)}</div></div></div>)}</div></main>;
  }
  function Tests() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Test Center (симуляции)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Test Type", "Passed", "Failed", "Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{TESTS.map((t) => <tr key={t.type} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{t.type}</td><td className="px-2 text-emerald-300">{t.pass}</td><td className="px-2 text-red-300">{t.fail}</td><td className="px-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: SEV[t.status] + "22", color: SEV[t.status] }}>{t.status}</span></td></tr>)}</tbody></table><div className="mt-2 text-[10px] text-tg-muted">Все тесты — симуляции, без реальных запусков.</div></Card></main>;
  }
  function Scenarios() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{SCENARIOS.map((s) => <Card key={s.name} t={s.name}><div className="text-[12px] text-tg-muted">{s.impact}</div><div className="mt-1"><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: SEV[s.risk] + "22", color: SEV[s.risk] }}>Risk: {s.risk}</span></div></Card>)}</div></main>;
  }
  function Incidents() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Incident Center"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["ID", "Title", "Category", "Severity", "Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{INCIDENTS.map((i) => <tr key={i.id} className="border-t border-tg-line"><td className="px-2 py-1.5 text-tg-muted">{i.id}</td><td className="px-2 font-semibold">{i.title}</td><td className="px-2 text-tg-muted">{i.cat}</td><td className="px-2"><span style={{ color: SEV[i.sev] }}>{i.sev}</span></td><td className="px-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: SEV[i.status] + "22", color: SEV[i.status] }}>{i.status}</span></td></tr>)}</tbody></table></Card></main>;
  }
  function Monitoring() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-3 grid grid-cols-3 gap-2"><div className="rounded-xl bg-red-500/10 p-3"><div className="text-[10px] uppercase text-tg-muted">Critical Alerts</div><div className="text-2xl font-black text-red-300">{MONITORING.critical}</div></div><div className="rounded-xl bg-amber-500/10 p-3"><div className="text-[10px] uppercase text-tg-muted">Warnings</div><div className="text-2xl font-black text-amber-300">{MONITORING.warnings}</div></div><div className="rounded-xl bg-sky-500/10 p-3"><div className="text-[10px] uppercase text-tg-muted">Info</div><div className="text-2xl font-black text-sky-300">{MONITORING.info}</div></div></div><Card t="Recent Events · Timeline"><div className="space-y-1 text-[12px]">{MON_EVENTS.map((e, i) => <div key={i} className="flex gap-2"><span className="text-tg-muted">{e.t}</span><span className="w-16 font-bold" style={{ color: SEV[e.lvl] }}>{e.lvl}</span><span className="flex-1">{e.text}</span></div>)}</div></Card></main>;
  }
  function Checklist() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(CHECKLIST).map(([cat, items]) => <Card key={cat} t={cat}><div className="space-y-1">{items.map(([name, s]) => <div key={name} className="flex items-center gap-2 text-[12px]"><span className="flex-1">{name}</span><span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: SEV[s] + "22", color: SEV[s] }}>{s}</span></div>)}</div></Card>)}</div></main>;
  }
  function Audit() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Audit Center"><div className="space-y-1.5">{AUDITS.map((a) => <div key={a.name} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-3 py-2"><span className="flex-1 text-sm font-semibold">{a.name}</span><span className="text-[11px] text-tg-muted">{a.note}</span><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: SEV[a.result] + "22", color: SEV[a.result] }}>{a.result}</span></div>)}</div></Card></main>;
  }
  function Release() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 lg:grid-cols-2"><Card t="Release Control"><div className="space-y-1 text-[12px]">{[["Current Version", RELEASE.current], ["Candidate Version", RELEASE.candidate], ["Approved Version", RELEASE.approved], ["Rollback Candidate", RELEASE.rollback]].map(([l, v]) => <div key={l}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card><Card t="Release Notes"><div className="space-y-1 text-[12px]">{RELEASE.notes.map((n) => <div key={n}>• {n}</div>)}</div></Card></div></main>;
  }
  function WarRoom() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border-2 p-4" style={{ borderColor: goColor }}>
        <Ring v={overall} /><div><div className="text-[11px] uppercase text-tg-muted">Launch Status</div><div className="text-2xl font-black" style={{ color: goColor }}>{goNoGo}</div><div className="text-[12px] text-tg-muted">Readiness {overall}% · {st(overall)}</div></div>
        <div className="ml-auto text-center"><div className="text-[10px] uppercase text-tg-muted">Launch Countdown</div><div className="text-2xl font-black text-cyan-300">T‑12 нед</div><div className="text-[10px] text-tg-muted">(симуляция)</div></div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card t="🤖 AI COO · Launch Report (Go/No-Go)"><div className="space-y-1.5 text-[12px]">
          <div className="rounded-lg p-2" style={{ background: goColor + "18" }}><b style={{ color: goColor }}>Рекомендация: {goNoGo}.</b> Готовность {overall}%, критических рисков {criticalRisks}.</div>
          <div className="rounded-lg bg-emerald-500/10 p-2"><b className="text-emerald-300">Сильные стороны:</b> Infrastructure, Knowledge, Automation.</div>
          <div className="rounded-lg bg-red-500/10 p-2"><b className="text-red-300">Блокеры до GO:</b> ComfyUI, Revenue/Premium, retry-policy, policy review.</div>
          <div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Readiness Audit:</b> 4 Pass / 2 Warn. Risk Summary: 1 High, 2 Medium, 2 Low.</div>
        </div></Card>
        <div className="space-y-3">
          <Card t="Open Risks / Incidents"><div className="space-y-1 text-[12px]">{INCIDENTS.filter((i) => i.status !== "Resolved" && i.status !== "Closed").map((i) => <div key={i.id} className="flex gap-2"><span style={{ color: SEV[i.sev] }}>●</span><span className="flex-1">{i.title}</span><span className="text-tg-muted">{i.status}</span></div>)}</div></Card>
          <Card t="Top Priorities"><div className="space-y-1 text-[12px]">{["Настроить ComfyUI (High)", "Поднять Revenue/Premium readiness", "Retry-policy для KPI sync", "Пройти policy review платформ"].map((x, i) => <div key={i}><b className="text-amber-300">{i + 1}.</b> {x}</div>)}</div></Card>
        </div>
      </div>
    </main>;
  }

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🖥 OPERATIONS CENTER · LAUNCH</div>
        <span className="rounded-full border border-orange-500/40 bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-300">CRITICAL · OPERATIONS</span>
        <div className="ml-auto flex items-center gap-2 text-[11px]"><span className="rounded-full bg-tg-bg px-2.5 py-1">Readiness: <b style={{ color: rc(overall) }}>{overall}%</b></span><span className="rounded-full bg-tg-bg px-2.5 py-1">Incidents: <b className="text-red-300">{openIncidents}</b></span><span className="rounded-full px-2.5 py-1 font-bold" style={{ background: goColor + "22", color: goColor }}>{goNoGo}</span></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2">{SECTIONS.map(([id, label]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] ${sec === id ? "bg-tg-active text-white font-semibold" : "hover:bg-tg-hover/40"}`}>{label}</button>)}
          <div className="mt-3 rounded-lg border p-2 text-[10px]" style={{ borderColor: goColor }}><div className="font-black uppercase tracking-[0.18em]" style={{ color: goColor }}>Go / No-Go</div><div className="text-tg-muted">{goNoGo} · {overall}%</div></div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "launch" && <Launch />}
          {sec === "health" && <Health />}
          {sec === "tests" && <Tests />}
          {sec === "scenarios" && <Scenarios />}
          {sec === "incidents" && <Incidents />}
          {sec === "monitoring" && <Monitoring />}
          {sec === "checklist" && <Checklist />}
          {sec === "audit" && <Audit />}
          {sec === "release" && <Release />}
          {sec === "warroom" && <WarRoom />}
        </div>
      </div>
    </div>
  );
}
