"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// P19.3 + P20: Telegram Workspace operator panel — Account Info, Device Manager,
// live SSE events, and safe account actions (switch/logout/lock/unlock with
// confirmation + local action log). Reads ONLY the frozen /api/v1/* contract.
// Commands via REST; updates via SSE. Never prints secrets, tokens, sessions, or
// raw phone numbers (phone is shown only as the API-masked value).

type AccountSlot = {
  slotId?: string;
  id?: string | null;
  label?: string | null;
  displayName?: string | null;
  username?: string | null;
  phoneMasked?: string | null;
  status?: string | null;
  authorizationState?: string | null;
  locked?: boolean;
  active?: boolean;
};

type AccountsResponse = { accounts?: AccountSlot[]; activeAccountId?: string; active?: AccountSlot | null };
type Capabilities = {
  platform?: string;
  apiVersion?: string;
  runtimes?: Record<string, boolean>;
  capabilities?: Record<string, unknown>;
};
type RuntimeEvent = { id?: string; ts?: string; runtime?: string | null; type?: string; accountId?: string | null; data?: unknown };
type Action = "switch" | "logout" | "lock" | "unlock";
type LogEntry = { action: string; slotId: string; status: "ok" | "error"; message: string; ts: string };
type SseState = "connecting" | "live" | "reconnecting" | "disconnected";

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";
const rowBase = "flex items-center justify-between gap-3 px-3 py-2 text-sm";
const DESTRUCTIVE: Action[] = ["logout", "lock", "unlock"];

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-white/25"}`} />;
}

function safeMessage(raw: unknown, fallback: string): string {
  // Only ever surface a short human string; never echo arbitrary payloads.
  if (typeof raw === "string" && raw.length > 0 && raw.length < 200) return raw;
  return fallback;
}

export function PlatformPanel() {
  const [accounts, setAccounts] = useState<AccountSlot[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [sseState, setSseState] = useState<SseState>("connecting");
  const [loading, setLoading] = useState(true);
  const [apiOffline, setApiOffline] = useState(false);
  const [busy, setBusy] = useState<string>("");
  const [confirm, setConfirm] = useState<{ slotId: string; action: Action; label: string } | null>(null);
  const [lastResult, setLastResult] = useState<{ status: "ok" | "error"; message: string } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/accounts", { cache: "no-store" });
      const data = (await res.json()) as AccountsResponse;
      if (!res.ok) throw new Error("accounts unavailable");
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setActiveId(data.activeAccountId ?? "");
      setApiOffline(false);
    } catch {
      setApiOffline(true);
    }
  }, []);

  const loadCaps = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/system/capabilities", { cache: "no-store" });
      setCaps(res.ok ? ((await res.json()) as Capabilities) : null);
    } catch {
      setCaps(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([loadAccounts(), loadCaps()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadAccounts, loadCaps]);

  // SSE subscription with safe reconnect + cleanup. EventSource auto-reconnects;
  // we reflect connection state and refetch accounts on account/session events.
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    const es = new EventSource("/api/v1/runtime/events");
    esRef.current = es;
    es.onopen = () => setSseState("live");
    es.onerror = () => setSseState(es.readyState === EventSource.CLOSED ? "disconnected" : "reconnecting");
    es.onmessage = (msg) => {
      let evt: RuntimeEvent;
      try { evt = JSON.parse(msg.data) as RuntimeEvent; } catch { return; }
      setEvents((prev) => [evt, ...prev].slice(0, 50));
      const t = evt.type ?? "";
      if (t.startsWith("account.") || t.startsWith("session.") || t.startsWith("auth.")) {
        loadAccounts();
      }
    };
    return () => { es.close(); esRef.current = null; };
  }, [loadAccounts]);

  const runAction = useCallback(async (slotId: string, action: Action) => {
    const key = `${slotId}:${action}`;
    if (busy) return; // prevent double-click / duplicate action
    setBusy(key);
    setLastResult(null);
    let status: "ok" | "error" = "ok";
    let message = "";
    try {
      const res = await fetch(`/api/v1/accounts/${encodeURIComponent(slotId)}/${action}`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      status = res.ok ? "ok" : "error";
      message = safeMessage(data?.message, res.ok ? "выполнено" : "не выполнено");
      await loadAccounts();
    } catch {
      status = "error";
      message = "бэкенд недоступен";
    } finally {
      setBusy("");
      setLastResult({ status, message });
      setLog((prev) => [{ action, slotId, status, message, ts: new Date().toISOString() }, ...prev].slice(0, 20));
    }
  }, [busy, loadAccounts]);

  const requestAction = useCallback((slotId: string, action: Action, label: string) => {
    if (busy) return;
    if (DESTRUCTIVE.includes(action)) {
      setConfirm({ slotId, action, label });
    } else {
      runAction(slotId, action);
    }
  }, [busy, runAction]);

  const current = accounts.find((a) => a.slotId === activeId) ?? null;
  const tgReady = Boolean(caps?.runtimes?.telegram);
  const apiOk = caps !== null && !apiOffline;
  const sse = Boolean((caps?.capabilities as { events?: { sse?: boolean } })?.events?.sse);
  const authCap = (caps?.capabilities as { auth?: Record<string, boolean> })?.auth ?? {};
  const lastEvent = events[0] ?? null;
  const sseLabel = sseState === "live" ? "connected" : sseState;

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
      {/* Account Info + Actions */}
      <section className={card}>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-fuchsia-100">
          Account Info · Actions
          <span className="ml-auto text-[11px] font-normal text-white/50">{accounts.length} слот(ов)</span>
        </div>

        {lastResult && (
          <div className={`mb-3 rounded-xl px-3 py-2 text-sm ${lastResult.status === "ok" ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>
            {lastResult.status === "ok" ? "✓ " : "✕ "}{lastResult.message}
          </div>
        )}

        {confirm && (
          <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <div className="text-amber-100">Подтвердить действие: <b>{confirm.label}</b>?</div>
            <div className="mt-2 flex gap-2">
              <button disabled={busy !== ""} onClick={() => { const c = confirm; setConfirm(null); runAction(c.slotId, c.action); }} className="rounded-lg bg-amber-500/25 px-3 py-1 text-[12px] font-semibold text-amber-100 hover:bg-amber-500/40 disabled:opacity-40">Да, выполнить</button>
              <button onClick={() => setConfirm(null)} className="rounded-lg bg-white/10 px-3 py-1 text-[12px] font-semibold text-white/80 hover:bg-white/20">Отмена</button>
            </div>
          </div>
        )}

        {loading && <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60">Загрузка…</div>}
        {!loading && apiOffline && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">API офлайн. Запусти backend (npm run api:dev).</div>}

        {!loading && !apiOffline && (
          <>
            <div className="mb-3 overflow-hidden rounded-xl bg-black/20">
              <div className={rowBase}><span className="text-white/50">Активный</span><span className="font-semibold text-white">{current?.displayName ?? current?.label ?? current?.slotId ?? "—"}</span></div>
              <div className={rowBase}><span className="text-white/50">ID</span><span className="text-white/80">{current?.id ?? "—"}</span></div>
              <div className={rowBase}><span className="text-white/50">Username</span><span className="text-white/80">{current?.username ?? "—"}</span></div>
              <div className={rowBase}><span className="text-white/50">Телефон</span><span className="text-white/80">{current?.phoneMasked ?? "—"}</span></div>
              <div className={rowBase}><span className="text-white/50">Сессия</span><span className="text-white/80">{current?.authorizationState ?? current?.status ?? "—"}</span></div>
              <div className={rowBase}><span className="text-white/50">Блокировка</span><span className={current?.locked ? "text-amber-300" : "text-emerald-300"}>{current?.locked ? "locked" : "unlocked"}</span></div>
            </div>

            <div className="space-y-2">
              {accounts.map((a) => {
                const id = a.slotId ?? "";
                const isActive = id === activeId;
                const ready = a.status === "ready" || a.authorizationState === "authorizationStateReady";
                const name = a.displayName ?? a.label ?? id;
                return (
                  <div key={id || a.label} className={`rounded-xl border px-3 py-2 ${isActive ? "border-fuchsia-400/40 bg-fuchsia-400/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-center gap-2">
                      <StatusDot ok={ready} />
                      <span className="min-w-0 truncate text-sm font-semibold text-white">{name}</span>
                      {a.locked && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">locked</span>}
                      {isActive && <span className="ml-auto text-[10px] uppercase tracking-wide text-fuchsia-200">active</span>}
                    </div>
                    <div className="mt-1 text-[11px] text-white/50">{a.username ?? a.phoneMasked ?? a.authorizationState ?? "не авторизован"}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {!isActive && <ActionBtn label="Switch" busyKey={`${id}:switch`} busy={busy} onClick={() => requestAction(id, "switch", `switch → ${name}`)} />}
                      {a.locked
                        ? <ActionBtn label="Unlock" busyKey={`${id}:unlock`} busy={busy} onClick={() => requestAction(id, "unlock", `unlock ${name}`)} />
                        : <ActionBtn label="Lock" busyKey={`${id}:lock`} busy={busy} onClick={() => requestAction(id, "lock", `lock ${name}`)} />}
                      <ActionBtn label="Logout" tone="danger" busyKey={`${id}:logout`} busy={busy} onClick={() => requestAction(id, "logout", `logout ${name}`)} />
                    </div>
                  </div>
                );
              })}
              {accounts.length === 0 && <div className="rounded-xl bg-white/5 px-3 py-3 text-center text-sm text-white/50">Слотов нет. Добавь аккаунт в рабочей области.</div>}
            </div>
          </>
        )}

        {/* Action log */}
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 text-[12px] font-semibold text-white/70">Action log <span className="text-white/35">(локально, без секретов)</span></div>
          <div className="max-h-40 space-y-1 overflow-auto">
            {log.length === 0 && <div className="text-[11px] text-white/40">пока пусто</div>}
            {log.map((l, i) => (
              <div key={i} className="flex items-baseline gap-2 text-[11px]">
                <span className={l.status === "ok" ? "text-emerald-300" : "text-rose-300"}>{l.status === "ok" ? "✓" : "✕"}</span>
                <span className="font-mono text-white/80">{l.action}</span>
                <span className="text-white/40">{l.slotId}</span>
                <span className="truncate text-white/50">{l.message}</span>
                <span className="ml-auto text-white/30">{new Date(l.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Device Manager · Runtime */}
      <section className={card}>
        <div className="mb-3 text-sm font-bold text-fuchsia-100">Device Manager · Runtime</div>
        {loading && <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60">Загрузка возможностей…</div>}
        {!loading && (
          <div className="overflow-hidden rounded-xl bg-black/20">
            <CapRow label="Platform" value={caps?.platform ?? "—"} ok={apiOk} />
            <CapRow label="API (v1)" value={apiOk ? "available" : "offline"} ok={apiOk} />
            <CapRow label="Telegram runtime" value={tgReady ? "ready" : "off"} ok={tgReady} />
            <CapRow label="Auth" value={`qr:${authCap.qr ? "on" : "off"} · phone:${authCap.phone ? "on" : "off"} · 2fa:${authCap.twoFa ? "on" : "off"}`} ok={Boolean(authCap.qr || authCap.phone)} />
            <CapRow label="Events · SSE" value={sse ? sseLabel : "off"} ok={sse && sseState === "live"} />
            <CapRow label="OpenAPI / Docs" value="/v1/docs" ok link="/api/v1/docs" />
          </div>
        )}

        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-white/80">
            <StatusDot ok={sseState === "live"} />
            Live runtime events
            <span className={`ml-auto text-[11px] ${sseState === "disconnected" ? "text-rose-300" : sseState === "reconnecting" ? "text-amber-300" : "text-white/40"}`}>{sseLabel}</span>
          </div>
          {lastEvent && (
            <div className="mb-2 rounded bg-black/30 px-2 py-1 text-[11px]">
              <span className="text-white/40">last: </span>
              <span className="font-mono text-fuchsia-200">{lastEvent.type}</span>
              {lastEvent.accountId && <span className="ml-1 text-white/40">{lastEvent.accountId}</span>}
            </div>
          )}
          <div className="max-h-56 space-y-1 overflow-auto">
            {events.length === 0 && <div className="text-[12px] text-white/40">{sseState === "reconnecting" ? "переподключение…" : sseState === "disconnected" ? "отключено" : "ожидание событий…"}</div>}
            {events.map((e, i) => (
              <div key={e.id ?? i} className="flex items-baseline gap-2 rounded bg-black/20 px-2 py-1 text-[11px]">
                <span className="font-mono text-fuchsia-200">{e.type ?? "event"}</span>
                {e.accountId && <span className="text-white/40">{e.accountId}</span>}
                <span className="ml-auto text-white/30">{e.ts ? new Date(e.ts).toLocaleTimeString() : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionBtn({ label, onClick, busy, busyKey, tone }: { label: string; onClick: () => void; busy: string; busyKey: string; tone?: "danger" }) {
  const isThis = busy === busyKey;
  const disabled = busy !== "";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition disabled:opacity-40 ${tone === "danger" ? "bg-rose-500/15 text-rose-200 hover:bg-rose-500/25" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
    >
      {isThis ? "…" : label}
    </button>
  );
}

function CapRow({ label, value, ok, link }: { label: string; value: string; ok: boolean; link?: string }) {
  return (
    <div className={rowBase}>
      <span className="flex items-center gap-2 text-white/50"><StatusDot ok={ok} />{label}</span>
      {link
        ? <a href={link} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">{value}</a>
        : <span className="text-white/80">{value}</span>}
    </div>
  );
}
