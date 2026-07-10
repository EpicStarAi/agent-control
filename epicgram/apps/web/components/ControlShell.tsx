"use client";

// CONTROL SHELL — ChatGPT-style AI workspace shell + AI Operator console.
// Layout: top system bar · left sidebar (sections/projects/modules/history) · center chat · right AI Operator.
// UI-first. No runtime actions, no Telegram sends, no secrets in localStorage. Additive overlay.

import { useEffect, useMemo, useRef, useState } from "react";
import { getPrefs, setPrefs, applyPrefs, t, LANGS, THEMES, type Lang, type Theme } from "./prefs";
import { getCtx, setCtx, getTimeline } from "./context";

type Ctx = { agents: any[]; missions: any[]; exec: any[]; devices: any[]; slots: any[]; bind: Record<string, string>; counts: Record<string, any>; activeId: string };
const LH = "epic_chat_history_v1", LS = "epic_control_shell_v1";

const NAV = [["new", "✨ New Chat"], ["search", "🔍 Search"], ["library", "📚 Library"], ["scheduled", "⏰ Scheduled"], ["apps", "🧩 Apps"], ["projects", "📁 Projects"], ["images", "🖼 Images"], ["videos", "🎞 Videos"], ["models", "🤖 AI Models"], ["history", "🕘 History"], ["artifacts", "📦 Artifacts"], ["files", "🗂 Files"], ["settings", "⚙ Settings"]] as const;
const PROJECTS = ["DEEPINSIDE.LIFE", "EPIC☠️STAR", "OpenClaw AI", "Telegram Command Center", "Media Factory", "EPIC Architect", "GeeLark Device Center", "AI Agents Registry", "Mission Control"];
const MODULES: [string, string][] = [
  ["world", "🌐 WORLD"], ["registry", "🧠 Agent Registry"], ["telegram", "📨 Telegram Workspace"], ["tgcommand", "🛰 Telegram Command Center"],
  ["tgdiscovery", "🔎 Telegram Discovery"], ["mediaops", "🎬 Media Operations"], ["architect", "🏛 EPIC Architect"], ["ops", "🛰 Infrastructure / Ops"],
  ["ai", "✨ AI Services"], ["guide", "🧭 AI Guide"], ["devices", "📱 Device Control Center"], ["coo", "🤖 AI COO"],
  ["runtime", "🚀 Runtime Operations"], ["provisioning", "🧰 Provisioning Agent"],
  ["medianet", "🎙 Media Network"], ["adfactory", "📢 Advertising Factory"], ["social", "🌍 Social Empire"],
  ["agentos", "🤖 Agent OS"], ["twins", "👤 Digital Twin Center"], ["missioncontrol", "🎯 Mission Control"],
  ["ecosystem", "🧬 Ecosystem Bus"], ["executive", "👑 Executive Dashboard"], ["inspector", "🔍 Universal Inspector"], ["relationships", "🔗 Relationship Engine"], ["readinessofficer", "🧠 Readiness AI Officer"],
  ["mediacanvas", "🏭 Медиазавод (Canvas)"], ["orchestration", "🎬 Media Orchestration"],
  ["economy", "💰 Economy Engine"], ["worldengine", "🌍 World Engine"], ["commandcenter", "🏛 Command Center"],
  ["activation", "🚀 Activation Engine"], ["strategy", "🎯 Mission Control (Strategy)"], ["roadmap", "🗺 Roadmap Center"],
  ["knowledge", "📚 Knowledge Engine"], ["automation", "⚡ Automation Fabric"],
  ["launchops", "🖥 Operations Center (Launch)"], ["warroom", "⚔ War Room"],
  ["identity", "🪪 Identity Infrastructure"], ["reality", "🌉 Reality Bridge"],
  ["humanfactory", "🧬 Digital Humans"], ["androidlab", "🤖 Android Cloud Lab"], ["assignments", "🧭 Operations Matrix"], ["runtimegate", "🛂 Runtime Gate"], ["dryrun", "🧪 Runtime Dry Run"],
  ["platformos", "🪐 Platform OS v1.0"], ["commandgraph", "🕸 Command Graph"], ["osmap", "🪐 OS Map"],
  ["worldcenter", "🌌 World Engine (Universe)"], ["digitalhumancity", "🧬 Digital Human City"],
  ["ecosystemcomplete", "🌠 Ecosystem v1.0"], ["ceoview", "👑 CEO View"], ["ecosystemmap", "🌐 Ecosystem Map"],
];
const TOOLS = ["WORLD Graph", "Telegram Layer (read-only)", "Discovery Engine", "Media Factory", "EPIC Architect", "Device Center", "AI COO", "HTML Canvas"];

export function ControlShell({ ctx, onClose, onAction }: { ctx: Ctx; onClose: () => void; onAction?: (t: string) => void }) {
  const [nav, setNav] = useState("new");
  const [chats, setChats] = useState<any[]>([]);
  const [active, setActive] = useState<string>("");
  const [input, setInput] = useState("");
  const [voice, setVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [screen, setScreen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [pq, setPq] = useState("");
  const [lang, setLangState] = useState<Lang>("ru");
  const [theme, setThemeState] = useState<Theme>("dark");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const p = getPrefs(); setLangState(p.language); setThemeState(p.theme); applyPrefs(p); }, []);
  function changeLang(l: Lang) { setLangState(l); setPrefs({ language: l }); }
  function changeTheme(th: Theme) { setThemeState(th); setPrefs({ theme: th }); }
  const tr = (k: string) => t(k, lang);
  const LangThemeBar = ({ size = "sm" }: { size?: string }) => (
    <div className="flex flex-wrap items-center gap-1">
      {LANGS.map(([id, label]) => <button key={id} onClick={() => changeLang(id)} className={`rounded-full px-2 py-0.5 text-[10px] ${lang === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{label}</button>)}
      <span className="mx-1 text-tg-muted">·</span>
      {THEMES.map(([id, label]) => <button key={id} onClick={() => changeTheme(id)} title={label} className={`rounded-full px-2 py-0.5 text-[10px] ${theme === id ? "bg-fuchsia-600 text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{id === "matrix" ? "🟢 Matrix" : label}</button>)}
    </div>
  );

  const MODELS = [
    { name: "Claude", status: "Connected" }, { name: "ChatGPT", status: "Needs API" }, { name: "Grok", status: "Mock" },
    { name: "Gemini", status: "Needs API" }, { name: "OpenRouter", status: "Connected" }, { name: "HuggingFace", status: "Mock" },
    { name: "Perplexity", status: "Not Connected" }, { name: "ElevenLabs", status: "Needs API" },
  ];
  const VAULT = [
    { provider: "OpenRouter", name: "router-key", status: "Connected", env: "prod", masked: "sk-or-••••••••3f", updated: "2026-06-19" },
    { provider: "Anthropic", name: "claude-key", status: "Connected", env: "prod", masked: "sk-ant-••••••2a", updated: "2026-06-18" },
    { provider: "ElevenLabs", name: "voice-key", status: "Needs API", env: "dev", masked: "—", updated: "—" },
    { provider: "GeeLark", name: "device-key", status: "Not Connected", env: "prod", masked: "—", updated: "—" },
  ];
  const MSTATUS: Record<string, string> = { Connected: "#4ade80", "Not Connected": "#f87171", "Needs API": "#fbbf24", Mock: "#a78bfa", Healthy: "#4ade80", Warning: "#fbbf24", Critical: "#f87171", Running: "#4ade80", Paused: "#fbbf24", Error: "#f87171", Completed: "#4ade80" };
  const mediaIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_media_ops_v1") || "null"); } catch { return null; } }, []);
  const tgIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_telegram_index_v1") || "null"); } catch { return null; } }, []);
  const devIdx = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_device_center_v1") || "null"); } catch { return null; } }, []);

  // ---- DEEPINSIDE OS centers (mock / derived, read-only) ----
  const FINANCE = useMemo(() => ({
    categories: [["AI Models", 420], ["Infrastructure", 222], ["Domains", 30], ["Devices", 80], ["Proxies", 70], ["SIM", 70], ["Cloud Phones", 60], ["Publishing", 0], ["Media Production", 120]] as [string, number][],
  }), []);
  const monthly = useMemo(() => FINANCE.categories.reduce((s, c) => s + c[1], 0), [FINANCE]);
  const INTEGRATIONS = [
    { p: "OpenAI", s: "Needs API", env: "prod", last: "—", ver: "—" }, { p: "Anthropic", s: "Connected", env: "prod", last: "12:40", ver: "2025-06" },
    { p: "Gemini", s: "Needs API", env: "prod", last: "—", ver: "—" }, { p: "Grok", s: "Mock", env: "dev", last: "—", ver: "—" },
    { p: "Perplexity", s: "Not Connected", env: "prod", last: "—", ver: "—" }, { p: "OpenRouter", s: "Connected", env: "prod", last: "12:38", ver: "v1" },
    { p: "HuggingFace", s: "Mock", env: "dev", last: "—", ver: "—" }, { p: "ElevenLabs", s: "Needs API", env: "prod", last: "—", ver: "—" },
    { p: "Telegram", s: ctx.slots.length ? "Connected" : "Not Connected", env: "prod", last: "12:40", ver: "TDLib" }, { p: "GeeLark", s: "Mock", env: "prod", last: "11:50", ver: "—" },
    { p: "Cloudflare", s: "Connected", env: "prod", last: "12:00", ver: "—" }, { p: "GitHub", s: "Connected", env: "prod", last: "пн", ver: "—" },
    { p: "Docker", s: "Connected", env: "prod", last: "12:30", ver: "—" }, { p: "n8n", s: "Connected", env: "prod", last: "12:31", ver: "—" },
  ];
  const TWINS = ["EVA", "NOVIKOVA", "PET 3D", "BUCHA", "BUCHIHI"];
  const AUTOMATION = [
    { n: "Content Pipeline (n8n)", s: "Running" }, { n: "Render Notify (n8n)", s: "Running" }, { n: "Drops Publisher (n8n)", s: "Paused" },
    { n: "Discovery Sync (cron)", s: "Running" }, { n: "Filesystem MCP", s: "Running" }, { n: "Telegram MCP", s: "Running" }, { n: "Health Ping", s: "Error" },
  ];
  const SECURITY = [["Cloudflare", "Healthy"], ["SSL", "Healthy"], ["Domains", "Healthy"], ["API Status", "Warning"], ["Backups", "Healthy"], ["VPN", "Healthy"], ["Firewall", "Healthy"], ["Authentication", "Healthy"], ["Risk Monitor", "Warning"]] as [string, string][];
  const KNOWLEDGE = [["Prompts", 24], ["Instructions", 12], ["Playbooks", 6], ["Workflows", 8], ["Scenarios", 5], ["Documentation", 14], ["Research", 9], ["Assets", 42], ["Reports", 7], ["Exports", 11]] as [string, number][];
  const DATACENTER = [["PostgreSQL", "1.2 GB", "healthy"], ["Redis", "90 MB", "healthy"], ["LocalStorage", "~24 KB", "healthy"], ["Exports", "8 files", "ok"], ["Snapshots", "5", "ok"], ["Files", "63", "ok"], ["Media Assets", "12", "ok"], ["Logs", "stream", "ok"]] as [string, string, string][];

  const osReadiness = useMemo(() => {
    const a = ctx.agents.length ? Math.round(ctx.agents.filter((x) => x.state === "ACTIVE").length / ctx.agents.length * 100) : 0;
    return [
      ["EPIC OS", 95], ["WORLD", 92], ["Agents", a], ["Telegram", ctx.slots.length ? 100 : 0], ["Media Factory", 70], ["Media Ops", 75],
      ["Devices", devIdx ? 85 : 50], ["Infrastructure", 95], ["Security", 88], ["Automation", 82], ["Publishing", 60], ["AI Services", 100], ["Digital Twins", 65],
      ["Context", 90], ["Knowledge", 78], ["Voice", 55],
    ] as [string, number][];
  }, [ctx, devIdx]);
  const osOverall = Math.round(osReadiness.reduce((s, r) => s + r[1], 0) / osReadiness.length);

  // ---- v1.1 centers: Knowledge Vault · Automation Center · Voice Operator ----
  const KVAULT = [
    { title: "DEEPINSIDE.LIFE", type: "Project", status: "active", tags: ["core"], links: ["EVA", "TikTok Growth"] },
    { title: "EVA Persona Spec", type: "Document", status: "ready", tags: ["agent", "media"], links: ["EVA"] },
    { title: "Neon Studio Prompt", type: "Prompt", status: "ready", tags: ["comfyui"], links: ["Media"] },
    { title: "Runtime Architecture", type: "Architecture", status: "active", tags: ["infra"], links: ["VPS", "Docker"] },
    { title: "Weekly Report", type: "Report", status: "draft", tags: ["ops"], links: ["Missions"] },
  ];
  const KSECTIONS = ["Projects", "Documents", "Prompts", "Architectures", "Reports", "Agents", "Infrastructure", "Media", "Knowledge Base"];
  const AUTO_NODES = ["Telegram", "Agent", "Device", "AI Model", "OpenRouter", "Claude", "ChatGPT", "Grok", "Gemini", "Perplexity", "HuggingFace", "ComfyUI", "FaceFusion", "DeepFaceLive", "ElevenLabs", "Suno", "FFmpeg", "Media Factory", "Publishing", "Webhook", "HTTP", "Schedule", "Condition"];
  const FLOWS = [
    { name: "EVA Content Flow", status: "Running" }, { name: "Render Notify", status: "Ready" }, { name: "Drops Publisher", status: "Paused" },
    { name: "Discovery Sync", status: "Running" }, { name: "Health Ping", status: "Failed" }, { name: "Voice Brief", status: "Draft" },
  ];
  const FSTATUS: Record<string, string> = { Draft: "#9ca3af", Ready: "#38bdf8", Running: "#4ade80", Paused: "#fbbf24", Completed: "#22c55e", Failed: "#f87171" };
  const VOICE_CMDS = ["EPIC открой WORLD", "EPIC открой Telegram", "EPIC покажи EVA", "EPIC покажи инфраструктуру", "EPIC сколько устройств онлайн", "EPIC открой Architect"];

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("epic_knowledge_vault_v1", JSON.stringify({ ts, items: KVAULT, sections: KSECTIONS }));
    localStorage.setItem("epic_knowledge_graph_v1", JSON.stringify({ ts, nodes: KVAULT.map((k) => k.title), edges: KVAULT.flatMap((k) => k.links.map((l) => [k.title, l])) }));
    localStorage.setItem("epic_automation_center_v1", JSON.stringify({ ts, flows: FLOWS, nodeTypes: AUTO_NODES }));
    localStorage.setItem("epic_automation_graph_v1", JSON.stringify({ ts, nodes: AUTO_NODES.slice(0, 10) }));
    localStorage.setItem("epic_voice_operator_v1", JSON.stringify({ ts, mode: "push-to-talk", wakeWord: "EPIC", commands: VOICE_CMDS }));
    localStorage.setItem("epic_screen_context_v1", JSON.stringify({ ...getCtx(), ts }));
  } catch {} }, []);
  const sys = getCtx();

  // write OS center snapshots (no secrets)
  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("epic_executive_v1", JSON.stringify({ ts, agents: ctx.agents.length, devices: devIdx?.devices?.length || 0, sessions: ctx.slots.length, missions: ctx.missions.length, monthly }));
    localStorage.setItem("epic_ceo_v1", JSON.stringify({ ts, overall: osOverall, mode: "executive" }));
    localStorage.setItem("epic_finance_v1", JSON.stringify({ ts, monthly, annual: monthly * 12, categories: FINANCE.categories }));
    localStorage.setItem("epic_knowledge_v1", JSON.stringify({ ts, sections: KNOWLEDGE }));
    localStorage.setItem("epic_automation_v1", JSON.stringify({ ts, tasks: AUTOMATION }));
    localStorage.setItem("epic_security_v1", JSON.stringify({ ts, blocks: SECURITY }));
    localStorage.setItem("epic_integrations_v1", JSON.stringify({ ts, providers: INTEGRATIONS.map((i) => ({ provider: i.p, status: i.s, env: i.env })) }));
    localStorage.setItem("epic_twins_v1", JSON.stringify({ ts, twins: TWINS }));
    localStorage.setItem("epic_data_center_v1", JSON.stringify({ ts, sources: DATACENTER }));
    localStorage.setItem("epic_readiness_v1", JSON.stringify({ ts, overall: osOverall, matrix: osReadiness }));
  } catch {} }, [ctx, devIdx, monthly, osOverall]);

  useEffect(() => { try { const h = JSON.parse(localStorage.getItem(LH) || "[]"); if (Array.isArray(h) && h.length) { setChats(h); setActive(h[0].id); } else newChat(); } catch { newChat(); } }, []);
  useEffect(() => { try { localStorage.setItem(LH, JSON.stringify(chats)); } catch {} }, [chats]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [active, chats]);
  useEffect(() => { try {
    localStorage.setItem(LS, JSON.stringify({ nav, voice, screen, timestamp: new Date().toISOString() }));
    localStorage.setItem("epic_api_vault_ui_v1", JSON.stringify({ note: "UI-only, masked, no real keys", providers: VAULT.map((v) => ({ provider: v.provider, name: v.name, status: v.status, env: v.env, updated: v.updated })) }));
    localStorage.setItem("epic_voice_ui_v1", JSON.stringify({ active: voice, muted, mode: "mock" }));
    localStorage.setItem("epic_screen_view_ui_v1", JSON.stringify({ active: screen, mode: "mock" }));
  } catch {} }, [nav, voice, screen, muted]);
  useEffect(() => { function k(e: KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setPalette((v) => !v); setPq(""); } if (e.key === "Escape") setPalette(false); } window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  function newChat(type = "operator", module = "control") {
    const id = "c" + Date.now();
    const c = { id, title: "New Chat", type, module, messages: [{ who: "ai", text: "Я AI Operator EPIC☠STAR. Спросите про статус системы, экран, агентов, Telegram, устройства или что делать дальше." }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false, tags: [] as string[] };
    setChats((cs) => [c, ...cs]); setActive(id); setNav("new"); return id;
  }
  const cur = chats.find((c) => c.id === active);

  const readiness = useMemo(() => {
    const a = ctx.agents.length ? Math.round(ctx.agents.filter((x) => x.state === "ACTIVE").length / ctx.agents.length * 100) : 0;
    return [
      ["Agents", a], ["Telegram", ctx.slots.length ? 100 : 0], ["Discovery", tgIdx ? 100 : 40],
      ["Devices", devIdx ? 90 : 50], ["Infrastructure", 95], ["AI Services", 100],
    ] as [string, number][];
  }, [ctx, tgIdx, devIdx]);
  const overall = Math.round(readiness.reduce((s, r) => s + r[1], 0) / readiness.length);

  const recs = useMemo(() => {
    const r: string[] = [];
    if (!ctx.slots.length) r.push("Подключите Telegram-сессию.");
    if (!tgIdx) r.push("Запустите Telegram Discovery.");
    if (devIdx?.devices?.some((d: any) => d.status === "offline")) r.push("Есть offline-устройства — проверьте Device Center.");
    const idle = ctx.agents.filter((x) => x.state !== "ACTIVE"); if (idle.length) r.push(idle.length + " агентов неактивны.");
    r.push("Откройте WORLD для обзора экосистемы.");
    return r;
  }, [ctx, tgIdx, devIdx]);

  function answer(qRaw: string) {
    const q = qRaw.toLowerCase(); let a = "";
    if (/экран|screen|где я|current/.test(q)) a = "Текущий контекст: Control Shell · раздел «" + (NAV.find(([n]) => n === nav)?.[1] || nav) + "». Доступные модули — слева; AI Operator — справа.";
    else if (/runtime gate|gate request|запрос на запуск|пакет активац|разрешение runtime|что готово к runtime|что нельзя запускать|runtime approval|гейт запуск|runtime разрешен|gate builder/.test(q)) { let rg: any = null; try { rg = JSON.parse(localStorage.getItem("deepinside.runtimeGate.requestBuilder.v1") || "null"); } catch {} const ap = (rg?.decisionBoard || []).filter((d: any) => d.finalDecision === "APPROVED_PREVIEW_ONLY").length; const bl = (rg?.gateRequests || []).filter((g: any) => g.requestStatus === "BLOCKED").length; a = "🛂 RUNTIME GATE REQUEST BUILDER v1 (PREVIEW_ONLY): " + (rg?.gateRequests?.length ?? 6) + " запросов (approved preview " + (ap || "—") + ", blocked " + (bl || "—") + "). Собирает пакет активации: persona/identity/device/app stack/content/release/blockers/approvals/scope. Режимы: Gate Requests · Activation Scope · Evidence Packet (" + (rg?.evidencePackets?.length ?? 18) + ") · Approval Checklist (" + (rg?.approvalChecks?.length ?? 12) + ") · Risk Assessment · Decision Board · Runtime Policy Matrix (" + (rg?.runtimePolicyMatrix?.length ?? 14) + " правил). ВАЖНО: APPROVED_PREVIEW_ONLY ничего не запускает — preview approval does not execute/publish/login/install/control. Что нельзя запускать: ADB/RPA/automation/publishing/credentials/spoofing/anti-fraud — всё BLOCKED, нужен отдельный Runtime Gate. Откройте 🛂 Runtime Gate."; }
    else if (/dry.?run|драй.?ран|симуляц.?запуск|runtime simulation|тестов.?прогон|что будет при запуск|план выполнен|failure scenario|сценари.?отказ|rollback|откат.?план|operator handoff|симуляц.?runtime/.test(q)) { let ds: any = null; try { ds = JSON.parse(localStorage.getItem("deepinside.runtimeDryRun.simulator.v1") || "null"); } catch {} const rd = (ds?.simulations || []).filter((x: any) => x.simulationStatus === "READY_PREVIEW_ONLY").length; const cr = (ds?.failureScenarios || []).filter((x: any) => x.severity === "CRITICAL").length; a = "🧪 RUNTIME DRY-RUN SIMULATOR v1 (PREVIEW_ONLY · DRY_RUN_ONLY): " + (ds?.simulations?.length ?? 6) + " симуляций (ready preview " + (rd || "—") + "), шагов " + (ds?.dryRunSteps?.length ?? 72) + ", failure scenarios " + (ds?.failureScenarios?.length ?? 12) + " (critical " + (cr || "—") + "). Режимы: Simulations · Step-by-Step (12 шагов) · Adapter Map (" + (ds?.adapterCapabilityMap?.length ?? 10) + ") · IO Contracts · Failure Lab · Rollback Plan · Operator Handoff · Simulation Report. ВАЖНО: simulation executes nothing — план/риски/rollback/handoff/отчёт без реальных действий; executionEnabledAfterReport=false; реальная активация только через отдельный Runtime Gate. Откройте 🧪 Dry Run."; }
    else if (/runtime|docker|n8n|vps|контейнер|что работает/.test(q)) { let rm: any = null, rh: any = null; try { rm = JSON.parse(localStorage.getItem("epic_runtime_metrics_v1") || "null"); rh = JSON.parse(localStorage.getItem("epic_runtime_health_v1") || "null"); } catch {} a = "Runtime: VPS Online · CPU " + (rm?.cpu ?? 34) + "% · RAM " + (rm?.ramUsedGB ?? 11.2) + "/" + (rm?.ramTotalGB ?? 24) + " GB. Docker: " + (rm?.dockerRunning ?? 8) + "/" + (rm?.dockerTotal ?? 9) + " Running. n8n: " + (rm?.n8nTotal ?? 5) + " workflows. Telegram: " + (rm?.telegramSessions ?? ctx.slots.length) + " сессий. GeeLark online: " + (rm?.devicesOnline ?? 2) + ". Runtime Health " + (rh?.overall ?? 84) + "%."; }
    else if ((/покажи|статус|кто так|profile|профил/.test(q)) && ctx.agents.some((x) => q.includes((x.name || "").toLowerCase().replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ]/g, "")) || q.includes((x.name || "").toLowerCase().split(/\s/)[0]))) { const ag = ctx.agents.find((x) => q.includes((x.name || "").toLowerCase().replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ]/g, "")) || q.includes((x.name || "").toLowerCase().split(/\s/)[0])); const dv = ctx.devices?.find((d: any) => d.id === ag?.deviceId); const mm = ctx.missions.find((x) => x.agentId === ag?.id); a = "🤖 " + ag.name + " — " + ag.role + " · " + ag.state + " · readiness " + (ag.readiness ?? 0) + "%. Цель: " + (ag.currentGoal || ag.goals?.[0]?.title || "—") + ". Миссия: " + (mm?.title || "—") + ". Устройство: " + (dv?.name || "—") + ". Аккаунты: Telegram/TikTok/Instagram/YouTube/+. Память: short " + (ag.shortMem?.length || 0) + " / long " + (ag.longMem?.length || 0) + ". Откройте 🤖 Agent OS → профиль для Brain/Memory/Goals/Tasks/Lifecycle."; }
    else if (/оркестрац|оркерстрац|orchestration|план производств|production planner|release dossier|досье выпуск|asset vault|пакет контента|content package|consent gate|copyright gate/.test(q)) { let or: any = null; try { or = JSON.parse(localStorage.getItem("deepinside.mediaFactory.orchestration.v1") || "null"); } catch {} a = "🎬 Media Factory Orchestration v1 (PREVIEW_ONLY): 7 режимов — Production Planner (11 шагов pipeline) · Asset Vault (" + (or?.assets?.length ?? 12) + " ассетов) · Consent & Copyright Gate (" + (or?.gates?.length ?? 8) + ") · Cost & Render Planner (" + (or?.renderPlans?.length ?? 3) + ") · Content Package Builder (" + (or?.contentPackages?.length ?? 5) + ") · Release Dossier (" + (or?.releaseDossiers?.length ?? 3) + ") · AI Officer (" + (or?.aiOfficerRecommendations?.length ?? 10) + " рекомендаций). Без runtime/API/публикаций. Identity/Voice consent + Music copyright — обязательные гейты. Откройте 🎬 Оркестрация."; }
    else if (/медиазавод|media factory|media canvas|медиа.?полотн|канвас|производствен.?цепочк|конвейер контента/.test(q)) a = "🏭 Медиазавод (Media Factory Canvas v1): бесконечное preview-полотно производственных цепочек — Characters (EVA/BUCH/BUCHIHA) → Avatar/Image/Video/Voice/Music Tools → Stream/Render/Review Gates → Monetization. Режим PREVIEW_ONLY · LOCAL_STORAGE_ONLY: без runtime, сети, API, автоматизации и публикаций. Экспорт JSON/Markdown. Откройте 🏭 Медиазавод.";
    else if (/экосистем|ecosystem|шина|bus|inspector|инспектор|relationship|связ|граф связ|executive dashboard|дашборд владельц|readiness officer|общая готовност|path finder|путь от/.test(q)) { let eb: any = null, ro: any = null; try { eb = JSON.parse(localStorage.getItem("epic_ecosystem_bus_v1") || "null"); ro = JSON.parse(localStorage.getItem("epic_readiness_officer_v1") || "null"); } catch {} const doms = (ro?.domains || []) as [string, number][]; const crit = doms.filter((d) => d[1] < 65).map((d) => d[0]); a = "🧬 ECOSYSTEM BUS: объектов " + (eb?.objects ?? "—") + ", типы — Agents/Twins/Missions/Tasks/Devices/Accounts/Telegram/Media/Publishing/Analytics/Infrastructure/AI Models/Workflows/Services. Общая готовность " + (ro?.overall ?? "—") + "%. " + (crit.length ? "🔴 Блокирует рост: " + crit.join(", ") + ". " : "") + "Модули: 👑 Executive Dashboard · 🔍 Universal Inspector (10 вкладок) · 🔗 Relationship Engine + Smart Path Finder · 🧠 Readiness AI Officer. Откройте 🧬 Ecosystem Bus."; }
    else if (/identity layer|личност.?на карт|аккаунт.?на карт|identity на карт|покажи .*identity|слой личност/.test(q)) { a = "🪪 IDENTITY LAYER в World Engine: включите тумблер 🪪 Identity на карте мира — для каждой сущности (BUCH/BUCHIHA/EVA/NOVA/AI REPORTER/AI NEWSCASTER) появятся узлы Phone · Email · Google · Device · 9 платформ · Content · Revenue со статусами ⚪ Mock · 🟡 Ready · 🔵 Connected · 🟢 Live. Inspector показывает Type/Owner/Status/Linked Entity/Reality Score, Search находит phone/email/google/платформы, Focus Mode подсвечивает цепочку Entity→…→Revenue. Всё mock. Откройте 🌍 World Engine → 🪪 Identity."; }
    else if (/assignment|назначен|операционн.?матриц|кто на каком|какой агент где|device assignment|готовност.?устройств|что блокирует запуск|матрица назначен/.test(q)) { let am: any = null; try { am = JSON.parse(localStorage.getItem("deepinside.operations.assignmentMatrix.v1") || "null"); } catch {} const ready = (am?.assignments || []).filter((x: any) => x.assignmentStatus === "READY_PREVIEW_ONLY").length; const blk = (am?.assignments || []).filter((x: any) => x.assignmentStatus === "BLOCKED").length; a = "🧭 OPERATIONS ASSIGNMENT MATRIX v1 (PREVIEW_ONLY): " + (am?.assignments?.length ?? 6) + " назначений (ready " + (ready || "—") + ", blocked " + (blk || "—") + "). Кто-где: EVA→EVA-CLOUD-ANDROID-01, BUCH→BUCH-OPERATOR-ANDROID-01, BUCHIHA→BUCHIHA-MEDIA-ANDROID-01, REPORTER/NEWSCASTER/NOVA. Режимы: Assignment Dashboard · Persona→Device Matrix · App Bundle Planner · Workload Planner · Manual Operations Board (kanban) · Blocker Aggregator (" + (am?.blockers?.length ?? 12) + ") · Activation Readiness. Что блокирует запуск: ADB/automation/publishing/credentials/consent — всё disabled, нужен manual review + Runtime Gate. Откройте 🧭 Assignments."; }
    else if (/android lab|cloud android|облачн.?андроид|android device lab|устройства агент|android passport|app stack|app.?стек|network profile|сетев.?профил|android cloud|андроид.?лаб|device fleet|парк устройств|fingerprint integ/.test(q)) { let al: any = null; try { al = JSON.parse(localStorage.getItem("deepinside.androidCloud.lab.v1") || "null"); } catch {} a = "🤖 ANDROID CLOUD LAB v1 (PREVIEW_ONLY): " + (al?.devices?.length ?? 6) + " устройств · " + (al?.infrastructurePlans?.length ?? 8) + " infra · " + (al?.appStack?.length ?? 15) + " apps · " + (al?.networkProfiles?.length ?? 6) + " network · " + (al?.complianceGates?.length ?? 12) + " blockers · " + (al?.activationDossiers?.length ?? 6) + " dossiers. Режимы: Device Fleet · Infrastructure Planner · App Stack · Network Profile · Fingerprint Integrity (inventory-only) · Manual Setup · Screen Control Preview · Device Passport · Compliance Gate · Activation Dossier. БЕЗ ADB/RPA/кликов/установки/логинов/секретов/spoofing/обхода антифрода. Только preview + manual + Runtime Gate. Откройте 🤖 Android Lab."; }
    else if (/digital human|цифров.?человек|фабрик.?люд|фабрик.?цифров|persona builder|персона.?билдер|avatar studio|аватар.?студи|voice studio|голос.?студи|digital passport|цифров.?паспорт|жизненн.?цикл сущност|human factory|новая персон|создать сущност/.test(q)) { let df: any = null; try { df = JSON.parse(localStorage.getItem("deepinside.digitalHuman.factory.v1") || "null"); } catch {} a = "🧬 DIGITAL HUMAN FACTORY v1 (PREVIEW_ONLY): " + (df?.personas?.length ?? 6) + " персон · " + (df?.avatars?.length ?? 6) + " avatars · " + (df?.voices?.length ?? 6) + " voices · " + (df?.skills?.length ?? 12) + " skills · " + (df?.passports?.length ?? 6) + " passports. Режимы: Persona Builder · Avatar Studio · Voice Studio · Personality Engine · Memory Designer · Skill Matrix · Role Designer · Human Lifecycle · Persona Templates · Digital Passport. Consent для лица/голоса обязателен; voice clone BLOCKED_BY_DEFAULT; активация только через Runtime Gate. Без генерации/runtime/публикаций. Откройте 🧬 Digital Human Factory."; }
    else if (/личност|identity|аккаунт|account center|почт|email center|телефон|phone center|reality|реальност|что подключен|что отсутству|открыть инфраструктур|reality bridge|цифров.?основ|google workspace|platform matrix|платформ.?матриц|ownership/.test(q)) { let ir: any = null, rb: any = null; try { ir = JSON.parse(localStorage.getItem("identity_registry") || "null"); rb = JSON.parse(localStorage.getItem("reality_bridge") || "null"); } catch {} a = "🪪 IDENTITY INFRASTRUCTURE (фундамент личностей, MOCK only): " + (ir?.entities?.length ?? 6) + " сущностей. Reality Score (avg): " + (rb?.realityAvg ?? "—") + "%. Live активов: " + (rb?.liveAssets ?? "—") + " · Connected: " + (rb?.connAssets ?? "—") + ". Разделы: Identity Registry · Account Center · Phone Center · Email Center · Google Workspace · Platform Matrix · Device Binding · Ownership Center · Identity Graph · Reality Bridge. Все номера/email/Google — mock, без OAuth и реальных API. AI COO: Identity/Account Audit · Reality Report · Infrastructure Gaps. Откройте 🪪 Identity Infra → Reality Bridge."; }
    else if (/запуск|launch|go.?no.?go|война.?комнат|war.?room|военн.?комнат|инцидент|incident|тест.?центр|тесты|проверк|аудит|audit|релиз|release control|launch readiness|готовност.?к запуск|сценари|scenario/.test(q)) { let oc: any = null, wr: any = null; try { oc = JSON.parse(localStorage.getItem("operations_center") || "null"); wr = JSON.parse(localStorage.getItem("war_room") || "null"); } catch {} a = "🖥 OPERATIONS CENTER (Launch Readiness): общая готовность к запуску " + (oc?.overall ?? wr?.overall ?? "—") + "%. Решение AI COO: " + (oc?.goNoGo || wr?.goNoGo || "—") + ". Открытых инцидентов: " + (oc?.openIncidents ?? "—") + ", критических рисков: " + (wr?.criticalRisks ?? "—") + ". Разделы: Launch Readiness · System Health · Test Center · Scenario Simulator · Incident Center · Monitoring · Launch Checklist · Audit Center · Release Control · War Room. Все тесты/проверки — симуляции. Откройте 🖥 Operations Center → War Room для Go/No-Go."; }
    else if (/готовност|активац|что готов|что не готов|readiness|activation|открыть активац|открой активац|показать готовн|gate|гейт|запуск.?готов/.test(q)) { let ae: any = null, rc: any = null; try { ae = JSON.parse(localStorage.getItem("activation_engine_v1") || "null"); rc = JSON.parse(localStorage.getItem("readiness_center_v1") || "null"); } catch {} const doms = (ae?.domains || []) as [string, number][]; const ready = doms.filter((d) => d[1] >= 80).map((d) => d[0]); const block = doms.filter((d) => d[1] < 55).map((d) => d[0]); a = "🚀 ACTIVATION ENGINE: общая готовность экосистемы " + (ae?.totalReadiness ?? "—") + "%. Готово: " + (ready.join(", ") || "—") + ". Блокирует запуск: " + (block.join(", ") || "Android Device offline · ComfyUI") + ". Agents " + (rc?.agentsReady ?? "—") + "/6 · Platforms " + (rc?.platReady ?? "—") + "/9 · Devices " + (rc?.devReady ?? "—") + "/6 · Revenue " + (rc?.revReady ?? "—") + "/7 · Infra " + (rc?.infraReady ?? "—") + "/12. Activation Gates: Identity→Device→Platform→Content→Audience→Revenue→ACTIVE. Разделы: Readiness/Agent/Device/Platform/Content/Broadcast/Revenue/Infrastructure/AI/Analytics. Откройте 🚀 Activation Engine."; }
    else if (/автоматизац|automation|workflow|воркфлоу|процесс|очеред|trigger|триггер|task queue|process graph|approval pipeline|fabric|нервная систем|открыть автоматизац|открыть очеред|показать workflow/.test(q)) { let af: any = null, ah: any = null; try { af = JSON.parse(localStorage.getItem("automation_fabric") || "null"); ah = JSON.parse(localStorage.getItem("automation_health") || "null"); } catch {} a = "⚡ AUTOMATION FABRIC (нервная система): workflow " + (af?.workflows ?? 9) + ", running " + (af?.running ?? 4) + ", success " + (af?.successRate ?? "—") + "%, health " + (af?.health || ah?.health || "—") + ". Queued: " + (ah?.queued ?? "—") + " · Failed: " + (ah?.failed ?? "—") + " · Top: " + (ah?.topWorkflow || "—") + ". Разделы: Workflow Center · Trigger Engine (10 типов) · Task Queue · Process Graph · Approval Pipeline · Automation Library · Analytics · Execution Timeline · Agent/System Workflows · n8n Layer (UI-only) · Dependency/Fabric Map. AI COO: Automation Report + Bottleneck/Optimization. Откройте ⚡ Automation Fabric."; }
    else if (/знани|knowledge|база знани|найти решен|найти промт|prompt librar|библиотек.?промт|playbook|плейбук|lessons|урок|decision log|журнал решен|исследован|research center|открыть вики|открыть память|организационн.?памят|граф знани/.test(q)) { let ke: any = null, dl: any = null; try { ke = JSON.parse(localStorage.getItem("knowledge_engine") || "null"); dl = JSON.parse(localStorage.getItem("decision_log") || "null"); } catch {} a = "📚 KNOWLEDGE ENGINE (организационная память): " + (ke?.items ?? "—") + " записей. Разделы: Knowledge Base (10 категорий) · Research Center · Decision Log (" + ((dl?.decisions || []).length || 4) + " решений) · Lessons Learned · Playbooks · Prompt Library · Project Wiki · Meeting Notes · Knowledge Graph · Memory Timeline. AI COO: Knowledge Summary · Decision/Lessons Review · Playbook Suggestions. Глобальный поиск по знаниям/решениям/промтам. Откройте 📚 Knowledge Engine."; }
    else if (/стратег|strategy|дорожн.?карт|roadmap|приоритет|priorit|\bokr\b|key result|portfolio|портфел|что делать дальше|следующий шаг|risk center|risk report|дорожная карта|открыть стратег|открыть roadmap|план развит|стратегическ/.test(q)) { let mc: any = null, sp: any = null, rc: any = null; try { mc = JSON.parse(localStorage.getItem("mission_control_v1") || "null"); sp = JSON.parse(localStorage.getItem("strategic_planner_v1") || "null"); rc = JSON.parse(localStorage.getItem("risk_center_v1") || "null"); } catch {} const high = (rc?.risks || []).filter((r: any) => r.severity === "High").length; a = "🎯 MISSION CONTROL (STRATEGY): миссий " + (mc?.missions ?? 7) + " (running " + (mc?.running ?? 2) + ", blocked " + (mc?.blocked ?? 1) + "), средний прогресс " + (sp?.avgProgress ?? "—") + "%, готовность экосистемы " + (sp?.totalReadiness ?? "—") + "%. Сейчас (P0): Radio v1 + EVA activation. Блок: device fleet. High-рисков: " + high + ". Разделы: Mission Board · Strategic Planner · Roadmap (Q1-Q4) · OKR · Project Portfolio · Priority Matrix · Dependency Graph · Risk Center · Resource Planner · Executive Briefing. AI COO Strategic Report внутри. Откройте 🎯 Mission Control."; }
    else if (/ecosystem v1|ecosystem complete|экосистем.?complete|storyverse|стори.?верс|mediaverse|медиа.?верс|knowledgeverse|social universe|audience engine|аудитор.?движок|campaign engine|кампани.?движок|digital twin center|ceo view|ceo режим|ecosystem map|карта экосистем|единая вселенн|финализац|готовность проекта|весь проект/.test(q)) { let ec: any = null; try { ec = JSON.parse(localStorage.getItem("deepinside.ecosystem.v1.complete") || "null"); } catch {} a = "🌠 DEEPINSIDE ECOSYSTEM v1.0 COMPLETE (единая цифровая вселенная · PREVIEW_ONLY): готовность проекта " + (ec?.overall ?? "—") + "%, сущностей " + (ec?.entities ?? 6) + ", 8 верс. Объединяет: Platform OS · World Engine · StoryVerse · MediaVerse · Social Universe · Audience Engine · Campaign Engine · KnowledgeVerse · Digital Twin Center в единое бесконечное полотно (Ecosystem Map). + 👑 CEO View (готовность по всем слоям, риски, стоимость, этапы). У каждой сущности — персональная рабочая область с историей/контентом/связями/активами/знаниями/платформами/инфраструктурой/аудиторией/двойником на отдельном полотне. Откройте 🌠 Ecosystem v1.0."; }
    else if (/world universe|world engine v1|виртуальн.?вселенн|виртуальн.?мир|digital human city|город цифров|world relationship graph|граф мира|world readiness|районы мира|districts мира|virtual broadcast|broadcast center|asset library|world timeline|вселенн.?deepinside/.test(q)) { let wc: any = null; try { wc = JSON.parse(localStorage.getItem("deepinside.worldEngine.center.v1") || "null"); } catch {} a = "🌌 DEEPINSIDE WORLD ENGINE v1.0 (виртуальная вселенная · PREVIEW_ONLY): готовность мира " + (wc?.completion ?? "—") + "%, районов " + (wc?.districts ?? 10) + ", цифровых сущностей " + (wc?.humans ?? 8) + ". Разделы: World Overview · World Map (районы) · 🕸 Relationship Graph (главное бесконечное полотно) · 🧬 Digital Human City (у каждой сущности — своё полотно связей) · Locations · Districts · Virtual Broadcast (7 студий) · Buildings · Media Zones · NPC Registry · Timeline · Asset Library · Scene Graph · World Readiness. Не игра, не runtime, без Unreal/Unity — только цифровая модель. Откройте 🌌 World Universe."; }
    else if (/открыть мир|открой мир|world engine|world map|карт.?мир|мир engine|цифров.?двойник|digital twin universe|command center|командный центр|показать связи|показать платформ|показать устройств|world snapshot|покажи мир|покажи карту|показать экосистем/.test(q)) { let we: any = null, ed: any = null; try { we = JSON.parse(localStorage.getItem("world_engine_v1") || "null"); ed = JSON.parse(localStorage.getItem("executive_dashboard_v1") || "null"); } catch {} a = "🌍 WORLD ENGINE (CORE · CRITICAL): глобальная карта экосистемы — " + (we?.nodes ?? "—") + " узлов / " + (we?.edges ?? "—") + " связей в слоях Agents/Platforms/Media/Economy/Devices/Infrastructure. Цифровые двойники: BUCH ☠️ · BUCHIHA 😇 · EVA 💠 · NOVA 🎧 (12 фасетов: Identity/Memory/Goals/Knowledge/Platforms/Audience/Content/Revenue/Assets/Schedule/Projects/Relationships). Command Center: активов " + (ed?.totalAssets ?? 4) + ", доход " + (ed?.totalRevenue ? "$" + ed.totalRevenue.toLocaleString() : "—") + "/мес, аудитория " + (ed?.totalAudience ? (ed.totalAudience / 1000).toFixed(0) + "k" : "—") + ", топ-агент " + (ed?.topAgent || "EVA") + ". AI COO + Relationship Engine + World Timeline. Откройте 🌍 World Engine."; }
    else if (/доход|revenue|эконом|economy|монетизац|monetiz|рейтинг актив|asset ranking|лучших агент|стоимост актив|asset value|valuation|спонсор|sponsor|роялти|royalt|покажи доход|покажи рейтинг|открыть активы|открыть экономик/.test(q)) { let ee: any = null, ar: any = null; try { ee = JSON.parse(localStorage.getItem("economy_engine_v1") || "null"); ar = JSON.parse(localStorage.getItem("asset_ranking_v1") || "null"); } catch {} a = "💰 ECONOMY ENGINE: общая стоимость активов " + (ee?.totalValue ? "$" + ee.totalValue.toLocaleString() : "—") + ", месячный доход " + (ee?.totalRevenue ? "$" + ee.totalRevenue.toLocaleString() : "—") + ". Топ-актив: " + (ee?.topAsset || "—") + ". Рейтинг: " + ((ar?.ranking || []).slice(0, 3).join(" > ") || "—") + ". Разделы: Asset Portfolio · Revenue · Monetization · Sponsors · Affiliate · Merch · Music/Radio/Content Revenue · ROI · Ranking · World Economy Map. Каждая AI-сущность — отдельный цифровой актив. Откройте 💰 Economy Engine."; }
    else if (/platform os|deepinside os|deepinside platform|command graph|команд.?граф|os map|карта os|платформ.?os|platform intelligence|интеллект платформ|карта платформ|карта экосистемы os/.test(q)) { let po: any = null; try { po = JSON.parse(localStorage.getItem("deepinside.platformOS.v1") || "null"); } catch {} a = "🪐 DEEPINSIDE PLATFORM OS v1.0 (PREVIEW_ONLY · READ_ONLY · SANDBOX): единая ОС управления цифровыми сущностями. Общая готовность " + (po?.overall ?? "—") + "%. Центры: 🪐 OS Map · 🕸 Command Graph (бесконечное полотно) · 👑 Executive Dashboard · 🌐 Platform Intelligence (" + (po?.platforms ?? 20) + " платформ) · 🏗 Infrastructure (" + (po?.infra ?? 10) + ") · 🤖 Agent Runtime Blueprints · 🎬 Media Factory · 🧬 Digital Human Center. Слои: Agents/Infrastructure/Platforms/Media/Identity/Digital Humans/Governance/Approvals/Operations/Runtime Blueprints. Без runtime/API/credentials/automation/publishing. Откройте 🪐 Platform OS."; }
    else if (/agent os|агент.?ос|двойник|digital twin|twin center|жизненн.?цикл|lifecycle|mission control|mission board|миссион|операционн.?систем/.test(q)) { const act = ctx.missions.filter((x: any) => ["ACTIVE", "RUNNING", "WAITING_APPROVAL"].includes(x.status)).length; a = "🤖 AGENT OS: " + ctx.agents.length + " AI-сущностей, профиль каждого — Identity/Brain/Memory/Knowledge/Goals/Tasks/Accounts/Devices/Voice/Face/Media/Publishing/Analytics/History/Lifecycle. 👤 Digital Twin Center — двойники + граф связей. 🎯 Mission Control — board (Planned→Ready→Running→Review→Completed), активных миссий " + act + ". Откройте 🤖 Agent OS."; }
    else if (/статус|health|систем|готов|readiness/.test(q)) a = "System Readiness " + overall + "%. " + readiness.map(([l, v]) => l + " " + v + "%").join(" · ");
    else if (/агент|agent/.test(q)) a = "Агентов " + ctx.agents.length + ", активных " + ctx.agents.filter((x) => x.state === "ACTIVE").length + ": " + ctx.agents.filter((x) => x.state === "ACTIVE").map((x) => x.name).join(", ") + ".";
    else if (/telegram|телеграм/.test(q)) a = "Telegram: sessions " + ctx.slots.length + ", dialogs " + (tgIdx?.dialogs?.length || 0) + ", channels " + (tgIdx?.channels?.length || 0) + ", groups " + (tgIdx?.groups?.length || 0) + ".";
    else if (/provision|готов|установлен|approval|апрув/.test(q)) { let pr: any = null, aq: any = []; try { pr = JSON.parse(localStorage.getItem("epic_device_provisioning_v1") || "null"); aq = JSON.parse(localStorage.getItem("epic_device_approval_queue_v1") || "[]"); } catch {} const inst = pr?.apps ? Object.values(pr.apps).flatMap((m: any) => Object.entries(m).filter(([, v]) => v === "installed").map(([k]) => k)) : []; const pend = (aq || []).filter((x: any) => x.status === "pending").length; a = "Provisioning: устройство " + (pr?.device || "—") + ", режим " + (pr?.mode || "—") + ". Установлено приложений: " + inst.length + " (" + inst.slice(0, 5).join(", ") + "). Ожидают approval: " + pend + ". Готовых устройств online: " + (devIdx?.devices?.filter((d: any) => d.status === "online").length || 0) + "."; }
    else if (/устройств|device|geelark|phone/.test(q)) a = "Устройства: " + (devIdx?.devices?.length || 0) + ", offline " + (devIdx?.devices?.filter((d: any) => d.status === "offline").length || 0) + ". Подробнее — Device Control Center / Provisioning.";
    else if (/tools|инструмент/.test(q)) a = "Доступные инструменты: " + TOOLS.join(", ") + ".";
    else if (/радио|эфир|что играет|музык|плейлист|станц|студи|радиостанц|муз.?завод/.test(q)) { let mn: any = null, rd: any = null; try { mn = JSON.parse(localStorage.getItem("epic_media_network_v1") || "null"); rd = JSON.parse(localStorage.getItem("epic_radio_v1") || "null"); } catch {} a = "📻 DEEP INSIDE MEDIA: в эфире «" + (rd?.station || "DEEP INSIDE FM") + "» · шоу " + (rd?.onAir || "BUCH SHOW") + " · ведущий " + (rd?.host || "BUCH ☠️") + ". Сейчас играет: " + (mn?.nowPlaying?.track || "Neon Pulse") + " — " + (mn?.nowPlaying?.artist || "AI DJ NOVA") + ". Откройте 🎙 Media Network для радио/муззавода/студии/новостей."; }
    else if (/новост|newsroom/.test(q)) { let nr: any = null; try { nr = JSON.parse(localStorage.getItem("epic_newsroom_v1") || "null"); } catch {} a = "📰 Newsroom: в очереди " + (nr?.queue ?? 5) + " новостей (WORLD/UKRAINE/AI/TECH/…). Готовы к эфиру — в разделе Newsroom."; }
    else if (/социальн|social empire|pinterest|платформ|подписчик|аудитори|рост|монетизац|империя/.test(q)) a = "🌍 Social Empire: 4 сущности (BUCH/BUCHIHA/EVA/NOVA) на 10 платформах (Telegram/TikTok/Instagram/YouTube/Facebook/X/Pinterest/LinkedIn/Threads/Website). Разделы: Digital Identities · Platform Matrix · Audience Intelligence · Content Planner · Growth Engine · Monetization · Creator Ranking · Pinterest. Откройте 🌍 Social Empire.";
    else if (/реклам|скетч|мем|интеграц|кампани|спонсор|commercial/.test(q)) { let af: any = null; try { af = JSON.parse(localStorage.getItem("epic_ad_factory_v1") || "null"); } catch {} a = "📢 Advertising Factory: " + (af?.sketches ?? 5) + " вирусных скетчей, " + (af?.sponsors ?? 3) + " спонсоров. Реклама как контент (BUCH/BUCHIHA/EVA). Откройте 📢 Advertising Factory: скетчи, мемы, нативные интеграции, story-кампании, AI Commercial Studio."; }
    else if (/что дальше|next|действ|рекоменд/.test(q)) a = "Рекомендации: " + recs.slice(0, 3).join(" · ");
    else a = "Я анализирую систему по локальным данным. Спросите: «статус системы», «объясни экран», «какие агенты активны», «статус Telegram», «устройства», «что дальше».";
    setChats((cs) => cs.map((c) => c.id === active ? { ...c, title: c.messages.length <= 1 ? qRaw.slice(0, 28) : c.title, messages: [...c.messages, { who: "you", text: qRaw }, { who: "ai", text: a }], updatedAt: new Date().toISOString() } : c));
  }
  function send() { if (!input.trim()) return; if (!cur) newChat(); answer(input.trim()); setInput(""); }

  const Card = ({ children, t }: any) => <div className="rounded-xl border border-[rgba(255,255,255,.08)] bg-[rgba(255,255,255,.03)] p-3">{t && <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>;

  function Center() {
    if (nav === "context") return <div className="space-y-3">
      <Card t="🧠 Context Engine · Inspector"><div className="text-sm">Пользователь сейчас: <b className="text-cyan-300">{sys.screen}</b></div>
        <div className="mt-2 grid gap-1 text-[12px] text-tg-muted sm:grid-cols-2">{([["Current Workspace", sys.workspace], ["Current Project", sys.project], ["Current Agent", sys.agent], ["Telegram Session", sys.session], ["Current Device", sys.device], ["Current Mission", sys.mission], ["Media Project", sys.mediaProject], ["View Mode", sys.viewMode], ["User", sys.user]] as const).map(([l, v]) => <div key={l}>{l}: <b className="text-tg-text">{v}</b></div>)}</div></Card>
      <Card t="Context Timeline"><div className="space-y-0.5 text-[12px]">{(getTimeline().length ? getTimeline() : [{ t: "—", action: "Open EPIC OS" }]).slice(0, 12).map((e, i) => <div key={i} className="flex gap-2"><span className="text-tg-muted">{e.t}</span><span>{e.action}</span></div>)}</div></Card></div>;
    if (nav === "knowledgevault") return <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">{KSECTIONS.map((s) => <Card key={s}><div className="text-[11px] font-semibold">{s}</div><div className="text-[10px] text-tg-muted">{KVAULT.filter((k) => k.type.startsWith(s.slice(0, 4))).length || "—"} items</div></Card>)}</div>
      <Card t="📚 Knowledge Vault"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Title", "Type", "Status", "Tags", "Links"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{KVAULT.map((k) => <tr key={k.title} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{k.title}</td><td className="px-2 text-tg-muted">{k.type}</td><td className="px-2">{k.status}</td><td className="px-2 text-tg-muted">{k.tags.join(", ")}</td><td className="px-2 text-cyan-300">{k.links.join(", ")}</td></tr>)}</tbody></table></Card>
      <Card t="AI Knowledge Assistant"><div className="grid gap-2 text-[12px] text-tg-muted sm:grid-cols-2"><div>✓ Что известно: {KVAULT.length} объектов, связи Project↔Agent↔Mission↔Infra↔Media.</div><div>⚠ Чего не хватает: документация по Publishing, отчёты по Devices.</div><div>🔗 Связанные: EVA · TikTok Growth · VPS · EVA Shorts.</div><div>💡 Рекомендация: связать Weekly Report с активной миссией.</div></div></Card></div>;
    if (nav === "automationcenter") return <div className="space-y-3">
      <div className="flex flex-wrap gap-1 text-[11px]">{["Overview", "Flows", "Templates", "Executions", "Analytics", "Logs", "Graph"].map((x) => <span key={x} className="rounded-full bg-tg-bg px-2 py-1 text-tg-muted">{x}</span>)}</div>
      <Card t="⚙ Flow Registry"><div className="space-y-1">{FLOWS.map((f) => <div key={f.name} className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full" style={{ background: FSTATUS[f.status] }} /><span className="flex-1">{f.name}</span><span className="text-[11px]" style={{ color: FSTATUS[f.status] }}>{f.status}</span></div>)}</div></Card>
      <Card t="Node Types (n8n / Flowise style)"><div className="flex flex-wrap gap-1 text-[10px]">{AUTO_NODES.map((n) => <span key={n} className="rounded-full bg-tg-bg px-2 py-0.5 text-tg-muted">{n}</span>)}</div></Card>
      <Card t="Automation Graph"><svg width="100%" height="160" viewBox="0 0 900 160">{["Schedule", "Agent", "AI Model", "Media Factory", "Publishing"].map((n, i) => <g key={n}>{i < 4 && <line x1={60 + i * 200 + 70} y1={80} x2={60 + (i + 1) * 200} y2={80} stroke="rgba(132,204,22,.4)" strokeWidth={2} />}<rect x={60 + i * 200} y={60} width={140} height={40} rx={8} fill="rgba(0,20,0,.4)" stroke="#84cc16" /><text x={60 + i * 200 + 12} y={85} fill="#a3e635" fontSize="12">{n}</text></g>)}</svg></Card></div>;
    if (nav === "voice") return <div className="space-y-3">
      <Card t="🎙 Voice Operator (UI mock · no mic · no STT)"><div className="flex flex-wrap gap-2">{["Push To Talk", "Always Listen", "Wake Word"].map((m) => <span key={m} className="rounded-full bg-tg-bg px-3 py-1 text-[11px] text-tg-muted">{m}</span>)}</div>
        <div className="mt-2 text-sm">Wake Word: <b className="text-cyan-300">EPIC</b></div>
        <div className="mt-2 flex gap-1.5"><button onClick={() => setVoice(true)} className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-[11px] text-emerald-300">Start Voice</button><button onClick={() => setVoice(false)} className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">Stop</button><button onClick={() => setMuted((m) => !m)} className="rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">{muted ? "Unmute" : "Mute"}</button></div></Card>
      <Card t="Example Commands"><div className="space-y-1 text-[12px] text-tg-muted">{VOICE_CMDS.map((c) => <div key={c}>• {c}</div>)}</div></Card>
      <Card t="Transcript (mock)"><div className="rounded bg-tg-bg/50 p-2 text-[12px] text-tg-muted">{voice ? (muted ? "🔇 muted" : "«EPIC покажи EVA» → открываю агента EVA…") : "voice off · нажмите Start Voice"}</div><div className="mt-1 text-[10px] text-tg-muted">Микрофон/STT/внешние API не подключены — только UI.</div></Card></div>;
    if (nav === "executive") return <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">{([["Agents Online", ctx.agents.filter((x) => x.state === "ACTIVE").length], ["Devices Online", (devIdx?.devices || []).filter((d: any) => d.status === "online").length], ["TG Sessions", ctx.slots.length], ["Active Missions", ctx.missions.filter((m) => ["ACTIVE", "WAITING_APPROVAL", "PLANNING"].includes(m.status)).length], ["Projects", PROJECTS.length], ["Render Queue", mediaIdx?.kpi?.videos || 3], ["Publishing", 5], ["Infra Health", "95%"], ["AI Health", "100%"], ["Warnings", 2], ["Monthly $", monthly], ["Est. Revenue", "$3.2k"]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-black text-cyan-300">{v}</div></Card>)}</div>
      <div className="grid gap-2 lg:grid-cols-3">{[["System Health", osOverall + "%"], ["Mission Status", ctx.missions.length + " missions"], ["Publishing", "Review pending"], ["Media Factory", "active"], ["Device Status", (devIdx?.devices?.length || 0) + " devices"], ["AI Services", "100%"]].map(([l, v]) => <Card key={l} t={l}><div className="text-sm text-tg-muted">{v}</div></Card>)}</div></div>;
    if (nav === "ceo") return <div className="space-y-3">
      <div className="flex gap-2">{["Executive", "Business", "Technical", "Operations"].map((m) => <span key={m} className="rounded-full bg-tg-bg px-3 py-1 text-[11px] text-tg-muted">{m}</span>)}</div>
      <div className="grid gap-2 lg:grid-cols-2">
        <Card t="Today's Focus"><div className="text-sm text-tg-muted">Readiness {osOverall}% · добить Publishing и Digital Twins, закрыть offline-устройства.</div></Card>
        <Card t="Current Priorities"><div className="space-y-1 text-[12px] text-tg-muted">{recs.slice(0, 4).map((r, i) => <div key={i}>• {r}</div>)}</div></Card>
        <Card t="System Risks"><div className="space-y-1 text-[12px] text-tg-muted"><div>• API Status warning (часть провайдеров Needs API)</div><div>• Health Ping automation: error</div></div></Card>
        <Card t="Resource Usage"><div className="text-[12px] text-tg-muted">Monthly ${monthly} · GPU RunPod · Docker {7} containers</div></Card>
        <Card t="Unused Assets"><div className="text-[12px] text-tg-muted">PHONE-04 (reserve), PRX-SPARE proxy</div></Card>
        <Card t="Critical Alerts"><div className="text-[12px] text-tg-muted">Критических нет. Предупреждений: 2.</div></Card>
      </div></div>;
    if (nav === "finance") return <div className="space-y-3">
      <div className="flex flex-wrap gap-4"><Card t="Monthly"><div className="text-2xl font-black text-cyan-300">${monthly}</div></Card><Card t="Annual"><div className="text-2xl font-black text-white">${monthly * 12}</div></Card><Card t="Budget"><div className="text-2xl font-black text-white">≈ $1200</div></Card></div>
      <Card t="Cost by Category"><div className="space-y-1.5">{FINANCE.categories.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-32 text-tg-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: Math.round(v / monthly * 100) + "%" }} /></div><span className="w-12 text-right font-bold">${v}</span></div>)}</div></Card></div>;
    if (nav === "knowledge") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{KNOWLEDGE.map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-black text-cyan-300">{v}</div></Card>)}</div>;
    if (nav === "automation") return <Card t="Automation Center"><div className="space-y-1">{AUTOMATION.map((a) => <div key={a.n} className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full" style={{ background: MSTATUS[a.s] }} /><span className="flex-1">{a.n}</span><span className="text-[11px]" style={{ color: MSTATUS[a.s] }}>{a.s}</span></div>)}</div></Card>;
    if (nav === "security") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{SECURITY.map(([l, s]) => <Card key={l}><div className="flex items-center gap-1.5 font-semibold">{l}<span className="h-2 w-2 rounded-full" style={{ background: MSTATUS[s] }} /></div><div className="text-[11px]" style={{ color: MSTATUS[s] }}>{s}</div></Card>)}</div>;
    if (nav === "integrations") return <Card t="API Integration Hub (masked · no secrets)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Provider", "Status", "Environment", "Last Check", "Version"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{INTEGRATIONS.map((i) => <tr key={i.p} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{i.p}</td><td className="px-2"><span style={{ color: MSTATUS[i.s] }}>{i.s}</span></td><td className="px-2">{i.env}</td><td className="px-2 text-tg-muted">{i.last}</td><td className="px-2 text-tg-muted">{i.ver}</td></tr>)}</tbody></table></Card>;
    if (nav === "twins") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{TWINS.map((tw) => <Card key={tw} t={tw}><div className="grid grid-cols-2 gap-1 text-[10px] text-tg-muted">{["Identity", "Voice", "Memory", "Personality", "Devices", "Accounts", "Projects", "Missions", "Knowledge", "Content", "Media"].map((x) => <span key={x} className="rounded bg-tg-bg/50 px-1.5 py-1">{x}</span>)}</div></Card>)}</div>;
    if (nav === "datacenter") return <Card t="Data Center"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Source", "Size", "Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{DATACENTER.map(([s, sz, st]) => <tr key={s} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{s}</td><td className="px-2">{sz}</td><td className="px-2 text-emerald-300">{st}</td></tr>)}</tbody></table></Card>;
    if (nav === "readiness") return <div className="space-y-3"><Card t={"Readiness Matrix · System Readiness " + osOverall + "%"}><div className="space-y-1.5">{osReadiness.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-28 text-tg-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: v >= 80 ? "#4ade80" : v >= 50 ? "#fbbf24" : "#f87171" }} /></div><span className="w-10 text-right font-bold">{v}%</span></div>)}</div></Card></div>;
    if (nav === "projects") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{PROJECTS.map((p) => <div key={p} className="rounded-xl border border-tg-line bg-tg-bg/40 p-4"><div className="font-bold">{p}</div><div className="text-[11px] text-tg-muted">project</div></div>)}</div>;
    if (nav === "apps") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{MODULES.map(([t, l]) => <button key={t} onClick={() => onAction?.(t)} className="rounded-xl border border-tg-line bg-tg-bg/40 p-4 text-left font-semibold hover:border-tg-accent/60">{l}</button>)}</div>;
    if (nav === "models") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{MODELS.map((m) => <div key={m.name} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: MSTATUS[m.status] }} />{m.name}</div><div className="mt-0.5 text-[11px]" style={{ color: MSTATUS[m.status] }}>{m.status}</div></div>)}</div>;
    if (nav === "history") return <div className="space-y-1">{chats.map((c) => <button key={c.id} onClick={() => { setActive(c.id); setNav("new"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/50"><span>💬</span><span className="flex-1 truncate">{c.title}</span><span className="text-[10px] text-tg-muted">{c.type}</span></button>)}</div>;
    if (nav === "search") return <div className="text-tg-muted">Поиск по чатам, модулям и проектам — введите запрос слева в поле чата или используйте ⌘K в модулях.</div>;
    if (["library", "scheduled", "images", "videos", "artifacts", "files"].includes(nav)) return <div className="text-tg-muted">Раздел «{NAV.find(([n]) => n === nav)?.[1]}» — заглушка UI. Контент берётся из Media Operations / Artifacts (localStorage), без внешних запросов.</div>;
    if (nav === "settings") return <div className="space-y-3">
      <Card t={tr("Appearance & Language")}>
        <div className="space-y-2 text-sm">
          <div><div className="mb-1 text-[11px] text-tg-muted">{tr("Language")}</div><div className="flex gap-1">{LANGS.map(([id, label]) => <button key={id} onClick={() => changeLang(id)} className={`rounded-lg px-3 py-1.5 text-xs ${lang === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted ring-1 ring-tg-line"}`}>{label}</button>)}</div></div>
          <div><div className="mb-1 text-[11px] text-tg-muted">{tr("Theme")}</div><div className="flex flex-wrap gap-1">{THEMES.map(([id, label]) => <button key={id} onClick={() => changeTheme(id)} className={`rounded-lg px-3 py-1.5 text-xs ${theme === id ? "bg-fuchsia-600 text-white" : "bg-tg-bg text-tg-muted ring-1 ring-tg-line"}`}>{id === "matrix" ? "🟢 " + label : label}</button>)}</div></div>
          <div className="flex flex-wrap gap-2 pt-1">
            {([["reduceAnim", tr("Reduce Animations")], ["highContrast", tr("High Contrast")], ["largeText", tr("Large Text")], ["matrixEffects", "Matrix Effects"]] as const).map(([k, label]) => { const on = (getPrefs() as any)[k]; return <button key={k} onClick={() => { setPrefs({ [k]: !on } as any); setThemeState((x) => x); setLangState((x) => x); }} className={`rounded-lg px-3 py-1.5 text-[11px] ring-1 ring-tg-line ${on ? "bg-emerald-600/20 text-emerald-300" : "bg-tg-bg text-tg-muted"}`}>{label}: {on ? "on" : "off"}</button>; })}
            <button onClick={() => { const d = setPrefs({ language: "ru", theme: "dark", reduceAnim: false, highContrast: false, largeText: false, matrixEffects: true }); setLangState(d.language); setThemeState(d.theme); }} className="rounded-lg border border-rose-500/40 bg-rose-600/15 px-3 py-1.5 text-[11px] text-rose-200">{tr("Reset Preferences")}</button>
          </div>
          <div className="text-[10px] text-tg-muted">System theme detected: {typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"}. Настройки в localStorage epic_preferences_v1, без секретов.</div>
        </div>
      </Card>
      <Card t="Safe API Vault (UI-only · masked · no real keys)">
        <table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Provider", "Name", "Status", "Environment", "Masked Key", "Last Updated"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
          <tbody>{VAULT.map((v) => <tr key={v.name} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{v.provider}</td><td className="px-2 text-tg-muted">{v.name}</td><td className="px-2"><span style={{ color: MSTATUS[v.status] }}>{v.status}</span></td><td className="px-2">{v.env}</td><td className="px-2 font-mono text-tg-muted">{v.masked}</td><td className="px-2 text-tg-muted">{v.updated}</td></tr>)}</tbody></table>
        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-300">⚠ Реальные ключи не вводятся и не хранятся в браузере. Подключение API — только backend-side. Значения замаскированы.</div>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card t="Voice Mode (mock)"><div className="flex gap-1.5"><button onClick={() => setVoice(true)} className="rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-[11px] text-emerald-300">Start Voice</button><button onClick={() => setVoice(false)} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-[11px] ring-1 ring-tg-line">Stop</button><button onClick={() => setMuted((m) => !m)} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-[11px] ring-1 ring-tg-line">{muted ? "Unmute" : "Mute"}</button></div>
          <div className="mt-2 rounded-lg bg-tg-bg/50 p-2 text-[11px] text-tg-muted">Transcript (mock): {voice ? (muted ? "🔇 muted…" : "«покажи статус системы» …") : "voice off"}</div>
          <div className="mt-1 text-[10px] text-tg-muted">Микрофон не подключён — UI-режим, без реального захвата.</div></Card>
        <Card t="Screen View (mock)"><div className="flex gap-1.5"><button onClick={() => setScreen(true)} className="rounded-lg bg-cyan-600/20 px-2.5 py-1.5 text-[11px] text-cyan-300">Enable</button><button onClick={() => setScreen(false)} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-[11px] ring-1 ring-tg-line">Disable</button></div>
          <div className="mt-2 text-[11px] text-tg-muted">Current Screen Context: Control Shell · «{NAV.find(([n]) => n === nav)?.[1]}»</div>
          <div className="mt-1 flex h-20 items-center justify-center rounded-lg border border-dashed border-tg-line text-[11px] text-tg-muted">{screen ? "🖵 screenshot placeholder" : "screen view off"}</div>
          <div className="mt-1 text-[10px] text-tg-muted">Реальный захват экрана не подключён — UI-режим.</div></Card>
      </div>
      <Card t="State Memory"><div className="text-[11px] text-tg-muted">epic_shell_state_v1 · epic_chat_history_v1 · epic_api_vault_ui_v1 · epic_voice_ui_v1 · epic_screen_view_ui_v1. Секреты не хранятся.</div></Card>
    </div>;
    // chat workspace (new / default)
    return (
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-auto p-1">
          {(cur?.messages || []).map((m: any, i: number) => (
            <div key={i} className={`flex ${m.who === "you" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.who === "you" ? "bg-[#2b5278]" : "bg-[rgba(177,77,255,.14)]"}`}>{m.text}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="mt-2">
          <div className="mb-1.5 flex flex-wrap gap-1">{["Статус системы", "Объясни экран", "Какие агенты активны?", "Статус Telegram", "Что дальше?"].map((s) => <button key={s} onClick={() => answer(s)} className="rounded-full bg-tg-bg px-2.5 py-1 text-[11px] text-tg-muted hover:text-white">{s}</button>)}</div>
          <div className="flex items-center gap-2 rounded-2xl border border-tg-line bg-tg-bg/60 px-3 py-2">
            <button onClick={() => setVoice((v) => !v)} title="Voice mode" className={`text-lg ${voice ? "text-emerald-400" : "text-tg-muted"}`}>🎙</button>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Спросить AI Operator…" className="flex-1 bg-transparent text-sm outline-none" />
            <button onClick={send} className="rounded-lg bg-tg-active px-3 py-1.5 text-xs font-semibold text-white">Send →</button>
          </div>
          {voice && <div className="mt-1 text-[11px] text-tg-muted">🎙 Voice mode (UI) — микрофон не подключён; голосовой ввод появится при включении backend-моста.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[66] flex flex-col bg-[#0a0a0f] text-tg-text">
      {/* TOP SYSTEM BAR */}
      <header className="flex items-center gap-3 border-b border-[rgba(255,255,255,.08)] bg-[#0e0e15] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Закрыть</button>
        <div className="font-black tracking-wide">🖥 EPIC OS · AI OPERATOR CONSOLE</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE</span>
        <div className="ml-2 flex items-center gap-1.5 text-[11px] text-tg-muted">Readiness <div className="h-1.5 w-24 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: overall + "%" }} /></div> {overall}%</div>
        <div className="ml-auto flex items-center gap-2">
          <LangThemeBar />
          <button onClick={() => setVoice((v) => !v)} className={`rounded-lg px-3 py-1.5 text-xs ring-1 ring-tg-line ${voice ? "bg-emerald-600/20 text-emerald-300" : "bg-tg-bg text-tg-muted"}`}>🎙</button>
          <button onClick={() => setScreen((v) => !v)} className={`rounded-lg px-3 py-1.5 text-xs ring-1 ring-tg-line ${screen ? "bg-cyan-600/20 text-cyan-300" : "bg-tg-bg text-tg-muted"}`}>🖵</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr_300px]">
        {/* LEFT SIDEBAR */}
        <nav className="min-h-0 overflow-auto border-r border-[rgba(255,255,255,.08)] bg-[#0e0e15] p-2">
          <button onClick={() => newChat()} className="mb-2 w-full rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-3 py-2 text-sm font-bold text-white">✨ New Chat</button>
          {NAV.filter(([n]) => n !== "new").map(([id, label]) => <button key={id} onClick={() => setNav(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${nav === id ? "bg-tg-active/30 text-white ring-1 ring-tg-accent" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}
          <div className="mt-3 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-muted">DEEPINSIDE OS</div>
          {([["executive", "📊", "Executive"], ["ceo", "👑", "AI CEO"], ["context", "🧠", "Context"], ["knowledgevault", "📚", "Knowledge"], ["automationcenter", "⚙", "Automation"], ["voice", "🎙", "Voice Operator"], ["finance", "💳", "Finance"], ["security", "🛡", "Security"], ["integrations", "🔌", "Integrations"], ["twins", "🧬", "Digital Twins"], ["datacenter", "🗄", "Data Center"], ["readiness", "✅", "Readiness"]] as const).map(([id, emo, key]) => <button key={id} onClick={() => { setNav(id); try { setCtx({ screen: "EPIC OS · " + key }, "Open " + key); } catch {} }} className={`mb-0.5 w-full rounded-lg px-2.5 py-1 text-left text-[12px] ${nav === id ? "bg-tg-active/30 text-white ring-1 ring-tg-accent" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{emo} {tr(key)}</button>)}
          <div className="mt-3 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-muted">Projects</div>
          {PROJECTS.slice(0, 6).map((p) => <button key={p} onClick={() => setNav("projects")} className="mb-0.5 w-full truncate rounded-lg px-2.5 py-1 text-left text-[12px] text-tg-muted hover:bg-tg-bg/40 hover:text-white">• {p}</button>)}
          <div className="mt-3 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-muted">Modules</div>
          {MODULES.map(([t, l]) => <button key={t} onClick={() => onAction?.(t)} className="mb-0.5 w-full truncate rounded-lg px-2.5 py-1 text-left text-[12px] text-tg-muted hover:bg-tg-bg/40 hover:text-white">{l}</button>)}
          <div className="mt-3 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-muted">Recent Chats</div>
          {chats.slice(0, 8).map((c) => <button key={c.id} onClick={() => { setActive(c.id); setNav("new"); }} className={`mb-0.5 w-full truncate rounded-lg px-2.5 py-1 text-left text-[12px] ${active === c.id && nav === "new" ? "bg-tg-bg/50 text-white" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>💬 {c.title}</button>)}
        </nav>

        {/* CENTER WORKSPACE */}
        <main className="min-h-0 overflow-auto p-4"><Center /></main>

        {/* RIGHT AI OPERATOR PANEL */}
        <aside className="min-h-0 space-y-2 overflow-auto border-l border-[rgba(255,255,255,.08)] bg-[#0e0e15] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">AI Operator</div>
          <Card t={tr("Current Context")}><div className="text-xs text-tg-muted">Control Shell · «{NAV.find(([n]) => n === nav)?.[1]}»{cur ? " · chat: " + cur.title : ""}</div></Card>
          <Card t={tr("Language") + " / " + tr("Theme")}><div className="text-xs text-tg-muted">{LANGS.find(([l]) => l === lang)?.[1]} · {THEMES.find(([th]) => th === theme)?.[1]}</div><div className="mt-1.5"><LangThemeBar /></div></Card>
          <Card t="System Readiness"><div className="space-y-1">{readiness.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[11px]"><span className="w-20 text-tg-muted">{l}</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: v >= 80 ? "#4ade80" : v >= 50 ? "#fbbf24" : "#f87171" }} /></div><span className="w-8 text-right">{v}%</span></div>)}</div></Card>
          <Card t="Available Tools"><div className="flex flex-wrap gap-1 text-[11px]">{TOOLS.map((t) => <span key={t} className="rounded-full bg-tg-bg px-2 py-0.5 text-tg-muted">{t}</span>)}</div></Card>
          <Card t="Screen Context"><div className="text-[11px] text-tg-muted">{sys.screen} · agent {sys.agent} · mission {sys.mission} · device {sys.device}</div></Card>
          <Card t="Domains"><div className="grid grid-cols-2 gap-1 text-[10px]">{([["🧠 Context", "context"], ["📚 Knowledge", "knowledgevault"], ["⚙ Automation", "automationcenter"], ["📱 Devices", "devices"], ["📡 Telegram", "telegram"], ["🎬 Media", "mediaops"], ["🏗 Infra", "ops"], ["🚀 Publishing", "executive"]] as const).map(([l, target]) => <button key={l} onClick={() => { if (["context", "knowledgevault", "automationcenter", "executive"].includes(target)) setNav(target); else onAction?.(target); }} className="rounded bg-tg-bg/50 px-1.5 py-1 text-left text-tg-muted hover:text-white">{l}</button>)}</div></Card>
          <Card t={tr("Recommendations")}><div className="space-y-1 text-[11px] text-tg-muted">{[...recs.slice(0, 2), "Есть неиспользуемые устройства (PHONE-04).", "Есть зависшие рендеры в очереди.", "Есть агенты без миссий."].slice(0, 5).map((r, i) => <div key={i}>• {r}</div>)}</div></Card>
          <Card t="Notifications"><div className="text-[11px] text-tg-muted">{devIdx?.devices?.filter((d: any) => d.status === "offline").length ? "⚠ Offline-устройства" : "✓ Нет критических уведомлений"}</div></Card>
          <Card t="Voice / Screen"><div className="flex gap-2"><button onClick={() => setVoice((v) => !v)} className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] ring-1 ring-tg-line ${voice ? "bg-emerald-600/20 text-emerald-300" : "bg-tg-bg text-tg-muted"}`}>🎙 {voice ? "on" : "off"}</button><button onClick={() => setScreen((v) => !v)} className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] ring-1 ring-tg-line ${screen ? "bg-cyan-600/20 text-cyan-300" : "bg-tg-bg text-tg-muted"}`}>🖵 {screen ? "on" : "off"}</button></div>{screen && <div className="mt-1 text-[10px] text-tg-muted">Screen view (UI) — захват экрана не подключён.</div>}</Card>
          <Card t="Safe API Vault"><div className="text-[11px] text-tg-muted">Ключи не хранятся в браузере. Подключение API — только backend-side. <span className="text-amber-300">Здесь секреты не вводятся.</span></div></Card>
          <Card t="Quick Commands"><div className="flex flex-wrap gap-1">{MODULES.slice(0, 6).map(([t, l]) => <button key={t} onClick={() => onAction?.(t)} className="rounded-lg bg-tg-bg px-2 py-1 text-[10px] text-tg-muted hover:text-white">{l.replace(/^\S+ /, "")}</button>)}</div></Card>
        </aside>
      </div>

      {palette && (() => {
        const cmds: [string, () => void][] = [["Open Home (Executive)", () => setNav("executive")], ["Open WORLD", () => onAction?.("world")], ["Open Devices", () => onAction?.("devices")], ["Open Media Ops", () => onAction?.("mediaops")], ["Open Architect", () => onAction?.("architect")], ["Open Telegram", () => onAction?.("telegram")], ["Open AI COO", () => onAction?.("coo")], ["Open API Vault", () => setNav("integrations")], ["Start Voice Mode", () => setVoice(true)], ["Open Screen View", () => setScreen(true)], ["Show Readiness", () => setNav("readiness")], ["Open Finance", () => setNav("finance")],
          ["Switch to Ukrainian", () => changeLang("uk")], ["Switch to Russian", () => changeLang("ru")], ["Switch to English", () => changeLang("en")], ["Switch to Light", () => changeTheme("light")], ["Switch to Dark", () => changeTheme("dark")], ["Switch to System", () => changeTheme("system")], ["Switch to The Matrix Evolution", () => changeTheme("matrix")], ["Reset Preferences", () => { const d = setPrefs({ language: "ru", theme: "dark" }); setLangState(d.language); setThemeState(d.theme); }]];
        const f = cmds.filter(([l]) => !pq || l.toLowerCase().includes(pq.toLowerCase()));
        return <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/50 pt-24" onMouseDown={() => setPalette(false)}><div className="w-[520px] max-w-[92vw] overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0e0e15] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}><input autoFocus value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Команда…" className="w-full border-b border-tg-line bg-[#0a0a0f] px-4 py-3 text-sm outline-none" /><div className="max-h-[52vh] overflow-auto p-2">{f.map(([l, r]) => <button key={l} onClick={() => { r(); setPalette(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/60"><span className="text-cyan-300">⌁</span>{l}</button>)}</div></div></div>;
      })()}
    </div>
  );
}
