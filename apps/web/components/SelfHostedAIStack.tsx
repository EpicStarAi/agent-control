"use client";

// DEEPINSIDE PHASE S + T — SELF-HOSTED AI STACK (live infrastructure monitor).
// ADDITIVE full-screen overlay. PHASE T wires the existing panels to REAL data via the read-only
// backend bridge /api/infra/* (Docker / n8n / Ollama / PostgreSQL / Qdrant / Redis / MinIO / host).
// Falls back to Mock/Offline when a service is down. No secrets are read or shown (backend reads env
// only). No Telegram actions, no auto-publish. Docker/Ollama control requires operator confirmation.

import { useEffect, useRef, useState } from "react";

type AnyRec = Record<string, any>;
const LSK = "deepinside.selfHostedStack.v1";
const EGK = "deepinside.selfHostedStack.executorGate.v1";
const EVK = "deepinside.selfHostedStack.executorEvidence.v1";
const WEK = "deepinside.selfHostedStack.webhookExecutionEvidence.v1";
const WEBHOOK_PHRASE = "TRIGGER ONE SAFE WEBHOOK WORKFLOW";
const EXEC_PHRASE = "EXECUTE ONE WHITELISTED WORKFLOW";
const SAFETY = { mode: "MANUAL_ONLY", monitoringReadOnly: true, autoSendAllowed: false, autoPublishAllowed: false, backgroundSendAllowed: false, massSendAllowed: false, realTelegramActionsAllowed: false, realApiKeysInUi: false, secretsVisible: false, secretsInLocalStorage: false, credentialsExportAllowed: false, controlRequiresConfirmation: true, autonomousActionsAllowed: false };

const SECTIONS: [string, string][] = [
  ["overview", "🛰 Overview"], ["infrastructure", "🧩 Infrastructure"], ["workflows", "🔁 Workflows"], ["memory", "🧠 Memory"], ["runtime", "⚙ Runtime"], ["mcp", "🔌 MCP Hub"], ["media", "🎬 Media Factory"], ["telegram", "✈ Telegram"], ["storage", "💾 Storage"], ["analytics", "📊 Analytics"], ["settings", "⚙ Settings"]
];
const AGENTS = ["NOVIKOVA", "AI MUSIC PUBLIC", "EVA", "AI NEWSCASTER"];
const MEMORY_PARTS = ["Short", "Long", "Knowledge", "Documents", "Embeddings", "History", "Conversations", "Goals", "Tasks", "Artifacts"];
const MCP_LIST: [string, string][] = [["Filesystem", "Connected"], ["Docker", "Ready"], ["GitHub", "Mock"], ["Google Drive", "Mock"], ["Notion", "Mock"], ["Browser", "Ready"], ["PostgreSQL", "Connected"], ["Redis", "Connected"], ["Qdrant", "Connected"], ["Telegram", "Ready"], ["OpenAPI", "Mock"]];
const MEDIA_LIST: [string, string][] = [["ComfyUI", "Offline"], ["FFmpeg", "Ready"], ["Whisper", "Offline"], ["FaceFusion", "Offline"], ["Voice", "Mock"], ["Image", "Mock"], ["Video", "Mock"], ["Audio", "Mock"], ["Render Queue", "Ready"], ["Job History", "Mock"], ["Storage", "Connected"]];
const TELEGRAM_PARTS = ["Sessions", "Accounts", "Channels", "Drafts", "Approval", "Publisher", "Analytics", "Queue"];
const PROVIDERS: [string, string][] = [["OpenAI", "Disabled"], ["Claude", "Disabled"], ["Gemini", "Disabled"], ["Grok", "Disabled"], ["OpenRouter", "Disabled"]];

function load<T>(k: string, def: T): T { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch { return def; } }
function save(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const stCol = (s: string) => { const x = String(s).toLowerCase(); return x.indexOf("live") >= 0 || x.indexOf("ready") >= 0 || x.indexOf("connected") >= 0 || x.indexOf("ok") >= 0 || x.indexOf("running") >= 0 ? "#4ade80" : x.indexOf("mock") >= 0 || x.indexOf("warn") >= 0 || x.indexOf("manual") >= 0 ? "#fbbf24" : x.indexOf("offline") >= 0 || x.indexOf("disabled") >= 0 || x.indexOf("disconnected") >= 0 || x.indexOf("down") >= 0 || x.indexOf("fail") >= 0 ? "#f87171" : "#9ca3af"; };

export function SelfHostedAIStack({ onClose, initialSection }: { onClose: () => void; initialSection?: string }) {
  const [sec, setSec] = useState(initialSection || "overview");
  const [note, setNote] = useState("");
  const [live, setLive] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendOff, setBackendOff] = useState(false);
  const timer = useRef<any>(null);
  // T7.5 n8n observability (read-only)
  const [n8nWf, setN8nWf] = useState<AnyRec | null>(null);
  const [n8nEx, setN8nEx] = useState<AnyRec | null>(null);
  const [n8nSel, setN8nSel] = useState<AnyRec | null>(null);
  const [wfTab, setWfTab] = useState("workflows");
  const [gNode, setGNode] = useState("");
  const [exSel, setExSel] = useState<AnyRec | null>(null);
  const [gId, setGId] = useState<any>(null);
  const [gate, setGate] = useState<AnyRec>({ whitelisted: false, graphInspected: false, executionsInspected: false, riskyAcknowledged: false, credentialsAcknowledged: false, armed: false, confirmPhrase: "", decision: "", lastUpdate: null });
  const [gateResp, setGateResp] = useState<AnyRec | null>(null);
  const [evidence, setEvidence] = useState<AnyRec[]>([]);
  const [webhookResp, setWebhookResp] = useState<AnyRec | null>(null);
  const [webhookEvidence, setWebhookEvidence] = useState<AnyRec[]>([]);

  const pull = () => {
    fetch("/api/infra/status", { cache: "no-store" })
      .then((r) => { if (r.status === 503) { setBackendOff(true); return null; } setBackendOff(false); return r.json().catch(() => null); })
      .then((j) => { if (j && j.ok) { setLive(j); } setLoading(false); })
      .catch(() => { setBackendOff(true); setLoading(false); });
  };
  useEffect(() => { const st = load<AnyRec>(LSK, {} as AnyRec); if (st.lastSection) setSec(st.lastSection); const g = load<AnyRec | null>(EGK, null); if (g) setGate((p) => ({ ...p, ...g })); setEvidence(load<AnyRec[]>(EVK, [])); setWebhookEvidence(load<AnyRec[]>(WEK, [])); pull(); timer.current = setInterval(pull, 5000); return () => { if (timer.current) clearInterval(timer.current); }; }, []);
  useEffect(() => { save(LSK, { lastSection: sec, safety: SAFETY, updatedAt: new Date().toISOString() }); }, [sec]);

  const pullN8n = () => {
    fetch("/api/infra/n8n/workflows", { cache: "no-store" }).then((r) => r.json()).then((j) => setN8nWf(j)).catch(() => setN8nWf({ online: false, reason: "backend_offline", workflows: [] }));
    fetch("/api/infra/n8n/executions", { cache: "no-store" }).then((r) => r.json()).then((j) => setN8nEx(j)).catch(() => setN8nEx({ online: false, reason: "backend_offline", executions: [] }));
  };
  useEffect(() => { if (sec === "workflows") pullN8n(); }, [sec]);
  const inspectWf = (id: any) => { setGId(id); setNote("Загружаю граф workflow…"); fetch("/api/infra/n8n/workflows/" + encodeURIComponent(String(id)) + "/graph", { cache: "no-store" }).then((r) => r.json()).then((j) => { setN8nSel(j); setGNode(""); setWfTab("graph"); setNote(j && j.online ? "Граф загружен (read-only)." : "n8n: " + ((j && j.reason) || "—")); }).catch(() => setNote("n8n graph: backend offline")); };
  const copySafe = (txt: string, label: string) => { try { navigator.clipboard.writeText(txt); } catch {} setNote("Скопировано: " + label); };
  const setG = (patch: AnyRec) => { setGate((prev) => { const n = { ...prev, ...patch, lastUpdate: new Date().toISOString() }; save(EGK, n); return n; }); };
  const runGate = (extra?: AnyRec) => { if (!gId) { setNote("Сначала выбери workflow для gate."); return; } const body = { ...gate, ...(extra || {}) }; fetch("/api/infra/n8n/workflows/" + encodeURIComponent(String(gId)) + "/executor-gate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).then((j) => { setGateResp(j); if (j && j.evidence) { setEvidence((prev) => { const n = [j.evidence, ...prev].slice(0, 20); save(EVK, n); return n; }); } setNote("Executor gate: " + (j.reason || j.mode)); }).catch(() => setNote("executor-gate: backend offline")); };
  const runWebhook = (extra?: AnyRec) => { if (!gId) { setNote("Сначала выбери workflow."); return; } const body = { oneWorkflowOnly: true, webhookWhitelisted: !!gate.whitelisted, graphInspected: !!gate.graphInspected, executionsInspected: !!gate.executionsInspected, riskyNodesAcknowledged: !!gate.riskyAcknowledged, credentialsUsedAcknowledged: !!gate.credentialsAcknowledged, preflightStatus: (extra && extra.preflightStatus) || "READY", testPayloadOnly: true, confirmationPhrase: gate.webhookPhrase || "", ...(extra || {}) }; fetch("/api/infra/n8n/workflows/" + encodeURIComponent(String(gId)) + "/webhook-trigger-gate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).then((j) => { setWebhookResp(j); if (j && j.evidence) { setWebhookEvidence((prev) => { const n = [j.evidence, ...prev].slice(0, 20); save(WEK, n); return n; }); } setNote("Webhook gate: " + (j.reason || j.mode)); }).catch(() => setNote("webhook-trigger-gate: backend offline")); };

  const svc: AnyRec = (live && live.services) || {};
  const on = (k: string) => !!(svc[k] && svc[k].online);
  const svcPill = (k: string) => on(k) ? "Live" : (backendOff ? "Backend offline" : "Offline");

  const pill = (s: string) => <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: stCol(s) + "22", color: stCol(s) }}>{s}</span>;
  const card = (title: string, sub: string, status: string, foot?: any) => <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur"><div className="flex items-start justify-between gap-2"><div><div className="text-sm font-black text-cyan-100">{title}</div><div className="text-[10px] text-tg-muted">{sub}</div></div>{pill(status)}</div>{foot && <div className="mt-2">{foot}</div>}</div>;
  const tile = (label: string, value: any, status?: string) => <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="flex items-center justify-between"><span className="text-[10px] font-bold">{label}</span>{status && pill(status)}</div><div className="mt-0.5 text-[11px] text-tg-muted">{value}</div></div>;

  const confirmAct = (msg: string) => { try { return window.confirm(msg); } catch { return false; } };
  const dockerAct = (action: string, container: string) => {
    if (!confirmAct("Локальное действие Docker: " + action + " " + container + ". Подтвердить?")) return;
    setNote("Docker " + action + " " + container + " …");
    fetch("/api/infra/docker/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, container, operatorConfirmed: true }) }).then((r) => r.json()).then((j) => { setNote("Docker " + action + ": " + (j.ok ? "ok" : (j.reason || j.message || "fail"))); pull(); }).catch(() => setNote("Docker action: backend offline"));
  };
  const ollamaAct = (action: string, model: string) => {
    if (!confirmAct("Локальное действие Ollama: " + action + " " + model + ". Подтвердить?")) return;
    setNote("Ollama " + action + " " + model + " …");
    fetch("/api/infra/ollama/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, model, operatorConfirmed: true }) }).then((r) => r.json()).then((j) => { setNote("Ollama " + action + ": " + (j.ok ? "ok" : (j.reason || j.message || "fail"))); pull(); }).catch(() => setNote("Ollama action: backend offline"));
  };

  const systemMapBlock = <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
    <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-cyan-300/70">System Map · live</div>
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">{(live && live.systemMap ? live.systemMap : [{ name: "AI Operator", status: "Connected" }, { name: "Agent Registry", status: "Connected" }, { name: "Docker", status: "—" }, { name: "n8n", status: "—" }, { name: "PostgreSQL", status: "—" }, { name: "Qdrant", status: "—" }, { name: "Redis", status: "—" }, { name: "MinIO", status: "—" }, { name: "Ollama", status: "—" }]).map((n: AnyRec) => <div key={n.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px]"><span>{n.name}</span>{pill(n.status)}</div>)}</div>
    {live && <div className="mt-1 text-[9px] text-tg-muted">Health score: {live.healthScore}% · обновляется каждые 5с</div>}
  </div>;

  const coreList: [string, string, string][] = [["n8n", "Workflow Engine :5678", "n8n"], ["PostgreSQL", "State / Memory", "postgres"], ["Qdrant", "Vectors :6333", "qdrant"], ["Ollama", "Local LLM :11434", "ollama"], ["Redis", "Queue / Cache", "redis"], ["MinIO", "Object storage :9000", "minio"]];

  const sections: Record<string, any> = {
    overview: <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
        <div className="flex flex-wrap items-center gap-2"><div className="text-lg font-black text-cyan-200">🧬 DEEPINSIDE · AI Operating System</div>{live ? pill("LIVE · " + live.healthScore + "%") : pill(backendOff ? "Backend offline" : "loading")}</div>
        <div className="mt-1 text-[11px] text-tg-muted">Живой мониторинг инфраструктуры. Чтение read-only, секреты только из env. Внешние провайдеры — Disabled.</div>
      </div>
      <div className="text-[10px] font-black uppercase tracking-wide text-cyan-300/70">CORE + STORAGE</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{coreList.map((s) => card(s[0], s[1], svcPill(s[2]), svc[s[2]] && svc[s[2]].reason ? <div className="text-[9px] text-rose-200/70">{svc[s[2]].reason}</div> : null))}</div>
      <div className="text-[10px] font-black uppercase tracking-wide text-cyan-300/70">AI ROUTER</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{card("Ollama", "local · primary", svcPill("ollama"))}{PROVIDERS.map((p) => card(p[0], "external provider", p[1]))}</div>
      {systemMapBlock}
    </div>,

    infrastructure: <div className="space-y-3">
      <div className="text-[11px] text-tg-muted">Infrastructure Center — Docker Engine (live). Start/Stop/Restart — реальные локальные действия с подтверждением.</div>
      {on("docker") ? <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(svc.docker.counts || {}).map(([k, v]) => tile(k, v as any, "Live"))}</div>
        <div className="space-y-1">{(svc.docker.containers || []).map((c: AnyRec) => <div key={c.name} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 text-[10px]"><span className="font-bold text-cyan-100">{c.name}</span>{pill(c.state === "running" ? "running" : "stopped")}<span className="text-tg-muted">{c.image}</span><span className="text-tg-muted">{c.status}</span><div className="ml-auto flex gap-1">{["start", "stop", "restart"].map((a) => <button key={a} onClick={() => dockerAct(a, c.name)} className="rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20">{a}</button>)}</div></div>)}</div>
      </> : <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-[11px] text-rose-200">Docker недоступен ({(svc.docker && svc.docker.reason) || (backendOff ? "backend offline" : "—")}). Запусти Docker Desktop и API (npm run api:dev).</div>}
    </div>,

    workflows: (() => {
      const wfList: AnyRec[] = (n8nWf && n8nWf.workflows) || [];
      const exList: AnyRec[] = (n8nEx && n8nEx.executions) || [];
      const failed = exList.filter((e) => e.status === "error" || e.status === "failed");
      const keyMissing = (n8nWf && n8nWf.reason === "N8N_API_KEY_REQUIRED") || (n8nEx && n8nEx.reason === "N8N_API_KEY_REQUIRED");
      const fmtDur = (ms: any) => ms == null ? "—" : (ms < 1000 ? ms + "ms" : (ms / 1000).toFixed(1) + "s");
      const safeSummary = "n8n observability · health=" + (on("n8n") ? "ok" : "down") + " · workflows=" + ((n8nWf && n8nWf.counts && (n8nWf.counts.active + "/" + n8nWf.counts.total)) || "—") + " · executions success/failed=" + ((n8nEx && n8nEx.counts && (n8nEx.counts.success + "/" + n8nEx.counts.failed)) || "—") + (n8nSel && n8nSel.workflow ? (" · selected=" + n8nSel.workflow.name + " nodes=" + (n8nSel.counts && n8nSel.counts.nodes) + " risky=" + (n8nSel.counts && n8nSel.counts.risky)) : "");
      const gnodes: AnyRec[] = (n8nSel && n8nSel.nodes) || [];
      const gedges: AnyRec[] = (n8nSel && n8nSel.edges) || [];
      const gName = (n8nSel && n8nSel.workflowName) || "";
      const gc = (n8nSel && n8nSel.counts) || {};
      const graphSummary = "n8n graph · wf=" + (gName || "—") + " · nodes=" + (gc.nodes || 0) + " · edges=" + (gc.edges || 0) + " · triggers=" + (gc.triggers || 0) + " · risky=" + (gc.risky || 0) + " · credUsed=" + (gc.credentialsUsed || 0);
      const claudePrompt = "n8n read-only debug context (no secrets):\n" + safeSummary + "\n" + graphSummary + "\nfailed executions: " + failed.map((e) => e.id + "/" + e.status).join(", ") + "\nrisky nodes: " + gnodes.filter((x) => x.riskyNode).map((x) => x.name + "(" + x.type + ")").join(", ") + "\nConstraints: read-only, no execution, credentials/secrets/payload hidden.";
      // ---- safe SVG layout from node positions ----
      const xs = gnodes.map((n) => (n.position && n.position.x) || 0), ys = gnodes.map((n) => (n.position && n.position.y) || 0);
      const minX = xs.length ? Math.min.apply(null, xs) : 0, maxX = xs.length ? Math.max.apply(null, xs) : 1;
      const minY = ys.length ? Math.min.apply(null, ys) : 0, maxY = ys.length ? Math.max.apply(null, ys) : 1;
      const NW = 134, NH = 34, PAD = 40;
      const W = (maxX - minX) + NW + PAD * 2, H = (maxY - minY) + NH + PAD * 2;
      const pos: Record<string, { x: number; y: number }> = {};
      gnodes.forEach((n) => { pos[n.name] = { x: ((n.position && n.position.x) || 0) - minX + PAD, y: ((n.position && n.position.y) || 0) - minY + PAD }; });
      const kindFill = (k: string) => k === "trigger" ? "#22c55e" : k === "transform" ? "#a78bfa" : k === "action" ? "#38bdf8" : "#9ca3af";
      const selNode = gnodes.find((n) => n.name === gNode);
      const incoming = gedges.filter((e) => e.target === gNode);
      const outgoing = gedges.filter((e) => e.source === gNode);
      const TABS: [string, string][] = [["overview", "Overview"], ["workflows", "Workflows"], ["graph", "Graph"], ["executions", "Executions"], ["failed", "Failed"], ["executor", "Executor Gate"]];
      const svgOk = gnodes.length > 0 && gnodes.length <= 120;
      // ---- T8 preflight (pure) ----
      const gphOnline = !!(n8nSel && n8nSel.online);
      const riskyN = gc.risky || 0, credN = gc.credentialsUsed || 0;
      const forbiddenN = gateResp ? ((gateResp.forbiddenNodes || []).length) : null;
      const phraseOk = String(gate.confirmPhrase || "").trim() === EXEC_PHRASE;
      const pfChecks: [string, boolean, string][] = [
        ["n8n health ready", on("n8n"), "подними n8n"],
        ["workflow selected", !!gId, "выбери workflow"],
        ["graph available", gphOnline, "загрузи граф (Inspect)"],
        ["workflow whitelisted", !!gate.whitelisted, "Mark Workflow Whitelisted"],
        ["graph inspected", !!gate.graphInspected, "Mark Graph Inspected"],
        ["executions inspected", !!gate.executionsInspected, "Mark Executions Inspected"],
        ["risky nodes acknowledged", riskyN === 0 || !!gate.riskyAcknowledged, "Acknowledge Risky Nodes"],
        ["credentials acknowledged", credN === 0 || !!gate.credentialsAcknowledged, "Acknowledge Credentials Used"],
        ["no forbidden nodes", forbiddenN === 0, forbiddenN === null ? "Run Executor Preflight" : "удали запрещённые узлы в n8n"],
        ["confirmation phrase", phraseOk, "введи фразу EXECUTE ONE WHITELISTED WORKFLOW"],
        ["manual gate armed", !!gate.armed, "Arm Manual Executor Gate"]
      ];
      const pfBlockers = pfChecks.filter((c) => !c[1]);
      const pfWarn = forbiddenN === null;
      const pfResult = pfBlockers.length === 0 ? "READY" : (pfBlockers.length === 1 && pfWarn ? "WARNING" : "BLOCKED");
      const pfCol = pfResult === "READY" ? "#4ade80" : pfResult === "WARNING" ? "#fbbf24" : "#f87171";
      const armGate = () => { if (pfResult !== "READY") { setNote("Arm заблокирован: " + (pfBlockers[0] ? pfBlockers[0][0] : "preflight не READY")); return; } setG({ armed: true }); runGate({ armed: true }); setNote("Manual executor gate ARMED (dry-arm; реальный запуск отключён)."); };
      const execChecklist = "# EXECUTOR GATE CHECKLIST\nworkflow: " + (gName || "—") + "\nphrase: " + EXEC_PHRASE + "\n" + pfChecks.map((c) => "- [" + (c[1] ? "x" : " ") + "] " + c[0]).join("\n") + "\nresult: " + pfResult + "\nSafety: manual-only · one workflow · no retry · no mass · no telegram · dry-arm only.";
      const execEnvEnabled = !!(gateResp && gateResp.enabled);
      const execMode = execEnvEnabled && pfResult === "READY" && forbiddenN === 0 ? "LIVE_ONE_WORKFLOW_ENABLED" : "DRY_ARM_ONLY";
      const liveReady = execEnvEnabled && pfResult === "READY" && phraseOk && !!gate.armed && forbiddenN === 0;
      const execOne = () => { if (!liveReady) { setNote("Execute заблокирован: нужны env (N8N_EXECUTOR_ENABLED) + preflight READY + точная фраза + armed + нет forbidden-узлов."); return; } runGate({ execute: true, operatorConfirmed: true }); setG({ decision: "manual_execute_one" }); };
      const whEnvEnabled = !!(webhookResp && webhookResp.enabled);
      const whForbidden = webhookResp ? webhookResp.forbiddenNodesCount : forbiddenN;
      const whPhraseOk = String(gate.webhookPhrase || "").trim() === WEBHOOK_PHRASE;
      const whReady = whEnvEnabled && pfResult === "READY" && whPhraseOk && !!gate.armed && whForbidden === 0;
      const checkWebhook = () => runWebhook({ preflightStatus: pfResult });
      const triggerWebhook = () => { if (!whReady) { setNote("Webhook trigger заблокирован: нужны env (N8N_WEBHOOK_EXECUTOR_ENABLED) + READY + фраза + armed + forbidden=0."); return; } runWebhook({ operatorConfirmed: true, preflightStatus: pfResult }); setG({ decision: "manual_trigger_webhook" }); };

      return <div className="space-y-3">
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-[10px] text-amber-200">n8n подключён только в режиме наблюдения. Запуск/мутация workflow из панели отключены. Credentials, secrets и payload скрыты. Перед T8 нужно видеть граф и последние execution logs.</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-black text-cyan-100">🔁 n8n Observability</span>{pill(on("n8n") ? "Live" : keyMissing ? "key required" : "Offline")}
          <div className="ml-auto flex flex-wrap gap-1 text-[10px]">
            <button onClick={() => { pullN8n(); if (gId) inspectWf(gId); setNote("Обновлено."); }} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Refresh Graph</button>
            <button onClick={() => copySafe(safeSummary + " || " + graphSummary, "safe graph summary")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Copy Safe Graph Summary</button>
            <button onClick={() => copySafe(claudePrompt, "Claude debug prompt")} className="rounded bg-cyan-600/25 px-2 py-1 hover:bg-cyan-600/40">Copy Claude Debug Prompt</button>
          </div>
        </div>
        {keyMissing && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200">N8N_API_KEY_REQUIRED — health виден, но список/граф/executions требуют ключ в env API. Ключ читается только на бэкенде и не отображается.</div>}

        <div className="flex flex-wrap gap-1">{TABS.map(([k, l]) => <button key={k} onClick={() => setWfTab(k)} className={"rounded-lg px-2 py-1 text-[11px] " + (wfTab === k ? "bg-cyan-600/30 font-bold text-cyan-100" : "bg-white/5 text-tg-muted hover:bg-white/10")}>{l}{k === "failed" && failed.length > 0 ? " (" + failed.length + ")" : ""}</button>)}</div>

        {wfTab === "overview" && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tile("Health", on("n8n") ? "ok" : "down", on("n8n") ? "Live" : "Offline")}{tile("Workflows", (n8nWf && n8nWf.counts) ? (n8nWf.counts.active + " / " + n8nWf.counts.total) : "—", "Live")}{tile("Executions", (n8nEx && n8nEx.counts) ? n8nEx.counts.total : "—", "Live")}{tile("Failed", (n8nEx && n8nEx.counts) ? n8nEx.counts.failed : "—", (n8nEx && n8nEx.counts && n8nEx.counts.failed > 0) ? "warning" : "Live")}</div>}

        {wfTab === "workflows" && <div className="rounded-2xl border border-white/10 bg-white/5 p-2"><div className="mb-1 text-[10px] font-black uppercase text-cyan-300/70">Workflows ({wfList.length})</div><div className="overflow-auto"><table className="w-full text-[10px]"><thead><tr className="text-tg-muted">{["name", "active", "nodes", "trigger", "updatedAt", ""].map((h) => <th key={h} className="px-1 py-0.5 text-left font-semibold">{h}</th>)}</tr></thead><tbody>{wfList.map((w) => <tr key={String(w.id)} className="border-t border-white/10"><td className="px-1 py-1 font-bold text-cyan-100">{w.name}</td><td className="px-1">{pill(w.active ? "active" : "idle")}</td><td className="px-1">{w.nodesCount}</td><td className="px-1 text-tg-muted">{w.triggerType}</td><td className="px-1 text-tg-muted">{w.updatedAt ? String(w.updatedAt).slice(0, 16).replace("T", " ") : "—"}</td><td className="px-1"><button onClick={() => inspectWf(w.id)} className="rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20">Inspect</button></td></tr>)}{wfList.length === 0 && <tr><td colSpan={6} className="px-1 py-2 text-tg-muted">{keyMissing ? "нужен N8N_API_KEY" : on("n8n") ? "workflow нет" : "n8n офлайн"}</td></tr>}</tbody></table></div></div>}

        {wfTab === "graph" && <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-tg-muted">Select Workflow:</span>
            <select value={String(gId ?? "")} onChange={(e) => { if (e.target.value) inspectWf(e.target.value); }} className="rounded bg-black/40 px-2 py-1 text-tg-text">{!gId && <option value="" className="bg-black">—</option>}{wfList.map((w) => <option key={String(w.id)} value={String(w.id)} className="bg-black">{w.name}</option>)}</select>
            {n8nSel && n8nSel.online && <span className="text-[9px] text-tg-muted">{gName} · nodes {gc.nodes} · edges {gc.edges} · triggers {gc.triggers} · risky {gc.risky} · credUsed {gc.credentialsUsed}</span>}
          </div>
          {(!n8nSel || !n8nSel.online) ? <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-tg-muted">Выбери workflow для построения графа{n8nSel && n8nSel.reason ? " · " + n8nSel.reason : ""}.</div> : <>
            {svgOk ? <div className="overflow-auto rounded-xl border border-white/10 bg-black/40" style={{ maxHeight: "46vh" }}>
              <svg width={Math.min(W, 1600)} height={Math.min(H, 1200)} viewBox={"0 0 " + W + " " + H}>
                <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#64748b" /></marker><marker id="ahe" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f87171" /></marker></defs>
                {gedges.map((e, i) => { const p = pos[e.source], q = pos[e.target]; if (!p || !q) return null; const x1 = p.x + NW, y1 = p.y + NH / 2, x2 = q.x, y2 = q.y + NH / 2; const col = e.kind === "error" ? "#f87171" : "#64748b"; return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={1.5} markerEnd={e.kind === "error" ? "url(#ahe)" : "url(#ah)"} opacity={0.8} />; })}
                {gnodes.map((n, i) => { const p = pos[n.name]; if (!p) return null; const f = kindFill(n.kind); const isSel = n.name === gNode; return <g key={i} transform={"translate(" + p.x + "," + p.y + ")"} onClick={() => setGNode(n.name)} style={{ cursor: "pointer" }}><rect width={NW} height={NH} rx={8} fill={f + "22"} stroke={n.riskyNode ? "#f87171" : (isSel ? "#67e8f9" : f + "99")} strokeWidth={isSel ? 3 : 1.5} /><text x={8} y={15} fontSize={10} fontWeight={700} fill={f}>{String(n.name).slice(0, 18)}</text><text x={8} y={27} fontSize={8} fill="#9ca3af">{String(n.type).slice(0, 20)}</text>{n.kind === "trigger" && <circle cx={NW - 8} cy={9} r={4} fill="#22c55e" />}{n.riskyNode && <circle cx={NW - 8} cy={24} r={4} fill="#f87171" />}</g>; })}
              </svg>
            </div> : <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">Граф большой/непригоден для SVG — используй таблицу рёбер ниже.</div>}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-2"><div className="mb-1 text-[10px] font-black uppercase text-cyan-300/70">Edge table (fallback) ({gedges.length})</div><div className="overflow-auto"><table className="w-full text-[10px]"><thead><tr className="text-tg-muted">{["source", "target", "out", "in", "kind"].map((h) => <th key={h} className="px-1 py-0.5 text-left font-semibold">{h}</th>)}</tr></thead><tbody>{gedges.map((e, i) => <tr key={i} className="border-t border-white/10"><td className="px-1 py-0.5">{e.source}</td><td className="px-1">{e.target}</td><td className="px-1 text-tg-muted">{e.sourceOutput}</td><td className="px-1 text-tg-muted">{e.targetInput}</td><td className="px-1">{pill(e.kind)}</td></tr>)}{gedges.length === 0 && <tr><td colSpan={5} className="px-1 py-2 text-tg-muted">связей нет</td></tr>}</tbody></table></div></div>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-2"><div className="mb-1 text-[10px] font-black uppercase text-cyan-300/70">Node Inspector</div>{selNode ? <div className="space-y-1 text-[10px]"><div className="flex items-center gap-2"><span className="font-black text-cyan-100">{selNode.name}</span>{pill(selNode.kind)}{selNode.riskyNode && pill("risky")}</div><div className="text-tg-muted">type: {selNode.type} · conn: {selNode.connectionCount} · credentialsUsed: {String(selNode.credentialsUsed)}</div><div className="grid grid-cols-2 gap-2"><div><div className="text-[9px] uppercase text-tg-muted">incoming ({incoming.length})</div>{incoming.map((e, i) => <div key={i} className="text-[9px]">← {e.source} <span className="text-tg-muted">({e.kind})</span></div>)}{incoming.length === 0 && <div className="text-[9px] text-tg-muted">—</div>}</div><div><div className="text-[9px] uppercase text-tg-muted">outgoing ({outgoing.length})</div>{outgoing.map((e, i) => <div key={i} className="text-[9px]">→ {e.target} <span className="text-tg-muted">({e.kind})</span></div>)}{outgoing.length === 0 && <div className="text-[9px] text-tg-muted">—</div>}</div></div>{selNode.notes && <div className="text-tg-muted">notes: {selNode.notes}</div>}</div> : <div className="text-[10px] text-tg-muted">Кликни узел на графе для инспекции (credentials/secrets/payload не показываются).</div>}</div>
          </>}
        </div>}

        {wfTab === "executions" && <div className="space-y-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2"><div className="mb-1 text-[10px] font-black uppercase text-cyan-300/70">Execution Logs ({exList.length})</div><div className="overflow-auto"><table className="w-full text-[10px]"><thead><tr className="text-tg-muted">{["id", "wf", "status", "started", "duration", "mode", ""].map((h) => <th key={h} className="px-1 py-0.5 text-left font-semibold">{h}</th>)}</tr></thead><tbody>{exList.map((e, i) => <tr key={i} className="border-t border-white/10"><td className="px-1 py-1 font-mono">{e.id}</td><td className="px-1 text-tg-muted">{e.workflowId}</td><td className="px-1">{pill(e.status)}</td><td className="px-1 text-tg-muted">{e.startedAt ? String(e.startedAt).slice(11, 19) : "—"}</td><td className="px-1">{fmtDur(e.durationMs)}</td><td className="px-1 text-tg-muted">{e.mode}</td><td className="px-1"><button onClick={() => setExSel(e)} className="rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20">Inspect</button></td></tr>)}{exList.length === 0 && <tr><td colSpan={7} className="px-1 py-2 text-tg-muted">{keyMissing ? "нужен N8N_API_KEY" : "выполнений нет"}</td></tr>}</tbody></table></div></div>
          {exSel && <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-2 text-[10px]"><div className="mb-1 text-[10px] font-black uppercase text-cyan-300/70">Execution Trace Overlay</div><div className="flex flex-wrap items-center gap-2"><span className="font-mono">{exSel.id}</span>{pill(exSel.status)}<span className="text-tg-muted">wf {exSel.workflowId} · mode {exSel.mode}</span></div><div className="text-tg-muted">started {exSel.startedAt ? String(exSel.startedAt).replace("T", " ").slice(0, 19) : "—"} · stopped {exSel.stoppedAt ? String(exSel.stoppedAt).replace("T", " ").slice(0, 19) : "—"} · duration {fmtDur(exSel.durationMs)}</div><div className="text-[9px] text-amber-300/80">Node-level trace недоступен без payload (payload скрыт по safety). Показан только workflow-level статус.</div></div>}
        </div>}

        {wfTab === "failed" && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-2"><div className="mb-1 text-[10px] font-black uppercase text-rose-300/80">Failed Executions ({failed.length})</div>{failed.map((e, i) => <div key={i} className="flex flex-wrap items-center gap-2 border-t border-white/10 py-1 text-[10px] text-rose-200"><span className="font-mono">{e.id}</span><span className="text-tg-muted">wf {e.workflowId}</span><span>{e.errorSummary || "execution error"}</span><span className="text-[9px] text-tg-muted">(node/payload скрыты)</span></div>)}{failed.length === 0 && <div className="text-[10px] text-tg-muted">Упавших выполнений нет.</div>}</div>}

        {wfTab === "executor" && <div className="space-y-2">
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2 text-[10px] text-rose-200">Это ручной шлюз исполнения. Автозапуск отключён. По умолчанию T8 только вооружает gate, но не запускает workflow. Workflow должен быть whitelisted. Telegram/social send в этой фазе запрещён. Credentials, secrets и payload скрыты. Только один workflow, только вручную, только после preflight.</div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-tg-muted">Select Workflow For Gate:</span>
            <select value={String(gId ?? "")} onChange={(e) => { if (e.target.value) inspectWf(e.target.value); }} className="rounded bg-black/40 px-2 py-1 text-tg-text">{!gId && <option value="" className="bg-black">—</option>}{wfList.map((w) => <option key={String(w.id)} value={String(w.id)} className="bg-black">{w.name}</option>)}</select>
            <span className="ml-auto rounded px-2 py-0.5 text-[10px] font-black" style={{ background: pfCol + "22", color: pfCol }}>{pfResult}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tile("Workflow", gName || "—", gphOnline ? "Live" : "—")}{tile("Active", (n8nSel && n8nSel.online) ? String(n8nSel.active) : "—")}{tile("Whitelisted", String(!!gate.whitelisted), gate.whitelisted ? "Live" : "warning")}{tile("Armed", String(!!gate.armed), gate.armed ? "Live" : "warning")}
            {tile("Risky nodes", riskyN)}{tile("Credentials used", credN)}{tile("Forbidden nodes", forbiddenN === null ? "run preflight" : forbiddenN, forbiddenN === 0 ? "Live" : forbiddenN === null ? "warning" : "Offline")}{tile("Execution", "disabled (dry-arm)", "warning")}
          </div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            <button onClick={() => setG({ whitelisted: true })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Mark Workflow Whitelisted</button>
            <button onClick={() => { if (!gphOnline) { setNote("Сначала загрузи граф (Inspect)."); return; } setG({ graphInspected: true }); }} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Mark Graph Inspected</button>
            <button onClick={() => { if (!n8nEx) { setNote("Открой вкладку Executions."); return; } setG({ executionsInspected: true }); }} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Mark Executions Inspected</button>
            <button onClick={() => setG({ riskyAcknowledged: true })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Acknowledge Risky Nodes</button>
            <button onClick={() => setG({ credentialsAcknowledged: true })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Acknowledge Credentials Used</button>
            <button onClick={() => runGate()} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Run Executor Preflight</button>
            <button onClick={armGate} className="rounded bg-emerald-600/25 px-2 py-1 hover:bg-emerald-600/40">Arm Manual Executor Gate</button>
            <button onClick={() => copySafe(execChecklist, "execution checklist")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Copy Execution Checklist</button>
            <button onClick={() => { runGate({ armed: true }); setG({ decision: "manual_exec_attempt_dry" }); setNote("Запрос отправлен — gate в режиме dry-arm: executionPerformed=false (реальный запуск не вшит)."); }} className="rounded bg-amber-600/25 px-2 py-1 hover:bg-amber-600/40">Mark One Workflow Execution Completed</button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-tg-muted">Confirmation phrase:</span>
            <input value={gate.confirmPhrase} onChange={(e) => setG({ confirmPhrase: e.target.value })} placeholder="EXECUTE ONE WHITELISTED WORKFLOW" className="min-w-0 flex-1 rounded bg-black/40 px-2 py-1 text-tg-text" />
            {pill(phraseOk ? "valid" : "missing")}
          </div>
          {pfBlockers.length > 0 && <div className="rounded-lg bg-black/30 p-2 text-[10px] text-rose-200"><div className="font-bold">Preflight blockers:</div>{pfBlockers.map((c, i) => <div key={i}>• {c[0]} → {c[2]}</div>)}</div>}
          {gateResp && <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-[10px]"><div className="mb-1 text-[10px] font-black uppercase text-cyan-300/70">Executor Gate Response</div><div>mode: {gateResp.mode} · executionPerformed: {String(gateResp.executionPerformed)} · executionAllowed: {String(gateResp.executionAllowed)} · enabled(env): {String(gateResp.enabled)}</div><div className="text-tg-muted">{gateResp.reason}</div>{(gateResp.forbiddenNodes || []).length > 0 && <div className="text-rose-200">forbidden: {(gateResp.forbiddenNodes || []).map((n: AnyRec) => n.type).join(", ")}</div>}</div>}
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-2">
            <div className="mb-1 text-[10px] font-black uppercase text-amber-300/80">Controlled Execution</div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">{tile("N8N_EXECUTOR_ENABLED", String(execEnvEnabled), execEnvEnabled ? "Live" : "warning")}{tile("Execution mode", execMode, execEnvEnabled ? "Live" : "warning")}{tile("Preflight", pfResult, pfResult === "READY" ? "Live" : pfResult === "WARNING" ? "warning" : "Offline")}{tile("Forbidden", forbiddenN === null ? "run preflight" : forbiddenN, forbiddenN === 0 ? "Live" : forbiddenN === null ? "warning" : "Offline")}</div>
            {!execEnvEnabled && <div className="mt-1 text-[10px] text-amber-200">Исполнение отключено на сервере. Установи N8N_EXECUTOR_ENABLED=true для controlled execution. (Сначала Run Executor Preflight — чтобы определить статус env.)</div>}
            {execEnvEnabled && liveReady && <div className="mt-1 text-[10px] text-emerald-200">Готово к одному ручному запуску workflow.</div>}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input value={gate.confirmPhrase} onChange={(e) => setG({ confirmPhrase: e.target.value })} placeholder="EXECUTE ONE WHITELISTED WORKFLOW" className="min-w-0 flex-1 rounded bg-black/40 px-2 py-1 text-[11px] text-tg-text" />
              <button onClick={execOne} disabled={!liveReady} className={"rounded px-3 py-1.5 text-[12px] font-bold " + (liveReady ? "bg-rose-600/40 text-rose-50 hover:bg-rose-600/55" : "bg-zinc-700/30 text-tg-muted")}>Execute One Whitelisted Workflow</button>
            </div>
            {gateResp && gateResp.mode === "CONTROLLED_ONE_WORKFLOW_EXECUTION" && <div className="mt-1 rounded bg-black/30 p-2 text-[10px]"><div>executionPerformed: {String(gateResp.executionPerformed)} · status: {gateResp.status} · {gateResp.workflowName} · exec {gateResp.executionIdMasked || "—"} · {gateResp.durationMs}ms · evidence {gateResp.evidenceId}</div><div className="text-tg-muted">{gateResp.reason}</div></div>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2"><div className="mb-1 text-[10px] font-black uppercase text-cyan-300/70">Evidence Log ({evidence.length})</div><div className="max-h-40 space-y-0.5 overflow-auto">{evidence.map((ev, i) => <div key={i} className="text-[9px] text-tg-muted">{String(ev.timestamp).replace("T", " ").slice(0, 19)} · {ev.workflowName} · {ev.executionSummarySafe && ev.executionSummarySafe.status} · exec {ev.executionIdMasked || "—"} · {ev.evidenceId}</div>)}{evidence.length === 0 && <div className="text-[9px] text-tg-muted">Записей нет.</div>}</div></div>
          <div className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/5 p-2">
            <div className="mb-1 text-[10px] font-black uppercase text-fuchsia-300/80">Safe Webhook Trigger (надёжный путь)</div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">{tile("Mode", "SAFE_WEBHOOK_TRIGGER", "warning")}{tile("N8N_WEBHOOK_EXECUTOR_ENABLED", String(whEnvEnabled), whEnvEnabled ? "Live" : "warning")}{tile("Webhook URL", webhookResp ? (webhookResp.webhookUrlMasked || "—") : "Check Gate", webhookResp && webhookResp.webhookUrlMasked && webhookResp.webhookUrlMasked !== "—" ? "Live" : "warning")}{tile("Forbidden", whForbidden == null ? "check" : whForbidden, whForbidden === 0 ? "Live" : "Offline")}</div>
            <div className="mt-1 text-[9px] text-tg-muted">Test payload: mode=TEST_ONLY · source=DEEPINSIDE_EXECUTOR_GATE · runType=one_webhook_workflow · message=safe test payload (без секретов; запрещённые поля отфильтрованы на сервере).</div>
            {!whEnvEnabled && <div className="mt-1 text-[10px] text-amber-200">Webhook-исполнение отключено. Установи N8N_WEBHOOK_EXECUTOR_ENABLED=true и нажми Check Webhook Gate.</div>}
            {whReady && <div className="mt-1 text-[10px] text-emerald-200">Готово к одному безопасному webhook-запуску (test-only payload).</div>}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input value={gate.webhookPhrase || ""} onChange={(e) => setG({ webhookPhrase: e.target.value })} placeholder="TRIGGER ONE SAFE WEBHOOK WORKFLOW" className="min-w-0 flex-1 rounded bg-black/40 px-2 py-1 text-[11px] text-tg-text" />
              <button onClick={checkWebhook} className="rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20">Check Webhook Gate</button>
              <button onClick={triggerWebhook} disabled={!whReady} className={"rounded px-3 py-1.5 text-[12px] font-bold " + (whReady ? "bg-fuchsia-600/40 text-fuchsia-50 hover:bg-fuchsia-600/55" : "bg-zinc-700/30 text-tg-muted")}>Trigger One Safe Webhook Workflow</button>
            </div>
            {webhookResp && <div className="mt-1 rounded bg-black/30 p-2 text-[10px]"><div>executionPerformed: {String(webhookResp.executionPerformed)} · status: {webhookResp.status || "—"} · code {webhookResp.statusCode || "—"} · {webhookResp.durationMs != null ? webhookResp.durationMs + "ms" : ""} · {webhookResp.workflowName || ""}</div><div className="text-tg-muted">{webhookResp.reason}</div>{(webhookResp.blockedReasons || []).length > 0 && <div className="text-rose-200">blocked: {(webhookResp.blockedReasons || []).join(", ")}</div>}</div>}
            <div className="mt-1 text-[9px] text-tg-muted">Webhook Evidence ({webhookEvidence.length}) → deepinside.selfHostedStack.webhookExecutionEvidence.v1{webhookEvidence[0] ? (" · last " + webhookEvidence[0].evidenceId) : ""}</div>
          </div>
          <div className="text-[9px] text-tg-muted">Без N8N_EXECUTOR_ENABLED=true прямое исполнение не происходит; без N8N_WEBHOOK_EXECUTOR_ENABLED=true webhook-триггер не происходит. Даже с env — нужны whitelist + graph/executions inspected + ack + точная фраза + armed + forbidden=0. Один workflow, без retry/mass/background/schedule. Payload и секреты скрыты.</div>
        </div>}

        <div className="text-[9px] text-tg-muted">Read-only graph: запуск/повтор/активация/мутация workflow запрещены. Детали ошибок и payload — только в самом n8n UI.</div>
      </div>;
    })(),

    memory: <div className="space-y-3">
      <div className="text-[11px] text-tg-muted">Memory Layer — Qdrant (live collections) + per-agent (PG/Qdrant, mock-разбивка).</div>
      {on("qdrant") ? <div className="space-y-2"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{tile("Collections", (svc.qdrant.counts && svc.qdrant.counts.collections) ?? 0, "Live")}</div><div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{(svc.qdrant.collections || []).map((c: AnyRec) => <div key={c.name} className="rounded-lg border border-white/10 bg-black/30 p-2 text-[10px]"><div className="font-bold">{c.name}</div><div className="text-tg-muted">vectors: {c.vectors} · points: {c.points} · {c.status}</div></div>)}{(svc.qdrant.collections || []).length === 0 && <div className="text-[10px] text-tg-muted">Коллекций нет.</div>}</div></div> : <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-[11px] text-rose-200">Qdrant недоступен ({(svc.qdrant && svc.qdrant.reason) || "—"}).</div>}
      <div className="grid gap-2 sm:grid-cols-2">{AGENTS.map((a) => <div key={a} className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="mb-1 flex items-center justify-between"><span className="text-[11px] font-bold text-fuchsia-200">🧠 {a}</span>{pill("Mock")}</div><div className="flex flex-wrap gap-1">{MEMORY_PARTS.map((m) => <span key={m} className="rounded bg-black/30 px-1.5 py-0.5 text-[8px] text-tg-muted">{m}</span>)}</div></div>)}</div>
    </div>,

    runtime: <div className="space-y-3">
      <div className="text-[11px] text-tg-muted">Agent Runtime — Ollama (live модели). Pull/Unload/Delete — реальные локальные действия с подтверждением. Restart/Pause/Resume агентов — заглушки.</div>
      {on("ollama") ? <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{tile("Installed", (svc.ollama.counts && svc.ollama.counts.installed) ?? 0, "Live")}{tile("Running", (svc.ollama.counts && svc.ollama.counts.running) ?? 0, "Live")}</div>
        <div className="space-y-1">{(svc.ollama.installed || []).map((m: AnyRec) => { const isRun = (svc.ollama.running || []).some((r: AnyRec) => r.name === m.name); return <div key={m.name} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 text-[10px]"><span className="font-bold text-cyan-100">{m.name}</span>{pill(isRun ? "running" : "installed")}<span className="text-tg-muted">{m.param} · {m.family}</span><div className="ml-auto flex gap-1"><button onClick={() => ollamaAct("unload", m.name)} className="rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20">unload</button><button onClick={() => ollamaAct("delete", m.name)} className="rounded bg-rose-600/20 px-1.5 py-0.5 text-rose-200 hover:bg-rose-600/35">delete</button></div></div>; })}</div>
        <button onClick={() => { const m = window.prompt("Pull model (e.g. qwen2.5-coder:7b):", "qwen2.5-coder:7b"); if (m) ollamaAct("pull", m); }} className="rounded bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">Pull Model</button>
      </div> : <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-[11px] text-rose-200">Ollama недоступен ({(svc.ollama && svc.ollama.reason) || "—"}).</div>}
      <div className="grid gap-2 sm:grid-cols-2">{AGENTS.map((a, i) => <div key={a} className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="flex items-center gap-2"><span className="text-[11px] font-bold">{a}</span>{pill(i === 0 ? "active" : "idle")}<span className="ml-auto text-[8px] text-tg-muted">provider: Ollama</span></div><div className="mt-1 flex gap-1">{["Restart", "Pause", "Resume"].map((b) => <button key={b} onClick={() => setNote(a + ": " + b + " — mock (агент-рантайм не подключён к реальному исполнителю)")} className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] hover:bg-white/20">{b}</button>)}</div></div>)}</div>
    </div>,

    mcp: <div className="space-y-3"><div className="text-[11px] text-tg-muted">MCP Hub — реестр коннекторов (статусы mock; живое подключение — отдельный слой).</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{MCP_LIST.map((m) => card(m[0], "MCP connector", m[1]))}</div></div>,

    media: <div className="space-y-3"><div className="text-[11px] text-tg-muted">Media Factory — состояние сервисов (Ready / Offline / Mock).</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{MEDIA_LIST.map((m) => card(m[0], "media service", m[1]))}</div></div>,

    telegram: <div className="space-y-3"><div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-[10px] text-amber-200">⚠️ Только инфраструктура и визуализация. Автопубликаций и реальных Telegram-действий нет.</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{TELEGRAM_PARTS.map((p) => tile(p, "mock", p === "Publisher" || p === "Approval" ? "Manual" : "Ready"))}</div></div>,

    storage: <div className="space-y-3">
      <div className="text-[11px] text-tg-muted">Storage — Redis / MinIO / Qdrant / PostgreSQL (live).</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {card("Redis", "queue / cache", svcPill("redis"), on("redis") ? <div className="grid grid-cols-2 gap-1">{tile("keys", svc.redis.keys)}{tile("memory", svc.redis.memory)}{tile("clients", svc.redis.connections)}{tile("ops/s", svc.redis.ops)}</div> : <div className="text-[9px] text-rose-200/70">{(svc.redis && svc.redis.reason) || "—"}</div>)}
        {card("MinIO", "object storage", svcPill("minio"), on("minio") ? <div className="text-[9px] text-tg-muted">health: {svc.minio.health}</div> : <div className="text-[9px] text-rose-200/70">{(svc.minio && svc.minio.reason) || "—"}</div>)}
        {card("Qdrant", "vectors", svcPill("qdrant"), on("qdrant") ? tile("collections", (svc.qdrant.counts && svc.qdrant.counts.collections) ?? 0) : <div className="text-[9px] text-rose-200/70">{(svc.qdrant && svc.qdrant.reason) || "—"}</div>)}
        {card("PostgreSQL", "state", svcPill("postgres"), on("postgres") ? <div className="grid grid-cols-2 gap-1">{tile("databases", svc.postgres.databases)}{tile("tables", svc.postgres.tables)}{tile("connections", svc.postgres.connections)}{tile("size", svc.postgres.size)}</div> : <div className="text-[9px] text-rose-200/70">{(svc.postgres && svc.postgres.reason) || "—"}</div>)}
      </div>
    </div>,

    analytics: <div className="space-y-3">
      <div className="text-[11px] text-tg-muted">Observability — host-метрики (live) + System Map.</div>
      {on("host") ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{tile("CPU", svc.host.cpuCount + " cores · load " + svc.host.load1, "Live")}{tile("RAM", svc.host.memUsedGB + " / " + svc.host.memTotalGB + " GB (" + svc.host.memUsedPct + "%)", "Live")}{tile("GPU", svc.host.gpu ? (svc.host.gpu.util + " · " + svc.host.gpu.memUsed) : "n/a", svc.host.gpu ? "Live" : "Offline")}{tile("Uptime", svc.host.uptimeH + " h", "Live")}{tile("Health Score", (live && live.healthScore) + "%", "Live")}{tile("Containers", (svc.docker && svc.docker.counts) ? (svc.docker.counts.running + " / " + svc.docker.counts.containers) : "—", on("docker") ? "Live" : "Offline")}{tile("Workflows", svc.n8n && svc.n8n.executions != null ? svc.n8n.executions : "—", on("n8n") ? "Live" : "Offline")}{tile("Agents", AGENTS.length, "Live")}</div> : <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-[11px] text-rose-200">Host-метрики недоступны ({backendOff ? "backend offline" : "—"}).</div>}
      {systemMapBlock}
    </div>,

    settings: <div className="space-y-3">
      <div className="text-[11px] text-tg-muted">Settings — конфигурация (визуализация). Реальные ключи не вводятся и не отображаются; читаются только из env на бэкенде.</div>
      {card("AI Router", "local Ollama + external providers (Disabled by default)", svcPill("ollama"), <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">{[["Ollama", svcPill("ollama")] as [string, string]].concat(PROVIDERS).map((p) => tile(p[0], p[1]))}</div>)}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] font-black uppercase text-cyan-300/70">Safety</div><div className="grid grid-cols-1 gap-0.5 text-[9px]">{Object.keys(SAFETY).map((k) => { const v = (SAFETY as AnyRec)[k]; return <div key={k} className="flex items-center justify-between"><span className="text-tg-muted">{k}</span><span style={{ color: (v === false || k === "mode" || k === "monitoringReadOnly" || k === "controlRequiresConfirmation") ? "#86efac" : (v === true ? "#fca5a5" : "#86efac") }}>{String(v)}</span></div>; })}</div></div>
      <div className="text-[9px] text-tg-muted">Деплой: infra/self-hosted-ai/ (docker compose). Live-данные: GET /api/infra/status (read-only). Управление Docker/Ollama — POST с operatorConfirmed.</div>
    </div>
  };

  return <div className="fixed inset-0 z-[95] flex flex-col text-tg-text" style={{ background: "linear-gradient(160deg,#060814,#0a0c1a 55%,#070710)" }}>
    <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
      <div className="flex items-center gap-2"><span className="text-sm font-black text-cyan-200">🧬 SELF-HOSTED AI STACK</span>{live ? pill("LIVE " + live.healthScore + "%") : pill(loading ? "loading" : backendOff ? "backend offline" : "—")}<span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">MANUAL_ONLY</span></div>
      <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-[12px] hover:bg-white/20">✕ Закрыть</button>
    </header>
    <div className="flex min-h-0 flex-1">
      <nav className="w-44 shrink-0 space-y-0.5 overflow-auto border-r border-white/10 p-2">
        {SECTIONS.map(([k, label]) => <button key={k} onClick={() => setSec(k)} className={"block w-full rounded-lg px-2 py-1.5 text-left text-[12px] " + (sec === k ? "bg-cyan-600/30 font-semibold text-cyan-100" : "text-tg-muted hover:bg-white/10")}>{label}</button>)}
        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[9px] text-amber-200">read-only monitor · no real send · no secrets</div>
      </nav>
      <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-5xl space-y-3">
        {backendOff && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">API-бэкенд недоступен на :8788. Запусти `npm run api:dev` — live-данные появятся автоматически.</div>}
        {note && <div className="rounded-lg bg-white/5 p-2 text-[11px] text-cyan-200">{note}</div>}
        {sections[sec]}
      </div></main>
    </div>
  </div>;
}
