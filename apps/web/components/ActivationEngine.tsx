"use client";

// ACTIVATION ENGINE — Operation Readiness Center for the whole DEEP INSIDE ecosystem.
// Category: OPERATIONS · CRITICAL. UI + localStorage + derived/mock only. No API/OAuth/secrets/launch/publish/payment. Additive.

import { useEffect, useMemo, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; devices: any[]; counts: Record<string, any> };

const SECTIONS: [string, string][] = [
  ["readiness", "🎯 Readiness Center"], ["agents", "🤖 Agent Activation"], ["devices", "📱 Device Readiness"],
  ["platforms", "🌍 Platform Readiness"], ["content", "🎬 Content Readiness"], ["broadcast", "📻 Broadcast Readiness"],
  ["revenue", "💰 Revenue Readiness"], ["infra", "⚙ Infrastructure Readiness"], ["ai", "🧠 AI Readiness"], ["analytics", "📊 Activation Analytics"],
];
const GATES = ["Identity", "Device", "Platform", "Content", "Audience", "Revenue", "ACTIVE"];

function state(score: number) { return score >= 95 ? "ACTIVE" : score >= 80 ? "READY" : score >= 55 ? "PARTIAL" : score >= 25 ? "INITIALIZING" : "NOT READY"; }
const SC: Record<string, string> = { "NOT READY": "#f87171", INITIALIZING: "#fb923c", PARTIAL: "#fbbf24", READY: "#38bdf8", ACTIVE: "#4ade80" };
const DOT: Record<string, string> = { "NOT READY": "🔴", INITIALIZING: "🟠", PARTIAL: "🟡", READY: "🔵", ACTIVE: "🟢" };
function rColor(v: number) { return SC[state(v)]; }

const AGENTS = [
  { id: "buch", name: "BUCH", emoji: "☠️", sub: { Identity: 95, Memory: 88, Goals: 82, Platforms: 78, Content: 70, Audience: 74, Revenue: 60 } },
  { id: "buchiha", name: "BUCHIHA", emoji: "😇", sub: { Identity: 96, Memory: 90, Goals: 85, Platforms: 80, Content: 76, Audience: 79, Revenue: 66 } },
  { id: "eva", name: "EVA NOVIKOVA", emoji: "💠", sub: { Identity: 98, Memory: 94, Goals: 90, Platforms: 88, Content: 84, Audience: 86, Revenue: 78 } },
  { id: "nova", name: "NOVA", emoji: "🎧", sub: { Identity: 90, Memory: 80, Goals: 72, Platforms: 70, Content: 64, Audience: 58, Revenue: 44 } },
  { id: "reporter", name: "AI REPORTER", emoji: "📰", sub: { Identity: 84, Memory: 70, Goals: 60, Platforms: 55, Content: 50, Audience: 40, Revenue: 28 } },
  { id: "newscaster", name: "AI NEWSCASTER", emoji: "🎙", sub: { Identity: 80, Memory: 66, Goals: 55, Platforms: 50, Content: 44, Audience: 35, Revenue: 22 } },
];
const agentScore = (a: typeof AGENTS[number]) => Math.round(Object.values(a.sub).reduce((s, v) => s + v, 0) / Object.values(a.sub).length);
const ENRICHED_AGENTS = AGENTS.map((a) => ({ ...a, score: agentScore(a), gate: GATES[Math.min(6, Object.values(a.sub).filter((v) => v >= 70).length)] }));

const DEVICES = [
  { name: "GeeLark Cloud Phone 01", health: 96, agent: "EVA NOVIKOVA", platforms: 3, readiness: 92 },
  { name: "GeeLark Cloud Phone 02", health: 88, agent: "BUCHIHA", platforms: 2, readiness: 84 },
  { name: "Android Device", health: 40, agent: "—", platforms: 0, readiness: 30 },
  { name: "Cloud Device", health: 90, agent: "BUCH", platforms: 2, readiness: 80 },
  { name: "Contabo VPS", health: 98, agent: "ALL", platforms: 9, readiness: 96 },
  { name: "Workstation", health: 92, agent: "—", platforms: 0, readiness: 70 },
];
const PLATFORMS = [
  { name: "Telegram", sub: { Profile: 95, Content: 80, Audience: 78, Growth: 70, Monetization: 64 } },
  { name: "TikTok", sub: { Profile: 88, Content: 76, Audience: 84, Growth: 90, Monetization: 30 } },
  { name: "Instagram", sub: { Profile: 90, Content: 72, Audience: 70, Growth: 64, Monetization: 40 } },
  { name: "YouTube", sub: { Profile: 92, Content: 78, Audience: 80, Growth: 74, Monetization: 72 } },
  { name: "Facebook", sub: { Profile: 70, Content: 50, Audience: 44, Growth: 30, Monetization: 24 } },
  { name: "X", sub: { Profile: 78, Content: 60, Audience: 56, Growth: 48, Monetization: 20 } },
  { name: "Pinterest", sub: { Profile: 80, Content: 64, Audience: 54, Growth: 58, Monetization: 26 } },
  { name: "LinkedIn", sub: { Profile: 60, Content: 40, Audience: 34, Growth: 28, Monetization: 12 } },
  { name: "Website", sub: { Profile: 84, Content: 66, Audience: 50, Growth: 46, Monetization: 52 } },
];
const platScore = (p: typeof PLATFORMS[number]) => Math.round(Object.values(p.sub).reduce((s, v) => s + v, 0) / 5);
const CONTENT = [
  { name: "Newsroom", queue: 6, assets: 28, scripts: 12, schedule: "daily", templates: 5, readiness: 78 },
  { name: "Music Factory", queue: 4, assets: 40, scripts: 8, schedule: "weekly", templates: 7, readiness: 72 },
  { name: "Live Studio", queue: 2, assets: 18, scripts: 5, schedule: "on-air", templates: 4, readiness: 66 },
  { name: "Podcasts", queue: 3, assets: 12, scripts: 6, schedule: "weekly", templates: 3, readiness: 58 },
  { name: "Advertising Factory", queue: 5, assets: 22, scripts: 9, schedule: "campaign", templates: 6, readiness: 70 },
];
const BROADCAST = [["Radio Ready", 88], ["Music Ready", 80], ["News Ready", 74], ["Hosts Ready", 82], ["Schedule Ready", 70], ["Studio Ready", 66]] as [string, number][];
const REVENUE = [
  { name: "Sponsors", readiness: 76, potential: "High", projected: 760 },
  { name: "Affiliate", readiness: 64, potential: "Medium", projected: 310 },
  { name: "Merch", readiness: 58, potential: "Medium", projected: 230 },
  { name: "Music", readiness: 70, potential: "High", projected: 520 },
  { name: "Radio", readiness: 62, potential: "Medium", projected: 290 },
  { name: "Premium", readiness: 40, potential: "Low", projected: 120 },
  { name: "Content", readiness: 66, potential: "High", projected: 235 },
];
const INFRA = [
  { name: "Docker", configured: true, connected: true, ready: 96 }, { name: "n8n", configured: true, connected: true, ready: 90 },
  { name: "OpenRouter", configured: true, connected: true, ready: 92 }, { name: "Claude", configured: true, connected: true, ready: 94 },
  { name: "ChatGPT", configured: true, connected: true, ready: 90 }, { name: "Grok", configured: true, connected: false, ready: 60 },
  { name: "Gemini", configured: true, connected: false, ready: 58 }, { name: "ElevenLabs", configured: true, connected: true, ready: 88 },
  { name: "HuggingFace", configured: true, connected: true, ready: 82 }, { name: "ComfyUI", configured: false, connected: false, ready: 40 },
  { name: "Cloudflare", configured: true, connected: true, ready: 95 }, { name: "Contabo", configured: true, connected: true, ready: 96 },
];
const AI_UNITS = [["AI COO", 92], ["AI Operator", 95], ["AI Director", 80], ["AI Producer", 74], ["AI DJ", 78], ["AI Reporter", 60], ["AI Newscaster", 55]] as [string, number][];
const TIMELINE = [
  { t: "09:20", icon: "🟢", text: "EVA NOVIKOVA → ACTIVE (readiness 88%)" },
  { t: "08:55", icon: "🔵", text: "YouTube platform → READY" },
  { t: "08:30", icon: "🟢", text: "Contabo VPS → ACTIVE" },
  { t: "08:00", icon: "🔵", text: "Sponsors revenue → READY" },
  { t: "07:40", icon: "🟡", text: "Music Factory project → PARTIAL" },
  { t: "07:10", icon: "🔴", text: "Android Device → NOT READY (offline)" },
];

function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
function Ring({ v, size = 64 }: { v: number; size?: number }) { const r = size / 2 - 5; const c = 2 * Math.PI * r; return <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={5} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={rColor(v)} strokeWidth={5} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} strokeLinecap="round" /><text x="50%" y="50%" className="rotate-90" transform={`rotate(90 ${size / 2} ${size / 2})`} textAnchor="middle" dominantBaseline="central" fill={rColor(v)} fontSize={size / 4} fontWeight="900">{v}</text></svg>; }
function Bar({ l, v }: { l: string; v: number }) { return <div className="flex items-center gap-2 text-[12px]"><span className="w-28 text-tg-muted">{l}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: rColor(v) }} /></div><span className="w-9 text-right" style={{ color: rColor(v) }}>{v}</span></div>; }
function SChip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: SC[s] + "22", color: SC[s] }}>{DOT[s]} {s}</span>; }

export function ActivationEngine({ ctx, onClose, onOpenAgent }: { ctx: Ctx; onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [sec, setSec] = useState("readiness");
  const [selAgent, setSelAgent] = useState("eva");

  const agentsReady = ENRICHED_AGENTS.filter((a) => a.score >= 80).length;
  const platReady = PLATFORMS.filter((p) => platScore(p) >= 80).length;
  const devReady = DEVICES.filter((d) => d.readiness >= 80).length;
  const contentReady = CONTENT.filter((c) => c.readiness >= 80).length;
  const revReady = REVENUE.filter((r) => r.readiness >= 70).length;
  const infraReady = INFRA.filter((i) => i.ready >= 80).length;
  const domains: [string, number][] = [
    ["Agents", Math.round(ENRICHED_AGENTS.reduce((s, a) => s + a.score, 0) / ENRICHED_AGENTS.length)],
    ["Platforms", Math.round(PLATFORMS.reduce((s, p) => s + platScore(p), 0) / PLATFORMS.length)],
    ["Devices", Math.round(DEVICES.reduce((s, d) => s + d.readiness, 0) / DEVICES.length)],
    ["Content", Math.round(CONTENT.reduce((s, c) => s + c.readiness, 0) / CONTENT.length)],
    ["Broadcast", Math.round(BROADCAST.reduce((s, b) => s + b[1], 0) / BROADCAST.length)],
    ["Revenue", Math.round(REVENUE.reduce((s, r) => s + r.readiness, 0) / REVENUE.length)],
    ["Infrastructure", Math.round(INFRA.reduce((s, i) => s + i.ready, 0) / INFRA.length)],
    ["AI", Math.round(AI_UNITS.reduce((s, a) => s + a[1], 0) / AI_UNITS.length)],
  ];
  const totalReadiness = Math.round(domains.reduce((s, d) => s + d[1], 0) / domains.length);
  const a = ENRICHED_AGENTS.find((x) => x.id === selAgent) || ENRICHED_AGENTS[0];

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("activation_engine_v1", JSON.stringify({ ts, totalReadiness, domains, gates: GATES }));
    localStorage.setItem("readiness_center_v1", JSON.stringify({ ts, totalReadiness, agentsReady, platReady, devReady, contentReady, revReady, infraReady }));
    localStorage.setItem("agent_activation_v1", JSON.stringify({ ts, agents: ENRICHED_AGENTS.map((x) => ({ id: x.id, name: x.name, score: x.score, state: state(x.score), gate: x.gate })) }));
    localStorage.setItem("device_readiness_v1", JSON.stringify({ ts, devices: DEVICES }));
    localStorage.setItem("platform_readiness_v1", JSON.stringify({ ts, platforms: PLATFORMS.map((p) => ({ name: p.name, score: platScore(p), state: state(platScore(p)) })) }));
    localStorage.setItem("content_readiness_v1", JSON.stringify({ ts, content: CONTENT }));
    localStorage.setItem("broadcast_readiness_v1", JSON.stringify({ ts, broadcast: BROADCAST }));
    localStorage.setItem("revenue_readiness_v1", JSON.stringify({ ts, revenue: REVENUE }));
    localStorage.setItem("infrastructure_readiness_v1", JSON.stringify({ ts, infra: INFRA }));
    localStorage.setItem("activation_timeline_v1", JSON.stringify({ ts, events: TIMELINE }));
  } catch {} }, [totalReadiness]);

  function Readiness() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-tg-line bg-tg-panel/60 p-4">
        <Ring v={totalReadiness} size={96} />
        <div><div className="text-[11px] uppercase text-tg-muted">Total Ecosystem Readiness</div><div className="text-3xl font-black" style={{ color: rColor(totalReadiness) }}>{totalReadiness}%</div><div className="mt-0.5"><SChip s={state(totalReadiness)} /></div></div>
        <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-3">{[["Agents Ready", agentsReady + "/" + ENRICHED_AGENTS.length], ["Platforms Ready", platReady + "/" + PLATFORMS.length], ["Devices Ready", devReady + "/" + DEVICES.length], ["Content Ready", contentReady + "/" + CONTENT.length], ["Revenue Ready", revReady + "/" + REVENUE.length], ["Infra Ready", infraReady + "/" + INFRA.length]].map(([l, v]) => <div key={l} className="rounded-xl bg-tg-bg/40 px-3 py-1.5"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-sm font-black">{v}</div></div>)}</div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card t="Readiness by domain"><div className="space-y-1.5">{domains.map(([l, v]) => <Bar key={l} l={l} v={v} />)}</div></Card>
        <Card t="🤖 AI COO · Activation Report"><div className="space-y-1.5 text-[12px]">
          <div className="rounded-lg bg-emerald-500/10 p-2"><b className="text-emerald-300">Готово:</b> {domains.filter((d) => d[1] >= 80).map((d) => d[0]).join(", ") || "—"}.</div>
          <div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Частично:</b> {domains.filter((d) => d[1] >= 55 && d[1] < 80).map((d) => d[0]).join(", ") || "—"}.</div>
          <div className="rounded-lg bg-red-500/10 p-2"><b className="text-red-300">Блокирует запуск:</b> {domains.filter((d) => d[1] < 55).map((d) => d[0]).join(", ") || "Android Device offline · ComfyUI не настроен"}.</div>
          <div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Следующий приоритет:</b> поднять Revenue и Premium, подключить Grok/Gemini, настроить ComfyUI, активировать Android Device.</div>
        </div></Card>
      </div>
      <div className="mt-3"><Card t="🕒 Activation Timeline"><div className="space-y-1 text-[12px]">{TIMELINE.map((e, i) => <div key={i} className="flex gap-2"><span className="text-tg-muted">{e.t}</span><span>{e.icon}</span><span className="flex-1">{e.text}</span></div>)}</div></Card></div>
    </main>;
  }

  function AgentActivation() {
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_300px]">
      <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Agents</div>{ENRICHED_AGENTS.map((x) => <button key={x.id} onClick={() => setSelAgent(x.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${selAgent === x.id ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><span className="text-lg">{x.emoji}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{x.name}</div><div className="text-[10px]" style={{ color: rColor(x.score) }}>{DOT[state(x.score)]} {x.score}%</div></div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-3"><div className="mb-2 flex items-center gap-2"><span className="text-xl">{a.emoji}</span><div className="text-lg font-black">{a.name}</div><SChip s={state(a.score)} /></div>
        <Card t="Sub-readiness"><div className="space-y-1.5">{Object.entries(a.sub).map(([l, v]) => <Bar key={l} l={l} v={v as number} />)}</div></Card>
        <div className="mt-3"><Card t="Activation Gates"><div className="flex flex-wrap items-center gap-1.5">{GATES.map((g, i) => { const passed = i < GATES.indexOf(a.gate) || a.gate === "ACTIVE"; const cur = g === a.gate; return <span key={g} className="flex items-center gap-1.5"><span className={`rounded-lg px-2.5 py-1 text-[11px] ${cur ? "bg-tg-active text-white font-bold" : passed ? "bg-emerald-600/20 text-emerald-300" : "bg-tg-bg text-tg-muted"}`}>{g}</span>{i < GATES.length - 1 && <span className="text-tg-muted">↓</span>}</span>; })}</div></Card></div>
      </main>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-2 flex flex-col items-center"><Ring v={a.score} size={88} /><div className="mt-1 text-sm font-bold">{a.name}</div><div className="text-[11px] text-tg-muted">Gate: {a.gate}</div></div><button onClick={() => onOpenAgent?.(a.id)} className="w-full rounded-lg bg-tg-active py-1.5 text-[12px] font-semibold text-white">Open Agent →</button></aside>
    </div>;
  }

  function DeviceReadiness() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Device Readiness"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Device", "Status", "Health", "Assigned Agent", "Platforms", "Readiness"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{DEVICES.map((d) => <tr key={d.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{d.name}</td><td className="px-2"><SChip s={state(d.readiness)} /></td><td className="px-2">{d.health}%</td><td className="px-2 text-tg-muted">{d.agent}</td><td className="px-2">{d.platforms}</td><td className="px-2 font-bold" style={{ color: rColor(d.readiness) }}>{d.readiness}%</td></tr>)}</tbody></table></Card></main>;
  }

  function PlatformReadiness() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{PLATFORMS.map((p) => { const sc = platScore(p); return <Card key={p.name}><div className="mb-1 flex items-center gap-2"><b className="flex-1">{p.name}</b><span className="text-sm font-black" style={{ color: rColor(sc) }}>{sc}%</span></div><div className="space-y-1">{Object.entries(p.sub).map(([l, v]) => <Bar key={l} l={l} v={v as number} />)}</div></Card>; })}</div></main>;
  }

  function ContentReadiness() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Content Readiness"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Source", "Queue", "Assets", "Scripts", "Schedule", "Templates", "Readiness"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{CONTENT.map((c) => <tr key={c.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{c.name}</td><td className="px-2">{c.queue}</td><td className="px-2">{c.assets}</td><td className="px-2">{c.scripts}</td><td className="px-2 text-tg-muted">{c.schedule}</td><td className="px-2">{c.templates}</td><td className="px-2 font-bold" style={{ color: rColor(c.readiness) }}>{c.readiness}%</td></tr>)}</tbody></table></Card></main>;
  }

  function BroadcastReadiness() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Broadcast Readiness"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{BROADCAST.map(([l, v]) => <div key={l} className="flex items-center gap-3 rounded-xl bg-tg-bg/40 p-3"><Ring v={v} size={56} /><div><div className="text-sm font-bold">{l}</div><SChip s={state(v)} /></div></div>)}</div></Card></main>;
  }

  function RevenueReadiness() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Revenue Readiness"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Stream", "Readiness", "Potential", "Projected Revenue", "State"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{REVENUE.map((r) => <tr key={r.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{r.name}</td><td className="px-2 font-bold" style={{ color: rColor(r.readiness) }}>{r.readiness}%</td><td className="px-2 text-tg-muted">{r.potential}</td><td className="px-2 text-emerald-300">${r.projected}/mo</td><td className="px-2"><SChip s={state(r.readiness)} /></td></tr>)}</tbody></table></Card></main>;
  }

  function InfraReadiness() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{INFRA.map((i) => <Card key={i.name}><div className="flex items-center gap-2"><b className="flex-1">{i.name}</b><span className="text-sm font-black" style={{ color: rColor(i.ready) }}>{i.ready}%</span></div><div className="mt-1 flex gap-1.5 text-[10px]"><span className={`rounded px-1.5 py-0.5 ${i.configured ? "bg-emerald-600/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>Configured: {String(i.configured)}</span><span className={`rounded px-1.5 py-0.5 ${i.connected ? "bg-emerald-600/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>Connected: {String(i.connected)}</span></div></Card>)}</div></main>;
  }

  function AIReadiness() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="AI Readiness Center"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{AI_UNITS.map(([l, v]) => <div key={l} className="flex items-center gap-3 rounded-xl bg-tg-bg/40 p-3"><Ring v={v} size={52} /><div><div className="text-sm font-bold">{l}</div><div className="text-[10px] text-tg-muted">Health {v}%</div><SChip s={state(v)} /></div></div>)}</div></Card></main>;
  }

  function Analytics() {
    const max = Math.max(...domains.map((d) => d[1]));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 lg:grid-cols-2">
      <Card t="Readiness by domain"><div className="flex items-end gap-2" style={{ height: 180 }}>{domains.map(([l, v]) => <div key={l} className="flex flex-1 flex-col items-center justify-end"><div className="w-full rounded-t" style={{ height: (v / max * 150) + "px", background: rColor(v) }} /><div className="mt-1 text-[9px] text-tg-muted">{l.slice(0, 6)}</div><div className="text-[10px] font-bold">{v}</div></div>)}</div></Card>
      <Card t="Readiness by agent"><div className="space-y-1.5">{ENRICHED_AGENTS.map((x) => <Bar key={x.id} l={x.name} v={x.score} />)}</div></Card>
      <Card t="Readiness by platform"><div className="space-y-1.5">{PLATFORMS.map((p) => <Bar key={p.name} l={p.name} v={platScore(p)} />)}</div></Card>
      <Card t="Activation progress"><div className="flex items-center gap-3"><Ring v={totalReadiness} size={80} /><div className="text-[12px] text-tg-muted">Total ecosystem activation. Тренд: ↑ за счёт Agents и Infrastructure. Узкие места: Revenue/Premium, Android Device, ComfyUI.</div></div></Card>
    </div></main>;
  }

  return (
    <div className="fixed inset-0 z-[71] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🚀 ACTIVATION ENGINE</div>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">CRITICAL · OPERATIONS</span>
        <div className="ml-auto flex items-center gap-2 text-[11px]"><span className="rounded-full bg-tg-bg px-2.5 py-1">Total Readiness: <b style={{ color: rColor(totalReadiness) }}>{totalReadiness}%</b></span><SChip s={state(totalReadiness)} /></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2">{SECTIONS.map(([id, label]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] ${sec === id ? "bg-tg-active text-white font-semibold" : "hover:bg-tg-hover/40"}`}>{label}</button>)}
          <div className="mt-3 rounded-lg border border-tg-line bg-tg-bg/30 p-2 text-[10px]"><div className="mb-1 font-black uppercase tracking-[0.18em] text-tg-accent">Legend</div>{Object.entries(DOT).map(([s, d]) => <div key={s} className="text-tg-muted">{d} {s}</div>)}</div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "readiness" && <Readiness />}
          {sec === "agents" && <AgentActivation />}
          {sec === "devices" && <DeviceReadiness />}
          {sec === "platforms" && <PlatformReadiness />}
          {sec === "content" && <ContentReadiness />}
          {sec === "broadcast" && <BroadcastReadiness />}
          {sec === "revenue" && <RevenueReadiness />}
          {sec === "infra" && <InfraReadiness />}
          {sec === "ai" && <AIReadiness />}
          {sec === "analytics" && <Analytics />}
        </div>
      </div>
    </div>
  );
}
