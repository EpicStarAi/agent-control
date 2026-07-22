"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Database, RefreshCw, ShieldCheck, Table2 } from "lucide-react";

type Ledger = {
  generatedAt: string;
  principal: { userId: string; workspaceId: string; role: string };
  crmRows: Array<Record<string, unknown>>;
  telegram: {
    connected: boolean;
    source: string;
    chats: {
      counts: Record<string, number>;
      sample: Array<Record<string, unknown>>;
    };
    runtime: {
      runtime: string;
      activeAccountId: string | null;
      authorizationState: string | null;
      accounts: Array<Record<string, unknown>>;
    };
  };
  allowlist: Array<Record<string, unknown>>;
  approvals: Array<Record<string, unknown>>;
  audit: Array<Record<string, unknown>>;
  notes: string[];
};

const columns = [
  ["workspace_id", "Рабочая область EPICGRAM. Разделяет пользователей, проекты и данные."],
  ["telegram_account_slot", "Локальный слот TDLib-аккаунта, к которому привязан workspace."],
  ["telegram_user_id", "Числовой Telegram ID владельца. Сейчас требует backfill после авторизации."],
  ["display_name", "Имя аккаунта из Telegram-профиля."],
  ["username", "Публичный @username, если задан."],
  ["masked_phone", "Безопасно замаскированный номер телефона."],
  ["status", "Состояние подключения: ready, waiting_code, waiting_qr, no_binding и т.д."],
  ["active_account", "Этот аккаунт сейчас активен для клиента."],
  ["rights_settings", "Локальные ограничения EPICGRAM: approval, guard, owner-match."],
  ["allowlist_count", "Сколько разрешённых целей сейчас есть для действий."],
  ["audit_count", "Количество последних audit-событий в CRM ledger."],
] as const;

function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-white/35">—</span>;
  if (typeof value === "boolean") return <span className={value ? "text-emerald-300" : "text-red-300"}>{value ? "да" : "нет"}</span>;
  return <span>{String(value)}</span>;
}

function MiniTable({ title, rows, limit = 8 }: { title: string; rows: Array<Record<string, unknown>>; limit?: number }) {
  const keys = useMemo(() => Array.from(new Set(rows.slice(0, limit).flatMap((row) => Object.keys(row)))).slice(0, 8), [rows, limit]);
  return (
    <section className="rounded-lg border border-emerald-400/15 bg-black/35">
      <div className="flex items-center justify-between border-b border-emerald-400/10 px-3 py-2">
        <h2 className="text-sm font-semibold text-emerald-100">{title}</h2>
        <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-200">{rows.length} rows</span>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full border-collapse text-left text-[12px]">
          <thead className="bg-emerald-400/5 text-emerald-300/80">
            <tr>{keys.map((key) => <th key={key} className="whitespace-nowrap border-b border-emerald-400/10 px-3 py-2 font-medium">{key}</th>)}</tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((row, idx) => (
              <tr key={String(row.id ?? idx)} className="odd:bg-white/[0.02]">
                {keys.map((key) => <td key={key} className="max-w-[260px] truncate border-b border-white/5 px-3 py-2 text-white/70"><Cell value={row[key]} /></td>)}
              </tr>
            ))}
            {!rows.length ? (
              <tr><td className="px-3 py-4 text-white/40" colSpan={Math.max(keys.length, 1)}>Нет данных</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function EpicCrmLedger() {
  const [data, setData] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/epic-crm/telegram-ledger", { cache: "no-store", credentials: "same-origin" });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.message || "CRM API недоступен");
      setData(json as Ledger);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить CRM ledger");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const row = data?.crmRows?.[0] ?? {};
  const counts = data?.telegram?.chats?.counts ?? {};

  return (
    <main className="min-h-screen bg-[#030604] px-4 py-4 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-400/15 pb-4">
          <div>
            <Link href="/client" className="text-xs text-emerald-300/70">← EPIC☠GRAM client</Link>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-wide text-emerald-100">
              <Table2 className="h-6 w-6" /> EPIC☠CRM AI Excel
            </h1>
            <p className="mt-1 text-sm text-white/55">Read-only ledger: Telegram account metadata, controls, allowlist and audit.</p>
          </div>
          <button onClick={() => refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-400/15 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Обновить
          </button>
        </header>

        {error ? <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

        <section className="grid gap-3 md:grid-cols-4">
          {[
            ["Workspace", data?.principal?.workspaceId ?? "—"],
            ["Telegram", data?.telegram?.connected ? "connected" : "not ready"],
            ["Chats", counts.total ?? 0],
            ["Audit", data?.audit?.length ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-emerald-400/15 bg-black/35 p-3">
              <div className="text-[11px] uppercase tracking-widest text-emerald-300/55">{label}</div>
              <div className="mt-2 truncate text-lg font-semibold text-emerald-50">{String(value)}</div>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-emerald-400/15 bg-black/35">
          <div className="flex items-center gap-2 border-b border-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100">
            <Database className="h-4 w-4" /> Главная CRM-таблица аккаунта
          </div>
          <div className="overflow-auto">
            <table className="min-w-[1100px] border-collapse text-left text-[12px]">
              <thead className="bg-emerald-400/5 text-emerald-300/80">
                <tr>{columns.map(([key]) => <th key={key} className="border-b border-emerald-400/10 px-3 py-2 font-medium">{key}</th>)}</tr>
              </thead>
              <tbody>
                <tr>{columns.map(([key]) => <td key={key} className="max-w-[220px] truncate border-b border-white/5 px-3 py-2 text-white/75"><Cell value={row[key]} /></td>)}</tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-emerald-400/15 bg-black/35 p-3">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-100"><ShieldCheck className="h-4 w-4" /> Короткие описания колонок</h2>
            <div className="grid gap-2 text-[12px] text-white/65 sm:grid-cols-2">
              {columns.map(([key, help]) => <div key={key}><span className="font-mono text-emerald-300">{key}</span><br />{help}</div>)}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-400/15 bg-black/35 p-3">
            <h2 className="mb-2 text-sm font-semibold text-emerald-100">Telegram snapshot</h2>
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              {["private", "groups", "channels", "bots", "unread", "other"].map((key) => (
                <div key={key} className="rounded border border-white/10 bg-white/[0.03] p-2">
                  <div className="text-white/40">{key}</div>
                  <div className="text-lg font-semibold text-emerald-100">{counts[key] ?? 0}</div>
                </div>
              ))}
            </div>
            <ul className="mt-3 space-y-1 text-[12px] text-amber-200/80">
              {(data?.notes ?? []).map((note) => <li key={note}>• {note}</li>)}
            </ul>
          </div>
        </section>

        <div className="grid gap-3">
          <MiniTable title="Backend TDLib runtime accounts" rows={data?.telegram?.runtime?.accounts ?? []} limit={10} />
          <MiniTable title="Telegram chats sample" rows={data?.telegram?.chats?.sample ?? []} limit={12} />
          <MiniTable title="Allowlist" rows={data?.allowlist ?? []} />
          <MiniTable title="Approvals" rows={data?.approvals ?? []} />
          <MiniTable title="Audit" rows={data?.audit ?? []} limit={12} />
        </div>
      </div>
    </main>
  );
}
