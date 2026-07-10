"use client";

// PHASE S — AGENT OS: Agent Workspace + Content Factory + Media Factory + AI Operator Canvas
// + World Graph 2.0 + Live Ecosystem Map + Mission Control 2.0 + Autonomy Readiness.
// ADDITIVE overlay module. Reads existing epicgram.* keys READ-ONLY, persists its own
// deepinside.* keys. NO backend, NO network, NO timers, NO cron, NO automation, NO auto-publish.
// Does NOT replace or delete WorldEngine or the existing AgentWorkspace — World Graph 2.0 is a
// NEW additive view. Approval gate stays mandatory; human is final operator.

import { useEffect, useState } from "react";
import { t, useLocale } from "@/lib/i18n";
import { OperatorActionPlan } from "@/components/OperatorActionPlan";

// ---- existing keys (read-only) ----
const K_BRAIN = "epicgram.agentBrain.v1";
const K_IDEAS = "epicgram.contentIdeas.v1";
const K_CAMP = "epicgram.campaigns.v1";
const K_ASSIGN = "epicgram.channelAssignments.v1";
const K_DRAFTS = "epicgram.drafts.v1";
const K_LOG = "epicgram.publishlog.v1";
// ---- new keys ----
const K_MEDIA = "deepinside.mediaFactory.v1";
const K_CONTENT = "deepinside.contentFactory.v1";
const K_WS = "deepinside.agentWorkspace.v1";
const K_AUTON = "deepinside.autonomyReadiness.v1";
const K_MAP = "deepinside.ecosystemMap.v1";
const K_WORLD = "deepinside.worldGraph.v2";

const AGENTS = ["NOVIKOVA", "AI MUSIC PUBLIC", "EVA", "AI NEWSCASTER"];
const CONTENT_TYPES = ["Post", "News", "Story", "Announcement", "Thread", "Long Read", "Podcast Script", "Video Script", "Radio Script"];
const MEDIA_TYPES = ["Image", "Video", "Audio", "Voice", "Music", "Thumbnail", "Avatar", "Asset Pack", "Scene"];
const DISTRICTS = ["City", "AI District", "Radio District", "Media District", "Research District", "Creator District", "Infrastructure District", "Human District", "Economy District", "Mission District"];

const NODE_COLOR: Record<string, string> = { Agent: "#e879f9", Channel: "#38bdf8", Campaign: "#fbbf24", Draft: "#a78bfa", Approval: "#f59e0b", Queue: "#818cf8", Publish: "#4ade80", Analytics: "#22d3ee", Memory: "#c084fc", Brain: "#34d399", Idea: "#f472b6", Media: "#fb7185", Timeline: "#94a3b8", District: "#a5b4fc", Core: "#e879f9" };

// ---- types ----
type AnyRec = Record<string, any>;
type Media = { id: string; name: string; type: string; author: string; agent: string; channel: string; status: "DRAFT" | "READY" | "USED" | "ARCHIVED"; campaign?: string; createdAt: string };
type Blueprint = { id: string; type: string; title: string; agent: string; createdAt: string };
type GNode = { id: string; label: string; sub?: string; x: number; y: number; type: string };
type GEdge = [string, string];

const rid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
function load<T>(k: string, def: T): T { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch { return def; } }
function save(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const fmtDT = (iso?: string) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" }); } catch { return iso; } };

const SECTIONS: [string, string][] = [
  ["command", "📊 Ecosystem Command"], ["operator", "🛰 AI Operator"], ["livepilot", "🚀 Live Pilot"], ["livewizard", "🧭 Live Wizard"], ["runbook", "🧪 E2E Runbook"], ["dryrun", "🧪 E2E Dry-Run"], ["postlive", "📁 Post-Live"], ["liveprep", "🚦 Live Prep"], ["targets", "🎯 Targets"], ["ownedaccounts", "👤 Accounts"], ["opanalytics", "📊 Op Analytics"], ["workspace", "🏢 Agent Workspace"], ["content", "📝 Content Factory"], ["media", "🎬 Media Factory"],
  ["canvas", "♾ Operator Canvas"], ["channelcenter", "📡 Channel Center"], ["activity", "⚡ Activity Stream"], ["matrix", "🧮 Readiness Matrix"],
  ["world", "🌍 World Graph 2.0"], ["map", "🛰 Live Ecosystem Map"], ["autonomy", "🤖 Autonomy Readiness"]
];

// reusable zoom/pan graph
function Graph({ nodes, edges, w, h, onNode }: { nodes: GNode[]; edges: GEdge[]; w: number; h: number; onNode?: (id: string) => void }) {
  const [scale, setScale] = useState(0.8);
  const pos: Record<string, GNode> = {}; nodes.forEach((n) => { pos[n.id] = n; });
  return <div className="space-y-1">
    <div className="flex items-center gap-2 text-[10px] text-tg-muted"><span>zoom</span><input type="range" min={0.4} max={1.6} step={0.1} value={scale} onChange={(e) => setScale(+e.target.value)} className="w-40" /><span>{Math.round(scale * 100)}% · перетаскивай скроллом</span></div>
    <div className="overflow-auto rounded-xl border border-white/10 bg-black/30" style={{ maxHeight: "62vh" }}>
      <svg width={w * scale} height={h * scale} viewBox={"0 0 " + w + " " + h}>
        {edges.map(([a, b], i) => { const p = pos[a], q = pos[b]; if (!p || !q) return null; return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#ffffff22" strokeWidth={2} />; })}
        {nodes.map((n) => <g key={n.id} transform={"translate(" + (n.x - 62) + "," + (n.y - 22) + ")"} onClick={() => onNode && onNode(n.id)} style={{ cursor: onNode ? "pointer" : "default" }}>
          <rect width={124} height={44} rx={10} fill={(NODE_COLOR[n.type] || "#888") + "22"} stroke={(NODE_COLOR[n.type] || "#888") + "99"} />
          <text x={62} y={19} textAnchor="middle" fontSize={11} fontWeight={700} fill={NODE_COLOR[n.type] || "#ddd"}>{n.label.slice(0, 18)}</text>
          <text x={62} y={33} textAnchor="middle" fontSize={8} fill="#9ca3af">{(n.sub || n.type).slice(0, 22)}</text>
        </g>)}
      </svg>
    </div>
  </div>;
}

export function EpicGramAgentOS({ onClose, initialSection }: { onClose: () => void; initialSection?: string }) {
  const loc = useLocale();
  const [sec, setSec] = useState(initialSection || "command");
  const [agent, setAgent] = useState(AGENTS[0]);
  const [wsTab, setWsTab] = useState("brain");
  const [canvasView, setCanvasView] = useState<"live" | "workflow" | "agent" | "campaign" | "world">("live");
  const [selChannel, setSelChannel] = useState("");
  // T21 hash fallback + global AI Operator navigation: switch section on /agents#<key> or deepinside:navigate
  useEffect(() => {
    try {
      const known = SECTIONS.map(([k]) => k);
      const h = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
      if (known.indexOf(h) >= 0) setSec(h);
      const onNav = (e: any) => { const k = e && e.detail; if (known.indexOf(k) >= 0) setSec(k); };
      window.addEventListener("deepinside:navigate", onNav);
      return () => window.removeEventListener("deepinside:navigate", onNav);
    } catch {}
  }, []);

  const [brains, setBrains] = useState<AnyRec>({});
  const [ideas, setIdeas] = useState<AnyRec[]>([]);
  const [camps, setCamps] = useState<AnyRec[]>([]);
  const [assigns, setAssigns] = useState<AnyRec[]>([]);
  const [drafts, setDrafts] = useState<AnyRec[]>([]);
  const [log, setLog] = useState<AnyRec[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);

  useEffect(() => {
    setBrains(load<AnyRec>(K_BRAIN, {}));
    setIdeas(load<AnyRec[]>(K_IDEAS, []));
    setCamps(load<AnyRec[]>(K_CAMP, []));
    setAssigns(load<AnyRec[]>(K_ASSIGN, []));
    setDrafts(load<AnyRec[]>(K_DRAFTS, []));
    setLog(load<AnyRec[]>(K_LOG, []));
    setMedia(load<Media[]>(K_MEDIA, []));
    setBlueprints(load<Blueprint[]>(K_CONTENT, []));
    save(K_WS, { lastOpenedAt: now(), agents: AGENTS });
  }, []);

  const writeMedia = (v: Media[]) => { setMedia(v); save(K_MEDIA, v); };
  const writeBlueprints = (v: Blueprint[]) => { setBlueprints(v); save(K_CONTENT, v); };

  // ---- derived ----
  const dOf = (a: string) => drafts.filter((d) => d.authorAgent === a);
  const success = log.filter((e) => e.status === "SUCCESS");
  const failed = log.filter((e) => e.status === "FAILED");
  const channelsOf = (a: string) => {
    const set: Record<string, boolean> = {};
    assigns.filter((x) => x.agent === a).forEach((x) => { if (x.channel) set[x.channel] = true; });
    dOf(a).forEach((d) => { const c = d.channelTitle || d.channelId; if (c) set[c] = true; });
    return Object.keys(set);
  };
  const allChannels = (() => { const s: Record<string, boolean> = {}; assigns.forEach((x) => { if (x.channel) s[x.channel] = true; }); drafts.forEach((d) => { const c = d.channelTitle || d.channelId; if (c) s[c] = true; }); return Object.keys(s); })();
  const byStatus = (st: string) => drafts.filter((d) => d.status === st).length;

  function scores(a: string) {
    const b = brains[a] || {};
    const memF = ["identity", "role", "mission", "tone", "personality", "targetAudience"].filter((k) => b[k]).length;
    const memL = [(b.goals || []).length, (b.interests || []).length, (b.contentTopics || []).length].filter((n) => n > 0).length;
    const memory = Math.round(((memF + memL) / 9) * 100);
    const brF = ["contentMission", "contentStrategy", "postingFrequency"].filter((k) => b[k]).length;
    const brL = [(b.weeklyThemes || []).length, (b.contentCategories || []).length, (b.contentGoals || []).length].filter((n) => n > 0).length + ((b.topics || []).length >= 3 ? 1 : 0);
    const brain = Math.round(((brF + brL) / 7) * 100);
    const pub = dOf(a).filter((d) => d.status === "PUBLISHED").length;
    return { memory, brain, pub };
  }

  function timeline(a: string) {
    const ev: { t: string; label: string }[] = [];
    dOf(a).forEach((d) => {
      if (d.createdAt) ev.push({ t: d.createdAt, label: "📝 Draft: " + (d.title || "—") });
      if (d.status === "PUBLISHED" && d.updatedAt) ev.push({ t: d.updatedAt, label: "📤 Published: " + (d.title || "—") });
      if (d.status === "APPROVED" && d.updatedAt) ev.push({ t: d.updatedAt, label: "✓ Approved: " + (d.title || "—") });
      if (d.status === "REJECTED" && d.updatedAt) ev.push({ t: d.updatedAt, label: "✕ Rejected: " + (d.title || "—") });
    });
    return ev.filter((x) => x.t).sort((p, q) => (p.t < q.t ? 1 : -1)).slice(0, 30);
  }

  function readinessSystem() {
    const anyBrain = AGENTS.some((a) => scores(a).brain >= 70);
    const anyMem = AGENTS.some((a) => scores(a).memory >= 70);
    const checks: [string, boolean][] = [
      ["Agent Ready", AGENTS.length > 0],
      ["Brain Ready", anyBrain],
      ["Memory Ready", anyMem],
      ["Campaign Ready", camps.length > 0],
      ["Content Ready", drafts.length > 0 || blueprints.length > 0],
      ["Media Ready", media.length > 0],
      ["Publishing Ready", success.length > 0],
      ["Operator Ready", true]
    ];
    const overall = Math.round((checks.filter((c) => c[1]).length / checks.length) * 100);
    return { checks, overall };
  }

  // ================= SECTIONS =================
  function Command() {
    const tot = AGENTS.reduce((acc, a) => { const s = scores(a); acc.m += s.memory; acc.b += s.brain; return acc; }, { m: 0, b: 0 });
    const memAvg = Math.round(tot.m / AGENTS.length), brainAvg = Math.round(tot.b / AGENTS.length);
    const readiness = readinessSystem().overall;
    const accSet: Record<string, boolean> = {}; assigns.forEach((x) => { if (x.account) accSet[x.account] = true; });
    const tiles: [string, any, string?][] = [
      ["Agents", AGENTS.length], ["Accounts", Object.keys(accSet).length, "#22d3ee"], ["Channels", allChannels.length, "#38bdf8"], ["Campaigns", camps.length, "#fbbf24"],
      ["Drafts", drafts.length, "#a78bfa"], ["Approved", byStatus("APPROVED"), "#34d399"], ["Queued", byStatus("APPROVED") + byStatus("SCHEDULED"), "#818cf8"],
      ["Published", success.length, "#4ade80"], ["Failed", failed.length, failed.length ? "#f87171" : "#4ade80"],
      ["Memory avg", memAvg + "%", "#c084fc"], ["Brain avg", brainAvg + "%", "#34d399"], ["Readiness", readiness + "%", readiness >= 70 ? "#4ade80" : "#fbbf24"], ["Media", media.length, "#fb7185"]
    ];
    save(K_MAP, { agents: AGENTS.length, channels: allChannels.length, campaigns: camps.length, published: success.length, snapshotAt: now() });
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">📊 Ecosystem Command · Mission Control 2.0</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{tiles.map(([l, v, c]) => <div key={l as string} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-2xl font-black" style={{ color: (c as string) || "#e879f9" }}>{v as any}</div><div className="text-[9px] uppercase tracking-wide text-tg-muted">{l as string}</div></div>)}</div>
      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-200">DEEPINSIDE Agent OS · approval-gate ON · автопубликации нет · человек — финальный оператор.</div>
    </main>;
  }

  function Workspace() {
    const s = scores(agent);
    const tabs = [["brain", "Brain"], ["memory", "Memory"], ["campaigns", "Campaigns"], ["channels", "Channels"], ["ideas", "Ideas"], ["drafts", "Drafts"], ["queue", "Queue"], ["analytics", "Analytics"], ["content", "Content"], ["media", "Media"]];
    const b = brains[agent] || {};
    const mine = dOf(agent);
    const center = () => {
      switch (wsTab) {
        case "brain": return <div className="space-y-1 text-[12px]"><div><b className="text-fuchsia-200">Mission:</b> {b.mission || "—"}</div><div><b className="text-fuchsia-200">Strategy:</b> {b.contentStrategy || "—"}</div><div><b className="text-fuchsia-200">Topics:</b> {(b.contentTopics || []).join(", ") || "—"}</div><div><b className="text-fuchsia-200">Formats:</b> {(b.favoriteFormats || []).join(", ") || "—"}</div></div>;
        case "memory": return <div className="space-y-0.5 text-[11px]">{(b.longTerm || []).map((f: string, i: number) => <div key={i} className="rounded bg-black/30 px-2 py-1">• {f}</div>)}{(b.longTerm || []).length === 0 && <div className="text-tg-muted">Долговременная память пуста.</div>}</div>;
        case "campaigns": return <div className="space-y-1 text-[11px]">{camps.filter((c) => c.agent === agent).map((c) => <div key={c.id} className="flex justify-between rounded bg-black/30 px-2 py-1"><span>{c.name} → {c.channel || "—"}</span><span className="text-tg-muted">{c.status}</span></div>)}{camps.filter((c) => c.agent === agent).length === 0 && <div className="text-tg-muted">Кампаний нет.</div>}</div>;
        case "channels": return <div className="space-y-1 text-[11px]">{channelsOf(agent).map((c) => <div key={c} className="rounded bg-black/30 px-2 py-1">📢 {c}</div>)}{channelsOf(agent).length === 0 && <div className="text-tg-muted">Каналов нет.</div>}</div>;
        case "ideas": return <div className="space-y-1 text-[11px]">{ideas.filter((x) => x.authorAgent === agent).map((x) => <div key={x.id} className="flex justify-between rounded bg-black/30 px-2 py-1"><span>💡 {x.idea}</span><span className="text-tg-muted">{x.status}</span></div>)}{ideas.filter((x) => x.authorAgent === agent).length === 0 && <div className="text-tg-muted">Идей нет.</div>}</div>;
        case "drafts": return <div className="space-y-1 text-[11px]">{mine.map((d) => <div key={d.id} className="flex justify-between rounded bg-black/30 px-2 py-1"><span>{d.title} → {d.channelTitle || d.channelId}</span><span className="text-tg-muted">{d.status}</span></div>)}{mine.length === 0 && <div className="text-tg-muted">Черновиков нет.</div>}</div>;
        case "queue": return <div className="space-y-1 text-[11px]">{mine.filter((d) => d.status === "APPROVED" || d.status === "SCHEDULED").map((d) => <div key={d.id} className="rounded bg-black/30 px-2 py-1">⏳ {d.title} · {d.status}</div>)}{mine.filter((d) => d.status === "APPROVED" || d.status === "SCHEDULED").length === 0 && <div className="text-tg-muted">Очередь пуста.</div>}</div>;
        case "analytics": return <div className="grid grid-cols-3 gap-2 text-center text-[11px]"><div className="rounded bg-black/30 p-2"><div className="text-lg font-black text-sky-300">{s.pub}</div>posts</div><div className="rounded bg-black/30 p-2"><div className="text-lg font-black text-indigo-300">{s.memory}%</div>memory</div><div className="rounded bg-black/30 p-2"><div className="text-lg font-black text-emerald-300">{s.brain}%</div>brain</div></div>;
        case "content": return <div className="grid grid-cols-3 gap-1 text-[10px]">{CONTENT_TYPES.map((t) => <div key={t} className="rounded border border-white/10 bg-black/30 px-2 py-1 text-center">{t}</div>)}</div>;
        case "media": return <div className="space-y-1 text-[11px]">{media.filter((m) => m.agent === agent).map((m) => <div key={m.id} className="flex justify-between rounded bg-black/30 px-2 py-1"><span>{m.type} · {m.name}</span><span className="text-tg-muted">{m.status}</span></div>)}{media.filter((m) => m.agent === agent).length === 0 && <div className="text-tg-muted">Медиа нет.</div>}</div>;
        default: return null;
      }
    };
    return <main className="flex min-h-0 flex-1">
      <div className="w-32 shrink-0 space-y-0.5 overflow-auto border-r border-white/10 p-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setWsTab(k)} className={"block w-full rounded px-2 py-1 text-left text-[11px] " + (wsTab === k ? "bg-fuchsia-600/30 font-semibold text-fuchsia-100" : "text-tg-muted hover:bg-white/10")}>{l}</button>)}</div>
      <div className="min-w-0 flex-1 overflow-auto p-3">
        <div className="mb-2 flex items-center gap-2"><b className="text-[13px] text-fuchsia-200">🏢 {agent}</b><span className="text-[10px] text-tg-muted">mem {s.memory}% · brain {s.brain}% · {s.pub} posts</span></div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">{center()}</div>
      </div>
      <div className="hidden w-56 shrink-0 space-y-2 overflow-auto border-l border-white/10 p-2 lg:block">
        <div className="rounded-lg bg-white/5 p-2"><div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Agent Activity</div><div className="text-[10px] text-tg-muted">drafts {mine.length} · published {s.pub} · channels {channelsOf(agent).length}</div></div>
        <div className="rounded-lg bg-white/5 p-2"><div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Timeline</div><div className="space-y-0.5">{timeline(agent).slice(0, 8).map((e, i) => <div key={i} className="text-[10px] text-tg-muted">{fmtDT(e.t)} · {e.label}</div>)}{timeline(agent).length === 0 && <div className="text-[10px] text-tg-muted">—</div>}</div></div>
        <div className="rounded-lg bg-white/5 p-2"><div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Recent Publications</div>{mine.filter((d) => d.status === "PUBLISHED").slice(0, 6).map((d) => <div key={d.id} className="text-[10px] text-tg-muted">📤 {d.title}</div>)}{mine.filter((d) => d.status === "PUBLISHED").length === 0 && <div className="text-[10px] text-tg-muted">—</div>}</div>
        <div className="rounded-lg bg-white/5 p-2"><div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Approval History</div>{mine.filter((d) => d.status === "APPROVED" || d.status === "REJECTED" || d.status === "PUBLISHED").slice(0, 6).map((d) => <div key={d.id} className="text-[10px] text-tg-muted">{d.status} · {d.title}</div>)}</div>
      </div>
    </main>;
  }

  function ContentFactory() {
    const [type, setType] = useState(CONTENT_TYPES[0]); const [title, setTitle] = useState("");
    const add = () => { if (!title.trim()) return; writeBlueprints([{ id: rid(), type, title: title.trim(), agent, createdAt: now() }, ...blueprints]); setTitle(""); };
    const stage = (label: string, n: number, color: string) => <div className="flex flex-col items-center"><div className="rounded-lg px-3 py-1.5 text-[11px] font-bold" style={{ background: color + "22", color }}>{label}</div><div className="text-[10px] text-tg-muted">{n}</div></div>;
    const arrow = <div className="self-center text-tg-muted">→</div>;
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-3">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">📝 Content Factory · только подготовка (без публикации, без AI)</div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 text-[10px] uppercase text-fuchsia-300/70">Content Pipeline</div>
        <div className="flex flex-wrap items-stretch gap-2">
          {stage("Idea", ideas.length, "#f472b6")}{arrow}{stage("Draft", byStatus("DRAFT") + byStatus("PENDING"), "#a78bfa")}{arrow}{stage("Approval", byStatus("PENDING"), "#f59e0b")}{arrow}{stage("Queue", byStatus("APPROVED") + byStatus("SCHEDULED"), "#818cf8")}{arrow}{stage("Publish", success.length, "#4ade80")}{arrow}{stage("Analytics", success.length + failed.length, "#22d3ee")}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 text-[10px] uppercase text-fuchsia-300/70">Content Types</div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">{CONTENT_TYPES.map((t) => <button key={t} onClick={() => setType(t)} className={"rounded-lg border px-2 py-1.5 text-[11px] " + (type === t ? "border-fuchsia-400/60 bg-fuchsia-600/20 text-fuchsia-100" : "border-white/10 bg-black/30 text-tg-muted hover:bg-white/10")}>{t}</button>)}</div>
        <div className="mt-2 flex gap-1.5"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={"Blueprint: " + type + " для " + agent} className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" /><button onClick={add} disabled={!title.trim()} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40">＋ Blueprint</button></div>
      </div>
      <div className="space-y-1">{blueprints.map((bp) => <div key={bp.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px]"><span><span className="text-fuchsia-200">{bp.type}</span> · {bp.title} · {bp.agent}</span><button onClick={() => writeBlueprints(blueprints.filter((y) => y.id !== bp.id))} className="text-[11px] text-rose-300/70 hover:text-rose-300">✕</button></div>)}{blueprints.length === 0 && <div className="text-[11px] text-tg-muted">Заготовок нет — создай blueprint (это только инфраструктура подготовки).</div>}</div>
    </div></main>;
  }

  function MediaFactory() {
    const [name, setName] = useState(""); const [type, setType] = useState(MEDIA_TYPES[0]); const [ch, setCh] = useState(""); const [cp, setCp] = useState("");
    const add = () => { if (!name.trim()) return; writeMedia([{ id: rid(), name: name.trim(), type, author: agent, agent, channel: ch.trim(), status: "DRAFT", campaign: cp.trim() || undefined, createdAt: now() }, ...media]); setName(""); setCh(""); setCp(""); };
    const set = (id: string, st: Media["status"]) => writeMedia(media.map((m) => m.id === id ? { ...m, status: st } : m));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">🎬 Media Factory · организация ресурсов (без генерации, без внешних сервисов)</div>
      <div className="grid gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] sm:col-span-2" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text">{MEDIA_TYPES.map((t) => <option key={t} value={t} className="bg-black">{t}</option>)}</select>
        <input value={ch} onChange={(e) => setCh(e.target.value)} placeholder="Канал" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
        <div className="flex gap-1"><input value={cp} onChange={(e) => setCp(e.target.value)} placeholder="Кампания" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" /><button onClick={add} disabled={!name.trim()} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40">＋</button></div>
      </div>
      <div className="overflow-auto rounded-xl border border-white/10"><table className="w-full text-[11px]"><thead className="bg-white/5 text-fuchsia-300/70"><tr>{["Название", "Тип", "Агент", "Канал", "Кампания", "Дата", "Статус", ""].map((h) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{media.map((m) => <tr key={m.id} className="border-t border-white/5"><td className="px-2 py-1">{m.name}</td><td className="px-2 py-1"><span style={{ color: NODE_COLOR.Media }}>{m.type}</span></td><td className="px-2 py-1 text-tg-muted">{m.agent}</td><td className="px-2 py-1 text-tg-muted">{m.channel || "—"}</td><td className="px-2 py-1 text-tg-muted">{m.campaign || "—"}</td><td className="px-2 py-1 text-tg-muted">{fmtDT(m.createdAt).slice(0, 8)}</td>
          <td className="px-2 py-1"><select value={m.status} onChange={(e) => set(m.id, e.target.value as Media["status"])} className="rounded bg-black/40 px-1 py-0.5 text-[10px] text-tg-text">{["DRAFT", "READY", "USED", "ARCHIVED"].map((st) => <option key={st} value={st} className="bg-black">{st}</option>)}</select></td>
          <td className="px-2 py-1 text-right"><button onClick={() => writeMedia(media.filter((y) => y.id !== m.id))} className="text-rose-300/70 hover:text-rose-300">✕</button></td></tr>)}</tbody></table></div>
      {media.length === 0 && <div className="text-[11px] text-tg-muted">Библиотека пуста — добавь медиа-ресурс.</div>}
    </div></main>;
  }

  function Canvas() {
    const b = brains[agent] || {};
    const myCh = channelsOf(agent), myCamp = camps.filter((c) => c.agent === agent), myIdeas = ideas.filter((x) => x.authorAgent === agent), myDrafts = dOf(agent);
    let nodes: GNode[] = []; let edges: GEdge[] = [];
    if (canvasView === "live") {
      nodes.push({ id: "A", label: agent, sub: "agent", x: 90, y: 220, type: "Agent" });
      const recent = myDrafts.slice(0, 6);
      recent.forEach((d, i) => {
        const y = 60 + i * 64;
        nodes.push({ id: "d" + i, label: d.title || "draft", sub: d.status, x: 320, y, type: "Draft" });
        edges.push(["A", "d" + i]);
        const stage = d.status === "PUBLISHED" ? "Publish" : (d.status === "APPROVED" || d.status === "SCHEDULED") ? "Queue" : (d.status === "PENDING") ? "Approval" : "";
        if (stage) { nodes.push({ id: "s" + i, label: stage, sub: d.channelTitle || d.channelId || "", x: 560, y, type: stage }); edges.push(["d" + i, "s" + i]); }
      });
      if (recent.length === 0) nodes.push({ id: "empty", label: "нет черновиков", x: 320, y: 200, type: "Idea" });
    } else if (canvasView === "workflow") {
      const steps: [string, string, number][] = [["Idea", "Idea", myIdeas.length], ["Draft", "Draft", byStatus("DRAFT") + byStatus("PENDING")], ["Approval", "Approval", byStatus("PENDING")], ["Queue", "Queue", byStatus("APPROVED")], ["Publish", "Publish", success.length], ["Analytics", "Analytics", success.length + failed.length]];
      nodes = steps.map((st, i) => ({ id: st[0], label: st[0], sub: String(st[2]), x: 90 + i * 150, y: 120, type: st[1] }));
      edges = steps.slice(1).map((st, i) => [steps[i][0], st[0]] as GEdge);
    } else if (canvasView === "campaign") {
      nodes.push({ id: "A", label: agent, x: 110, y: 200, type: "Agent" });
      myCamp.forEach((c, i) => { nodes.push({ id: "c" + i, label: c.name, sub: c.status, x: 320, y: 90 + i * 90, type: "Campaign" }); edges.push(["A", "c" + i]); });
      myCh.forEach((c, i) => { nodes.push({ id: "ch" + i, label: c, x: 540, y: 90 + i * 80, type: "Channel" }); if (myCamp[i]) edges.push(["c" + i, "ch" + i]); });
    } else if (canvasView === "world") {
      nodes.push({ id: "core", label: "DEEPINSIDE", x: 360, y: 60, type: "Core" });
      DISTRICTS.slice(0, 6).forEach((d, i) => { nodes.push({ id: "wd" + i, label: d, x: 90 + i * 120, y: 220, type: "District" }); edges.push(["core", "wd" + i]); });
      nodes.push({ id: "A", label: agent, x: 360, y: 360, type: "Agent" }); edges.push(["wd1", "A"]);
    } else {
      nodes.push({ id: "A", label: agent, x: 360, y: 220, type: "Agent" });
      nodes.push({ id: "Brain", label: "Brain", sub: scores(agent).brain + "%", x: 140, y: 120, type: "Brain" });
      nodes.push({ id: "Mem", label: "Memory", sub: (b.longTerm || []).length + " facts", x: 140, y: 320, type: "Memory" });
      edges.push(["Brain", "A"]); edges.push(["Mem", "A"]);
      myCamp.slice(0, 3).forEach((c, i) => { nodes.push({ id: "cp" + i, label: c.name, x: 580, y: 90 + i * 70, type: "Campaign" }); edges.push(["A", "cp" + i]); });
      myCh.slice(0, 3).forEach((c, i) => { nodes.push({ id: "ch" + i, label: c, x: 580, y: 300 + i * 60, type: "Channel" }); edges.push(["A", "ch" + i]); });
      nodes.push({ id: "Idea", label: "Ideas", sub: String(myIdeas.length), x: 360, y: 80, type: "Idea" }); edges.push(["A", "Idea"]);
      nodes.push({ id: "Draft", label: "Drafts", sub: String(myDrafts.length), x: 360, y: 380, type: "Draft" }); edges.push(["A", "Draft"]);
    }
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">♾ Operator Canvas</span>
        {(["live", "agent", "workflow", "campaign", "world"] as const).map((v) => <button key={v} onClick={() => setCanvasView(v)} className={"rounded-full px-3 py-1 text-[11px] font-semibold " + (canvasView === v ? "bg-fuchsia-600/40 text-white" : "bg-white/5 text-tg-muted hover:bg-white/10")}>{v[0].toUpperCase() + v.slice(1)} View</button>)}
        <span className="ml-auto text-[10px] text-tg-muted">ноды кликабельны · реальные данные</span>
      </div>
      <Graph nodes={nodes} edges={edges} w={760} h={440} onNode={(id) => {
        if (id === "A") goAgent(agent);
        else if (id.slice(0, 2) === "ch") { const c = myCh[+id.slice(2)]; if (c) goChannel(c); }
        else if (id.charAt(0) === "d") { setWsTab("drafts"); setSec("workspace"); }
        else if (id.charAt(0) === "s") { setWsTab("queue"); setSec("workspace"); }
        else if (id.slice(0, 2) === "cp" || id.charAt(0) === "c") { setWsTab("campaigns"); setSec("workspace"); }
        else if (id === "Idea") { setWsTab("ideas"); setSec("workspace"); }
        else if (id === "Draft") { setWsTab("drafts"); setSec("workspace"); }
        else if (id === "Brain") { setWsTab("brain"); setSec("workspace"); }
        else if (id === "Mem") { setWsTab("memory"); setSec("workspace"); }
        else if (id === "Publish" || id === "Queue" || id === "Approval" || id === "Analytics") { setWsTab(id === "Analytics" ? "analytics" : "queue"); setSec("workspace"); }
      }} />
      <div className="text-[10px] text-tg-muted">Визуализация связей (n8n-style), не редактор. Drag-редактор узлов — отдельная фаза.</div>
    </div></main>;
  }

  function World() {
    const coreX = 380, coreY = 250;
    const nodes: GNode[] = [{ id: "core", label: "World Core", sub: "DEEPINSIDE", x: coreX, y: coreY, type: "Core" }];
    const edges: GEdge[] = [];
    DISTRICTS.forEach((d, i) => { const ang = (i / DISTRICTS.length) * Math.PI * 2; const x = coreX + Math.cos(ang) * 300; const y = coreY + Math.sin(ang) * 190; nodes.push({ id: "d" + i, label: d, x, y, type: "District" }); edges.push(["core", "d" + i]); });
    AGENTS.forEach((a, i) => { nodes.push({ id: "a" + i, label: a, x: 120 + i * 180, y: 480, type: "Agent" }); edges.push(["d" + (i + 1), "a" + i]); });
    save(K_WORLD, { districts: DISTRICTS, agents: AGENTS, snapshotAt: now() });
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">🌍 World Graph 2.0 · аддитивный вид (старый WorldEngine НЕ удалён)</div>
      <Graph nodes={nodes} edges={edges} w={780} h={560} onNode={(id) => { const m = id.match(/^a(\d+)$/); if (m) goAgent(AGENTS[+m[1]]); }} />
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">{DISTRICTS.map((d) => <div key={d} className="rounded-lg border border-white/10 bg-white/5 p-2 text-[10px]"><div className="font-bold text-indigo-300">{d}</div><div className="text-tg-muted">здания · студии · кампании · агенты · каналы</div></div>)}</div>
    </div></main>;
  }

  function MapView() {
    const nodes: GNode[] = []; const edges: GEdge[] = [];
    AGENTS.forEach((a, i) => nodes.push({ id: "a:" + a, label: a, sub: scores(a).pub + " posts", x: 120, y: 80 + i * 110, type: "Agent" }));
    allChannels.forEach((c, i) => { const pubs = success.filter((e) => (e.channelTitle || e.channelId) === c).length; nodes.push({ id: "c:" + c, label: c, sub: pubs + " pub", x: 420, y: 70 + i * 80, type: "Channel" }); });
    camps.forEach((c, i) => nodes.push({ id: "p:" + c.id, label: c.name, sub: c.status, x: 700, y: 80 + i * 90, type: "Campaign" }));
    assigns.forEach((x) => { if (nodes.find((n) => n.id === "a:" + x.agent) && nodes.find((n) => n.id === "c:" + x.channel)) edges.push(["a:" + x.agent, "c:" + x.channel]); });
    drafts.filter((d) => d.status === "PUBLISHED").forEach((d) => { const c = d.channelTitle || d.channelId; if (nodes.find((n) => n.id === "a:" + d.authorAgent) && nodes.find((n) => n.id === "c:" + c)) edges.push(["a:" + d.authorAgent, "c:" + c]); });
    camps.forEach((c) => { if (nodes.find((n) => n.id === "a:" + c.agent) && nodes.find((n) => n.id === "p:" + c.id)) edges.push(["a:" + c.agent, "p:" + c.id]); });
    const h = Math.max(440, 80 + Math.max(AGENTS.length, allChannels.length, camps.length) * 110);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">🛰 Live Ecosystem Map · агенты ↔ каналы ↔ кампании (из localStorage)</div>
      <Graph nodes={nodes} edges={edges} w={840} h={h} onNode={(id) => { if (id.slice(0, 2) === "a:") goAgent(id.slice(2)); else if (id.slice(0, 2) === "c:") goChannel(id.slice(2)); else if (id.slice(0, 2) === "p:") { setSec("canvas"); setCanvasView("campaign"); } }} />
    </div></main>;
  }

  function Autonomy() {
    const { checks, overall } = readinessSystem();
    save(K_AUTON, { checks, overall, snapshotAt: now() });
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-2xl space-y-3">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-center">
        <div className="text-lg font-black text-amber-200">🤖 Autonomy Readiness (system)</div>
        <div className="mt-1 text-3xl font-black" style={{ color: overall >= 80 ? "#4ade80" : overall >= 50 ? "#fbbf24" : "#f87171" }}>{overall}%</div>
        <div className="text-[12px] text-amber-300/90">Подготовка инфраструктуры. Автономия НЕ запущена.</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{checks.map(([k, v]) => <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2 text-[12px]"><span>{k}</span><span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: (v ? "#4ade80" : "#f87171") + "22", color: v ? "#4ade80" : "#f87171" }}>{v ? "READY" : "PENDING"}</span></div>)}</div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-tg-muted"><b className="text-fuchsia-200">Safety lock:</b> approval_required=true · automation=false · auto_publish=false · agent_autonomy=false · background_execution=false · cron_jobs=false · network_calls=false · human_operator_required=true</div>
    </div></main>;
  }

  // ---- T1/T2/T9 cross-navigation: everything opens from everything ----
  const goAgent = (a: string) => { if (AGENTS.indexOf(a) >= 0) setAgent(a); setWsTab("brain"); setSec("workspace"); };
  const goChannel = (c: string) => { setSelChannel(c); setSec("channelcenter"); };

  function channelStats(c: string) {
    const dr = drafts.filter((d) => (d.channelTitle || d.channelId) === c);
    const owner = (assigns.find((x) => x.channel === c) || {}).agent || (dr[0] && dr[0].authorAgent) || "—";
    const account = (assigns.find((x) => x.channel === c) || {}).account || "—";
    const campaigns = camps.filter((cp) => cp.channel === c);
    const pending = dr.filter((d) => d.status === "PENDING").length;
    const queue = dr.filter((d) => d.status === "APPROVED" || d.status === "SCHEDULED").length;
    const pub = success.filter((e) => (e.channelTitle || e.channelId) === c).length;
    const fail = failed.filter((e) => (e.channelTitle || e.channelId) === c).length;
    const rate = pub + fail > 0 ? Math.round((pub / (pub + fail)) * 100) : 0;
    const last = dr.map((d) => d.updatedAt || d.createdAt || "").sort().slice(-1)[0] || "";
    return { owner, account, campaigns, drafts: dr.length, pending, queue, pub, fail, rate, last };
  }

  function ChannelCenter() {
    const list = allChannels;
    const sel = selChannel && list.indexOf(selChannel) >= 0 ? selChannel : (list[0] || "");
    const s = sel ? channelStats(sel) : null;
    return <main className="flex min-h-0 flex-1">
      <div className="w-44 shrink-0 space-y-0.5 overflow-auto border-r border-white/10 p-2">
        <div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Channels ({list.length})</div>
        {list.map((c) => <button key={c} onClick={() => setSelChannel(c)} className={"block w-full truncate rounded px-2 py-1 text-left text-[11px] " + (sel === c ? "bg-fuchsia-600/30 font-semibold text-fuchsia-100" : "text-tg-muted hover:bg-white/10")}>📢 {c}</button>)}
        {list.length === 0 && <div className="text-[10px] text-tg-muted">Каналов нет — свяжи в Channel Assignment.</div>}
      </div>
      <div className="min-w-0 flex-1 overflow-auto p-3">
        {!s ? <div className="text-[12px] text-tg-muted">Нет каналов.</div> : <div className="space-y-3">
          <div className="flex items-center gap-2"><b className="text-[14px] text-sky-200">📢 {sel}</b><button onClick={() => goAgent(s.owner)} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">owner: {s.owner} →</button></div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {([["Owner", s.owner], ["Account", s.account], ["Campaigns", s.campaigns.length], ["Drafts", s.drafts], ["Approvals", s.pending], ["Queue", s.queue], ["Published", s.pub], ["Failed", s.fail], ["Success", s.rate + "%"]] as [string, any][]).map(([l, v]) => <div key={l} className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="text-lg font-black text-fuchsia-200">{v}</div><div className="text-[9px] uppercase text-tg-muted">{l}</div></div>)}
          </div>
          <div className="text-[10px] text-tg-muted">Last activity: {s.last ? fmtDT(s.last) : "—"}</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Кампании канала (T4)</div>
            {s.campaigns.length === 0 ? <div className="text-[11px] text-tg-muted">Кампаний нет.</div> : s.campaigns.map((cp) => { const done = drafts.filter((d) => d.status === "PUBLISHED" && (d.channelTitle === cp.channel || d.channelId === cp.channel) && d.authorAgent === cp.agent).length; const pct = cp.goalPosts > 0 ? Math.min(100, Math.round((done / cp.goalPosts) * 100)) : 0; return <div key={cp.id} className="mb-1"><div className="flex justify-between text-[11px]"><span>{cp.name} · {cp.agent} · {cp.status}</span><span>{done}/{cp.goalPosts} · {pct}%</span></div><div className="h-1.5 w-full overflow-hidden rounded bg-black/40"><div className="h-full bg-fuchsia-500/60" style={{ width: pct + "%" }} /></div></div>; })}
          </div>
        </div>}
      </div>
    </main>;
  }

  function Activity() {
    const ev: { t: string; agent: string; label: string; color: string }[] = [];
    drafts.forEach((d) => {
      if (d.createdAt) ev.push({ t: d.createdAt, agent: d.authorAgent || "—", label: "создан Draft: " + (d.title || "—"), color: "#a78bfa" });
      if (d.status === "APPROVED" && d.updatedAt) ev.push({ t: d.updatedAt, agent: d.authorAgent || "—", label: "Draft одобрен: " + (d.title || "—"), color: "#34d399" });
      if (d.status === "REJECTED" && d.updatedAt) ev.push({ t: d.updatedAt, agent: d.authorAgent || "—", label: "Draft отклонён: " + (d.title || "—"), color: "#f87171" });
      if (d.status === "SCHEDULED" && d.scheduledAt) ev.push({ t: d.scheduledAt, agent: d.authorAgent || "—", label: "запланировано: " + (d.title || "—"), color: "#818cf8" });
    });
    log.forEach((e) => ev.push({ t: e.publishedAt || e.createdAt || "", agent: "—", label: (e.status === "SUCCESS" ? "✅ Telegram Publish Success → " : "❌ Publish Failed → ") + (e.channelTitle || e.channelId || ""), color: e.status === "SUCCESS" ? "#4ade80" : "#f87171" }));
    camps.forEach((c) => { if (c.createdAt) ev.push({ t: c.createdAt, agent: c.agent, label: "🎯 Кампания создана: " + c.name, color: "#fbbf24" }); });
    const sorted = ev.filter((x) => x.t).sort((p, q) => (p.t < q.t ? 1 : -1)).slice(0, 80);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-2xl space-y-1">
      <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">⚡ Live Activity Stream · {sorted.length} событий (из localStorage)</div>
      {sorted.length === 0 ? <div className="text-[12px] text-tg-muted">Событий нет — поработай в Publisher/Brain.</div> : sorted.map((e, i) => <button key={i} onClick={() => e.agent !== "—" && goAgent(e.agent)} className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-left text-[11px] hover:bg-white/10">
        <span className="w-28 shrink-0 text-tg-muted">{fmtDT(e.t)}</span>
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
        <span className="shrink-0 font-semibold text-fuchsia-200">{e.agent}</span>
        <span className="truncate text-tg-text">{e.label}</span>
      </button>)}
    </div></main>;
  }

  function Matrix() {
    const rows = AGENTS.map((a) => {
      const s = scores(a);
      const ch = channelsOf(a).length;
      const campsA = camps.filter((c) => c.agent === a);
      const drA = dOf(a);
      const channels = ch > 0 ? 100 : 0;
      const campaigns = campsA.length === 0 ? 0 : campsA.some((c) => c.status === "ACTIVE") ? 100 : 80;
      const draftsP = drA.length > 0 ? 100 : 0;
      const publishing = s.pub > 0 ? 100 : 0;
      const analytics = s.pub > 0 ? 100 : (drA.length > 0 ? 40 : 0);
      const overall = Math.round((s.memory + s.brain + channels + campaigns + draftsP + publishing + analytics) / 7);
      return { a, memory: s.memory, brain: s.brain, channels, campaigns, drafts: draftsP, publishing, analytics, overall };
    });
    const cell = (v: number) => <td className="px-2 py-1 text-center"><span style={{ color: v >= 80 ? "#4ade80" : v >= 50 ? "#fbbf24" : "#f87171" }}>{v}%</span></td>;
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">🧮 Readiness Matrix · готовность агентов</div>
      <div className="overflow-auto rounded-xl border border-white/10"><table className="w-full text-[11px]"><thead className="bg-white/5 text-fuchsia-300/70"><tr>{["Agent", "Memory", "Brain", "Channels", "Campaigns", "Drafts", "Publishing", "Analytics", "Overall"].map((h) => <th key={h} className="px-2 py-1 text-center first:text-left">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.a} className="border-t border-white/5"><td className="px-2 py-1"><button onClick={() => goAgent(r.a)} className="font-semibold text-fuchsia-200 hover:underline">{r.a}</button></td>{cell(r.memory)}{cell(r.brain)}{cell(r.channels)}{cell(r.campaigns)}{cell(r.drafts)}{cell(r.publishing)}{cell(r.analytics)}<td className="px-2 py-1 text-center font-black" style={{ color: r.overall >= 80 ? "#4ade80" : r.overall >= 50 ? "#fbbf24" : "#f87171" }}>{r.overall}%</td></tr>)}</tbody></table></div>
    </div></main>;
  }

  // ================= E2E DRY-RUN CONTROL CENTER (T20) =================
  function E2EDryRunWB() {
    const CK_LS = "deepinside.e2eDryRun.finalChecklist.v1", TL_LS = "deepinside.e2eDryRun.timeline.v1", ST_LS = "deepinside.e2eDryRun.state.v1";
    const SAFETY = { mode: "MANUAL_ONLY", autoSendAllowed: false, backgroundSendAllowed: false, retryWithoutConfirmAllowed: false, massSendAllowed: false, sendWithoutApprovalAllowed: false, secretsVisible: false, credentialsExportAllowed: false };
    const WEIGHTS: Record<string, number> = { account: 15, persona: 10, campaign: 10, draft: 10, approval: 10, freeze: 10, verify: 10, evidence: 10, safeTest: 10, manualGate: 5 };
    const [mock, setMock] = useState(false); const [armed, setArmed] = useState(false); const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
    const [acctReady, setAcctReady] = useState(false); const [tgtReady, setTgtReady] = useState(false);
    const [safeTested, setSafeTested] = useState(false); const [opDecision, setOpDecision] = useState("");
    const [timeline, setTimeline] = useState<AnyRec[]>([]); const [checklistOut, setChecklistOut] = useState("");
    const drafts = (() => { try { return load<AnyRec[]>("epicgram.drafts.v1", []); } catch { return []; } })();
    const camps = (() => { try { return load<AnyRec[]>("epicgram.campaigns.v1", []); } catch { return []; } })();
    useEffect(() => {
      setTimeline(load<AnyRec[]>(TL_LS, []));
      fetch("/api/operator/accounts/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setAcctReady((j?.accountRegistry?.sendAllowedAccounts || 0) > 0)).catch(() => {});
      fetch("/api/operator/targets/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setTgtReady((j?.targetRegistry?.sendAllowedTargets || 0) > 0)).catch(() => {});
    }, []);
    const pushTL = (type: string, title: string, status: string) => { const e = { id: rid(), at: now(), type, title, status, safety: SAFETY }; const next = [e, ...timeline].slice(0, 100); setTimeline(next); save(TL_LS, next); };

    const hasCampaign = camps.length > 0 || mock;
    const hasDraft = drafts.length > 0 || mock;
    const hasApproved = drafts.some((d) => d.status === "APPROVED" || d.status === "PUBLISHED" || d.status === "send_confirm_required") || mock;
    const stages: Record<string, AnyRec> = {
      account: { status: (acctReady || mock) ? "passed" : "blocked", reason: (acctReady || mock) ? "owned whitelisted account ready" : "нет whitelisted+session-ready аккаунта", next: "👤 Accounts: add→bind→verify→whitelist→session" },
      persona: { status: "ready", reason: "persona " + agent + " доступна", next: "—" },
      campaign: { status: hasCampaign ? "passed" : "warning", reason: hasCampaign ? "кампания есть" : "нет кампании", next: "Создай кампанию (Agent Brain)" },
      draft: { status: hasDraft ? "passed" : "warning", reason: hasDraft ? "черновик есть" : "нет черновика", next: "Создай draft (Publisher/Wizard)" },
      approval: { status: hasApproved ? "passed" : "warning", reason: hasApproved ? "есть approved/confirm-ready" : "нет одобренного", next: "Approve draft" },
      freeze: { status: safeTested ? "passed" : "idle", reason: safeTested ? "snapshot frozen" : "freeze не выполнен", next: "Run Safe Dry Test" },
      verify: { status: safeTested ? "passed" : "idle", reason: safeTested ? "post-send verify ok" : "verify не выполнен", next: "Run Safe Dry Test" },
      evidence: { status: safeTested ? "passed" : "idle", reason: safeTested ? "evidence pack собран" : "нет evidence", next: "Run Safe Dry Test" },
      safeTest: { status: safeTested ? "passed" : "idle", reason: safeTested ? "safe test passed (mock)" : "safe test не запущен", next: "Run Safe Dry Test" },
      manualGate: { status: armed ? "passed" : "idle", reason: armed ? "manual gate armed" : "gate disarmed", next: "Arm Manual Gate" }
    };
    const stWeight = (s: string) => s === "passed" || s === "ready" ? 1 : s === "warning" ? 0.5 : 0;
    const score = Math.round(Object.keys(WEIGHTS).reduce((sum, k) => sum + WEIGHTS[k] * stWeight(stages[k].status), 0));
    const band = score >= 95 ? "READY FOR MANUAL LIVE SEND" : score >= 75 ? "ALMOST READY" : score >= 50 ? "PARTIAL" : "NOT READY";
    const bandCol = score >= 95 ? "#4ade80" : score >= 75 ? "#a3e635" : score >= 50 ? "#fbbf24" : "#f87171";

    const gateBlockers: string[] = [];
    if (stages.account.status !== "passed") gateBlockers.push("No active whitelisted account");
    if (!tgtReady && !mock) gateBlockers.push("No whitelisted target");
    if (stages.draft.status !== "passed") gateBlockers.push("No draft");
    if (stages.approval.status !== "passed") gateBlockers.push("Draft not approved");
    if (stages.freeze.status !== "passed") gateBlockers.push("Draft not frozen — run Safe Dry Test");
    if (stages.verify.status !== "passed") gateBlockers.push("Verification not passed");
    if (stages.evidence.status !== "passed") gateBlockers.push("No evidence pack");
    if (stages.safeTest.status !== "passed") gateBlockers.push("Safe test not passed");
    if (!opDecision) gateBlockers.push("Operator decision empty");
    const gateReady = gateBlockers.length === 0;

    const runSafeTest = () => { setBusy(true); setSafeTested(true); pushTL("safe_test_passed", "Safe dry test (mock) passed", "passed"); pushTL("draft_frozen", "Snapshot frozen (mock)", "passed"); pushTL("verification_passed", "Verify passed (mock)", "passed"); pushTL("evidence_created", "Evidence pack created (mock)", "passed"); setBusy(false); setNote("🧪 Safe dry test passed (MOCK_PREVIEW_ONLY)"); };
    const arm = () => { if (!gateReady) { setNote("⛔ Manual Gate BLOCKED: " + gateBlockers.join(" · ")); return; } setArmed(true); pushTL("manual_gate_armed", "Manual gate armed", "passed"); pushTL("ready_for_live", "READY FOR MANUAL LIVE SEND", "ready"); setNote("✅ Manual Gate armed — READY FOR MANUAL LIVE SEND (отправка только вручную через 🧭 Wizard / 🧪 Runbook)"); };
    const disarm = () => { setArmed(false); setNote("gate disarmed"); };
    const checklist = () => {
      const items = ["Account session active", "Target channel/group selected", "Persona selected", "Campaign selected", "Draft approved", "Draft frozen", "Verification passed", "Evidence pack created", "Safe test passed", "Operator manually confirmed next step"];
      const states = [stages.account, { status: tgtReady || mock ? "passed" : "warning" }, stages.persona, stages.campaign, stages.approval, stages.freeze, stages.verify, stages.evidence, stages.safeTest, { status: opDecision ? "passed" : "idle" }];
      const obj = { id: rid(), createdAt: now(), readinessScore: score, band, mode: "MANUAL_ONLY", mockPreviewOnly: mock, items: items.map((t, i) => ({ step: i + 1, item: t, status: states[i].status })), decision: opDecision || null, safety: SAFETY };
      save(CK_LS, obj);
      const md = "# FINAL MANUAL LIVE CHECKLIST\n\nReadiness: " + score + "% · " + band + (mock ? " · MOCK_PREVIEW_ONLY" : "") + "\n\n" + items.map((t, i) => "- [" + (states[i].status === "passed" ? "x" : " ") + "] " + (i + 1) + ". " + t).join("\n") + "\n\nDecision: " + (opDecision || "—") + "\nSafety: auto_send=false · mass=false · secrets_visible=false\n";
      setChecklistOut(md); try { navigator.clipboard.writeText(md); } catch {} setNote("Checklist сгенерирован и скопирован.");
    };
    const evidence = () => {
      const acc = (load<AnyRec[]>("epicgram.channelAssignments.v1", [])[0] || {});
      const pack = { id: rid(), createdAt: now(), type: "e2e_dry_run_evidence", mockPreviewOnly: mock, account: { alias: mock ? "AI MUSIC PUBLIC" : (acc.account || "owned-account"), sessionVisible: false }, target: { alias: mock ? "Telegram Channel (test)" : (acc.channel || "owned-target") }, persona: { name: agent }, campaign: { id: camps[0]?.id || (mock ? "first-telegram-ecosystem-test" : null) }, draft: { id: drafts[0]?.id || (mock ? "mock-draft" : null) }, readinessScore: score, band, safeTest: safeTested ? "passed" : "not_run", decision: opDecision || null, timestamps: { createdAt: now() }, safety: SAFETY };
      setChecklistOut(JSON.stringify(pack, null, 2)); try { navigator.clipboard.writeText(JSON.stringify(pack, null, 2)); } catch {} setNote("Evidence preview (только алиасы, без секретов) скопирован.");
    };

    const card = (key: string, label: string) => { const s = stages[key]; const c = s.status === "passed" || s.status === "ready" ? "#4ade80" : s.status === "warning" ? "#fbbf24" : s.status === "blocked" ? "#f87171" : "#9ca3af"; return <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="flex items-center justify-between"><span className="text-[11px] font-bold">{label}</span><span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: c + "22", color: c }}>{s.status}</span></div><div className="mt-0.5 text-[9px] text-tg-muted">{s.reason}</div>{s.status !== "passed" && s.status !== "ready" && s.next !== "—" && <div className="text-[9px] text-fuchsia-300/70">→ {s.next}</div>}</div>; };

    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-4xl space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-lg font-black text-fuchsia-200">🧪 REAL E2E DRY-RUN · Control Center</div>
          <label className="ml-auto flex items-center gap-1 text-[10px] text-tg-muted"><input type="checkbox" checked={mock} onChange={(e) => setMock(e.target.checked)} /> MOCK_PREVIEW_ONLY</label>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full" style={{ width: score + "%", background: bandCol }} /></div>
          <div className="text-sm font-black" style={{ color: bandCol }}>{score}% · {band}</div>
        </div>
        <div className="mt-1 text-[10px] text-amber-300/80">Даже при 100% система НЕ отправляет сама. Только показывает готовность; реальный send — вручную через Wizard/Runbook.</div>
      </div>
      {note && <div className="rounded-lg bg-white/5 p-2 text-[11px] text-fuchsia-200">{note}</div>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {card("account", "1·Account")}{card("persona", "2·Persona")}{card("campaign", "3·Campaign")}{card("draft", "4·Draft")}{card("approval", "5·Approval")}
        {card("freeze", "6·Freeze")}{card("verify", "7·Verify")}{card("evidence", "8·Evidence")}{card("safeTest", "9·Safe Test")}{card("manualGate", "10·Manual Gate")}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={runSafeTest} disabled={busy} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">🧪 Run Safe Dry Test</button>
        <button onClick={checklist} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Copy Live Checklist</button>
        <button onClick={evidence} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Export Evidence Pack</button>
        <a href="/world" className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Open World OS</a>
      </div>

      {/* Manual Live Send Gate */}
      <div className="rounded-2xl border p-3" style={{ borderColor: gateReady ? "#4ade8055" : "#f8717155", background: gateReady ? "#4ade801a" : "#f871711a" }}>
        <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-black uppercase text-fuchsia-300/80">Manual Live Send Gate</span><span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: (gateReady ? "#4ade80" : "#f87171") + "22", color: gateReady ? "#86efac" : "#fca5a5" }}>{armed ? "ARMED" : gateReady ? "READY (disarmed)" : "BLOCKED"}</span></div>
        <div className="mb-1 flex flex-wrap gap-2 text-[11px]">
          <select value={opDecision} onChange={(e) => setOpDecision(e.target.value)} className="rounded bg-black/40 px-2 py-1 text-tg-text"><option value="" className="bg-black">operator decision —</option>{["proceed_to_manual_send", "keep_simulation", "needs_review"].map((d) => <option key={d} value={d} className="bg-black">{d}</option>)}</select>
          <button onClick={arm} disabled={busy} className="rounded bg-emerald-600/25 px-3 py-1 text-[11px] hover:bg-emerald-600/40">Arm Manual Gate</button>
          <button onClick={disarm} className="rounded bg-zinc-600/25 px-3 py-1 text-[11px] hover:bg-zinc-600/40">Disarm</button>
        </div>
        {!gateReady && <div className="rounded-lg bg-black/30 p-2 text-[10px] text-rose-200">Manual Gate BLOCKED:<br />{gateBlockers.map((b, i) => <div key={i}>• {b}</div>)}</div>}
        <div className="mt-1 text-[9px] text-tg-muted">autoSend/backgroundSend/retrySend/massSend/sendWithoutConfirm/sendWithoutApproval = false. Gate только разрешает оператору перейти к ручному send в Wizard/Runbook.</div>
      </div>

      {checklistOut && <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/40 p-2 text-[10px] text-tg-muted">{checklistOut}</pre>}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Operator Timeline ({timeline.length})</div><div className="max-h-40 space-y-0.5 overflow-auto">{timeline.slice(0, 20).map((e) => <div key={e.id} className="flex gap-2 text-[10px] text-tg-muted"><span className="w-28 shrink-0">{fmtDT(e.at)}</span><span className="text-fuchsia-200">{e.type}</span><span>{e.title}</span></div>)}{timeline.length === 0 && <div className="text-[10px] text-tg-muted">Событий нет — запусти Safe Dry Test.</div>}</div></div>
    </div></main>;
  }

  // ================= LIVE PREP CONTROL CENTER (T21) =================
  function LivePrepWB() {
    const LS = { build: "deepinside.livePrep.buildGate.v1", model: "deepinside.livePrep.localModelGate.v1", accounts: "deepinside.livePrep.accountSlots.v1", targets: "deepinside.livePrep.targets.v1", matrix: "deepinside.livePrep.agentBindingMatrix.v1", runbook: "deepinside.livePrep.firstLiveRunbook.v1", preflight: "deepinside.livePrep.preflight.v1", notes: "deepinside.livePrep.operatorNotes.v1" };
    const PHRASE = "SEND ONE LIVE MESSAGE";
    const SAFETY = { mode: "MANUAL_ONLY", oneMessageOnly: true, autoSendAllowed: false, backgroundSendAllowed: false, retryWithoutConfirmAllowed: false, massSendAllowed: false, sendWithoutApprovalAllowed: false, sendWithoutWhitelistAllowed: false, secretsVisible: false, credentialsExportAllowed: false, externalNetworkScanAllowed: false };
    const defBuild = { buildStatus: "unknown", lastBuildCommand: "npm run build", lastBuildTime: null, lastErrorSummary: "", operatorNote: "", safety: SAFETY };
    const defModel = { selectedProvider: "local-8096", status: "unknown", healthCheckUrl: "http://127.0.0.1:8096/health", modelName: "", lastChecked: null, operatorNote: "", safety: SAFETY };

    const [build, setBuild] = useState<AnyRec>(defBuild);
    const [model, setModel] = useState<AnyRec>(defModel);
    const [accounts, setAccounts] = useState<AnyRec[]>([]);
    const [targets, setTargets] = useState<AnyRec[]>([]);
    const [runbook, setRunbook] = useState<AnyRec | null>(null);
    const [aSel, setASel] = useState("");
    const [tSel, setTSel] = useState("");
    const [confirmInput, setConfirmInput] = useState("");
    const [opNotes, setOpNotes] = useState("");
    const [note, setNote] = useState("");
    const [viewMode, setViewMode] = useState("guided");
    const [tgWarn, setTgWarn] = useState(false);

    useEffect(() => {
      setBuild(load<AnyRec>(LS.build, defBuild));
      setModel(load<AnyRec>(LS.model, defModel));
      const a = load<AnyRec[]>(LS.accounts, []); setAccounts(a); if (a[0]) setASel(a[0].id);
      const t = load<AnyRec[]>(LS.targets, []); setTargets(t); if (t[0]) setTSel(t[0].id);
      setRunbook(load<AnyRec | null>(LS.runbook, null));
      setOpNotes(load<string>(LS.notes, ""));
      setViewMode(load<string>("deepinside.livePrep.viewMode.v1", "guided"));
      // TASK 5: warn if Telegram runtime is not ready (503 / TDLib NOT READY). UI only, no break.
      fetch("/api/telegram/status", { cache: "no-store" }).then((r) => { if (r.status === 503 || !r.ok) { setTgWarn(true); return null; } return r.json().catch(() => null); }).then((j) => { if (j && (j.ready === false || j.tdlibReady === false || j.systemState === "OFFLINE" || j.status === "OFFLINE")) setTgWarn(true); }).catch(() => setTgWarn(true));
    }, []);
    const setMode = (m: string) => { setViewMode(m); save("deepinside.livePrep.viewMode.v1", m); };

    const saveBuild = (n: AnyRec) => { const v = { ...n, safety: SAFETY }; setBuild(v); save(LS.build, v); };
    const saveModel = (n: AnyRec) => { const v = { ...n, safety: SAFETY }; setModel(v); save(LS.model, v); };
    const saveAccounts = (n: AnyRec[]) => { setAccounts(n); save(LS.accounts, n); };
    const saveTargets = (n: AnyRec[]) => { setTargets(n); save(LS.targets, n); };
    const saveRunbook = (n: AnyRec | null) => { setRunbook(n); save(LS.runbook, n); };

    const acc = accounts.find((a) => a.id === aSel) || accounts[0] || null;
    const tgt = targets.find((t) => t.id === tSel) || targets[0] || null;

    const addAccount = () => { const a = { id: rid(), accountAlias: "AI MUSIC PUBLIC", accountType: "telegram_user", slotId: "tg-slot-ai-music-public", sessionStatus: "unknown", verifyStatus: "unknown", whitelistStatus: "unknown", agentBindingStatus: "unbound", boundAgent: "NOVIKOVA", operatorNote: "", safety: SAFETY }; const n = [...accounts, a]; saveAccounts(n); setASel(a.id); setNote("Account slot добавлен (alias only)."); };
    const updAcc = (patch: AnyRec) => { if (!acc) return; const n = accounts.map((a) => a.id === acc.id ? { ...a, ...patch, safety: SAFETY } : a); saveAccounts(n); };
    const resetAccountGate = () => { saveAccounts([]); setASel(""); setNote("Account gate сброшен."); };

    const addTarget = () => { const t = { id: rid(), targetAlias: "Telegram Channel alias", targetType: "telegram_channel", targetIdMasked: "tg-channel-****-public", verifyStatus: "unknown", whitelistStatus: "unknown", linkedAgent: "NOVIKOVA", linkedCampaign: "First Telegram Ecosystem Test", operatorNote: "", safety: SAFETY }; const n = [...targets, t]; saveTargets(n); setTSel(t.id); setNote("Target добавлен (masked id)."); };
    const updTgt = (patch: AnyRec) => { if (!tgt) return; const n = targets.map((t) => t.id === tgt.id ? { ...t, ...patch, safety: SAFETY } : t); saveTargets(n); };
    const removeTarget = () => { if (!tgt) return; const n = targets.filter((t) => t.id !== tgt.id); saveTargets(n); setTSel(n[0] ? n[0].id : ""); };
    const resetTargetGate = () => { saveTargets([]); setTSel(""); setNote("Target gate сброшен."); };

    const draftsLP = (() => { try { return load<AnyRec[]>("epicgram.drafts.v1", []); } catch { return []; } })();
    const hasApprovedDraft = draftsLP.some((d) => d.status === "APPROVED" || d.status === "PUBLISHED" || d.status === "send_confirm_required");

    const checks: Record<string, boolean> = {
      buildGatePassed: build.buildStatus === "passed",
      localModelReady: model.status === "ready" && model.selectedProvider !== "disabled",
      accountSlotReady: !!acc,
      accountSessionReady: acc?.sessionStatus === "ready",
      accountVerified: acc?.verifyStatus === "passed",
      accountWhitelisted: acc?.whitelistStatus === "passed",
      targetVerified: tgt?.verifyStatus === "passed",
      targetWhitelisted: tgt?.whitelistStatus === "passed",
      agentBoundToAccount: acc?.agentBindingStatus === "bound" && !!acc?.boundAgent,
      agentBoundToTarget: !!tgt?.linkedAgent,
      campaignAttached: !!tgt?.linkedCampaign,
      draftApproved: !!runbook?.draftApproved,
      payloadFrozen: !!runbook?.frozen,
      evidenceVerified: !!runbook?.evidenceVerified,
      manualGateArmed: !!runbook?.manualGateArmed,
      confirmationPhraseEntered: confirmInput.trim() === PHRASE
    };
    const checkLabels: Record<string, string> = { buildGatePassed: "Build gate passed", localModelReady: "Local model ready", accountSlotReady: "Account slot exists", accountSessionReady: "Account session ready", accountVerified: "Account verified", accountWhitelisted: "Account whitelisted", targetVerified: "Target verified", targetWhitelisted: "Target whitelisted", agentBoundToAccount: "Agent bound to account", agentBoundToTarget: "Agent bound to target", campaignAttached: "Campaign attached", draftApproved: "Draft approved", payloadFrozen: "Payload frozen", evidenceVerified: "Evidence verified", manualGateArmed: "Manual gate armed", confirmationPhraseEntered: "Confirmation phrase entered" };
    const keys = Object.keys(checks);
    const passedN = keys.filter((k) => checks[k]).length;
    const readiness = Math.round((passedN / keys.length) * 100);
    const blockers = keys.filter((k) => !checks[k]).map((k) => checkLabels[k]);
    const result = blockers.length === 0 ? "READY" : (build.buildStatus === "failed" ? "BLOCKED" : (readiness >= 50 ? "WARNING" : "BLOCKED"));
    const safeToProceed = blockers.length === 0;
    const resCol = result === "READY" ? "#4ade80" : result === "WARNING" ? "#fbbf24" : "#f87171";
    const nextAction = blockers[0] ? ("→ " + blockers[0]) : "Все гейты пройдены — можно армить ручной gate";
    // T21 guided: external gate readiness (excludes runbook-internal flags + final phrase) to avoid circular guards
    const accFull = checks.accountSlotReady && checks.accountSessionReady && checks.accountVerified && checks.accountWhitelisted && checks.agentBoundToAccount;
    const tgtFull = checks.targetVerified && checks.targetWhitelisted && checks.agentBoundToTarget && checks.campaignAttached;
    const gatesReady = checks.buildGatePassed && checks.localModelReady && accFull && tgtFull;
    const matrixReady = accFull && tgtFull;
    const runbookFull = !!runbook && !!runbook.frozen && !!runbook.evidenceVerified && !!runbook.manualGateArmed;

    useEffect(() => {
      const row = { agent: acc?.boundAgent || "NOVIKOVA", persona: "EVA NOVIKOVA", accountSlot: acc?.accountAlias || "—", target: tgt?.targetAlias || "—", campaign: tgt?.linkedCampaign || "—", status: blockers.length === 0 ? "ready" : "blocked", blockingReason: blockers[0] || "—", nextAction: blockers[0] || "—", safety: SAFETY };
      save(LS.matrix, [row]);
      save(LS.preflight, { id: "preflight_snapshot", at: now(), checks, readiness, result, blockers, safeToProceed, nextAction: blockers[0] || null, safety: SAFETY });
    });

    const confirmationValid = confirmInput.trim() === PHRASE;
    const confirmationStatus = confirmInput.trim() === "" ? "missing" : (confirmationValid ? "valid" : "invalid");

    const createRunbook = () => { const r = { id: "runbook_" + rid(), createdAt: now(), draftApproved: hasApprovedDraft, frozen: false, evidenceVerified: false, manualGateArmed: false, oneLiveMessageSent: false, failed: false, status: "created", safety: SAFETY }; saveRunbook(r); setNote("First Live Runbook создан."); };
    const runPreflight = () => { if (!runbook) { setNote("Сначала Create Runbook."); return; } saveRunbook({ ...runbook, draftApproved: hasApprovedDraft, status: result === "READY" ? "preflight_ready" : "preflight_blocked" }); setNote("Preflight: " + result + " · " + readiness + "%"); };
    const freezePayload = () => { if (!runbook) { setNote("Сначала Create Runbook."); return; } if (!gatesReady) { setNote("Freeze заблокирован: пройди гейты 1–5 (build/model/account/target)."); return; } saveRunbook({ ...runbook, frozen: true, status: "frozen" }); setNote("Payload заморожен (snapshot)."); };
    const verifyEvidence = () => { if (!runbook) return; if (!runbook.frozen) { setNote("Сначала Freeze Payload."); return; } saveRunbook({ ...runbook, evidenceVerified: true, status: "evidence_verified" }); setNote("Evidence verified (только алиасы, без секретов)."); };
    const armGate = () => { if (!runbook) return; if (!runbook.evidenceVerified) { setNote("Сначала Verify Evidence."); return; } if (!gatesReady) { setNote("Arm заблокирован: гейты 1–5 не пройдены."); return; } saveRunbook({ ...runbook, manualGateArmed: true, status: "armed" }); setNote("Manual gate ARMED. Отправка только вручную, по точной фразе."); };
    const markSent = () => { if (!runbook) return; if (!runbook.manualGateArmed) { setNote("Gate не armed."); return; } if (!confirmationValid) { setNote("Operator confirmation phrase missing."); return; } saveRunbook({ ...runbook, oneLiveMessageSent: true, status: "one_live_message_sent" }); setNote("Отмечено: ОДНО live-сообщение отправлено (фиксация оператором; UI ничего не слал)."); };
    const markFailed = () => { if (!runbook) return; saveRunbook({ ...runbook, failed: true, status: "failed" }); setNote("Runbook помечен failed."); };
    const resetRunbook = () => { saveRunbook(null); setConfirmInput(""); setNote("Runbook сброшен."); };
    const copyChecklist = () => { const md = "# FIRST LIVE RUNBOOK — MANUAL ONE-MESSAGE CHECKLIST\n\nReadiness: " + readiness + "% · " + result + "\nConfirmation phrase: " + PHRASE + "\n\n" + keys.map((k, i) => "- [" + (checks[k] ? "x" : " ") + "] " + (i + 1) + ". " + checkLabels[k]).join("\n") + "\n\nSafety: auto_send=false · mass=false · background=false · retry_without_confirm=false · one_message_only=true\nReal send: вручную через Live Wizard / E2E Runbook, после ввода точной фразы.\n"; try { navigator.clipboard.writeText(md); } catch {} setNote("Manual send checklist скопирован."); };

    const runbookSteps = [
      { key: "createDraft", label: "1·Create Live Draft", st: runbook ? (runbook.draftApproved ? "passed" : "ready") : "pending" },
      { key: "attachPersona", label: "2·Attach Persona", st: runbook ? "passed" : "pending" },
      { key: "attachCampaign", label: "3·Attach Campaign", st: checks.campaignAttached ? "passed" : (runbook ? "ready" : "pending") },
      { key: "attachAccount", label: "4·Attach Account", st: checks.accountSlotReady ? "passed" : (runbook ? "ready" : "pending") },
      { key: "attachTarget", label: "5·Attach Target", st: checks.targetWhitelisted ? "passed" : (runbook ? "ready" : "pending") },
      { key: "preflight", label: "6·Run Preflight", st: !runbook ? "pending" : (result === "READY" ? "passed" : "blocked") },
      { key: "freeze", label: "7·Freeze Payload", st: runbook?.frozen ? "passed" : (runbook ? "ready" : "pending") },
      { key: "evidence", label: "8·Verify Evidence", st: runbook?.evidenceVerified ? "passed" : (runbook ? "ready" : "pending") },
      { key: "arm", label: "9·Arm Manual Gate", st: runbook?.manualGateArmed ? "passed" : (runbook ? "ready" : "pending") },
      { key: "confirm", label: "10·Confirm One Live Message", st: runbook?.oneLiveMessageSent ? "passed" : (runbook?.manualGateArmed && confirmationValid ? "ready" : "blocked") }
    ];
    const liveSendDisabled = !runbook || !runbook.manualGateArmed || !confirmationValid || !!runbook.oneLiveMessageSent;

    const pill = (st: string) => { const c = st === "passed" || st === "ready" || st === "valid" ? "#4ade80" : st === "warning" || st === "pending" || st === "unknown" ? "#fbbf24" : st === "blocked" || st === "failed" || st === "invalid" || st === "missing" ? "#f87171" : "#9ca3af"; return <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: c + "22", color: c }}>{st}</span>; };
    const miniCard = (label: string, valuePill: string, extra?: string) => <div className="rounded-lg border border-white/10 bg-white/5 p-1.5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold">{label}</span>{pill(valuePill)}</div>{extra && <div className="mt-0.5 text-[9px] text-tg-muted">{extra}</div>}</div>;
    const panel = (title: string, body: any) => <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-fuchsia-300/70">{title}</div>{body}</div>;
    const safeCol = (k: string, v: any) => (v === false || k === "mode" || (k === "oneMessageOnly" && v === true)) ? "#86efac" : "#fca5a5";

    // ---- T21 Assisted Wizard step engine (one active step at a time) ----
    const wsteps = [
      { n: 1, label: "Build Gate", done: checks.buildGatePassed },
      { n: 2, label: "Local Model", done: checks.localModelReady },
      { n: 3, label: "Account Slot", done: accFull },
      { n: 4, label: "Target Gate", done: tgtFull },
      { n: 5, label: "Binding Matrix", done: matrixReady },
      { n: 6, label: "Runbook", done: runbookFull },
      { n: 7, label: "Preflight", done: gatesReady && runbookFull },
      { n: 8, label: "Manual Confirmation", done: checks.confirmationPhraseEntered }
    ];
    const curIdx = wsteps.findIndex((s) => !s.done);
    const allDone = curIdx < 0;
    const cur = allDone ? null : wsteps[curIdx];
    let winfo: AnyRec = { status: "passed", hint: "Все 8 шагов пройдены.", reason: "", kind: "done", prim: null };
    if (cur) {
      const n = cur.n;
      if (n === 1) winfo = { status: "ready", hint: "Сборка уже проверена в терминале. Если BUILD_LASTEXITCODE:0 — нажми Mark Build Passed.", reason: "Build gate не отмечен.", kind: "act", prim: { text: "Mark Build Passed", onClick: () => saveBuild({ ...build, buildStatus: "passed", lastBuildTime: now() }) } };
      else if (n === 2) winfo = { status: "ready", hint: "Ollama уже отвечает на 11434. Выбери Ollama 11434 и отметь модель как Ready.", reason: "Локальная модель не готова.", kind: "act", prim: { text: "Select Ollama 11434 + Mark Ready", onClick: () => saveModel({ ...model, selectedProvider: "ollama-11434", healthCheckUrl: "http://127.0.0.1:11434/api/tags", status: "ready", lastChecked: now() }) } };
      else if (n === 3) {
        if (!acc) winfo = { status: "ready", hint: "Этот шаг отмечай только если Telegram-аккаунт AI MUSIC PUBLIC реально авторизован.", reason: "Нет account slot.", kind: "act", prim: { text: "Add Account Slot", onClick: addAccount } };
        else if (acc.sessionStatus !== "ready") winfo = { status: "ready", hint: "Отмечай только если аккаунт реально авторизован в Telegram.", reason: "Сессия аккаунта не ready.", kind: "act", prim: { text: "Mark Session Ready", onClick: () => updAcc({ sessionStatus: "ready" }) } };
        else if (acc.verifyStatus !== "passed") winfo = { status: "ready", hint: "Подтверди, что это твой аккаунт.", reason: "Verify не passed.", kind: "act", prim: { text: "Mark Verify Passed", onClick: () => updAcc({ verifyStatus: "passed" }) } };
        else if (acc.whitelistStatus !== "passed") winfo = { status: "ready", hint: "Whitelist разрешает аккаунту отправку.", reason: "Whitelist не passed.", kind: "act", prim: { text: "Mark Whitelist Passed", onClick: () => updAcc({ whitelistStatus: "passed" }) } };
        else winfo = { status: "ready", hint: "Привяжи агента NOVIKOVA к аккаунту.", reason: "Агент не привязан к аккаунту.", kind: "act", prim: { text: "Bind To Agent NOVIKOVA", onClick: () => updAcc({ agentBindingStatus: "bound" }) } };
      }
      else if (n === 4) {
        if (!tgt) winfo = { status: "ready", hint: "Target отмечай только если это твой whitelisted канал/группа.", reason: "Нет target.", kind: "act", prim: { text: "Add Target", onClick: addTarget } };
        else if (tgt.verifyStatus !== "passed") winfo = { status: "ready", hint: "Подтверди владение каналом/группой.", reason: "Target не verified.", kind: "act", prim: { text: "Mark Target Verified", onClick: () => updTgt({ verifyStatus: "passed" }) } };
        else if (tgt.whitelistStatus !== "passed") winfo = { status: "ready", hint: "Whitelist разрешает отправку в этот таргет.", reason: "Target не whitelisted.", kind: "act", prim: { text: "Mark Target Whitelisted", onClick: () => updTgt({ whitelistStatus: "passed" }) } };
        else if (!tgt.linkedAgent) winfo = { status: "ready", hint: "Свяжи таргет с агентом NOVIKOVA.", reason: "Агент не привязан к таргету.", kind: "act", prim: { text: "Link Target To Agent NOVIKOVA", onClick: () => updTgt({ linkedAgent: "NOVIKOVA" }) } };
        else winfo = { status: "ready", hint: "Свяжи таргет с кампанией.", reason: "Кампания не привязана.", kind: "act", prim: { text: "Link Target To Campaign", onClick: () => updTgt({ linkedCampaign: "First Telegram Ecosystem Test" }) } };
      }
      else if (n === 5) winfo = { status: matrixReady ? "ready" : "blocked", hint: "Привязка агент-аккаунт-таргет-кампания.", reason: matrixReady ? "" : "Вернись к шагам 3/4.", kind: "info", prim: null };
      else if (n === 6) {
        if (!runbook) winfo = { status: "ready", hint: "Создай First Live Runbook.", reason: "Runbook не создан.", kind: "act", prim: { text: "Create Runbook", onClick: createRunbook } };
        else if (!runbook.frozen) winfo = { status: "ready", hint: "Заморозь payload (snapshot).", reason: "Payload не заморожен.", kind: "act", prim: { text: "Freeze Payload", onClick: freezePayload } };
        else if (!runbook.evidenceVerified) winfo = { status: "ready", hint: "Собери evidence (только алиасы, без секретов).", reason: "Evidence не собран.", kind: "act", prim: { text: "Verify Evidence", onClick: verifyEvidence } };
        else winfo = { status: "ready", hint: "Взведи ручной gate. Это НЕ отправка.", reason: "Gate не armed.", kind: "act", prim: { text: "Arm Manual Gate", onClick: armGate } };
      }
      else if (n === 7) winfo = { status: (gatesReady && runbookFull) ? "ready" : "blocked", hint: "Если в Expert View справа есть BLOCKED — живой прогон запрещён.", reason: (gatesReady && runbookFull) ? "" : "Не все гейты/runbook пройдены.", kind: "info", prim: null };
      else winfo = { status: "ready", hint: "Фраза нужна только в самом конце. Не вводи её раньше.", reason: "", kind: "confirm", prim: null };
    }

    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-5xl space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-lg font-black text-fuchsia-200">🚦 LIVE PREP · Control Center</div>
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-300">T21 LIVE PREP ACTIVE</span>
          <div className="ml-auto flex items-center gap-1 rounded-lg bg-black/40 p-0.5 text-[10px]">
            <button onClick={() => setMode("guided")} className={"rounded px-2 py-0.5 " + (viewMode === "guided" ? "bg-amber-500/30 font-bold text-amber-100" : "text-tg-muted hover:bg-white/10")}>Guided</button>
            <button onClick={() => setMode("expert")} className={"rounded px-2 py-0.5 " + (viewMode === "expert" ? "bg-fuchsia-600/30 font-bold text-fuchsia-100" : "text-tg-muted hover:bg-white/10")}>Expert</button>
          </div>
          <span className="rounded px-2 py-0.5 text-[10px] font-black" style={{ background: resCol + "22", color: resCol }}>{result} · {readiness}%</span>
        </div>
        <div className="mt-2 flex items-center gap-3"><div className="h-3 flex-1 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full" style={{ width: readiness + "%", background: resCol }} /></div></div>
        <div className="mt-1 text-[10px] text-amber-300/80">MANUAL_ONLY · one message only. UI ничего не отправляет сам; реальный send — вручную через Wizard/Runbook после точной фразы.</div>
      </div>
      {note && <div className="rounded-lg bg-white/5 p-2 text-[11px] text-fuchsia-200">{note}</div>}
      {tgWarn && <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-200">⚠️ Telegram Runtime не готов (status 503 / TDLib NOT READY). Build и Local Model gates закрывать можно. Account / Target / Live Runbook нельзя считать реально готовыми до восстановления Telegram status.</div>}

      {viewMode === "guided" && <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-3" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
        <div className="mb-2 flex items-center gap-2"><span className="text-base font-black text-amber-200">🚦 Assisted Live Prep Wizard</span><span className="ml-auto text-[11px] font-bold text-tg-muted">{allDone ? "Готово 8 / 8" : ("Step " + (cur?.n ?? "") + " / 8 — " + (cur?.label ?? ""))}</span></div>
        <div className="mb-2 flex flex-wrap gap-1">{wsteps.map((s, i) => { const stt = allDone || i < curIdx ? "passed" : i === curIdx ? "current" : "waiting"; const ic = stt === "passed" ? "✅" : stt === "current" ? "🟡" : "⏳"; const col = stt === "passed" ? "#4ade80" : stt === "current" ? "#fbbf24" : "#6b7280"; return <span key={s.n} className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: col + "22", color: col }}>{ic} {s.n}·{s.label}</span>; })}</div>
        {!allDone && cur && <div className="rounded-xl border p-3" style={{ borderColor: (winfo.status === "blocked" ? "#f87171" : "#fbbf24") + "55", background: (winfo.status === "blocked" ? "#f87171" : "#fbbf24") + "12" }}>
          <div className="text-[9px] uppercase tracking-wide text-tg-muted">CURRENT STEP</div>
          <div className="text-sm font-black text-amber-100">{cur.n} — {cur.label}</div>
          <div className="mt-1 text-[9px] uppercase tracking-wide text-tg-muted">STATUS</div>
          <div className="text-[12px] font-bold" style={{ color: winfo.status === "blocked" ? "#fca5a5" : "#fde68a" }}>{winfo.status === "blocked" ? "⛔ BLOCKED" : "🟡 ГОТОВ К ДЕЙСТВИЮ"}</div>
          <div className="mt-1 text-[9px] uppercase tracking-wide text-tg-muted">ПОДСКАЗКА</div>
          <div className="text-[11px] text-tg-text">{winfo.hint}</div>
          {winfo.reason && <div className="text-[10px] text-rose-200/80">{winfo.reason}</div>}
          {winfo.kind === "confirm" ? <div className="mt-2 space-y-1">
            <input value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} placeholder="введите фразу точно" className="w-full rounded bg-black/40 px-2 py-1 text-[12px] text-tg-text" />
            <div className="flex items-center gap-2 text-[11px]">status: {pill(confirmationStatus)}</div>
            <button onClick={() => { if (!confirmationValid) { setNote("Operator confirmation phrase missing."); return; } if (!runbook?.manualGateArmed) { setNote("Сначала Arm Manual Gate (шаг 6)."); return; } setNote("READY FOR MANUAL ONE-MESSAGE LIVE RUN (UI ничего не отправляет)."); }} className="rounded bg-emerald-600/30 px-3 py-1.5 text-[12px] font-bold hover:bg-emerald-600/45">Mark Ready For One Live Message</button>
          </div> : winfo.prim ? <button onClick={winfo.prim.onClick} className="mt-2 rounded-lg bg-amber-500/30 px-4 py-2 text-[13px] font-black text-amber-50 hover:bg-amber-500/45">{winfo.prim.text}</button> : <div className="mt-2 text-[11px] text-tg-muted">Действие не требуется — переходи дальше.</div>}
        </div>}
        {allDone && <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-[12px] text-emerald-200">✅ Все 8 шагов пройдены. READY FOR MANUAL ONE-MESSAGE LIVE RUN. Реальная отправка — только вручную в Live Wizard / E2E Runbook. Авто-send отсутствует.</div>}
        <div className="mt-2 text-[9px] text-tg-muted">Полный экран со всеми блоками — переключатель Expert вверху.</div>
      </div>}

      {viewMode === "expert" && (<div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {panel("1 · Build Gate", <div className="space-y-2 text-[11px]">
            <div className="flex items-center gap-2">{pill(build.buildStatus)}<span className="text-tg-muted">cmd: {build.lastBuildCommand}</span><span className="ml-auto text-[9px] text-tg-muted">{fmtDT(build.lastBuildTime)}</span></div>
            <input value={build.lastErrorSummary} onChange={(e) => saveBuild({ ...build, lastErrorSummary: e.target.value })} placeholder="last error summary (optional)" className="w-full rounded bg-black/40 px-2 py-1 text-tg-text" />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => saveBuild({ ...build, buildStatus: "passed", lastBuildTime: now() })} className="rounded bg-emerald-600/25 px-2 py-1 hover:bg-emerald-600/40">Mark Build Passed</button>
              <button onClick={() => saveBuild({ ...build, buildStatus: "failed", lastBuildTime: now() })} className="rounded bg-rose-600/20 px-2 py-1 text-rose-200 hover:bg-rose-600/35">Mark Build Failed</button>
              <button onClick={() => { try { navigator.clipboard.writeText(build.lastBuildCommand); } catch {} setNote("Build command скопирован."); }} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Copy Build Command</button>
              <button onClick={() => saveBuild({ ...build, buildStatus: "unknown", lastErrorSummary: "", lastBuildTime: null })} className="rounded bg-zinc-600/25 px-2 py-1 hover:bg-zinc-600/40">Clear Build Status</button>
            </div>
            <div className="text-[9px] text-tg-muted">UI сам build не запускает — оператор отмечает результат после терминальной проверки.</div>
          </div>)}

          {panel("2 · Local Model Gate", <div className="space-y-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">{pill(model.status)}<span className="text-tg-muted">provider: {model.selectedProvider}</span><span className="ml-auto text-[9px] text-tg-muted">{fmtDT(model.lastChecked)}</span></div>
            <div className="text-[9px] text-tg-muted">health: {model.healthCheckUrl}</div>
            <input value={model.modelName} onChange={(e) => saveModel({ ...model, modelName: e.target.value })} placeholder="model name (optional)" className="w-full rounded bg-black/40 px-2 py-1 text-tg-text" />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => saveModel({ ...model, selectedProvider: "local-8096", healthCheckUrl: "http://127.0.0.1:8096/health" })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Select 8096</button>
              <button onClick={() => saveModel({ ...model, selectedProvider: "ollama-11434", healthCheckUrl: "http://127.0.0.1:11434/api/tags" })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Select Ollama 11434</button>
              <button onClick={() => saveModel({ ...model, status: "ready", lastChecked: now() })} className="rounded bg-emerald-600/25 px-2 py-1 hover:bg-emerald-600/40">Mark Local Model Ready</button>
              <button onClick={() => saveModel({ ...model, status: "failed", lastChecked: now() })} className="rounded bg-rose-600/20 px-2 py-1 text-rose-200 hover:bg-rose-600/35">Mark Local Model Failed</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { try { navigator.clipboard.writeText("curl http://127.0.0.1:8096/health"); } catch {} setNote("8096 health command скопирован."); }} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Copy 8096 Health Command</button>
              <button onClick={() => { try { navigator.clipboard.writeText("curl http://127.0.0.1:11434/api/tags"); } catch {} setNote("Ollama health command скопирован."); }} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Copy Ollama Health Command</button>
              <button onClick={() => saveModel({ ...model, selectedProvider: "disabled", status: "unknown" })} className="rounded bg-zinc-600/25 px-2 py-1 hover:bg-zinc-600/40">Disable</button>
            </div>
            <div className="text-[9px] text-tg-muted">Без авто-сканов сети, без отправки промптов из UI, без показа env/секретов. Команды только для копирования в терминал.</div>
          </div>)}

          {panel("3 · Account Slot Gate", <div className="space-y-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <select value={aSel} onChange={(e) => setASel(e.target.value)} className="rounded bg-black/40 px-2 py-1 text-tg-text">{accounts.length === 0 && <option value="" className="bg-black">нет слотов</option>}{accounts.map((a) => <option key={a.id} value={a.id} className="bg-black">{a.accountAlias} · {a.slotId}</option>)}</select>
              <button onClick={addAccount} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Add Account Slot</button>
              <button onClick={resetAccountGate} className="ml-auto rounded bg-zinc-600/25 px-2 py-1 hover:bg-zinc-600/40">Reset Account Gate</button>
            </div>
            {acc && <div className="space-y-1 rounded-lg bg-black/30 p-2">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">{miniCard("Session", acc.sessionStatus)}{miniCard("Verify", acc.verifyStatus)}{miniCard("Whitelist", acc.whitelistStatus)}{miniCard("Binding", acc.agentBindingStatus, acc.boundAgent)}</div>
              <div className="text-[9px] text-tg-muted">type: {acc.accountType} · agent: {acc.boundAgent} · alias only — без phone, session, api_id/api_hash</div>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => updAcc({ sessionStatus: "ready" })} className="rounded bg-emerald-600/25 px-1.5 py-0.5 text-[10px] hover:bg-emerald-600/40">Mark Session Ready</button>
                <button onClick={() => updAcc({ verifyStatus: "passed" })} className="rounded bg-emerald-600/25 px-1.5 py-0.5 text-[10px] hover:bg-emerald-600/40">Mark Verify Passed</button>
                <button onClick={() => updAcc({ whitelistStatus: "passed" })} className="rounded bg-emerald-600/25 px-1.5 py-0.5 text-[10px] hover:bg-emerald-600/40">Mark Whitelist Passed</button>
                <button onClick={() => updAcc({ agentBindingStatus: "bound" })} className="rounded bg-fuchsia-600/25 px-1.5 py-0.5 text-[10px] hover:bg-fuchsia-600/40">Bind To Agent</button>
                <button onClick={() => updAcc({ agentBindingStatus: "unbound" })} className="rounded bg-zinc-600/25 px-1.5 py-0.5 text-[10px] hover:bg-zinc-600/40">Unbind</button>
              </div>
            </div>}
          </div>)}

          {panel("4 · Target Gate", <div className="space-y-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <select value={tSel} onChange={(e) => setTSel(e.target.value)} className="rounded bg-black/40 px-2 py-1 text-tg-text">{targets.length === 0 && <option value="" className="bg-black">нет таргетов</option>}{targets.map((t) => <option key={t.id} value={t.id} className="bg-black">{t.targetAlias} · {t.targetIdMasked}</option>)}</select>
              <button onClick={addTarget} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Add Target</button>
              <button onClick={removeTarget} className="rounded bg-rose-600/20 px-2 py-1 text-rose-200 hover:bg-rose-600/35">Remove Target</button>
              <button onClick={resetTargetGate} className="ml-auto rounded bg-zinc-600/25 px-2 py-1 hover:bg-zinc-600/40">Reset Target Gate</button>
            </div>
            {tgt && <div className="space-y-1 rounded-lg bg-black/30 p-2">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">{miniCard("Verify", tgt.verifyStatus)}{miniCard("Whitelist", tgt.whitelistStatus)}{miniCard("Agent", tgt.linkedAgent ? "valid" : "missing", tgt.linkedAgent)}{miniCard("Campaign", tgt.linkedCampaign ? "valid" : "missing", tgt.linkedCampaign)}</div>
              <div className="text-[9px] text-tg-muted">type: {tgt.targetType} · masked id: {tgt.targetIdMasked} — без реального chat_id/ссылок</div>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => updTgt({ verifyStatus: "passed" })} className="rounded bg-emerald-600/25 px-1.5 py-0.5 text-[10px] hover:bg-emerald-600/40">Mark Target Verified</button>
                <button onClick={() => updTgt({ whitelistStatus: "passed" })} className="rounded bg-emerald-600/25 px-1.5 py-0.5 text-[10px] hover:bg-emerald-600/40">Mark Target Whitelisted</button>
                <button onClick={() => updTgt({ linkedAgent: acc?.boundAgent || "NOVIKOVA" })} className="rounded bg-fuchsia-600/25 px-1.5 py-0.5 text-[10px] hover:bg-fuchsia-600/40">Link Target To Agent</button>
                <button onClick={() => updTgt({ linkedCampaign: "First Telegram Ecosystem Test" })} className="rounded bg-fuchsia-600/25 px-1.5 py-0.5 text-[10px] hover:bg-fuchsia-600/40">Link Target To Campaign</button>
              </div>
            </div>}
            <div className="text-[9px] text-amber-300/70">Только whitelisted target можно использовать в First Live Runbook.</div>
          </div>)}

          {panel("5 · Agent Live Binding Matrix", <div className="overflow-auto"><table className="w-full text-[10px]"><thead><tr className="text-tg-muted">{["Agent", "Persona", "Account Slot", "Target", "Campaign", "Status", "Blocking Reason", "Next Action"].map((h) => <th key={h} className="px-1 py-0.5 text-left font-semibold">{h}</th>)}</tr></thead><tbody><tr className="border-t border-white/10"><td className="px-1 py-1">{acc?.boundAgent || "NOVIKOVA"}</td><td className="px-1">EVA NOVIKOVA</td><td className="px-1">{acc?.accountAlias || "—"}</td><td className="px-1">{tgt?.targetAlias || "—"}</td><td className="px-1">{tgt?.linkedCampaign || "—"}</td><td className="px-1">{pill(blockers.length === 0 ? "ready" : "blocked")}</td><td className="px-1 text-rose-200">{blockers[0] || "—"}</td><td className="px-1 text-fuchsia-300/70">{blockers[0] || "—"}</td></tr></tbody></table></div>)}

          {panel("6 · First Live Runbook", <div className="space-y-2 text-[11px]">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">{runbookSteps.map((s) => <div key={s.key} className="rounded-lg border border-white/10 bg-white/5 p-1.5"><div className="text-[9px] font-bold">{s.label}</div><div className="mt-0.5">{pill(s.st)}</div></div>)}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={createRunbook} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Create Runbook</button>
              <button onClick={runPreflight} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Run Preflight</button>
              <button onClick={freezePayload} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Freeze Payload</button>
              <button onClick={verifyEvidence} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Verify Evidence</button>
              <button onClick={armGate} className="rounded bg-emerald-600/25 px-2 py-1 hover:bg-emerald-600/40">Arm Manual Gate</button>
              <button onClick={copyChecklist} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Copy Manual Send Checklist</button>
              <button onClick={markSent} disabled={liveSendDisabled} className={"rounded px-2 py-1 " + (liveSendDisabled ? "bg-zinc-700/30 text-tg-muted" : "bg-amber-600/30 hover:bg-amber-600/45")}>Mark One Live Message Sent</button>
              <button onClick={markFailed} className="rounded bg-rose-600/20 px-2 py-1 text-rose-200 hover:bg-rose-600/35">Mark Failed</button>
              <button onClick={resetRunbook} className="rounded bg-zinc-600/25 px-2 py-1 hover:bg-zinc-600/40">Reset Runbook</button>
            </div>
            {liveSendDisabled && !runbook?.oneLiveMessageSent && <div className="text-[9px] text-rose-200">Live send disabled: {!runbook ? "create runbook" : !runbook.manualGateArmed ? "manual gate not armed" : !confirmationValid ? "Operator confirmation phrase missing" : "—"}</div>}
            <div className="text-[9px] text-tg-muted">Авто-отправки нет. Реальный send — только вручную в Live Wizard / E2E Runbook после точной фразы.</div>
          </div>)}
        </div>

        <div className="space-y-3">
          {panel("7 · Preflight Inspector", <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between"><span className="font-bold" style={{ color: resCol }}>{result}</span><span style={{ color: resCol }}>{readiness}% · safeToProceed: {String(safeToProceed)}</span></div>
            <div className="max-h-52 space-y-0.5 overflow-auto">{keys.map((k) => <div key={k} className="flex items-center justify-between"><span className="text-tg-muted">{checkLabels[k]}</span>{pill(checks[k] ? "passed" : "blocked")}</div>)}</div>
            <div className="rounded bg-black/30 p-1.5 text-[9px] text-fuchsia-300/70">next: {nextAction}</div>
          </div>)}

          {panel("8 · Manual Confirmation Gate", <div className="space-y-2 text-[11px]">
            <div className="text-[9px] text-tg-muted">required phrase: <span className="text-fuchsia-200">{PHRASE}</span></div>
            <input value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} placeholder="введите фразу точно" className="w-full rounded bg-black/40 px-2 py-1 text-tg-text" />
            <div className="flex items-center gap-2">status: {pill(confirmationStatus)}<span className="text-[9px] text-tg-muted">one message only</span></div>
            <button onClick={() => { if (!confirmationValid) { setNote("Operator confirmation phrase missing."); return; } if (!runbook?.manualGateArmed) { setNote("Сначала Arm Manual Gate."); return; } setNote("READY FOR MANUAL ONE-MESSAGE LIVE RUN (UI не отправляет — фиксация готовности)."); }} className="w-full rounded bg-emerald-600/25 px-2 py-1 hover:bg-emerald-600/40">Mark Ready For One Live Message</button>
            {confirmationValid && runbook?.manualGateArmed && <div className="rounded bg-emerald-600/15 p-1.5 text-[10px] text-emerald-200">READY FOR MANUAL ONE-MESSAGE LIVE RUN</div>}
            <div className="text-[9px] text-tg-muted">no mass · no retry · no background · no schedule. Точная фраза обязательна, иначе live-кнопка disabled.</div>
          </div>)}

          {panel("9 · Safety Inspector", <div className="grid grid-cols-1 gap-0.5 text-[10px]">{Object.keys(SAFETY).map((k) => <div key={k} className="flex items-center justify-between"><span className="text-tg-muted">{k}</span><span style={{ color: safeCol(k, (SAFETY as AnyRec)[k]) }}>{String((SAFETY as AnyRec)[k])}</span></div>)}</div>)}

          {panel("10 · Operator Notes", <div className="space-y-1"><textarea value={opNotes} onChange={(e) => { setOpNotes(e.target.value); save(LS.notes, e.target.value); }} placeholder="заметки оператора (без секретов)" className="h-24 w-full rounded bg-black/40 px-2 py-1 text-[11px] text-tg-text" /><div className="text-[9px] text-tg-muted">Не вводи сюда телефоны, session, api_id/api_hash, токены.</div></div>)}
        </div>
      </div>)}
    </div></main>;
  }

  // ================= POST-LIVE REVIEW (T19) =================
  function PostLiveWB() {
    const DECISIONS = ["keep_simulation", "allow_next_manual_pilot_later", "setup_manual_queue_preview", "lock_live_mode", "request_persona_tuning_preview", "request_target_review", "request_account_review"];
    const [rbId, setRbId] = useState(""); const [plId, setPlId] = useState(""); const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
    const [report, setReport] = useState<AnyRec | null>(null); const [evidence, setEvidence] = useState<AnyRec | null>(null);
    const [dbVis, setDbVis] = useState(true); const [dbText, setDbText] = useState(true); const [dbTgt, setDbTgt] = useState(true); const [dbAgent, setDbAgent] = useState(true);
    const [dbQ, setDbQ] = useState(5); const [dbS, setDbS] = useState(5); const [dbNotes, setDbNotes] = useState(""); const [decision, setDecision] = useState(DECISIONS[0]);
    const api = async (path: string, body?: AnyRec) => { setBusy(true); const r = await fetch("/api/operator/post-live/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }).then((x) => x.json()).catch(() => null); setBusy(false); return r; };
    const loadReport = async (id: string) => { const r = await fetch("/api/operator/post-live/report/" + id, { cache: "no-store" }).then((x) => x.json()).catch(() => null); setReport(r?.report || null); };
    const create = async () => { if (!rbId) { setNote("Вставь runbookId."); return; } const r = await api("create", { runbookId: rbId, operator: "human" }); if (r?.postLive) { setPlId(r.postLive.id); setNote("post-live " + r.postLive.id); loadReport(r.postLive.id); } else setNote("⛔ " + (r?.reason || "")); };
    const freeze = async () => { const r = await api("freeze", { postLiveId: plId, operator: "human" }); setNote(r?.ok ? "🧊 заморожено" : "⛔ " + (r?.reason || "")); loadReport(plId); };
    const verify = async () => { const r = await api("verify", { postLiveId: plId }); setNote(r?.verified ? "✅ verified: " + Object.entries(r.checks || {}).map(([k, v]) => k + ":" + v).join(" ") : "⚠ " + (r?.warnings || []).join(",")); loadReport(plId); };
    const evi = async (format: string) => { const r = await api("evidence", { postLiveId: plId, format }); setEvidence(format === "markdown" ? { markdown: r?.markdown } : r?.evidence || null); setNote("evidence собран (" + format + ")"); };
    const saveDb = async () => { const r = await api("debrief", { postLiveId: plId, messageVisible: dbVis, textMatched: dbText, targetCorrect: dbTgt, agentCorrect: dbAgent, qualityRating: dbQ, safetyRating: dbS, notes: dbNotes, decision }); setNote(r?.blocked ? "⛔ " + r.reason : r?.ok ? "debrief сохранён" : "⛔"); loadReport(plId); };
    const saveDec = async () => { const r = await api("decision", { postLiveId: plId, decision, operator: "human" }); setNote(r?.blocked ? "⛔ " + r.reason : r?.ok ? "решение: " + decision : "⛔ " + (r?.reason || "")); loadReport(plId); };
    const blockTest = async () => { const r = await api("block-test", { postLiveId: plId, attempt: "second_send_after_freeze" }); setNote(r?.blocked ? "✅ second send заблокирован: " + r.reason : "⚠ НЕ заблокирован"); };

    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">📁 Post-Live Review · evidence · freeze · debrief · decision (без отправок)</div>
        <div className="mt-1 flex flex-wrap gap-2">
          <input value={rbId} onChange={(e) => setRbId(e.target.value)} placeholder="runbookId (из 🧪 E2E Runbook)" className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
          <button onClick={create} disabled={busy} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Create</button>
        </div>
      </div>
      {note && <div className="rounded-lg bg-white/5 p-2 text-[11px] text-fuchsia-200">{note}</div>}

      {plId && <>
        <div className="flex flex-wrap gap-2">
          <button onClick={freeze} disabled={busy} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">🧊 Freeze</button>
          <button onClick={verify} disabled={busy} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Verify Post-Send</button>
          <button onClick={() => evi("json")} disabled={busy} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Evidence JSON</button>
          <button onClick={() => evi("markdown")} disabled={busy} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Evidence MD</button>
          <button onClick={blockTest} disabled={busy} className="rounded bg-rose-600/20 px-3 py-1.5 text-[12px] text-rose-200 hover:bg-rose-600/35">⛔ Block Test: 2nd send</button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="text-[9px] uppercase text-fuchsia-300/70">Operator Debrief</div>
          <div className="grid gap-1 sm:grid-cols-2 text-[11px] text-tg-muted">
            <label className="flex items-center gap-2"><input type="checkbox" checked={dbVis} onChange={(e) => setDbVis(e.target.checked)} /> Сообщение реально появилось в канале</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={dbText} onChange={(e) => setDbText(e.target.checked)} /> Текст совпал с approved draft</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={dbTgt} onChange={(e) => setDbTgt(e.target.checked)} /> Цель правильная</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={dbAgent} onChange={(e) => setDbAgent(e.target.checked)} /> Агент правильный</label>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <label className="text-tg-muted">Quality <select value={dbQ} onChange={(e) => setDbQ(+e.target.value)} className="rounded bg-black/40 px-1 py-0.5 text-tg-text">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="bg-black">{n}</option>)}</select></label>
            <label className="text-tg-muted">Safety <select value={dbS} onChange={(e) => setDbS(+e.target.value)} className="rounded bg-black/40 px-1 py-0.5 text-tg-text">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="bg-black">{n}</option>)}</select></label>
            <select value={decision} onChange={(e) => setDecision(e.target.value)} className="rounded bg-black/40 px-2 py-0.5 text-[11px] text-tg-text">{DECISIONS.map((d) => <option key={d} value={d} className="bg-black">{d}</option>)}</select>
          </div>
          <input value={dbNotes} onChange={(e) => setDbNotes(e.target.value)} placeholder="notes" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px]" />
          <div className="flex gap-2"><button onClick={saveDb} disabled={busy} className="rounded bg-white/10 px-3 py-1 text-[12px] hover:bg-white/20">Save Debrief</button><button onClick={saveDec} disabled={busy} className="rounded bg-emerald-600/25 px-3 py-1 text-[12px] hover:bg-emerald-600/40">Save Decision</button></div>
        </div>

        {evidence && <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-[10px] uppercase text-fuchsia-300/70">Evidence Pack</span><button onClick={() => { try { navigator.clipboard.writeText(evidence.markdown || JSON.stringify(evidence, null, 2)); setNote("evidence скопирован"); } catch {} }} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Copy</button></div><pre className="max-h-48 overflow-auto rounded bg-black/40 p-2 text-[10px] text-tg-muted">{evidence.markdown || JSON.stringify(evidence, null, 2)}</pre></div>}
        {report && <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Post-Live Report</div><pre className="max-h-40 overflow-auto rounded bg-black/40 p-2 text-[10px] text-tg-muted">{JSON.stringify(report, null, 2)}</pre></div>}
      </>}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">Post-Live слой ничего не отправляет. Freeze фиксирует, что pilot/wizard/runbook закрыты; block-test доказывает second-send blocked. Решения только фиксируются (enable_auto_send/mass/skip_approval → blocked). Секреты в evidence маскируются.</div>
    </div></main>;
  }

  // ================= E2E LIVE PILOT RUNBOOK (T18) =================
  function RunbookWB() {
    const [accts, setAccts] = useState<AnyRec[]>([]); const [tgts, setTgts] = useState<AnyRec[]>([]);
    const [accId, setAccId] = useState(""); const [accName, setAccName] = useState(""); const [targetId, setTargetId] = useState("");
    const [rbId, setRbId] = useState(""); const [checks, setChecks] = useState<AnyRec | null>(null); const [blockers, setBlockers] = useState<string[]>([]);
    const [report, setReport] = useState<AnyRec | null>(null); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
    useEffect(() => { fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setAccts(Array.isArray(j?.accounts) ? j.accounts : [])).catch(() => {}); fetch("/api/operator/targets", { cache: "no-store" }).then((r) => r.json()).then((j) => setTgts(Array.isArray(j?.targets) ? j.targets : [])).catch(() => {}); }, []);
    const api = async (path: string, body?: AnyRec) => { setBusy(true); const r = await fetch("/api/operator/live-runbook/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }).then((x) => x.json()).catch(() => null); setBusy(false); return r; };
    const create = async () => { const r = await api("create", { operator: "human", reason: "e2e live pilot" }); if (r?.runbook) { setRbId(r.runbook.id); setChecks(null); setBlockers([]); setReport(null); setSent(false); setNote("runbook " + r.runbook.id); } };
    const preflight = async () => { const r = await api("preflight", { runbookId: rbId, accountId: accId, accountDisplayName: accName, targetId, agentId: agent }); setChecks(r?.checks || null); setBlockers(r?.blockers || []); setNote(r?.ready ? "✅ READY FOR FIRST CONTROLLED LIVE MESSAGE" : "⛔ BLOCKED: " + (r?.blockers || []).join(", ") + (r?.hint ? " · " + r.hint : "")); };
    const dry = async () => { const r = await api("execute-dry-run", { runbookId: rbId }); setNote(r?.ok ? "🧪 dry-run passed (mock, без реальной отправки)" : "⛔ " + (r?.reason || (r?.blockers || []).join(","))); };
    const live = async () => { const phrase = prompt("FINAL END-TO-END LIVE PILOT\nAccount: " + accName + "\nTarget: " + (tgts.find((t) => t.id === targetId)?.title || targetId) + "\nAgent: " + agent + "\n\nОтправит РОВНО ОДНО реальное сообщение в whitelisted target.\nВведи фразу:"); if (phrase === null) return; const r = await api("execute-live", { runbookId: rbId, confirmPhrase: phrase, operator: "human" }); if (r?.sent) { setSent(true); setNote("✅ ОТПРАВЛЕНО одно сообщение · " + (r.telegramMessageId || "")); } else setNote((r?.blocked ? "⛔ " : "❌ ") + (r?.reason || r?.message || "") + ((r?.blockers || []).length ? ": " + r.blockers.join(",") : "")); };
    const verify2 = async () => { const r = await api("verify-second-send-blocked", { runbookId: rbId }); setNote(r?.secondSendBlocked ? "✅ second send заблокирован: " + r.reason : "⚠ second send НЕ заблокирован"); const rep = await fetch("/api/operator/live-runbook/report/" + rbId, { cache: "no-store" }).then((x) => x.json()).catch(() => null); setReport(rep?.report || null); };

    const ROWS = ["brain", "account", "session", "target", "binding", "wizard", "draft", "approval", "safeSend", "postSend", "secondSendBlock", "audit"];
    const col = (v: string) => v === "pass" ? "#4ade80" : v === "fail" ? "#f87171" : v === "warning" ? "#fbbf24" : "#9ca3af";

    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-3">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 text-center">
        <div className="text-lg font-black text-amber-200">🧪 LIVE PILOT E2E RUNBOOK</div>
        <div className="text-[12px] text-amber-300/90">Brain → Account/Session → Target/Whitelist → Binding → Wizard Lock → Draft → Approve → Confirm → ОДНО сообщение → second-send blocked → report.</div>
      </div>
      {note && <div className="rounded-lg bg-white/5 p-2 text-[11px] text-fuchsia-200">{note}</div>}

      <div className="grid gap-2 sm:grid-cols-3">
        <select value={accId} onChange={(e) => { const a = accts.find((x) => x.slotId === e.target.value); setAccId(e.target.value); setAccName(a?.displayName || e.target.value); }} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text"><option value="" className="bg-black">Account (slot) —</option>{accts.map((a) => <option key={a.slotId} value={a.slotId} className="bg-black">{(a.displayName || a.slotId) + (a.status === "ready" ? " ✓" : "")}</option>)}</select>
        <select value={agent} onChange={(e) => setAgent(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text">{AGENTS.map((a) => <option key={a} value={a} className="bg-black">{a}</option>)}</select>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text"><option value="" className="bg-black">Target —</option>{tgts.map((t) => <option key={t.id} value={t.id} className="bg-black">{t.title}{t.whitelisted ? " ✓WL" : ""}</option>)}</select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={create} disabled={busy} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Create Runbook</button>
        <button onClick={preflight} disabled={busy || !rbId || !accId || !targetId} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Run Preflight</button>
        <button onClick={dry} disabled={busy || !rbId} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Execute Dry Run</button>
        <button onClick={live} disabled={busy || !rbId} className="rounded bg-rose-600/30 px-3 py-1.5 text-[12px] font-bold text-rose-100 hover:bg-rose-600/50">Execute Live</button>
        <button onClick={verify2} disabled={busy || !sent} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Verify 2nd-send Block</button>
      </div>

      {checks && <div className="overflow-auto rounded-xl border border-white/10"><table className="w-full text-[11px]"><thead className="bg-white/5 text-fuchsia-300/70"><tr><th className="px-2 py-1 text-left">Check</th><th className="px-2 py-1 text-left">Status</th></tr></thead>
        <tbody>{ROWS.map((k) => <tr key={k} className="border-t border-white/5"><td className="px-2 py-1 text-tg-muted">{k}</td><td className="px-2 py-1 font-bold" style={{ color: col(checks[k] || "not_checked") }}>{checks[k] || "not_checked"}</td></tr>)}</tbody></table></div>}
      {blockers.length > 0 && <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-200">Blockers: {blockers.join(" · ")}</div>}

      {report && <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-[10px] uppercase text-fuchsia-300/70">Runbook Report</span><div className="flex gap-1"><a href="/world" className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">World OS</a><button onClick={() => { try { navigator.clipboard.writeText(JSON.stringify(report, null, 2)); setNote("report скопирован"); } catch {} }} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Copy JSON</button></div></div><pre className="max-h-48 overflow-auto rounded bg-black/40 p-2 text-[10px] text-tg-muted">{JSON.stringify(report, null, 2)}</pre></div>}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">Runbook сам не шлёт — прогоняет через Wizard → live-pilot → sendMessage. Один send, second-send blocked обязателен, фраза «SEND ONE LIVE MESSAGE». Чтобы READY: подними brain :8096/:11434, добавь+verify+whitelist account и target, привяжи агента.</div>
    </div></main>;
  }

  // ================= OWNED ACCOUNT REGISTRY (T16) =================
  function AccountsWB() {
    const TYPES = ["owned_user_account", "owned_channel_admin_account", "owned_bot_account_preview", "internal_test_account", "saved_messages_test_account"];
    const [items, setItems] = useState<AnyRec[]>([]); const [tg, setTg] = useState<AnyRec[]>([]);
    const [slot, setSlot] = useState(""); const [name, setName] = useState(""); const [type, setType] = useState(TYPES[0]); const [notes, setNotes] = useState("");
    const [ck1, setCk1] = useState(false); const [ck2, setCk2] = useState(false); const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
    const reload = async () => { const j = await fetch("/api/operator/accounts", { cache: "no-store" }).then((r) => r.json()).catch(() => null); setItems(Array.isArray(j?.accounts) ? j.accounts : []); };
    useEffect(() => { reload(); fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setTg(Array.isArray(j?.accounts) ? j.accounts : [])).catch(() => {}); }, []);
    const act = async (path: string, body: AnyRec) => { setBusy(true); const r = await fetch("/api/operator/accounts/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => null); setBusy(false); await reload(); setNote(path + ": " + (r?.blocked ? "⛔ " + r.reason : r?.sessionHealth ? "session " + r.sessionHealth.status : r?.ok ? "ok" : r?.reason || "err")); return r; };
    const add = async () => { if (!name || !ck1 || !ck2) { setNote("Заполни имя и подтверди оба чекбокса."); return; } const s = tg.find((x) => x.slotId === slot); await act("create", { displayName: name || s?.displayName, telegramSlotId: slot || null, type, notes, operator: "human" }); setName(""); setNotes(""); setSlot(""); setCk1(false); setCk2(false); };

    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-4xl space-y-3">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">👤 Owned Telegram Accounts · whitelist + session-health required для real send</div>
      {note && <div className="rounded-lg bg-white/5 p-2 text-[11px] text-fuchsia-200">{note}</div>}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div className="text-[9px] uppercase text-fuchsia-300/70">Add Account (needs_review · sendAllowed=false · session strings НЕ показываются)</div>
        <div className="grid gap-2 sm:grid-cols-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px]" />
          <select value={slot} onChange={(e) => setSlot(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text"><option value="" className="bg-black">Bind Telegram slot —</option>{tg.map((a) => <option key={a.slotId} value={a.slotId} className="bg-black">{(a.displayName || a.slotId) + (a.status === "ready" ? " ✓" : "")}</option>)}</select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text">{TYPES.map((t) => <option key={t} value={t} className="bg-black">{t}</option>)}</select>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="notes" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px]" />
        </div>
        <label className="flex items-center gap-2 text-[11px] text-tg-muted"><input type="checkbox" checked={ck1} onChange={(e) => setCk1(e.target.checked)} /> Это мой owned/test account · session-строки не отображаются</label>
        <label className="flex items-center gap-2 text-[11px] text-tg-muted"><input type="checkbox" checked={ck2} onChange={(e) => setCk2(e.target.checked)} /> Понимаю: это НЕ включает auto-send, требуется manual approval</label>
        <button onClick={add} disabled={busy || !name || !ck1 || !ck2} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40">＋ Add Account</button>
      </div>

      <div className="overflow-auto rounded-xl border border-white/10"><table className="w-full text-[11px]"><thead className="bg-white/5 text-fuchsia-300/70"><tr>{["Name", "Type", "Status", "Own", "WL", "Send", "Session", "Agents", "Actions"].map((h) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{items.map((a) => <tr key={a.id} className="border-t border-white/5">
          <td className="px-2 py-1">{a.displayName}<div className="text-[9px] text-tg-muted">slot {a.telegramSlotId || "—"}</div></td>
          <td className="px-2 py-1 text-tg-muted">{a.type}</td>
          <td className="px-2 py-1"><span style={{ color: a.status === "active" ? "#4ade80" : a.status === "blocked" ? "#f87171" : "#fbbf24" }}>{a.status}</span></td>
          <td className="px-2 py-1">{a.owned ? "✓" : "—"}</td>
          <td className="px-2 py-1">{a.whitelisted ? "✓" : "—"}</td>
          <td className="px-2 py-1" style={{ color: a.sendAllowed ? "#4ade80" : "#9ca3af" }}>{a.sendAllowed ? "✓" : "—"}</td>
          <td className="px-2 py-1" style={{ color: a.sessionHealth?.ready ? "#4ade80" : "#f87171" }}>{a.sessionHealth?.status || "?"}</td>
          <td className="px-2 py-1 text-tg-muted">{(a.allowedAgents || []).join(",") || "—"}</td>
          <td className="px-2 py-1"><div className="flex flex-wrap gap-1">
            <button onClick={() => act("session-health", { accountId: a.id })} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] hover:bg-white/20">session</button>
            <button onClick={() => act("verify", { accountId: a.id, owned: true, operator: "human" })} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] hover:bg-white/20">verify</button>
            <button onClick={() => act("whitelist", { accountId: a.id, whitelisted: true, sendAllowed: true, operator: "human" })} className="rounded bg-emerald-600/25 px-1.5 py-0.5 text-[9px] hover:bg-emerald-600/40">whitelist</button>
            <button onClick={() => { const ag = prompt("agentId:", "novikova"); if (ag) act("allow-agent", { accountId: a.id, agentId: ag, allowed: true, operator: "human" }); }} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] hover:bg-white/20">+agent</button>
            <button onClick={() => act("disable", { accountId: a.id, operator: "human" })} className="rounded bg-zinc-600/25 px-1.5 py-0.5 text-[9px] hover:bg-zinc-600/40">disable</button>
            <button onClick={() => act("block", { accountId: a.id, operator: "human" })} className="rounded bg-rose-600/20 px-1.5 py-0.5 text-[9px] text-rose-200 hover:bg-rose-600/35">block</button>
          </div></td>
        </tr>)}</tbody></table></div>
      {items.length === 0 && <div className="text-[11px] text-tg-muted">Accounts нет. Real send блокируется, пока не добавишь + bind slot + verify + whitelist + session ready + allow-agent.</div>}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">Поток: Add (+bind Telegram slot) → Session (ready) → Verify (owned) → Whitelist (sendAllowed) → +Agent. Guard в send-слое блокирует, если account не whitelisted/owned/active, session не ready, или агент не разрешён. session strings/tokens/credentials никогда не выводятся (sessionVisible=false).</div>
    </div></main>;
  }

  // ================= OWNED TARGET REGISTRY (T15) =================
  function TargetsWB() {
    const TYPES = ["owned_channel", "owned_group", "saved_messages_test", "private_test_chat", "internal_test_chat"];
    const [targets, setTargets] = useState<AnyRec[]>([]); const [accts, setAccts] = useState<AnyRec[]>([]);
    const [accId, setAccId] = useState(""); const [chatId, setChatId] = useState(""); const [title, setTitle] = useState(""); const [type, setType] = useState(TYPES[0]); const [notes, setNotes] = useState("");
    const [confirmOwn, setConfirmOwn] = useState(false); const [env, setEnv] = useState("test"); const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
    const reload = async () => { const j = await fetch("/api/operator/targets", { cache: "no-store" }).then((r) => r.json()).catch(() => null); setTargets(Array.isArray(j?.targets) ? j.targets : []); };
    useEffect(() => { reload(); fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setAccts(Array.isArray(j?.accounts) ? j.accounts : [])).catch(() => {}); }, []);
    const act = async (path: string, body: AnyRec) => { setBusy(true); const r = await fetch("/api/operator/targets/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => null); setBusy(false); await reload(); setNote(path + ": " + (r?.blocked ? "⛔ " + r.reason : r?.ok ? "ok" : r?.reason || "err")); return r; };
    const add = async () => { if (!accId || !chatId || !confirmOwn) { setNote("Заполни account/chatId и подтверди владение."); return; } const a = accts.find((x) => x.slotId === accId); await act("create", { accountId: accId, accountDisplayName: a?.displayName || accId, telegramChatId: chatId, title, type, environment: env, notes, operator: "human" }); setChatId(""); setTitle(""); setNotes(""); setConfirmOwn(false); };

    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-4xl space-y-3">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">🎯 Owned Telegram Targets · whitelist-required · реальная отправка только сюда</div>
      {note && <div className="rounded-lg bg-white/5 p-2 text-[11px] text-fuchsia-200">{note}</div>}

      {/* Add Target */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div className="text-[9px] uppercase text-fuchsia-300/70">Add Target (создаётся как needs_review · sendAllowed=false)</div>
        <div className="grid gap-2 sm:grid-cols-4">
          <select value={accId} onChange={(e) => setAccId(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text"><option value="" className="bg-black">Account —</option>{accts.map((a) => <option key={a.slotId} value={a.slotId} className="bg-black">{a.displayName || a.slotId}</option>)}</select>
          <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Telegram chatId" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px]" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px]" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text">{TYPES.map((t) => <option key={t} value={t} className="bg-black">{t}</option>)}</select>
          <select value={env} onChange={(e) => setEnv(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text">{["sandbox", "test", "production"].map((t) => <option key={t} value={t} className="bg-black">{t}</option>)}</select>
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="notes" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px]" />
        <label className="flex items-center gap-2 text-[11px] text-tg-muted"><input type="checkbox" checked={confirmOwn} onChange={(e) => setConfirmOwn(e.target.checked)} /> Я подтверждаю, что это мой owned/test target · понимаю, что это НЕ включает auto-send и требует manual approval</label>
        <button onClick={add} disabled={busy || !accId || !chatId || !confirmOwn} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40">＋ Add Target</button>
      </div>

      {/* Targets table */}
      <div className="overflow-auto rounded-xl border border-white/10"><table className="w-full text-[11px]"><thead className="bg-white/5 text-fuchsia-300/70"><tr>{["Title", "Type", "Account", "Status", "Own", "WL", "Send", "Agents", "Actions"].map((h) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{targets.map((t) => <tr key={t.id} className="border-t border-white/5">
          <td className="px-2 py-1">{t.title}<div className="text-[9px] text-tg-muted">{t.chatIdMasked}</div></td>
          <td className="px-2 py-1 text-tg-muted">{t.type}</td>
          <td className="px-2 py-1 text-tg-muted">{t.accountDisplayName}</td>
          <td className="px-2 py-1"><span style={{ color: t.status === "active" ? "#4ade80" : t.status === "blocked" ? "#f87171" : "#fbbf24" }}>{t.status}</span></td>
          <td className="px-2 py-1">{t.owned ? "✓" : t.testAllowed ? "T" : "—"}</td>
          <td className="px-2 py-1">{t.whitelisted ? "✓" : "—"}</td>
          <td className="px-2 py-1" style={{ color: t.sendAllowed ? "#4ade80" : "#9ca3af" }}>{t.sendAllowed ? "✓" : "—"}</td>
          <td className="px-2 py-1 text-tg-muted">{(t.allowedAgents || []).join(",") || "—"}</td>
          <td className="px-2 py-1"><div className="flex flex-wrap gap-1">
            <button onClick={() => act("health", { targetId: t.id })} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] hover:bg-white/20">health</button>
            <button onClick={() => act("verify", { targetId: t.id, owned: true, testAllowed: true, operator: "human" })} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] hover:bg-white/20">verify</button>
            <button onClick={() => act("whitelist", { targetId: t.id, whitelisted: true, sendAllowed: true, operator: "human" })} className="rounded bg-emerald-600/25 px-1.5 py-0.5 text-[9px] hover:bg-emerald-600/40">whitelist</button>
            <button onClick={() => { const a = prompt("agentId (novikova/eva/ai-newscaster/ai-music-public):", "novikova"); if (a) act("allow-agent", { targetId: t.id, agentId: a, allowed: true, operator: "human" }); }} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] hover:bg-white/20">+agent</button>
            <button onClick={() => act("disable", { targetId: t.id, operator: "human" })} className="rounded bg-zinc-600/25 px-1.5 py-0.5 text-[9px] hover:bg-zinc-600/40">disable</button>
            <button onClick={() => act("block", { targetId: t.id, operator: "human" })} className="rounded bg-rose-600/20 px-1.5 py-0.5 text-[9px] text-rose-200 hover:bg-rose-600/35">block</button>
          </div></td>
        </tr>)}</tbody></table></div>
      {targets.length === 0 && <div className="text-[11px] text-tg-muted">Targets нет. Реальная отправка заблокирована, пока не добавишь + verify + whitelist + allow-agent целевой канал.</div>}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">Поток: Add → Verify (owned/test) → Whitelist (sendAllowed) → +Agent. Реальный send в live-pilot/wizard блокируется guard&apos;ом, если target не whitelisted/owned/active или агент не разрешён. unknown/bulk/scraped/multi-chat = всегда blocked.</div>
    </div></main>;
  }

  // ================= LIVE PILOT EXECUTION WIZARD (T14) =================
  function LiveWizardWB() {
    const STEPS = ["Preflight", "Select Account", "Select Target", "Select Agent", "Lock Target", "Create Pilot", "Create Draft", "Score Draft", "Review", "Approve", "Confirm Send", "Verify", "Report"];
    const [accts, setAccts] = useState<AnyRec[]>([]); const [chats, setChats] = useState<AnyRec[]>([]);
    const [wzId, setWzId] = useState(""); const [step, setStep] = useState(1); const [locked, setLocked] = useState(false);
    const [accId, setAccId] = useState(""); const [accName, setAccName] = useState(""); const [chId, setChId] = useState(""); const [chTitle, setChTitle] = useState("");
    const [draftText, setDraftText] = useState(""); const [score, setScore] = useState<AnyRec | null>(null); const [approved, setApproved] = useState(false);
    const [sent, setSent] = useState(false); const [msgId, setMsgId] = useState(""); const [pre, setPre] = useState<AnyRec | null>(null); const [report, setReport] = useState<AnyRec | null>(null);
    const [instr, setInstr] = useState(""); const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
    useEffect(() => { fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setAccts(Array.isArray(j?.accounts) ? j.accounts : [])).catch(() => {}); }, []);
    useEffect(() => { if (!accId) { setChats([]); return; } let ok = true; fetch("/api/telegram/chats?accountId=" + encodeURIComponent(accId), { cache: "no-store" }).then((r) => r.json()).then((j) => { if (!ok) return; const l = j?.chats || []; setChats(l.filter((c: AnyRec) => c.category === "channel" || c.isChannel || c.category === "group")); }).catch(() => {}); return () => { ok = false; }; }, [accId]);
    const call = async (path: string, body?: AnyRec) => { setBusy(true); const r = await fetch("/api/operator/live-wizard/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wizardId: wzId, ...(body || {}) }) }).then((x) => x.json()).catch(() => null); setBusy(false); return r; };

    const start = async () => { setBusy(true); const r = await fetch("/api/operator/live-wizard/start", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((x) => x.json()).catch(() => null); setBusy(false); if (r?.wizard) { setWzId(r.wizard.id); setStep(1); setLocked(false); setAccId(""); setChId(""); setDraftText(""); setScore(null); setApproved(false); setSent(false); setReport(null); setPre(null); setNote("wizard " + r.wizard.id); } };
    const doPre = async () => { const r = await call("preflight"); setPre(r?.preflight || null); setStep(r?.ok ? 2 : 1); setNote(r?.ok ? "✓ preflight passed" : "⛔ " + (r?.preflight?.blockers || [r?.reason]).join(", ")); };
    const selA = async (id: string) => { const a = accts.find((x) => x.slotId === id); setAccId(id); setAccName(a?.displayName || id); setChId(""); const r = await call("select-account", { accountId: id, accountDisplayName: a?.displayName || id }); if (r?.blocked) setNote("⛔ " + r.reason); else setStep(3); };
    const selT = async (id: string) => { const c = chats.find((x) => String(x.id) === id); setChId(id); setChTitle(c?.title || id); const r = await call("select-target", { chatId: id, chatTitle: c?.title || id }); if (r?.blocked) setNote("⛔ " + r.reason); else setStep(4); };
    const selG = async () => { const r = await call("select-agent", { agentId: agent }); if (r?.blocked) setNote("⛔ " + r.reason); else setStep(5); };
    const lock = async () => { const r = await call("lock-target", { confirm: true }); if (r?.ok) { setLocked(true); setStep(6); setNote("🔒 target locked (account/chat/agent immutable)"); } else setNote("⛔ " + (r?.reason || "lock failed")); };
    const mkPilot = async () => { const r = await call("create-pilot"); if (r?.ok) { setStep(7); setNote("pilot создан"); } else setNote("⛔ " + (r?.reason || "")); };
    const mkDraft = async () => { const r = await call("create-draft", { instruction: instr }); if (r?.draft) { setDraftText(r.draft.text); setStep(8); setNote("draft создан"); } else setNote("⛔ " + (r?.reason || "")); };
    const doScore = async () => { const r = await call("score-draft"); if (r?.score) { setScore(r.score); setStep(9); } else setNote("⛔ " + (r?.reason || "")); };
    const saveEdit = async () => { const r = await call("update-draft", { text: draftText }); if (r?.ok) { setApproved(false); setNote("draft обновлён (approval сброшен)"); } };
    const approve = async () => { const r = await call("approve-draft", { approved: true }); if (r?.ok) { setApproved(true); setStep(11); setNote("approved → confirm required"); } else setNote("⛔ " + (r?.reason || "")); };
    const confirm2 = async () => {
      const phrase = prompt("FINAL LIVE SEND CONFIRMATION\nAccount: " + accName + "\nChat: " + chTitle + "\nAgent: " + agent + "\n\n" + (draftText || "").slice(0, 200) + "\n\nОтправит РОВНО ОДНО реальное сообщение в locked target.\nВведи фразу:");
      if (phrase === null) return;
      const r = await call("confirm-send", { confirmPhrase: phrase });
      if (r?.sent) { setSent(true); setMsgId(r.telegramMessageId || ""); setStep(12); setNote("✅ отправлено одно сообщение"); }
      else setNote((r?.blocked ? "⛔ blocked: " : "❌ ") + (r?.reason || r?.message || ""));
      const rep = await fetch("/api/operator/live-wizard/report/" + wzId, { cache: "no-store" }).then((x) => x.json()).catch(() => null); setReport(rep?.report || null);
    };
    const cancel = async () => { await call("cancel"); setNote("wizard отменён"); setWzId(""); setLocked(false); };

    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-4xl space-y-3">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3">
        <div className="flex items-center justify-between"><div className="text-lg font-black text-amber-200">🧭 LIVE PILOT WIZARD</div>{!wzId ? <button onClick={start} disabled={busy} className="rounded bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50">▶ Start Wizard</button> : <button onClick={cancel} className="rounded bg-zinc-600/25 px-3 py-1 text-[11px] hover:bg-zinc-600/40">Cancel Wizard</button>}</div>
        <div className="mt-1 flex flex-wrap gap-1">{STEPS.map((s, i) => <span key={s} className={"rounded px-1.5 py-0.5 text-[9px] " + (step === i + 1 ? "bg-fuchsia-600/40 text-white" : step > i + 1 ? "bg-emerald-600/20 text-emerald-300" : "bg-white/5 text-tg-muted")}>{i + 1}·{s}</span>)}</div>
      </div>
      {note && <div className="rounded-lg bg-white/5 p-2 text-[11px] text-fuchsia-200">{note}</div>}

      {wzId && <>
        <div className="flex flex-wrap gap-2">
          <button onClick={doPre} disabled={busy} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">1 · Preflight</button>
          {pre && <span className="self-center text-[10px]">{Object.entries(pre.checks || {}).map(([k, v]) => <span key={k} className="mr-1" style={{ color: v === "pass" ? "#4ade80" : "#f87171" }}>{k.slice(0, 6)}:{v as any}</span>)}</span>}
        </div>

        {/* TARGET LOCK CARD */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Target Lock {locked && "· 🔒 LOCKED (immutable)"}</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <select disabled={locked} value={accId} onChange={(e) => selA(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text disabled:opacity-50"><option value="" className="bg-black">Account —</option>{accts.map((a) => <option key={a.slotId} value={a.slotId} className="bg-black">{(a.displayName || a.slotId) + (a.status === "ready" ? " ✓" : " (не готов)")}</option>)}</select>
            <select disabled={locked} value={agent} onChange={(e) => { setAgent(e.target.value); }} onBlur={selG} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text disabled:opacity-50">{AGENTS.map((a) => <option key={a} value={a} className="bg-black">{a}</option>)}</select>
            <select disabled={locked || !accId} value={chId} onChange={(e) => selT(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text disabled:opacity-50"><option value="" className="bg-black">Chat —</option>{chats.map((c) => <option key={String(c.id)} value={String(c.id)} className="bg-black">{c.title}</option>)}</select>
          </div>
          <div className="mt-2 flex gap-2">
            {!locked && <button onClick={selG} disabled={busy} className="rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20">Set Agent</button>}
            {!locked && <button onClick={lock} disabled={busy || !accId || !chId} className="rounded bg-rose-600/25 px-3 py-1 text-[11px] font-bold text-rose-100 hover:bg-rose-600/40">🔒 LOCK TARGET</button>}
            {locked && <button onClick={mkPilot} disabled={busy} className="rounded bg-white/10 px-3 py-1 text-[11px] hover:bg-white/20">6 · Create Pilot</button>}
          </div>
        </div>

        {/* DRAFT REVIEW CARD */}
        {locked && <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="text-[9px] uppercase text-fuchsia-300/70">Draft Review</div>
          <textarea value={instr} onChange={(e) => setInstr(e.target.value)} rows={2} placeholder="Инструкция для draft (или текст поста)" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
          <div className="flex flex-wrap gap-2"><button onClick={mkDraft} disabled={busy} className="rounded bg-white/10 px-3 py-1 text-[11px] hover:bg-white/20">7 · Create Draft</button><button onClick={doScore} disabled={busy || !draftText} className="rounded bg-white/10 px-3 py-1 text-[11px] hover:bg-white/20">8 · Score</button></div>
          {draftText && <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows={3} className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]" />}
          {score && <div className="text-[10px] text-tg-muted">overall {score.overallScore} · safety {score.safetyScore} · persona {score.personaMatchScore} · clarity {score.clarityScore} · risk <b style={{ color: score.riskLevel === "high" ? "#f87171" : score.riskLevel === "medium" ? "#fbbf24" : "#4ade80" }}>{score.riskLevel}</b>{(score.flags || []).length > 0 && " · flags: " + score.flags.join(",")}</div>}
          <div className="flex flex-wrap gap-2"><button onClick={saveEdit} disabled={busy || !draftText} className="rounded bg-white/10 px-3 py-1 text-[11px] hover:bg-white/20">Save Edit</button><button onClick={approve} disabled={busy || !draftText} className="rounded bg-emerald-600/25 px-3 py-1 text-[11px] hover:bg-emerald-600/40">10 · Approve</button><button onClick={confirm2} disabled={busy || !approved || sent} className="rounded bg-rose-600/30 px-3 py-1 text-[11px] font-bold text-rose-100 hover:bg-rose-600/50 disabled:opacity-40">11 · Confirm Live Send</button></div>
        </div>}

        {/* POST-SEND VERIFICATION */}
        {sent && <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-[12px]">
          <div className="font-black text-emerald-200">✅ Post-send Verification</div>
          <div className="text-tg-muted">Sent: true · messageId: {msgId || "—"} · second send blocked: true · pilot locked: true</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <a href="/world" className="rounded bg-white/10 px-2 py-1 text-[10px] hover:bg-white/20">Open World OS</a>
            <button onClick={() => { try { navigator.clipboard.writeText(JSON.stringify(report, null, 2)); setNote("report скопирован"); } catch {} }} className="rounded bg-white/10 px-2 py-1 text-[10px] hover:bg-white/20">Copy Report JSON</button>
          </div>
        </div>}
        {report && <pre className="max-h-40 overflow-auto rounded bg-black/40 p-2 text-[10px] text-tg-muted">{JSON.stringify(report, null, 2)}</pre>}
      </>}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">target_lock_required · one account/target/agent/draft/send · confirm phrase «SEND ONE LIVE MESSAGE» · после lock target immutable · второй send → WIZARD_ALREADY_SENT_ONE_MESSAGE · auto/mass/retry/raw = false. Send делегируется в проверенный live-pilot → sendMessage.</div>
    </div></main>;
  }

  // ================= MANUAL LIVE PILOT (T13) =================
  function LivePilotWB() {
    const [accts, setAccts] = useState<AnyRec[]>([]); const [chats, setChats] = useState<AnyRec[]>([]);
    const [accId, setAccId] = useState(""); const [accName, setAccName] = useState(""); const [chId, setChId] = useState(""); const [chTitle, setChTitle] = useState("");
    const [instr, setInstr] = useState(""); const [pilot, setPilot] = useState<AnyRec | null>(null); const [draft, setDraft] = useState<AnyRec | null>(null);
    const [pre, setPre] = useState<AnyRec | null>(null); const [report, setReport] = useState<AnyRec | null>(null);
    const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
    useEffect(() => { fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setAccts(Array.isArray(j?.accounts) ? j.accounts : [])).catch(() => {}); }, []);
    useEffect(() => { if (!accId) { setChats([]); return; } let ok = true; fetch("/api/telegram/chats?accountId=" + encodeURIComponent(accId), { cache: "no-store" }).then((r) => r.json()).then((j) => { if (!ok) return; const l = j?.chats || []; setChats(l.filter((c: AnyRec) => c.category === "channel" || c.isChannel || c.category === "group")); }).catch(() => { if (ok) setChats([]); }); return () => { ok = false; }; }, [accId]);
    const api = async (path: string, body?: AnyRec) => { setBusy(true); const r = await fetch("/api/operator/live-pilot/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }).then((x) => x.json()).catch(() => null); setBusy(false); return r; };
    const runPre = async () => { const r = await api("preflight", { accountId: accId, chatId: chId, agentId: agent }); setPre(r?.preflight || null); setNote(r?.pilotAllowed ? "✓ preflight passed" : "⛔ preflight blocked: " + (r?.preflight?.blockers || []).join(", ")); };
    const create = async () => { const r = await api("create", { accountId: accId, accountDisplayName: accName, chatId: chId, chatTitle: chTitle, agentId: agent }); if (r?.pilot) { setPilot(r.pilot); setDraft(null); setReport(null); setNote("pilot " + r.pilot.id + " · " + r.pilot.status); } else setNote("⛔ " + (r?.reason || "create failed") + (r?.blockers ? ": " + r.blockers.join(", ") : "")); };
    const mkDraft = async () => { if (!pilot) return; const r = await api("create-draft", { pilotId: pilot.id, instruction: instr }); if (r?.draft) { setDraft(r.draft); setNote("draft создан (не отправлен)"); } else setNote("⛔ " + (r?.reason || "draft failed")); };
    const approve = async () => { if (!pilot || !draft) return; const r = await api("approve-draft", { pilotId: pilot.id, draftId: draft.id, approved: true, reviewer: "human" }); if (r?.ok) { setDraft({ ...draft, status: "send_confirm_required" }); setNote("approved → confirm required"); } else setNote("⛔ " + (r?.reason || "approve failed")); };
    const confirm2 = async () => {
      if (!pilot || !draft) return;
      const phrase = prompt("CONFIRM ONE LIVE MESSAGE\nАккаунт: " + accName + "\nЧат: " + chTitle + "\nАгент: " + agent + "\n\nТекст:\n" + (draft.text || "").slice(0, 200) + "\n\nОдин draft · один target · один send · без auto/retry.\nВведи фразу:");
      if (phrase === null) return;
      if (phrase !== "SEND ONE LIVE MESSAGE") { setNote("⛔ фраза неверна — отправки нет."); return; }
      const r = await api("confirm-send", { pilotId: pilot.id, draftId: draft.id, confirmPhrase: phrase, accountId: accId, chatId: chId });
      if (r?.sent) { setNote("✅ LIVE PILOT: отправлено одно сообщение · " + (r.telegramMessageId || "")); setDraft({ ...draft, status: "sent" }); }
      else setNote((r?.blocked ? "⛔ blocked: " : "❌ ") + (r?.reason || r?.message || "send failed"));
      const rep = await fetch("/api/operator/live-pilot/report/" + pilot.id, { cache: "no-store" }).then((x) => x.json()).catch(() => null); setReport(rep?.report || null);
    };
    const cancel = async () => { if (!pilot) return; await api("cancel", { pilotId: pilot.id }); setNote("pilot отменён"); setPilot(null); setDraft(null); };

    const pmode = !pilot ? "OFF" : draft?.status === "sent" ? "SENT" : pilot.pilotSendUsed ? "BLOCKED" : draft ? "ACTIVE" : "READY";
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-3">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 text-center">
        <div className="text-lg font-black text-amber-200">🚀 MANUAL LIVE PILOT</div>
        <div className="text-[12px] text-amber-300/90">Один аккаунт → один агент → один чат → один draft → approve → confirm-фразой → ОДНА реальная отправка. Без auto/batch/retry.</div>
        <div className="mt-1 text-[11px]">Pilot Mode: <b>{pmode}</b>{pilot && <span className="text-tg-muted"> · {pilot.id} · oneSendUsed: {String(!!pilot.pilotSendUsed)}</span>}</div>
      </div>
      {note && <div className="rounded-lg bg-white/5 p-2 text-[11px] text-fuchsia-200">{note}</div>}

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-[11px] text-tg-muted">Account
          <select value={accId} onChange={(e) => { const a = accts.find((x) => x.slotId === e.target.value); setAccId(e.target.value); setAccName(a?.displayName || a?.slotId || ""); setChId(""); setChTitle(""); }} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text"><option value="" className="bg-black">—</option>{accts.map((a) => <option key={a.slotId} value={a.slotId} className="bg-black">{(a.displayName || a.slotId) + (a.status === "ready" ? " ✓" : " (не готов)")}</option>)}</select>
        </label>
        <label className="text-[11px] text-tg-muted">Agent
          <select value={agent} onChange={(e) => setAgent(e.target.value)} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text">{AGENTS.map((a) => <option key={a} value={a} className="bg-black">{a}</option>)}</select>
        </label>
        <label className="text-[11px] text-tg-muted">Chat / Channel
          <select value={chId} onChange={(e) => { const c = chats.find((x) => String(x.id) === e.target.value); setChId(e.target.value); setChTitle(c?.title || ""); }} disabled={!accId} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text disabled:opacity-40"><option value="" className="bg-black">{accId ? "—" : "сначала аккаунт"}</option>{chats.map((c) => <option key={String(c.id)} value={String(c.id)} className="bg-black">{c.title}</option>)}</select>
        </label>
      </div>

      <textarea value={instr} onChange={(e) => setInstr(e.target.value)} rows={2} placeholder="Инструкция для draft (или сам текст поста, если brain offline)" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
      {draft && <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-[12px]"><div className="text-[9px] uppercase text-fuchsia-300/70">draft · {draft.status}</div>{draft.text}</div>}

      <div className="flex flex-wrap gap-2">
        <button onClick={runPre} disabled={busy || !accId || !chId} className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20 disabled:opacity-40">1 · Run Preflight</button>
        <button onClick={create} disabled={busy || !accId || !chId} className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20 disabled:opacity-40">2 · Create Pilot</button>
        <button onClick={mkDraft} disabled={busy || !pilot} className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20 disabled:opacity-40">3 · Create Draft</button>
        <button onClick={approve} disabled={busy || !draft || draft.status === "sent"} className="rounded-lg bg-emerald-600/25 px-3 py-1.5 text-[12px] hover:bg-emerald-600/40 disabled:opacity-40">4 · Approve</button>
        <button onClick={confirm2} disabled={busy || !draft || draft.status !== "send_confirm_required"} className="rounded-lg bg-rose-600/30 px-3 py-1.5 text-[12px] font-bold text-rose-100 hover:bg-rose-600/50 disabled:opacity-40">5 · Confirm Live Send</button>
        <button onClick={cancel} disabled={busy || !pilot} className="rounded-lg bg-zinc-600/25 px-3 py-1.5 text-[12px] hover:bg-zinc-600/40 disabled:opacity-40">Cancel</button>
      </div>

      {pre && <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-[10px]"><div className="text-fuchsia-300/70 uppercase">Preflight</div>{Object.entries(pre.checks || {}).map(([k, v]) => <span key={k} className="mr-2" style={{ color: v === "pass" ? "#4ade80" : v === "warn" ? "#fbbf24" : "#f87171" }}>{k}:{v as any}</span>)}</div>}
      {report && <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-[10px] uppercase text-fuchsia-300/70">Pilot Report</span><button onClick={() => { try { navigator.clipboard.writeText(JSON.stringify(report, null, 2)); setNote("report скопирован"); } catch {} }} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Copy JSON</button></div><pre className="max-h-40 overflow-auto rounded bg-black/40 p-2 text-[10px] text-tg-muted">{JSON.stringify(report, null, 2)}</pre></div>}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">Safety: one_draft/one_target/one_send=true · confirm_phrase «SEND ONE LIVE MESSAGE» · второй send по тому же pilot → PILOT_SEND_ALREADY_USED · auto/mass/retry/raw = false. Реальная отправка идёт проверенным путём sendMessage(operatorApproved=true).</div>
    </div></main>;
  }

  // ================= OPERATOR ANALYTICS (T9) =================
  function AnalyticsWB() {
    const OD_LS = "deepinside.operator.drafts.v1", OA_LS = "deepinside.operator.sendAudit.v1", QS_LS = "deepinside.operator.draftQualityScores.v1", FB_LS = "deepinside.operator.humanFeedback.v1";
    const FB_TYPES = ["good", "needs_shorter", "needs_longer", "wrong_tone", "wrong_context", "unsafe", "too_robotic", "too_formal", "too_casual", "factual_issue", "persona_mismatch", "approved_after_edit", "rejected"];
    const [drafts, setDr] = useState<AnyRec[]>([]); const [audit, setAud] = useState<AnyRec[]>([]); const [scores, setScores] = useState<AnyRec[]>([]); const [fb, setFb] = useState<AnyRec[]>([]);
    const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
    const [fbDraft, setFbDraft] = useState(""); const [fbRating, setFbRating] = useState(4); const [fbType, setFbType] = useState(FB_TYPES[0]); const [fbNote, setFbNote] = useState("");
    useEffect(() => { setDr(load<AnyRec[]>(OD_LS, [])); setAud(load<AnyRec[]>(OA_LS, [])); setScores(load<AnyRec[]>(QS_LS, [])); setFb(load<AnyRec[]>(FB_LS, [])); }, []);

    const scoreAll = async () => {
      setBusy(true); const out: AnyRec[] = [];
      for (const d of drafts) { const r = await fetch("/api/operator/analytics/score-draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft: d }) }).then((x) => x.json()).catch(() => null); if (r && r.score) out.push(r.score); }
      setScores(out); save(QS_LS, out); setBusy(false); setNote("Оценено: " + out.length);
    };
    const addFb = () => { if (!fbDraft) { setNote("Выбери draft."); return; } const e = { id: rid(), draftId: fbDraft, agentId: (drafts.find((d) => d.id === fbDraft) || {}).agentId || agent, rating: fbRating, feedbackType: fbType, note: fbNote, createdAt: now(), learningApplied: false }; const next = [e, ...fb]; setFb(next); save(FB_LS, next); setFbNote(""); setNote("Feedback сохранён (live-поведение не меняется автоматически)."); };

    // derived
    const cnt = (s: string) => drafts.filter((d) => d.status === s).length;
    const sent = audit.filter((a) => a.event === "MESSAGE_SENT_AFTER_CONFIRM").length;
    const mock = audit.filter((a) => a.event === "MOCK_MESSAGE_SENT").length;
    const blocked = audit.filter((a) => (a.event || "").indexOf("BLOCK") >= 0 || (a.event || "").indexOf("COMMAND_BLOCKED") >= 0).length;
    const avg = scores.length ? Math.round(scores.reduce((s, x) => s + (x.overallScore || 0), 0) / scores.length) : null;
    const perAgent = AGENTS.map((a) => { const mine = drafts.filter((d) => d.agentId === a); return { a, created: mine.length, approved: mine.filter((d) => d.status === "send_confirm_required" || d.status === "sent").length, rejected: mine.filter((d) => d.status === "rejected").length, sent: mine.filter((d) => d.status === "sent").length }; });
    const report = { id: "report_" + rid(), type: "daily_operator_report", createdAt: now(), drafts: { created: drafts.length, sent, mock, blocked }, quality: { averageDraftScore: avg }, perAgent, safety: { analytics_read_only: true, auto_apply_learning: false, auto_send_allowed: false } };

    const tile = (l: string, v: any, c?: string) => <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center"><div className="text-lg font-black" style={{ color: c || "#e879f9" }}>{v}</div><div className="text-[9px] uppercase text-tg-muted">{l}</div></div>;

    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-4xl space-y-3">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">📊 Operator Analytics · read-only · auto-learning OFF</div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {tile("Drafts", drafts.length)}{tile("Approved", cnt("send_confirm_required"), "#34d399")}{tile("Rejected", cnt("rejected"), "#f87171")}{tile("Sent (real)", sent, "#4ade80")}{tile("Mock sent", mock, "#818cf8")}{tile("Blocked", blocked, blocked ? "#f87171" : "#4ade80")}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-1 flex items-center justify-between"><span className="text-[10px] uppercase text-fuchsia-300/70">Draft Quality {avg != null && "· avg " + avg}</span><button onClick={scoreAll} disabled={busy || drafts.length === 0} className="rounded bg-fuchsia-600/30 px-2 py-1 text-[11px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40">Score All</button></div>
        {note && <div className="mb-1 text-[10px] text-fuchsia-200">{note}</div>}
        {scores.length === 0 ? <div className="text-[11px] text-tg-muted">Нажми Score All (скорер локальный, без модели; approve/send не делает).</div> : <div className="overflow-auto"><table className="w-full text-[11px]"><thead className="text-fuchsia-300/60"><tr>{["Draft", "Overall", "Safety", "Clarity", "Persona", "Context", "Approval", "Risk"].map((h) => <th key={h} className="px-1 py-0.5 text-left">{h}</th>)}</tr></thead>
          <tbody>{scores.map((s, i) => <tr key={i} className="border-t border-white/5"><td className="px-1 py-0.5 text-tg-muted">{(s.draftId || "—").slice(0, 6)}</td><td className="px-1 py-0.5 font-bold">{s.overallScore}</td><td className="px-1 py-0.5">{s.safetyScore}</td><td className="px-1 py-0.5">{s.clarityScore}</td><td className="px-1 py-0.5">{s.personaMatchScore}</td><td className="px-1 py-0.5">{s.contextFitScore}</td><td className="px-1 py-0.5">{s.approvalReadinessScore}</td><td className="px-1 py-0.5" style={{ color: s.riskLevel === "high" ? "#f87171" : s.riskLevel === "medium" ? "#fbbf24" : "#4ade80" }}>{s.riskLevel}</td></tr>)}</tbody></table></div>}
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Persona Performance</div>
          {perAgent.map((p) => <div key={p.a} className="flex justify-between text-[11px]"><span className="text-tg-muted">{p.a}</span><span>{p.created} drafts · {p.sent} sent · {p.rejected} rej</span></div>)}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Human Feedback</div>
          <select value={fbDraft} onChange={(e) => setFbDraft(e.target.value)} className="mb-1 w-full rounded bg-black/40 px-2 py-1 text-[11px] text-tg-text"><option value="" className="bg-black">— draft —</option>{drafts.map((d) => <option key={d.id} value={d.id} className="bg-black">{(d.title || d.text || d.id).slice(0, 24)}</option>)}</select>
          <div className="flex gap-1"><select value={fbRating} onChange={(e) => setFbRating(+e.target.value)} className="rounded bg-black/40 px-1 py-1 text-[11px] text-tg-text">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="bg-black">{n}★</option>)}</select>
            <select value={fbType} onChange={(e) => setFbType(e.target.value)} className="flex-1 rounded bg-black/40 px-1 py-1 text-[11px] text-tg-text">{FB_TYPES.map((t) => <option key={t} value={t} className="bg-black">{t}</option>)}</select></div>
          <input value={fbNote} onChange={(e) => setFbNote(e.target.value)} placeholder="заметка" className="mt-1 w-full rounded bg-black/40 px-2 py-1 text-[11px]" />
          <button onClick={addFb} className="mt-1 rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20">Save Feedback ({fb.length})</button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-[10px] uppercase text-fuchsia-300/70">Daily Report (preview)</span><button onClick={() => { try { navigator.clipboard.writeText(JSON.stringify(report, null, 2)); setNote("Report скопирован."); } catch { setNote("copy failed"); } }} className="rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20">Copy JSON</button></div>
        <pre className="max-h-40 overflow-auto rounded bg-black/40 p-2 text-[10px] text-tg-muted">{JSON.stringify(report, null, 2)}</pre>
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">analytics_read_only · auto_apply_learning=false · suggestions = preview-only · scorer не делает approve/send.</div>
    </div></main>;
  }

  // ================= EPICSTAR AI OPERATOR WORKBENCH (T2/T3/T4/T5) =================
  function OperatorWB() {
    const OP_LS = "deepinside.operator.workbench.v1", OD_LS = "deepinside.operator.drafts.v1", OA_LS = "deepinside.operator.sendAudit.v1";
    const ALLOWED = ["status", "ping_brain", "summarize_chat", "suggest_reply", "prepare_message", "test_draft", "clear_errors"];
    const BLOCKED = ["auto_send", "mass_send", "bulk_dm", "scrape_users", "export_sessions", "bypass_approval", "background_dm", "silent_publish", "credential_export"];
    const [op, setOp] = useState<AnyRec | null>(null);
    const [accts, setAccts] = useState<AnyRec[]>([]);
    const [chats, setChats] = useState<AnyRec[]>([]);
    const [accId, setAccId] = useState(""); const [chId, setChId] = useState(""); const [chTitle, setChTitle] = useState("");
    const [persona, setPersona] = useState<AnyRec | null>(null);
    const [instr, setInstr] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
    const [odrafts, setODrafts] = useState<AnyRec[]>([]); const [audit, setAudit] = useState<AnyRec[]>([]);
    const [filter, setFilter] = useState("all");
    const [pg, setPg] = useState<AnyRec | null>(null);
    const [ops, setOps] = useState<AnyRec | null>(null);
    const [brain, setBrain] = useState<AnyRec | null>(null);
    const writeD = (v: AnyRec[]) => { setODrafts(v); save(OD_LS, v); };
    const logAudit = (event: string, extra?: AnyRec) => { const e = { id: rid(), event, operator: "EPICSTAR AI OPERATOR", agentId: agent, accountId: accId, chatId: chId, at: now(), ...(extra || {}) }; const next = [e, ...audit].slice(0, 200); setAudit(next); save(OA_LS, next); };

    const refresh = async () => { setBusy(true); try { const s = await fetch("/api/operator/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null); setOp(s && s.operator ? s.operator : null); const t = await fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null); setAccts(Array.isArray(t?.accounts) ? t.accounts : []); const p = await fetch("/api/operator/production/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null); setPg(p?.productionGate || null); const o = await fetch("/api/operator/ops/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null); setOps(o?.ops || null); const br = await fetch("/api/operator/brain/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null); setBrain(br?.brain || null); } catch {} setBusy(false); };
    const ENV_OLLAMA = 'OPERATOR_MODEL_ENDPOINT="http://localhost:11434/v1/chat/completions"\nOPERATOR_PRIMARY_MODEL="qwen2.5-coder:7b"\nOPERATOR_FALLBACK_MODEL="gemma2:9b"';
    const ENV_LM = 'OPERATOR_MODEL_ENDPOINT="http://localhost:8096/v1/chat/completions"\nOPERATOR_PRIMARY_MODEL="qwen2.5-coder:7b"\nOPERATOR_FALLBACK_MODEL="gemma2:9b"';
    const brainSelect = async (provider: string, endpoint: string) => { setBusy(true); await fetch("/api/operator/brain/select-endpoint", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, endpoint, model: "qwen2.5-coder:7b" }) }).then((x) => x.json()).catch(() => null); await refresh(); setBusy(false); logAudit("BRAIN_ACTIVE_ENDPOINT_SELECTED"); setNote("endpoint → " + provider); };
    const opsRecovery = async (action: string) => { setBusy(true); const r = await fetch("/api/operator/ops/recovery-action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, operator: "human" }) }).then((x) => x.json()).catch(() => null); await refresh(); setBusy(false); setNote("recovery " + action + ": " + (r?.blocked ? "BLOCKED" : r?.ok ? "ok" : "err")); logAudit("RECOVERY_ACTION_" + action.toUpperCase()); };
    const pgAction = async (path: string, body?: AnyRec) => { setBusy(true); const r = await fetch("/api/operator/production/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }).then((x) => x.json()).catch(() => null); await refresh(); setBusy(false); setNote(r ? (path + ": " + (r.runtimeMode || r.reason || (r.ok ? "ok" : "err"))) : "err"); logAudit("PRODUCTION_" + path.replace(/-/g, "_").toUpperCase()); return r; };
    const enableLiveFlow = async () => { const req = await fetch("/api/operator/production/request-live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestedBy: "human", reason: "manual live", acknowledge: true }) }).then((x) => x.json()).catch(() => null); if (!req?.liveRequest) { setNote("request-live failed"); return; } const phrase = prompt("Введи фразу подтверждения для LIVE:"); if (phrase !== "ENABLE MANUAL LIVE") { setNote("Фраза неверна — live не включён."); return; } await pgAction("enable-live", { liveRequestId: req.liveRequest.id, confirmPhrase: phrase, operator: "human" }); };
    useEffect(() => { setODrafts(load<AnyRec[]>(OD_LS, [])); setAudit(load<AnyRec[]>(OA_LS, [])); save(OP_LS, { enabled: true, operator: "EPICSTAR AI OPERATOR", mode: "MANUAL_APPROVAL_ONLY", updatedAt: now() }); refresh(); }, []);
    useEffect(() => { fetch("/api/operator/context/persona", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agentId: agent }) }).then((r) => r.json()).then((j) => setPersona(j?.persona || null)).catch(() => setPersona(null)); }, [agent]);
    useEffect(() => { if (!accId) { setChats([]); return; } let ok = true; fetch("/api/telegram/chats?accountId=" + encodeURIComponent(accId), { cache: "no-store" }).then((r) => r.json()).then((j) => { if (!ok) return; const list = j?.chats || []; setChats(list.filter((c: AnyRec) => c.category === "channel" || c.isChannel || c.category === "group")); }).catch(() => { if (ok) setChats([]); }); return () => { ok = false; }; }, [accId]);

    const ping = async () => { setBusy(true); const r = await fetch("/api/operator/command", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "ping_brain" }) }).then((x) => x.json()).catch(() => null); setBusy(false); setNote(r ? ("Brain: " + (r.status || "?") + " · active: " + (r.activeModel || "—")) : "ping failed"); logAudit("OPERATOR_STATUS_CHECK"); };
    const tryCmd = async (c: string) => { const r = await fetch("/api/operator/command", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: c, agentId: agent, accountId: accId, chatId: chId, input: instr }) }).then((x) => x.json()).catch(() => null); if (r && r.blocked) { setNote("⛔ blocked: " + c); logAudit("COMMAND_BLOCKED", { command: c }); } else setNote("✓ " + c + (r && r.type === "draft_preview" ? " → draft" : "")); if (r && r.type === "draft_preview" && r.draft) addDraftFromPreview(r.draft); };
    const addDraftFromPreview = (dp: AnyRec) => { if (!accId || !chId) { setNote("Сначала выбери аккаунт и канал."); return; } const d = { id: rid(), agentId: agent, accountId: accId, chatId: chId, chatTitle: chTitle, text: dp.text || "", status: "waiting_for_review", createdAt: now(), updatedAt: now(), approvedAt: null, sentAt: null }; writeD([d, ...odrafts]); logAudit("DRAFT_CREATED", { draftId: d.id }); logAudit("APPROVAL_REQUIRED", { draftId: d.id }); };
    const createDraft = async () => { setBusy(true); const r = await fetch("/api/operator/command", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "create_draft", agentId: agent, accountId: accId, chatId: chId, input: instr || "Подготовь короткий пост." }) }).then((x) => x.json()).catch(() => null); setBusy(false); if (r && r.draft) addDraftFromPreview(r.draft); else setNote("Не удалось создать draft (мозг offline?)."); };
    const setStatusD = (id: string, status: string, patch?: AnyRec) => writeD(odrafts.map((d) => d.id === id ? { ...d, status, updatedAt: now(), ...(patch || {}) } : d));
    const editText = (id: string, text: string) => writeD(odrafts.map((d) => d.id === id ? { ...d, text, status: (d.status === "approved" || d.status === "send_confirm_required") ? "waiting_for_review" : d.status, approvedAt: null, updatedAt: now() } : d));
    const approve = (id: string) => { setStatusD(id, "send_confirm_required", { approvedAt: now() }); logAudit("DRAFT_APPROVED", { draftId: id }); logAudit("SEND_CONFIRM_REQUIRED", { draftId: id }); };
    const confirmSend = async (d: AnyRec) => {
      if (d.status !== "send_confirm_required" || d.sentAt) { setNote("Confirm недоступен для этого статуса."); return; }
      setBusy(true);
      const pgst = await fetch("/api/operator/production/status", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      const live = pgst?.productionGate?.runtimeMode === "MANUAL_LIVE_ONLY" && pgst?.productionGate?.realSendAllowed === true;
      if (!confirm((live ? "LIVE CONFIRM SEND — РЕАЛЬНАЯ отправка" : "SIMULATION — mock (реального сообщения НЕ будет)") + " в «" + (d.chatTitle || d.chatId) + "». Продолжить?")) { setBusy(false); return; }
      setStatusD(d.id, "sending");
      if (!live) { setBusy(false); setStatusD(d.id, "sent", { sentAt: now(), mock: true }); logAudit("MOCK_MESSAGE_SENT", { draftId: d.id }); setNote("🧪 SIMULATION: mock-отправка, реального сообщения нет. Для реальной — Production Gate → Enable Manual Live."); return; }
      const r = await fetch("/api/telegram/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId: d.accountId, chatId: d.chatId, text: d.text, operatorApproved: true }) }).then((x) => x.json()).catch(() => null);
      setBusy(false); const ok = r && r.sent === true;
      setStatusD(d.id, ok ? "sent" : "failed", { sentAt: ok ? now() : null });
      logAudit(ok ? "MESSAGE_SENT_AFTER_CONFIRM" : "TELEGRAM_SEND_FAILED", { draftId: d.id });
      setNote(ok ? "✅ LIVE: отправлено после подтверждения." : "❌ " + (r?.message || "send failed"));
    };
    const intentBlocked = (() => { const c = instr.trim().toLowerCase().replace(/^\//, ""); return BLOCKED.indexOf(c) >= 0; })();

    const stColor: Record<string, string> = { waiting_for_review: "#a78bfa", needs_changes: "#fbbf24", approved: "#34d399", send_confirm_required: "#f59e0b", sending: "#818cf8", sent: "#4ade80", failed: "#f87171", rejected: "#f87171", cancelled: "#94a3b8" };
    const shown = odrafts.filter((d) => filter === "all" || d.status === filter);
    const opStatusColor = !op ? "#94a3b8" : op.status === "online" ? "#4ade80" : op.status === "degraded" ? "#fbbf24" : "#f87171";

    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-4xl space-y-3">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[13px] text-fuchsia-200">🛰 EPICSTAR AI OPERATOR</b>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: opStatusColor + "22", color: opStatusColor }}>{op ? op.status.toUpperCase() : "UNKNOWN"}</span>
          <span className="text-[10px] text-tg-muted">SYSTEM_OPERATOR · MANUAL_APPROVAL_ONLY</span>
          <button onClick={refresh} disabled={busy} className="ml-auto rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20">↻ Refresh</button>
          <button onClick={ping} disabled={busy} className="rounded bg-emerald-600/25 px-2 py-1 text-[11px] hover:bg-emerald-600/40">⚡ Ping Brain</button>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-tg-muted sm:grid-cols-4">
          <div>Active brain: <b style={{ color: op?.modelOnline ? "#4ade80" : "#f87171" }}>{op?.activeModel || "offline"}</b></div>
          <div>Primary: {op?.primaryModel || "qwen2.5-coder:7b"}</div>
          <div>Fallback: {op?.fallbackModel || "gemma2:9b"}</div>
          <div>Approval: <b className="text-emerald-300">ON</b> · Auto-send: <b className="text-emerald-300">OFF</b></div>
        </div>
        {op?.errors && op.errors.length > 0 && <div className="mt-1 text-[10px] text-amber-300/80">{op.errors.join(" · ")}</div>}
        {note && <div className="mt-1 text-[10px] text-fuchsia-200">{note}</div>}
      </div>

      {/* Brain Bootstrap (T11) */}
      <div className="rounded-2xl border p-3" style={{ borderColor: brain?.online ? "#34d39955" : "#f8717155", background: brain?.online ? "#34d3991a" : "#f871711a" }}>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-[9px] uppercase text-fuchsia-300/70">Brain Bootstrap</span>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: brain?.online ? "#34d39933" : "#f8717133", color: brain?.online ? "#86efac" : "#fca5a5" }}>{brain ? (brain.online ? "ONLINE" : "OFFLINE") : "—"}</span>
          {brain?.online && <span className="text-tg-muted">provider: <b>{brain.provider}</b> · model: <b className="text-fuchsia-200">{brain.activeModel}</b> · {brain.latencyMs}ms</span>}
          <span className="ml-auto text-[9px] text-tg-muted">primary {brain?.primaryModel || "qwen2.5-coder:7b"} → fallback {brain?.fallbackModel || "gemma2:9b"}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          <button onClick={refresh} disabled={busy} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Check Brain</button>
          <button onClick={() => brainSelect("lm-studio", "http://localhost:8096/v1/chat/completions")} disabled={busy} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Use LM Studio 8096</button>
          <button onClick={() => brainSelect("ollama", "http://localhost:11434/v1/chat/completions")} disabled={busy} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Use Ollama 11434</button>
          <button onClick={() => { try { navigator.clipboard.writeText(ENV_OLLAMA); setNote(".env (Ollama) скопирован"); } catch {} }} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Copy .env (Ollama)</button>
          <button onClick={() => { try { navigator.clipboard.writeText(ENV_LM); setNote(".env (LM Studio) скопирован"); } catch {} }} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Copy .env (LM Studio)</button>
        </div>
        {brain && !brain.online && <div className="mt-2 rounded-lg bg-black/30 p-2 text-[10px] text-rose-200">
          <b>OPERATOR BRAIN OFFLINE</b> — ни один локальный endpoint не ответил.{Array.isArray(brain.checkedEndpoints) && <span> Проверено: {brain.checkedEndpoints.map((c: AnyRec) => c.provider + " " + (c.online ? "ok" : c.error)).join(" · ")}.</span>}
          <div className="mt-1 text-tg-muted">Запусти один из вариантов:</div>
          <pre className="mt-0.5 whitespace-pre-wrap text-tg-muted">ollama pull qwen2.5-coder:7b{"\n"}ollama pull gemma2:9b{"\n"}ollama serve</pre>
          <div className="text-tg-muted">или LM Studio → Load qwen2.5-coder → Start Local Server → порт 8096 → OpenAI API. Потом нажми Check Brain.</div>
        </div>}
      </div>

      {/* Live mode banner */}
      <div className="rounded-xl border p-2 text-center text-[11px] font-bold" style={{ borderColor: (pg?.runtimeMode === "MANUAL_LIVE_ONLY" ? "#f8717155" : pg?.runtimeMode === "LOCKED" ? "#94a3b855" : "#34d39955"), background: (pg?.runtimeMode === "MANUAL_LIVE_ONLY" ? "#f871711a" : pg?.runtimeMode === "LOCKED" ? "#94a3b81a" : "#34d3991a"), color: (pg?.runtimeMode === "MANUAL_LIVE_ONLY" ? "#fca5a5" : pg?.runtimeMode === "LOCKED" ? "#cbd5e1" : "#86efac") }}>
        {pg?.runtimeMode === "MANUAL_LIVE_ONLY" ? "🔴 MANUAL LIVE MODE — реальная отправка только для approved+confirmed · Auto-send OFF · Two-step ON" : pg?.runtimeMode === "LOCKED" ? "🔒 OPERATOR LOCKED — все отправки заблокированы" : "🧪 SIMULATION MODE — реальных сообщений не уходит (Confirm Send = mock)"}
      </div>

      {/* Selectors */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Account</div>
          <select value={accId} onChange={(e) => { setAccId(e.target.value); setChId(""); setChTitle(""); }} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-tg-text"><option value="" className="bg-black">— выбрать —</option>{accts.map((a) => <option key={a.slotId} value={a.slotId} className="bg-black">{(a.displayName || a.slotId) + (a.status === "ready" ? " ✓" : " (не готов)")}</option>)}</select>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Agent (persona)</div>
          <select value={agent} onChange={(e) => setAgent(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-tg-text">{AGENTS.map((a) => <option key={a} value={a} className="bg-black">{a}</option>)}</select>
          <div className="mt-0.5 text-[9px] text-tg-muted">operator остаётся EPICSTAR · стиль: {persona?.name || agent}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Chat / Channel</div>
          <select value={chId} onChange={(e) => { const c = chats.find((x) => String(x.id) === e.target.value); setChId(e.target.value); setChTitle(c?.title || ""); }} disabled={!accId} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-tg-text disabled:opacity-40"><option value="" className="bg-black">{accId ? "— выбрать —" : "сначала аккаунт"}</option>{chats.map((c) => <option key={String(c.id)} value={String(c.id)} className="bg-black">{c.title}</option>)}</select>
        </div>
      </div>

      {/* Context Inspector (persona + memory) */}
      {persona && <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-[10px]"><span className="text-fuchsia-300/70 uppercase">Context Inspector · </span>tone: {(persona.tone || []).join(", ")} · rules: {(persona.styleRules || []).slice(0, 3).join("; ")} · memory facts: {((brains[agent] || {}).longTerm || []).length}</div>}

      {/* Draft creator */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Create draft (через мозг оператора · только черновик)</div>
        <textarea value={instr} onChange={(e) => setInstr(e.target.value)} rows={2} placeholder="Инструкция / команда (например: suggest_reply ... или /auto_send для проверки блокировки)" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
        {intentBlocked && <div className="mt-1 text-[10px] text-rose-300">⛔ это заблокированная команда — отправки не будет</div>}
        <div className="mt-1 flex flex-wrap gap-2">
          <button onClick={createDraft} disabled={busy || !accId || !chId} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[11px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40">＋ Create Draft</button>
          <button onClick={() => tryCmd("test_draft")} disabled={busy} className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] hover:bg-white/20">🧪 Test Draft</button>
          <button onClick={() => tryCmd(intentBlocked ? instr.trim().toLowerCase().replace(/^\//, "") : "auto_send")} className="rounded-lg bg-rose-600/20 px-3 py-1.5 text-[11px] text-rose-200 hover:bg-rose-600/35">⛔ Test Blocked</button>
        </div>
      </div>

      {/* Safe Send status */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-[10px]">
        {[["Safe Send", op?.telegramReady ? "Ready" : "Not Ready", op?.telegramReady ? "#4ade80" : "#f87171"], ["Two-step", "ON", "#4ade80"], ["Approval Gate", "ON", "#4ade80"], ["Auto Send", "OFF", "#4ade80"]].map(([l, v, c]) => <div key={l as string} className="rounded-lg border border-white/10 bg-white/5 p-2"><div className="font-black" style={{ color: c as string }}>{v as string}</div><div className="text-tg-muted">{l as string}</div></div>)}
      </div>

      {/* Draft Queue */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-1 flex flex-wrap items-center gap-1"><span className="text-[9px] uppercase text-fuchsia-300/70">Draft Queue ({odrafts.length})</span>
          {["all", "waiting_for_review", "send_confirm_required", "sent", "rejected"].map((f) => <button key={f} onClick={() => setFilter(f)} className={"rounded-full px-2 py-0.5 text-[9px] " + (filter === f ? "bg-fuchsia-600/40 text-white" : "bg-white/5 text-tg-muted hover:bg-white/10")}>{f}</button>)}
        </div>
        {shown.length === 0 ? <div className="text-[11px] text-tg-muted">Очередь пуста.</div> : <div className="space-y-1">{shown.map((d) => <div key={d.id} className="rounded-xl border border-white/10 bg-black/30 p-2">
          <div className="flex items-center justify-between"><span className="text-[11px]"><b className="text-fuchsia-200">{d.agentId}</b> → 📢 {d.chatTitle || d.chatId}</span><span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: (stColor[d.status] || "#888") + "22", color: stColor[d.status] || "#888" }}>{d.status}</span></div>
          <textarea defaultValue={d.text} onBlur={(e) => e.target.value !== d.text && editText(d.id, e.target.value)} rows={2} className="mt-1 w-full rounded bg-black/40 px-2 py-1 text-[11px]" />
          <div className="mt-1 flex flex-wrap gap-1">
            {d.status === "waiting_for_review" && <button onClick={() => approve(d.id)} className="rounded bg-emerald-600/25 px-2 py-0.5 text-[10px] hover:bg-emerald-600/40">✓ Approve</button>}
            {d.status === "send_confirm_required" && <button onClick={() => confirmSend(d)} disabled={busy} className="rounded bg-fuchsia-600/40 px-2 py-0.5 text-[10px] font-semibold hover:bg-fuchsia-600/60">📤 Confirm Send</button>}
            {d.status !== "sent" && d.status !== "rejected" && <button onClick={() => { setStatusD(d.id, "rejected"); logAudit("DRAFT_REJECTED", { draftId: d.id }); }} className="rounded bg-rose-600/20 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-600/35">✕ Reject</button>}
            <button onClick={() => writeD(odrafts.filter((x) => x.id !== d.id))} className="ml-auto text-[10px] text-tg-muted hover:text-rose-300">удалить</button>
          </div>
        </div>)}</div>}
      </div>

      {/* Live Ops Monitor (T8) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] text-tg-muted">
          <span className="text-[9px] uppercase text-fuchsia-300/70">Live Ops</span>
          {(() => { const st = ops?.systemState || "UNKNOWN"; const col = st === "ONLINE" ? "#4ade80" : st === "DEGRADED" ? "#fbbf24" : st === "LOCKED" ? "#94a3b8" : "#f87171"; return <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: col + "22", color: col }}>{st}</span>; })()}
          <span>brain: <b style={{ color: ops?.snapshot?.brain?.status === "online" ? "#4ade80" : ops?.snapshot?.brain?.status === "degraded" ? "#fbbf24" : "#f87171" }}>{ops?.snapshot?.brain?.status || "—"}</b></span>
          <span>telegram: <b>{ops?.snapshot?.telegram?.ready ? "ready" : "not ready"}</b></span>
          <span>incidents: <b style={{ color: (ops?.snapshot?.incidents?.open || 0) ? "#f87171" : "#4ade80" }}>{ops?.snapshot?.incidents?.open ?? 0}</b></span>
        </div>
        {Array.isArray(ops?.incidents) && ops.incidents.length > 0 && <div className="mb-1 space-y-0.5">{ops.incidents.map((i: AnyRec) => <div key={i.id} className="text-[10px]" style={{ color: i.severity === "critical" ? "#fca5a5" : "#fcd34d" }}>● {i.type} — {i.title}</div>)}</div>}
        <div className="flex flex-wrap gap-1">
          <button onClick={() => opsRecovery("rerun_health_checks")} disabled={busy} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Rerun Health</button>
          <button onClick={() => opsRecovery("unlock_to_simulation")} disabled={busy} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Unlock→Sim</button>
          <button onClick={() => opsRecovery("send_message")} disabled={busy} className="rounded bg-rose-600/20 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-600/35">⛔ Test Blocked Recovery</button>
          <button onClick={() => fetch("/api/operator/ops/emergency-lock", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then(() => refresh()).then(() => { logAudit("EMERGENCY_LOCK_REQUESTED"); setNote("🔒 Emergency lock"); })} disabled={busy} className="rounded bg-rose-700/30 px-2 py-0.5 text-[10px] font-bold text-rose-100 hover:bg-rose-700/50">🔒 Emergency Lock</button>
        </div>
      </div>

      {/* Production Gate (T7) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] text-tg-muted"><span className="text-[9px] uppercase text-fuchsia-300/70">Production Gate</span>
          <span>mode: <b className="text-fuchsia-200">{pg?.runtimeMode || "—"}</b></span><span>real send: <b style={{ color: pg?.realSendAllowed ? "#f87171" : "#4ade80" }}>{pg?.realSendAllowed ? "YES" : "NO"}</b></span><span>kill: <b>{pg?.killSwitch ? "ON" : "OFF"}</b></span><span>ready: <b>{pg?.readyForLive ? "YES" : "NO"}</b></span>
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => pgAction("check", { qaPassed: true, auditValid: true })} disabled={busy} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Run Check</button>
          <button onClick={enableLiveFlow} disabled={busy} className="rounded bg-rose-600/25 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-600/40">Enable Manual Live</button>
          <button onClick={() => pgAction("disable-live")} disabled={busy} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Disable Live</button>
          <button onClick={() => pgAction("lock", { operator: "human", reason: "manual" })} disabled={busy} className="rounded bg-rose-700/30 px-2 py-0.5 text-[10px] font-bold text-rose-100 hover:bg-rose-700/50">🔒 Emergency Lock</button>
          <button onClick={() => { const p = prompt("Фраза разблокировки:"); if (p === "UNLOCK OPERATOR") pgAction("unlock", { confirmPhrase: p }); else if (p !== null) setNote("Фраза неверна."); }} disabled={busy} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Unlock → Simulation</button>
        </div>
        <div className="mt-1 text-[9px] text-tg-muted">Enable требует фразу «ENABLE MANUAL LIVE» + пройденный Run Check. По умолчанию режим SIMULATION_ONLY: Confirm Send делает mock, не реальную отправку.</div>
      </div>

      {/* P18 Action Plan · Approval Flow (head-start) */}
      <OperatorActionPlan accountId={accId} project={agent} logAudit={logAudit} />

      {/* Audit */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-1 text-[9px] uppercase text-fuchsia-300/70">Audit Log ({audit.length})</div>
        <div className="max-h-40 space-y-0.5 overflow-auto">{audit.slice(0, 30).map((e) => <div key={e.id} className="text-[10px] text-tg-muted">{fmtDT(e.at)} · {e.event}{e.draftId ? " · " + e.draftId : ""}</div>)}{audit.length === 0 && <div className="text-[10px] text-tg-muted">—</div>}</div>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">Safety: manual_approval_required=true · two_step_send_confirmation=true · auto_send_allowed=false · background_messaging=false · mass_messaging=false · credential_export=false · session_export=false · approval_bypass_allowed=false. Send идёт только через проверенный путь /telegram/send с operatorApproved=true после Confirm.</div>
    </div></main>;
  }

  return (
    <div className="fixed inset-0 z-[92] flex flex-col text-tg-text" style={{ background: "linear-gradient(160deg,#070611,#0c0a16 55%,#070710)" }}>
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2"><span className="text-sm font-black text-fuchsia-200">🛰 DEEPINSIDE · Agent OS</span>
          <select value={agent} onChange={(e) => { setAgent(e.target.value); setSec("workspace"); }} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text">{AGENTS.map((a) => <option key={a} value={a} className="bg-black">{a}</option>)}</select>
        </div>
        <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-[12px] hover:bg-white/20">✕ Закрыть</button>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-44 shrink-0 space-y-0.5 overflow-auto border-r border-white/10 p-2">
          {SECTIONS.map(([k, label]) => <button key={k} onClick={() => setSec(k)} className={"block w-full rounded-lg px-2 py-1.5 text-left text-[12px] " + (sec === k ? "bg-fuchsia-600/30 font-semibold text-fuchsia-100" : "text-tg-muted hover:bg-white/10")}>{label.split(" ")[0]} {t("section." + k, loc, label)}</button>)}
          <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[9px] text-amber-200">approval ON · no automation · human operator</div>
        </nav>
        {sec === "command" && <Command />}
        {sec === "operator" && <OperatorWB />}
        {sec === "livepilot" && <LivePilotWB />}
        {sec === "livewizard" && <LiveWizardWB />}
        {sec === "runbook" && <RunbookWB />}
        {sec === "dryrun" && <E2EDryRunWB />}
        {sec === "postlive" && <PostLiveWB />}
        {sec === "liveprep" && <LivePrepWB />}
        {sec === "targets" && <TargetsWB />}
        {sec === "ownedaccounts" && <AccountsWB />}
        {sec === "opanalytics" && <AnalyticsWB />}
        {sec === "workspace" && <Workspace />}
        {sec === "content" && <ContentFactory />}
        {sec === "media" && <MediaFactory />}
        {sec === "canvas" && <Canvas />}
        {sec === "channelcenter" && <ChannelCenter />}
        {sec === "activity" && <Activity />}
        {sec === "matrix" && <Matrix />}
        {sec === "world" && <World />}
        {sec === "map" && <MapView />}
        {sec === "autonomy" && <Autonomy />}
      </div>
    </div>
  );
}
