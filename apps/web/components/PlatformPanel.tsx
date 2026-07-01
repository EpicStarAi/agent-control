"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// P19.3: Telegram Workspace — Account Info + Device Manager + live SSE events.
// Reads ONLY the frozen /api/v1/* contract. Commands via REST; updates via SSE.

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

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";
const rowBase = "flex items-center justify-between gap-3 px-3 py-2 text-sm";

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-white/25"}`} />;
}

export function PlatformPanel() {
  const [accounts, setAccounts] = useState<AccountSlot[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [sseState, setSseState] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<string>("");
  const esRef = useRef<EventSource | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/accounts", { cache: "no-store" });
      const data = (await res.json()) as AccountsResponse;
      if (!res.ok) throw new Error("accounts unavailable");
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setActiveId(data.activeAccountId ?? "");
      setError("");
    } catch {
      setError("Бэкенд недоступен (запусти api:dev).");
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
  // we only reflect state and refetch accounts on account.* / session.* events.
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    const es = new EventSource("/api/v1/runtime/events");
    esRef.current = es;
    es.onopen = () => setSseState("live");
    es.onerror = () => setSseState("reconnecting");
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

  const doAction = useCallback(async (slotId: string, action: "switch" | "logout" | "lock" | "unlock") => {
    setBusy(`${slotId}:${action}`);
    try {
      await fetch(`/api/v1/accounts/${encodeURIComponent(slotId)}/${action}`, { method: "POST" });
      await loadAccounts();
    } catch {
      setError("Действие не выполнено (бэкенд недоступен).");
    } finally {
      setBusy("");
    }
  }, [loadAccounts]);

  const current = accounts.find((a) => a.slotId === activeId) ?? null;
  const tgReady = Boolean(caps?.runtimes?.telegram);
  const apiOk = caps !== null;
  const sse = Boolean((caps?.capabilities as { events?: { sse?: boolean } })?.events?.sse);
  const authCap = (caps?.capabilities as { auth?: Record<string, boolean> })?.auth ?? {};

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
      {/* Account Info */}
      <section className={card}>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-fuchsia-100">
          Account Info
          <span className="ml-auto text-[11px] font-normal text-white/50">{accounts.length} слот(ов)</span>
        </div>
        {loading && <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60">Загрузка…</div>}
        {!loading && error && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">{error}</div>}
        {!loading && !error && (
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
                return (
                  <div key={id || a.label} className={`rounded-xl border px-3 py-2 ${isActive ? "border-fuchsia-400/40 bg-fuchsia-400/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-center gap-2">
                      <StatusDot ok={ready} />
                      <span className="min-w-0 truncate text-sm font-semibold text-white">{a.displayName ?? a.label ?? id}</span>
                      {a.locked && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">locked</span>}
                      {isActive && <span className="ml-auto text-[10px] uppercase tracking-wide text-fuchsia-200">active</span>}
                    </div>
                    <div className="mt-1 text-[11px] text-white/50">{a.username ?? a.phoneMasked ?? a.authorizationState ?? "не авторизован"}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {!isActive && <ActionBtn label="Switch" disabled={busy !== ""} onClick={() => doAction(id, "switch")} />}
                      {a.locked
                        ? <ActionBtn label="Unlock" disabled={busy !== ""} onClick={() => doAction(id, "unlock")} />
                        : <ActionBtn label="Lock" disabled={busy !== ""} onClick={() => doAction(id, "lock")} />}
                      <ActionBtn label="Logout" tone="danger" disabled={busy !== ""} onClick={() => doAction(id, "logout")} />
                    </div>
                  </div>
                );
              })}
              {accounts.length === 0 && <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/50">Слотов нет.</div>}
            </div>
          </>
        )}
      </section>

      {/* Device Manager */}
      <section className={card}>
        <div className="mb-3 text-sm font-bold text-fuchsia-100">Device Manager · Runtime</div>
        {loading && <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60">Загрузка возможностей…</div>}
        {!loading && (
          <div className="overflow-hidden rounded-xl bg-black/20">
            <CapRow label="Platform" value={caps?.platform ?? "—"} ok={apiOk} />
            <CapRow label="API (v1)" value={apiOk ? "available" : "offline"} ok={apiOk} />
            <CapRow label="Telegram runtime" value={tgReady ? "ready" : "off"} ok={tgReady} />
            <CapRow label="Auth" value={`qr:${authCap.qr ? "on" : "off"} · phone:${authCap.phone ? "on" : "off"} · 2fa:${authCap.twoFa ? "on" : "off"}`} ok={Boolean(authCap.qr || authCap.phone)} />
            <CapRow label="Events · SSE" value={sse ? (sseState === "live" ? "live" : sseState) : "off"} ok={sse && sseState === "live"} />
            <CapRow label="OpenAPI / Docs" value="/v1/docs" ok link="/api/v1/docs" />
          </div>
        )}
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-white/80">
            <StatusDot ok={sseState === "live"} />
            Live runtime events
            <span className="ml-auto text-[11px] text-white/40">{events.length} / 50</span>
          </div>
          <div className="max-h-64 space-y-1 overflow-auto">
            {events.length === 0 && <div className="text-[12px] text-white/40">{sseState === "reconnecting" ? "переподключение…" : "ожидание событий…"}</div>}
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

function ActionBtn({ label, onClick, disabled, tone }: { label: string; onClick: () => void; disabled?: boolean; tone?: "danger" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition disabled:opacity-40 ${tone === "danger" ? "bg-rose-500/15 text-rose-200 hover:bg-rose-500/25" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
    >
      {label}
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
