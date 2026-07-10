"use client";

// DEEPINSIDE ECOSYSTEM BUS — unified system layer.
// Ecosystem Bus · Universal Inspector · Relationship Engine · Executive Dashboard · Readiness AI Officer.
// CORE SYSTEM · ACTIVE. UI + localStorage + derived data only. No backend/TDLib/actions. Additive.

import { useEffect, useMemo, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; exec: any[]; devices: any[]; slots: any[]; bind: Record<string, string>; counts: Record<string, any>; activeId: string };
type Ent = { id: string; type: string; name: string; status: string; readiness: number; meta?: any };
type Rel = { from: string; to: string; kind: string };

const OBJ_TYPES = ["Agent", "Twin", "Mission", "Task", "Goal", "Device", "Account", "Telegram", "Media", "Project", "Publishing", "Analytics", "Infrastructure", "AI Model", "Document", "Asset", "Workflow", "Service"];
const INS_TABS = ["Overview", "Relations", "Status", "Readiness", "Timeline", "Analytics", "Dependencies", "History", "Actions", "Notes"];
const AI_MODELS = ["ChatGPT", "Claude", "Gemini", "Grok", "Perplexity", "OpenRouter", "ElevenLabs", "ComfyUI", "FaceFusion", "DeepFace", "Ollama"];
const REL_KINDS = ["Owns", "Uses", "Controls", "Publishes", "Assigned", "Depends On", "Connected To", "Related To", "Created By", "Managed By"];

const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x3a3a3a).toString(16).padStart(6, "0");
const ini = (s: string) => (s || "•").replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
function rdColor(v: number) { return v >= 85 ? "#4ade80" : v >= 65 ? "#fbbf24" : "#f87171"; }
function rdDot(v: number) { return v >= 85 ? "🟢" : v >= 65 ? "🟡" : "🔴"; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
function Stat({ l, v, c }: { l: string; v: any; c?: string }) { return <div className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-lg font-black" style={{ color: c }}>{v}</div></div>; }

function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

export function EcosystemBus({ ctx, onClose, onOpenAgent }: { ctx: Ctx; onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [mode, setMode] = useState<"exec" | "bus" | "rel" | "readiness">("exec");
  const [sel, setSel] = useState<string>("");
  const [itab, setItab] = useState("Overview");
  const [pathA, setPathA] = useState("");
  const [pathB, setPathB] = useState("");
  const [objFilter, setObjFilter] = useState("All");
  const [view, setView] = useState({ x: 40, y: 40, k: 1 });

  // ---- Build unified entity graph from existing ecosystem data ----
  const { ents, rels, byId } = useMemo(() => {
    const tgIdx = readLS("epic_telegram_index_v1"); const devIdx = readLS("epic_device_center_v1");
    const ents: Ent[] = []; const rels: Rel[] = [];
    ctx.agents.forEach((a) => { ents.push({ id: a.id, type: "Agent", name: a.name, status: a.state, readiness: a.readiness ?? 60, meta: a }); ents.push({ id: "twin:" + a.id, type: "Twin", name: a.name + " (twin)", status: a.state === "ACTIVE" ? "READY" : "INCOMPLETE", readiness: (a.readiness ?? 60) - 8 }); rels.push({ from: a.id, to: "twin:" + a.id, kind: "Owns" }); });
    ctx.missions.forEach((m) => { ents.push({ id: m.id, type: "Mission", name: m.title, status: m.status, readiness: m.readiness ?? 50, meta: m }); if (m.agentId) rels.push({ from: m.agentId, to: m.id, kind: "Assigned" }); });
    ctx.exec.forEach((e) => { ents.push({ id: e.id, type: "Task", name: e.title, status: e.status, readiness: e.status === "DONE" ? 100 : 50 }); if (e.missionId) rels.push({ from: e.missionId, to: e.id, kind: "Owns" }); if (e.agentId) rels.push({ from: e.agentId, to: e.id, kind: "Controls" }); });
    ctx.devices.forEach((d) => { ents.push({ id: d.id, type: "Device", name: d.name, status: d.status || "online", readiness: d.status === "online" ? 92 : 50 }); });
    Object.entries(ctx.bind || {}).forEach(([slot, ag]) => rels.push({ from: ag as string, to: ctx.devices.find((d) => d.name === slot)?.id || slot, kind: "Uses" }));
    ctx.agents.forEach((a) => { if (a.deviceId) rels.push({ from: a.id, to: a.deviceId, kind: "Uses" }); });
    // Telegram, Media, Publishing, Analytics, Revenue, Infra, Services, Workflows, AI Models
    const teleN = ctx.slots.length || (tgIdx?.sessions?.length ?? 3);
    ents.push({ id: "telegram", type: "Telegram", name: "Telegram Layer", status: "Connected", readiness: 88, meta: { sessions: teleN, dialogs: tgIdx?.dialogs?.length ?? 0, channels: tgIdx?.channels?.length ?? 0, groups: tgIdx?.groups?.length ?? 0 } });
    ents.push({ id: "media", type: "Media", name: "Media Network", status: "ACTIVE", readiness: 76 });
    ents.push({ id: "publishing", type: "Publishing", name: "Publishing", status: "ACTIVE", readiness: 71 });
    ents.push({ id: "analytics", type: "Analytics", name: "Analytics", status: "ACTIVE", readiness: 80 });
    ents.push({ id: "revenue", type: "Analytics", name: "Revenue", status: "GROWING", readiness: 64 });
    ents.push({ id: "infra", type: "Infrastructure", name: "Infrastructure / VPS", status: "Online", readiness: 96 });
    ["n8n", "comfyui", "tdlib", "geelark"].forEach((s) => { ents.push({ id: "svc:" + s, type: "Service", name: s.toUpperCase(), status: "running", readiness: 90 }); rels.push({ from: "infra", to: "svc:" + s, kind: "Owns" }); });
    ["wf:content", "wf:publish", "wf:provision"].forEach((w) => { ents.push({ id: w, type: "Workflow", name: w.split(":")[1], status: "ready", readiness: 78 }); rels.push({ from: "svc:n8n", to: w, kind: "Controls" }); });
    AI_MODELS.forEach((m) => ents.push({ id: "ai:" + m, type: "AI Model", name: m, status: "online", readiness: 90 }));
    // structural relationships
    ctx.agents.forEach((a) => { rels.push({ from: a.id, to: "telegram", kind: "Connected To" }); rels.push({ from: a.id, to: "media", kind: "Uses" }); rels.push({ from: a.id, to: "publishing", kind: "Publishes" }); rels.push({ from: a.id, to: "analytics", kind: "Related To" }); });
    rels.push({ from: "publishing", to: "analytics", kind: "Connected To" }); rels.push({ from: "analytics", to: "revenue", kind: "Related To" }); rels.push({ from: "media", to: "publishing", kind: "Publishes" });
    ctx.missions.forEach((m) => { rels.push({ from: m.id, to: "media", kind: "Uses" }); rels.push({ from: m.id, to: "publishing", kind: "Publishes" }); }); rels.push({ from: "wf:content", to: ctx.missions[0]?.id || "media", kind: "Controls" });
    const byId: Record<string, Ent> = {}; ents.forEach((e) => (byId[e.id] = e));
    return { ents, rels, byId };
  }, [ctx]);

  useEffect(() => { if (!sel && ctx.agents[0]) setSel(ctx.agents[0].id); if (!pathA && ctx.agents[0]) setPathA(ctx.agents[0].id); if (!pathB) setPathB("revenue"); }, [ctx, sel, pathA, pathB]);

  // readiness by domain
  const domains = useMemo(() => {
    const byType = (t: string) => ents.filter((e) => e.type === t);
    const avg = (a: Ent[]) => a.length ? Math.round(a.reduce((s, e) => s + e.readiness, 0) / a.length) : 0;
    return [
      ["Infrastructure", avg(byType("Infrastructure").concat(byType("Service")))],
      ["Devices", avg(byType("Device"))],
      ["Agents", avg(byType("Agent"))],
      ["Telegram", avg(byType("Telegram"))],
      ["Media Factory", avg([byId["media"]].filter(Boolean) as Ent[])],
      ["Publishing", avg([byId["publishing"]].filter(Boolean) as Ent[])],
      ["Automation", avg(byType("Workflow"))],
      ["AI Models", avg(byType("AI Model"))],
      ["Digital Twins", avg(byType("Twin"))],
      ["Missions", avg(byType("Mission"))],
    ] as [string, number][];
  }, [ents, byId]);
  const overall = Math.round(domains.reduce((s, [, v]) => s + v, 0) / domains.length);

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("epic_ecosystem_bus_v1", JSON.stringify({ ts, objects: ents.length, types: OBJ_TYPES }));
    localStorage.setItem("epic_relationship_engine_v1", JSON.stringify({ ts, relations: rels.length, kinds: REL_KINDS }));
    localStorage.setItem("epic_relationship_graph_v1", JSON.stringify({ ts, nodes: ents.length, edges: rels.length }));
    localStorage.setItem("epic_universal_inspector_v1", JSON.stringify({ ts, tabs: INS_TABS }));
    localStorage.setItem("epic_executive_dashboard_v1", JSON.stringify({ ts, overall, agents: ctx.agents.length, missions: ctx.missions.length }));
    localStorage.setItem("epic_readiness_officer_v1", JSON.stringify({ ts, overall, domains }));
    localStorage.setItem("epic_ecosystem_context_v1", JSON.stringify({ ts, selected: sel, mode }));
  } catch {} }, [ents, rels, domains, overall, sel, mode, ctx]);

  // ---- Smart path finder (BFS) ----
  const adj = useMemo(() => { const m: Record<string, string[]> = {}; rels.forEach((r) => { (m[r.from] ||= []).push(r.to); (m[r.to] ||= []).push(r.from); }); return m; }, [rels]);
  function bfs(a: string, b: string): string[] {
    if (!a || !b || !byId[a] || !byId[b]) return []; const q = [[a]]; const seen = new Set([a]);
    while (q.length) { const p = q.shift()!; const last = p[p.length - 1]; if (last === b) return p; for (const n of adj[last] || []) if (!seen.has(n)) { seen.add(n); q.push([...p, n]); } }
    return [];
  }
  const path = useMemo(() => bfs(pathA, pathB), [pathA, pathB, adj, byId]);

  const e = byId[sel];

  // ---- Universal Inspector ----
  function Inspector(ent?: Ent) {
    if (!ent) return <Card><div className="text-tg-muted">Выберите объект.</div></Card>;
    const myRels = rels.filter((r) => r.from === ent.id || r.to === ent.id);
    const deps = rels.filter((r) => r.to === ent.id && (r.kind === "Depends On" || r.kind === "Uses" || r.kind === "Controls"));
    if (itab === "Relations") return <Card t="Relations"><div className="space-y-1 text-[12px]">{myRels.length ? myRels.map((r, i) => { const other = r.from === ent.id ? r.to : r.from; const dir = r.from === ent.id ? "→" : "←"; return <div key={i} className="flex items-center gap-1.5"><span className="rounded bg-tg-bg px-1.5 py-0.5 text-[10px] text-tg-accent">{r.kind}</span><span className="text-tg-muted">{dir}</span><b>{byId[other]?.name || other}</b></div>; }) : <div className="text-tg-muted">Связей нет.</div>}</div></Card>;
    if (itab === "Status") return <Card t="Status"><div className="space-y-1 text-sm">{[["Current Status", ent.status], ["Health", ent.readiness >= 85 ? "Healthy" : ent.readiness >= 65 ? "Warning" : "Critical"], ["Warnings", ent.readiness < 85 && ent.readiness >= 65 ? 1 : 0], ["Errors", ent.readiness < 65 ? 1 : 0]].map(([l, v]) => <div key={l as string}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>;
    if (itab === "Readiness") return <Card t="Readiness"><div className="flex items-center gap-2"><span className="text-2xl">{rdDot(ent.readiness)}</span><div className="h-3 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: ent.readiness + "%", background: rdColor(ent.readiness) }} /></div><b style={{ color: rdColor(ent.readiness) }}>{ent.readiness}%</b></div></Card>;
    if (itab === "Timeline") return <Card t="Timeline"><div className="space-y-0.5 text-[12px]">{(ent.meta?.activity || [{ t: "created", action: "object registered" }, { t: "updated", action: "status " + ent.status }]).slice().reverse().slice(0, 8).map((x: any, i: number) => <div key={i}><b className="text-tg-text">{x.t}</b> <span className="text-tg-muted">{x.action}</span></div>)}</div></Card>;
    if (itab === "Analytics") return <Card t="Analytics"><div className="space-y-1.5">{([["Reach", 60], ["Engagement", 48], ["Activity", ent.readiness], ["Growth", 40]] as const).map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-24 text-tg-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: v + "%" }} /></div><span className="w-8 text-right">{v}</span></div>)}</div></Card>;
    if (itab === "Dependencies") return <Card t="Dependencies"><div className="space-y-1 text-[12px]">{deps.length ? deps.map((r, i) => <div key={i}>← <b>{byId[r.from]?.name || r.from}</b> <span className="text-tg-muted">({r.kind})</span></div>) : <div className="text-tg-muted">Зависимостей нет.</div>}</div></Card>;
    if (itab === "History") return <Card t="History"><div className="space-y-0.5 text-[12px]">{(ent.meta?.activity || []).slice().reverse().map((x: any, i: number) => <div key={i}><b>{x.t}</b> <span className="text-tg-muted">{x.action}{x.result ? " · " + x.result : ""}</span></div>)}{!(ent.meta?.activity || []).length && <div className="text-tg-muted">Журнал пуст.</div>}</div></Card>;
    if (itab === "Actions") return <Card t="Actions"><div className="flex flex-col gap-1.5">{(ent.type === "Agent" ? ["Open Workspace", "Focus Relations", "Show Path → Revenue"] : ["Focus Relations", "Show Path", "Inspect Dependencies"]).map((act) => <button key={act} onClick={() => { if (act === "Open Workspace" && ent.type === "Agent") onOpenAgent?.(ent.id); else if (act.startsWith("Focus")) setMode("rel"); else if (act.startsWith("Show Path")) { setMode("rel"); setPathA(ent.id); setPathB("revenue"); } }} className="rounded-lg bg-tg-bg px-3 py-1.5 text-left text-[12px] hover:bg-tg-active hover:text-white">{act}</button>)}<div className="mt-1 text-[10px] text-tg-muted">Только разрешённые действия · без публикаций/внешних API.</div></div></Card>;
    if (itab === "Notes") return <Card t="Notes"><textarea defaultValue={readLS("epic_ecosystem_notes_" + ent.id)?.note || ""} onBlur={(ev) => { try { localStorage.setItem("epic_ecosystem_notes_" + ent.id, JSON.stringify({ note: ev.target.value })); } catch {} }} placeholder="Заметки и комментарии…" className="h-28 w-full resize-none rounded-lg border border-tg-line bg-tg-bg/50 p-2 text-[12px] outline-none" /></Card>;
    // Overview
    return <div className="space-y-2"><div className="flex items-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: av(ent.name) }}>{ini(ent.name)}</div><div><div className="font-bold">{ent.name}</div><div className="text-[11px] text-tg-muted">{ent.type} · {ent.status}</div></div></div><div className="grid gap-2 sm:grid-cols-2"><Stat l="Type" v={ent.type} /><Stat l="Status" v={ent.status} /><Stat l="Readiness" v={ent.readiness + "%"} c={rdColor(ent.readiness)} /><Stat l="Relations" v={myRels.length} /></div>{ent.type === "Agent" && <button onClick={() => onOpenAgent?.(ent.id)} className="rounded-lg bg-tg-active px-3 py-1.5 text-[12px] font-semibold text-white">Open Workspace →</button>}</div>;
  }

  // ---- Relationship Graph ----
  function Graph() {
    const filtered = objFilter === "All" ? ents : ents.filter((x) => x.type === objFilter);
    const pos: Record<string, { x: number; y: number }> = {}; const cx = 480, cy = 320;
    const groups: Record<string, Ent[]> = {}; filtered.forEach((e) => (groups[e.type] ||= []).push(e));
    const types = Object.keys(groups); types.forEach((tp, ti) => { const ang = (ti / types.length) * Math.PI * 2; const gx = cx + Math.cos(ang) * 300, gy = cy + Math.sin(ang) * 210; groups[tp].forEach((e, i) => { const a2 = (i / Math.max(1, groups[tp].length)) * Math.PI * 2; pos[e.id] = { x: gx + Math.cos(a2) * 46, y: gy + Math.sin(a2) * 46 }; }); });
    const pathSet = new Set(path);
    return <div className="relative h-full overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 960 640" onWheel={(ev) => { ev.preventDefault(); setView((v) => ({ ...v, k: Math.min(2.5, Math.max(0.4, v.k - ev.deltaY * 0.001)) })); }}>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {rels.filter((r) => pos[r.from] && pos[r.to]).map((r, i) => { const onPath = pathSet.has(r.from) && pathSet.has(r.to) && Math.abs(path.indexOf(r.from) - path.indexOf(r.to)) === 1; return <line key={i} x1={pos[r.from].x} y1={pos[r.from].y} x2={pos[r.to].x} y2={pos[r.to].y} stroke={onPath ? "#fbbf24" : "rgba(120,140,170,.18)"} strokeWidth={onPath ? 2.4 : 0.8} />; })}
          {filtered.map((e) => { const p = pos[e.id]; if (!p) return null; const onPath = pathSet.has(e.id); return <g key={e.id} onClick={() => { setSel(e.id); }} style={{ cursor: "pointer" }}><circle cx={p.x} cy={p.y} r={e.id === sel ? 15 : 10} fill={av(e.name)} stroke={onPath ? "#fbbf24" : e.id === sel ? "#fff" : "none"} strokeWidth={onPath ? 3 : 2} opacity={0.92} /><text x={p.x} y={p.y - 16} fill="#cbd5e1" fontSize="9" textAnchor="middle">{e.name.slice(0, 14)}</text></g>; })}
        </g>
      </svg>
      <svg width="160" height="110" viewBox="0 0 960 640" className="absolute bottom-3 right-3 rounded-lg border border-tg-line bg-tg-bg/80">{filtered.map((e) => pos[e.id] ? <circle key={e.id} cx={pos[e.id].x} cy={pos[e.id].y} r={6} fill={av(e.name)} /> : null)}</svg>
    </div>;
  }

  // ---- Executive Dashboard ----
  function Exec() {
    const ag = ctx.agents; const dev = ctx.devices; const tg = byId["telegram"]?.meta || {};
    const fin = readLS("epic_finance_v1") || {}; const rm = readLS("epic_runtime_metrics_v1") || {};
    const health: [string, number][] = [["System Readiness", overall], ["Infrastructure", byId["infra"]?.readiness ?? 96], ["AI Health", 90], ["Mission Health", domains.find((d) => d[0] === "Missions")?.[1] ?? 60], ["Publishing", byId["publishing"]?.readiness ?? 71], ["Revenue", byId["revenue"]?.readiness ?? 64]];
    return <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">{health.map(([l, v]) => <div key={l} className="rounded-2xl border border-tg-line bg-tg-panel/60 p-3"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="mt-1 text-2xl font-black" style={{ color: rdColor(v) }}>{v}%</div><div className="mt-1 h-1.5 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: rdColor(v) }} /></div></div>)}</div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card t="Agents"><div className="grid grid-cols-4 gap-1.5"><Stat l="Total" v={ag.length} /><Stat l="Active" v={ag.filter((a) => a.state === "ACTIVE").length} c="#4ade80" /><Stat l="Paused" v={ag.filter((a) => a.state === "IDLE" || a.state === "PAUSED").length} c="#fbbf24" /><Stat l="Offline" v={ag.filter((a) => a.state === "OFFLINE").length} c="#f87171" /></div></Card>
        <Card t="Twins"><div className="grid grid-cols-3 gap-1.5"><Stat l="Total" v={ag.length} /><Stat l="Ready" v={ents.filter((x) => x.type === "Twin" && x.status === "READY").length} c="#4ade80" /><Stat l="Incomplete" v={ents.filter((x) => x.type === "Twin" && x.status !== "READY").length} c="#fbbf24" /></div></Card>
        <Card t="Missions"><div className="grid grid-cols-4 gap-1.5"><Stat l="Running" v={ctx.missions.filter((m) => ["ACTIVE", "RUNNING"].includes(m.status)).length} c="#4ade80" /><Stat l="Completed" v={ctx.missions.filter((m) => ["COMPLETED", "DONE"].includes(m.status)).length} /><Stat l="Failed" v={ctx.missions.filter((m) => ["FAILED", "BLOCKED"].includes(m.status)).length} c="#f87171" /><Stat l="Review" v={ctx.missions.filter((m) => m.status === "WAITING_APPROVAL").length} c="#fbbf24" /></div></Card>
        <Card t="Devices"><div className="grid grid-cols-4 gap-1.5"><Stat l="Online" v={dev.filter((d) => (d.status || "online") === "online").length} c="#4ade80" /><Stat l="Offline" v={dev.filter((d) => d.status === "offline").length} c="#f87171" /><Stat l="Provisioning" v={dev.filter((d) => d.status === "provisioning").length} c="#fbbf24" /><Stat l="Warnings" v={0} /></div></Card>
        <Card t="Telegram"><div className="grid grid-cols-5 gap-1.5"><Stat l="Sess" v={tg.sessions ?? ctx.slots.length} /><Stat l="Dlg" v={tg.dialogs ?? 0} /><Stat l="Ch" v={tg.channels ?? 0} /><Stat l="Grp" v={tg.groups ?? 0} /><Stat l="Bots" v={2} /></div></Card>
        <Card t="Media"><div className="grid grid-cols-4 gap-1.5"><Stat l="Projects" v={8} /><Stat l="Assets" v={42} /><Stat l="Render Q" v={3} /><Stat l="Publish Q" v={5} /></div></Card>
        <Card t="AI Services"><div className="flex flex-wrap gap-1">{AI_MODELS.map((m) => <span key={m} className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] text-emerald-300">🟢 {m}</span>)}</div></Card>
        <Card t="Finance"><div className="grid grid-cols-2 gap-1.5 text-[12px]">{[["Monthly Cost", "$" + (fin.monthlyCost ?? 420)], ["Infrastructure", "$" + (fin.infra ?? 180)], ["AI Services", "$" + (fin.ai ?? 120)], ["Devices", "$" + (fin.devices ?? 60)], ["Revenue", "$" + (fin.revenue ?? 540)], ["Balance", "$" + (fin.balance ?? 120)]].map(([l, v]) => <div key={l} className="rounded bg-tg-bg/40 px-2 py-1"><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>
        <Card t="Risks"><div className="space-y-1 text-[12px]"><div><span className="text-red-400">🔴 Critical:</span> {domains.filter((d) => d[1] < 65).length} ({domains.filter((d) => d[1] < 65).map((d) => d[0]).join(", ") || "—"})</div><div><span className="text-amber-400">🟡 Warning:</span> {domains.filter((d) => d[1] >= 65 && d[1] < 85).length}</div><div><span className="text-sky-400">ℹ️ Info:</span> рост Digital Twins ускорит публикации.</div></div></Card>
        {(() => { const rb = readLS("reality_bridge"); const ir = readLS("identity_registry"); if (!rb) return null; return <Card t="🪪 Identity / Reality"><div className="grid grid-cols-2 gap-1.5 text-[11px]">{[["Entities", (ir?.entities || []).length || 6], ["Reality Score", (rb.realityAvg ?? "—") + "%"], ["Live Assets", rb.liveAssets ?? "—"], ["Connected Assets", rb.connAssets ?? "—"], ["Accounts", 6 * 12]].map(([l, v]) => <div key={l} className="rounded bg-tg-bg/40 px-2 py-1"><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>; })()}
        {(() => { const wr = readLS("war_room"); if (!wr) return null; return <Card t="🖥 Launch / Ops"><div className="grid grid-cols-2 gap-1.5 text-[11px]">{[["Launch Readiness", (wr.overall ?? "—") + "%"], ["Go / No-Go", wr.goNoGo || "—"], ["Open Incidents", wr.openIncidents ?? "—"], ["Critical Risks", wr.criticalRisks ?? "—"], ["System Health", wr.overall >= 75 ? "Healthy" : "Warning"]].map(([l, v]) => <div key={l} className="rounded bg-tg-bg/40 px-2 py-1"><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>; })()}
        {(() => { const ah = readLS("automation_health"); if (!ah) return null; return <Card t="⚡ Automation"><div className="grid grid-cols-2 gap-1.5 text-[11px]">{[["Automation Health", ah.health || "—"], ["Running Workflows", ah.running ?? "—"], ["Queued Tasks", ah.queued ?? "—"], ["Failed Tasks", ah.failed ?? "—"], ["Success Rate", (ah.successRate ?? "—") + "%"], ["Top Workflow", ah.topWorkflow || "—"]].map(([l, v]) => <div key={l} className="rounded bg-tg-bg/40 px-2 py-1"><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>; })()}
        {(() => { const ee = readLS("economy_engine_v1"); const ar = readLS("asset_ranking_v1"); const mr = readLS("music_revenue_v1"); const sp = readLS("sponsor_marketplace_v1"); if (!ee) return null; return <Card t="💰 Economy"><div className="grid grid-cols-2 gap-1.5 text-[11px]">{[["Total Revenue (yr)", ee.totalRevenue ? "$" + (ee.totalRevenue * 12).toLocaleString() : "—"], ["Monthly Revenue", ee.totalRevenue ? "$" + ee.totalRevenue.toLocaleString() : "—"], ["Top Asset", ee.topAsset || "—"], ["Top Platform", "YouTube/Sponsors"], ["Top Sponsor", (sp?.sponsors || []).slice().sort((a: any, b: any) => b.revenue - a.revenue)[0]?.sponsor || "—"], ["Top Content", "EVA — Night Intro"], ["Top Artist", (mr?.tracks || []).slice().sort((a: any, b: any) => b.royalties - a.royalties)[0]?.artist || "—"]].map(([l, v]) => <div key={l} className="rounded bg-tg-bg/40 px-2 py-1"><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card>; })()}
      </div>
    </div>;
  }

  return (
    <div className="fixed inset-0 z-[66] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🧬 ECOSYSTEM BUS</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · CORE SYSTEM</span>
        <div className="ml-2 flex overflow-hidden rounded-lg ring-1 ring-tg-line">{([["exec", "👑 Executive"], ["bus", "🧬 Bus + Inspector"], ["rel", "🔗 Relationships"], ["readiness", "🧠 Readiness Officer"]] as const).map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`px-3 py-1.5 text-xs font-semibold ${mode === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{label}</button>)}</div>
        <div className="ml-auto text-[11px] text-tg-muted">{ents.length} объектов · {rels.length} связей · readiness {overall}%</div>
      </header>

      {mode === "exec" && <main className="min-h-0 flex-1 overflow-auto p-4"><Exec /></main>}

      {mode === "bus" && <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr_320px]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Object Types</div>{["All", ...OBJ_TYPES].map((tp) => { const n = tp === "All" ? ents.length : ents.filter((x) => x.type === tp).length; if (tp !== "All" && !n) return null; return <button key={tp} onClick={() => setObjFilter(tp)} className={`mb-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] ${objFilter === tp ? "bg-tg-active text-white" : "hover:bg-tg-hover/40"}`}><span>{tp}</span><span className="text-[10px] text-tg-muted">{n}</span></button>; })}</nav>
        <main className="min-h-0 overflow-auto p-3"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Unified Context · {objFilter}</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(objFilter === "All" ? ents : ents.filter((x) => x.type === objFilter)).map((en) => <button key={en.id} onClick={() => setSel(en.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left ${sel === en.id ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><div className="flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: av(en.name) }}>{ini(en.name)}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{en.name}</div><div className="text-[10px] text-tg-muted">{en.type} · {rdDot(en.readiness)} {en.readiness}%</div></div></button>)}</div></main>
        <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Universal Inspector</div><div className="mb-2 flex flex-wrap gap-1">{INS_TABS.map((t) => <button key={t} onClick={() => setItab(t)} className={`rounded-full px-2 py-0.5 text-[10px] ${itab === t ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{t}</button>)}</div>{Inspector(e)}</aside>
      </div>}

      {mode === "rel" && <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]">
        <div className="relative min-h-0">
          <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5 rounded-xl border border-tg-line bg-tg-panel/90 p-2 text-[11px]">
            <span className="text-tg-muted">Path:</span>
            <select value={pathA} onChange={(ev) => setPathA(ev.target.value)} className="max-w-[120px] rounded bg-tg-bg px-1.5 py-1">{ents.map((x) => <option key={x.id} value={x.id}>{x.name.slice(0, 16)}</option>)}</select>
            <span>→</span>
            <select value={pathB} onChange={(ev) => setPathB(ev.target.value)} className="max-w-[120px] rounded bg-tg-bg px-1.5 py-1">{ents.map((x) => <option key={x.id} value={x.id}>{x.name.slice(0, 16)}</option>)}</select>
            <span className="ml-1 text-amber-300">{path.length ? path.map((p) => byId[p]?.name.split(" ")[0]).join(" → ") : "нет пути"}</span>
          </div>
          <div className="absolute right-3 top-3 z-10 rounded-lg border border-tg-line bg-tg-panel/90 px-2 py-1 text-[10px] text-tg-muted">Ecosystem View · фильтр: {objFilter} · {REL_KINDS.length} типов связей</div>
          <Graph />
        </div>
        <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Inspector</div><div className="mb-2 flex flex-wrap gap-1">{INS_TABS.map((t) => <button key={t} onClick={() => setItab(t)} className={`rounded-full px-2 py-0.5 text-[10px] ${itab === t ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{t}</button>)}</div>{Inspector(e)}</aside>
      </div>}

      {mode === "readiness" && <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Card t="🧠 Readiness AI Officer · Ecosystem Scan"><div className="mb-3 flex items-center gap-3"><div className="text-4xl font-black" style={{ color: rdColor(overall) }}>{overall}%</div><div className="text-sm text-tg-muted">Общая готовность экосистемы</div></div><div className="space-y-2">{domains.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[13px]"><span className="w-32">{rdDot(v)} {l}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: rdColor(v) }} /></div><b className="w-10 text-right" style={{ color: rdColor(v) }}>{v}%</b></div>)}</div></Card>
        <Card t="Рекомендации"><div className="space-y-2 text-[12px]">
          <div className="rounded-lg bg-red-500/10 p-2"><b className="text-red-300">Что блокирует рост:</b> {domains.filter((d) => d[1] < 65).map((d) => d[0]).join(", ") || "ничего критичного"}.</div>
          <div className="rounded-lg bg-amber-500/10 p-2"><b className="text-amber-300">Что требует внимания:</b> {domains.filter((d) => d[1] >= 65 && d[1] < 85).map((d) => d[0]).join(", ") || "—"}.</div>
          <div className="rounded-lg bg-emerald-500/10 p-2"><b className="text-emerald-300">Готово:</b> {domains.filter((d) => d[1] >= 85).map((d) => d[0]).join(", ") || "—"}.</div>
          <div className="rounded-lg bg-sky-500/10 p-2"><b className="text-sky-300">Что улучшить:</b> завершить Digital Twins (Appearance/Voice) → ускорит Publishing и Revenue.</div>
          <div className="rounded-lg bg-tg-bg/40 p-2"><b>Что отсутствует:</b> часть аккаунтов без привязки устройства; render-очередь не разгружена.</div>
        </div></Card>
      </div></main>}
    </div>
  );
}
