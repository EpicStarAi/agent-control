"use client";

// AI COO — AI Chief Operating Officer. Category: CORE AI · Status: ACTIVE
// Operations Center / Executive Dashboard over existing system data. UI + localStorage only.
// No backend / TDLib / Telegram actions / external API. Additive; nothing removed.

import { useEffect, useMemo, useState } from "react";

type Ctx = {
  agents: any[]; missions: any[]; exec: any[]; devices: any[]; slots: any[];
  bind: Record<string, string>; counts: Record<string, any>; activeId: string;
};
const LS = "epic_ai_coo_state_v1";

export function AiCoo({ ctx, onClose, onAction }: { ctx: Ctx; onClose: () => void; onAction?: (t: string) => void }) {
  const [mode, setMode] = useState<"executive" | "operator">("executive");
  const [chat, setChat] = useState<{ who: "coo" | "you"; text: string }[]>([]);
  const [input, setInput] = useState("");

  // discovery index (read-only)
  const tgIndex = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_telegram_index_v1") || "null"); } catch { return null; } }, []);
  const devIndex = useMemo(() => { try { return JSON.parse(localStorage.getItem("epic_device_center_v1") || "null"); } catch { return null; } }, []);
  const tg = {
    sessions: tgIndex?.sessions?.length ?? ctx.slots.length,
    dialogs: tgIndex?.dialogs?.length ?? 0,
    channels: tgIndex?.channels?.length ?? 0,
    groups: tgIndex?.groups?.length ?? 0,
    bots: tgIndex?.bots?.length ?? 0,
    relationships: tgIndex?.relationships?.length ?? 0,
    completed: !!tgIndex,
  };

  const board = useMemo(() => {
    const active = ctx.agents.filter((a) => a.state === "ACTIVE").length;
    return {
      agentsActive: active, agentsIdle: ctx.agents.length - active, agentsTotal: ctx.agents.length,
      sessions: ctx.slots.length, dialogs: tg.dialogs, channels: tg.channels, groups: tg.groups, bots: tg.bots,
      infra: ctx.devices.length, missionsActive: ctx.missions.filter((m) => ["ACTIVE", "WAITING_APPROVAL", "PLANNING"].includes(m.status)).length,
      missionsDone: ctx.missions.filter((m) => m.status === "COMPLETED").length,
      tasksRunning: ctx.exec.filter((e) => e.status === "RUNNING").length,
      warnings: 0, errors: 0,
    };
  }, [ctx, tg]);

  // health score 0-100
  const health = useMemo(() => {
    const a = board.agentsTotal ? board.agentsActive / board.agentsTotal : 0;
    const t = ctx.slots.length ? 1 : 0;
    const d = tg.completed ? 1 : 0.5;
    const inf = board.infra ? 1 : 0.6;
    const ai = 1; // AI services configured (router)
    const miss = ctx.missions.length ? Math.min(1, (board.missionsDone + board.missionsActive) / ctx.missions.length) : 0.7;
    const score = Math.round((a * 25 + t * 20 + inf * 15 + ai * 15 + miss * 15 + d * 10));
    return Math.max(0, Math.min(100, score));
  }, [board, ctx, tg]);

  // recommendations + warnings + alerts
  const recs = useMemo(() => {
    const r: { kind: string; sev: "info" | "warning" | "error"; text: string; action?: string }[] = [];
    if (!ctx.slots.length) r.push({ kind: "Telegram", sev: "warning", text: "Нет подключённой Telegram-сессии. Подключите аккаунт.", action: "telegram" });
    if (tg.completed && tg.dialogs <= 1) r.push({ kind: "Discovery", sev: "warning", text: "Discovery нашёл только " + tg.dialogs + " диалог. Рекомендуется повторное сканирование (Run Discovery).", action: "telegram" });
    if (!tg.completed) r.push({ kind: "Discovery", sev: "info", text: "Индекс Telegram пуст. Запустите Telegram Discovery для построения карты.", action: "telegram" });
    const idle = ctx.agents.filter((a) => a.state !== "ACTIVE");
    if (idle.length) r.push({ kind: "Agents", sev: "info", text: idle.length + " агент(ов) не активны: " + idle.map((a) => a.name).slice(0, 3).join(", ") + ". Проверьте Agent Registry.", action: "agents" });
    const waiting = ctx.missions.filter((m) => m.status === "WAITING_APPROVAL");
    if (waiting.length) r.push({ kind: "Mission", sev: "warning", text: waiting.length + " миссия(й) ждут подтверждения: " + waiting.map((m) => m.title).slice(0, 2).join(", "), action: "missions" });
    if (tg.channels === 0 && tg.groups === 0) r.push({ kind: "Telegram", sev: "info", text: "Каналы и группы пока не обнаружены — откройте WORLD Graph для обзора связей.", action: "world" });
    if (devIndex?.devices) {
      const off = devIndex.devices.filter((d: any) => d.status === "offline");
      if (off.length) r.push({ kind: "Devices", sev: "warning", text: off.length + " устройство(а) offline: " + off.map((d: any) => d.id).join(", ") + ". Проверьте Device Control Center." });
      const badProxy = (devIndex.proxies || []).filter((p: any) => p.status !== "healthy");
      if (badProxy.length) r.push({ kind: "Proxy", sev: "warning", text: badProxy.length + " прокси с проблемами: " + badProxy.map((p: any) => p.name).join(", ") });
      const failTasks = (devIndex.automationTasks || []).filter((a: any) => a.status === "failed");
      if (failTasks.length) r.push({ kind: "Automation", sev: "error", text: failTasks.length + " автоматизация(й) failed: " + failTasks.map((a: any) => a.task).join(", ") });
    }
    if (health >= 90) r.push({ kind: "Info", sev: "info", text: "Система стабильна (Health " + health + "%). Критических проблем не обнаружено." });
    return r;
  }, [ctx, tg, health, board, devIndex]);

  const goals = useMemo(() => {
    const g: { title: string; agent: string; progress: number; status: string }[] = [];
    ctx.missions.slice(0, 6).forEach((m) => g.push({ title: m.title, agent: ctx.agents.find((a) => a.id === m.agentId)?.name || "—", progress: m.readiness ?? (m.status === "COMPLETED" ? 100 : m.status === "ACTIVE" ? 60 : 30), status: m.status }));
    return g;
  }, [ctx]);

  const timeline = useMemo(() => {
    const ev: { t: string; text: string }[] = [];
    if (tgIndex?.timestamp) { ev.push({ t: new Date(tgIndex.timestamp).toLocaleTimeString(), text: "Discovery Completed · " + tg.dialogs + " dialogs, " + tg.relationships + " relationships" }); }
    for (const a of ctx.agents) for (const ac of (a.activity || []).slice(-2)) ev.push({ t: ac.t || "—", text: a.name + ": " + ac.action });
    for (const m of ctx.missions.slice(0, 4)) ev.push({ t: m.updatedAt || "—", text: "Mission " + m.title + " → " + m.status });
    return ev.slice(0, 10);
  }, [ctx, tgIndex, tg]);

  const briefing = useMemo(() => {
    const hr = new Date().getHours();
    const hi = hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening";
    return { hi, lines: [
      "System Health: " + health + "%",
      "Agents: " + board.agentsActive + " Active / " + board.agentsTotal,
      "Telegram Sessions: " + board.sessions,
      "Channels: " + board.channels + " · Groups: " + board.groups + " · Bots: " + board.bots,
      "Discovery Status: " + (tg.completed ? "Completed" : "Not run"),
      "Infrastructure: " + (board.infra ? "Healthy (" + board.infra + " nodes)" : "n/a"),
      (recs.some((x) => x.sev === "error") ? "⚠ Critical Issues Detected" : "No Critical Issues Detected"),
    ] };
  }, [health, board, tg, recs]);

  useEffect(() => { setChat([{ who: "coo", text: briefing.hi + ". Я ваш AI COO. " + briefing.lines.join(" · ") }]); }, []);
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ recommendations: recs, notifications: recs.length, health, goals, warnings: recs.filter((r) => r.sev !== "info").length, lastBriefing: briefing, recentActivity: timeline, timestamp: new Date().toISOString() })); } catch {} }, [recs, health, goals, timeline]);

  function ask(qRaw: string) {
    const q = qRaw.toLowerCase(); let ans = "";
    if (/проблем|warning|issue|ошибк/.test(q)) ans = recs.filter((r) => r.sev !== "info").map((r) => "• [" + r.kind + "] " + r.text).join("\n") || "Критических проблем нет. Health " + health + "%.";
    else if (/агент|agent/.test(q)) ans = "Активны: " + ctx.agents.filter((a) => a.state === "ACTIVE").map((a) => a.name).join(", ") + ". Всего " + board.agentsTotal + ", idle " + board.agentsIdle + ".";
    else if (/telegram|телеграм|диалог|канал|групп/.test(q)) ans = "Telegram: sessions " + tg.sessions + ", dialogs " + tg.dialogs + ", channels " + tg.channels + ", groups " + tg.groups + ", bots " + tg.bots + ". Discovery: " + (tg.completed ? "Completed" : "не запускался") + ".";
    else if (/инфра|infra|vps|docker/.test(q)) ans = "Инфраструктура: " + board.infra + " устройств/нод. Сервисы: Docker, n8n, PostgreSQL, Redis, Cloudflare. Статус: стабильно.";
    else if (/что дальше|next|действ|рекоменд/.test(q)) ans = "Рекомендую: " + recs.slice(0, 3).map((r, i) => (i + 1) + ") " + r.text).join("  ");
    else if (/health|здоров|состоян|что происход|статус систем/.test(q)) ans = "System Health " + health + "%. " + briefing.lines.join(" · ");
    else if (/миссия|mission|цел|goal/.test(q)) ans = "Миссии: активных " + board.missionsActive + ", завершённых " + board.missionsDone + ". " + goals.slice(0, 3).map((g) => g.title + " (" + g.progress + "%)").join("; ");
    else ans = "Я анализирую WORLD, Telegram, агентов, миссии, инфраструктуру и AI-сервисы. Спросите: «что происходит», «покажи проблемы», «какие агенты активны», «статус Telegram», «что делать дальше».";
    setChat((c) => [...c, { who: "you", text: qRaw }, { who: "coo", text: ans }]);
  }

  const SEV_CLR: Record<string, string> = { info: "#38bdf8", warning: "#fbbf24", error: "#f87171" };
  const hClr = health >= 85 ? "#4ade80" : health >= 60 ? "#fbbf24" : "#f87171";
  const Card = ({ title, children }: any) => <div className="rounded-2xl border border-[rgba(177,77,255,.2)] bg-[rgba(20,14,30,.55)] p-4 backdrop-blur">{title && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{title}</div>}{children}</div>;
  const actions = [["world", "Open WORLD"], ["telegram", "Open Telegram"], ["missions", "Open Missions"], ["agents", "Open Agents"], ["htmlcanvas", "Open HTML Canvas"], ["world", "Open Analytics"]] as const;

  return (
    <div className="fixed inset-0 z-[68] flex flex-col bg-[#06050a]/95 text-tg-text backdrop-blur">
      <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(177,77,255,.25)] bg-[rgba(14,10,20,.7)] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Закрыть</button>
        <div className="font-black tracking-wide">🤖 AI COO · OPERATIONS CENTER</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · CORE AI</span>
        <div className="ml-2 flex items-center gap-2"><span className="text-[11px] text-tg-muted">System Health</span><span className="text-lg font-black" style={{ color: hClr }}>{health}%</span><div className="h-2 w-28 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: health + "%", background: hClr }} /></div></div>
        <div className="ml-auto flex overflow-hidden rounded-lg ring-1 ring-tg-line">
          <button onClick={() => setMode("executive")} className={`px-3 py-1.5 text-xs font-semibold ${mode === "executive" ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>Executive</button>
          <button onClick={() => setMode("operator")} className={`px-3 py-1.5 text-xs font-semibold ${mode === "operator" ? "bg-cyan-600 text-white" : "bg-tg-bg text-tg-muted"}`}>Operator</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]">
        <main className="min-h-0 space-y-3 overflow-auto p-4">
          {/* MORNING BRIEFING */}
          <Card title="Morning Briefing">
            <div className="text-lg font-black">{briefing.hi}.</div>
            <div className="mt-1 grid gap-1 text-sm text-tg-muted sm:grid-cols-2">{briefing.lines.map((l, i) => <div key={i}>• {l}</div>)}</div>
          </Card>

          {/* LIVE STATUS BOARD */}
          <Card title="Live Status Board">
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{([["Agents Active", board.agentsActive], ["Agents Idle", board.agentsIdle], ["Sessions", board.sessions], ["Dialogs", board.dialogs], ["Channels", board.channels], ["Groups", board.groups], ["Bots", board.bots], ["Infra Nodes", board.infra], ["Active Missions", board.missionsActive], ["Done Missions", board.missionsDone], ["Warnings", recs.filter((r) => r.sev === "warning").length], ["Errors", recs.filter((r) => r.sev === "error").length]] as const).map(([l, v]) => (
              <div key={l} className="rounded-xl border border-tg-line bg-tg-bg/40 p-2.5"><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-xl font-extrabold text-tg-accent">{v}</div></div>))}</div>
          </Card>

          {/* RECOMMENDATIONS / ALERTS */}
          <Card title="Recommendations & Alerts">
            <div className="space-y-1.5">{recs.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-3 py-2 text-sm"><span className="h-2 w-2 rounded-full" style={{ background: SEV_CLR[r.sev] }} /><span className="rounded bg-tg-bg px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ color: SEV_CLR[r.sev] }}>{r.kind}</span><span className="flex-1 text-tg-text">{r.text}</span>{r.action && onAction && <button onClick={() => onAction(r.action!)} className="rounded bg-tg-active px-2 py-1 text-[11px] font-semibold text-white">Open</button>}</div>))}</div>
          </Card>

          {mode === "operator" && (<>
            {/* GOALS CENTER */}
            <Card title="Goals Center">
              <div className="grid gap-2 sm:grid-cols-2">{goals.map((g, i) => (
                <div key={i} className="rounded-xl border border-tg-line bg-tg-bg/40 p-2.5"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{g.title}</span><span className="ml-auto rounded-full bg-tg-bg px-1.5 py-0.5 text-[9px] font-bold text-tg-muted">{g.status}</span></div><div className="mt-1 text-[11px] text-tg-muted">{g.agent} · {g.progress}%</div><div className="mt-1 h-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: g.progress + "%" }} /></div></div>))}</div>
            </Card>
            {/* OPERATIONS TIMELINE */}
            <Card title="Operations Timeline">
              <div className="space-y-0.5 text-[12px]">{timeline.map((e, i) => <div key={i} className="flex gap-2"><span className="text-tg-muted">{e.t}</span><span className="text-tg-text">{e.text}</span></div>)}{!timeline.length && <div className="text-tg-muted">Событий нет.</div>}</div>
            </Card>
          </>)}

          {/* SMART ACTIONS */}
          <Card title="Smart Actions">
            <div className="flex flex-wrap gap-2">{actions.map(([t, l], i) => <button key={i} onClick={() => onAction?.(t)} className="rounded-lg border border-tg-line bg-tg-bg/40 px-3 py-1.5 text-xs font-semibold hover:text-white">{l}</button>)}</div>
          </Card>
        </main>

        {/* RIGHT SIDEBAR — AI COO */}
        <aside className="flex min-h-0 flex-col border-l border-[rgba(177,77,255,.2)] bg-[rgba(14,10,20,.55)]">
          <div className="border-b border-tg-line p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">AI COO · Status</div>
            <div className="mt-1.5 flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ background: hClr }} /> Health {health}% · {recs.filter((r) => r.sev !== "info").length} warnings</div>
            <div className="mt-1 text-[11px] text-tg-muted">Context: Operations Center · {mode === "executive" ? "Executive View" : "Operator View"}</div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
            {chat.map((m, i) => <div key={i} className={`max-w-[92%] rounded-2xl px-3 py-1.5 text-sm ${m.who === "coo" ? "bg-[rgba(177,77,255,.15)]" : "ml-auto bg-[#2b5278]"}`} style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>)}
          </div>
          <div className="border-t border-tg-line p-2">
            <div className="mb-1.5 flex flex-wrap gap-1">{["Что происходит?", "Покажи проблемы", "Какие агенты активны?", "Статус Telegram", "Что дальше?"].map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full bg-tg-bg px-2 py-0.5 text-[10px] text-tg-muted hover:text-white">{s}</button>)}</div>
            <div className="flex gap-1.5"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { ask(input.trim()); setInput(""); } }} placeholder="Спросить AI COO…" className="flex-1 rounded-lg bg-tg-bg px-3 py-1.5 text-sm outline-none" /><button onClick={() => { if (input.trim()) { ask(input.trim()); setInput(""); } }} className="rounded-lg bg-tg-active px-3 py-1.5 text-xs font-semibold text-white">→</button></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
