"use client";

// DEVICE CONTROL CENTER — GeeLark / cloud-phones read-only monitoring. Category: INFRASTRUCTURE / DEVICES · ACTIVE
// UI + localStorage + mock/read-only schema only. No GeeLark API, no API keys, no device start/stop/install,
// no ADB actions, no automation runs. Additive. Writes registry/graph for WORLD, EPIC ARCHITECT, AI COO.

import { useEffect, useMemo, useRef, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; slots: any[]; bind: Record<string, string> };
const KC = "epic_device_center_v1", KG = "epic_device_graph_v1", KS = "epic_device_snapshot_v1";
const TABS = [
  ["overview", "🏠 Overview"], ["phones", "📱 Cloud Phones"], ["apps", "📦 Applications"], ["accounts", "👤 Accounts"],
  ["proxies", "🌐 Proxies"], ["automation", "⚙ Automation"], ["webhooks", "🪝 Webhooks"], ["adb", "🖥 ADB Console"],
  ["health", "❤ Health"], ["analytics", "📊 Analytics"], ["logs", "📜 Logs"], ["graph", "🕸 Graph"], ["settings", "⚙ Settings"],
] as const;

const SCLR: Record<string, string> = { online: "#4ade80", running: "#4ade80", healthy: "#4ade80", ok: "#4ade80", active: "#4ade80", idle: "#fbbf24", warning: "#fbbf24", offline: "#f87171", failed: "#f87171", error: "#f87171" };
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
const ini = (s: string) => (s || "•").replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function Dot({ s }: { s: string }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCLR[s] || "#9ca3af" }} />; }
function Card({ children, className = "" }: { children: any; className?: string }) { return <div className={"rounded-2xl border border-[rgba(6,182,212,.2)] bg-[rgba(13,20,28,.6)] p-4 backdrop-blur " + className}>{children}</div>; }
function Th({ h }: { h: string[] }) { return <thead className="text-tg-muted text-xs"><tr>{h.map((x) => <th key={x} className="px-2 py-1">{x}</th>)}</tr></thead>; }

export function DeviceCenter({ ctx, onClose, onOpenAgent }: { ctx: Ctx; onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [tab, setTab] = useState("overview");
  const [sel, setSel] = useState("");
  const [view, setView] = useState({ tx: 30, ty: 20, s: 0.8 });
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number }>({ mode: null, sx: 0, sy: 0, ox: 0, oy: 0 });

  const agName = (i: number) => ctx.agents[i % Math.max(1, ctx.agents.length)]?.name || "—";
  const agId = (i: number) => ctx.agents[i % Math.max(1, ctx.agents.length)]?.id || "";

  const devices = useMemo(() => [
    { id: "PHONE-01", status: "online", group: "Content", tags: ["EU", "primary"], proxy: "PRX-EU-01", agent: agName(3), agentId: agId(3), tg: "AI MUSIC 🎧 PUBLIC", mission: "EVA Shorts", apps: ["Telegram", "Instagram", "TikTok"], last: "12:40" },
    { id: "PHONE-02", status: "online", group: "Streaming", tags: ["US"], proxy: "PRX-US-01", agent: agName(2), agentId: agId(2), tg: "—", mission: "BUCH Teasers", apps: ["Telegram", "YouTube"], last: "вчера" },
    { id: "PHONE-03", status: "idle", group: "Content", tags: ["EU"], proxy: "PRX-EU-02", agent: agName(1), agentId: agId(1), tg: "—", mission: "Reels", apps: ["Telegram"], last: "пн" },
    { id: "PHONE-04", status: "offline", group: "Reserve", tags: ["spare"], proxy: "—", agent: "—", agentId: "", tg: "—", mission: "—", apps: [], last: "—" },
  ], [ctx]);
  const apps = [
    { name: "Telegram", pkg: "org.telegram.messenger", ver: "10.x", devices: 3, status: "active", mission: "EVA Shorts" },
    { name: "Instagram", pkg: "com.instagram.android", ver: "300.x", devices: 1, status: "active", mission: "Reels" },
    { name: "TikTok", pkg: "com.zhiliaoapp.musically", ver: "32.x", devices: 1, status: "active", mission: "EVA Shorts" },
    { name: "YouTube", pkg: "com.google.android.youtube", ver: "19.x", devices: 1, status: "idle", mission: "BUCH Teasers" },
  ];
  const accounts = [
    { platform: "Telegram", name: "AI MUSIC 🎧 PUBLIC", device: "PHONE-01", agent: agName(3), mission: "EVA Shorts", status: "active" },
    { platform: "Instagram", name: "@eva.novikova", device: "PHONE-01", agent: agName(3), mission: "Reels", status: "active" },
    { platform: "TikTok", name: "@eva_shorts", device: "PHONE-01", agent: agName(3), mission: "EVA Shorts", status: "warning" },
    { platform: "YouTube", name: "BUCH Channel", device: "PHONE-02", agent: agName(2), mission: "BUCH Teasers", status: "active" },
  ];
  const proxies = [
    { name: "PRX-EU-01", type: "residential", country: "DE", status: "healthy", device: "PHONE-01", account: "AI MUSIC", health: "98%", last: "12:38" },
    { name: "PRX-US-01", type: "mobile", country: "US", status: "healthy", device: "PHONE-02", account: "BUCH Channel", health: "95%", last: "12:30" },
    { name: "PRX-EU-02", type: "datacenter", country: "NL", status: "warning", device: "PHONE-03", account: "—", health: "72%", last: "11:50" },
    { name: "PRX-SPARE", type: "residential", country: "EU", status: "offline", device: "—", account: "—", health: "—", last: "—" },
  ];
  const automation = [
    { task: "Warmup Routine", device: "PHONE-01", status: "idle", schedule: "daily 09:00", last: "вчера", result: "ok", n8n: "Content Pipeline" },
    { task: "Story Poster", device: "PHONE-01", status: "idle", schedule: "manual", last: "пн", result: "ok", n8n: "Drops Publisher" },
    { task: "Health Ping", device: "PHONE-03", status: "failed", schedule: "hourly", last: "11:50", result: "proxy timeout", n8n: "Discovery Sync" },
  ];
  const webhooks = [
    { name: "geelark.status", provider: "GeeLark", status: "active", last: "12:40", workflow: "Discovery Sync" },
    { name: "render.done", provider: "n8n", status: "active", last: "12:31", workflow: "Render Notify" },
    { name: "proxy.alert", provider: "Proxy", status: "warning", last: "11:50", workflow: "Health Ping" },
  ];
  const adb = { android: "13", screen: "1080×1920", battery: "—", network: "proxy", storage: "32GB", note: "read-only device info" };
  const logs = [
    { t: "12:40", text: "PHONE-01 online · proxy PRX-EU-01 healthy" },
    { t: "12:31", text: "render.done webhook received" },
    { t: "11:50", text: "PHONE-03 automation failed: proxy timeout" },
    { t: "10:05", text: "PHONE-04 went offline" },
  ];

  const stats = {
    total: devices.length, online: devices.filter((d) => d.status === "online").length, offline: devices.filter((d) => d.status === "offline").length,
    running: devices.filter((d) => d.status === "online").length, idle: devices.filter((d) => d.status === "idle").length,
    agents: new Set(devices.map((d) => d.agent).filter((a) => a !== "—")).size, missions: new Set(devices.map((d) => d.mission).filter((m) => m !== "—")).size,
    healthyProxies: proxies.filter((p) => p.status === "healthy").length, failedTasks: automation.filter((a) => a.status === "failed").length, apps: apps.length,
  };

  // graph
  const graph = useMemo(() => {
    const n: { id: string; type: string; label: string; ref?: string }[] = [];
    const e: [string, string][] = [];
    devices.forEach((d) => {
      if (d.agentId) { n.push({ id: "ag_" + d.agentId, type: "agent", label: d.agent, ref: d.agentId }); }
      n.push({ id: "dev_" + d.id, type: "device", label: d.id });
      if (d.agentId) e.push(["ag_" + d.agentId, "dev_" + d.id]);
      if (d.proxy !== "—") { n.push({ id: "px_" + d.proxy, type: "proxy", label: d.proxy }); e.push(["dev_" + d.id, "px_" + d.proxy]); }
      d.apps.forEach((a) => { n.push({ id: "app_" + a, type: "app", label: a }); e.push(["dev_" + d.id, "app_" + a]); });
      if (d.mission !== "—") { n.push({ id: "mi_" + d.mission, type: "mission", label: d.mission }); e.push(["dev_" + d.id, "mi_" + d.mission]); }
    });
    accounts.forEach((a) => { n.push({ id: "acc_" + a.name, type: "account", label: a.name.slice(0, 14) }); e.push(["dev_" + a.device, "acc_" + a.name]); });
    n.push({ id: "pub", type: "publishing", label: "Publishing" });
    Array.from(new Set(devices.map((d) => d.mission))).filter((m) => m !== "—").forEach((m) => e.push(["mi_" + m, "pub"]));
    const uniq = Array.from(new Map(n.map((x) => [x.id, x])).values());
    const cols: Record<string, number> = { agent: 40, device: 280, proxy: 520, app: 760, account: 1000, mission: 1240, publishing: 1480 };
    const idx: Record<string, number> = {};
    return { nodes: uniq.map((x) => { const c = idx[x.type] = (idx[x.type] ?? -1) + 1; return { ...x, x: cols[x.type] ?? 700, y: 40 + c * 70 }; }), edges: e };
  }, [devices, accounts]);
  const GCLR: Record<string, string> = { agent: "#ff2d6b", device: "#06b6d4", proxy: "#a78bfa", app: "#f59e0b", account: "#e879f9", mission: "#22c55e", publishing: "#34d399" };

  // write registry + graph for WORLD / EPIC ARCHITECT / AI COO
  useEffect(() => {
    try {
      localStorage.setItem(KC, JSON.stringify({ schema: KC, timestamp: new Date().toISOString(),
        devices: devices.map((d) => ({ id: d.id, status: d.status, group: d.group, agent: d.agent, mission: d.mission, proxy: d.proxy, apps: d.apps })),
        apps: apps.map((a) => ({ name: a.name, devices: a.devices })), accounts: accounts.map((a) => ({ platform: a.platform, name: a.name, device: a.device })),
        proxies: proxies.map((p) => ({ name: p.name, status: p.status, country: p.country })), automationTasks: automation.map((a) => ({ task: a.task, status: a.status })),
        webhooks: webhooks.map((w) => ({ name: w.name, status: w.status })), stats }));
      localStorage.setItem(KG, JSON.stringify({ nodes: graph.nodes, edges: graph.edges }));
    } catch {}
  }, [devices, graph]);

  useEffect(() => {
    function mv(e: MouseEvent) { const d = drag.current; if (!d.mode) return; if (d.mode === "node" && d.id) { const dx = (e.clientX - d.sx) / view.s, dy = (e.clientY - d.sy) / view.s; setPos((p) => ({ ...p, [d.id as string]: { x: d.ox + dx, y: d.oy + dy } })); } else if (d.mode === "pan") setView((v) => ({ ...v, tx: d.ox + (e.clientX - d.sx), ty: d.oy + (e.clientY - d.sy) })); }
    function up() { drag.current.mode = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up); return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [view.s]);
  const GP = (n: any) => pos[n.id] || { x: n.x, y: n.y };
  function gdown(e: React.MouseEvent, id?: string) { const d = drag.current; d.sx = e.clientX; d.sy = e.clientY; if (id) { const n = graph.nodes.find((x) => x.id === id)!; d.mode = "node"; d.id = id; const p = GP(n); d.ox = p.x; d.oy = p.y; setSel(id); } else { d.mode = "pan"; d.ox = view.tx; d.oy = view.ty; } e.stopPropagation(); }

  function exportSnapshot() {
    const snap = { schema: KS, timestamp: new Date().toISOString(), devices, apps, accounts, proxies, automationTasks: automation, webhooks, relationships: graph.edges.map(([from, to]) => ({ from, to })), note: "Read-only device snapshot. No secrets, credentials or API keys." };
    try { localStorage.setItem(KS, JSON.stringify(snap)); } catch {}
    const b = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "device_snapshot.json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000);
  }

  function Body() {
    if (tab === "overview") return <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{([["Total Devices", stats.total], ["Online", stats.online], ["Offline", stats.offline], ["Running", stats.running], ["Idle", stats.idle], ["Assigned Agents", stats.agents], ["Assigned Missions", stats.missions], ["Healthy Proxies", stats.healthyProxies], ["Failed Tasks", stats.failedTasks], ["Installed Apps", stats.apps]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-black text-cyan-300">{v}</div></Card>)}</div>;
    if (tab === "phones") return <Card><table className="w-full text-left text-xs"><Th h={["", "Device", "Status", "Group", "Tags", "Proxy", "Agent", "TG Account", "Mission", "Apps", "Last"]} /><tbody>{devices.map((d) => <tr key={d.id} className="border-t border-tg-line"><td className="px-2 py-1.5"><Dot s={d.status} /></td><td className="px-2 font-bold">{d.id}</td><td className="px-2">{d.status}</td><td className="px-2">{d.group}</td><td className="px-2 text-tg-muted">{d.tags.join(",")}</td><td className="px-2">{d.proxy}</td><td className="px-2 cursor-pointer text-cyan-300" onClick={() => d.agentId && onOpenAgent?.(d.agentId)}>{d.agent}</td><td className="px-2 text-tg-muted">{d.tg}</td><td className="px-2">{d.mission}</td><td className="px-2">{d.apps.length}</td><td className="px-2 text-tg-muted">{d.last}</td></tr>)}</tbody></table></Card>;
    if (tab === "apps") return <Card><table className="w-full text-left text-xs"><Th h={["App", "Package", "Version", "Devices", "Status", "Mission"]} /><tbody>{apps.map((a) => <tr key={a.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-bold">{a.name}</td><td className="px-2 text-tg-muted">{a.pkg}</td><td className="px-2">{a.ver}</td><td className="px-2">{a.devices}</td><td className="px-2"><Dot s={a.status} /> {a.status}</td><td className="px-2">{a.mission}</td></tr>)}</tbody></table></Card>;
    if (tab === "accounts") return <Card><table className="w-full text-left text-xs"><Th h={["Platform", "Account", "Device", "Agent", "Mission", "Status"]} /><tbody>{accounts.map((a) => <tr key={a.name} className="border-t border-tg-line"><td className="px-2 py-1.5">{a.platform}</td><td className="px-2 font-bold">{a.name}</td><td className="px-2">{a.device}</td><td className="px-2">{a.agent}</td><td className="px-2">{a.mission}</td><td className="px-2"><Dot s={a.status} /> {a.status}</td></tr>)}</tbody></table></Card>;
    if (tab === "proxies") return <Card><table className="w-full text-left text-xs"><Th h={["Proxy", "Type", "Country", "Status", "Device", "Account", "Health", "Last Check"]} /><tbody>{proxies.map((p) => <tr key={p.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-bold">{p.name}</td><td className="px-2">{p.type}</td><td className="px-2">{p.country}</td><td className="px-2"><Dot s={p.status} /> {p.status}</td><td className="px-2">{p.device}</td><td className="px-2">{p.account}</td><td className="px-2">{p.health}</td><td className="px-2 text-tg-muted">{p.last}</td></tr>)}</tbody></table></Card>;
    if (tab === "automation") return <Card><table className="w-full text-left text-xs"><Th h={["Task", "Device", "Status", "Schedule", "Last Run", "Result", "n8n"]} /><tbody>{automation.map((a) => <tr key={a.task} className="border-t border-tg-line"><td className="px-2 py-1.5 font-bold">{a.task}</td><td className="px-2">{a.device}</td><td className="px-2"><Dot s={a.status} /> {a.status}</td><td className="px-2">{a.schedule}</td><td className="px-2 text-tg-muted">{a.last}</td><td className="px-2 text-tg-muted">{a.result}</td><td className="px-2">{a.n8n}</td></tr>)}</tbody></table></Card>;
    if (tab === "webhooks") return <Card><table className="w-full text-left text-xs"><Th h={["Webhook", "Provider", "Status", "Last Event", "Workflow"]} /><tbody>{webhooks.map((w) => <tr key={w.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-bold">{w.name}</td><td className="px-2">{w.provider}</td><td className="px-2"><Dot s={w.status} /> {w.status}</td><td className="px-2 text-tg-muted">{w.last}</td><td className="px-2">{w.workflow}</td></tr>)}</tbody></table></Card>;
    if (tab === "adb") return <Card><div className="mb-1 text-[10px] font-black uppercase tracking-wide text-tg-accent">ADB Console (read-only)</div><div className="grid gap-1 text-sm text-tg-muted sm:grid-cols-2"><div>Android: <b className="text-white">{adb.android}</b></div><div>Screen: <b className="text-white">{adb.screen}</b></div><div>Battery: <b className="text-white">{adb.battery}</b></div><div>Network: <b className="text-white">{adb.network}</b></div><div>Storage: <b className="text-white">{adb.storage}</b></div></div><div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-300">ADB-команды отключены. Только просмотр информации устройства.</div></Card>;
    if (tab === "health") return <div className="space-y-2"><Card><div className="mb-1 text-[10px] font-black uppercase tracking-wide text-tg-accent">Device Health</div><div className="space-y-1 text-sm">{devices.map((d) => <div key={d.id} className="flex items-center gap-2"><Dot s={d.status} /><span className="flex-1">{d.id}</span><span className="text-tg-muted">{d.status} · proxy {d.proxy}</span></div>)}</div></Card><Card><div className="mb-1 text-[10px] font-black uppercase tracking-wide text-tg-accent">Proxy Health</div>{proxies.map((p) => <div key={p.name} className="flex items-center gap-2 text-sm"><Dot s={p.status} /><span className="flex-1">{p.name}</span><span className="text-tg-muted">{p.health}</span></div>)}</Card></div>;
    if (tab === "analytics") return <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{([["Devices", stats.total], ["Online", stats.online], ["Proxies OK", stats.healthyProxies], ["Failed Tasks", stats.failedTasks], ["Apps", stats.apps], ["Accounts", accounts.length], ["Automations", automation.length], ["Webhooks", webhooks.length]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-black text-cyan-300">{v}</div></Card>)}</div>;
    if (tab === "logs") return <Card><div className="space-y-0.5 text-[12px]">{logs.map((l, i) => <div key={i} className="flex gap-2"><span className="text-tg-muted">{l.t}</span><span>{l.text}</span></div>)}</div></Card>;
    if (tab === "settings") return <Card><div className="text-sm text-tg-muted">Read-only schema. Реестр: <b className="text-white">epic_device_center_v1</b>, граф: <b className="text-white">epic_device_graph_v1</b>. Реальные GeeLark API / ADB / автоматизации отключены. Интеграция: WORLD, EPIC ARCHITECT, AI COO, Media Ops.</div></Card>;
    // graph
    const sn = graph.nodes.find((n) => n.id === sel);
    return <div className="grid h-full grid-cols-[1fr_240px]">
      <div className="relative overflow-hidden rounded-xl bg-[#0a1018]" style={{ backgroundImage: "linear-gradient(rgba(6,182,212,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,.06) 1px,transparent 1px)", backgroundSize: "26px 26px" }}>
        <div className="absolute left-3 top-3 z-10 flex gap-1"><button onClick={() => setView((v) => ({ ...v, s: Math.min(2, +(v.s + 0.15).toFixed(2)) }))} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">+</button><button onClick={() => setView((v) => ({ ...v, s: Math.max(0.3, +(v.s - 0.15).toFixed(2)) }))} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">−</button><button onClick={() => { setView({ tx: 30, ty: 20, s: 0.8 }); setPos({}); }} className="rounded-lg bg-tg-panel px-2 text-xs ring-1 ring-tg-line">reset</button></div>
        <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={(e) => gdown(e)}>
          <div style={{ transform: `translate(${view.tx}px,${view.ty}px) scale(${view.s})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
            <svg className="pointer-events-none absolute" style={{ overflow: "visible", left: 0, top: 0 }} width="1" height="1">{graph.edges.map(([a, b], i) => { const na = graph.nodes.find((n) => n.id === a), nb = graph.nodes.find((n) => n.id === b); if (!na || !nb) return null; const pa = GP(na), pb = GP(nb); return <line key={i} x1={pa.x + 55} y1={pa.y + 16} x2={pb.x + 55} y2={pb.y + 16} stroke="rgba(6,182,212,.25)" strokeWidth={1.3} />; })}</svg>
            {graph.nodes.map((n) => { const p = GP(n); return <div key={n.id} onMouseDown={(e) => gdown(e, n.id)} className={`absolute w-[110px] cursor-grab rounded-lg border bg-[rgba(13,20,28,.85)] px-2 py-1 text-center text-[10px] ${sel === n.id ? "ring-2 ring-white" : ""}`} style={{ left: p.x, top: p.y, borderColor: GCLR[n.type] }}><div className="truncate font-bold" style={{ color: GCLR[n.type] }}>{n.label}</div><div className="text-tg-muted">{n.type}</div></div>; })}
          </div>
        </div>
        <div className="absolute bottom-3 right-3 h-24 w-40 overflow-hidden rounded-lg border border-tg-line bg-tg-panel/90"><svg width="160" height="96" viewBox="0 0 1600 560">{graph.edges.map(([a, b], i) => { const na = graph.nodes.find((n) => n.id === a), nb = graph.nodes.find((n) => n.id === b); if (!na || !nb) return null; const pa = GP(na), pb = GP(nb); return <line key={i} x1={pa.x + 55} y1={pa.y + 16} x2={pb.x + 55} y2={pb.y + 16} stroke="rgba(6,182,212,.3)" strokeWidth={3} />; })}{graph.nodes.map((n) => { const p = GP(n); return <circle key={n.id} cx={p.x + 55} cy={p.y + 16} r={12} fill={GCLR[n.type]} />; })}</svg></div>
      </div>
      <aside className="overflow-auto rounded-xl border border-tg-line bg-[rgba(13,20,28,.6)] p-3"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Node Inspector</div>{sn ? <div className="mt-2 space-y-1 text-xs"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: GCLR[sn.type] }} /><b>{sn.label}</b></div><div className="text-tg-muted">Type: <b className="text-tg-text">{sn.type}</b></div><div className="text-tg-muted">Connected: {graph.edges.filter(([a, b]) => a === sn.id || b === sn.id).length}</div>{sn.type === "agent" && sn.ref && onOpenAgent && <button onClick={() => onOpenAgent(sn.ref!)} className="mt-1 w-full rounded-lg bg-tg-active px-2 py-1.5 text-[11px] font-semibold text-white">Open Agent →</button>}</div> : <div className="mt-2 text-tg-muted">Клик по узлу графа.</div>}</aside>
    </div>;
  }

  return (
    <div className="fixed inset-0 z-[61] flex flex-col bg-[#070d13] text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(6,182,212,.25)] bg-[#0c151d] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">📱 DEVICE CONTROL CENTER</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · READ-ONLY</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5"><div className="flex flex-wrap gap-1 text-[10px]">{([["Devices", stats.total], ["Online", stats.online], ["Offline", stats.offline], ["Proxies", stats.healthyProxies], ["Failed", stats.failedTasks]] as const).map(([l, v]) => <span key={l} className="rounded-full border border-tg-line bg-tg-bg px-2 py-1"><span className="text-tg-muted">{l} </span><b>{v}</b></span>)}</div><button onClick={exportSnapshot} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Export Snapshot ↓</button></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[180px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-[rgba(6,182,212,.15)] bg-[#0c151d] p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">DEVICES</div>{TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${tab === id ? "bg-cyan-600/25 text-white ring-1 ring-cyan-500/40" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}</nav>
        <main className="min-h-0 overflow-auto p-4"><Body /></main>
      </div>
    </div>
  );
}
