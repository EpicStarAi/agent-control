"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// EPIC GRAM Operator Council / Mission Room — internal AI-operator layer.
// The CLIENT is the control room; Telegram is an external channel/adapter.
// This is a READ-ONLY UI shell over the existing Event Bus (SSE), Capabilities
// and Production Gate. No sends, no backend changes (services/api untouched).
// Everything public/dangerous is gated by the Approval Gate; this view only
// observes and never executes.

type RuntimeEvent = { id?: string; ts?: string; runtime?: string | null; type?: string; accountId?: string | null; data?: unknown };
type Gate = { simulationOnly?: boolean; live?: boolean; locked?: boolean; killSwitch?: boolean; mode?: string; sendMode?: string; message?: string; ok?: boolean };
type Caps = { runtimes?: Record<string, boolean>; capabilities?: Record<string, unknown> };

const OPERATORS = [
  { id: "novikova", name: "NOVIKOVA 💋", role: "Host · Персона", duty: "Ведёт чаты и канал: тон, присутствие, ответы", core: true },
  { id: "buch", name: "BUCH ☠", role: "Host · Персона", duty: "Соведущий: драйв, провокация, шоу", core: true },
  { id: "publisher", name: "Publisher", role: "Публикации", duty: "Готовит посты → preview → approve-gate", core: false },
  { id: "auditor", name: "Auditor", role: "Аудит · Безопасность", duty: "Scam-radar, risk-flags, журнал действий", core: false },
  { id: "support", name: "Support", role: "Поддержка", duty: "VPN / вопросы, черновики ответов", core: false },
  { id: "analyst", name: "Analyst", role: "Аналитика", duty: "Метрики каналов/постов, инсайты", core: false }
];

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

function Dot({ tone }: { tone: "on" | "idle" | "lock" }) {
  const c = tone === "on" ? "bg-emerald-400" : tone === "lock" ? "bg-amber-400" : "bg-white/25";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}

function eventLabel(e: RuntimeEvent): string {
  const t = e.type ?? "event";
  const map: Record<string, string> = {
    "runtime.health": "Runtime · пульс",
    "session.changed": "Сессия переключена",
    "account.switched": "Активный аккаунт сменён",
    "account.created": "Создан слот аккаунта",
    "account.removed": "Слот удалён",
    "account.locked": "Аккаунт заблокирован",
    "account.unlocked": "Аккаунт разблокирован",
    "auth.state_changed": "Смена авторизации",
    "message.new": "Новый сигнал в диалоге"
  };
  return map[t] ?? t;
}

export function OperatorCouncil() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [gate, setGate] = useState<Gate | null>(null);
  const [caps, setCaps] = useState<Caps | null>(null);
  const [sseState, setSseState] = useState<"connecting" | "live" | "reconnecting" | "disconnected">("connecting");
  const [gateUnknown, setGateUnknown] = useState(false);

  const loadStatic = useCallback(async () => {
    try {
      const [c, g] = await Promise.all([
        fetch("/api/v1/system/capabilities", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/operator/production/status", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      ]);
      setCaps(c as Caps | null);
      if (g && typeof g === "object") { setGate(g as Gate); setGateUnknown(false); } else { setGateUnknown(true); }
    } catch {
      setGateUnknown(true);
    }
  }, []);

  useEffect(() => { loadStatic(); }, [loadStatic]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    const es = new EventSource("/api/v1/runtime/events");
    es.onopen = () => setSseState("live");
    es.onerror = () => setSseState(es.readyState === EventSource.CLOSED ? "disconnected" : "reconnecting");
    es.onmessage = (msg) => {
      try {
        const evt = JSON.parse(msg.data) as RuntimeEvent;
        setEvents((prev) => [evt, ...prev].slice(0, 60));
      } catch { /* ignore malformed frame */ }
    };
    return () => es.close();
  }, []);

  // Gate: default is SAFE / SIMULATION unless the backend explicitly says live.
  const locked = Boolean(gate?.locked || gate?.killSwitch);
  const live = gate?.live === true || gate?.mode === "live";
  const gateMode = gateUnknown ? "—" : locked ? "SAFE MODE · LOCKED" : live ? "LIVE (гейт открыт)" : "SIMULATION · approval-only";
  const gateTone: "on" | "idle" | "lock" = gateUnknown ? "idle" : locked ? "lock" : live ? "on" : "idle";

  const roster = useMemo(() => OPERATORS.map((op) => {
    const tone: "on" | "idle" | "lock" = locked ? "lock" : op.core ? "on" : "idle";
    const status = locked ? "locked (safe mode)" : op.core ? "on duty" : "standby";
    return { ...op, tone, status };
  }), [locked]);

  const sseLabel = sseState === "live" ? "connected" : sseState;

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_1.15fr]">
      {/* Left: Approval Gate + Roster */}
      <section className={card}>
        <div className="mb-3 text-sm font-bold text-fuchsia-100">Operator Council · Роли</div>

        <div className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${locked ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-emerald-500/25 bg-emerald-500/5 text-emerald-200"}`}>
          <Dot tone={gateTone} />
          <div className="min-w-0">
            <div className="font-semibold">Approval Gate · {gateMode}</div>
            <div className="text-[11px] opacity-80">Всё публичное и опасное — только после подтверждения оператора.</div>
          </div>
        </div>

        <div className="space-y-2">
          {roster.map((op) => (
            <div key={op.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <Dot tone={op.tone} />
                <span className="text-sm font-semibold text-white">{op.name}</span>
                <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">{op.role}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-white/40">{op.status}</span>
              </div>
              <div className="mt-1 text-[12px] text-white/50">{op.duty}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/35">Каждый оператор — MANUAL_APPROVAL_ONLY. Регистр агентов доступен вручную: <a href="/agents" className="text-sky-300 hover:underline">/agents</a>.</p>
      </section>

      {/* Right: Mission Room (Event Bus) + Audit stream */}
      <section className={card}>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-fuchsia-100">
          Mission Room · Event Bus
          <span className={`ml-auto text-[11px] font-normal ${sseState === "disconnected" ? "text-rose-300" : sseState === "reconnecting" ? "text-amber-300" : "text-emerald-300"}`}>SSE {sseLabel}</span>
        </div>

        <div className="mb-2 text-[11px] text-white/40">Внутренняя шина: Telegram / сайт / бот / VPN / каналы — внешние адаптеры. Здесь операторы видят единый поток контекста.</div>

        <div className="max-h-[420px] space-y-1 overflow-auto rounded-xl border border-white/10 bg-black/20 p-2">
          {events.length === 0 && (
            <div className="p-4 text-[12px] text-white/40">
              {sseState === "disconnected" ? "шина отключена" : sseState === "reconnecting" ? "переподключение…" : "ожидание событий шины…"}
            </div>
          )}
          {events.map((e, i) => (
            <div key={e.id ?? i} className="flex items-baseline gap-2 rounded px-2 py-1 text-[12px] hover:bg-white/5">
              <span className="font-mono text-emerald-300">{e.runtime ?? "core"}</span>
              <span className="text-white/85">{eventLabel(e)}</span>
              {e.accountId && <span className="text-white/40">{e.accountId}</span>}
              <span className="ml-auto font-mono text-white/30">{e.ts ? new Date(e.ts).toLocaleTimeString() : ""}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-white/50">
          <b className="text-white/70">Audit Log:</b> живой поток выше = что предложено / произошло. Полный персистентный аудит (кто предложил · кто подтвердил · куда ушло · результат) — в разделе <span className="text-white/70">Agent OS → Audit Log</span>. Read-only.
        </div>
      </section>
    </div>
  );
}
