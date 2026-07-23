"use client";

// IDENTITY & ACCOUNT INFRASTRUCTURE — digital-identity foundation for DEEP INSIDE entities.
// Category: CORE · CRITICAL · MAX. UI + localStorage + derived/MOCK only. No real phones/emails/OAuth/API/secrets. Additive.

import { useEffect, useMemo, useRef, useState } from "react";

const SECTIONS: [string, string][] = [
  ["registry", "🪪 Identity Registry"], ["accounts", "🔐 Account Center"], ["phone", "📱 Phone Center"],
  ["email", "📧 Email Center"], ["google", "🌐 Google Workspace"], ["matrix", "📊 Platform Matrix"],
  ["device", "📲 Device Binding"], ["ownership", "🔗 Ownership Center"], ["graph", "🌍 Identity Graph"], ["reality", "🌉 Reality Bridge"],
];
const PLATFORMS = ["Telegram", "YouTube", "Instagram", "TikTok", "Pinterest", "Facebook", "X", "LinkedIn", "GitHub", "Website"];
const RSTATES = ["Mock", "Ready", "Connected", "Live"];
const MSTATE_DOT: Record<string, string> = { Missing: "🔴", Planned: "🟠", Ready: "🟡", Connected: "🔵", Live: "🟢" };
const MSTATE_COLOR: Record<string, string> = { Missing: "#f87171", Planned: "#fb923c", Ready: "#fbbf24", Connected: "#38bdf8", Live: "#4ade80" };

const ENTITIES = [
  { id: "buch", name: "BUCH", emoji: "☠️", role: "AI host (male)", level: "Influencer", created: "2026-05-02", device: "GeeLark Cloud Phone 01" },
  { id: "buchiha", name: "BUCHIHA", emoji: "😇", role: "AI host (female)", level: "Influencer", created: "2026-05-02", device: "GeeLark Cloud Phone 02" },
  { id: "eva", name: "EVA NOVIKOVA", emoji: "💠", role: "AI model / host", level: "Media Asset", created: "2026-05-04", device: "Cloud Device" },
  { id: "nova", name: "NOVA", emoji: "🎧", role: "AI DJ", level: "Creator", created: "2026-05-10", device: "GeeLark Cloud Phone 01" },
  { id: "reporter", name: "AI REPORTER", emoji: "📰", role: "AI reporter", level: "Sandbox", created: "2026-05-18", device: "—" },
  { id: "newscaster", name: "AI NEWSCASTER", emoji: "🎙", role: "AI newscaster", level: "Sandbox", created: "2026-05-20", device: "—" },
];
// deterministic mock identity infra per entity (all clearly fake)
function entInfra(e: typeof ENTITIES[number], idx: number) {
  const seed = idx + 1;
  const phone = "+1-555-01" + String(20 + seed).padStart(2, "0"); // mock, non-routable 555
  const backup = "+1-555-02" + String(20 + seed).padStart(2, "0");
  const handle = e.name.toLowerCase().replace(/[^a-z]/g, "");
  const email = handle + "@deepinside.mock";
  const recovery = handle + ".rec@deepinside.mock";
  // platform statuses
  const order = ["Live", "Connected", "Ready", "Planned", "Missing"];
  const matrix: Record<string, string> = {};
  PLATFORMS.forEach((p, i) => { const lvlBoost = e.level === "Media Asset" ? 0 : e.level === "Influencer" ? 1 : e.level === "Creator" ? 2 : 3; matrix[p] = order[Math.min(4, Math.floor((i + lvlBoost) / 2))]; });
  // reality readiness
  const live = Object.values(matrix).filter((s) => s === "Live").length;
  const conn = Object.values(matrix).filter((s) => s === "Connected").length;
  const platR = Math.round(((live * 100 + conn * 70) / (PLATFORMS.length * 100)) * 100);
  const accountR = e.level === "Sandbox" ? 30 : e.level === "Creator" ? 55 : e.level === "Influencer" ? 72 : 85;
  const deviceR = e.device === "—" ? 20 : 88;
  const identityR = e.level === "Sandbox" ? 60 : 90;
  const contentR = e.level === "Media Asset" ? 84 : e.level === "Influencer" ? 72 : 50;
  const revenueR = e.level === "Media Asset" ? 78 : e.level === "Influencer" ? 62 : 30;
  const reality = Math.round((identityR + accountR + deviceR + platR + contentR + revenueR) / 6);
  return { phone, backup, email, recovery, matrix, accountR, deviceR, identityR, platR, contentR, revenueR, reality };
}
const ENR = ENTITIES.map((e, i) => ({ ...e, ...entInfra(e, i) }));

const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
function rColor(v: number) { return v >= 80 ? "#4ade80" : v >= 55 ? "#fbbf24" : "#f87171"; }
function Bar({ l, v }: { l: string; v: number }) { return <div className="flex items-center gap-2 text-[12px]"><span className="w-32 text-tg-muted">{l}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: rColor(v) }} /></div><b className="w-9 text-right" style={{ color: rColor(v) }}>{v}</b></div>; }

export function IdentityInfra({ onClose, onOpenAgent }: { onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [sec, setSec] = useState("registry");
  const [sel, setSel] = useState("eva");
  const [view, setView] = useState({ x: 30, y: 20, k: 0.8 });
  const [focus, setFocus] = useState(false);
  const [query, setQuery] = useState("");
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const e = ENR.find((x) => x.id === sel) || ENR[0];
  const realityAvg = Math.round(ENR.reduce((s, x) => s + x.reality, 0) / ENR.length);
  const liveAssets = ENR.reduce((s, x) => s + Object.values(x.matrix).filter((v) => v === "Live").length, 0);
  const connAssets = ENR.reduce((s, x) => s + Object.values(x.matrix).filter((v) => v === "Connected").length, 0);
  const totalAccounts = ENR.length * (PLATFORMS.length + 2);

  useEffect(() => {
    const move = (ev: MouseEvent) => { if (pan.current) { const p = pan.current; setView((v) => ({ ...v, x: p.ox + (ev.clientX - p.sx), y: p.oy + (ev.clientY - p.sy) })); } };
    const up = () => (pan.current = null);
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("identity_registry", JSON.stringify({ ts, entities: ENR.map((x) => ({ id: x.id, name: x.name, reality: x.reality, level: x.level })) }));
    localStorage.setItem("account_center", JSON.stringify({ ts, platforms: PLATFORMS, totalAccounts }));
    localStorage.setItem("phone_center", JSON.stringify({ ts, phones: ENR.map((x) => ({ id: x.id, phone: x.phone, backup: x.backup })) }));
    localStorage.setItem("email_center", JSON.stringify({ ts, emails: ENR.map((x) => ({ id: x.id, email: x.email })) }));
    localStorage.setItem("google_workspace", JSON.stringify({ ts, entities: ENR.map((x) => x.name) }));
    localStorage.setItem("platform_matrix", JSON.stringify({ ts, matrix: ENR.map((x) => ({ id: x.id, m: x.matrix })) }));
    localStorage.setItem("device_binding", JSON.stringify({ ts, bindings: ENR.map((x) => ({ id: x.id, device: x.device })) }));
    localStorage.setItem("ownership_center", JSON.stringify({ ts, entities: ENR.length }));
    localStorage.setItem("identity_graph", JSON.stringify({ ts, nodes: ENR.length * 6 }));
    localStorage.setItem("reality_bridge", JSON.stringify({ ts, realityAvg, liveAssets, connAssets, entities: ENR.map((x) => ({ id: x.id, reality: x.reality })) }));
  } catch {} }, [realityAvg, liveAssets, connAssets]);

  function Registry() {
    return <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]">
      <main className="min-h-0 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ENR.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`rounded-xl border p-3 text-left ${sel === x.id ? "border-cyan-400 bg-cyan-500/10" : "border-tg-line hover:border-cyan-400/50"}`}><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-full text-sm" style={{ background: av(x.name) }}>{x.emoji}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{x.name}</div><div className="text-[10px] text-tg-muted">{x.role} · {x.level}</div></div></div><div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]"><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Identity</div><b style={{ color: rColor(x.identityR) }}>{x.identityR}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Infra</div><b style={{ color: rColor(Math.round((x.accountR + x.deviceR + x.platR) / 3)) }}>{Math.round((x.accountR + x.deviceR + x.platR) / 3)}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Reality</div><b style={{ color: rColor(x.reality) }}>{x.reality}</b></div></div></button>)}</div></main>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🪪 Identity Card</div>
        <div className="flex items-center gap-2"><div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ background: av(e.name) }}>{e.emoji}</div><div><div className="font-black">{e.name}</div><div className="text-[11px] text-tg-muted">{e.role}</div></div></div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">{[["Status", "ACTIVE"], ["Level", e.level], ["Owner", "EPIC☠STAR"], ["Created", e.created], ["Identity Score", e.identityR], ["Reality Score", e.reality]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div>
        <div className="mt-2 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Mock infra:</b> 📱 {e.phone} · 📧 {e.email} · 📲 {e.device}</div>
        <button onClick={() => onOpenAgent?.(e.id)} className="mt-2 w-full rounded-lg bg-tg-active py-1.5 text-[12px] font-semibold text-white">Open Agent →</button>
      </aside>
    </div>;
  }
  function Accounts() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 flex flex-wrap gap-1">{ENR.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`rounded-full px-2.5 py-1 text-[11px] ${sel === x.id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{x.emoji} {x.name}</button>)}</div>
      <Card t={"Account Center · " + e.name}><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{["Google", ...PLATFORMS, "Domain"].map((p) => { const sNum = p === "Google" ? (e.accountR >= 72 ? "Connected" : "Ready") : p === "Domain" ? (e.level === "Media Asset" ? "Ready" : "Planned") : e.matrix[p] || "Planned"; return <div key={p} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-2.5 py-1.5 text-[12px]"><span className="flex-1">{p}</span><span style={{ color: MSTATE_COLOR[sNum] || "#9ca3af" }}>{MSTATE_DOT[sNum] || "⚪"} {sNum}</span></div>; })}</div></Card></main>;
  }
  function Phone() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Phone Center (mock · нерабочие 555-номера)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Entity", "Primary", "Backup", "Country", "Provider", "Verify", "Device"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{ENR.map((x) => <tr key={x.id} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{x.emoji} {x.name}</td><td className="px-2">{x.phone}</td><td className="px-2 text-tg-muted">{x.backup}</td><td className="px-2">US (mock)</td><td className="px-2 text-tg-muted">MockTel</td><td className="px-2"><span style={{ color: x.device === "—" ? "#f87171" : "#4ade80" }}>{x.device === "—" ? "Pending" : "Verified*"}</span></td><td className="px-2 text-tg-muted">{x.device}</td></tr>)}</tbody></table><div className="mt-2 text-[10px] text-tg-muted">* симуляция верификации. Реальных номеров и SMS нет.</div></Card></main>;
  }
  function Email() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Email Center (mock · домен .mock)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Entity", "Primary Email", "Recovery", "Provider", "Verify", "Linked"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{ENR.map((x) => <tr key={x.id} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{x.emoji} {x.name}</td><td className="px-2">{x.email}</td><td className="px-2 text-tg-muted">{x.recovery}</td><td className="px-2">Mock Mail</td><td className="px-2"><span style={{ color: x.accountR >= 72 ? "#4ade80" : "#fbbf24" }}>{x.accountR >= 72 ? "Verified*" : "Pending"}</span></td><td className="px-2 text-tg-muted">{Object.values(x.matrix).filter((v) => v === "Live" || v === "Connected").length} платформ</td></tr>)}</tbody></table></Card></main>;
  }
  function Google() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 flex flex-wrap gap-1">{ENR.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`rounded-full px-2.5 py-1 text-[11px] ${sel === x.id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{x.emoji} {x.name}</button>)}</div>
      <Card t={"Google Workspace · " + e.name + " (mock)"}><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{[["Google Account", e.email], ["YouTube Channel", e.matrix.YouTube], ["Drive", "Ready"], ["Docs", "Ready"], ["Photos", "Ready"], ["Calendar", "Ready"]].map(([l, v]) => <div key={l as string} className="rounded-lg bg-tg-bg/40 p-2 text-[12px]"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div><div className="mt-2"><Bar l="Workspace Readiness" v={e.accountR} /></div></Card></main>;
  }
  function Matrix() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Platform Matrix"><div className="overflow-auto"><table className="w-full text-left text-[11px]"><thead className="text-tg-muted"><tr><th className="px-2 py-1 sticky left-0 bg-tg-panel">Entity</th>{PLATFORMS.map((p) => <th key={p} className="px-1.5 py-1">{p.slice(0, 4)}</th>)}</tr></thead><tbody>{ENR.slice(0, 4).map((x) => <tr key={x.id} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold sticky left-0 bg-tg-panel">{x.emoji} {x.name}</td>{PLATFORMS.map((p) => <td key={p} className="px-1.5 text-center" title={x.matrix[p]}>{MSTATE_DOT[x.matrix[p]]}</td>)}</tr>)}</tbody></table></div><div className="mt-2 flex flex-wrap gap-2 text-[10px] text-tg-muted">{Object.entries(MSTATE_DOT).map(([s, d]) => <span key={s}>{d} {s}</span>)}</div></Card></main>;
  }
  function Device() {
    const chain = ["Entity", "GeeLark Device", "Phone", "Google", "Platforms"];
    const nodes = chain.map((c, i) => ({ id: c, x: 100 + i * 220, y: 150 }));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 flex flex-wrap gap-1">{ENR.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`rounded-full px-2.5 py-1 text-[11px] ${sel === x.id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{x.emoji} {x.name}</button>)}</div>
      <Card t={"Device Binding · " + e.name}><svg width="100%" height="220" viewBox="0 0 1080 300">{nodes.slice(0, -1).map((n, i) => <line key={i} x1={n.x + 60} y1={n.y} x2={nodes[i + 1].x - 60} y2={nodes[i + 1].y} stroke="rgba(120,200,160,.4)" strokeWidth={2} markerEnd="url(#da)" />)}<defs><marker id="da" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="rgba(120,200,160,.7)" /></marker></defs>{nodes.map((n, i) => <g key={n.id}><rect x={n.x - 62} y={n.y - 18} width={124} height={36} rx={9} fill={av(n.id + e.name)} opacity={0.88} /><text x={n.x} y={n.y - 1} fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle">{n.id === "Entity" ? e.name.split(" ")[0] : n.id === "GeeLark Device" ? "Device" : n.id}</text><text x={n.x} y={n.y + 13} fill="#cbd5e1" fontSize="8" textAnchor="middle">{n.id === "Phone" ? e.phone : n.id === "Google" ? "mock" : n.id === "GeeLark Device" ? e.device.slice(0, 12) : ""}</text></g>)}</svg></Card></main>;
  }
  function Ownership() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ENR.map((x) => <Card key={x.id} t={x.emoji + " " + x.name}><div className="space-y-0.5 text-[11px]">{[["Device", x.device], ["Phone", x.phone], ["Email", x.email], ["Google", "mock acct"], ["Platforms", Object.values(x.matrix).filter((v) => v === "Live" || v === "Connected").length + " active"], ["Domain", x.level === "Media Asset" ? "ready" : "planned"], ["Assets", "content + revenue"]].map(([l, v]) => <div key={l as string} className="flex gap-2"><span className="w-20 text-tg-muted">{l}</span><b className="truncate">{v}</b></div>)}</div></Card>)}</div></main>;
  }
  function Graph() {
    const cx = 560, cy = 320;
    const nodes: { id: string; label: string; x: number; y: number; root?: boolean; kind: string }[] = [];
    const edges: [string, string][] = [];
    const sub = ["Phone", "Email", "Google", "Platforms", "Content", "Revenue"];
    ENR.slice(0, 4).forEach((x, ei) => {
      const ang = (ei / 4) * Math.PI * 2; const ex = cx + Math.cos(ang) * 280, ey = cy + Math.sin(ang) * 180;
      nodes.push({ id: x.id, label: x.name, x: ex, y: ey, root: true, kind: "Entity" });
      sub.forEach((s, si) => { const a2 = ang + (si - sub.length / 2) * 0.3; const px = ex + Math.cos(a2) * 120, py = ey + Math.sin(a2) * 90; const nid = x.id + ":" + s; nodes.push({ id: nid, label: s, x: px, y: py, kind: s }); edges.push([x.id, nid]); });
    });
    const byId: Record<string, any> = {}; nodes.forEach((n) => (byId[n.id] = n));
    const visible = nodes.filter((n) => !focus || n.id === sel || n.id.startsWith(sel + ":"));
    const vis = new Set(visible.map((n) => n.id));
    return <div className="grid min-h-0 flex-1 grid-cols-[1fr_280px]">
      <div className="relative min-h-0 overflow-hidden bg-[#070a10]" onMouseDown={(ev) => (pan.current = { sx: ev.clientX, sy: ev.clientY, ox: view.x, oy: view.y })} onWheel={(ev) => setView((v) => ({ ...v, k: Math.min(2, Math.max(0.4, v.k - ev.deltaY * 0.001)) }))}>
        <svg className="absolute inset-0 h-full w-full"><g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>{edges.filter(([a, b]) => vis.has(a) && vis.has(b)).map(([a, b], i) => <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke={(a === sel) ? "#22d3ee" : "rgba(120,140,170,.18)"} strokeWidth={a === sel ? 1.8 : 0.8} />)}{visible.map((n) => <g key={n.id} onClick={(ev) => { ev.stopPropagation(); if (n.root) setSel(n.id); }} style={{ cursor: n.root ? "pointer" : "default" }}><circle cx={n.x} cy={n.y} r={n.root ? (sel === n.id ? 18 : 14) : 8} fill={n.root ? av(n.label) : "#22d3ee"} stroke={sel === n.id ? "#fff" : "none"} strokeWidth={2} opacity={0.9} /><text x={n.x} y={n.y - (n.root ? 20 : 13)} fill="#cbd5e1" fontSize={n.root ? 11 : 8} textAnchor="middle">{n.root ? n.label.split(" ")[0] : n.label}</text></g>)}</g></svg>
        <svg width="150" height="100" viewBox="0 0 1120 640" className="absolute bottom-3 right-3 rounded border border-tg-line bg-tg-bg/80">{visible.map((n) => <circle key={n.id} cx={n.x} cy={n.y} r={n.root ? 12 : 6} fill={n.root ? av(n.label) : "#22d3ee"} />)}</svg>
        <div className="absolute bottom-3 left-3 flex gap-1">{["+", "−", "⟳"].map((b) => <button key={b} onClick={() => setView((v) => b === "+" ? { ...v, k: Math.min(2, v.k + 0.15) } : b === "−" ? { ...v, k: Math.max(0.4, v.k - 0.15) } : { x: 30, y: 20, k: 0.8 })} className="h-7 w-7 rounded bg-[#11151f] text-white ring-1 ring-white/10">{b}</button>)}<button onClick={() => setFocus((f) => !f)} className={`h-7 rounded px-2 text-[11px] ring-1 ring-white/10 ${focus ? "bg-tg-active text-white" : "bg-[#11151f] text-tg-muted"}`}>Focus</button></div>
      </div>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Inspector</div><div className="mb-2"><input value={query} onChange={(ev) => { setQuery(ev.target.value); const m = ENR.find((x) => x.name.toLowerCase().includes(ev.target.value.toLowerCase())); if (m && ev.target.value) setSel(m.id); }} placeholder="🔎 поиск сущности…" className="w-full rounded-lg border border-tg-line bg-tg-bg px-2 py-1 text-[11px] outline-none" /></div><div className="flex items-center gap-2"><span className="text-xl">{e.emoji}</span><div><div className="font-bold">{e.name}</div><div className="text-[10px] text-tg-muted">Reality {e.reality}%</div></div></div><div className="mt-2 space-y-1 text-[11px]"><div>📱 {e.phone}</div><div>📧 {e.email}</div><div>🌐 Google: mock</div><div>📲 {e.device}</div><div>📊 {Object.values(e.matrix).filter((v) => v === "Live").length} Live · {Object.values(e.matrix).filter((v) => v === "Connected").length} Connected</div></div></aside>
    </div>;
  }
  function Reality() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-tg-line bg-tg-panel/60 p-4"><div className="text-4xl font-black" style={{ color: rColor(realityAvg) }}>{realityAvg}%</div><div><div className="text-[11px] uppercase text-tg-muted">Average Reality Score</div><div className="text-sm text-tg-muted">{liveAssets} Live · {connAssets} Connected активов</div></div>
        <div className="ml-auto flex flex-wrap gap-1.5 text-[10px]">{RSTATES.map((s) => <span key={s} className="rounded-full bg-tg-bg px-2 py-0.5 text-tg-muted">{s}</span>)}</div>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">{ENR.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`rounded-full px-2.5 py-1 text-[11px] ${sel === x.id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{x.emoji} {x.name} · {x.reality}%</button>)}</div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card t={"Reality Bridge · " + e.name}><div className="space-y-1.5"><Bar l="Identity Readiness" v={e.identityR} /><Bar l="Account Readiness" v={e.accountR} /><Bar l="Device Readiness" v={e.deviceR} /><Bar l="Platform Readiness" v={e.platR} /><Bar l="Content Readiness" v={e.contentR} /><Bar l="Revenue Readiness" v={e.revenueR} /></div><div className="mt-2 flex items-center gap-2 rounded-lg bg-tg-bg/40 p-2"><span className="text-sm">Reality Score</span><div className="ml-auto text-2xl font-black" style={{ color: rColor(e.reality) }}>{e.reality}%</div></div></Card>
        <Card t="🤖 AI COO · Reality Report"><div className="space-y-1.5 text-[12px]">
          <div className="rounded-lg bg-emerald-500/10 p-2"><b className="text-emerald-300">Что подключено:</b> {liveAssets} Live + {connAssets} Connected активов; топ {ENR.slice().sort((a, b) => b.reality - a.reality)[0].name}.</div>
          <div className="rounded-lg bg-red-500/10 p-2"><b className="text-red-300">Что отсутствует:</b> реальные номера/email/Google (всё mock); device для AI REPORTER/NEWSCASTER.</div>
          <div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Infrastructure Gaps:</b> domains, premium revenue, policy review платформ.</div>
          <div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Launch Recommendations:</b> начать с EVA/BUCHIHA (highest reality), затем привязать устройства sandbox-сущностям.</div>
          <div className="rounded-lg bg-tg-bg/40 p-2 text-[11px] text-tg-muted">Reality Bridge — мост mock → real. Сейчас все объекты в статусе Mock/Ready (UI-only).</div>
        </div></Card>
      </div>
    </main>;
  }

  return (
    <div className="fixed inset-0 z-[76] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🪪 IDENTITY INFRASTRUCTURE</div>
        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300">CORE · CRITICAL · MAX</span>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">MOCK ONLY</span>
        <div className="ml-auto flex items-center gap-2 text-[11px]"><span className="rounded-full bg-tg-bg px-2.5 py-1">Reality: <b style={{ color: rColor(realityAvg) }}>{realityAvg}%</b></span><span className="rounded-full bg-tg-bg px-2.5 py-1">Live: <b className="text-emerald-300">{liveAssets}</b></span><span className="rounded-full bg-tg-bg px-2.5 py-1">Entities: <b>{ENR.length}</b></span></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2">{SECTIONS.map(([id, label]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] ${sec === id ? "bg-tg-active text-white font-semibold" : "hover:bg-tg-hover/40"}`}>{label}</button>)}
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300">Все данные — mock. Без реальных номеров, email, Google, OAuth, авторизаций.</div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "registry" && <Registry />}
          {sec === "accounts" && <Accounts />}
          {sec === "phone" && <Phone />}
          {sec === "email" && <Email />}
          {sec === "google" && <Google />}
          {sec === "matrix" && <Matrix />}
          {sec === "device" && <Device />}
          {sec === "ownership" && <Ownership />}
          {sec === "graph" && <Graph />}
          {sec === "reality" && <Reality />}
        </div>
      </div>
    </div>
  );
}
