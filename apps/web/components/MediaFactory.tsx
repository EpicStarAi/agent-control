"use client";

// MEDIA FACTORY RUNTIME — content production pipeline (idea → publish). Category: MEDIA · Status: ACTIVE
// Additive, mock/local data only. No real API keys, no external requests, no actions. localStorage for canvas/state.
// DeepFace / FaceFusion are creative media + identity-validation tools only — no covert impersonation,
// no consent bypass, nothing published without an explicit Review step.

import { useEffect, useMemo, useRef, useState } from "react";

const LS = "epic_media_factory_v1";
const TABS = [
  ["overview", "🏭 Overview"], ["canvas", "🕸 Media Canvas"], ["comfyui", "🎨 ComfyUI"], ["facefusion", "🧬 FaceFusion"],
  ["deepface", "🪪 DeepFace"], ["ffmpeg", "🎬 FFmpeg"], ["voicelab", "🎙 Voice Lab"], ["queue", "📦 Render Queue"],
  ["assets", "🗂 Asset Library"], ["publishing", "🚀 Publishing"],
] as const;

const NCLR: Record<string, string> = {
  idea: "#fbbf24", prompt: "#a78bfa", script: "#38bdf8", character: "#ff2d6b", voice: "#e879f9",
  image: "#3ea6ff", video: "#22d3ee", facefusion: "#f97316", deepface: "#84cc16", ffmpeg: "#f59e0b",
  review: "#fb7185", publish: "#22c55e",
};
const SCLR: Record<string, string> = { IDLE: "#9ca3af", READY: "#38bdf8", RUNNING: "#fbbf24", DONE: "#4ade80", FAILED: "#f87171", "WAITING REVIEW": "#fb7185" };

type Node = { id: string; type: string; title: string; status: string; tool: string; input: string; output: string; eta: string; logs: string[]; x: number; y: number };

// EVA NOVIKOVA SHORTS PIPELINE (mock)
const SEED_NODES: Node[] = [
  { id: "n1", type: "idea", title: "Idea", status: "DONE", tool: "—", input: "—", output: "Концепт шортса", eta: "1m", logs: ["idea drafted", "theme: neon studio 3:15"], x: 40, y: 60 },
  { id: "n2", type: "script", title: "Script", status: "DONE", tool: "Claude", input: "Idea", output: "Сценарий 20с", eta: "2m", logs: ["script generated", "hook ok"], x: 280, y: 60 },
  { id: "n3", type: "voice", title: "Voice", status: "DONE", tool: "ElevenLabs", input: "Script", output: "voice.wav", eta: "1m", logs: ["tts rendered (mock)"], x: 520, y: 60 },
  { id: "n4", type: "character", title: "Character Image", status: "RUNNING", tool: "ComfyUI", input: "Prompt", output: "char.png", eta: "3m", logs: ["queued", "sampling 60%"], x: 280, y: 260 },
  { id: "n5", type: "video", title: "Video Generation", status: "READY", tool: "ComfyUI", input: "char.png + voice", output: "clip.mp4", eta: "6m", logs: ["awaiting input"], x: 520, y: 260 },
  { id: "n6", type: "facefusion", title: "FaceFusion", status: "IDLE", tool: "FaceFusion", input: "clip.mp4", output: "clip_ff.mp4", eta: "4m", logs: ["identity-validated source required"], x: 760, y: 260 },
  { id: "n7", type: "deepface", title: "DeepFace Validation", status: "IDLE", tool: "DeepFace", input: "clip_ff.mp4", output: "validation report", eta: "1m", logs: ["consent + identity check"], x: 1000, y: 260 },
  { id: "n8", type: "ffmpeg", title: "FFmpeg Export", status: "IDLE", tool: "FFmpeg", input: "clip_ff.mp4", output: "short_final.mp4", eta: "1m", logs: ["mux audio+video (mock)"], x: 760, y: 60 },
  { id: "n9", type: "review", title: "Review", status: "WAITING REVIEW", tool: "Human", input: "short_final.mp4", output: "approved?", eta: "—", logs: ["human review required before publish"], x: 1000, y: 60 },
  { id: "n10", type: "publish", title: "Publish", status: "IDLE", tool: "Telegram / TikTok / YouTube", input: "approved", output: "posted", eta: "—", logs: ["publish disabled until review approves"], x: 1240, y: 160 },
];
const SEED_EDGES: [string, string][] = [["n1", "n2"], ["n2", "n3"], ["n2", "n4"], ["n3", "n5"], ["n4", "n5"], ["n5", "n6"], ["n6", "n7"], ["n7", "n8"], ["n3", "n8"], ["n8", "n9"], ["n9", "n10"]];

const QUEUE = [
  { job: "Character Image", char: "EVA NOVIKOVA", tool: "ComfyUI", status: "RUNNING", progress: 60, fmt: "png", created: "12:31" },
  { job: "Voice TTS", char: "EVA NOVIKOVA", tool: "ElevenLabs", status: "DONE", progress: 100, fmt: "wav", created: "12:28" },
  { job: "Short Export", char: "EVA NOVIKOVA", tool: "FFmpeg", status: "IDLE", progress: 0, fmt: "mp4", created: "—" },
  { job: "Face Validation", char: "BUCHIHA", tool: "DeepFace", status: "FAILED", progress: 0, fmt: "json", created: "11:58" },
];
const ASSETS: Record<string, string[]> = {
  Characters: ["EVA NOVIKOVA", "BUCH ☠️", "BUCHIHA 😇"], Faces: ["eva_face_v3.png", "buchiha_face.png"],
  Voices: ["eva_voice.wav", "buch_voice.wav"], Scripts: ["short_3-15.md", "promo.md"], Prompts: ["neon_studio.txt"],
  Images: ["char_eva.png", "bg_studio.png"], Videos: ["clip_eva.mp4"], Music: ["synthwave_01.mp3"], Exports: ["short_final.mp4"],
};
const TOOLS = [
  { name: "ComfyUI", installed: true, endpoint: "http://localhost:8188", version: "0.3.x", projects: 3 },
  { name: "FaceFusion", installed: true, endpoint: "http://localhost:7860", version: "3.x", projects: 1 },
  { name: "DeepFace", installed: true, endpoint: "local", version: "0.0.9", projects: 1 },
  { name: "FFmpeg", installed: true, endpoint: "cli", version: "7.0", projects: 4 },
  { name: "ElevenLabs", installed: false, endpoint: "api (not connected)", version: "—", projects: 2 },
  { name: "OpenVoice", installed: false, endpoint: "local (not installed)", version: "—", projects: 0 },
  { name: "RunPod", installed: true, endpoint: "gpu pod", version: "—", projects: 2 },
  { name: "Local GPU", installed: true, endpoint: "cuda:0", version: "RTX", projects: 5 },
];

export function MediaFactory({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("overview");
  const [nodes, setNodes] = useState<Node[]>(SEED_NODES);
  const [sel, setSel] = useState("");
  const [view, setView] = useState({ tx: 30, ty: 20, s: 0.75 });
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number }>({ mode: null, sx: 0, sy: 0, ox: 0, oy: 0 });

  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(LS) || "{}"); if (d.tab) setTab(d.tab); if (d.pos) setPos(d.pos); if (d.view) setView(d.view); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ tab, pos, view, timestamp: new Date().toISOString() })); } catch {} }, [tab, pos, view]);
  useEffect(() => {
    function mv(e: MouseEvent) { const d = drag.current; if (!d.mode) return; if (d.mode === "node" && d.id) { const dx = (e.clientX - d.sx) / view.s, dy = (e.clientY - d.sy) / view.s; setPos((p) => ({ ...p, [d.id as string]: { x: d.ox + dx, y: d.oy + dy } })); } else if (d.mode === "pan") setView((v) => ({ ...v, tx: d.ox + (e.clientX - d.sx), ty: d.oy + (e.clientY - d.sy) })); }
    function up() { drag.current.mode = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [view.s]);
  const P = (n: Node) => pos[n.id] || { x: n.x, y: n.y };
  function down(e: React.MouseEvent, id?: string) { const d = drag.current; d.sx = e.clientX; d.sy = e.clientY; if (id) { const n = nodes.find((x) => x.id === id)!; d.mode = "node"; d.id = id; const p = P(n); d.ox = p.x; d.oy = p.y; setSel(id); } else { d.mode = "pan"; d.ox = view.tx; d.oy = view.ty; } e.stopPropagation(); }
  const zoom = (dz: number) => setView((v) => ({ ...v, s: Math.max(0.3, Math.min(2, +(v.s + dz).toFixed(2))) }));

  const stats = useMemo(() => ({
    projects: 1, characters: 3, queue: QUEUE.length, failed: QUEUE.filter((q) => q.status === "FAILED").length,
    published: ASSETS.Exports.length, tools: TOOLS.filter((t) => t.installed).length, gpu: "RTX · cuda:0 · 41% util",
  }), []);
  const sn = nodes.find((n) => n.id === sel);
  const patch = (id: string, st: string, log: string) => setNodes((ns) => ns.map((n) => n.id === id ? { ...n, status: st, logs: [log, ...n.logs].slice(0, 6) } : n));

  const Card = ({ children, className = "" }: any) => <div className={`rounded-2xl border border-[rgba(255,45,107,.18)] bg-[rgba(20,14,22,.6)] p-4 backdrop-blur ${className}`}>{children}</div>;
  const Dot = ({ s }: { s: string }) => <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCLR[s] || "#9ca3af" }} />;

  function ToolList({ filter }: { filter?: string }) {
    const list = filter ? TOOLS.filter((t) => t.name.toLowerCase() === filter) : TOOLS;
    return <div className="grid gap-3 lg:grid-cols-2">{list.map((t) => (
      <Card key={t.name}><div className="flex items-center gap-2"><span className="font-bold">{t.name}</span><span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${t.installed ? "bg-emerald-600/20 text-emerald-300" : "bg-rose-600/20 text-rose-300"}`}>{t.installed ? "installed" : "not installed"}</span></div>
        <div className="mt-1 text-[12px] text-tg-muted">endpoint: {t.endpoint} · version: {t.version} · projects: {t.projects}</div>
        <div className="mt-2 flex gap-1.5"><button className="rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open</button><button className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Test (mock)</button></div></Card>))}</div>;
  }

  function Body() {
    if (tab === "overview") return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-7">{([["Active Projects", stats.projects], ["Characters", stats.characters], ["Render Queue", stats.queue], ["Failed Jobs", stats.failed], ["Published", stats.published], ["Connected Tools", stats.tools], ["GPU", "RTX"]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-black text-rose-300">{v}</div></Card>)}</div>
        <Card><div className="mb-1 text-[10px] font-black uppercase tracking-wide text-tg-accent">Runtime</div><div className="text-sm text-tg-muted">GPU/Runtime: <b className="text-white">{stats.gpu}</b> · Pipeline: <b className="text-white">EVA NOVIKOVA SHORTS</b></div>
          <button onClick={() => setTab("canvas")} className="mt-2 rounded-xl border border-rose-500/30 bg-rose-600/15 px-4 py-2 text-sm font-bold text-rose-100">Open Media Canvas →</button></Card>
        <Card><div className="mb-1 text-[10px] font-black uppercase tracking-wide text-emerald-400">🛡 Safety</div><div className="text-sm text-tg-muted">FaceFusion/DeepFace — creative media + identity-validation only. Без скрытого имперсонирования и обхода согласия. Публикация только после ручного Review. Реальные API не подключены (mock).</div></Card>
      </div>
    );
    if (tab === "queue") return (
      <Card><table className="w-full text-left text-sm"><thead className="text-tg-muted text-xs"><tr>{["", "Job", "Character", "Tool", "Status", "Progress", "Format", "Created"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>{QUEUE.map((q, i) => (<tr key={i} className="border-t border-tg-line"><td className="px-2 py-1.5"><Dot s={q.status} /></td><td className="px-2 font-semibold">{q.job}</td><td className="px-2 text-tg-muted">{q.char}</td><td className="px-2 text-tg-muted">{q.tool}</td><td className="px-2">{q.status}</td><td className="px-2 w-32"><div className="h-1.5 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-rose-500 to-fuchsia-500" style={{ width: q.progress + "%" }} /></div></td><td className="px-2 text-tg-muted">{q.fmt}</td><td className="px-2 text-tg-muted">{q.created}</td></tr>))}</tbody></table></Card>
    );
    if (tab === "assets") return (
      <div className="grid gap-3 lg:grid-cols-3">{Object.entries(ASSETS).map(([cat, list]) => (
        <Card key={cat}><div className="mb-1 text-[10px] font-black uppercase tracking-wide text-tg-accent">{cat} ({list.length})</div><div className="space-y-1 text-[12px]">{list.map((a) => <div key={a} className="rounded bg-tg-bg/50 px-2 py-1">{a}</div>)}</div></Card>))}</div>
    );
    if (tab === "publishing") return (
      <div className="space-y-3"><Card><div className="mb-1 text-[10px] font-black uppercase tracking-wide text-tg-accent">Publishing Targets</div>
        <div className="grid gap-2 sm:grid-cols-3">{["Telegram", "TikTok", "YouTube Shorts", "Instagram Reels"].map((p) => <div key={p} className="rounded-xl bg-tg-bg/40 p-3"><div className="font-semibold">{p}</div><div className="text-[11px] text-tg-muted">requires Review ✓</div></div>)}</div></Card>
        <Card><div className="text-sm text-tg-muted">Публикация запускается только из ноды Publish после прохождения Review. Сейчас статус Publish: <b className="text-white">IDLE (disabled until review)</b>.</div></Card></div>
    );
    if (["comfyui", "facefusion", "deepface", "ffmpeg", "voicelab"].includes(tab)) {
      const map: Record<string, string> = { comfyui: "comfyui", facefusion: "facefusion", deepface: "deepface", ffmpeg: "ffmpeg", voicelab: "elevenlabs" };
      return <div className="space-y-3"><Card><div className="text-sm text-tg-muted">{tab === "deepface" || tab === "facefusion" ? "Identity-validation / creative media tool. Только с согласием и обязательным Review. Mock-режим." : "Инструмент медиазавода (mock-режим, без реальных API)."}</div></Card><ToolList filter={map[tab]} /></div>;
    }
    // canvas
    return (
      <div className="grid h-full grid-cols-[1fr_280px]">
        <div className="relative overflow-hidden rounded-xl bg-[#0c0810]" style={{ backgroundImage: "linear-gradient(rgba(255,45,107,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,45,107,.05) 1px,transparent 1px)", backgroundSize: "28px 28px" }}>
          <div className="absolute left-3 top-3 z-10 flex gap-1"><button onClick={() => zoom(0.15)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">+</button><button onClick={() => zoom(-0.15)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">−</button><button onClick={() => { setView({ tx: 30, ty: 20, s: 0.75 }); setPos({}); }} className="rounded-lg bg-tg-panel px-2 text-xs ring-1 ring-tg-line">reset</button></div>
          <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={(e) => down(e)}>
            <div style={{ transform: `translate(${view.tx}px,${view.ty}px) scale(${view.s})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
              <svg className="pointer-events-none absolute" style={{ overflow: "visible", left: 0, top: 0 }} width="1" height="1">{SEED_EDGES.map(([a, b], i) => { const na = nodes.find((n) => n.id === a)!, nb = nodes.find((n) => n.id === b)!; const pa = P(na), pb = P(nb); return <line key={i} x1={pa.x + 80} y1={pa.y + 28} x2={pb.x + 80} y2={pb.y + 28} stroke="rgba(255,45,107,.3)" strokeWidth={1.4} />; })}</svg>
              {nodes.map((n) => { const p = P(n); return (
                <div key={n.id} onMouseDown={(e) => down(e, n.id)} onDoubleClick={() => setSel(n.id)} className={`absolute w-[160px] cursor-grab rounded-xl border bg-[rgba(20,14,22,.8)] p-2 backdrop-blur active:cursor-grabbing ${sel === n.id ? "ring-2 ring-white" : ""}`} style={{ left: p.x, top: p.y, borderColor: NCLR[n.type] }}>
                  <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: NCLR[n.type] }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: SCLR[n.status] }} />{n.title}</div>
                  <div className="mt-0.5 text-[10px] text-tg-muted">{n.tool}</div>
                  <div className="mt-1 flex items-center justify-between text-[9px]"><span className="rounded px-1 py-0.5" style={{ background: "rgba(255,255,255,.06)", color: SCLR[n.status] }}>{n.status}</span><span className="text-tg-muted">{n.eta}</span></div>
                </div>); })}
            </div>
          </div>
          <div className="absolute bottom-3 right-3 h-24 w-40 overflow-hidden rounded-lg border border-tg-line bg-tg-panel/90"><svg width="160" height="96" viewBox="0 0 1500 460">{SEED_EDGES.map(([a, b], i) => { const na = nodes.find((n) => n.id === a)!, nb = nodes.find((n) => n.id === b)!; const pa = P(na), pb = P(nb); return <line key={i} x1={pa.x + 80} y1={pa.y + 28} x2={pb.x + 80} y2={pb.y + 28} stroke="rgba(255,45,107,.4)" strokeWidth={3} />; })}{nodes.map((n) => { const p = P(n); return <circle key={n.id} cx={p.x + 80} cy={p.y + 28} r={14} fill={NCLR[n.type]} />; })}</svg></div>
        </div>
        {/* INSPECTOR */}
        <aside className="overflow-auto rounded-xl border border-tg-line bg-[rgba(20,14,22,.6)] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Node Inspector</div>
          {sn ? (<div className="mt-2 space-y-1.5 text-xs">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: NCLR[sn.type] }} /><b>{sn.title}</b></div>
            <div className="text-tg-muted">Tool: <b className="text-tg-text">{sn.tool}</b></div>
            <div className="text-tg-muted">Status: <b style={{ color: SCLR[sn.status] }}>{sn.status}</b> · ETA: {sn.eta}</div>
            <div className="text-tg-muted">Input: <b className="text-tg-text">{sn.input}</b></div>
            <div className="text-tg-muted">Output: <b className="text-tg-text">{sn.output}</b></div>
            <div className="mt-1 text-[10px] uppercase text-tg-accent">Logs</div>
            <div className="space-y-0.5 rounded bg-tg-bg/50 p-2 text-[11px] text-tg-muted">{sn.logs.map((l, i) => <div key={i}>• {l}</div>)}</div>
            <div className="mt-2 text-[10px] uppercase text-tg-accent">Actions</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => patch(sn.id, sn.type === "publish" ? "WAITING REVIEW" : "RUNNING", "run mock started")} className="rounded-lg bg-tg-active px-2 py-1.5 text-[11px] font-semibold text-white">Run mock</button>
              <button className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Open tool</button>
              <button onClick={() => patch(sn.id, sn.status, "logs viewed " + new Date().toLocaleTimeString())} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">View logs</button>
              <button onClick={() => setNodes((ns) => [...ns, { ...sn, id: "n" + Date.now(), title: sn.title + " copy", x: sn.x + 40, y: sn.y + 40 }])} className="rounded-lg bg-tg-bg px-2 py-1.5 text-[11px] ring-1 ring-tg-line">Duplicate</button>
              <button onClick={() => { setNodes((ns) => ns.filter((n) => n.id !== sn.id)); setSel(""); }} className="col-span-2 rounded-lg border border-rose-500/40 bg-rose-600/15 px-2 py-1.5 text-[11px] text-rose-200">Delete node</button>
            </div>
            {sn.type === "publish" && <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-300">Публикация только после Review-аппрува. Реальный постинг отключён (mock).</div>}
          </div>) : <div className="mt-2 text-tg-muted">Клик по ноде — параметры, логи и действия.</div>}
        </aside>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[59] flex flex-col bg-[#0a0710] text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(255,45,107,.25)] bg-[#140e16] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🏭 MEDIA FACTORY RUNTIME</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · MEDIA</span>
        <div className="ml-auto flex flex-wrap gap-1 text-[10px]">{([["Projects", stats.projects], ["Queue", stats.queue], ["Failed", stats.failed], ["Tools", stats.tools]] as const).map(([l, v]) => <span key={l} className="rounded-full border border-tg-line bg-tg-bg px-2 py-1"><span className="text-tg-muted">{l} </span><b>{v}</b></span>)}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-[rgba(255,45,107,.15)] bg-[#140e16] p-2">
          <div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-rose-300">MEDIA FACTORY</div>
          {TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${tab === id ? "bg-rose-600/25 text-white ring-1 ring-rose-500/40" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}
        </nav>
        <main className="min-h-0 overflow-auto p-4"><Body /></main>
      </div>
    </div>
  );
}
