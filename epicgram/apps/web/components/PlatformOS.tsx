"use client";

// DEEPINSIDE PLATFORM OS v1.0 — unified operating system over digital entities, agents, platforms, infrastructure, media.
// K1 Platform Intelligence · K2 Infrastructure · K3 Agent Runtime Blueprints · K4 Media Factory · K5 Digital Human Center
// · K6 Command Graph (infinite canvas) · K7 Executive Dashboard · K8 OS Map. PREVIEW_ONLY · LOCAL_STORAGE_ONLY · READ_ONLY refs.
// No runtime/execution/ADB/RPA/API/OAuth/credentials/tokens/webhooks/network/publishing/automation/device-control. Additive.

import { useEffect, useMemo, useRef, useState } from "react";

const SAFETY = { mode: "PREVIEW_ONLY", read_only: true, sandbox_only: true, execution_allowed: false, network_calls: false, runtime_enabled: false, automation: false, publishing_allowed: false, credentials_stored: false, external_integrations: false, device_control_allowed: false, account_creation_allowed: false };

const CENTERS: [string, string][] = [
  ["os", "🪐 OS Map"], ["graph", "🕸 Command Graph"], ["executive", "👑 Executive Dashboard"],
  ["platforms", "🌐 Platform Intelligence"], ["infra", "🏗 Infrastructure"], ["blueprints", "🤖 Agent Runtime Blueprints"],
  ["media", "🎬 Media Factory"], ["humans", "🧬 Digital Human Center"],
];

const PLATFORMS = [
  { id: "telegram", name: "Telegram", cat: "Social", risk: "MEDIUM", approval: "REVIEW", health: 88, readiness: 84, cost: "$0" },
  { id: "youtube", name: "YouTube", cat: "Video", risk: "MEDIUM", approval: "REVIEW", health: 90, readiness: 78, cost: "$0" },
  { id: "tiktok", name: "TikTok", cat: "Video", risk: "HIGH", approval: "REVIEW", health: 82, readiness: 70, cost: "$0" },
  { id: "instagram", name: "Instagram", cat: "Social", risk: "HIGH", approval: "REVIEW", health: 80, readiness: 66, cost: "$0" },
  { id: "facebook", name: "Facebook", cat: "Social", risk: "MEDIUM", approval: "PLANNED", health: 70, readiness: 50, cost: "$0" },
  { id: "x", name: "X", cat: "Social", risk: "MEDIUM", approval: "PLANNED", health: 74, readiness: 54, cost: "$0" },
  { id: "discord", name: "Discord", cat: "Community", risk: "LOW", approval: "PLANNED", health: 78, readiness: 58, cost: "$0" },
  { id: "github", name: "GitHub", cat: "Dev", risk: "LOW", approval: "READY_PREVIEW", health: 94, readiness: 86, cost: "$0" },
  { id: "huggingface", name: "HuggingFace", cat: "AI", risk: "LOW", approval: "READY_PREVIEW", health: 86, readiness: 74, cost: "$0-9" },
  { id: "docker", name: "Docker", cat: "Infra", risk: "LOW", approval: "READY_PREVIEW", health: 96, readiness: 90, cost: "$0" },
  { id: "n8n", name: "n8n", cat: "Automation", risk: "MEDIUM", approval: "REVIEW", health: 90, readiness: 80, cost: "$0-20" },
  { id: "cloudflare", name: "Cloudflare", cat: "Infra", risk: "LOW", approval: "READY_PREVIEW", health: 95, readiness: 88, cost: "$0-20" },
  { id: "openrouter", name: "OpenRouter", cat: "AI", risk: "LOW", approval: "READY_PREVIEW", health: 92, readiness: 84, cost: "usage" },
  { id: "chatgpt", name: "ChatGPT", cat: "AI", risk: "LOW", approval: "READY_PREVIEW", health: 90, readiness: 82, cost: "$20" },
  { id: "claude", name: "Claude", cat: "AI", risk: "LOW", approval: "READY_PREVIEW", health: 94, readiness: 86, cost: "usage" },
  { id: "gemini", name: "Gemini", cat: "AI", risk: "LOW", approval: "PLANNED", health: 84, readiness: 70, cost: "usage" },
  { id: "grok", name: "Grok", cat: "AI", risk: "LOW", approval: "PLANNED", health: 82, readiness: 66, cost: "$8-30" },
  { id: "elevenlabs", name: "ElevenLabs", cat: "Voice", risk: "MEDIUM", approval: "REVIEW", health: 88, readiness: 76, cost: "$5-99" },
  { id: "runpod", name: "RunPod", cat: "GPU", risk: "MEDIUM", approval: "PLANNED", health: 80, readiness: 60, cost: "usage" },
  { id: "geelark", name: "Geelark", cat: "Device", risk: "HIGH", approval: "REVIEW", health: 76, readiness: 55, cost: "$10-40" },
];
const PLATFORM_CAPS: Record<string, string[]> = { Social: ["posting (manual)", "audience", "DM (manual)"], Video: ["upload (manual)", "shorts", "analytics"], AI: ["inference (preview)", "routing", "prompts"], Infra: ["hosting", "edge", "tunnels"], Voice: ["TTS (consent)", "voice presets"], Device: ["cloud phone (mock)", "manual setup"], Dev: ["repos", "CI preview"], Community: ["channels", "bots (preview)"], Automation: ["workflows (preview)"], GPU: ["render (planned)"] };

const INFRA = [
  { id: "vps1", type: "VPS", name: "Contabo VPS", status: "Online", spec: "8c/24GB/400GB", cost: "$15/mo" },
  { id: "dom1", type: "Domains", name: "deepinside.life", status: "Planned", spec: "primary", cost: "$12/yr" },
  { id: "dns1", type: "DNS", name: "Cloudflare DNS", status: "Ready", spec: "proxied", cost: "$0" },
  { id: "cf1", type: "Cloudflare", name: "CF Tunnel", status: "Ready", spec: "zero-trust", cost: "$0" },
  { id: "st1", type: "Storage", name: "Object Storage", status: "Planned", spec: "100GB", cost: "$5/mo" },
  { id: "ct1", type: "Containers", name: "Docker Stack", status: "Online", spec: "8/9 running", cost: "$0" },
  { id: "db1", type: "Databases", name: "Postgres", status: "Planned", spec: "preview", cost: "$0-10" },
  { id: "q1", type: "Queues", name: "n8n / queue", status: "Ready", spec: "5 workflows", cost: "$0" },
  { id: "gpu1", type: "GPU", name: "RunPod GPU", status: "Planned", spec: "A40 (on-demand)", cost: "usage" },
  { id: "ms1", type: "Media Servers", name: "OBS / RTMP", status: "Planned", spec: "preview", cost: "$0" },
];

const ENTITIES = [
  { id: "eva", name: "EVA NOVIKOVA", emoji: "💠", role: "AI Host", readiness: 84, platforms: ["TikTok", "YouTube", "Telegram"] },
  { id: "buch", name: "BUCH", emoji: "☠️", role: "Operator", readiness: 70, platforms: ["Telegram", "GitHub", "Radio"] },
  { id: "buchiha", name: "BUCHIHA", emoji: "😇", role: "Media Character", readiness: 74, platforms: ["Instagram", "Pinterest", "TikTok"] },
  { id: "nova", name: "NOVA", emoji: "🎧", role: "AI DJ", readiness: 58, platforms: ["Radio", "Music", "YouTube"] },
  { id: "reporter", name: "AI REPORTER", emoji: "📰", role: "Reporter", readiness: 46, platforms: ["Telegram", "YouTube"] },
  { id: "newscaster", name: "AI NEWSCASTER", emoji: "🎙", role: "Anchor", readiness: 44, platforms: ["YouTube", "Radio"] },
];
const BLUEPRINT_FACETS = ["Identity", "Brain", "Memory", "Goals", "Skills", "Tools", "Platforms", "Content Pipeline", "Media Pipeline", "Approval Chain", "Risk Profile", "Deployment Readiness"];
const MEDIA_STAGES = [["Ideas", 18], ["Scripts", 12], ["Images", 42], ["Voice", 9], ["Video", 7], ["Posts", 24], ["Campaigns", 5], ["Publishing Plans", 6], ["Analytics Preview", 11], ["Approval Flow", 8]] as [string, number][];
const HUMAN_PROFILES = ["Identity Card", "Visual Profile", "Voice Profile", "Personality Profile", "Knowledge Profile", "Memory Profile", "Platform Profile", "Infrastructure Profile", "Readiness Profile"];

const SC: Record<string, string> = { READY_PREVIEW: "#4ade80", Online: "#4ade80", Ready: "#38bdf8", REVIEW: "#fbbf24", Planned: "#fbbf24", PLANNED: "#fbbf24", LOW: "#4ade80", MEDIUM: "#fbbf24", HIGH: "#f87171", BLOCKED: "#f87171" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (SC[s] || "#6b7280") + "22", color: SC[s] || "#9ca3af" }}>{s}</span>; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/50 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
function rc(v: number) { return v >= 80 ? "#4ade80" : v >= 60 ? "#fbbf24" : "#f87171"; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

export function PlatformOS({ ctx, onClose, onOpenAgent }: { ctx?: any; onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [center, setCenter] = useState("os");
  const [selPlatform, setSelPlatform] = useState("telegram");
  const [selEntity, setSelEntity] = useState("eva");
  const [bpFacet, setBpFacet] = useState("Identity");
  const [view, setView] = useState({ x: 40, y: 30, k: 0.72 });
  const [panel, setPanel] = useState(true);
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const platReady = Math.round(PLATFORMS.reduce((s, p) => s + p.readiness, 0) / PLATFORMS.length);
  const infraOnline = INFRA.filter((i) => i.status === "Online" || i.status === "Ready").length;
  const entReady = Math.round(ENTITIES.reduce((s, e) => s + e.readiness, 0) / ENTITIES.length);
  const overall = Math.round((platReady + entReady + (infraOnline / INFRA.length * 100)) / 3);
  const p = PLATFORMS.find((x) => x.id === selPlatform) || PLATFORMS[0];
  const e = ENTITIES.find((x) => x.id === selEntity) || ENTITIES[0];

  useEffect(() => {
    const move = (ev: MouseEvent) => { if (pan.current) { const q = pan.current; setView((v) => ({ ...v, x: q.ox + (ev.clientX - q.sx), y: q.oy + (ev.clientY - q.sy) })); } };
    const up = () => (pan.current = null);
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("deepinside.platformOS.v1", JSON.stringify({ ...SAFETY, ts, overall, platforms: PLATFORMS.length, infra: INFRA.length, entities: ENTITIES.length, centers: CENTERS.map((c) => c[0]) }));
    localStorage.setItem("deepinside.platformIntelligence.v1", JSON.stringify({ ts, platforms: PLATFORMS.map((x) => ({ id: x.id, readiness: x.readiness, approval: x.approval })) }));
    localStorage.setItem("deepinside.infrastructure.center.v1", JSON.stringify({ ts, infra: INFRA }));
    localStorage.setItem("deepinside.agentRuntimeBlueprints.v1", JSON.stringify({ ts, agents: ENTITIES.map((x) => x.id), facets: BLUEPRINT_FACETS }));
    localStorage.setItem("deepinside.mediaFactory.center.v1", JSON.stringify({ ts, stages: MEDIA_STAGES }));
    localStorage.setItem("deepinside.digitalHuman.center.v1", JSON.stringify({ ts, entities: ENTITIES.map((x) => x.id), profiles: HUMAN_PROFILES }));
    localStorage.setItem("deepinside.commandGraph.v1", JSON.stringify({ ts, nodeTypes: ["agent", "platform", "server", "account", "pipeline", "content", "risk", "approval", "blueprint"] }));
    localStorage.setItem("deepinside.executiveDashboard.os.v1", JSON.stringify({ ts, overall, agents: ENTITIES.length, platforms: PLATFORMS.length, infra: INFRA.length }));
    localStorage.setItem("deepinside.os.map.v1", JSON.stringify({ ts, layers: ["Agents", "Infrastructure", "Platforms", "Media", "Identity", "Digital Humans", "Governance", "Approvals", "Operations", "Runtime Blueprints"] }));
  } catch {} }, [overall]);

  // ---- canvases ----
  function GraphCanvas({ layered }: { layered?: boolean }) {
    const cx = 560, cy = 360;
    const groups = layered
      ? [["Agents", ENTITIES.map((x) => x.name)], ["Platforms", PLATFORMS.slice(0, 8).map((x) => x.name)], ["Infrastructure", INFRA.map((x) => x.name)], ["Media", MEDIA_STAGES.slice(0, 6).map((m) => m[0])], ["Digital Humans", ENTITIES.map((x) => x.name + " ◆")], ["Governance", ["Approvals", "Audit", "Evidence", "Readiness"]]] as [string, string[]][]
      : [["Agents", ENTITIES.map((x) => x.name)], ["Platforms", PLATFORMS.slice(0, 10).map((x) => x.name)], ["Servers", INFRA.map((x) => x.name)], ["Pipelines", ["Content", "Media", "Publishing"]], ["Approvals", ["Gate", "Dry Run", "Handoff"]], ["Risks", ["Device", "Policy", "Consent"]]] as [string, string[]][];
    const nodes: any[] = []; const edges: [string, string][] = [];
    groups.forEach((g, gi) => { const ang = (gi / groups.length) * Math.PI * 2; const gx = cx + Math.cos(ang) * 320, gy = cy + Math.sin(ang) * 220; nodes.push({ id: "g:" + g[0], label: g[0], x: gx, y: gy, hub: true }); g[1].forEach((n, ni) => { const a2 = ang + (ni - g[1].length / 2) * 0.22; const nx = gx + Math.cos(a2) * 130, ny = gy + Math.sin(a2) * 95; nodes.push({ id: g[0] + ":" + n, label: n, x: nx, y: ny }); edges.push(["g:" + g[0], g[0] + ":" + n]); }); });
    for (let i = 0; i < groups.length; i++) edges.push(["g:" + groups[i][0], "g:" + groups[(i + 1) % groups.length][0]]);
    const byId: Record<string, any> = {}; nodes.forEach((n) => (byId[n.id] = n));
    return <div className="relative min-h-0 flex-1 overflow-hidden bg-[#070a10]" style={{ backgroundImage: "radial-gradient(rgba(120,140,200,.06) 1px, transparent 1px)", backgroundSize: 30 * view.k + "px " + 30 * view.k + "px", backgroundPosition: view.x + "px " + view.y + "px" }} onMouseDown={(ev) => (pan.current = { sx: ev.clientX, sy: ev.clientY, ox: view.x, oy: view.y })} onWheel={(ev) => setView((v) => ({ ...v, k: Math.min(2, Math.max(0.35, v.k - ev.deltaY * 0.001)) }))}>
      <svg className="absolute inset-0 h-full w-full"><g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>{edges.map(([a, b], i) => <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke={byId[a].hub && byId[b].hub ? "rgba(232,121,249,.3)" : "rgba(120,140,170,.14)"} strokeWidth={byId[a].hub && byId[b].hub ? 1.6 : 0.7} />)}{nodes.map((n) => <g key={n.id} onClick={(ev) => { ev.stopPropagation(); }} style={{ cursor: "pointer" }}><circle cx={n.x} cy={n.y} r={n.hub ? 17 : 8} fill={n.hub ? av(n.label) : "#64748b"} opacity={0.9} /><text x={n.x} y={n.y - (n.hub ? 23 : 13)} fill="#cbd5e1" fontSize={n.hub ? 12 : 8} textAnchor="middle">{n.label}</text></g>)}</g></svg>
      <svg width="160" height="110" viewBox="0 0 1120 720" className="absolute bottom-3 right-3 rounded-lg border border-tg-line bg-tg-bg/80">{nodes.map((n) => <circle key={n.id} cx={n.x} cy={n.y} r={n.hub ? 12 : 6} fill={n.hub ? av(n.label) : "#64748b"} />)}</svg>
      <div className="absolute bottom-3 left-3 flex gap-1">{["+", "−", "⟳"].map((b) => <button key={b} onClick={() => setView((v) => b === "+" ? { ...v, k: Math.min(2, v.k + 0.15) } : b === "−" ? { ...v, k: Math.max(0.35, v.k - 0.15) } : { x: 40, y: 30, k: 0.72 })} className="h-7 w-7 rounded bg-[#11151f] text-white ring-1 ring-white/10">{b}</button>)}</div>
      <div className="absolute left-3 top-3 rounded-lg border border-tg-line bg-tg-panel/90 px-2 py-1 text-[10px] text-tg-muted">{layered ? "OS Map · все слои экосистемы" : "Command Graph · zoom/pan · узлы и связи"}</div>
    </div>;
  }

  function Executive() {
    const fin = readLS("epic_finance_v1") || {};
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{[["Overall Readiness", overall + "%", rc(overall)], ["Agents", ENTITIES.length], ["Platforms", PLATFORMS.length], ["Entities", ENTITIES.length], ["Infra Objects", INFRA.length], ["Cost (est)", "$" + (fin.monthlyCost ?? 50) + "/mo"]].map(([l, v, c]) => <div key={l as string} className="rounded-2xl border border-tg-line bg-tg-panel/50 p-3"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="mt-1 text-xl font-black" style={{ color: c as string }}>{v}</div></div>)}</div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card t="Готовность по слоям"><div className="space-y-1.5">{([["Platforms", platReady], ["Agents / Entities", entReady], ["Infrastructure", Math.round(infraOnline / INFRA.length * 100)], ["Media Factory", 64], ["Governance / Approvals", 72]] as [string, number][]).map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-40 text-tg-muted">{l}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: rc(v) }} /></div><b className="w-9 text-right" style={{ color: rc(v) }}>{v}</b></div>)}</div></Card>
        <Card t="Риски · Узкие места · Следующие шаги"><div className="space-y-1.5 text-[12px]"><div className="rounded-lg bg-red-500/10 p-2"><b className="text-red-300">Риски:</b> высокий — TikTok/Instagram/Geelark (платформенные политики).</div><div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Узкие места:</b> GPU/RunPod, Media Servers, Premium revenue.</div><div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Следующие шаги:</b> поднять readiness платформ соц-сетей, завершить infra (storage/db), пройти governance-гейты.</div></div></Card>
      </div>
    </main>;
  }

  function Platforms() {
    return <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]"><main className="min-h-0 overflow-auto p-4"><Card t="Platform Intelligence · 20 платформ"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Platform", "Category", "Risk", "Approval", "Health", "Readiness", "Cost"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{PLATFORMS.map((x) => <tr key={x.id} onClick={() => setSelPlatform(x.id)} className={`cursor-pointer border-t border-tg-line ${selPlatform === x.id ? "bg-tg-active/15" : "hover:bg-tg-hover/30"}`}><td className="px-2 py-1.5 font-semibold">{x.name}</td><td className="px-2 text-tg-muted">{x.cat}</td><td className="px-2"><Chip s={x.risk} /></td><td className="px-2"><Chip s={x.approval} /></td><td className="px-2" style={{ color: rc(x.health) }}>{x.health}</td><td className="px-2" style={{ color: rc(x.readiness) }}>{x.readiness}</td><td className="px-2 text-tg-muted">{x.cost}</td></tr>)}</tbody></table></Card></main>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Platform · {p.name}</div><div className="grid grid-cols-2 gap-1.5 text-[11px]">{[["Category", p.cat], ["Risk", p.risk], ["Approval", p.approval], ["Health", p.health], ["Readiness", p.readiness], ["Cost", p.cost]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div><div className="mt-2 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Capabilities:</b> {(PLATFORM_CAPS[p.cat] || ["—"]).join(", ")}</div><div className="mt-1 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Requirements:</b> manual setup · consent (voice/face) · platform compliance.</div><div className="mt-1 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Dependencies:</b> Infrastructure · Identity · Approvals.</div><div className="mt-1 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Linked agents:</b> {ENTITIES.filter((en) => en.platforms.includes(p.name)).map((en) => en.name).join(", ") || "—"}</div></aside>
    </div>;
  }
  function Infra() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{INFRA.map((x) => <Card key={x.id} t={x.type}><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm" style={{ background: av(x.name) }}>🖥</div><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold">{x.name}</div><div className="text-[10px] text-tg-muted">{x.spec}</div></div><Chip s={x.status} /></div><div className="mt-1 text-[11px] text-tg-muted">Cost: {x.cost}</div></Card>)}</div></main>;
  }
  function Blueprints() {
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]"><nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Agents</div>{ENTITIES.map((x) => <button key={x.id} onClick={() => setSelEntity(x.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${selEntity === x.id ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><span className="text-lg">{x.emoji}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{x.name}</div><div className="text-[10px]" style={{ color: rc(x.readiness) }}>{x.readiness}% · {x.role}</div></div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-4"><div className="mb-2 flex flex-wrap gap-1">{BLUEPRINT_FACETS.map((f) => <button key={f} onClick={() => setBpFacet(f)} className={`rounded-full px-2.5 py-1 text-[11px] ${bpFacet === f ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{f}</button>)}</div>
        <Card t={e.name + " · " + bpFacet + " (blueprint, no execution)"}>{bpFacet === "Platforms" ? <div className="flex flex-wrap gap-1.5">{e.platforms.map((pl) => <span key={pl} className="rounded-full bg-tg-bg px-2.5 py-1 text-[11px] text-tg-muted">{pl}</span>)}</div> : bpFacet === "Deployment Readiness" ? <div className="flex items-center gap-3"><div className="text-3xl font-black" style={{ color: rc(e.readiness) }}>{e.readiness}%</div><div className="text-[12px] text-tg-muted">Готовность blueprint к будущему развёртыванию. Реального запуска нет — только preview + Runtime Gate.</div></div> : <div className="text-sm text-tg-muted">{bpFacet} blueprint для {e.name} (derived/mock, preview). Без реального runtime.</div>}</Card>
        <div className="mt-2"><Card t="Pipeline preview"><div className="flex flex-wrap items-center gap-1.5 text-[11px]">{["Identity", "Brain", "Skills", "Content", "Media", "Approval", "Deploy (gate)"].map((s, i, arr) => <span key={s} className="flex items-center gap-1.5"><span className="rounded-lg bg-tg-bg px-2.5 py-1 text-tg-muted">{s}</span>{i < arr.length - 1 && <span className="text-tg-muted">→</span>}</span>)}</div></Card></div>
      </main>
    </div>;
  }
  function Media() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Media Factory Center (preview)"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{MEDIA_STAGES.map(([l, n]) => <div key={l} className="rounded-xl bg-tg-bg/40 p-3"><div className="text-[12px] font-semibold">{l}</div><div className="text-2xl font-black text-cyan-300">{n}</div><div className="text-[9px] text-tg-muted">preview items</div></div>)}</div><div className="mt-2 text-[10px] text-tg-muted">Всё только preview · approval flow · без публикаций. Связано с Media Orchestration / Content Release.</div></Card></main>;
  }
  function Humans() {
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]"><nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Digital Humans</div>{ENTITIES.map((x) => <button key={x.id} onClick={() => setSelEntity(x.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${selEntity === x.id ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><span className="text-lg">{x.emoji}</span><div className="truncate text-sm font-semibold">{x.name}</div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-4"><div className="mb-2 flex items-center gap-2"><span className="text-2xl">{e.emoji}</span><div className="text-lg font-black">{e.name}</div><span className="text-[11px] text-tg-muted">{e.role}</span><span className="ml-2 text-sm font-black" style={{ color: rc(e.readiness) }}>{e.readiness}%</span><button onClick={() => onOpenAgent?.(e.id)} className="ml-auto rounded-lg bg-tg-active px-3 py-1 text-[11px] font-semibold text-white">Open Agent →</button></div>
        <div className="grid gap-2 sm:grid-cols-3">{HUMAN_PROFILES.map((pr) => <Card key={pr}><div className="text-[12px] font-semibold">{pr}</div><div className="mt-0.5 text-[10px] text-tg-muted">configured (mock/preview)</div></Card>)}</div></main>
    </div>;
  }

  return (
    <div className="fixed inset-0 z-[82] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🪐 DEEPINSIDE PLATFORM OS v1.0</div>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">PREVIEW_ONLY</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">READ_ONLY · SANDBOX</span>
        <div className="ml-auto flex items-center gap-2 text-[11px]"><span className="rounded-full bg-tg-bg px-2.5 py-1">Readiness: <b style={{ color: rc(overall) }}>{overall}%</b></span><button onClick={() => setPanel((x) => !x)} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">{panel ? "Скрыть AI Operator" : "AI Operator"}</button></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr] lg:grid-cols-[210px_1fr_280px]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2">{CENTERS.map(([id, label]) => <button key={id} onClick={() => setCenter(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-2 text-left text-[12px] ${center === id ? "bg-tg-active text-white font-semibold" : "hover:bg-tg-hover/40"}`}>{label}</button>)}
          <div className="mt-3 rounded-lg border border-tg-line bg-tg-bg/30 p-2 text-[10px] text-tg-muted"><div className="mb-1 font-black uppercase tracking-[0.18em] text-tg-accent">Snapshot</div><div>Agents: <b className="text-tg-text">{ENTITIES.length}</b></div><div>Platforms: <b className="text-tg-text">{PLATFORMS.length}</b></div><div>Infra: <b className="text-tg-text">{INFRA.length}</b></div><div>Readiness: <b style={{ color: rc(overall) }}>{overall}%</b></div></div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {center === "os" && <GraphCanvas layered />}
          {center === "graph" && <GraphCanvas />}
          {center === "executive" && <Executive />}
          {center === "platforms" && <Platforms />}
          {center === "infra" && <Infra />}
          {center === "blueprints" && <Blueprints />}
          {center === "media" && <Media />}
          {center === "humans" && <Humans />}
        </div>
        {panel && <aside className="hidden min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3 lg:block"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🧠 AI Operator · OS Context</div>
          <Card t="Текущий центр"><div className="text-sm font-bold">{CENTERS.find(([c]) => c === center)?.[1]}</div></Card>
          <div className="mt-2"><Card t="OS Readiness"><div className="flex items-center gap-2"><div className="text-2xl font-black" style={{ color: rc(overall) }}>{overall}%</div><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: overall + "%", background: rc(overall) }} /></div></div></Card></div>
          <div className="mt-2"><Card t="Слои OS"><div className="space-y-0.5 text-[11px] text-tg-muted">{["Agents", "Infrastructure", "Platforms", "Media", "Identity", "Digital Humans", "Governance", "Approvals", "Operations", "Runtime Blueprints"].map((l) => <div key={l}>• {l}</div>)}</div></Card></div>
          <div className="mt-2"><Card t="Safety"><div className="text-[11px] text-emerald-300">PREVIEW_ONLY · READ_ONLY · SANDBOX. Без runtime/API/credentials/automation/publishing.</div></Card></div>
        </aside>}
      </div>
    </div>
  );
}
