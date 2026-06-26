"use client";

// GLOBAL AI OPERATOR SIDEBAR — advisory-only operator assist for the whole control panel.
// ADDITIVE. Reads ONLY safe frontend state (window.location, localStorage, the already-used
// /api/telegram/status endpoint). NEVER sends, never calls live-send endpoints, never shows
// secrets/session/phone/token/api_id/api_hash/env. Rule-based next-action engine, local chat
// (no external LLM calls). Navigation is hash + CustomEvent only. RU-first via i18n (EN/UA switch).

import { useEffect, useState } from "react";
import { t, useLocale } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

type AnyRec = Record<string, any>;

const LSK = "deepinside.aiOperator.sidebar.v1";
const SAFETY = { mode: "MANUAL_ONLY", assistantOnly: true, advisoryOnly: true, oneMessageOnly: true, autoSendAllowed: false, backgroundSendAllowed: false, retryWithoutConfirmAllowed: false, massSendAllowed: false, sendWithoutApprovalAllowed: false, sendWithoutWhitelistAllowed: false, secretsVisible: false, credentialsExportAllowed: false, externalNetworkScanAllowed: false, autonomousActionsAllowed: false };

const OS_SECTIONS = ["command", "operator", "livepilot", "livewizard", "runbook", "dryrun", "postlive", "liveprep", "targets", "ownedaccounts", "opanalytics"];

const CMD = {
  build: "npm run build",
  buildLog: "npm run build 2>&1 | Tee-Object .\\build-final.log\n\"BUILD_LASTEXITCODE:$LASTEXITCODE\"",
  api: "curl.exe http://127.0.0.1:8788/operator/analytics/status",
  ollama: "curl.exe http://127.0.0.1:11434/api/tags",
  webdev: "npm run dev",
  apidev: "npm run api:dev",
  clearCache: "Remove-Item -Recurse -Force .\\apps\\web\\.next -ErrorAction SilentlyContinue"
};

function load<T>(k: string, def: T): T { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch { return def; } }
function save(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

export function GlobalAIOperatorSidebar() {
  const loc = useLocale();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const [tick, setTick] = useState(0);
  const [tgReady, setTgReady] = useState<boolean | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<AnyRec[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setMounted(true);
    const st = load<AnyRec>(LSK, {} as AnyRec);
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    setOpen(typeof st.isOpen === "boolean" ? st.isOpen : !isMobile);
    setChat(Array.isArray(st.chatHistory) ? st.chatHistory : []);
    const onHash = () => setTick((t2) => t2 + 1);
    window.addEventListener("hashchange", onHash);
    const id = setInterval(() => setTick((t2) => t2 + 1), 2500);
    fetch("/api/telegram/status", { cache: "no-store" })
      .then((r) => { if (r.status === 503 || !r.ok) { setTgReady(false); return null; } return r.json().catch(() => null); })
      .then((j) => { if (j) setTgReady(!(j.ready === false || j.tdlibReady === false || j.systemState === "OFFLINE" || j.status === "OFFLINE")); })
      .catch(() => setTgReady(false));
    return () => { window.removeEventListener("hashchange", onHash); clearInterval(id); };
  }, []);

  const persist = (patch: AnyRec) => { const cur = load<AnyRec>(LSK, {} as AnyRec); save(LSK, { ...cur, ...patch, mode: "RULE_BASED_LOCAL", safety: SAFETY, lastChangedAt: new Date().toISOString() }); };
  const toggle = () => { const v = !open; setOpen(v); persist({ isOpen: v }); };
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };
  const copy = (txt: string, label: string) => { try { navigator.clipboard.writeText(txt); } catch {} persist({ lastCopiedPrompt: label }); flash(t("sb.copy", loc) + ": " + label); };

  // ---- safe context (read each render; localStorage + window only) ----
  const path = mounted && typeof window !== "undefined" ? window.location.pathname : "/agents";
  const hash = mounted && typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
  const pre = load<AnyRec | null>("deepinside.livePrep.preflight.v1", null);
  const checks: AnyRec = (pre && pre.checks) || {};
  const matrix: AnyRec = (load<AnyRec[]>("deepinside.livePrep.agentBindingMatrix.v1", [])[0]) || {};
  const accs = load<AnyRec[]>("deepinside.livePrep.accountSlots.v1", []);
  const tgts = load<AnyRec[]>("deepinside.livePrep.targets.v1", []);
  const rb = load<AnyRec | null>("deepinside.livePrep.firstLiveRunbook.v1", null);
  const modelG = load<AnyRec>("deepinside.livePrep.localModelGate.v1", {} as AnyRec);
  const sectionName = OS_SECTIONS.indexOf(hash) >= 0 ? t("section." + hash, loc) : (path.indexOf("/agents") >= 0 ? "Agent Registry" : path);
  const agentName = matrix.agent || (accs[0] && accs[0].boundAgent) || "NOVIKOVA";
  const accAlias = matrix.accountSlot || (accs[0] && accs[0].accountAlias) || "—";
  const tgtAlias = matrix.target || (tgts[0] && tgts[0].targetAlias) || "—";
  const readiness = pre && typeof pre.readiness === "number" ? pre.readiness : 0;
  const localModelStatus = modelG.status || "unknown";
  const aiMode = localModelStatus === "ready" ? "LOCAL_MODEL_READY" : "RULE_BASED_LOCAL";

  const accFull = !!(checks.accountSlotReady && checks.accountSessionReady && checks.accountVerified && checks.accountWhitelisted && checks.agentBoundToAccount);
  const tgtFull = !!(checks.targetVerified && checks.targetWhitelisted && checks.agentBoundToTarget && checks.campaignAttached);
  const runbookFull = !!(rb && rb.frozen && rb.evidenceVerified && rb.manualGateArmed);

  // gates: [i18nKey, status, reason(RU operator hint)]
  const gates: [string, string, string][] = [
    ["gate.build", checks.buildGatePassed ? "passed" : "blocked", checks.buildGatePassed ? "сборка отмечена успешной" : "сборка ещё не отмечена успешной"],
    ["gate.localModel", checks.localModelReady ? "passed" : "blocked", checks.localModelReady ? "модель готова (" + (modelG.selectedProvider || "—") + ")" : "локальная модель ещё не готова"],
    ["gate.account", accFull ? "passed" : "blocked", accFull ? "аккаунт готов и привязан" : "аккаунт не доведён (session/verify/whitelist/bind)"],
    ["gate.target", tgtFull ? "passed" : "blocked", tgtFull ? "цель verified+whitelisted+linked" : "цель ещё не доведена"],
    ["gate.binding", (accFull && tgtFull) ? "passed" : "blocked", (accFull && tgtFull) ? "матрица привязки готова" : "матрица привязки не готова"],
    ["gate.runbook", runbookFull ? "passed" : (rb ? "warning" : "blocked"), runbookFull ? "frozen+evidence+armed" : (rb ? "runbook создан, не завершён" : "runbook ещё не создан")],
    ["gate.preflight", pre && pre.result === "READY" ? "passed" : (checks.buildGatePassed ? "warning" : "blocked"), pre ? ("readiness " + readiness + "% · " + (pre.result || "—")) : "снапшот preflight отсутствует"],
    ["gate.manualConfirmation", checks.confirmationPhraseEntered ? "passed" : "blocked", checks.confirmationPhraseEntered ? "фраза введена" : "фраза подтверждения не введена"],
    ["gate.telegramRuntime", tgReady === true ? "passed" : tgReady === false ? "blocked" : "unknown", tgReady === true ? "TDLib готов" : tgReady === false ? "Telegram Runtime не готов" : "статус неизвестен"]
  ];

  const nextAction = (): string => {
    if (tgReady === false) return "Telegram Runtime не готов. Не переходи к live-прогону. Build и Local Model можно закрыть, но Account/Target/Runbook не считай готовыми.";
    if (!checks.buildGatePassed) return "Открой Live Prep → нажми Mark Build Passed (после BUILD_LASTEXITCODE:0).";
    if (!checks.localModelReady) return "Выбери Ollama 11434 и Mark Local Model Ready (после ответа curl /api/tags).";
    if (!checks.accountSlotReady) return "Добавь Account Slot для AI MUSIC PUBLIC (только alias).";
    if (!accFull) return "Доведи аккаунт: Session Ready → Verify → Whitelist → Bind To Agent NOVIKOVA.";
    if (tgts.length === 0) return "Добавь whitelisted Telegram target (alias).";
    if (!tgtFull) return "Доведи target: Verified → Whitelisted → Link Agent → Link Campaign.";
    if (!rb) return "Создай First Live Runbook.";
    if (!runbookFull) return "Runbook: Freeze Payload → Verify Evidence → Arm Manual Gate.";
    if (!checks.confirmationPhraseEntered) return "Введи точную фразу подтверждения: SEND ONE LIVE MESSAGE.";
    return "Готово к ручному one-message прогону. Реальная отправка — только вручную. Авто-send запрещён.";
  };
  const blocker = gates.find((g) => g[1] === "blocked");
  const na = nextAction();

  const claudePrompt = (): string => [
    "DEEPINSIDE control panel context (UI-assist, no secrets):",
    "route: " + path + (hash ? "#" + hash : ""),
    "section: " + sectionName,
    "agent: " + agentName + " · account(alias): " + accAlias + " · target(alias): " + tgtAlias,
    "readiness: " + readiness + "%",
    "gates: " + gates.map((g) => t(g[0], "en") + "=" + g[1]).join(", "),
    "blocker: " + (blocker ? t(blocker[0], "en") + " — " + blocker[2] : "none"),
    "next safe action: " + na,
    "Constraints: MANUAL_ONLY, one message only, no autoSend/massSend/background, no secrets/session/token/api_id/api_hash."
  ].join("\n");

  const navTo = (key: string) => { try { window.location.hash = "#" + key; window.dispatchEvent(new CustomEvent("deepinside:navigate", { detail: key })); } catch {} flash(t("sb.open", loc) + ": " + t("section." + key, loc, key)); };

  const pushChat = (role: string, text: string) => { setChat((prev) => { const next = [...prev, { role, text, at: new Date().toISOString() }].slice(-50); persist({ chatHistory: next }); return next; }); };
  const answer = (q: string): string => {
    const s = q.toLowerCase();
    if (s.indexOf("blocker") >= 0 || s.indexOf("блок") >= 0) return blocker ? ("Заблокировано: " + t(blocker[0], loc) + " — " + blocker[2] + ". " + na) : "Блокеров нет. " + na;
    if (s.indexOf("next") >= 0 || s.indexOf("след") >= 0 || s.indexOf("нажать") >= 0 || s.indexOf("дал") >= 0) return na;
    if (s.indexOf("screen") >= 0 || s.indexOf("экран") >= 0 || s.indexOf("explain") >= 0) return sectionName + " (route " + path + (hash ? "#" + hash : "") + "). " + na;
    if (s.indexOf("state") >= 0 || s.indexOf("состоян") >= 0 || s.indexOf("summary") >= 0 || s.indexOf("сводк") >= 0) return "Readiness " + readiness + "%. " + gates.map((g) => t(g[0], loc) + "=" + g[1]).join(", ") + ". " + na;
    if (s.indexOf("runbook") >= 0 || s.indexOf("чеклист") >= 0) return "Build → Local Model → Account → Target → Binding → Runbook(Freeze/Evidence/Arm) → Preflight READY → SEND ONE LIVE MESSAGE. " + na;
    return t("sb.intro", loc) + " " + na;
  };
  const send = () => { const q = chatInput.trim(); if (!q) return; pushChat("user", q); const a = answer(q); setChatInput(""); setTimeout(() => pushChat("ai", a), 60); };
  const quick = (q: string) => { pushChat("user", q); const a = answer(q); setTimeout(() => pushChat("ai", a), 60); };

  if (!mounted) return null;

  const pillCol = (st: string) => st === "passed" ? "#4ade80" : st === "warning" ? "#fbbf24" : st === "unknown" ? "#9ca3af" : "#f87171";
  const allPassed = gates.every((g) => g[1] === "passed");
  const headColor = tgReady === false ? "#f87171" : (pre && pre.result === "BLOCKED") ? "#fbbf24" : allPassed ? "#4ade80" : "#fbbf24";

  if (!open) {
    return <button onClick={toggle} aria-label="AI Operator" className="fixed bottom-4 right-4 z-[130] rounded-full border border-cyan-400/50 bg-gradient-to-r from-cyan-600/40 to-fuchsia-600/35 px-4 py-2 text-sm font-black text-cyan-50 shadow-lg backdrop-blur hover:from-cyan-600/55">🤖 {t("sb.title", loc)}</button>;
  }

  const card = (title: string, body: any) => <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="mb-1 text-[9px] font-black uppercase tracking-wide text-cyan-300/70">{title}</div>{body}</div>;
  const cmdBlock = (label: string, cmd: string) => <div className="rounded-lg border border-white/10 bg-black/50 p-1.5"><div className="mb-0.5 flex items-center justify-between"><span className="text-[9px] text-tg-muted">{label}</span><button onClick={() => copy(cmd, label)} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] hover:bg-white/20">{t("sb.copy", loc)}</button></div><pre className="overflow-auto whitespace-pre-wrap break-all font-mono text-[9px] text-emerald-200">{cmd}</pre></div>;

  return <aside className="fixed right-0 top-0 z-[130] flex h-full w-[360px] max-w-[92vw] flex-col border-l border-white/10 text-tg-text shadow-2xl backdrop-blur" style={{ background: "linear-gradient(160deg,rgba(7,6,17,.97),rgba(12,10,22,.97))" }}>
    <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
      <span className="text-sm font-black" style={{ color: headColor }}>🤖 {t("sb.title", loc)}</span>
      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold text-emerald-300">MANUAL_ONLY</span>
      <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[8px] font-bold text-cyan-300">{aiMode}</span>
      <button onClick={toggle} className="ml-auto rounded bg-white/10 px-2 py-0.5 text-[11px] hover:bg-white/20">✕</button>
      <div className="w-full"><LanguageSwitcher /></div>
    </header>
    <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
      {toast && <div className="rounded bg-emerald-600/20 p-1.5 text-[10px] text-emerald-200">{toast}</div>}
      {tgReady === false && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-[10px] text-rose-200">⚠️ {t("warn.tgNotReady", loc)}</div>}

      {card(t("sb.currentScreen", loc), <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between"><span className="text-tg-muted">{t("sb.route", loc)}</span><span className="font-mono">{path}{hash ? "#" + hash : ""}</span></div>
        <div className="flex justify-between"><span className="text-tg-muted">{t("sb.section", loc)}</span><span className="font-bold text-cyan-200">{sectionName}</span></div>
        <div className="flex justify-between"><span className="text-tg-muted">{t("sb.agent", loc)}</span><span>{agentName}</span></div>
        <div className="flex justify-between"><span className="text-tg-muted">{t("sb.account", loc)}</span><span>{accAlias}</span></div>
        <div className="flex justify-between"><span className="text-tg-muted">{t("sb.target", loc)}</span><span>{tgtAlias}</span></div>
        <div className="flex justify-between"><span className="text-tg-muted">{t("sb.readiness", loc)}</span><span className="font-bold" style={{ color: headColor }}>{readiness}%</span></div>
        <div className="flex justify-between"><span className="text-tg-muted">{t("sb.localModel", loc)}</span><span>{localModelStatus}</span></div>
        <div className="flex justify-between"><span className="text-tg-muted">{t("sb.telegram", loc)}</span><span>{tgReady === true ? t("st.ready", loc) : tgReady === false ? t("st.notReady", loc) : t("st.unknown", loc)}</span></div>
      </div>)}

      {card(t("sb.nextAction", loc), <div className="space-y-1">
        {blocker && <div className="text-[10px] text-rose-200">{t("sb.blocker", loc)}: <b>{t(blocker[0], loc)}</b> — {blocker[2]}</div>}
        <div className="rounded bg-black/30 p-1.5 text-[11px] text-amber-100">{na}</div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => copy(na, "Next Action")} className="rounded bg-white/10 px-2 py-0.5 text-[9px] hover:bg-white/20">{t("sb.copyAction", loc)}</button>
          <button onClick={() => copy(claudePrompt(), "Claude Prompt")} className="rounded bg-cyan-600/25 px-2 py-0.5 text-[9px] hover:bg-cyan-600/40">{t("sb.copyClaude", loc)}</button>
        </div>
      </div>)}

      {card(t("sb.gateInspector", loc), <div className="space-y-0.5">
        {gates.map((g) => <div key={g[0]} className="flex items-center justify-between gap-1 text-[10px]"><span className="text-tg-muted">{t(g[0], loc)}</span><span className="rounded px-1.5 py-0.5 text-[8px] font-bold" style={{ background: pillCol(g[1]) + "22", color: pillCol(g[1]) }} title={g[2]}>{t("st." + g[1], loc)}</span></div>)}
      </div>)}

      {card(t("sb.quickActions", loc), <div className="grid grid-cols-2 gap-1 text-[9px]">
        <button onClick={() => quick("Объясни этот экран")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("sb.explainScreen", loc)}</button>
        <button onClick={() => quick("Покажи блокеры")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("sb.showBlockers", loc)}</button>
        <button onClick={() => copy(claudePrompt(), "current state")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("sb.copyState", loc)}</button>
        <button onClick={() => copy(claudePrompt(), "Claude fix prompt")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("sb.copyClaude", loc)}</button>
        <button onClick={() => navTo("liveprep")} className="rounded bg-emerald-600/20 px-2 py-1 hover:bg-emerald-600/35">{t("nav.openLivePrep", loc)}</button>
        <button onClick={() => navTo("dryrun")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("nav.openDryRun", loc)}</button>
        <button onClick={() => navTo("postlive")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("nav.openPostLive", loc)}</button>
        <button onClick={() => navTo("ownedaccounts")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("nav.openAccounts", loc)}</button>
        <button onClick={() => navTo("targets")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("nav.openTargets", loc)}</button>
        <button onClick={() => navTo("runbook")} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("nav.openRunbook", loc)}</button>
      </div>)}

      {card(t("sb.terminalCommands", loc), <div className="space-y-1">
        {cmdBlock(t("gate.build", loc), CMD.build)}
        {cmdBlock(t("gate.build", loc) + " + log", CMD.buildLog)}
        {cmdBlock("API", CMD.api)}
        {cmdBlock("Ollama", CMD.ollama)}
        {cmdBlock("Web dev", CMD.webdev)}
        {cmdBlock("API dev", CMD.apidev)}
        {cmdBlock("Next cache", CMD.clearCache)}
      </div>)}

      {card(t("sb.safetyInspector", loc), <div className="grid grid-cols-1 gap-0.5 text-[9px]">
        {Object.keys(SAFETY).map((k) => { const v = (SAFETY as AnyRec)[k]; return <div key={k} className="flex items-center justify-between"><span className="text-tg-muted">{k}</span><span style={{ color: (v === false || k === "mode" || ((k === "oneMessageOnly" || k === "assistantOnly" || k === "advisoryOnly") && v === true)) ? "#86efac" : (v === true ? "#fca5a5" : "#86efac") }}>{String(v)}</span></div>; })}
      </div>)}

      {card(t("sb.chat", loc), <div className="space-y-1">
        <div className="max-h-40 space-y-1 overflow-auto rounded bg-black/30 p-1.5">
          {chat.length === 0 && <div className="text-[10px] text-tg-muted">{t("sb.intro", loc)}</div>}
          {chat.map((m, i) => <div key={i} className={"text-[10px] " + (m.role === "user" ? "text-cyan-200" : "text-amber-100")}><b>{m.role === "user" ? t("sb.you", loc) : t("sb.ai", loc)}:</b> {m.text}</div>)}
        </div>
        <div className="flex gap-1">
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder={t("q.whatNext", loc)} className="min-w-0 flex-1 rounded bg-black/40 px-2 py-1 text-[10px] text-tg-text" />
          <button onClick={send} className="rounded bg-cyan-600/25 px-2 py-1 text-[10px] hover:bg-cyan-600/40">→</button>
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => quick("Что заблокировано?")} className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] hover:bg-white/20">{t("q.whatBlocked", loc)}</button>
          <button onClick={() => quick("Что нажать дальше?")} className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] hover:bg-white/20">{t("q.whatNext", loc)}</button>
          <button onClick={() => quick("Сводка состояния")} className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] hover:bg-white/20">{t("q.summary", loc)}</button>
          <button onClick={() => quick("Чеклист runbook")} className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] hover:bg-white/20">{t("q.runbook", loc)}</button>
        </div>
      </div>)}

      <div className="text-[8px] text-tg-muted">{t("sb.advisory", loc)}</div>
    </div>
  </aside>;
}
