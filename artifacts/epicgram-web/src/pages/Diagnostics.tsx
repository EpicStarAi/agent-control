// DIAGNOSTICS PAGE — real-time system health dashboard.
// Shows TDLib, AI provider, app state. Masks secrets.

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

interface StatusData {
  runtime?: string;
  accounts?: any[];
  activeAccountId?: string;
  tdlibConfigured?: boolean;
  missingConfig?: string[];
  message?: string;
  slots?: any[];
}

interface HealthData {
  status?: string;
  uptime?: number;
  version?: string;
}

const Pill = ({ label, ok, warn }: { label: string; ok?: boolean; warn?: boolean }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
    ok    ? "bg-emerald-500/15 text-emerald-400" :
    warn  ? "bg-amber-500/15 text-amber-400" :
            "bg-red-500/15 text-red-400"
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : warn ? "bg-amber-400" : "bg-red-400"}`} />
    {label}
  </span>
);

const Row = ({ label, value, secret }: { label: string; value: React.ReactNode; secret?: boolean }) => (
  <div className="flex items-center justify-between gap-4 border-t border-white/5 py-2 first:border-0">
    <span className="text-[11px] text-white/40">{label}</span>
    <span className={`text-right text-[11px] font-medium ${secret ? "text-white/20 italic" : "text-white/80"}`}>
      {secret ? "•••••• (скрыто)" : value}
    </span>
  </div>
);

export default function Diagnostics() {
  const [tg, setTg]         = useState<StatusData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [aiOk, setAiOk]     = useState<boolean | null>(null);
  const [aiLatency, setAiLatency] = useState<number | null>(null);
  const [aiError, setAiError]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [ts, setTs]               = useState("");

  const refresh = async () => {
    setLoading(true);
    setTs(new Date().toLocaleTimeString());
    await Promise.all([
      fetch(apiUrl("/telegram/status"), { cache: "no-store" })
        .then(r => r.json()).then(setTg).catch(() => setTg(null)),
      fetch(apiUrl("/health"), { cache: "no-store" })
        .then(r => r.json()).then(setHealth).catch(() => setHealth(null)),
      (async () => {
        const t0 = Date.now();
        try {
          const r = await fetch(apiUrl("/operator/chat"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
          });
          if (r.ok && r.body) {
            const reader = r.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            while (!done) {
              const { done: d, value } = await reader.read();
              done = d;
              if (value) {
                const text = decoder.decode(value);
                if (text.includes('"done":true')) { done = true; }
              }
            }
            setAiOk(true);
            setAiLatency(Date.now() - t0);
          } else {
            setAiOk(false);
            setAiError(`HTTP ${r.status}`);
          }
        } catch (e: any) {
          setAiOk(false);
          setAiError(e.message);
        }
      })(),
    ]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const tgReady = tg?.accounts?.some((a: any) => a.status === "ready") ?? false;
  const tgConfigured = tg?.tdlibConfigured !== false && tg?.runtime !== "not_configured";
  const accs = tg?.accounts ?? [];
  const model = (window as any).__OPENAI_MODEL__ || "gpt-5.4-mini (env: OPENAI_MODEL)";

  return (
    <div className="min-h-screen" style={{ background: "var(--tg-bg, #0e0e17)", color: "var(--tg-text, #e2e8f0)" }}>
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">🩺 Диагностика EPICGRAM</h1>
            <p className="text-[11px] text-white/30">Системное состояние · Обновлено: {ts || "…"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/10 disabled:opacity-40 transition-all">
              {loading ? "⏳ Загрузка…" : "↻ Обновить"}
            </button>
            <a href="/client" className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/10 transition-all">
              ← Клиент
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 p-6">

        {/* Summary pills */}
        <div className="flex flex-wrap gap-2">
          <Pill label={tgConfigured ? "TDLib настроен" : "TDLib не настроен"} ok={tgConfigured} />
          <Pill label={tgReady ? "Telegram авторизован" : "Telegram ожидает авторизацию"} ok={tgReady} warn={tgConfigured && !tgReady} />
          <Pill label={aiOk === null ? "AI: проверка…" : aiOk ? `AI готов (${aiLatency}мс)` : "AI недоступен"} ok={aiOk === true} warn={aiOk === null} />
          <Pill label={health?.status === "ok" ? "API Server OK" : "API Server?"} ok={health?.status === "ok"} warn={!health} />
        </div>

        {/* Telegram section */}
        <Section title="Telegram / TDLib">
          <Row label="TDLib настроен" value={<Pill label={tgConfigured ? "да" : "нет"} ok={tgConfigured} />} />
          <Row label="Runtime status" value={tg?.runtime ?? "—"} />
          <Row label="Аккаунтов (слотов)" value={accs.length} />
          <Row label="Авторизованных" value={accs.filter((a: any) => a.status === "ready").length} />
          <Row label="Активный слот" value={tg?.activeAccountId ?? "—"} />
          {tg?.missingConfig && tg.missingConfig.length > 0 && (
            <Row label="Не настроено" value={
              <span className="text-amber-400">{tg.missingConfig.join(", ")}</span>
            } />
          )}
          <Row label="TELEGRAM_API_ID" value="" secret />
          <Row label="TELEGRAM_API_HASH" value="" secret />
          <Row label="EPICGRAM_TDLIB_ENABLED" value="true" />
          <Row label="Сообщение" value={tg?.message ?? "—"} />
        </Section>

        {/* Accounts table */}
        {accs.length > 0 && (
          <Section title={`Слоты аккаунтов (${accs.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-white/30">
                    {["slotId", "Имя", "Телефон", "Статус", "Auth state"].map(h => (
                      <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accs.map((a: any, i: number) => (
                    <tr key={a.slotId || i} className="border-t border-white/5">
                      <td className="py-1.5 pr-4 font-mono text-white/50">{a.slotId}</td>
                      <td className="py-1.5 pr-4 font-medium text-white/80">{a.displayName || a.label || "—"}</td>
                      <td className="py-1.5 pr-4 text-white/40">{a.phoneMasked || "—"}</td>
                      <td className="py-1.5 pr-4">
                        <Pill label={a.status} ok={a.status === "ready"} warn={a.status !== "ready" && a.status !== "error"} />
                      </td>
                      <td className="py-1.5 text-white/40">{a.authorizationState || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* AI section */}
        <Section title="AI Operator">
          <Row label="Провайдер" value="OpenAI (Replit AI proxy)" />
          <Row label="Модель" value={model} />
          <Row label="API доступен" value={<Pill label={aiOk === null ? "проверяем…" : aiOk ? "да" : "нет"} ok={aiOk === true} warn={aiOk === null} />} />
          <Row label="Задержка" value={aiLatency != null ? `${aiLatency} мс` : "—"} />
          <Row label="Последняя ошибка" value={aiError ?? "нет"} />
          <Row label="OPENAI_API_KEY" value="" secret />
          <Row label="Стриминг" value="SSE (text/event-stream)" />
          <Row label="MANUAL_ONLY" value="включён · автоотправка запрещена" />
        </Section>

        {/* API Server */}
        <Section title="API Server">
          <Row label="Статус" value={<Pill label={health?.status ?? "неизвестно"} ok={health?.status === "ok"} />} />
          <Row label="Uptime" value={health?.uptime != null ? `${Math.floor(health.uptime / 60)} мин` : "—"} />
          <Row label="Маршруты EPICGRAM" value="/telegram, /operator, /ai, /v1, /approvals, /memory" />
          <Row label="Прокси к" value="http://127.0.0.1:8788 (EPICGRAM API)" />
        </Section>

        {/* App */}
        <Section title="Приложение">
          <Row label="Frontend" value="React + Vite (epicgram-web)" />
          <Row label="BASE_URL" value={import.meta.env.BASE_URL} />
          <Row label="MODE" value={import.meta.env.MODE} />
          <Row label="SESSION_SECRET" value="" secret />
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-white/30">{title}</h2>
      {children}
    </div>
  );
}
