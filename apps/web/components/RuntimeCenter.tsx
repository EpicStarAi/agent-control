"use client";

// RUNTIME OPERATIONS CENTER — "what is running right now". Category: OPERATIONS · ACTIVE · 🚀
// UI + localStorage + derived data only. No real infra/Docker/n8n/Telegram/GeeLark actions. Additive.

import { useEffect, useMemo, useRef, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; slots: any[]; bind: Record<string, string>; counts: Record<string, any>; activeId: string };
const NAV = [
  ["overview", "🚀 Overview"], ["infra", "🖥 Infrastructure"], ["docker", "🐳 Docker"], ["n8n", "🔁 n8n"], ["telegram", "📨 Telegram"],
  ["geelark", "📱 GeeLark"], ["media", "🎬 Media Factory"], ["ai", "✨ AI Services"], ["publishing", "🚀 Publishing"],
  ["automation", "⚙ Automation"], ["security", "🛡 Security"], ["analytics", "📊 Analytics"], ["logs", "📜 Logs"], ["settings", "⚙ Settings"],
] as const;
const SCLR: Record<string, string> = { ONLINE: "#4ade80", online: "#4ade80", Running: "#4ade80", running: "#4ade80", healthy: "#4ade80", OK: "#4ade80", WARNING: "#fbbf24", warning: "#fbbf24", Paused: "#fbbf24", paused: "#fbbf24", OFFLINE: "#f87171", offline: "#f87171", ERROR: "#f87171", error: "#f87171", Failed: "#f87171", failed: "#f87171", idle: "#9ca3af", Stopped: "#9ca3af" };
function Dot({ s }: { s: string }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCLR[s] || "#9ca3af" }} />; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }

const DOCKER = [
  { c: "n8n", s: "Running", cpu: 4, ram: 320, ports: "5678", img: "n8nio/n8n" }, { c: "Postgres", s: "Running", cpu: 2, ram: 410, ports: "5432", img: "postgres:16" },
  { c: "Redis", s: "Running", cpu: 1, ram: 90, ports: "6379", img: "redis:7" }, { c: "Qdrant", s: "Running", cpu: 3, ram: 260, ports: "6333", img: "qdrant" },
  { c: "Flowise", s: "Running", cpu: 5, ram: 380, ports: "3000", img: "flowise" }, { c: "Dify", s: "Stopped", cpu: 0, ram: 0, ports: "8080", img: "dify" },
  { c: "Ollama", s: "Running", cpu: 22, ram: 5200, ports: "11434", img: "ollama" }, { c: "Uptime Kuma", s: "Running", cpu: 1, ram: 80, ports: "3001", img: "kuma" },
  { c: "Grafana", s: "Warning", cpu: 2, ram: 160, ports: "3002", img: "grafana" },
];
const N8N = [
  { w: "EVA Content Flow", s: "Running", last: "12:40", dur: "3.2s", err: "" }, { w: "Render Notify", s: "Running", last: "12:31", dur: "0.8s", err: "" },
  { w: "Drops Publisher", s: "Paused", last: "пн", dur: "—", err: "" }, { w: "Discovery Sync", s: "Running", last: "12:00", dur: "5.1s", err: "" },
  { w: "Health Ping", s: "Failed", last: "11:50", dur: "—", err: "proxy timeout" },
];
const AISVC = ["ChatGPT", "Claude", "Gemini", "Grok", "Perplexity", "OpenRouter", "HuggingFace", "ElevenLabs", "ComfyUI", "FaceFusion", "DeepFace", "Ollama"];
const AISTAT: Record<string, string> = { Claude: "ONLINE", OpenRouter: "ONLINE", Ollama: "ONLINE", ComfyUI: "ONLINE", FaceFusion: "ONLINE", ChatGPT: "WARNING", Gemini: "WARNING", ElevenLabs: "WARNING", Grok: "WARNING", Perplexity: "OFFLINE", HuggingFace: "WARNING", DeepFace: "ONLINE" };
const PUB = [["Telegram", 2, 3, 5, 8, 0], ["TikTok", 1, 2, 4, 3, 1], ["Instagram", 0, 1, 2, 2, 0], ["YouTube", 1, 0, 1, 1, 0], ["Facebook", 0, 0, 0, 0, 0], ["X", 0, 0, 0, 0, 0]] as [string, number, number, number, number, number][];
const FEED_EVENTS = ["Telegram Connected", "Workflow Finished", "Render Completed", "Publish Completed", "Device Offline", "Proxy Error", "AI Service Warning", "Backup Completed", "Discovery Synced"];

export function RuntimeCenter({ ctx, onClose, onAction }: { ctx: Ctx; onClose: () => void; onAction?: (t: string) => void }) {
  const [tab, setTab] = useState("overview");
  const [logFilter, setLogFilter] = useState("System");
  const [feed, setFeed] = useState<{ t: string; e: string }[]>([]);
  const feedRef = useRef<any>(null);

  const tgIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_telegram_index_v1") || "null"); } catch { return null; } }, []);
  const devIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_device_center_v1") || "null"); } catch { return null; } }, []);
  const mediaIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_media_ops_v1") || "null"); } catch { return null; } }, []);
  const provIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_device_provisioning_v1") || "null"); } catch { return null; } }, []);

  const devices = devIdx?.devices || [{ id: "PHONE-01", status: "online", proxy: "PRX-EU-01", agent: "EVA", mission: "EVA Shorts", apps: ["Telegram", "TikTok"] }, { id: "PHONE-02", status: "online", proxy: "PRX-US-01", agent: "BUCHIHA", mission: "Teasers", apps: ["Telegram"] }, { id: "PHONE-04", status: "offline", proxy: "—", agent: "—", mission: "—", apps: [] }];
  const dockerRun = DOCKER.filter((d) => d.s === "Running").length;
  const health = {
    System: "ONLINE", Infrastructure: "ONLINE", Telegram: ctx.slots.length ? "ONLINE" : "OFFLINE",
    Device: devices.some((d: any) => d.status === "offline") ? "WARNING" : "ONLINE", Media: "ONLINE",
    Publishing: "WARNING", AI: AISVC.some((s) => AISTAT[s] === "OFFLINE") ? "WARNING" : "ONLINE",
    Automation: N8N.some((w) => w.s === "Failed") ? "WARNING" : "ONLINE", Security: "WARNING",
  };
  const incidents = useMemo(() => {
    const inc: { sev: string; sys: string; rec: string; target?: string }[] = [];
    if (DOCKER.some((d) => d.s === "Warning")) inc.push({ sev: "WARNING", sys: "Docker · Grafana", rec: "Проверить контейнер Grafana", target: "ops" });
    if (N8N.some((w) => w.s === "Failed")) inc.push({ sev: "ERROR", sys: "n8n · Health Ping", rec: "Перезапустить flow / проверить proxy", target: "ops" });
    if (devices.some((d: any) => d.status === "offline")) inc.push({ sev: "WARNING", sys: "GeeLark · offline device", rec: "Проверить Device Center", target: "devices" });
    if (AISVC.some((s) => AISTAT[s] === "OFFLINE")) inc.push({ sev: "WARNING", sys: "AI · Perplexity offline", rec: "Подключить API (backend-side)", target: "ai" });
    return inc;
  }, [devices]);

  // live feed (UI-only synthetic events)
  useEffect(() => {
    function push() { setFeed((f) => [{ t: new Date().toLocaleTimeString(), e: FEED_EVENTS[Math.floor(Math.random() * FEED_EVENTS.length)] }, ...f].slice(0, 12)); }
    push(); feedRef.current = setInterval(push, 4000);
    return () => clearInterval(feedRef.current);
  }, []);

  const overall = 84;
  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("epic_runtime_center_v1", JSON.stringify({ ts, sections: NAV.map((n) => n[0]) }));
    localStorage.setItem("epic_runtime_health_v1", JSON.stringify({ ts, overall, health }));
    localStorage.setItem("epic_runtime_metrics_v1", JSON.stringify({ ts, cpu: 34, ramUsedGB: 11.2, ramTotalGB: 24, dockerRunning: dockerRun, dockerTotal: DOCKER.length, n8nTotal: N8N.length, telegramSessions: ctx.slots.length, devicesOnline: devices.filter((d: any) => d.status === "online").length }));
    localStorage.setItem("epic_runtime_incidents_v1", JSON.stringify({ ts, incidents }));
    localStorage.setItem("epic_runtime_feed_v1", JSON.stringify(feed.slice(0, 12)));
  } catch {} }, [incidents, feed, ctx]);

  function Body() {
    if (tab === "overview") return <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">{Object.entries(health).map(([l, s]) => <Card key={l}><div className="flex items-center gap-2"><Dot s={s} /><span className="text-sm font-semibold">{l} Health</span></div><div className="mt-1 text-2xl font-black" style={{ color: SCLR[s] }}>{s}</div></Card>)}</div>;
    if (tab === "infra") return <Card t="Infrastructure"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Name", "Status", "CPU", "RAM", "Disk", "Uptime", "Last Check"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{([["VPS (Contabo)", "ONLINE", "34%", "11.2/24 GB", "44%", "99.9%", "12:40"], ["Cloud Server", "ONLINE", "12%", "2/8 GB", "30%", "99.5%", "12:38"], ["Storage", "ONLINE", "—", "—", "61%", "—", "12:40"], ["Network", "ONLINE", "—", "—", "—", "100%", "12:40"], ["Domains", "ONLINE", "—", "—", "—", "—", "12:00"], ["SSL", "ONLINE", "—", "—", "—", "valid", "12:00"], ["CDN (Cloudflare)", "ONLINE", "—", "—", "—", "100%", "12:30"], ["Backups", "ONLINE", "—", "—", "—", "daily", "06:00"]] as const).map((r) => <tr key={r[0]} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{r[0]}</td><td className="px-2"><Dot s={r[1]} /> {r[1]}</td><td className="px-2">{r[2]}</td><td className="px-2">{r[3]}</td><td className="px-2">{r[4]}</td><td className="px-2 text-tg-muted">{r[5]}</td><td className="px-2 text-tg-muted">{r[6]}</td></tr>)}</tbody></table></Card>;
    if (tab === "docker") return <div className="space-y-3"><div className="grid grid-cols-4 gap-2">{([["Running", dockerRun], ["Stopped", DOCKER.filter((d) => d.s === "Stopped").length], ["Failed", 0], ["Warnings", DOCKER.filter((d) => d.s === "Warning").length]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-2xl font-black text-cyan-300">{v}</div></Card>)}</div>
      <Card t="Containers"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Container", "Status", "CPU %", "RAM MB", "Ports", "Image"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{DOCKER.map((d) => <tr key={d.c} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{d.c}</td><td className="px-2"><Dot s={d.s} /> {d.s}</td><td className="px-2">{d.cpu}</td><td className="px-2">{d.ram}</td><td className="px-2 text-tg-muted">{d.ports}</td><td className="px-2 text-tg-muted">{d.img}</td></tr>)}</tbody></table></Card></div>;
    if (tab === "n8n") return <div className="space-y-3"><div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{([["Active", N8N.filter((w) => w.s === "Running").length], ["Paused", N8N.filter((w) => w.s === "Paused").length], ["Failed", N8N.filter((w) => w.s === "Failed").length], ["Queue", 1], ["Executions", 142], ["Errors", 3]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-black text-cyan-300">{v}</div></Card>)}</div>
      <Card t="Workflows"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Workflow", "Status", "Last Run", "Duration", "Error"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{N8N.map((w) => <tr key={w.w} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{w.w}</td><td className="px-2"><Dot s={w.s} /> {w.s}</td><td className="px-2 text-tg-muted">{w.last}</td><td className="px-2">{w.dur}</td><td className="px-2 text-rose-300">{w.err}</td></tr>)}</tbody></table></Card></div>;
    if (tab === "telegram") return <div className="space-y-3"><div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{([["Sessions", ctx.slots.length], ["Dialogs", tgIdx?.dialogs?.length || 0], ["Channels", tgIdx?.channels?.length || 0], ["Groups", tgIdx?.groups?.length || 0], ["Bots", tgIdx?.bots?.length || 0], ["Contacts", tgIdx?.contacts?.length || 0]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-black text-cyan-300">{v}</div></Card>)}</div>
      <Card t="Sessions"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Account", "Status", "Last Sync", "Dialogs", "Channels", "Groups"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{(ctx.slots.length ? ctx.slots : [{ displayName: "—" }]).map((s: any, i: number) => <tr key={i} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{s.displayName || s.slotId || "—"}</td><td className="px-2"><Dot s={s.status === "authorized" || s.active ? "ONLINE" : "WARNING"} /> {ctx.slots.length ? "Connected" : "—"}</td><td className="px-2 text-tg-muted">12:40</td><td className="px-2">{tgIdx?.dialogs?.length || 0}</td><td className="px-2">{tgIdx?.channels?.length || 0}</td><td className="px-2">{tgIdx?.groups?.length || 0}</td></tr>)}</tbody></table></Card></div>;
    if (tab === "geelark") return <div className="space-y-3"><div className="grid grid-cols-4 gap-2">{([["Online", devices.filter((d: any) => d.status === "online").length], ["Offline", devices.filter((d: any) => d.status === "offline").length], ["Provisioning", provIdx ? 1 : 0], ["Warnings", devices.filter((d: any) => d.status === "idle").length]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-2xl font-black text-cyan-300">{v}</div></Card>)}</div>
      <Card t="Device Fleet"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Device", "Status", "Proxy", "Agent", "Mission", "Apps", "Last Seen"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{devices.map((d: any) => <tr key={d.id} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{d.id}</td><td className="px-2"><Dot s={d.status} /> {d.status}</td><td className="px-2">{d.proxy}</td><td className="px-2 text-tg-accent">{d.agent}</td><td className="px-2">{d.mission}</td><td className="px-2">{(d.apps || []).length}</td><td className="px-2 text-tg-muted">12:40</td></tr>)}</tbody></table></Card></div>;
    if (tab === "media") return <div className="space-y-3"><div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{([["Render Queue", 3], ["Published Today", mediaIdx?.kpi?.published || 8], ["Failed Jobs", 1], ["Pending Review", 1], ["Characters", mediaIdx?.kpi?.characters || 3], ["Projects", mediaIdx?.kpi?.projects || 4]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-black text-cyan-300">{v}</div></Card>)}</div>
      <Card t="Pipeline"><div className="flex flex-wrap gap-1.5 text-[11px]">{["Idea", "Script", "Assets", "Render", "Review", "Publish", "Analytics"].map((s) => <span key={s} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{s}</span>)}</div></Card></div>;
    if (tab === "ai") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{AISVC.map((s) => <Card key={s}><div className="flex items-center gap-1.5 font-semibold"><Dot s={AISTAT[s]} />{s}</div><div className="text-[11px]" style={{ color: SCLR[AISTAT[s]] }}>{AISTAT[s]}</div></Card>)}</div>;
    if (tab === "publishing") return <Card t="Publishing"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Platform", "Draft", "Ready", "Scheduled", "Published", "Failed"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{PUB.map((p) => <tr key={p[0]} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{p[0]}</td><td className="px-2">{p[1]}</td><td className="px-2">{p[2]}</td><td className="px-2 text-cyan-300">{p[3]}</td><td className="px-2 text-emerald-300">{p[4]}</td><td className="px-2 text-rose-300">{p[5]}</td></tr>)}</tbody></table></Card>;
    if (tab === "automation") return <div className="space-y-3"><div className="grid grid-cols-4 gap-2">{([["Running", N8N.filter((w) => w.s === "Running").length], ["Queued", 1], ["Failed", N8N.filter((w) => w.s === "Failed").length], ["Waiting Approval", 2]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-2xl font-black text-cyan-300">{v}</div></Card>)}</div>
      <Card t="Linked Systems"><div className="flex flex-wrap gap-1.5 text-[11px]">{["n8n", "Telegram", "GeeLark", "Media Factory", "Publishing"].map((s) => <span key={s} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{s}</span>)}</div></Card></div>;
    if (tab === "security") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{([["Auth Status", "ONLINE"], ["API Vault", "WARNING"], ["Secrets", "ONLINE"], ["Audit Events", "ONLINE"], ["Warnings", "WARNING"], ["Critical Alerts", "ONLINE"]] as const).map(([l, s]) => <Card key={l}><div className="flex items-center gap-1.5 font-semibold"><Dot s={s} />{l}</div><div className="text-[11px]" style={{ color: SCLR[s] }}>{s === "ONLINE" ? "ok" : s.toLowerCase()}</div></Card>)}</div>;
    if (tab === "analytics") return <Card t="Analytics"><div className="space-y-1.5">{([["CPU", 34, "#38bdf8"], ["RAM", 47, "#a78bfa"], ["Storage", 44, "#34d399"], ["Traffic", 28, "#fbbf24"], ["Telegram Activity", 62, "#3ea6ff"], ["Publishing Activity", 40, "#22c55e"], ["AI Usage", 71, "#ff2d6b"]] as const).map(([l, v, c]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-32 text-tg-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: c }} /></div><span className="w-8 text-right">{v}%</span></div>)}</div></Card>;
    if (tab === "logs") return <div className="space-y-2"><div className="flex flex-wrap gap-1">{["System", "Telegram", "Media", "Devices", "AI", "Publishing", "Automation", "Security"].map((f) => <button key={f} onClick={() => setLogFilter(f)} className={`rounded-full px-2.5 py-1 text-[10px] ${logFilter === f ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{f}</button>)}</div>
      <Card t={"Live Console · " + logFilter}><div className="space-y-0.5 font-mono text-[11px] text-tg-muted">{feed.filter(() => true).map((e, i) => <div key={i}><span className="text-emerald-400">[{e.t}]</span> {logFilter}: {e.e}</div>)}{!feed.length && <div>ожидание событий…</div>}</div></Card></div>;
    return <Card t="Settings"><div className="text-sm text-tg-muted">Runtime данные derived из существующих реестров + mock метрики. Ключи: epic_runtime_center_v1 · epic_runtime_health_v1 · epic_runtime_metrics_v1 · epic_runtime_incidents_v1 · epic_runtime_feed_v1. Без реальных infra-действий, без секретов.</div></Card>;
  }

  return (
    <div className="fixed inset-0 z-[64] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🚀 RUNTIME OPERATIONS CENTER</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · LIVE</span>
        <div className="ml-2 flex items-center gap-2 text-[11px] text-tg-muted">Runtime Health <div className="h-1.5 w-24 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: overall + "%" }} /></div> {overall}%</div>
        <div className="ml-auto flex flex-wrap gap-1 text-[10px]">{([["Docker", dockerRun + "/" + DOCKER.length], ["n8n", N8N.length], ["TG", ctx.slots.length], ["Devices", devices.filter((d: any) => d.status === "online").length], ["Incidents", incidents.length]] as const).map(([l, v]) => <span key={l} className="rounded-full border border-tg-line bg-tg-bg px-2 py-1"><span className="text-tg-muted">{l} </span><b>{v}</b></span>)}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[190px_1fr_270px]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">RUNTIME</div>{NAV.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${tab === id ? "bg-tg-active/30 text-white ring-1 ring-tg-accent" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}</nav>
        <div className="flex min-h-0 flex-col">
          <main className="min-h-0 flex-1 overflow-auto p-4"><Body /></main>
          {/* BOTTOM LIVE FEED */}
          <div className="max-h-24 overflow-auto border-t border-tg-line bg-tg-panel/95 px-3 py-1.5"><div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Live Feed</div><div className="flex flex-wrap gap-2 text-[11px] text-tg-muted">{feed.map((e, i) => <span key={i} className="rounded bg-tg-bg px-2 py-0.5"><b className="text-tg-text">{e.t}</b> {e.e}</span>)}</div></div>
        </div>
        {/* RIGHT INCIDENT PANEL */}
        <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-300">Incident Panel</div>
          {incidents.length ? incidents.map((inc, i) => <div key={i} className="mt-2 rounded-xl border border-tg-line bg-tg-bg/40 p-2.5 text-xs"><div className="flex items-center gap-1.5"><Dot s={inc.sev} /><b style={{ color: SCLR[inc.sev] }}>{inc.sev}</b><span className="text-tg-muted">{inc.sys}</span></div><div className="mt-1 text-tg-muted">{inc.rec}</div><div className="mt-1.5 flex gap-1.5">{inc.target && <button onClick={() => onAction?.(inc.target!)} className="rounded bg-tg-active px-2 py-1 text-[10px] font-semibold text-white">Open Module</button>}<button className="rounded bg-tg-bg px-2 py-1 text-[10px] ring-1 ring-tg-line">Resolve</button></div></div>) : <div className="mt-2 text-xs text-tg-muted">✓ Активных инцидентов нет.</div>}
          <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Offline / Failed</div>
          <div className="mt-1 space-y-0.5 text-[11px] text-tg-muted">{DOCKER.filter((d) => d.s === "Stopped").map((d) => <div key={d.c}>🛑 {d.c} stopped</div>)}{N8N.filter((w) => w.s === "Failed").map((w) => <div key={w.w}>⚠ {w.w} failed</div>)}{devices.filter((d: any) => d.status === "offline").map((d: any) => <div key={d.id}>📴 {d.id} offline</div>)}</div>
        </aside>
      </div>
    </div>
  );
}
