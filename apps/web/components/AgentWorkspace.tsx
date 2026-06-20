"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Ctx = {
  agents: any[];
  missions: any[];
  exec: any[];
  devices: any[];
  slots: any[];
  bind: Record<string, string>;
  counts: Record<string, { d: number; c: number; g: number; u: number }>;
  activeId: string;
};

const LS_WS = "epic_agent_workspace_v2";
const LS_CV = "epic_canvas_v2";
const NODE_CLR: Record<string, string> = {
  agent: "#ff2d6b", brain: "#b14dff", memory: "#8b5cf6", knowledge: "#0ea5e9",
  goal: "#f59e0b", mission: "#22c55e", task: "#38bdf8", execution: "#14b8a6",
  approval: "#eab308", session: "#e879f9", channel: "#60a5fa", group: "#34d399",
  device: "#06b6d4", model: "#a78bfa", integration: "#f472b6"
};
const TABS = ["Overview", "Workflow", "Brain", "Memory", "Knowledge", "Missions", "Tasks", "Execution", "Telegram", "Devices", "Timeline", "Analytics"] as const;
const FOLDERS = ["Chats", "Channels", "Groups", "Archive", "Contacts", "Saved Messages", "Sessions", "Devices", "Files", "Settings", "Folders"];

export function AgentWorkspace({ agentId, ctx, onClose, onOpenTelegram }: { agentId: string; ctx: Ctx; onClose: () => void; onOpenTelegram?: (slotId?: string) => void }) {
  const agent = ctx.agents.find((a) => a.id === agentId) || ctx.agents[0];
  const [tab, setTab] = useState<string>("Workflow");
  const [selNode, setSelNode] = useState<string>("agent");
  const [view, setView] = useState({ tx: 0, ty: 0, scale: 1 });
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [loaded, setLoaded] = useState(false);
  const dragRef = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number }>({ mode: null, sx: 0, sy: 0, ox: 0, oy: 0 });

  // bound session / device
  const boundSessionId = useMemo(() => Object.entries(ctx.bind).find(([, aid]) => aid === agentId)?.[0], [ctx.bind, agentId]);
  const session = ctx.slots.find((s) => (s.slotId || "") === boundSessionId);
  const device = ctx.devices.find((d) => d.id === agent?.deviceId);
  const cnt = boundSessionId && ctx.counts[boundSessionId] ? ctx.counts[boundSessionId] : (agent?.deviceId && ctx.counts[ctx.activeId]) ? ctx.counts[ctx.activeId] : null;
  const myMissions = ctx.missions.filter((m) => m.agentId === agentId);
  const myExec = ctx.exec.filter((e) => e.agentId === agentId);

  // build nodes
  const nodes = useMemo(() => {
    const list: { id: string; type: string; label: string; sub?: string }[] = [
      { id: "agent", type: "agent", label: agent?.name || "Agent", sub: agent?.role },
      { id: "brain", type: "brain", label: "Brain", sub: agent?.memory ? "memory ON" : "off" },
      { id: "memory", type: "memory", label: "Memory", sub: ((agent?.shortMem?.length || 0) + (agent?.longMem?.length || 0)) + " items" },
      { id: "knowledge", type: "knowledge", label: "Knowledge", sub: (agent?.knowledge?.length || 0) + " facts" },
      { id: "goal", type: "goal", label: "Goal", sub: (agent?.currentGoal || "—").slice(0, 18) },
      { id: "model", type: "model", label: "Model", sub: agent?.model || "—" },
      { id: "session", type: "session", label: "Session", sub: session ? (session.displayName || boundSessionId) : "—" },
      { id: "device", type: "device", label: "Device", sub: device ? device.name : "—" }
    ];
    myMissions.slice(0, 3).forEach((m, i) => list.push({ id: "mission_" + m.id, type: "mission", label: "Mission", sub: m.title.slice(0, 16) }));
    myExec.slice(0, 3).forEach((e) => list.push({ id: "task_" + e.id, type: "task", label: "Task", sub: e.title.slice(0, 16) }));
    if (cnt) {
      list.push({ id: "channels", type: "channel", label: "Channels", sub: String(cnt.c) });
      list.push({ id: "groups", type: "group", label: "Groups", sub: String(cnt.g) });
    }
    (agent?.integrations || []).slice(0, 2).forEach((g: string, i: number) => list.push({ id: "int_" + i, type: "integration", label: "Integration", sub: g }));
    return list;
  }, [agent, session, device, cnt, myMissions, myExec, boundSessionId]);

  const edges = useMemo(() => {
    const e: [string, string][] = [
      ["agent", "brain"], ["brain", "memory"], ["brain", "knowledge"], ["agent", "goal"], ["agent", "model"], ["agent", "session"], ["session", "device"]
    ];
    myMissions.slice(0, 3).forEach((m) => { e.push(["goal", "mission_" + m.id]); });
    myExec.slice(0, 3).forEach((x) => { if (x.missionId && nodes.find((n) => n.id === "mission_" + x.missionId)) e.push(["mission_" + x.missionId, "task_" + x.id]); else e.push(["agent", "task_" + x.id]); });
    if (cnt) { e.push(["session", "channels"]); e.push(["session", "groups"]); }
    (agent?.integrations || []).slice(0, 2).forEach((_: string, i: number) => e.push(["agent", "int_" + i]));
    return e;
  }, [nodes, myMissions, myExec, cnt, agent]);

  // default radial layout
  const defaultPos = useMemo(() => {
    const p: Record<string, { x: number; y: number }> = { agent: { x: 460, y: 320 } };
    const ring = nodes.filter((n) => n.id !== "agent");
    ring.forEach((n, i) => {
      const ang = (i / ring.length) * Math.PI * 2;
      p[n.id] = { x: 460 + Math.cos(ang) * 240, y: 320 + Math.sin(ang) * 200 };
    });
    return p;
  }, [nodes]);

  useEffect(() => {
    try {
      const cv = JSON.parse(localStorage.getItem(LS_CV) || "{}")[agentId];
      if (cv) { if (cv.pos) setPos(cv.pos); if (cv.view) setView(cv.view); }
      const ws = JSON.parse(localStorage.getItem(LS_WS) || "{}")[agentId];
      if (ws) { if (ws.tab) setTab(ws.tab); if (ws.selNode) setSelNode(ws.selNode); }
    } catch {}
    setLoaded(true);
  }, [agentId]);
  useEffect(() => {
    if (!loaded) return;
    try { const all = JSON.parse(localStorage.getItem(LS_CV) || "{}"); all[agentId] = { pos, view }; localStorage.setItem(LS_CV, JSON.stringify(all)); } catch {}
  }, [pos, view, loaded, agentId]);
  useEffect(() => {
    if (!loaded) return;
    try { const all = JSON.parse(localStorage.getItem(LS_WS) || "{}"); all[agentId] = { tab, selNode }; localStorage.setItem(LS_WS, JSON.stringify(all)); } catch {}
  }, [tab, selNode, loaded, agentId]);

  const P = (id: string) => pos[id] || defaultPos[id] || { x: 460, y: 320 };

  function onDown(e: React.MouseEvent, id?: string) {
    const d = dragRef.current;
    d.sx = e.clientX; d.sy = e.clientY;
    if (id) { d.mode = "node"; d.id = id; const p = P(id); d.ox = p.x; d.oy = p.y; setSelNode(id); }
    else { d.mode = "pan"; d.ox = view.tx; d.oy = view.ty; }
    e.stopPropagation();
  }
  useEffect(() => {
    function move(e: MouseEvent) {
      const d = dragRef.current; if (!d.mode) return;
      const dx = (e.clientX - d.sx) / (d.mode === "node" ? view.scale : 1);
      const dy = (e.clientY - d.sy) / (d.mode === "node" ? view.scale : 1);
      if (d.mode === "node" && d.id) setPos((p) => ({ ...p, [d.id as string]: { x: d.ox + dx, y: d.oy + dy } }));
      else if (d.mode === "pan") setView((v) => ({ ...v, tx: d.ox + (e.clientX - d.sx), ty: d.oy + (e.clientY - d.sy) }));
    }
    function up() { dragRef.current.mode = null; }
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [view.scale]);
  function zoom(delta: number) { setView((v) => ({ ...v, scale: Math.max(0.4, Math.min(2.2, +(v.scale + delta).toFixed(2))) })); }

  const sn = nodes.find((n) => n.id === selNode);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070509] text-tg-text">
      <header className="flex items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white" style={{ background: NODE_CLR.agent }}>{(agent?.name || "?")[0]}</span>
          <div className="font-black tracking-wide">{agent?.name} · WORKSPACE</div>
        </div>
        <div className="ml-auto flex max-w-[60%] gap-1 overflow-x-auto">
          {TABS.map((t) => (<button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-3 py-1 text-xs ${tab === t ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{t}</button>))}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr_300px]">
        {/* LEFT: EPIC GRAM CLIENT (display only) */}
        <aside className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">EPIC GRAM CLIENT</div>
          <div className="mt-1 text-xs text-tg-muted">{session ? (session.displayName || boundSessionId) : "сессия не привязана"}</div>
          <div className="mt-3 space-y-1">
            {FOLDERS.map((f) => {
              const badge = f === "Channels" ? cnt?.c : f === "Groups" ? cnt?.g : f === "Chats" ? cnt?.d : f === "Devices" ? 1 : f === "Sessions" ? (boundSessionId ? 1 : 0) : undefined;
              return (
                <div key={f} className="flex items-center gap-2 rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs">
                  <span className="flex-1">{f}</span>
                  {badge !== undefined && <span className="rounded-full bg-black/30 px-1.5 text-[10px] text-tg-muted">{badge ?? 0}</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[10px] text-tg-muted">Только отображение существующих данных Telegram Registry (Runtime не меняется).</div>
        </aside>

        {/* CENTER: Tab content (Workflow = canvas) */}
        <main className="relative min-h-0 overflow-hidden bg-[#0a0712]">
          {tab === "Workflow" ? (
            <>
              <div className="absolute left-3 top-3 z-10 flex gap-1">
                <button onClick={() => zoom(0.2)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg leading-none ring-1 ring-tg-line">+</button>
                <button onClick={() => zoom(-0.2)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg leading-none ring-1 ring-tg-line">−</button>
                <button onClick={() => { setView({ tx: 0, ty: 0, scale: 1 }); setPos({}); }} className="rounded-lg bg-tg-panel px-2 text-xs ring-1 ring-tg-line">reset</button>
              </div>
              <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={(e) => onDown(e)} style={{ backgroundImage: "linear-gradient(rgba(177,77,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(177,77,255,.06) 1px,transparent 1px)", backgroundSize: "28px 28px" }}>
                <div style={{ transform: `translate(${view.tx}px,${view.ty}px) scale(${view.scale})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
                  <svg className="pointer-events-none absolute" style={{ overflow: "visible", left: 0, top: 0 }} width="1" height="1">
                    {edges.map(([a, b], i) => { const pa = P(a), pb = P(b); return <line key={i} x1={pa.x + 45} y1={pa.y + 22} x2={pb.x + 45} y2={pb.y + 22} stroke="rgba(255,45,107,.35)" strokeWidth={1.5} />; })}
                  </svg>
                  {nodes.map((n) => { const p = P(n.id); return (
                    <div key={n.id} onMouseDown={(e) => onDown(e, n.id)} className={`absolute w-[92px] cursor-grab rounded-xl border bg-tg-panel px-2 py-1.5 text-center text-[10px] active:cursor-grabbing ${selNode === n.id ? "ring-2 ring-white" : ""}`} style={{ left: p.x, top: p.y, borderColor: NODE_CLR[n.type] }}>
                      <div className="truncate font-bold" style={{ color: NODE_CLR[n.type] }}>{n.label}</div>
                      <div className="truncate text-tg-muted">{n.sub}</div>
                    </div>
                  ); })}
                </div>
              </div>
              {/* MiniMap */}
              <div className="absolute bottom-3 right-3 h-28 w-40 overflow-hidden rounded-lg border border-tg-line bg-tg-panel/90">
                <svg width="160" height="112" viewBox="0 0 920 640">
                  {edges.map(([a, b], i) => { const pa = P(a), pb = P(b); return <line key={i} x1={pa.x + 45} y1={pa.y + 22} x2={pb.x + 45} y2={pb.y + 22} stroke="rgba(255,45,107,.3)" strokeWidth={3} />; })}
                  {nodes.map((n) => { const p = P(n.id); return <circle key={n.id} cx={p.x + 45} cy={p.y + 22} r={10} fill={NODE_CLR[n.type]} />; })}
                </svg>
              </div>
            </>
          ) : (
            <div className="min-h-0 overflow-auto p-4">
              <TabContent tab={tab} agent={agent} session={session} device={device} cnt={cnt} myMissions={myMissions} myExec={myExec} boundSessionId={boundSessionId} onOpenTelegram={onOpenTelegram} />
            </div>
          )}
        </main>

        {/* RIGHT: Global Node Inspector */}
        <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Node Inspector</div>
          {sn ? (
            <div className="mt-2">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: NODE_CLR[sn.type] }} /><div className="font-bold">{sn.label}</div></div>
              <div className="mt-1 text-xs text-tg-muted">{sn.sub}</div>
              {sn.id === "agent" && (<div className="mt-2 space-y-1 text-xs text-tg-muted">
                <div>Role: <b className="text-tg-text">{agent?.role}</b></div>
                <div>State: <b className="text-tg-text">{agent?.state}</b></div>
                <div>Readiness: <b className="text-tg-text">{agent?.readiness}%</b></div>
                <div>Current Goal: <b className="text-tg-text">{agent?.currentGoal || "—"}</b></div>
                <div>Current Task: <b className="text-tg-text">{agent?.currentTask || "—"}</b></div>
                <div>Telegram: <b className="text-tg-text">{session ? (session.displayName || boundSessionId) : "—"}</b></div>
                <div>Device: <b className="text-tg-text">{device ? device.name : "—"}</b></div>
              </div>)}
              {sn.type === "memory" && (<div className="mt-2 space-y-1 text-xs">{[...(agent?.shortMem || []), ...(agent?.longMem || [])].map((m: string, i: number) => <div key={i} className="rounded bg-tg-bg px-2 py-1 text-tg-text">• {m}</div>)}</div>)}
              {sn.type === "knowledge" && (<div className="mt-2 space-y-1 text-xs">{(agent?.knowledge || []).map((m: string, i: number) => <div key={i} className="rounded bg-tg-bg px-2 py-1 text-tg-text">✓ {m}</div>)}</div>)}
              <div className="mt-3 text-[10px] uppercase tracking-wide text-tg-accent">Relations</div>
              <div className="mt-1 text-[11px] text-tg-muted">{edges.filter(([a, b]) => a === sn.id || b === sn.id).map(([a, b], i) => <span key={i} className="mr-1 inline-block rounded bg-tg-bg px-1.5 py-0.5">{a === sn.id ? b : a}</span>)}</div>
              <div className="mt-3 text-[10px] uppercase tracking-wide text-tg-accent">Activity</div>
              <div className="mt-1 space-y-1 text-[11px] text-tg-muted">{(agent?.activity || []).slice(-4).reverse().map((a: any, i: number) => <div key={i}><b className="text-tg-text">{a.t}</b> {a.action}</div>)}</div>
            </div>
          ) : <div className="mt-2 text-tg-muted">Выбери узел на полотне.</div>}
        </aside>
      </div>
    </div>
  );
}

function TabContent({ tab, agent, session, device, cnt, myMissions, myExec, boundSessionId, onOpenTelegram }: any) {
  const card = "rounded-xl border border-tg-line bg-tg-panel p-3 text-sm";
  const sec = "mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent";
  if (tab === "Overview") return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className={card}><div className={sec}>Identity</div>Name: <b>{agent?.name}</b><br />Role: {agent?.role}<br />State: {agent?.state}<br />Readiness: {agent?.readiness}%</div>
      <div className={card}><div className={sec}>Runtime</div>Goal: {agent?.currentGoal || "—"}<br />Task: {agent?.currentTask || "—"}<br />Telegram: {session ? (session.displayName || boundSessionId) : "—"}<br />Device: {device ? device.name : "—"}</div>
      <div className={card}><div className={sec}>Health</div>Dialogs: {cnt ? cnt.d : "—"} · Channels: {cnt ? cnt.c : "—"} · Groups: {cnt ? cnt.g : "—"}<br />Missions: {myMissions.length} · Tasks: {myExec.length}</div>
      <div className={card}><div className={sec}>Model · Voice · Memory</div>{agent?.model || "—"} · {agent?.voice || "—"} · {agent?.memory ? "ENABLED" : "OFF"}</div>
    </div>
  );
  if (tab === "Brain" || tab === "Memory") return (<div className={card}><div className={sec}>Memory</div><div className="text-xs text-tg-muted">Short:</div>{(agent?.shortMem || []).map((m: string, i: number) => <div key={i} className="rounded bg-tg-bg px-2 py-1 text-xs my-1">• {m}</div>)}<div className="mt-2 text-xs text-tg-muted">Long:</div>{(agent?.longMem || []).map((m: string, i: number) => <div key={i} className="rounded bg-tg-bg px-2 py-1 text-xs my-1">• {m}</div>)}</div>);
  if (tab === "Knowledge") return (<div className={card}><div className={sec}>Knowledge</div>{(agent?.knowledge || []).map((m: string, i: number) => <div key={i} className="rounded bg-tg-bg px-2 py-1 text-xs my-1">✓ {m}</div>)}</div>);
  if (tab === "Missions") return (<div className="space-y-2">{myMissions.length ? myMissions.map((m: any) => <div key={m.id} className={card}><b>{m.title}</b> · <span className="text-tg-muted">{m.status} · {m.priority}</span></div>) : <div className="text-tg-muted text-sm">Нет миссий.</div>}</div>);
  if (tab === "Tasks" || tab === "Execution") return (<div className="space-y-2">{myExec.length ? myExec.map((e: any) => <div key={e.id} className={card}><b>{e.title}</b> · <span className="text-tg-muted">{e.status} · {e.priority}</span></div>) : <div className="text-tg-muted text-sm">Нет задач.</div>}</div>);
  if (tab === "Telegram") return (<div className={card}><div className={sec}>Telegram</div>Session: <b>{session ? (session.displayName || boundSessionId) : "—"}</b><br />Dialogs: {cnt ? cnt.d : "—"} · Channels: {cnt ? cnt.c : "—"} · Groups: {cnt ? cnt.g : "—"}<br />Status: {session ? (session.status === "ready" || session.authorizationState === "authorizationStateReady" ? "ACTIVE" : "LOGIN") : "—"}<br /><button onClick={() => onOpenTelegram?.(boundSessionId)} className="mt-2 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">Open Telegram Workspace →</button></div>);
  if (tab === "Devices") return (<div className={card}><div className={sec}>Device</div>{device ? (<>{device.name} · {device.type} · {device.status}</>) : "— не привязано"}</div>);
  if (tab === "Timeline") return (<div className="space-y-1">{(agent?.activity || []).slice().reverse().map((a: any, i: number) => <div key={i} className={card}><b>{a.t}</b> — {a.action}{a.result ? " · " + a.result : ""}</div>)}{!(agent?.activity || []).length && <div className="text-tg-muted text-sm">Событий нет.</div>}</div>);
  if (tab === "Analytics") return (<div className="grid gap-3 sm:grid-cols-3"><div className={card}><div className={sec}>Missions</div>{myMissions.length}</div><div className={card}><div className={sec}>Tasks</div>{myExec.length}</div><div className={card}><div className={sec}>Readiness</div>{agent?.readiness}%</div></div>);
  return <div className="text-tg-muted">—</div>;
}
