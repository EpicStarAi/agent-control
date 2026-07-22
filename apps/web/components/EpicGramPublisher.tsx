"use client";

// EPIC GRAM PUBLISHER — the working publishing vertical (PHASE P1 actions + Q1 Draft Studio
// + Q2 Approval + Q3 Publish Queue + Manual Publish + Log). ADDITIVE: a new overlay module.
// Real data only via the existing /api/telegram/* proxy routes. The publish path calls
// /api/telegram/send with a human-action marker (the human in the Queue IS the operator).
// Does NOT change routes, TDLib, the approval gate, /agents, Ω-FINAL, or TelegramWorkspace.

import { useCallback, useEffect, useState } from "react";

type Account = { slotId: string; displayName?: string; username?: string | null; phoneMasked?: string | null; status?: string; authorizationState?: string; active?: boolean };
type Chat = { id: any; title?: string; category?: string; isChannel?: boolean; username?: string | null };
type DraftStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED" | "SCHEDULED" | "CANCELLED";
type ScheduleMode = "NOW" | "SCHEDULED";
type Priority = "LOW" | "NORMAL" | "HIGH";
type Draft = { id: string; title: string; text: string; accountId: string; channelId: string; channelTitle: string; authorAgent: string; status: DraftStatus; comment?: string; createdAt: string; updatedAt: string; scheduleMode?: ScheduleMode; scheduledAt?: string; timezone?: string; priority?: Priority; campaignId?: string };
type LogEntry = { id: string; draftId: string; accountId: string; channelId: string; channelTitle: string; text: string; status: "QUEUED" | "PUBLISHING" | "SUCCESS" | "FAILED"; createdAt: string; publishedAt?: string; result?: string; error?: string };

const DRAFTS_LS = "epicgram.drafts.v1";
const LOG_LS = "epicgram.publishlog.v1";
const AGENTS = ["NOVIKOVA", "AI MUSIC PUBLIC", "EVA", "AI NEWSCASTER"];
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } })();
const fmtDT = (iso?: string) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; } };
const PRIO_DOT: Record<string, string> = { LOW: "#64748b", NORMAL: "#a78bfa", HIGH: "#f472b6" };
// migrate old drafts safely — never wipe, only fill missing schedule fields
const migrateDraft = (x: Draft): Draft => ({ scheduleMode: "NOW", timezone: TZ, priority: "NORMAL", ...x });

const rid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
function load<T>(k: string, def: T): T { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? def; } catch { return def; } }
function save(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

const STBADGE: Record<string, string> = { DRAFT: "bg-white/10 text-tg-muted", PENDING: "bg-amber-500/20 text-amber-300", APPROVED: "bg-emerald-500/20 text-emerald-300", REJECTED: "bg-rose-500/20 text-rose-300", PUBLISHED: "bg-sky-500/20 text-sky-300", SCHEDULED: "bg-indigo-500/20 text-indigo-300", CANCELLED: "bg-zinc-500/20 text-zinc-400", PENDING_APPROVAL: "bg-amber-500/20 text-amber-300", QUEUED: "bg-amber-500/20 text-amber-300", PUBLISHING: "bg-violet-500/20 text-violet-300", SUCCESS: "bg-emerald-500/20 text-emerald-300", FAILED: "bg-rose-500/20 text-rose-300" };
function Badge({ s }: { s: string }) { return <span className={"rounded px-1.5 py-0.5 text-[9px] font-bold " + (STBADGE[s] || "bg-white/10 text-tg-muted")}>{s}</span>; }

const SECTIONS: [string, string][] = [
  ["dashboard", "🗂 Dashboard"], ["accounts", "👤 Account Center"], ["compose", "✍️ Draft Studio"], ["approval", "✅ Approval"],
  ["queue", "📤 Publish Queue"], ["scheduled", "🗓 Scheduled"], ["calendar", "📅 Calendar"], ["agents", "🤖 Agents"], ["analytics", "📈 Analytics"], ["log", "📜 Publish Log"], ["autonomy", "🧭 Autonomy"],
];

export function EpicGramPublisher({ onClose }: { onClose: () => void }) {
  const [sec, setSec] = useState("dashboard");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [runtime, setRuntime] = useState<string>("—");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>("");
  const [qrFor, setQrFor] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  useEffect(() => { setDrafts(load<Draft[]>(DRAFTS_LS, []).map(migrateDraft)); setLog(load<LogEntry[]>(LOG_LS, [])); }, []);
  const [calView, setCalView] = useState<"today" | "tomorrow" | "week" | "month">("today");
  const writeDrafts = (d: Draft[]) => { setDrafts(d); save(DRAFTS_LS, d); };
  const writeLog = (l: LogEntry[]) => { setLog(l); save(LOG_LS, l); };

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const s = await fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      setAccounts(Array.isArray(s?.accounts) ? s.accounts : []);
      setRuntime(s?.runtime ?? (s?.message ? "offline" : "—"));
    } catch { setRuntime("offline"); }
    setBusy(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // poll while a QR is being shown so status flips to ready
  useEffect(() => { if (!qrFor) return; const t = setInterval(refresh, 3000); return () => clearInterval(t); }, [qrFor, refresh]);

  async function post(path: string, body?: any) {
    setBusy(true); setNote("");
    try {
      const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const j = await r.json().catch(() => ({}));
      setBusy(false); return { ok: r.ok, status: r.status, body: j };
    } catch (e: any) { setBusy(false); return { ok: false, status: 0, body: { message: String(e?.message || e) } }; }
  }

  async function addAccount() { const r = await post("/api/telegram/accounts/new"); await refresh(); if (r.body?.activeAccountId) setQrFor(r.body.activeAccountId); setNote(r.ok ? "Создан слот аккаунта." : (r.body?.message || "Ошибка")); }
  async function selectAccount(id: string) { await post("/api/telegram/accounts/select", { accountId: id }); await refresh(); }
  async function removeAccount(id: string) { if (!confirm("Удалить аккаунт " + id + "? Сессия TDLib будет стёрта.")) return; const r = await post("/api/telegram/accounts/remove", { accountId: id }); await refresh(); setNote(r.body?.message || ""); if (qrFor === id) setQrFor(null); }
  async function startQr(id: string) { setQrFor(id); const r = await post("/api/telegram/auth/qr", { accountId: id }); setNote(r.body?.message || "QR запрошен — отсканируй в Telegram."); }

  function Accounts() {
    const ar = (s?: string) => s === "ready" ? "READY" : s === "waiting_auth" ? "WAITING_AUTH" : (s || "—").toUpperCase();
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px]">runtime: <b className={runtime === "ready" ? "text-emerald-300" : "text-amber-300"}>{runtime}</b></span>
        <button onClick={addAccount} disabled={busy} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50">＋ Add Account</button>
        <button onClick={refresh} disabled={busy} className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20">↻ Refresh</button>
        {note && <span className="text-[11px] text-tg-muted">{note}</span>}
      </div>
      {accounts.length === 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-[12px] text-tg-muted">Нет аккаунтов или backend не запущен. Подними <code>npm run api:dev</code> и нажми Refresh.</div>}
      <div className="grid gap-2 sm:grid-cols-2">{accounts.map((a) => <div key={a.slotId} className={"rounded-xl border p-3 " + (a.active ? "border-fuchsia-500/40 bg-fuchsia-500/5" : "border-white/10 bg-white/5")}>
        <div className="flex items-center justify-between">
          <div className="font-bold text-[13px]">{a.displayName || a.slotId}</div>
          <div className="flex items-center gap-1">{a.active && <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-200">ACTIVE</span>}<Badge s={ar(a.status)} /></div>
        </div>
        <div className="mt-0.5 text-[10px] text-tg-muted">{a.username || "—"} · {a.phoneMasked || "—"} · <span className="opacity-70">{a.slotId}</span></div>
        <div className="mt-0.5 text-[10px] text-tg-muted">auth: {a.authorizationState || "—"}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {!a.active && <button onClick={() => selectAccount(a.slotId)} disabled={busy} className="rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20">Select Active</button>}
          {a.status !== "ready" && <button onClick={() => startQr(a.slotId)} disabled={busy} className="rounded bg-emerald-600/25 px-2 py-1 text-[11px] hover:bg-emerald-600/40">QR Login</button>}
          <button onClick={() => removeAccount(a.slotId)} disabled={busy} className="rounded bg-rose-600/20 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-600/35">Remove</button>
        </div>
        {qrFor === a.slotId && <div className="mt-2 flex flex-col items-center rounded-lg bg-black/40 p-2">
          <img src={"/api/telegram/auth/qr-image?accountId=" + encodeURIComponent(a.slotId) + "&t=" + Date.now()} alt="QR" className="h-44 w-44 rounded bg-white p-1" />
          <div className="mt-1 text-[10px] text-tg-muted">Telegram → Настройки → Устройства → Подключить устройство → сканируй</div>
          <button onClick={() => setQrFor(null)} className="mt-1 rounded bg-white/10 px-2 py-0.5 text-[10px]">закрыть QR</button>
        </div>}
      </div>)}</div>
    </main>;
  }

  // ---- Draft Studio ----
  const [d, setD] = useState({ title: "", text: "", accountId: "", channelId: "", channelTitle: "", authorAgent: AGENTS[0], scheduleMode: "NOW" as ScheduleMode, scheduledLocal: "", priority: "NORMAL" as Priority });
  const [channels, setChannels] = useState<Chat[]>([]);
  const [chLoading, setChLoading] = useState(false);
  useEffect(() => { if (!d.accountId && accounts[0]) setD((x) => ({ ...x, accountId: accounts.find((a) => a.active)?.slotId || accounts[0].slotId })); }, [accounts]);
  useEffect(() => {
    if (!d.accountId) return; let alive = true; setChLoading(true);
    fetch("/api/telegram/chats?accountId=" + encodeURIComponent(d.accountId), { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (!alive) return; const list: Chat[] = j?.chats || j?.body?.chats || [];
      setChannels(list.filter((c) => c.category === "channel" || c.isChannel || c.category === "group"));
    }).catch(() => { if (alive) setChannels([]); }).finally(() => { if (alive) setChLoading(false); });
    return () => { alive = false; };
  }, [d.accountId]);

  function Compose() {
    const canSave = !!(d.title.trim() && d.text.trim() && d.accountId && d.channelId);
    const schedISO = d.scheduleMode === "SCHEDULED" && d.scheduledLocal ? new Date(d.scheduledLocal).toISOString() : undefined;
    const scheduleReady = d.scheduleMode === "NOW" || !!d.scheduledLocal;
    const mkDraft = (status: DraftStatus): Draft => ({ id: rid(), title: d.title.trim(), text: d.text.trim(), accountId: d.accountId, channelId: d.channelId, channelTitle: d.channelTitle, authorAgent: d.authorAgent, status, scheduleMode: d.scheduleMode, scheduledAt: schedISO, timezone: TZ, priority: d.priority, createdAt: now(), updatedAt: now() });
    const resetD = () => setD({ ...d, title: "", text: "", scheduledLocal: "" });
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mx-auto max-w-2xl space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">Draft Studio</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] text-tg-muted">Аккаунт
              <select value={d.accountId} onChange={(e) => setD({ ...d, accountId: e.target.value, channelId: "", channelTitle: "" })} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text">
                <option value="" className="bg-black">— выбрать —</option>
                {accounts.map((a) => <option key={a.slotId} value={a.slotId} className="bg-black">{a.displayName || a.slotId}{a.status === "ready" ? "" : " (не авторизован)"}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-tg-muted">Автор-агент
              <select value={d.authorAgent} onChange={(e) => setD({ ...d, authorAgent: e.target.value })} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text">
                {AGENTS.map((a) => <option key={a} value={a} className="bg-black">{a}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-[11px] text-tg-muted">Канал / группа {chLoading && <span className="opacity-60">· загрузка…</span>}
            <select value={d.channelId} onChange={(e) => { const c = channels.find((x) => String(x.id) === e.target.value); setD({ ...d, channelId: e.target.value, channelTitle: c?.title || "" }); }} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text">
              <option value="" className="bg-black">— выбрать канал —</option>
              {channels.map((c) => <option key={String(c.id)} value={String(c.id)} className="bg-black">{(c.category === "channel" || c.isChannel) ? "📢 " : "👥 "}{c.title} {c.username ? "(@" + c.username.replace(/^@/, "") + ")" : ""}</option>)}
            </select>
          </label>
          <label className="block text-[11px] text-tg-muted">Заголовок
            <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Внутреннее имя поста" className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
          </label>
          <label className="block text-[11px] text-tg-muted">Текст поста
            <textarea value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} rows={6} placeholder="Текст, который уйдёт в Telegram…" className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-[11px] text-tg-muted">Публикация
              <select value={d.scheduleMode} onChange={(e) => setD({ ...d, scheduleMode: e.target.value as ScheduleMode })} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text">
                <option value="NOW" className="bg-black">Опубликовать сейчас</option>
                <option value="SCHEDULED" className="bg-black">Запланировать</option>
              </select>
            </label>
            <label className="text-[11px] text-tg-muted">Дата / время {d.scheduleMode !== "SCHEDULED" && <span className="opacity-50">(off)</span>}
              <input type="datetime-local" value={d.scheduledLocal} disabled={d.scheduleMode !== "SCHEDULED"} onChange={(e) => setD({ ...d, scheduledLocal: e.target.value })} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text disabled:opacity-40" />
            </label>
            <label className="text-[11px] text-tg-muted">Приоритет
              <select value={d.priority} onChange={(e) => setD({ ...d, priority: e.target.value as Priority })} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text">
                <option value="LOW" className="bg-black">Low</option><option value="NORMAL" className="bg-black">Normal</option><option value="HIGH" className="bg-black">High</option>
              </select>
            </label>
          </div>
          <div className="text-[10px] text-tg-muted">{d.scheduleMode === "SCHEDULED" ? (schedISO ? "🗓 Цель: " + fmtDT(schedISO) + " · " + TZ : "⚠ выбери дату и время") : "⚡ Будет опубликовано вручную из очереди (approval-gate)"}</div>
          <div className="flex flex-wrap gap-2">
            <button disabled={!canSave} onClick={() => { writeDrafts([mkDraft("DRAFT"), ...drafts]); resetD(); setSec("approval"); }} className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20 disabled:opacity-40">💾 Save Draft</button>
            <button disabled={!canSave || !scheduleReady} onClick={() => { writeDrafts([mkDraft("PENDING"), ...drafts]); resetD(); setSec("approval"); }} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40">➜ Prepare for Approval</button>
          </div>
          {!canSave && <div className="text-[10px] text-amber-300/80">Заполни аккаунт, канал, заголовок и текст перед одобрением.</div>}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Все черновики ({drafts.length})</div>
          <div className="space-y-1">{drafts.map((x) => <div key={x.id} className="flex items-center justify-between rounded bg-black/30 px-2 py-1 text-[11px]"><span className="truncate">{x.authorAgent} · {x.title} → {x.channelTitle || x.channelId}</span><Badge s={x.status} /></div>)}</div>
        </div>
      </div>
    </main>;
  }

  function setStatus(id: string, status: DraftStatus, comment?: string) { writeDrafts(drafts.map((x) => x.id === id ? { ...x, status, comment: comment ?? x.comment, updatedAt: now() } : x)); }

  function Approval() {
    const pending = drafts.filter((x) => x.status === "PENDING");
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-2xl space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">Approval Workflow · на ревью: {pending.length}</div>
      {pending.length === 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] text-tg-muted">Нет черновиков на одобрении. Создай пост в Draft Studio → «Prepare for Approval».</div>}
      {pending.map((x) => <div key={x.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-center justify-between"><b className="text-[12px]">{x.title}</b><Badge s={x.status} /></div>
        <div className="text-[10px] text-tg-muted">{x.authorAgent} → 📢 {x.channelTitle || x.channelId} · acct {x.accountId}</div>
        <div className="text-[10px]" style={{ color: x.scheduleMode === "SCHEDULED" ? "#a5b4fc" : "#9ca3af" }}>{x.scheduleMode === "SCHEDULED" ? "🗓 " + fmtDT(x.scheduledAt) : "⚡ publish now"} · prio {x.priority || "NORMAL"}</div>
        <div className="mt-1 whitespace-pre-wrap rounded bg-black/30 p-2 text-[12px]">{x.text}</div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => { const sched = x.scheduleMode === "SCHEDULED" && !!x.scheduledAt; setStatus(x.id, sched ? "SCHEDULED" : "APPROVED"); setSec(sched ? "scheduled" : "queue"); }} className="rounded bg-emerald-600/30 px-3 py-1 text-[12px] font-semibold hover:bg-emerald-600/50">✓ Approve</button>
          <button onClick={() => { const c = prompt("Причина отклонения (необязательно):") || ""; setStatus(x.id, "REJECTED", c); }} className="rounded bg-rose-600/25 px-3 py-1 text-[12px] text-rose-200 hover:bg-rose-600/40">✕ Reject</button>
        </div>
      </div>)}
      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">История решений</div>
        <div className="space-y-0.5">{drafts.filter((x) => x.status === "APPROVED" || x.status === "REJECTED" || x.status === "PUBLISHED").map((x) => <div key={x.id} className="flex items-center justify-between text-[11px] text-tg-muted"><span className="truncate">{x.title} → {x.channelTitle}</span><span className="flex items-center gap-1">{x.comment && <span className="opacity-60 truncate max-w-[160px]">{x.comment}</span>}<Badge s={x.status} /></span></div>)}</div>
      </div>
    </div></main>;
  }

  async function publish(x: Draft) {
    const target = channels.find((chat) => String(chat.id) === String(x.channelId));
    const isChannel = target?.isChannel === true || target?.category === "channel";
    if (!confirm(`${isChannel ? "Опубликовать" : "Отправить"} одобренный текст в «${x.channelTitle || x.channelId}»?`)) return;
    const entry: LogEntry = { id: rid(), draftId: x.id, accountId: x.accountId, channelId: x.channelId, channelTitle: x.channelTitle, text: x.text, status: "PUBLISHING", createdAt: now() };
    const nextLog = [entry, ...log]; writeLog(nextLog);
    setBusy(true); setNote("");
    const response = await fetch("/api/telegram/send", {
      method: "POST",
      headers: { "content-type": "application/json", "x-epicgram-human-action": "send-button-v1" },
      body: JSON.stringify({
        chatId: x.channelId,
        text: x.text,
        actionType: isChannel ? "publish_channel" : "send_text",
        confirmation: isChannel ? "human_publish_confirm_v1" : "human_send_button_v1",
      }),
    }).catch(() => null);
    const r = response
      ? { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) }
      : { ok: false, status: 0, body: { message: "Backend недоступен." } };
    setBusy(false);
    const ok = r.ok && r.body?.sent === true;
    writeLog(nextLog.map((e) => e.id === entry.id ? { ...e, status: ok ? "SUCCESS" : "FAILED", publishedAt: now(), result: ok ? (r.body?.message || "sent") : undefined, error: ok ? undefined : (r.body?.message || ("HTTP " + r.status)) } : e));
    if (ok) setStatus(x.id, "PUBLISHED");
    setNote(ok ? "✅ Опубликовано в Telegram." : "❌ " + (r.body?.message || "ошибка отправки"));
  }

  function Queue() {
    const approved = drafts.filter((x) => x.status === "APPROVED");
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-2xl space-y-2">
      <div className="flex items-center justify-between"><div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">Publish Queue · одобрено: {approved.length}</div>{note && <span className="text-[11px] text-tg-muted">{note}</span>}</div>
      {approved.length === 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] text-tg-muted">Очередь пуста. Одобри черновик в Approval.</div>}
      {approved.map((x) => <div key={x.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
        <div className="flex items-center justify-between"><b className="text-[12px]">{x.title}</b><Badge s="APPROVED" /></div>
        <div className="text-[10px] text-tg-muted">{x.authorAgent} → 📢 {x.channelTitle || x.channelId} · acct {x.accountId}</div>
        {x.scheduledAt && <div className="text-[10px] text-indigo-300">🗓 запланировано: {fmtDT(x.scheduledAt)} · {x.timezone || TZ}</div>}
        <div className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[12px]">{x.text}</div>
        <button disabled={busy} onClick={() => publish(x)} className="mt-2 rounded-lg bg-fuchsia-600/40 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/60 disabled:opacity-40">📤 Publish to Telegram</button>
      </div>)}
    </div></main>;
  }

  function Log() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl">
      <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">Publish Log ({log.length})</div>
      <div className="overflow-auto rounded-xl border border-white/10"><table className="w-full text-[11px]"><thead className="bg-white/5 text-fuchsia-300/70"><tr>{["Время", "Канал", "Status", "Результат / Ошибка"].map((h) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{log.map((e) => <tr key={e.id} className="border-t border-white/5"><td className="px-2 py-1 text-tg-muted">{(e.publishedAt || e.createdAt).slice(11, 19)}</td><td className="px-2 py-1">{e.channelTitle || e.channelId}</td><td className="px-2 py-1"><Badge s={e.status} /></td><td className="px-2 py-1 text-tg-muted">{e.result || e.error || ""}</td></tr>)}</tbody></table></div>
      {log.length === 0 && <div className="mt-2 text-[12px] text-tg-muted">Пусто. Опубликуй пост из очереди.</div>}
    </div></main>;
  }

  // ---- PHASE R.2 Scheduled Queue (approved/scheduled only, manual publish, NO timers) ----
  function Scheduled() {
    const items = drafts.filter((x) => x.status === "APPROVED" || x.status === "SCHEDULED").sort((a, b) => ((a.scheduledAt || "9999") < (b.scheduledAt || "9999") ? -1 : 1));
    const nowISO = now();
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-2xl space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">Scheduled Queue · {items.length} · approval-gate ON, без таймеров</div>
      {items.length === 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] text-tg-muted">Пусто. Одобренные и запланированные посты появятся здесь. Публикация — только вручную.</div>}
      {items.map((x) => { const overdue = !!(x.scheduledAt && x.scheduledAt < nowISO); return <div key={x.id} className={"rounded-xl border p-3 " + (overdue ? "border-rose-500/40 bg-rose-500/5" : "border-indigo-500/30 bg-indigo-500/5")}>
        <div className="flex items-center justify-between"><b className="text-[12px]">{x.title}</b><span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: PRIO_DOT[x.priority || "NORMAL"] }} /><Badge s={x.status} /></span></div>
        <div className="text-[10px] text-tg-muted">{x.authorAgent} → 📢 {x.channelTitle || x.channelId} · acct {x.accountId}</div>
        <div className="text-[10px] text-indigo-300">{x.scheduledAt ? "🗓 " + fmtDT(x.scheduledAt) + " · " + (x.timezone || TZ) : "⚡ без времени"}{overdue && <span className="ml-1 text-rose-300">· OVERDUE</span>}</div>
        <div className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[12px]">{x.text}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => publish(x)} className="rounded-lg bg-fuchsia-600/40 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/60 disabled:opacity-40">📤 Publish now (manual)</button>
          <button onClick={() => setStatus(x.id, "CANCELLED")} className="rounded-lg bg-zinc-600/25 px-3 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-600/40">✕ Cancel</button>
        </div>
      </div>; })}
      <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-200">Нет setInterval / cron / фоновой автопубликации. Публикация — только ручной клик оператора.</div>
    </div></main>;
  }

  // ---- PHASE R.2 Content Calendar (today/tomorrow/week/month, grouped by date) ----
  function Calendar() {
    const eff = (x: Draft) => (x.scheduleMode === "SCHEDULED" && x.scheduledAt ? x.scheduledAt : (x.updatedAt || x.createdAt)).slice(0, 10);
    const todayD = now().slice(0, 10);
    const tomorrowD = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const weekEnd = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    const monthEnd = new Date(Date.now() + 31 * 864e5).toISOString().slice(0, 10);
    const inView = (dt: string) => calView === "today" ? dt === todayD : calView === "tomorrow" ? dt === tomorrowD : calView === "week" ? (dt >= todayD && dt <= weekEnd) : (dt >= todayD && dt <= monthEnd);
    const rows = drafts.filter((x) => x.status !== "CANCELLED").map((x) => ({ x, dt: eff(x) })).filter((r) => inView(r.dt));
    const byDate: Record<string, Draft[]> = {}; rows.forEach((r) => { if (!byDate[r.dt]) byDate[r.dt] = []; byDate[r.dt].push(r.x); });
    const dates = Object.keys(byDate).sort();
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-2xl space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {(["today", "tomorrow", "week", "month"] as const).map((v) => <button key={v} onClick={() => setCalView(v)} className={"rounded-full px-3 py-1 text-[11px] font-semibold " + (calView === v ? "bg-fuchsia-600/40 text-white" : "bg-white/5 text-tg-muted hover:bg-white/10")}>{v === "today" ? "Сегодня" : v === "tomorrow" ? "Завтра" : v === "week" ? "Неделя" : "Месяц"}</button>)}
        <span className="ml-auto text-[10px] text-tg-muted">{rows.length} items · {TZ}</span>
      </div>
      {dates.length === 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] text-tg-muted">Нет публикаций в этом диапазоне.</div>}
      {dates.map((dt) => <div key={dt} className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="mb-1 text-[11px] font-bold text-fuchsia-200">{dt === todayD ? "Сегодня · " : dt === tomorrowD ? "Завтра · " : ""}{dt}</div>
        <div className="space-y-1">{byDate[dt].slice().sort((a, b) => ((a.scheduledAt || "") < (b.scheduledAt || "") ? -1 : 1)).map((x) => <div key={x.id} className="flex items-center justify-between gap-2 rounded bg-black/30 px-2 py-1 text-[11px]">
          <span className="truncate"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: PRIO_DOT[x.priority || "NORMAL"] }} />{x.scheduledAt ? new Date(x.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · " : ""}{x.authorAgent} · {x.title} → {x.channelTitle || x.channelId}</span>
          <Badge s={x.status} />
        </div>)}</div>
      </div>)}
    </div></main>;
  }

  // ---- PHASE R analytics helpers (pure read from existing data) ----
  const today = now().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const success = log.filter((e) => e.status === "SUCCESS");
  const failed = log.filter((e) => e.status === "FAILED");
  const publishedToday = success.filter((e) => (e.publishedAt || e.createdAt).slice(0, 10) === today).length;
  const publishedWeek = success.filter((e) => (e.publishedAt || e.createdAt) >= weekAgo).length;
  const approvedN = drafts.filter((x) => x.status === "APPROVED" || x.status === "PUBLISHED").length;
  const rejectedN = drafts.filter((x) => x.status === "REJECTED").length;
  const approvalRate = approvedN + rejectedN > 0 ? Math.round((approvedN / (approvedN + rejectedN)) * 100) : 0;
  const byStatus = (s: DraftStatus) => drafts.filter((x) => x.status === s).length;
  function groupCount<T>(arr: T[], key: (t: T) => string) { const m: Record<string, number> = {}; arr.forEach((x) => { const k = key(x) || "—"; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }
  const nowISO2 = now();
  const weekAheadISO = new Date(Date.now() + 7 * 864e5).toISOString();
  const scheduledDrafts = drafts.filter((x) => x.status === "SCHEDULED" && !!x.scheduledAt);
  const scheduledToday = scheduledDrafts.filter((x) => (x.scheduledAt || "").slice(0, 10) === today).length;
  const scheduledWeek = scheduledDrafts.filter((x) => (x.scheduledAt || "") >= nowISO2 && (x.scheduledAt || "") <= weekAheadISO).length;
  const overdueApproved = drafts.filter((x) => (x.status === "SCHEDULED" || x.status === "APPROVED") && x.scheduledAt && x.scheduledAt < nowISO2).length;

  function Dashboard() {
    const ready = accounts.filter((a) => a.status === "ready").length;
    const tile = (label: string, value: any, color?: string) => <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] uppercase tracking-wide text-tg-muted">{label}</div><div className="mt-0.5 text-2xl font-black" style={{ color: color || "#e879f9" }}>{value}</div></div>;
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {tile("Accounts ready", ready + "/" + accounts.length, "#4ade80")}
        {tile("Published", success.length, "#38bdf8")}
        {tile("Today", publishedToday)}
        {tile("This week", publishedWeek)}
        {tile("Failed", failed.length, failed.length ? "#f87171" : "#4ade80")}
        {tile("Approval rate", approvalRate + "%")}
        {tile("Scheduled today", scheduledToday, "#818cf8")}
        {tile("Scheduled week", scheduledWeek, "#818cf8")}
        {tile("Overdue approved", overdueApproved, overdueApproved ? "#f87171" : "#4ade80")}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Queue by status</div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">{(["DRAFT", "PENDING", "APPROVED", "REJECTED", "PUBLISHED"] as DraftStatus[]).map((s) => <div key={s} className="flex items-center justify-between rounded bg-black/30 px-2 py-1"><Badge s={s} /><b>{byStatus(s)}</b></div>)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Recent publishes</div>
          <div className="space-y-0.5 text-[11px]">{log.slice(0, 6).map((e) => <div key={e.id} className="flex items-center justify-between"><span className="truncate text-tg-muted">{(e.publishedAt || e.createdAt).slice(11, 19)} · {e.channelTitle || e.channelId}</span><Badge s={e.status} /></div>)}{log.length === 0 && <div className="text-tg-muted">Пока ничего не опубликовано.</div>}</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-200">EPIC GRAM Publishing OS · approval-gate ON · автопубликации нет — человек финальный оператор.</div>
    </main>;
  }

  function Agents() {
    const rows = AGENTS.map((name) => {
      const mine = drafts.filter((x) => x.authorAgent === name);
      const pub = mine.filter((x) => x.status === "PUBLISHED");
      const channels = Array.from(new Set(mine.map((x) => x.channelTitle || x.channelId).filter(Boolean)));
      const last = mine.map((x) => x.updatedAt).sort().slice(-1)[0];
      return { name, drafts: mine.length, published: pub.length, channels, last };
    });
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">Agents · привязка к каналам и активность</div>
      <div className="grid gap-2 sm:grid-cols-2">{rows.map((a) => <div key={a.name} className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between"><b className="text-[13px] text-fuchsia-200">🤖 {a.name}</b><span className="text-[10px] text-tg-muted">{a.published} опубл. / {a.drafts} черновиков</span></div>
        <div className="mt-1 text-[11px] text-tg-muted">Каналы: {a.channels.length ? a.channels.join(", ") : "—"}</div>
        <div className="text-[10px] text-tg-muted">Последняя активность: {a.last ? a.last.slice(0, 16).replace("T", " ") : "—"}</div>
      </div>)}</div>
      <div className="mt-2 text-[10px] text-tg-muted">Полный Agent Registry (persona/memory/goals/CRUD-привязки) — следующий батч; здесь derived-overview из реальных публикаций.</div>
    </main>;
  }

  function Analytics() {
    const perChannel = groupCount(success, (e) => e.channelTitle || e.channelId);
    const perAgent = groupCount(drafts.filter((x) => x.status === "PUBLISHED"), (x) => x.authorAgent);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["Опубликовано", success.length], ["Сегодня", publishedToday], ["За неделю", publishedWeek], ["Ошибок", failed.length], ["Approval rate", approvalRate + "%"], ["Approved", approvedN], ["Rejected", rejectedN], ["Черновиков", drafts.length]].map(([l, v]) => <div key={l as string} className="rounded-xl border border-white/10 bg-white/5 p-2 text-center"><div className="text-lg font-black text-fuchsia-200">{v as any}</div><div className="text-[9px] text-tg-muted">{l as string}</div></div>)}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Публикации по каналам</div>{perChannel.length === 0 ? <div className="text-[11px] text-tg-muted">Нет данных.</div> : perChannel.map(([k, v]) => <div key={k} className="flex items-center justify-between text-[11px]"><span className="truncate text-tg-muted">{k}</span><b>{v}</b></div>)}</div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Активность агентов</div>{perAgent.length === 0 ? <div className="text-[11px] text-tg-muted">Нет данных.</div> : perAgent.map(([k, v]) => <div key={k} className="flex items-center justify-between text-[11px]"><span className="text-tg-muted">{k}</span><b>{v}</b></div>)}</div>
      </div>
    </div></main>;
  }

  function Autonomy() {
    const steps = ["AGENT", "CONTENT PLAN", "DRAFT GENERATION", "APPROVAL", "QUEUE", "PUBLISH", "ANALYTICS", "MEMORY UPDATE", "NEXT ACTION"];
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-2xl space-y-3">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-center">
        <div className="text-lg font-black text-amber-200">Autonomy Preparation · BLUEPRINT</div>
        <div className="mt-1 text-[12px] text-amber-300/90">Архитектура под будущий автономный цикл. Сейчас — без автопубликации. Approval Gate обязателен. Человек — финальный оператор.</div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex flex-col items-center gap-1">{steps.map((s, i) => <div key={s} className="flex flex-col items-center"><div className={"rounded-lg px-4 py-1.5 text-[12px] font-semibold " + (s === "APPROVAL" ? "border border-amber-400/50 bg-amber-500/15 text-amber-200" : "bg-white/5 text-tg-text")}>{s}{s === "APPROVAL" && " 🔒 (человек)"}</div>{i < steps.length - 1 && <div className="text-tg-muted">↓</div>}</div>)}</div></div>
      <div className="grid gap-1.5 sm:grid-cols-2 text-[11px]">
        {[["✅ Готово сейчас", "AGENT → DRAFT → APPROVAL → QUEUE → PUBLISH → лог/аналитика"], ["⛔ Намеренно НЕ авто", "DRAFT GENERATION (AI) и автопубликация — только после явного approve"], ["🔜 Следующий батч", "Content Brain (R6), Memory (R5), Calendar/Schedule (R2/R3), Media Library (R8)"], ["🔒 Инвариант", "Отправка доступна только после явного действия человека"]].map(([t, v]) => <div key={t} className="rounded-lg bg-white/5 p-2"><b className="text-fuchsia-200">{t}:</b> {v}</div>)}
      </div>
    </div></main>;
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col text-tg-text" style={{ background: "linear-gradient(160deg,#080711,#0c0916 55%,#080810)" }}>
      <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">‹ Назад</button>
        <div className="font-black tracking-wide">📣 EPIC GRAM Publisher</div>
        <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">Draft → Approval → Publish</span>
        <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">approval-gate ON</span>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[190px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2">{SECTIONS.map(([id, lb]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-2 text-left text-[12px] ${sec === id ? "bg-gradient-to-r from-fuchsia-600/40 to-violet-600/30 text-white font-semibold" : "hover:bg-white/5"}`}>{lb}</button>)}
          <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[9px] text-emerald-300/80">Реальный API. Публикация — только через одобрение + operator gate. Без автопостинга.</div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "dashboard" && <Dashboard />}
          {sec === "accounts" && <Accounts />}
          {sec === "compose" && <Compose />}
          {sec === "approval" && <Approval />}
          {sec === "queue" && <Queue />}
          {sec === "scheduled" && <Scheduled />}
          {sec === "calendar" && <Calendar />}
          {sec === "agents" && <Agents />}
          {sec === "analytics" && <Analytics />}
          {sec === "log" && <Log />}
          {sec === "autonomy" && <Autonomy />}
        </div>
      </div>
    </div>
  );
}
