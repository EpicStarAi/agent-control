"use client";

import { useEffect, useMemo, useState } from "react";

type Ctx = {
  agents: any[]; missions: any[]; exec: any[]; devices: any[]; slots: any[];
  bind: Record<string, string>; counts: Record<string, any>; activeId: string;
};
const LS = "epic_ops_center_v1";

const NAV = [
  ["dashboard", "🏠 Dashboard"], ["agents", "🧠 AI Agents"], ["telegram", "📨 Telegram"], ["geelark", "📱 Geelark"],
  ["workflows", "🔁 Workflows"], ["mcp", "🔌 MCP Servers"], ["docker", "🐳 Docker"], ["infra", "🖥 Infrastructure"],
  ["providers", "🧩 Providers"], ["billing", "💳 Billing"], ["monitoring", "📈 Monitoring"], ["security", "🛡 Security"], ["settings", "⚙ Settings"],
] as const;

const GEELARK = [
  { id: "PHONE-01", region: "EU", status: "online", agent: "eva", apps: ["Telegram", "Instagram", "TikTok"] },
  { id: "PHONE-02", region: "US", status: "online", agent: "buchiha", apps: ["Telegram", "YouTube"] },
  { id: "PHONE-03", region: "EU", status: "idle", agent: "buch", apps: ["Telegram"] },
];
const WORKFLOWS = [
  { id: "wf1", name: "Content Pipeline", status: "active", owner: "EVA", triggers: "schedule, webhook" },
  { id: "wf2", name: "Render Notify", status: "active", owner: "DJANGO", triggers: "webhook" },
  { id: "wf3", name: "Drops Publisher", status: "paused", owner: "EPIC☠STAR", triggers: "manual" },
  { id: "wf4", name: "Discovery Sync", status: "active", owner: "EPIC☠STAR", triggers: "cron" },
];
const MCP = [
  { id: "fs", name: "Filesystem MCP", status: "online", latency: "8ms", tools: 9, agents: 3 },
  { id: "gh", name: "GitHub MCP", status: "online", latency: "120ms", tools: 14, agents: 2 },
  { id: "br", name: "Browser MCP", status: "online", latency: "60ms", tools: 11, agents: 2 },
  { id: "gd", name: "Google Drive MCP", status: "idle", latency: "—", tools: 6, agents: 1 },
  { id: "tg", name: "Telegram MCP", status: "online", latency: "40ms", tools: 7, agents: 4 },
  { id: "cu", name: "Custom MCP", status: "online", latency: "15ms", tools: 5, agents: 1 },
];
const DOCKER = [
  { id: "n8n", name: "n8n", status: "running", cpu: 4, ram: 320, ports: "5678" },
  { id: "pg", name: "Postgres", status: "running", cpu: 2, ram: 410, ports: "5432" },
  { id: "redis", name: "Redis", status: "running", cpu: 1, ram: 90, ports: "6379" },
  { id: "qdrant", name: "Qdrant", status: "running", cpu: 3, ram: 260, ports: "6333" },
  { id: "flowise", name: "Flowise", status: "running", cpu: 5, ram: 380, ports: "3000" },
  { id: "dify", name: "Dify", status: "idle", cpu: 0, ram: 120, ports: "8080" },
  { id: "ollama", name: "Ollama", status: "running", cpu: 22, ram: 5200, ports: "11434" },
  { id: "kuma", name: "Uptime Kuma", status: "running", cpu: 1, ram: 80, ports: "3001" },
  { id: "graf", name: "Grafana", status: "running", cpu: 2, ram: 160, ports: "3002" },
];
const INFRA = [
  { name: "Contabo VPS", region: "EU-DE", ip: "—", uptime: "99.9%", status: "healthy" },
  { name: "RunPod GPU", region: "EU", ip: "—", uptime: "98.4%", status: "healthy" },
  { name: "Cloudflare", region: "global", ip: "edge", uptime: "100%", status: "healthy" },
  { name: "Domains", region: "deepinside.life", ip: "—", uptime: "—", status: "active" },
  { name: "SSL", region: "Let's Encrypt", ip: "—", uptime: "valid", status: "healthy" },
  { name: "Storage / Backups", region: "EU", ip: "—", uptime: "daily", status: "healthy" },
];
const PROVIDERS: Record<string, { name: string; cost: number; status: string; renewal: string }[]> = {
  "AI Models": [
    { name: "ChatGPT Pro", cost: 200, status: "active", renewal: "2026-07-10" },
    { name: "Claude Max", cost: 100, status: "active", renewal: "2026-07-18" },
    { name: "Gemini Ultra", cost: 20, status: "active", renewal: "2026-07-05" },
    { name: "Grok Pro", cost: 30, status: "active", renewal: "2026-07-12" },
    { name: "OpenRouter", cost: 50, status: "active", renewal: "pay-as-you-go" },
    { name: "Perplexity", cost: 20, status: "active", renewal: "2026-07-09" },
  ],
  "Development": [
    { name: "GitHub", cost: 4, status: "active", renewal: "2026-07-01" },
    { name: "Cursor", cost: 20, status: "active", renewal: "2026-07-15" },
    { name: "Windsurf", cost: 15, status: "active", renewal: "2026-07-20" },
    { name: "Replit", cost: 25, status: "active", renewal: "2026-07-08" },
    { name: "Docker Hub", cost: 9, status: "active", renewal: "2026-07-03" },
  ],
  "Infrastructure": [
    { name: "Cloudflare", cost: 20, status: "active", renewal: "2026-07-02" },
    { name: "Contabo", cost: 60, status: "active", renewal: "2026-07-22" },
    { name: "RunPod", cost: 120, status: "active", renewal: "pay-as-you-go" },
    { name: "Google Workspace", cost: 12, status: "active", renewal: "2026-07-14" },
    { name: "Microsoft 365", cost: 10, status: "active", renewal: "2026-07-19" },
    { name: "Grafana Cloud", cost: 0, status: "active", renewal: "free" },
  ],
  "Content": [
    { name: "ElevenLabs", cost: 99, status: "active", renewal: "2026-07-11" },
    { name: "Canva", cost: 13, status: "active", renewal: "2026-07-06" },
    { name: "CapCut", cost: 8, status: "active", renewal: "2026-07-17" },
  ],
  "Numbers": [
    { name: "Grizzly SMS", cost: 20, status: "active", renewal: "top-up" },
    { name: "Quackr", cost: 15, status: "active", renewal: "top-up" },
    { name: "5SIM", cost: 20, status: "active", renewal: "top-up" },
    { name: "SMSHub", cost: 15, status: "active", renewal: "top-up" },
  ],
};

export function OperationsCenter({ ctx, onClose, onAction }: { ctx: Ctx; onClose: () => void; onAction?: (t: string) => void }) {
  const [sec, setSec] = useState("dashboard");
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(LS) || "{}"); if (d.sec) setSec(d.sec); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ sec, timestamp: new Date().toISOString() })); } catch {} }, [sec]);

  const tgIndex = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_telegram_index_v1") || "null"); } catch { return null; } }, []);
  const monthly = useMemo(() => Object.values(PROVIDERS).flat().reduce((s, p) => s + p.cost, 0), []);
  const counts = {
    agentsOnline: ctx.agents.filter((a) => a.state === "ACTIVE").length,
    devicesOnline: GEELARK.filter((g) => g.status === "online").length,
    workflows: WORKFLOWS.filter((w) => w.status === "active").length,
    containers: DOCKER.filter((d) => d.status === "running").length,
    providers: Object.values(PROVIDERS).flat().length,
    mcp: MCP.filter((m) => m.status === "online").length,
  };
  const st: Record<string, string> = { online: "#4ade80", running: "#4ade80", active: "#4ade80", healthy: "#4ade80", idle: "#fbbf24", paused: "#fbbf24" };
  const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
  const ini = (s: string) => (s || "•").replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const Card = ({ children, className = "" }: any) => <div className={`rounded-2xl border border-[rgba(110,231,255,.18)] bg-[rgba(16,22,33,.6)] p-4 backdrop-blur ${className}`}>{children}</div>;
  const Dot = ({ s }: { s: string }) => <span className="inline-block h-2 w-2 rounded-full" style={{ background: st[s] || "#9ca3af" }} />;

  function Body() {
    if (sec === "dashboard") return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">{([["Agents Online", counts.agentsOnline], ["Devices Online", counts.devicesOnline], ["Workflows Running", counts.workflows], ["Containers Running", counts.containers], ["Providers Connected", counts.providers], ["MCP Servers Online", counts.mcp]] as const).map(([l, v]) => (
          <Card key={l}><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-3xl font-black text-cyan-300">{v}</div></Card>))}</div>
        <Card><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Command Center</div>
          <div className="flex flex-wrap gap-2">{[["agents", "Open Agents"], ["geelark", "Open Devices"], ["docker", "Open Docker"], ["workflows", "Open Workflows"], ["monitoring", "Open Monitoring"]].map(([t, l]) => <button key={t} onClick={() => setSec(t)} className="rounded-xl border border-cyan-500/30 bg-cyan-600/15 px-4 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-600/25">{l}</button>)}</div>
        </Card>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-tg-accent">AI Stack Summary</div>
            <div className="text-sm text-tg-muted">Месячные расходы: <b className="text-white">${monthly}</b> · Оплачено сервисов: <b className="text-white">{counts.providers}</b> · Бюджет ≈ <b className="text-white">$1200/мес</b></div>
            <div className="mt-2 space-y-1">{Object.entries(PROVIDERS).map(([cat, list]) => { const sum = list.reduce((s, p) => s + p.cost, 0); return <div key={cat} className="flex items-center gap-2 text-[12px]"><span className="w-28 text-tg-muted">{cat}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500" style={{ width: Math.round((sum / monthly) * 100) + "%" }} /></div><span className="w-12 text-right font-bold">${sum}</span></div>; })}</div>
          </Card>
          <Card><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-tg-accent">Quick Open</div>
            <div className="flex flex-wrap gap-2 text-xs">{[["world", "WORLD"], ["telegram", "Telegram WS"], ["htmlcanvas", "HTML Canvas"], ["missions", "Missions"]].map(([t, l]) => <button key={t} onClick={() => onAction?.(t)} className="rounded-lg border border-tg-line bg-tg-bg/40 px-3 py-2 font-semibold hover:text-white">{l}</button>)}</div>
          </Card>
        </div>
      </div>
    );
    if (sec === "agents") return (
      <div className="grid gap-3 lg:grid-cols-2">{ctx.agents.map((a) => { const dev = GEELARK.find((g) => g.agent === a.id); return (
        <Card key={a.id}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full font-bold text-white" style={{ background: av(a.name) }}>{ini(a.name)}</div>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate font-bold">{a.name}</span><Dot s={a.state === "ACTIVE" ? "active" : "idle"} /><span className="text-[11px] text-tg-muted">{a.state}</span></div><div className="text-[11px] text-tg-muted">{a.role} · voice {a.voice || "—"} · {a.personality || "—"}</div></div></div>
          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">{["Telegram", "Instagram", "TikTok", "YouTube"].slice(0, dev ? 4 : 1).map((c) => <span key={c} className="rounded-full bg-tg-bg px-2 py-0.5 text-tg-muted">{c}</span>)}{dev && <span className="rounded-full bg-cyan-600/20 px-2 py-0.5 text-cyan-200">{dev.id}</span>}</div>
          <div className="mt-2 flex flex-wrap gap-1.5"><button onClick={() => onAction?.("agent:" + a.id)} className="rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open Agent</button><button onClick={() => onAction?.("telegram")} className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Open Chat</button><button onClick={() => setSec("workflows")} className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Open Workflow</button><button onClick={() => setSec("geelark")} className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Open Device</button></div>
        </Card>); })}</div>
    );
    if (sec === "telegram") return (
      <div className="space-y-3">
        <Card><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-tg-accent">Telegram Control Center</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">{([["Accounts", ctx.slots.length], ["Dialogs", tgIndex?.dialogs?.length || 0], ["Channels", tgIndex?.channels?.length || 0], ["Groups", tgIndex?.groups?.length || 0], ["Bots", tgIndex?.bots?.length || 0]] as const).map(([l, v]) => <div key={l} className="rounded-xl bg-tg-bg/40 p-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-extrabold text-cyan-300">{v}</div></div>)}</div></Card>
        {(ctx.slots.length ? ctx.slots : [{ slotId: "—", displayName: "Нет аккаунтов" }]).map((s: any) => { const owner = ctx.agents.find((a) => a.id === ctx.bind?.[s.slotId || s.label]); return (
          <Card key={s.slotId || s.label}><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full font-bold text-white" style={{ background: av(s.displayName || "tg") }}>{ini(s.displayName || "TG")}</div>
            <div className="flex-1"><div className="font-semibold">{s.displayName || s.slotId}</div><div className="text-[11px] text-tg-muted">{s.status || "—"} · agent: {owner?.name || "—"}</div></div>
            <button onClick={() => onAction?.("telegram")} className="rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open Workspace</button></div></Card>); })}
      </div>
    );
    if (sec === "geelark") return (
      <div className="grid gap-3 lg:grid-cols-3">{GEELARK.map((g) => { const ag = ctx.agents.find((a) => a.id === g.agent); return (
        <Card key={g.id}><div className="flex items-center gap-2"><span className="text-2xl">📱</span><div className="flex-1"><div className="flex items-center gap-1.5 font-bold">{g.id}<Dot s={g.status} /></div><div className="text-[11px] text-tg-muted">{g.region} · {g.status}</div></div></div>
          <div className="mt-2 text-[12px] text-tg-muted">Agent: <b className="text-white">{ag?.name || "—"}</b></div>
          <div className="mt-1 flex flex-wrap gap-1 text-[10px]">{g.apps.map((a) => <span key={a} className="rounded-full bg-tg-bg px-2 py-0.5 text-emerald-300">{a} ✓</span>)}</div>
          <div className="mt-2 flex gap-1.5"><button className="rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open Device</button><button className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Open Screen</button><button className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Open Logs</button></div>
        </Card>); })}</div>
    );
    if (sec === "workflows") return (
      <div className="space-y-2">{WORKFLOWS.map((w) => (
        <Card key={w.id}><div className="flex items-center gap-2"><span className="text-lg">🔁</span><div className="flex-1"><div className="flex items-center gap-1.5 font-semibold">{w.name}<Dot s={w.status} /></div><div className="text-[11px] text-tg-muted">owner {w.owner} · triggers: {w.triggers}</div></div><div className="flex gap-1.5"><button className="rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open</button><button className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">History</button><button className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Errors</button></div></div></Card>))}</div>
    );
    if (sec === "mcp") return (
      <div className="grid gap-3 lg:grid-cols-3">{MCP.map((m) => (
        <Card key={m.id}><div className="flex items-center gap-1.5 font-bold">{m.name}<Dot s={m.status} /></div>
          <div className="mt-1 text-[12px] text-tg-muted">Status: {m.status} · Latency: {m.latency}</div>
          <div className="text-[12px] text-tg-muted">Tools: <b className="text-white">{m.tools}</b> · Agents: <b className="text-white">{m.agents}</b></div>
          <div className="mt-2 flex gap-1.5"><button className="rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open</button><button className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Test</button><button className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Inspect</button></div></Card>))}</div>
    );
    if (sec === "docker") return (
      <Card><table className="w-full text-left text-sm"><thead className="text-tg-muted text-xs"><tr>{["", "Container", "Status", "CPU %", "RAM MB", "Ports", ""].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>{DOCKER.map((d) => (<tr key={d.id} className="border-t border-tg-line"><td className="px-2 py-1.5"><Dot s={d.status} /></td><td className="px-2 font-semibold">{d.name}</td><td className="px-2 text-tg-muted">{d.status}</td><td className="px-2">{d.cpu}</td><td className="px-2">{d.ram}</td><td className="px-2 text-tg-muted">{d.ports}</td><td className="px-2"><span className="mr-1 cursor-pointer text-cyan-300">Open</span><span className="mr-1 cursor-pointer text-tg-muted">Restart</span><span className="cursor-pointer text-tg-muted">Logs</span></td></tr>))}</tbody></table></Card>
    );
    if (sec === "infra") return (
      <div className="grid gap-3 lg:grid-cols-2">{INFRA.map((i) => (
        <Card key={i.name}><div className="flex items-center gap-1.5 font-bold">{i.name}<Dot s={i.status} /></div><div className="mt-1 text-[12px] text-tg-muted">Region: {i.region} · IP: {i.ip} · Uptime: {i.uptime} · {i.status}</div></Card>))}</div>
    );
    if (sec === "providers") return (
      <div className="space-y-3">{Object.entries(PROVIDERS).map(([cat, list]) => (
        <Card key={cat}><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-tg-accent">{cat}</div>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <div key={p.name} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-3 py-1.5 text-sm"><Dot s={p.status} /><span className="flex-1 font-semibold">{p.name}</span><span className="text-tg-muted">${p.cost}</span></div>)}</div></Card>))}</div>
    );
    if (sec === "billing") return (
      <div className="space-y-3">
        <Card><div className="flex flex-wrap gap-4 text-sm"><div><div className="text-[10px] uppercase text-tg-muted">Monthly Spend</div><div className="text-2xl font-black text-cyan-300">${monthly}</div></div><div><div className="text-[10px] uppercase text-tg-muted">Services Paid</div><div className="text-2xl font-black text-white">{counts.providers}</div></div><div><div className="text-[10px] uppercase text-tg-muted">Budget</div><div className="text-2xl font-black text-white">≈ $1200</div></div><div><div className="text-[10px] uppercase text-tg-muted">Remaining</div><div className="text-2xl font-black text-emerald-300">${1200 - monthly}</div></div></div></Card>
        <Card><table className="w-full text-left text-sm"><thead className="text-tg-muted text-xs"><tr>{["Service", "Category", "Cost", "Status", "Renewal"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
          <tbody>{Object.entries(PROVIDERS).flatMap(([cat, list]) => list.map((p) => (<tr key={cat + p.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{p.name}</td><td className="px-2 text-tg-muted">{cat}</td><td className="px-2">${p.cost}</td><td className="px-2"><span className="text-emerald-300">{p.status}</span></td><td className="px-2 text-tg-muted">{p.renewal}</td></tr>)))}</tbody></table></Card>
      </div>
    );
    if (sec === "monitoring") return (
      <div className="space-y-3">
        <Card><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-tg-accent">System Health</div>
          <div className="space-y-1.5">{([["CPU", 38, "#38bdf8"], ["RAM", 61, "#a78bfa"], ["Disk", 44, "#34d399"], ["Network", 22, "#fbbf24"]] as const).map(([l, v, c]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-16 text-tg-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: c }} /></div><span className="w-10 text-right font-bold">{v}%</span></div>)}</div></Card>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card><div className="mb-1 text-[10px] font-black uppercase text-tg-accent">Services (Uptime Kuma)</div>{DOCKER.map((d) => <div key={d.id} className="flex items-center gap-2 text-[12px]"><Dot s={d.status} /><span className="flex-1">{d.name}</span><span className="text-tg-muted">{d.status === "running" ? "up" : "down"}</span></div>)}</Card>
          <Card><div className="mb-1 text-[10px] font-black uppercase text-tg-accent">Grafana</div><div className="text-[12px] text-tg-muted">Dashboards: System / Telegram / Agents. Alerts: 0 active. Avg latency: 42ms.</div></Card>
        </div>
      </div>
    );
    if (sec === "security") return (
      <Card><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-emerald-400">🛡 Security & Read-Only</div>
        <div className="space-y-1 text-sm text-tg-muted">
          <div>✓ Telegram actions отключены (read-only).</div><div>✓ Backend / TDLib / авторизация не затрагиваются.</div><div>✓ Маршруты не изменяются, новые внешние API не используются.</div><div>✓ Секреты/токены не хранятся в localStorage.</div><div>✓ Все данные — поверх существующей системы и локальных реестров.</div>
        </div></Card>
    );

    return (
      <Card><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-tg-accent">Settings</div>
        <div className="text-sm text-tg-muted">Operations Center состояние хранится в <b className="text-white">epic_ops_center_v1</b>. Реестры провайдеров/Docker/MCP/Geelark — локальные (mock), безопасно редактируются в коде. Связанные центры: WORLD, Telegram Workspace, Discovery, AI COO, AI Guide.</div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">{[["world", "WORLD"], ["telegram", "Telegram"], ["htmlcanvas", "HTML Canvas"]].map(([t, l]) => <button key={t} onClick={() => onAction?.(t)} className="rounded-lg border border-tg-line bg-tg-bg/40 px-3 py-1.5 font-semibold hover:text-white">{l}</button>)}</div></Card>
    );
  }

  return (
    <div className="fixed inset-0 z-[58] flex flex-col bg-[#070b12] text-tg-text">
      <header className="flex items-center gap-3 border-b border-[rgba(110,231,255,.2)] bg-[#0b1119] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🛰 DEEPINSIDE · OPERATIONS CENTER</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · SYSTEM</span>
        <div className="ml-auto flex flex-wrap gap-1 text-[10px]">{([["Agents", counts.agentsOnline], ["Devices", counts.devicesOnline], ["WF", counts.workflows], ["Docker", counts.containers], ["MCP", counts.mcp]] as const).map(([l, v]) => <span key={l} className="rounded-full border border-tg-line bg-tg-bg px-2 py-1"><span className="text-tg-muted">{l} </span><b>{v}</b></span>)}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-[rgba(110,231,255,.15)] bg-[#0b1119] p-2">
          <div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">DEEPINSIDE</div>
          {NAV.map(([id, label]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${sec === id ? "bg-cyan-600/25 text-white ring-1 ring-cyan-500/40" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}
        </nav>
        <main className="min-h-0 overflow-auto p-4"><Body /></main>
      </div>
    </div>
  );
}
