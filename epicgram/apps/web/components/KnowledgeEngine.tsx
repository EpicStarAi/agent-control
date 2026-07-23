"use client";

// KNOWLEDGE ENGINE & ORGANIZATIONAL MEMORY — collective memory of DEEP INSIDE.
// Category: INTELLIGENCE · CRITICAL. UI + localStorage + derived/mock only. No API/OAuth/secrets/actions. Additive.

import { useEffect, useMemo, useState } from "react";

const SECTIONS: [string, string][] = [
  ["base", "📚 Knowledge Base"], ["research", "🔬 Research Center"], ["decisions", "📝 Decision Log"],
  ["lessons", "🎓 Lessons Learned"], ["playbooks", "📖 Playbooks"], ["prompts", "🗂 Prompt Library"],
  ["wiki", "📘 Project Wiki"], ["meetings", "🗒 Meeting Notes"], ["graph", "🌐 Knowledge Graph"], ["timeline", "⏳ Memory Timeline"],
];

const KB = {
  Infrastructure: ["VPS Contabo + Docker setup", "n8n workflow patterns", "Cloudflare tunnel config"],
  "AI Models": ["Model router (per-role)", "OpenRouter vs HF vs Ollama", "Claude/Grok/Gemini ролей"],
  Agents: ["Agent OS архитектура", "Digital twin структура", "Lifecycle этапы"],
  Media: ["Media Factory canvas", "Radio pipeline", "FaceFusion consent rules"],
  Marketing: ["Content pyramid", "Platform matrix", "Sponsor outreach"],
  Growth: ["Growth engine метрики", "Audience intelligence", "Cross-posting"],
  Monetization: ["Revenue streams", "Monetization levels", "Affiliate hub"],
  Operations: ["Runtime ops", "Provisioning approval flow", "Incident handling"],
  Security: ["No-secrets policy", "Read-only TDLib", "Approval gates"],
  Development: ["Additive module pattern", "tg-* theming", "localStorage schema"],
};
const RESEARCH = [
  { type: "Сравнение", title: "Text2Video: Kling vs Veo vs LTX", result: "LTX дешевле, Kling качественнее", status: "Done" },
  { type: "Эксперимент", title: "Voice clone latency (ElevenLabs vs RVC)", result: "RVC локально, ElevenLabs быстрее", status: "Done" },
  { type: "Гипотеза", title: "Shorts-first увеличит охват x2", result: "Проверяется", status: "Running" },
  { type: "Обзор", title: "Pinterest как источник трафика", result: "Высокий потенциал для BUCHIHA", status: "Done" },
  { type: "Исследование", title: "Оптимальное расписание радио", result: "22:00 пик для EVA", status: "Done" },
];
const DECISIONS = [
  { date: "2026-05-02", author: "AI COO", reason: "Скорость итераций", alt: "Next.js / Remix / SvelteKit", outcome: "Next.js 14 app-router", impact: "Быстрая разработка модулей", status: "Active" },
  { date: "2026-05-14", author: "Owner", reason: "Безопасность", alt: "Runtime сейчас / preview-only", outcome: "Preview-only слой", impact: "Нет рисков запуска", status: "Active" },
  { date: "2026-05-21", author: "AI COO", reason: "Гибкость моделей", alt: "Хардкод / роутер", outcome: "Per-role model router", impact: "Смена модели без кода", status: "Active" },
  { date: "2026-06-04", author: "Owner", reason: "Consent/copyright", alt: "Авто / ручное ревью", outcome: "Обязательные гейты", impact: "Защита от нарушений", status: "Active" },
];
const LESSONS = [
  { worked: "Аддитивные модули без удаления", failed: "—", why: "Стабильность", change: "Продолжать" },
  { worked: "localStorage-схема с safety-флагами", failed: "—", why: "Прозрачность", change: "Стандарт для всех модулей" },
  { worked: "—", failed: "Незакрытый <div> в <Card>", why: "SWC ошибка в строке выше", change: "Закрывать div до </Card>" },
  { worked: "Preview-only перед runtime", failed: "—", why: "Нет внешних рисков", change: "Runtime только через Gate" },
];
const PLAYBOOKS = [
  { name: "Создание агента", steps: ["Identity", "Voice/Face", "Platforms", "Content plan", "Activation gates"] },
  { name: "Запуск платформы", steps: ["Profile", "Content", "Audience", "Growth", "Monetization"] },
  { name: "Запуск радио", steps: ["Hosts", "Schedule", "Studio", "Stream review", "On-air"] },
  { name: "Создание шоу", steps: ["Концепт", "Сценарий", "Ассеты", "Ревью", "Расписание"] },
  { name: "Контент-конвейер", steps: ["Brief", "Script", "Assets", "Render", "Review", "Publish-preview"] },
  { name: "Рост аудитории", steps: ["Content pyramid", "Cross-post", "Engagement", "Analytics"] },
  { name: "Монетизация", steps: ["Sponsors", "Affiliate", "Merch", "Premium", "Content"] },
];
const PROMPTS = {
  Claude: ["Архитектура модуля (additive)", "Code review safety"],
  ChatGPT: ["Сценарий шоу", "Caption + hashtags"],
  Grok: ["Тренды/новости hook", "Виральный скетч"],
  Gemini: ["Мультимодальный разбор", "Превью-сцена"],
  OpenRouter: ["Роутинг по роли", "Fallback цепочка"],
  ComfyUI: ["SDXL neon portrait", "ControlNet pose"],
  Media: ["Radio intro VO", "Music brief (original)"],
  Coding: ["React overlay pattern", "localStorage schema"],
  Strategy: ["OKR draft", "Risk register"],
};
const WIKI = [
  { name: "Media Network", summary: "Радио/музыка/студия/новости/реклама — производство контента." },
  { name: "Advertising Factory", summary: "Реклама как контент: скетчи/мемы/нативка/спонсоры." },
  { name: "Social Empire", summary: "Цифровые личности на 10 платформах + Pinterest network." },
  { name: "Economy Engine", summary: "Оценка AI-активов, доходы, монетизация, ранкинг." },
  { name: "World Engine", summary: "Глобальная карта + цифровые двойники + Command Center." },
  { name: "Activation Engine", summary: "Готовность экосистемы, gates, AI COO Activation Report." },
  { name: "Mission Control", summary: "Стратегия: OKR, roadmap, priority matrix, risk center." },
];
const MEETINGS = [
  { date: "2026-05-10", who: "Owner, AI COO", topics: ["Архитектура", "Безопасность"], decisions: ["Preview-only"], actions: ["Гейты consent"] },
  { date: "2026-05-24", who: "Owner, AI COO", topics: ["Монетизация", "Платформы"], decisions: ["Sponsors first"], actions: ["Affiliate hub"] },
  { date: "2026-06-07", who: "Owner, AI COO", topics: ["Radio", "Devices"], decisions: ["Radio v1 Q2"], actions: ["Разблок device fleet"] },
];
const GRAPH_NODES = [
  { id: "Owner", x: 130, y: 80, kind: "Люди" }, { id: "AI COO", x: 130, y: 230, kind: "Люди" },
  { id: "Decisions", x: 340, y: 60, kind: "Решения" }, { id: "Projects", x: 340, y: 200, kind: "Проекты" },
  { id: "Prompts", x: 560, y: 60, kind: "Промты" }, { id: "Platforms", x: 560, y: 200, kind: "Платформы" },
  { id: "Content", x: 780, y: 120, kind: "Контент" }, { id: "Revenue", x: 980, y: 120, kind: "Доходы" },
];
const GRAPH_EDGES: [string, string][] = [["Owner", "Decisions"], ["AI COO", "Decisions"], ["Decisions", "Projects"], ["Projects", "Prompts"], ["Projects", "Platforms"], ["Platforms", "Content"], ["Prompts", "Content"], ["Content", "Revenue"]];
const TIMELINE = [
  { v: "v0.1", t: "2026-05", text: "Agent Registry + WORLD/EcosystemMap" },
  { v: "v0.4", t: "2026-05", text: "Media Factory + EPIC Architect + Device Center" },
  { v: "v1.0", t: "2026-05", text: "DEEPINSIDE OS (10 центров) + EPIC OS shell" },
  { v: "v1.1", t: "2026-06", text: "Context Engine + Knowledge Vault + Automation" },
  { v: "L1-L3", t: "2026-06", text: "Media Network + Advertising Factory + Social Empire" },
  { v: "L4-L5", t: "2026-06", text: "Economy Engine + World Engine" },
  { v: "L6-L8", t: "2026-06", text: "Activation + Mission Control + Knowledge Engine" },
];

const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const ST: Record<string, string> = { Done: "#4ade80", Active: "#4ade80", Running: "#fbbf24" };

export function KnowledgeEngine({ onClose }: { onClose: () => void }) {
  const [sec, setSec] = useState("base");
  const [kbCat, setKbCat] = useState("Infrastructure");
  const [promptCat, setPromptCat] = useState("Claude");
  const [query, setQuery] = useState("");

  const allItems = useMemo(() => {
    const items: { label: string; sec: string }[] = [];
    Object.entries(KB).forEach(([c, arr]) => arr.forEach((x) => items.push({ label: x, sec: "base" })));
    RESEARCH.forEach((r) => items.push({ label: r.title, sec: "research" }));
    DECISIONS.forEach((d) => items.push({ label: d.outcome, sec: "decisions" }));
    PLAYBOOKS.forEach((p) => items.push({ label: p.name, sec: "playbooks" }));
    Object.entries(PROMPTS).forEach(([c, arr]) => arr.forEach((x) => items.push({ label: x, sec: "prompts" })));
    WIKI.forEach((w) => items.push({ label: w.name, sec: "wiki" }));
    return items;
  }, []);
  const results = query.trim() ? allItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())).slice(0, 10) : [];

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("knowledge_engine", JSON.stringify({ ts, sections: SECTIONS.map((s) => s[0]), items: allItems.length }));
    localStorage.setItem("knowledge_base", JSON.stringify({ ts, categories: Object.keys(KB), count: Object.values(KB).flat().length }));
    localStorage.setItem("research_center", JSON.stringify({ ts, research: RESEARCH }));
    localStorage.setItem("decision_log", JSON.stringify({ ts, decisions: DECISIONS }));
    localStorage.setItem("lessons_learned", JSON.stringify({ ts, lessons: LESSONS }));
    localStorage.setItem("playbooks", JSON.stringify({ ts, playbooks: PLAYBOOKS.map((p) => p.name) }));
    localStorage.setItem("prompt_library", JSON.stringify({ ts, categories: Object.keys(PROMPTS), count: Object.values(PROMPTS).flat().length }));
    localStorage.setItem("project_wiki", JSON.stringify({ ts, projects: WIKI.map((w) => w.name) }));
    localStorage.setItem("knowledge_graph", JSON.stringify({ ts, nodes: GRAPH_NODES.map((n) => n.id), edges: GRAPH_EDGES }));
    localStorage.setItem("memory_timeline", JSON.stringify({ ts, timeline: TIMELINE }));
  } catch {} }, [allItems]);

  function Base() {
    return <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr]">
      <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Категории</div>{Object.keys(KB).map((c) => <button key={c} onClick={() => setKbCat(c)} className={`mb-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] ${kbCat === c ? "bg-tg-active text-white" : "hover:bg-tg-hover/40"}`}><span>{c}</span><span className="text-[10px] text-tg-muted">{(KB as any)[c].length}</span></button>)}</nav>
      <main className="min-h-0 overflow-auto p-4"><Card t={"Knowledge Base · " + kbCat}><div className="space-y-1.5">{(KB as any)[kbCat].map((x: string, i: number) => <div key={i} className="rounded-lg bg-tg-bg/40 px-3 py-2 text-sm">📄 {x}</div>)}</div></Card></main>
    </div>;
  }
  function Research() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Research Center"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Тип", "Заголовок", "Результат", "Статус"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{RESEARCH.map((r, i) => <tr key={i} className="border-t border-tg-line"><td className="px-2 py-1.5 text-tg-muted">{r.type}</td><td className="px-2 font-semibold">{r.title}</td><td className="px-2">{r.result}</td><td className="px-2"><span style={{ color: ST[r.status] }}>{r.status}</span></td></tr>)}</tbody></table></Card></main>;
  }
  function Decisions() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="space-y-2">{DECISIONS.map((d, i) => <Card key={i}><div className="mb-1 flex items-center gap-2"><b className="flex-1">{d.outcome}</b><span className="text-[10px] text-tg-muted">{d.date} · {d.author}</span><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: ST[d.status] + "22", color: ST[d.status] }}>{d.status}</span></div><div className="grid gap-1 text-[12px] sm:grid-cols-2"><div><span className="text-tg-muted">Причина:</span> {d.reason}</div><div><span className="text-tg-muted">Альтернативы:</span> {d.alt}</div><div className="sm:col-span-2"><span className="text-tg-muted">Последствия:</span> {d.impact}</div></div></Card>)}</div></main>;
  }
  function Lessons() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Lessons Learned"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Сработало", "Не сработало", "Почему", "Что изменить"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{LESSONS.map((l, i) => <tr key={i} className="border-t border-tg-line"><td className="px-2 py-1.5 text-emerald-300">{l.worked}</td><td className="px-2 text-red-300">{l.failed}</td><td className="px-2 text-tg-muted">{l.why}</td><td className="px-2">{l.change}</td></tr>)}</tbody></table></Card></main>;
  }
  function Playbooks() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{PLAYBOOKS.map((p) => <Card key={p.name} t={p.name}><div className="flex flex-wrap items-center gap-1 text-[11px]">{p.steps.map((s, i) => <span key={s} className="flex items-center gap-1"><span className="rounded bg-tg-bg px-2 py-0.5 text-tg-muted">{s}</span>{i < p.steps.length - 1 && <span className="text-tg-muted">→</span>}</span>)}</div></Card>)}</div></main>;
  }
  function PromptLib() {
    return <div className="grid min-h-0 flex-1 grid-cols-[160px_1fr]">
      <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2">{Object.keys(PROMPTS).map((c) => <button key={c} onClick={() => setPromptCat(c)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] ${promptCat === c ? "bg-tg-active text-white" : "hover:bg-tg-hover/40"}`}>{c}</button>)}</nav>
      <main className="min-h-0 overflow-auto p-4"><Card t={"Prompt Library · " + promptCat}><div className="space-y-1.5">{(PROMPTS as any)[promptCat].map((x: string, i: number) => <div key={i} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-3 py-2 text-sm"><span>🗂</span><span className="flex-1">{x}</span><button onClick={() => { navigator.clipboard?.writeText(x); }} className="rounded bg-tg-bg px-2 py-0.5 text-[10px] text-tg-muted hover:text-white">Copy</button></div>)}</div></Card></main>
    </div>;
  }
  function Wiki() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2 sm:grid-cols-2">{WIKI.map((w) => <Card key={w.name} t={w.name}><div className="text-sm text-tg-muted">{w.summary}</div></Card>)}</div></main>;
  }
  function Meetings() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="space-y-2">{MEETINGS.map((m, i) => <Card key={i}><div className="mb-1 flex items-center gap-2"><b>{m.date}</b><span className="text-[11px] text-tg-muted">{m.who}</span></div><div className="grid gap-1 text-[12px] sm:grid-cols-3"><div><span className="text-tg-muted">Темы:</span> {m.topics.join(", ")}</div><div><span className="text-tg-muted">Решения:</span> {m.decisions.join(", ")}</div><div><span className="text-tg-muted">Действия:</span> {m.actions.join(", ")}</div></div></Card>)}</div></main>;
  }
  function Graph() {
    const byId: Record<string, any> = {}; GRAPH_NODES.forEach((n) => (byId[n.id] = n));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Knowledge Graph"><svg width="100%" height="320" viewBox="0 0 1100 320">{GRAPH_EDGES.map(([a, b], i) => <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke="rgba(120,140,200,.3)" strokeWidth={1.5} />)}{GRAPH_NODES.map((n) => <g key={n.id}><circle cx={n.x} cy={n.y} r={20} fill={av(n.id)} opacity={0.85} /><text x={n.x} y={n.y + 4} fill="#fff" fontSize="10" fontWeight="700" textAnchor="middle">{n.id}</text><text x={n.x} y={n.y - 26} fill="#94a3b8" fontSize="9" textAnchor="middle">{n.kind}</text></g>)}</svg></Card></main>;
  }
  function Timeline() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Memory Timeline · история экосистемы"><div className="space-y-2">{TIMELINE.map((e, i) => <div key={i} className="flex items-center gap-3"><div className="w-14 text-right text-[11px] font-black text-tg-accent">{e.v}</div><div className="h-2 w-2 rounded-full bg-tg-accent" /><div className="flex-1 rounded-lg bg-tg-bg/40 px-3 py-1.5 text-[12px]"><b>{e.text}</b> <span className="text-tg-muted">· {e.t}</span></div></div>)}</div></Card></main>;
  }

  return (
    <div className="fixed inset-0 z-[73] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">📚 KNOWLEDGE ENGINE</div>
        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300">CRITICAL · INTELLIGENCE</span>
        <div className="relative ml-auto"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 найти знание / решение / промт…" className="w-64 rounded-lg border border-tg-line bg-tg-bg px-3 py-1.5 text-xs outline-none" />{results.length > 0 && <div className="absolute right-0 z-10 mt-1 max-h-64 w-64 overflow-auto rounded-lg border border-tg-line bg-tg-panel p-1 shadow-xl">{results.map((r, i) => <button key={i} onClick={() => { setSec(r.sec); setQuery(""); }} className="block w-full rounded px-2 py-1 text-left text-[11px] hover:bg-tg-active hover:text-white">{r.label} <span className="text-[9px] text-tg-muted">· {r.sec}</span></button>)}</div>}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2">{SECTIONS.map(([id, label]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] ${sec === id ? "bg-tg-active text-white font-semibold" : "hover:bg-tg-hover/40"}`}>{label}</button>)}
          <div className="mt-3 rounded-lg border border-tg-line bg-tg-bg/30 p-2 text-[10px]"><div className="mb-1 font-black uppercase tracking-[0.18em] text-tg-accent">🤖 AI COO</div><div className="space-y-0.5 text-tg-muted"><div>Knowledge Summary: {allItems.length} записей</div><div>Decisions: {DECISIONS.length} · all Active</div><div>Lessons: {LESSONS.length} зафиксировано</div><div>Playbook suggest: «Запуск радио»</div></div></div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "base" && <Base />}
          {sec === "research" && <Research />}
          {sec === "decisions" && <Decisions />}
          {sec === "lessons" && <Lessons />}
          {sec === "playbooks" && <Playbooks />}
          {sec === "prompts" && <PromptLib />}
          {sec === "wiki" && <Wiki />}
          {sec === "meetings" && <Meetings />}
          {sec === "graph" && <Graph />}
          {sec === "timeline" && <Timeline />}
        </div>
      </div>
    </div>
  );
}
