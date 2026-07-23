"use client";

// AI COMMAND CENTER v1.2 — Workspace Engine (additive, local-only AI Operating System layer).
// The user talks only to the AI Operator; it analyzes the project, splits the goal into subtasks,
// auto-picks the best AI, generates a context-injected prompt, runs a multi-AI window workspace,
// streams results into an Artifact Bus, and routes drafts through a mock EPIC GRAM bridge to approval.
// Panels: Dashboard · Workspace (window engine) · AI Operator · Prompt Studio · Project Memory ·
// Artifact Center · EPIC GRAM · MCP Layer (planned). Command Palette: Ctrl/Cmd+K.
// SAFETY: localStorage only. No real API calls, OAuth, API keys, credentials, browser automation,
// web scraping, hidden execution, Telegram auto-send, MCP execution, or server actions. Allowed:
// mock UI, localStorage, window.open, sandboxed iframe, manual copy/paste, manual approval.

import { useEffect, useState } from "react";
import { useLocale, t } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

type Mode = "embedded" | "external";
type WinMode = "grid" | "split" | "focus" | "docked" | "minimized";
type View = "dashboard" | "workspace" | "operator" | "studio" | "memory" | "artifacts" | "epicgram" | "mcp";
type Tool = { id: string; name: string; category: string; role: string; url: string; defaultMode: Mode };
type ToolState = { status: string; launchMode: Mode; notes: string };
type WinState = { mode: WinMode; task: string; prompt: string; result: string };
type Task = { id: string; project: string; agent: string; toolId: string; task: string; prompt: string; result: string; status: string; priority: string; eta: string; updatedAt: string };
type Template = { id: string; name: string; body: string };
type HistoryItem = { id: string; at: string; kind: string; text: string };
type Artifact = { id: string; project: string; kind: string; title: string; body: string; at: string };
type Memory = { sprint: string; context: string; architecture: string; decisions: string; repo: string; files: string; roadmap: string; notes: string };
type Draft = { id: string; project: string; title: string; status: string; at: string };

const LSK = "deepinside.aiCommandCenter.v1";
const ACTIVE_MODULE = "EPIC GRAM + AI COMMAND CENTER";
const SAFETY_LINE = "manual approval only";

const TOOLS: Tool[] = [
  { id: "claude", name: "Claude", category: "AI", role: "Architecture / specs / text strategy", url: "https://claude.ai", defaultMode: "external" },
  { id: "chatgpt", name: "ChatGPT", category: "AI", role: "Phase control / audit / prompt assembly", url: "https://chat.openai.com", defaultMode: "external" },
  { id: "codex", name: "Codex", category: "AI", role: "Code implementation / patches", url: "https://chatgpt.com/codex", defaultMode: "external" },
  { id: "grok", name: "Grok", category: "AI", role: "Trend / media / creative / UX ideation", url: "https://grok.com", defaultMode: "external" },
  { id: "perplexity", name: "Perplexity", category: "Research", role: "Research / market references / best practices", url: "https://www.perplexity.ai", defaultMode: "external" },
  { id: "gemini", name: "Gemini", category: "AI", role: "Multimodal reasoning / long context", url: "https://gemini.google.com", defaultMode: "external" },
  { id: "locallm", name: "Local LLM", category: "AI", role: "On-prem / private inference (Ollama)", url: "http://localhost:11434", defaultMode: "embedded" },
  { id: "github", name: "GitHub", category: "Dev", role: "Repository control", url: "https://github.com", defaultMode: "external" },
  { id: "n8n", name: "n8n", category: "Automation", role: "Workflow automation maps", url: "https://n8n.io", defaultMode: "embedded" },
  { id: "telegram", name: "Telegram / EPIC GRAM", category: "Publishing", role: "Publishing surface / channels", url: "https://web.telegram.org", defaultMode: "external" },
  { id: "comfyui", name: "ComfyUI", category: "Media", role: "Image / video pipeline", url: "https://www.comfy.org", defaultMode: "embedded" },
  { id: "runpod", name: "RunPod", category: "Media", role: "GPU media jobs", url: "https://www.runpod.io", defaultMode: "external" },
  { id: "elevenlabs", name: "ElevenLabs", category: "Media", role: "Voice synthesis", url: "https://elevenlabs.io", defaultMode: "external" },
];

const PROJECTS = ["HideMyName VPN", "DEEPINSIDE", "OPENCLAW", "Telegram Network", "Media Factory", "AI Studio", "Website", "Mini App", "Landing", "Infrastructure"];
const STATUS_FLOW = ["queued", "sent", "result", "approved"];
const PRIORITIES = ["P1", "P2", "P3"];
const DRAFT_FLOW = ["draft", "queued", "awaiting", "mock-published"];
const MCP_PLANNED: [string, string][] = [["GitHub MCP", "Planned"], ["Google Drive MCP", "Planned"], ["Notion MCP", "Planned"], ["Telegram MCP", "Planned"], ["Docker MCP", "Planned"], ["n8n MCP", "Planned"], ["ComfyUI MCP", "Planned"], ["Supabase MCP", "Planned"], ["Local LLM MCP", "Planned"], ["Claude MCP", "Planned"], ["OpenAI MCP", "Planned"]];

const DELEG_TEMPLATES: { label: string; agent: string; toolId: string; kind: string }[] = [
  { label: "Architecture", agent: "Claude", toolId: "claude", kind: "Architecture" },
  { label: "Audit", agent: "ChatGPT", toolId: "chatgpt", kind: "Audit" },
  { label: "Code", agent: "Codex", toolId: "codex", kind: "Code" },
  { label: "Creative", agent: "Grok", toolId: "grok", kind: "UX" },
  { label: "Research", agent: "Perplexity", toolId: "perplexity", kind: "Research" },
  { label: "Workflow", agent: "n8n", toolId: "n8n", kind: "Workflow" },
  { label: "Publishing", agent: "EPIC GRAM", toolId: "telegram", kind: "Publishing draft" },
  { label: "Assets", agent: "Media Factory", toolId: "comfyui", kind: "Media idea" },
];

const SPLIT_PLAN = DELEG_TEMPLATES.slice(0, 5);
const AGENT_KIND: Record<string, string> = { Claude: "Architecture", ChatGPT: "Audit", Codex: "Code", Grok: "UX", Perplexity: "Research", Gemini: "Report", "Local LLM": "Markdown", "EPIC GRAM": "Publishing draft", "Media Factory": "Media idea" };

const SEED_TASKS: Task[] = SPLIT_PLAN.map((s, i) => { const t = TOOLS.find((x) => x.id === s.toolId)!; return { id: "seed" + i, project: PROJECTS[0], agent: t.name, toolId: t.id, task: `${s.label} задача`, prompt: "", result: "", status: "queued", priority: "P2", eta: "—", updatedAt: "" }; });
const SEED_TEMPLATES: Template[] = [
  { id: "t1", name: "Architecture spec", body: "PROJECT: {{project}}\nCONTEXT: {{context}}\nTASK: Спроектировать архитектуру: {{task}}\nDELIVERABLE: модули, потоки данных, точки контроля." },
  { id: "t2", name: "Code implementation", body: "PROJECT: {{project}}\nREPO: {{repo}}\nTASK: Реализовать: {{task}}\nCONSTRAINTS: аддитивно, не ломать существующее, показать diff." },
  { id: "t3", name: "Research brief", body: "PROJECT: {{project}}\nTASK: Собрать данные: {{task}}\nFORMAT: список источников + краткие выводы." },
];

function load<T>(k: string, def: T): T { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch { return def; } }
function save(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const now = () => new Date().toISOString().replace("T", " ").slice(0, 16);
const clock = () => new Date().toTimeString().slice(0, 5);
const stColor = (s: string) => { const x = s.toLowerCase(); return x.indexOf("approved") >= 0 || x.indexOf("ready") >= 0 || x.indexOf("published") >= 0 ? "#4ade80" : x.indexOf("result") >= 0 || x.indexOf("sent") >= 0 || x.indexOf("running") >= 0 || x.indexOf("await") >= 0 || x.indexOf("queued") >= 0 ? "#fbbf24" : x.indexOf("planned") >= 0 ? "#60a5fa" : "#9ca3af"; };
const prColor = (p: string) => p === "P1" ? "#f87171" : p === "P2" ? "#fbbf24" : "#60a5fa";
const emptyMem = (): Memory => ({ sprint: "", context: "", architecture: "", decisions: "", repo: "agent-control", files: "", roadmap: "", notes: "" });
const emptyWin = (): WinState => ({ mode: "grid", task: "", prompt: "", result: "" });

export function WebAppCatalogPanel({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [project, setProject] = useState(PROJECTS[0]);
  const [memory, setMemory] = useState<Record<string, Memory>>({});
  const [toolState, setToolState] = useState<Record<string, ToolState>>({});
  const [workspace, setWorkspace] = useState<string[]>([]);
  const [windows, setWindows] = useState<Record<string, WinState>>({});
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [templates, setTemplates] = useState<Template[]>(SEED_TEMPLATES);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [summary, setSummary] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [goal, setGoal] = useState("");
  const [tplSel, setTplSel] = useState("t1");
  const [massSel, setMassSel] = useState<string[]>(["claude", "chatgpt", "codex"]);
  const [artQ, setArtQ] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [palette, setPalette] = useState(false);
  const [pq, setPq] = useState("");
  const loc = useLocale();
  const respondIn = loc === "ua" ? "Українська" : loc === "en" ? "English" : "Русский";

  useEffect(() => {
    const st = load<any>(LSK, null);
    if (st) {
      if (st.project) setProject(st.project);
      if (st.memory) setMemory(st.memory);
      if (st.toolState) setToolState(st.toolState);
      if (Array.isArray(st.workspace)) setWorkspace(st.workspace);
      if (st.windows) setWindows(st.windows);
      if (Array.isArray(st.tasks)) setTasks(st.tasks);
      if (Array.isArray(st.templates)) setTemplates(st.templates);
      if (Array.isArray(st.history)) setHistory(st.history);
      if (Array.isArray(st.artifacts)) setArtifacts(st.artifacts);
      if (Array.isArray(st.drafts)) setDrafts(st.drafts);
      if (st.summary) setSummary(st.summary);
    }
  }, []);
  useEffect(() => { save(LSK, { project, memory, toolState, workspace, windows, tasks, templates, history, artifacts, drafts, summary, workspaceLayout: windows, safety: { localOnly: true, credentials: false, automation: false, externalApi: false, telegramAutoSend: false, mcp: "planned" }, updatedAt: new Date().toISOString() }); }, [project, memory, toolState, workspace, windows, tasks, templates, history, artifacts, drafts, summary]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); setPq(""); } if (e.key === "Escape") setPalette(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mem = (): Memory => memory[project] || emptyMem();
  const setMem = (patch: Partial<Memory>) => setMemory((p) => ({ ...p, [project]: { ...mem(), ...patch } }));
  const ts = (id: string): ToolState => { const t = TOOLS.find((x) => x.id === id)!; return toolState[id] || { status: "idle", launchMode: t.defaultMode, notes: "" }; };
  const setTs = (id: string, patch: Partial<ToolState>) => setToolState((p) => ({ ...p, [id]: { ...ts(id), ...patch } }));
  const win = (id: string): WinState => windows[id] || emptyWin();
  const setWin = (id: string, patch: Partial<WinState>) => setWindows((p) => ({ ...p, [id]: { ...win(id), ...patch } }));
  const log = (kind: string, text: string) => setHistory((h) => [{ id: "h" + Date.now() + Math.random().toString(36).slice(2, 6), at: clock(), kind, text }, ...h].slice(0, 200));

  // Project Context Injector — auto-prepended to every generated prompt.
  const contextBlock = () => { const m = mem(); return `PROJECT: ${project}\nGOAL: ${m.context || goal || "—"}\nREPO: ${m.repo || "—"}\nACTIVE MODULE: ${ACTIVE_MODULE}\nSAFETY: ${SAFETY_LINE}`; };
  const buildPrompt = (agent: string, task: string) => `${contextBlock()}\nAGENT: ${agent}\nTASK: ${task}\nRESPOND IN: ${respondIn}\nDELIVERABLE: чёткий результат для approval.`;

  const openTool = (t: Tool) => {
    if (!workspace.includes(t.id)) { setWorkspace((w) => [...w, t.id]); setWin(t.id, { mode: "grid" }); }
    if (ts(t.id).launchMode === "external") { try { window.open(t.url, "_blank", "noopener,noreferrer"); } catch {} setNote("External launch: " + t.name); }
    else setNote("Embedded preview: " + t.name + " (если сайт блокирует iframe — переключи на External)");
    setTs(t.id, { status: "running" });
    log("open", t.name);
  };
  const closeWin = (id: string) => { setWorkspace((w) => w.filter((x) => x !== id)); setTs(id, { status: "idle" }); };

  const runTemplate = (d: { label: string; agent: string; toolId: string; kind: string }) => {
    const t = TOOLS.find((x) => x.id === d.toolId)!;
    const task = `${d.label} — ${goal || mem().context || project}`;
    if (!workspace.includes(t.id)) setWorkspace((w) => [...w, t.id]);
    setWin(t.id, { mode: "grid", task, prompt: buildPrompt(d.agent, task) });
    setTs(t.id, { status: "running" });
    setTasks((arr) => [{ id: "d" + Date.now(), project, agent: d.agent, toolId: t.id, task, prompt: buildPrompt(d.agent, task), result: "", status: "sent", priority: "P2", eta: "—", updatedAt: now() }, ...arr]);
    log("template", `${d.label} → ${d.agent}`);
    setNote(`Делегировано по шаблону: ${d.label} → ${d.agent}. Окно открыто.`);
    setView("workspace");
  };

  const analyzeSplit = () => {
    const g = goal.trim();
    if (!g) { setNote("Впиши большую задачу проекта в поле AI Operator"); setView("operator"); return; }
    const created: Task[] = SPLIT_PLAN.map((s, i) => { const t = TOOLS.find((x) => x.id === s.toolId)!; const task = `${s.label} — в рамках: ${g}`; return { id: "d" + Date.now() + i, project, agent: t.name, toolId: t.id, task, prompt: buildPrompt(t.name, task), result: "", status: "sent", priority: i === 0 ? "P1" : "P2", eta: "—", updatedAt: now() }; });
    setTasks((d) => [...created, ...d]);
    log("split", `Разбито на ${created.length} подзадач: ${g}`);
    setNote(`AI Operator разбил цель на ${created.length} подзадач с инъекцией контекста.`);
    setView("operator");
  };

  const advance = (d: Task) => { const i = STATUS_FLOW.indexOf(d.status); const next = STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)]; setTasks((arr) => arr.map((x) => x.id === d.id ? { ...x, status: next, updatedAt: now() } : x)); log("status", `${d.agent}: ${d.status} → ${next}`); };
  const setResult = (id: string, result: string) => setTasks((arr) => arr.map((x) => x.id === id ? { ...x, result, status: x.status === "queued" || x.status === "sent" ? "result" : x.status } : x));
  const setPriority = (id: string, priority: string) => setTasks((arr) => arr.map((x) => x.id === id ? { ...x, priority } : x));
  const copyText = (txt: string, label: string) => { try { navigator.clipboard.writeText(txt); } catch {} setNote("Скопировано: " + label); log("copy", label); };
  const sendApproval = (d: Task) => { setTasks((arr) => arr.map((x) => x.id === d.id ? { ...x, status: "approved", updatedAt: now() } : x)); log("approve", d.agent + " → Approval Board"); setNote("Отправлено в Approval Board: " + d.agent); };
  const pushArtifact = (kind: string, title: string, body: string) => { setArtifacts((a) => [{ id: "art" + Date.now() + Math.random().toString(36).slice(2, 5), project, kind, title, body, at: now() }, ...a]); log("artifact", `Artifact Bus ← ${kind}`); setNote("В Artifact Bus: " + title.slice(0, 40)); };
  const saveTaskArtifact = (d: Task) => pushArtifact(AGENT_KIND[d.agent] || "Markdown", `${d.agent} · ${d.task.slice(0, 40)}`, d.result || d.prompt || d.task);
  const saveWinArtifact = (id: string) => { const t = TOOLS.find((x) => x.id === id)!; const w = win(id); pushArtifact(AGENT_KIND[t.name] || "Markdown", `${t.name} · ${(w.task || t.role).slice(0, 40)}`, w.result || w.prompt || w.task); };

  const aggregate = () => {
    const ds = tasks.filter((d) => d.project === project && d.result.trim());
    if (!ds.length) { setNote("Нет результатов для агрегации"); return; }
    const text = `AI OPERATOR SUMMARY · ${project} · ${now()}\n\n` + ds.map((d) => `▸ ${d.agent} [${d.priority}]\n  Задача: ${d.task}\n  Результат: ${d.result}`).join("\n\n");
    setSummary((s) => ({ ...s, [project]: text }));
    pushArtifact("Report", "Operator Summary · " + now(), text);
    log("summary", `Свёл ${ds.length} результатов`);
    setNote("Operator Summary собран и отправлен в Artifact Bus.");
  };

  const tplFill = (body: string) => { const m = mem(); return body.replace(/\{\{project\}\}/g, project).replace(/\{\{context\}\}/g, m.context || "—").replace(/\{\{repo\}\}/g, m.repo || "—").replace(/\{\{task\}\}/g, goal || "{{task}}"); };
  const massSend = () => {
    if (!massSel.length) { setNote("Выбери хотя бы один AI"); return; }
    const tpl = templates.find((t) => t.id === tplSel);
    const body = tpl ? tplFill(tpl.body) : `${contextBlock()}\nTASK: ${goal || "(задача)"}`;
    const combined = massSel.map((id) => { const t = TOOLS.find((x) => x.id === id)!; return `=== ${t.name} ===\n${body}`; }).join("\n\n");
    copyText(combined, `mass ${massSel.length} AI`);
    massSel.forEach((id) => { const t = TOOLS.find((x) => x.id === id)!; setTasks((d) => [{ id: "d" + Date.now() + id, project, agent: t.name, toolId: t.id, task: goal || tpl?.name || "Prompt Studio", prompt: body, result: "", status: "sent", priority: "P2", eta: "—", updatedAt: now() }, ...d]); });
    setNote(`Промпт для ${massSel.length} AI в буфере. Задачи созданы.`);
  };

  // EPIC GRAM bridge — mock only, manual approval, no real send.
  const createDraft = () => { const title = draftTitle.trim() || ("Draft · " + clock()); setDrafts((d) => [{ id: "dr" + Date.now(), project, title, status: "draft", at: now() }, ...d]); setDraftTitle(""); log("epicgram", "Создан Telegram Draft (mock)"); setNote("Telegram Draft создан (mock)."); };
  const advanceDraft = (dr: Draft) => { const i = DRAFT_FLOW.indexOf(dr.status); const next = DRAFT_FLOW[Math.min(i + 1, DRAFT_FLOW.length - 1)]; setDrafts((arr) => arr.map((x) => x.id === dr.id ? { ...x, status: next, at: now() } : x)); log("epicgram", `Draft: ${dr.status} → ${next} (mock)`); };

  const projTasks = tasks.filter((d) => d.project === project);
  const approvals = projTasks.filter((d) => d.status === "approved");
  const running = projTasks.filter((d) => d.status === "sent").length;
  const completed = projTasks.filter((d) => d.status === "result" || d.status === "approved").length;
  const pending = projTasks.filter((d) => d.status === "result").length;
  const projArtifacts = artifacts.filter((a) => a.project === project);
  const projDrafts = drafts.filter((d) => d.project === project);
  const artFiltered = projArtifacts.filter((a) => (a.title + " " + a.kind + " " + a.body).toLowerCase().includes(artQ.toLowerCase()));
  const countFor = (name: string) => projTasks.filter((d) => d.agent === name).length;
  const minimized = workspace.filter((id) => win(id).mode === "minimized");
  const openWins = workspace.filter((id) => win(id).mode !== "minimized");

  const paletteActions: { k: string; run: () => void }[] = [
    { k: "Operator: разбить цель (Delegate Task)", run: analyzeSplit },
    { k: "Operator: свести результаты", run: () => { aggregate(); setView("operator"); } },
    { k: "Open Dashboard", run: () => setView("dashboard") },
    { k: "Open Workspace", run: () => setView("workspace") },
    { k: "Open AI Operator", run: () => setView("operator") },
    { k: "Open Prompt Studio", run: () => setView("studio") },
    { k: "Open Project Memory", run: () => setView("memory") },
    { k: "Search Artifact (Artifact Bus)", run: () => setView("artifacts") },
    { k: "Open EPIC GRAM Bridge", run: () => setView("epicgram") },
    { k: "Open MCP Layer", run: () => setView("mcp") },
    ...DELEG_TEMPLATES.map((d) => ({ k: "Delegate: " + d.label + " → " + d.agent, run: () => runTemplate(d) })),
    ...PROJECTS.map((p) => ({ k: "Open Project: " + p, run: () => { setProject(p); setView("dashboard"); } })),
    ...TOOLS.map((t) => ({ k: "Open " + t.name, run: () => { setView("workspace"); openTool(t); } })),
  ];
  const paletteFiltered = paletteActions.filter((a) => a.k.toLowerCase().includes(pq.toLowerCase())).slice(0, 9);

  const TabBtn = ({ v, label }: { v: View; label: string }) => (
    <button onClick={() => setView(v)} className={"whitespace-nowrap rounded-lg px-3 py-1 text-[12px] font-semibold " + (view === v ? "bg-tg-accent/80 text-white" : "text-tg-muted hover:bg-white/5 hover:text-white")}>{label}</button>
  );
  const Stat = ({ label, value, color }: { label: string; value: any; color?: string }) => (
    <div className="rounded-xl border border-tg-line/50 bg-tg-bg/40 p-3"><div className="text-[10px] uppercase tracking-wide text-tg-muted">{label}</div><div className="mt-1 text-2xl font-black" style={{ color: color || "#fff" }}>{value}</div></div>
  );
  const ModeBtn = ({ id, m, glyph }: { id: string; m: WinMode; glyph: string }) => (
    <button onClick={() => setWin(id, { mode: m })} className={"rounded px-1.5 py-0.5 text-[10px] " + (win(id).mode === m ? "bg-tg-accent/70 text-white" : "bg-white/5 text-tg-muted hover:text-white")}>{glyph}</button>
  );

  const renderWindow = (id: string) => {
    const t = TOOLS.find((x) => x.id === id)!; const s = ts(id); const w = win(id);
    const span = w.mode === "focus" ? "md:col-span-2" : "";
    const h = w.mode === "docked" ? "h-20" : w.mode === "focus" ? "h-72" : "h-44";
    return (
      <div key={id} className={"rounded-xl border border-tg-line/60 bg-tg-bg/40 p-2.5 " + span}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="text-[12px] font-black">{t.name}</span><span className="text-[9px]" style={{ color: stColor(s.status) }}>● {s.status}</span></div>
          <div className="flex items-center gap-0.5">
            <ModeBtn id={id} m="grid" glyph="▦" /><ModeBtn id={id} m="focus" glyph="⤢" /><ModeBtn id={id} m="docked" glyph="⤓" /><ModeBtn id={id} m="minimized" glyph="—" />
            <button onClick={() => closeWin(id)} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] hover:bg-white/15">✕</button>
          </div>
        </div>
        <div className="mt-0.5 text-[9px] text-tg-muted">{t.role}</div>
        {w.mode !== "docked" && (s.launchMode === "embedded" ? (
          <iframe title={t.name} src={t.url} className={"mt-2 w-full rounded-lg border border-tg-line/40 bg-white " + h} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
        ) : (
          <div className={"mt-2 grid place-items-center rounded-lg border border-dashed border-tg-line/50 px-2 text-center text-[10px] text-tg-muted " + h}>External · {t.url}
            <button onClick={() => { try { window.open(t.url, "_blank", "noopener,noreferrer"); } catch {} }} className="mt-1 rounded-md bg-tg-accent/80 px-2 py-1 text-[10px] font-semibold text-white hover:bg-tg-accent">Open External</button>
          </div>
        ))}
        <input value={w.task} onChange={(e) => setWin(id, { task: e.target.value })} placeholder="Assigned task" className="mt-2 w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[10px]" />
        <textarea value={w.prompt} onChange={(e) => setWin(id, { prompt: e.target.value })} rows={2} placeholder="Current prompt" className="mt-1 w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[10px]" />
        <textarea value={w.result} onChange={(e) => setWin(id, { result: e.target.value })} rows={2} placeholder="Result preview" className="mt-1 w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[10px]" />
        <div className="mt-1 flex flex-wrap gap-1">
          <button onClick={() => setWin(id, { prompt: buildPrompt(t.name, w.task || t.role) })} className="rounded-md bg-indigo-600/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-600">Inject Context</button>
          <button onClick={() => copyText(w.prompt || buildPrompt(t.name, w.task || t.role), t.name + " prompt")} className="rounded-md bg-sky-600/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-sky-600">Copy Prompt</button>
          <button onClick={() => saveWinArtifact(id)} className="rounded-md bg-violet-600/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-violet-600">→ Artifacts</button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[95] flex flex-col text-tg-text" style={{ background: "linear-gradient(160deg,#060814,#0a0c1a 55%,#070710)" }}>
      <div className="flex items-center justify-between border-b border-tg-line/60 px-4 py-3">
        <div className="flex items-center gap-3"><span className="text-lg font-black">🧠 AI COMMAND CENTER</span><span className="hidden text-[11px] text-tg-muted sm:inline">{t("acc.subtitle", loc)}</span></div>
        <div className="flex items-center gap-2">
          <select value={project} onChange={(e) => setProject(e.target.value)} className="rounded-lg border border-tg-line bg-tg-bg/60 px-2 py-1 text-[12px]">{PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
          <LanguageSwitcher compact />
          <button onClick={() => { setPalette(true); setPq(""); }} className="rounded-lg border border-tg-line px-2 py-1 text-[11px] text-tg-muted hover:text-white">⌘K</button>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-[12px] hover:bg-white/20">✕ {t("acc.close", loc)}</button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-tg-line/40 px-3 py-2">
        <TabBtn v="dashboard" label={`📊 ${t("acc.tab.dashboard", loc)}`} /><TabBtn v="workspace" label={`🪟 ${t("acc.tab.workspace", loc)}`} /><TabBtn v="operator" label={`🧠 ${t("acc.tab.operator", loc)}`} /><TabBtn v="studio" label={`📝 ${t("acc.tab.studio", loc)}`} /><TabBtn v="memory" label={`📁 ${t("acc.tab.memory", loc)}`} /><TabBtn v="artifacts" label={`🗂 ${t("acc.tab.artifacts", loc)}`} /><TabBtn v="epicgram" label={`✈ ${t("acc.tab.epicgram", loc)}`} /><TabBtn v="mcp" label={`🔌 ${t("acc.tab.mcp", loc)}`} />
      </div>

      {note && <div className="border-b border-tg-line/40 bg-tg-bg/30 px-4 py-1.5 text-[11px] text-tg-muted">{note}</div>}

      <div className="flex-1 overflow-hidden p-3">
        {view === "dashboard" && (
          <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-tg-line/50 bg-tg-bg/20 p-3"><div className="text-[12px] font-bold">Active Project</div><div className="text-xl font-black">{project}</div><div className="text-[11px] text-tg-muted">Sprint: {mem().sprint || "не задан"} · Module: {ACTIVE_MODULE}</div></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Running" value={running} color="#fbbf24" /><Stat label="Completed" value={completed} color="#4ade80" /><Stat label="Pending Approval" value={pending} color="#60a5fa" /><Stat label="Artifacts" value={projArtifacts.length} /></div>
              <div className="rounded-xl border border-tg-line/50 bg-tg-bg/20 p-3"><div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-tg-muted">AI Health</div><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{TOOLS.filter((t) => t.category === "AI" || t.category === "Research").map((t) => <div key={t.id} className="flex items-center justify-between rounded-lg border border-tg-line/40 bg-tg-bg/40 px-2 py-1.5"><span className="text-[11px] font-semibold">{t.name}</span><span className="text-[10px]" style={{ color: stColor(ts(t.id).status) }}>● {ts(t.id).status}</span></div>)}</div></div>
            </div>
            <div className="rounded-xl border border-tg-line/50 bg-tg-bg/20 p-2"><div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-tg-muted">Live Status</div><div className="max-h-[60vh] overflow-y-auto">{history.length === 0 && <div className="px-1 text-[10px] text-tg-muted">Пусто.</div>}{history.slice(0, 40).map((h) => <div key={h.id} className="border-b border-tg-line/20 px-1 py-1.5"><div className="text-[10px] text-tg-muted">{h.at} · {h.kind}</div><div className="text-[11px] leading-tight">{h.text}</div></div>)}</div></div>
          </div>
        )}

        {view === "workspace" && (
          <div className="grid h-full grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[240px_1fr_300px]">
            <div className="overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/20 p-2">
              <div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-tg-muted">Delegation Templates</div>
              <div className="mb-3 grid grid-cols-2 gap-1">{DELEG_TEMPLATES.map((d) => <button key={d.label} onClick={() => runTemplate(d)} className="rounded-md border border-tg-line/60 bg-tg-bg/40 px-2 py-1.5 text-left text-[10px] hover:border-tg-accent/50"><div className="font-bold">{d.label}</div><div className="text-tg-muted">→ {d.agent}</div></button>)}</div>
              <div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-tg-muted">Каталог</div>
              {TOOLS.map((t) => { const s = ts(t.id); return (
                <div key={t.id} className="mb-1.5 rounded-lg border border-tg-line/50 bg-tg-bg/40 p-2">
                  <div className="flex items-center justify-between"><span className="text-[12px] font-bold">{t.name}</span><span className="text-[9px]" style={{ color: stColor(s.status) }}>● {s.status}</span></div>
                  <div className="mt-1 flex items-center gap-1"><button onClick={() => openTool(t)} className="flex-1 rounded-md bg-tg-accent/80 px-2 py-1 text-[10px] font-semibold text-white hover:bg-tg-accent">Open</button><button onClick={() => setTs(t.id, { launchMode: s.launchMode === "embedded" ? "external" : "embedded" })} className="rounded-md border border-tg-line px-1.5 py-1 text-[9px] text-tg-muted hover:text-white">{s.launchMode === "embedded" ? "▣" : "↗"}</button></div>
                </div>
              ); })}
            </div>

            <div className="overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/10 p-2">
              <div className="mb-2 flex items-center justify-between px-1"><span className="text-[11px] font-bold uppercase tracking-wide text-tg-muted">Multi-AI Workspace · {workspace.length}</span><span className="text-[9px] text-tg-muted">Grid · Split · Focus · Dock · Min</span></div>
              {minimized.length > 0 && <div className="mb-2 flex flex-wrap gap-1">{minimized.map((id) => { const t = TOOLS.find((x) => x.id === id)!; return <button key={id} onClick={() => setWin(id, { mode: "grid" })} className="rounded-md border border-tg-line/60 bg-tg-bg/50 px-2 py-1 text-[10px] hover:border-tg-accent/50">▣ {t.name}</button>; })}</div>}
              {workspace.length === 0 && <div className="grid h-40 place-items-center text-[12px] text-tg-muted">Открой инструмент или шаблон — окно появится здесь</div>}
              <div className="grid gap-3 md:grid-cols-2">{openWins.map((id) => renderWindow(id))}</div>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto">
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/10 p-2.5">
                <div className="text-[11px] font-bold text-indigo-200">Project Context Injector</div>
                <div className="mt-0.5 text-[9px] text-tg-muted">Подставляется в каждый промпт.</div>
                <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal" className="mt-1.5 w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[10px]" />
                <pre className="mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-[9px] leading-tight text-tg-text/80">{contextBlock()}</pre>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-600/5 p-2.5">
                <div className="text-[11px] font-bold text-emerald-200">EPIC GRAM Bridge · mock</div>
                <div className="mt-1 flex gap-1"><input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Draft title" className="flex-1 rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[10px]" /><button onClick={createDraft} className="rounded-md bg-emerald-600/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600">+ Draft</button></div>
                <div className="mt-1.5 max-h-40 overflow-y-auto">{projDrafts.length === 0 && <div className="text-[9px] text-tg-muted">Manual approval only. Реальной отправки нет.</div>}{projDrafts.map((dr) => <div key={dr.id} className="mb-1 rounded-md border border-tg-line/50 bg-tg-bg/40 p-1.5"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold">{dr.title}</span><button onClick={() => advanceDraft(dr)} className="text-[9px]" style={{ color: stColor(dr.status) }}>● {dr.status} →</button></div></div>)}</div>
              </div>
            </div>
          </div>
        )}

        {view === "operator" && (
          <div className="grid h-full grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[1fr_340px]">
            <div className="overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/10 p-3">
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/10 p-3"><div className="text-[12px] font-bold text-indigo-200">🧠 AI Operator (Master)</div><textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} placeholder="Опиши большую задачу проекта" className="mt-2 w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[11px]" /><div className="mt-2 flex gap-1.5"><button onClick={analyzeSplit} className="rounded-md bg-indigo-600/80 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-600">Analyze & Split</button><button onClick={aggregate} className="rounded-md bg-emerald-600/70 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600">Свести результаты</button></div></div>
              <div className="mt-3 mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-tg-muted">Tasks · {projTasks.length}</div>
              {projTasks.map((d) => (
                <div key={d.id} className="mb-2 rounded-lg border border-tg-line/50 bg-tg-bg/40 p-2.5">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="text-[12px] font-bold">{d.agent}</span><select value={d.priority} onChange={(e) => setPriority(d.id, e.target.value)} className="rounded bg-white/5 px-1 py-0.5 text-[9px]" style={{ color: prColor(d.priority) }}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div><button onClick={() => advance(d)} className="text-[10px]" style={{ color: stColor(d.status) }}>● {d.status} →</button></div>
                  <div className="text-[10px] leading-tight text-tg-muted">{d.task}</div>
                  <textarea value={d.result} onChange={(e) => setResult(d.id, e.target.value)} rows={2} placeholder="Результат от AI" className="mt-1 w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[10px]" />
                  <div className="mt-1 flex flex-wrap gap-1"><button onClick={() => copyText(d.prompt || buildPrompt(d.agent, d.task), d.agent + " prompt")} className="rounded-md bg-sky-600/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-sky-600">Copy Prompt</button><button onClick={() => saveTaskArtifact(d)} className="rounded-md bg-violet-600/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-violet-600">Save Artifact</button><button onClick={() => sendApproval(d)} className="rounded-md bg-emerald-600/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600">Send to Approval</button></div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto">
              <div className="rounded-xl border border-tg-line/50 bg-tg-bg/20 p-2"><div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-tg-muted">Operator Summary</div><pre className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-[10px] leading-tight text-emerald-100/90">{summary[project] || "Нажми «Свести результаты»."}</pre></div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-600/5 p-2"><div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-tg-muted">Approval Board · {approvals.length}</div>{approvals.map((a) => <div key={a.id} className="mb-1.5 rounded-lg border border-emerald-500/30 bg-emerald-600/10 p-2"><div className="flex items-center justify-between"><span className="text-[12px] font-bold text-emerald-200">{a.agent}</span><span className="text-[9px] text-tg-muted">{a.updatedAt}</span></div><div className="text-[10px] leading-tight text-tg-muted">{a.task}</div></div>)}</div>
            </div>
          </div>
        )}

        {view === "studio" && (
          <div className="grid h-full grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[300px_1fr]">
            <div className="overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/20 p-2"><div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-tg-muted">Prompt Library</div>{templates.map((t) => <button key={t.id} onClick={() => setTplSel(t.id)} className={"mb-1.5 block w-full rounded-lg border px-2 py-1.5 text-left text-[12px] " + (tplSel === t.id ? "border-tg-accent/60 bg-tg-accent/10" : "border-tg-line/50 bg-tg-bg/40 hover:border-tg-accent/40")}>{t.name}</button>)}<button onClick={() => { const id = "t" + Date.now(); setTemplates((tp) => [...tp, { id, name: "Новый шаблон", body: "PROJECT: {{project}}\nTASK: {{task}}" }]); setTplSel(id); }} className="mt-1 w-full rounded-lg border border-dashed border-tg-line/60 px-2 py-1 text-[11px] text-tg-muted hover:text-white">+ Шаблон</button></div>
            <div className="overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/10 p-3">{(() => { const t = templates.find((x) => x.id === tplSel) || templates[0]; if (!t) return null; return (
              <div>
                <input value={t.name} onChange={(e) => setTemplates((tp) => tp.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x))} className="w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[12px] font-bold" />
                <textarea value={t.body} onChange={(e) => setTemplates((tp) => tp.map((x) => x.id === t.id ? { ...x, body: e.target.value } : x))} rows={6} className="mt-2 w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[11px]" />
                <div className="mt-1 text-[10px] text-tg-muted">Variables: {"{{project}} {{context}} {{repo}} {{task}}"}</div>
                <pre className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-[10px] leading-tight text-tg-text/90">{tplFill(t.body)}</pre>
                <div className="mt-2 px-1 text-[11px] font-bold uppercase tracking-wide text-tg-muted">Mass Send</div>
                <div className="mt-1 flex flex-wrap gap-1">{TOOLS.filter((x) => x.category === "AI" || x.category === "Research").map((x) => <button key={x.id} onClick={() => setMassSel((m) => m.includes(x.id) ? m.filter((i) => i !== x.id) : [...m, x.id])} className={"rounded-md px-2 py-1 text-[10px] font-semibold " + (massSel.includes(x.id) ? "bg-tg-accent/80 text-white" : "border border-tg-line text-tg-muted hover:text-white")}>{x.name}</button>)}</div>
                <button onClick={massSend} className="mt-2 rounded-md bg-fuchsia-600/80 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-fuchsia-600">Отправить {massSel.length} AI (копировать)</button>
              </div>
            ); })()}</div>
          </div>
        )}

        {view === "memory" && (
          <div className="mx-auto h-full max-w-2xl overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/10 p-4">
            <div className="text-[12px] font-bold">📁 Project Memory · {project}</div><div className="mt-0.5 text-[10px] text-tg-muted">Shared Context для всех AI.</div>
            <div className="mt-3"><div className="mb-1 text-[11px] font-semibold text-tg-muted">Current Sprint</div><input value={mem().sprint} onChange={(e) => setMem({ sprint: e.target.value })} className="w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[11px]" /></div>
            {([["context", "Goal / Контекст"], ["architecture", "Архитектура"], ["decisions", "Решения"], ["repo", "Репозиторий"], ["files", "Файлы / артефакты"], ["roadmap", "Roadmap"], ["notes", "Notes"]] as [keyof Memory, string][]).map(([k, label]) => <div key={k} className="mt-3"><div className="mb-1 text-[11px] font-semibold text-tg-muted">{label}</div><textarea value={mem()[k]} onChange={(e) => setMem({ [k]: e.target.value } as Partial<Memory>)} rows={k === "context" ? 4 : 2} className="w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[11px]" /></div>)}
          </div>
        )}

        {view === "artifacts" && (
          <div className="grid h-full grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[260px_1fr]">
            <div className="overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/20 p-2"><div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-tg-muted">Artifact Bus · {projArtifacts.length}</div><input value={artQ} onChange={(e) => setArtQ(e.target.value)} placeholder="Поиск артефакта…" className="mb-2 w-full rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[11px]" />{artFiltered.length === 0 && <div className="px-1 text-[10px] text-tg-muted">Пусто.</div>}{artFiltered.map((a) => <div key={a.id} className="mb-1.5 rounded-lg border border-tg-line/50 bg-tg-bg/40 p-2"><div className="flex items-center justify-between"><span className="text-[11px] font-bold">{a.kind}</span><span className="text-[9px] text-tg-muted">{a.at}</span></div><div className="text-[10px] leading-tight text-tg-muted">{a.title}</div></div>)}</div>
            <div className="overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/10 p-3"><div className="text-[11px] text-tg-muted">Типы: Architecture · Audit · Code · UX · Research · Report · Publishing draft · Media idea · Markdown.</div>{artFiltered.slice(0, 1).map((a) => <div key={a.id} className="mt-3"><div className="text-[12px] font-bold">{a.title}</div><pre className="mt-1 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-[10px] leading-tight text-tg-text/90">{a.body}</pre><button onClick={() => copyText(a.body, "artifact")} className="mt-2 rounded-md bg-sky-600/70 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-600">Copy</button></div>)}</div>
          </div>
        )}

        {view === "epicgram" && (
          <div className="mx-auto h-full max-w-2xl overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/10 p-4">
            <div className="text-[12px] font-bold">✈ EPIC GRAM Bridge · mock</div>
            <div className="mt-0.5 text-[10px] text-tg-muted">AI COMMAND CENTER → Approval Draft → EPIC GRAM Queue → Manual Approval → Publish. Реальной отправки в Telegram нет — только UI/manual.</div>
            <div className="mt-3 flex gap-1.5"><input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Create Telegram Draft" className="flex-1 rounded-md border border-tg-line bg-tg-bg/60 px-2 py-1 text-[11px]" /><button onClick={createDraft} className="rounded-md bg-emerald-600/80 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600">Create Draft</button></div>
            <div className="mt-3 grid gap-2">{projDrafts.length === 0 && <div className="text-[10px] text-tg-muted">Черновиков нет.</div>}{projDrafts.map((dr) => <div key={dr.id} className="rounded-lg border border-tg-line/50 bg-tg-bg/40 p-2.5"><div className="flex items-center justify-between"><span className="text-[12px] font-semibold">{dr.title}</span><span className="text-[10px]" style={{ color: stColor(dr.status) }}>● {dr.status}</span></div><div className="mt-1.5 flex items-center gap-1.5"><button onClick={() => advanceDraft(dr)} className="rounded-md bg-tg-accent/80 px-2 py-1 text-[10px] font-semibold text-white hover:bg-tg-accent">{dr.status === "draft" ? "Send to EPIC GRAM Queue" : dr.status === "queued" ? "Await Manual Approval" : dr.status === "awaiting" ? "Publish (Mock)" : "Published (Manual Only)"}</button><span className="text-[9px] text-tg-muted">{dr.at}</span></div></div>)}</div>
          </div>
        )}

        {view === "mcp" && (
          <div className="mx-auto h-full max-w-2xl overflow-y-auto rounded-xl border border-tg-line/50 bg-tg-bg/10 p-4">
            <div className="text-[12px] font-bold">🔌 MCP Layer · planned</div><div className="mt-0.5 text-[10px] text-tg-muted">Архитектурный задел. Отключено: без вызовов, токенов, автоматизации.</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{MCP_PLANNED.map(([name, st]) => <div key={name} className="flex items-center justify-between rounded-lg border border-tg-line/50 bg-tg-bg/40 p-2.5"><span className="text-[12px] font-semibold">{name}</span><span className="rounded px-1.5 py-0.5 text-[10px]" style={{ color: stColor(st) }}>● {st}</span></div>)}</div>
          </div>
        )}
      </div>

      {/* Bottom Artifact Bus rail */}
      <div className="flex items-center gap-2 border-t border-tg-line/50 bg-tg-bg/30 px-3 py-1.5">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-tg-muted">Artifact Bus</span>
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
          {projArtifacts.length === 0 && <span className="text-[10px] text-tg-muted">Сохраняй результаты окон/задач сюда (→ Artifacts).</span>}
          {projArtifacts.slice(0, 14).map((a) => <button key={a.id} onClick={() => { setView("artifacts"); setArtQ(a.title.slice(0, 12)); }} className="shrink-0 rounded-md border border-tg-line/60 bg-tg-bg/50 px-2 py-1 text-[10px] hover:border-tg-accent/50"><span style={{ color: stColor("ready") }}>●</span> {a.kind} · {a.title.slice(0, 22)}</button>)}
        </div>
      </div>

      {palette && (
        <div className="fixed inset-0 z-[96] flex items-start justify-center bg-black/50 pt-24" onClick={() => setPalette(false)}>
          <div className="w-full max-w-lg rounded-xl border border-tg-line/60 bg-tg-bg/95 p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <input autoFocus value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Command Palette — действие…" className="w-full rounded-lg border border-tg-line bg-tg-bg/60 px-3 py-2 text-[13px]" />
            <div className="mt-1.5">{paletteFiltered.map((a) => <button key={a.k} onClick={() => { a.run(); setPalette(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-[12px] text-tg-muted hover:bg-white/5 hover:text-white">{a.k}</button>)}{paletteFiltered.length === 0 && <div className="px-3 py-2 text-[12px] text-tg-muted">Ничего не найдено</div>}</div>
          </div>
        </div>
      )}
    </div>
  );
}
