"use client";

// EffectiveHtmlCanvas — visual HTML architecture planner.
// Category: AI / Architecture · Status: ACTIVE
// Additive only: no routing/backend/credentials. localStorage for camera/template.
// Inspired by plannotator/effective-html — self-contained HTML export (embedded CSS+JS, no external deps).

import { useEffect, useMemo, useRef, useState } from "react";

export type HNode = { id: string; label: string; type: string; sub?: string; details?: string[]; x: number; y: number };
export type HEdge = { from: string; to: string; label?: string };
export type HDoc = { title: string; status: string; nodes: HNode[]; edges: HEdge[]; sections: { title: string; body: string }[]; metadata: Record<string, string> };

type Ctx = {
  agents?: any[]; missions?: any[]; exec?: any[]; devices?: any[]; slots?: any[];
  bind?: Record<string, string>; counts?: Record<string, any>; activeId?: string;
};

const TYPE_CLR: Record<string, string> = {
  agent: "#ff2d6b", entity: "#ff5db1", telegram: "#3ea6ff", device: "#22d3ee", service: "#f59e0b",
  model: "#a78bfa", mission: "#22c55e", task: "#38bdf8", brain: "#b14dff", pipeline: "#f43f5e",
  infra: "#14b8a6", twin: "#e879f9", automation: "#84cc16", root: "#ffffff",
};

// ---------- MOCK DATA (verification) ----------
const MOCK_MODELS = ["Claude", "Grok", "Gemini", "ChatGPT", "OpenRouter", "HuggingFace", "ElevenLabs"];
function mockEntities() {
  return [{ id: "eva", name: "EVA NOVIKOVA", role: "AI ENTITY", state: "ACTIVE", model: "Claude",
    integrations: ["OpenRouter", "ElevenLabs", "n8n"], readiness: 82 }];
}

// ---------- TEMPLATE BUILDERS ----------
const radial = (items: { id: string; label: string; type: string; sub?: string; details?: string[] }[], cx = 640, cy = 360, r = 260): HNode[] =>
  items.map((it, i) => {
    const a = (i / Math.max(1, items.length)) * Math.PI * 2;
    return { ...it, x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r) };
  });

function tplAgentRegistry(ctx: Ctx): HDoc {
  const agents = (ctx.agents && ctx.agents.length ? ctx.agents : mockEntities());
  const center: HNode = { id: "root", label: "AGENT REGISTRY", type: "root", sub: agents.length + " agents", x: 640, y: 360 };
  const ring = radial(agents.map((a: any) => ({ id: "a_" + a.id, label: a.name, type: "agent", sub: a.role,
    details: ["State: " + (a.state || "—"), "Model: " + (a.model || "—"), "Readiness: " + (a.readiness ?? "—") + "%"] })));
  return { title: "Agent Registry Map", status: "ACTIVE", nodes: [center, ...ring],
    edges: ring.map((n) => ({ from: "root", to: n.id })),
    sections: [{ title: "Overview", body: "Карта всех AI-агентов экосистемы EPIC☠STAR / DEEPINSIDE.LIFE с ролями, моделями и готовностью." }],
    metadata: { Generated: new Date().toISOString().slice(0, 10), Agents: String(agents.length), Source: ctx.agents?.length ? "live" : "mock" } };
}

function tplTelegram(ctx: Ctx): HDoc {
  const slots = (ctx.slots && ctx.slots.length ? ctx.slots : [{ slotId: "acc1", displayName: "Telegram Account", status: "authorized" }]);
  const center: HNode = { id: "root", label: "TELEGRAM ACCOUNTS", type: "root", sub: slots.length + " sessions", x: 640, y: 360 };
  const ring = radial(slots.map((s: any, i: number) => ({ id: "s" + i, label: (s.displayName || s.slotId || "session"), type: "telegram",
    sub: s.status || "session", details: ["Status: " + (s.status || "—"), "User: " + (s.username || "—")] })));
  return { title: "Telegram Accounts Map", status: "ACTIVE", nodes: [center, ...ring], edges: ring.map((n) => ({ from: "root", to: n.id })),
    sections: [{ title: "Sessions", body: "Карта Telegram-сессий (read-only, без секретов). Никаких automation-действий." }],
    metadata: { Sessions: String(slots.length), Mode: "read-only", Source: ctx.slots?.length ? "live" : "mock" } };
}

function tplAiEntities(): HDoc {
  const e = mockEntities()[0];
  const center: HNode = { id: "eva", label: e.name, type: "entity", sub: e.role, x: 640, y: 360,
    details: ["Model: " + e.model, "Readiness: " + e.readiness + "%"] };
  const models = radial(MOCK_MODELS.map((m) => ({ id: "m_" + m, label: m, type: "model", sub: "AI model" })));
  return { title: "AI Entities Map", status: "ACTIVE", nodes: [center, ...models],
    edges: models.map((m) => ({ from: "eva", to: m.id })),
    sections: [{ title: "Entity", body: "EVA NOVIKOVA — цифровая AI-сущность, подключённая к мульти-модельному роутеру." }],
    metadata: { Entity: e.name, Models: String(MOCK_MODELS.length) } };
}

function tplRuntime(): HDoc {
  const nodes: HNode[] = [
    { id: "vps", label: "Windows VPS", type: "infra", sub: "host", x: 640, y: 130, details: ["Docker", "n8n", "Cloudflare tunnel"] },
    { id: "docker", label: "Docker", type: "service", sub: "containers", x: 360, y: 320 },
    { id: "n8n", label: "n8n", type: "automation", sub: "workflows", x: 920, y: 320 },
    { id: "router", label: "AI Model Router", type: "model", sub: "/api/ai/routes", x: 640, y: 360 },
    { id: "or", label: "OpenRouter", type: "model", sub: "gateway", x: 420, y: 560 },
    { id: "hf", label: "HuggingFace", type: "model", sub: "inference", x: 640, y: 600 },
    { id: "claude", label: "Claude", type: "model", sub: "reasoning", x: 860, y: 560 },
  ];
  return { title: "Runtime Architecture Map", status: "ACTIVE", nodes,
    edges: [{ from: "vps", to: "docker" }, { from: "vps", to: "n8n" }, { from: "vps", to: "router" }, { from: "router", to: "or" }, { from: "router", to: "hf" }, { from: "router", to: "claude" }],
    sections: [{ title: "Runtime", body: "Полный runtime-стек: VPS → Docker/n8n → AI Model Router → провайдеры." }],
    metadata: { Host: "Windows VPS", Layer: "runtime" } };
}

function tplMissions(ctx: Ctx): HDoc {
  const ms = (ctx.missions && ctx.missions.length ? ctx.missions : [{ id: "m1", title: "Content Pipeline", status: "ACTIVE" }, { id: "m2", title: "Streaming", status: "PLANNED" }]);
  const center: HNode = { id: "root", label: "MISSION CONTROL", type: "root", sub: ms.length + " missions", x: 640, y: 360 };
  const ring = radial(ms.map((m: any) => ({ id: "m_" + m.id, label: m.title, type: "mission", sub: m.status,
    details: ["Status: " + (m.status || "—"), "Owner: " + (m.agentId || m.owner || "—")] })));
  return { title: "Mission Control Roadmap", status: "ACTIVE", nodes: [center, ...ring], edges: ring.map((n) => ({ from: "root", to: n.id })),
    sections: [{ title: "Roadmap", body: "Дорожная карта миссий: Content / Streaming / Music / Development / Research / Automation." }],
    metadata: { Missions: String(ms.length), Source: ctx.missions?.length ? "live" : "mock" } };
}

function tplInfra(): HDoc {
  const nodes: HNode[] = [
    { id: "life", label: "DEEPINSIDE.LIFE", type: "root", sub: "platform", x: 640, y: 120 },
    { id: "cf", label: "Cloudflare", type: "infra", sub: "edge/tunnel", x: 360, y: 320 },
    { id: "vps", label: "Windows VPS", type: "infra", sub: "compute", x: 640, y: 340 },
    { id: "pg", label: "PostgreSQL", type: "service", sub: "db", x: 920, y: 320 },
    { id: "redis", label: "Redis", type: "service", sub: "cache", x: 480, y: 560 },
    { id: "docker", label: "Docker", type: "service", sub: "runtime", x: 800, y: 560 },
  ];
  return { title: "DEEPINSIDE.LIFE Infrastructure Map", status: "ACTIVE", nodes,
    edges: [{ from: "life", to: "cf" }, { from: "life", to: "vps" }, { from: "life", to: "pg" }, { from: "vps", to: "redis" }, { from: "vps", to: "docker" }],
    sections: [{ title: "Infrastructure", body: "Инфраструктура платформы DEEPINSIDE.LIFE: edge, compute, data, runtime." }],
    metadata: { Platform: "DEEPINSIDE.LIFE", Layer: "infra" } };
}

function tplTwin(): HDoc {
  const steps = ["Source", "Voice (ElevenLabs)", "Face / Digital Twin", "Render", "Telegram Publish"];
  const nodes: HNode[] = steps.map((s, i) => ({ id: "t" + i, label: s, type: "twin", sub: "stage " + (i + 1), x: 200 + i * 230, y: 360 }));
  return { title: "Digital Twin Pipeline", status: "ACTIVE", nodes,
    edges: nodes.slice(1).map((n, i) => ({ from: "t" + i, to: n.id })),
    sections: [{ title: "Pipeline", body: "Конвейер цифрового двойника — визуальный план (без runtime-исполнения)." }],
    metadata: { Stages: String(steps.length), Mode: "planning" } };
}

function tplAutomation(): HDoc {
  const nodes: HNode[] = [
    { id: "trig", label: "Trigger", type: "automation", sub: "event", x: 220, y: 360 },
    { id: "n8n", label: "n8n Flow", type: "automation", sub: "orchestrate", x: 470, y: 360 },
    { id: "ai", label: "AI Step", type: "model", sub: "router", x: 720, y: 260 },
    { id: "review", label: "Human Review", type: "task", sub: "approval", x: 720, y: 460 },
    { id: "out", label: "Output Draft", type: "pipeline", sub: "no auto-send", x: 970, y: 360 },
  ];
  return { title: "Automation Workflow Map", status: "ACTIVE", nodes,
    edges: [{ from: "trig", to: "n8n" }, { from: "n8n", to: "ai" }, { from: "n8n", to: "review" }, { from: "ai", to: "out" }, { from: "review", to: "out" }],
    sections: [{ title: "Workflow", body: "Схема автоматизации с обязательным human review. Только планирование, без авто-отправки." }],
    metadata: { Safety: "human-in-the-loop", Mode: "planning" } };
}

const TEMPLATES: { id: string; label: string; build: (ctx: Ctx) => HDoc }[] = [
  { id: "registry", label: "Agent Registry Map", build: tplAgentRegistry },
  { id: "telegram", label: "Telegram Accounts Map", build: tplTelegram },
  { id: "entities", label: "AI Entities Map", build: () => tplAiEntities() },
  { id: "runtime", label: "Runtime Architecture Map", build: () => tplRuntime() },
  { id: "missions", label: "Mission Control Roadmap", build: tplMissions },
  { id: "infra", label: "DEEPINSIDE.LIFE Infrastructure Map", build: () => tplInfra() },
  { id: "twin", label: "Digital Twin Pipeline", build: () => tplTwin() },
  { id: "automation", label: "Automation Workflow Map", build: () => tplAutomation() },
];

// ---------- SELF-CONTAINED HTML GENERATOR ----------
export function buildHtml(doc: HDoc): string {
  const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const nodesJson = JSON.stringify(doc.nodes);
  const edgesJson = JSON.stringify(doc.edges);
  const clrJson = JSON.stringify(TYPE_CLR);
  const meta = Object.entries(doc.metadata).map(([k, v]) => `<span class="chip"><b>${esc(k)}</b> ${esc(v)}</span>`).join("");
  const sections = doc.sections.map((s) => `<section class="card"><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></section>`).join("");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(doc.title)} — EPIC☠STAR / DEEPINSIDE.LIFE</title><style>
*{box-sizing:border-box}html,body{margin:0;height:100%;font-family:Inter,system-ui,Segoe UI,sans-serif;background:#070509;color:#e9e6f2;overflow:hidden}
#bg{position:fixed;inset:0;background:radial-gradient(circle at 30% 20%,rgba(177,77,255,.10),transparent 60%),radial-gradient(circle at 80% 80%,rgba(255,45,107,.10),transparent 55%),#070509;
background-image:linear-gradient(rgba(177,77,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(177,77,255,.06) 1px,transparent 1px);background-size:34px 34px}
header{position:fixed;top:0;left:0;right:0;z-index:5;display:flex;gap:12px;align-items:center;padding:12px 18px;background:rgba(14,10,20,.65);backdrop-filter:blur(14px);border-bottom:1px solid rgba(177,77,255,.25)}
header h1{font-size:16px;margin:0;letter-spacing:.06em;font-weight:900}
.badge{font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;background:rgba(34,197,94,.18);color:#4ade80;border:1px solid rgba(34,197,94,.4)}
.chip{font-size:11px;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);margin-left:6px}
#meta{margin-left:auto;display:flex;flex-wrap:wrap;gap:4px;align-items:center}
#stage{position:fixed;inset:0;cursor:grab}#stage:active{cursor:grabbing}
#world{position:absolute;left:0;top:0;transform-origin:0 0}
.node{position:absolute;width:184px;border-radius:16px;padding:12px 14px;background:rgba(20,14,30,.55);backdrop-filter:blur(10px);
border:1px solid rgba(255,255,255,.12);box-shadow:0 10px 40px rgba(0,0,0,.45);cursor:pointer;transition:transform .12s,box-shadow .2s}
.node:hover{transform:translateY(-2px);box-shadow:0 16px 50px rgba(177,77,255,.3)}
.node .t{font-weight:800;font-size:13px}.node .s{font-size:11px;color:#a99fc4;margin-top:2px}
.node .d{margin-top:8px;font-size:11px;color:#cfc7e6;display:none;border-top:1px solid rgba(255,255,255,.1);padding-top:6px}
.node.open .d{display:block}.node .dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle}
svg.edges{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
.ctrls{position:fixed;left:16px;bottom:16px;z-index:5;display:flex;gap:6px}
.ctrls button{width:38px;height:38px;border-radius:10px;border:1px solid rgba(177,77,255,.3);background:rgba(20,14,30,.7);color:#fff;font-size:18px;cursor:pointer;backdrop-filter:blur(8px)}
#panels{position:fixed;right:16px;bottom:16px;z-index:5;width:300px;max-height:46vh;overflow:auto}
.card{background:rgba(20,14,30,.6);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px 14px;margin-bottom:8px}
.card h3{margin:0 0 6px;font-size:13px;color:#ff5db1}.card p{margin:0;font-size:12px;color:#cfc7e6;line-height:1.5}
.mini{position:fixed;right:16px;top:64px;z-index:5;width:180px;height:120px;border-radius:12px;overflow:hidden;border:1px solid rgba(177,77,255,.3);background:rgba(14,10,20,.7)}
footer{position:fixed;left:0;right:0;bottom:0;text-align:center;font-size:10px;color:#6b6480;padding:4px;pointer-events:none;z-index:1}
</style></head><body>
<div id="bg"></div>
<header><h1>🧠 ${esc(doc.title)}</h1><span class="badge">${esc(doc.status)}</span><div id="meta">${meta}</div></header>
<div id="stage"><div id="world"><svg class="edges" id="edges"></svg></div></div>
<svg class="mini" id="mini" viewBox="0 0 1280 760" preserveAspectRatio="xMidYMid meet"></svg>
<div class="ctrls"><button onclick="zoom(0.15)">+</button><button onclick="zoom(-0.15)">−</button><button onclick="fit()">⤢</button></div>
<div id="panels">${sections}</div>
<footer>EPIC☠STAR / DEEPINSIDE.LIFE · Effective HTML Canvas · self-contained · planning layer only</footer>
<script>
const NODES=${nodesJson},EDGES=${edgesJson},CLR=${clrJson};
const world=document.getElementById('world'),stage=document.getElementById('stage'),edgesSvg=document.getElementById('edges'),mini=document.getElementById('mini');
let view={tx:0,ty:0,s:0.85};const byId={};NODES.forEach(n=>byId[n.id]=n);
function apply(){world.style.transform='translate('+view.tx+'px,'+view.ty+'px) scale('+view.s+')';}
function render(){
 NODES.forEach(n=>{const d=document.createElement('div');d.className='node';d.style.left=n.x+'px';d.style.top=n.y+'px';
  const det=(n.details||[]).map(x=>'<div>'+x+'</div>').join('');
  d.innerHTML='<div class="t"><span class="dot" style="background:'+(CLR[n.type]||'#fff')+'"></span>'+n.label+'</div><div class="s">'+(n.sub||n.type)+'</div>'+(det?'<div class="d">'+det+'</div>':'');
  d.onclick=function(e){e.stopPropagation();d.classList.toggle('open');};world.appendChild(d);});
 drawEdges();drawMini();apply();fit();
}
function drawEdges(){let s='';EDGES.forEach(e=>{const a=byId[e.from],b=byId[e.to];if(!a||!b)return;
  s+='<line x1="'+(a.x+92)+'" y1="'+(a.y+28)+'" x2="'+(b.x+92)+'" y2="'+(b.y+28)+'" stroke="rgba(255,45,107,.35)" stroke-width="1.4"/>';});edgesSvg.innerHTML=s;}
function drawMini(){let s='';EDGES.forEach(e=>{const a=byId[e.from],b=byId[e.to];if(!a||!b)return;s+='<line x1="'+(a.x+92)+'" y1="'+(a.y+28)+'" x2="'+(b.x+92)+'" y2="'+(b.y+28)+'" stroke="rgba(255,45,107,.4)" stroke-width="3"/>';});
  NODES.forEach(n=>{s+='<circle cx="'+(n.x+92)+'" cy="'+(n.y+28)+'" r="13" fill="'+(CLR[n.type]||'#fff')+'"/>';});mini.innerHTML=s;}
function zoom(d){view.s=Math.max(0.3,Math.min(2.2,+(view.s+d).toFixed(2)));apply();}
function fit(){const xs=NODES.map(n=>n.x),ys=NODES.map(n=>n.y);const minx=Math.min(...xs),maxx=Math.max(...xs)+184,miny=Math.min(...ys),maxy=Math.max(...ys)+120;
  const w=innerWidth,h=innerHeight-60;const s=Math.min(w/(maxx-minx),h/(maxy-miny),1)*0.9;view.s=+s.toFixed(2);view.tx=(w-(maxx-minx)*s)/2-minx*s;view.ty=70+(h-(maxy-miny)*s)/2-miny*s;apply();}
let drag=null;stage.addEventListener('mousedown',e=>{drag={x:e.clientX,y:e.clientY,tx:view.tx,ty:view.ty};});
window.addEventListener('mousemove',e=>{if(!drag)return;view.tx=drag.tx+(e.clientX-drag.x);view.ty=drag.ty+(e.clientY-drag.y);apply();});
window.addEventListener('mouseup',()=>drag=null);
stage.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?0.1:-0.1);},{passive:false});
render();
</script></body></html>`;
}

// ---------- IN-APP WORKSPACE ----------
export function EffectiveHtmlCanvas({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const [tplId, setTplId] = useState("registry");
  const [view, setView] = useState({ tx: 60, ty: 40, s: 0.8 });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  useEffect(() => { try { const d = JSON.parse(localStorage.getItem("epic_html_canvas_v1") || "{}"); if (d.tplId) setTplId(d.tplId); if (d.view) setView(d.view); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("epic_html_canvas_v1", JSON.stringify({ tplId, view })); } catch {} }, [tplId, view]);

  const doc = useMemo(() => (TEMPLATES.find((t) => t.id === tplId) || TEMPLATES[0]).build(ctx), [tplId, ctx]);
  const byId = useMemo(() => Object.fromEntries(doc.nodes.map((n) => [n.id, n])), [doc]);

  useEffect(() => {
    function mv(e: MouseEvent) { if (!drag.current) return; setView((v) => ({ ...v, tx: drag.current!.tx + (e.clientX - drag.current!.x), ty: drag.current!.ty + (e.clientY - drag.current!.y) })); }
    function up() { drag.current = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);
  const zoom = (d: number) => setView((v) => ({ ...v, s: Math.max(0.3, Math.min(2.2, +(v.s + d).toFixed(2))) }));

  function exportHtml() {
    const html = buildHtml(doc);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = doc.title.replace(/[^\w]+/g, "_") + ".html";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#070509] text-tg-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-[rgba(177,77,255,.25)] bg-[rgba(14,10,20,.7)] px-4 py-2 backdrop-blur">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🧠 EFFECTIVE HTML CANVAS</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · AI / Architecture</span>
        <select value={tplId} onChange={(e) => setTplId(e.target.value)} className="ml-2 rounded-lg border border-tg-line bg-tg-panel px-2 py-1 text-xs">
          {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setTplId(tplId)} className="rounded-lg bg-tg-active px-3 py-1.5 text-xs font-semibold text-white">Generate Architecture Map</button>
          <button onClick={exportHtml} className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white">Export HTML ↓</button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden" style={{ backgroundImage: "linear-gradient(rgba(177,77,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(177,77,255,.06) 1px,transparent 1px)", backgroundSize: "34px 34px" }}>
        <div className="absolute left-3 top-3 z-10 flex gap-1">
          <button onClick={() => zoom(0.15)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">+</button>
          <button onClick={() => zoom(-0.15)} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">−</button>
          <button onClick={() => setView({ tx: 60, ty: 40, s: 0.8 })} className="rounded-lg bg-tg-panel px-2 text-xs ring-1 ring-tg-line">reset</button>
        </div>
        <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }; }}>
          <div style={{ transform: `translate(${view.tx}px,${view.ty}px) scale(${view.s})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
            <svg className="pointer-events-none absolute" style={{ overflow: "visible", left: 0, top: 0 }} width="1" height="1">
              {doc.edges.map((e, i) => { const a = byId[e.from], b = byId[e.to]; if (!a || !b) return null; return <line key={i} x1={a.x + 92} y1={a.y + 28} x2={b.x + 92} y2={b.y + 28} stroke="rgba(255,45,107,.35)" strokeWidth={1.4} />; })}
            </svg>
            {doc.nodes.map((n) => (
              <div key={n.id} onMouseDown={(e) => e.stopPropagation()} onClick={() => setOpen((o) => ({ ...o, [n.id]: !o[n.id] }))}
                className="absolute w-[184px] cursor-pointer rounded-2xl border p-3 backdrop-blur transition hover:-translate-y-0.5"
                style={{ left: n.x, top: n.y, background: "rgba(20,14,30,.55)", borderColor: "rgba(255,255,255,.12)", boxShadow: "0 10px 40px rgba(0,0,0,.45)" }}>
                <div className="text-[13px] font-extrabold"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: TYPE_CLR[n.type] || "#fff" }} />{n.label}</div>
                <div className="mt-0.5 text-[11px]" style={{ color: "#a99fc4" }}>{n.sub || n.type}</div>
                {open[n.id] && n.details && <div className="mt-2 border-t border-white/10 pt-1.5 text-[11px]" style={{ color: "#cfc7e6" }}>{n.details.map((d, i) => <div key={i}>{d}</div>)}</div>}
              </div>
            ))}
          </div>
        </div>
        {/* minimap */}
        <div className="absolute right-3 top-3 h-28 w-44 overflow-hidden rounded-xl border border-[rgba(177,77,255,.3)] bg-[rgba(14,10,20,.7)]">
          <svg width="176" height="112" viewBox="0 0 1280 760" preserveAspectRatio="xMidYMid meet">
            {doc.edges.map((e, i) => { const a = byId[e.from], b = byId[e.to]; if (!a || !b) return null; return <line key={i} x1={a.x + 92} y1={a.y + 28} x2={b.x + 92} y2={b.y + 28} stroke="rgba(255,45,107,.4)" strokeWidth={3} />; })}
            {doc.nodes.map((n) => <circle key={n.id} cx={n.x + 92} cy={n.y + 28} r={13} fill={TYPE_CLR[n.type] || "#fff"} />)}
          </svg>
        </div>
        {/* sections */}
        <div className="absolute bottom-3 right-3 max-h-[44vh] w-72 overflow-auto">
          {doc.sections.map((s, i) => (
            <div key={i} className="mb-2 rounded-xl border border-white/10 bg-[rgba(20,14,30,.6)] p-3 backdrop-blur">
              <div className="text-[13px] font-bold text-[#ff5db1]">{s.title}</div>
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "#cfc7e6" }}>{s.body}</p>
            </div>
          ))}
          <div className="rounded-xl border border-white/10 bg-[rgba(20,14,30,.6)] p-3 text-[11px] backdrop-blur" style={{ color: "#a99fc4" }}>
            {Object.entries(doc.metadata).map(([k, v]) => <span key={k} className="mr-2 inline-block"><b className="text-tg-text">{k}</b> {v}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
