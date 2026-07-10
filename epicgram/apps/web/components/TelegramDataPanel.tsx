"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// P21 + P22A: Telegram Data View — read-only visual layer (folders + dialogs).
// Prefers the versioned /api/v1/telegram/dialogs contract, falls back to the
// legacy /api/telegram/chats. Saved/Drafts read from versioned endpoints and
// render honest empty states when the backend has no data. No sending, scraping,
// mass actions or bypass. Secrets are never shown; phones stay API-masked.

type Chat = {
  id?: string;
  title?: string;
  category?: string;
  isChannel?: boolean;
  isBot?: boolean;
  unreadCount?: number;
  username?: string | null;
  lastMessage?: { content?: string } | null;
};
type DialogsResp = { dialogs?: Chat[]; ready?: boolean; source?: string; counts?: Record<string, number>; message?: string };
type ChatsResp = { chats?: Chat[]; runtime?: string; message?: string; tdlibConfigured?: boolean };
type ListResp = { available?: boolean; items?: Array<{ id?: string; title?: string; preview?: string }>; message?: string };
type Current = {
  activeAccountId?: string;
  account?: {
    slotId?: string;
    displayName?: string | null;
    label?: string | null;
    phoneMasked?: string | null;
    authorizationState?: string | null;
    status?: string | null;
    username?: string | null;
  } | null;
};

const FOLDERS = [
  { id: "all", label: "Все" },
  { id: "chats", label: "Чаты" },
  { id: "channels", label: "Каналы" },
  { id: "groups", label: "Группы" },
  { id: "saved", label: "Saved" },
  { id: "drafts", label: "Черновики" }
] as const;
type FolderId = (typeof FOLDERS)[number]["id"];

const DIALOGS_SOURCE = "/api/v1/telegram/dialogs";
const CHATS_FALLBACK = "/api/telegram/chats";
const SAVED_SOURCE = "/api/v1/telegram/saved";
const DRAFTS_SOURCE = "/api/v1/telegram/drafts";
const ACCOUNT_SOURCE = "/api/v1/accounts/current";

function avatarColor(seed: string) {
  const palette = ["bg-fuchsia-500/30", "bg-sky-500/30", "bg-emerald-500/30", "bg-amber-500/30", "bg-rose-500/30", "bg-violet-500/30"];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function isChannel(c: Chat) { return c.category === "channel" || c.isChannel === true; }
function isGroup(c: Chat) { return c.category === "group"; }
function isPersonal(c: Chat) { return c.category === "private" || c.category === "bot"; }

export function TelegramDataPanel() {
  const [current, setCurrent] = useState<Current["account"] | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [source, setSource] = useState<string>("");
  const [saved, setSaved] = useState<ListResp | null>(null);
  const [drafts, setDrafts] = useState<ListResp | null>(null);
  const [folder, setFolder] = useState<FolderId>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");
  const [notReady, setNotReady] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const load = useCallback(async () => {
    if (refreshing) return; // refresh-spam lock
    setRefreshing(true);
    try {
      const accRes = await fetch(ACCOUNT_SOURCE, { cache: "no-store" });
      const acc = (await accRes.json()) as Current;
      const slot = acc.account ?? null;
      setCurrent(slot);
      const slotId = slot?.slotId ?? acc.activeAccountId ?? "";
      const q = `?accountId=${encodeURIComponent(slotId)}`;

      // Prefer versioned dialogs; fall back to legacy chats.
      let list: Chat[] = [];
      let src = "";
      let ready = true;
      let unavailable = false;
      try {
        const r = await fetch(`${DIALOGS_SOURCE}${q}`, { cache: "no-store" });
        const d = (await r.json()) as DialogsResp;
        if (r.ok && Array.isArray(d.dialogs)) {
          list = d.dialogs;
          src = DIALOGS_SOURCE;
          ready = d.ready !== false;
          if (d.ready === false) unavailable = true;
        } else {
          throw new Error("v1 dialogs unavailable");
        }
      } catch {
        const r2 = await fetch(`${CHATS_FALLBACK}${q}`, { cache: "no-store" });
        const d2 = (await r2.json()) as ChatsResp;
        src = `${CHATS_FALLBACK} (fallback)`;
        if (r2.status === 503 || d2.tdlibConfigured === false) { unavailable = true; ready = false; }
        else if (!r2.ok) { setError("Данные Telegram недоступны."); }
        else list = Array.isArray(d2.chats) ? d2.chats : [];
      }
      setChats(list);
      setSource(src);
      setNotReady(unavailable || !ready);
      if (list.length > 0 || unavailable) setError("");

      // Saved + drafts (versioned; honest empty when unavailable).
      const [sv, df] = await Promise.all([
        fetch(`${SAVED_SOURCE}${q}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch(`${DRAFTS_SOURCE}${q}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null)
      ]);
      setSaved(sv as ListResp | null);
      setDrafts(df as ListResp | null);

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {
      setError("Бэкенд недоступен.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [refreshing]);

  useEffect(() => { load(); /* initial */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    all: chats.length,
    chats: chats.filter(isPersonal).length,
    channels: chats.filter(isChannel).length,
    groups: chats.filter(isGroup).length,
    saved: saved?.items?.length ?? 0,
    drafts: drafts?.items?.length ?? 0
  }), [chats, saved, drafts]);

  const visible = useMemo(() => {
    if (folder === "channels") return chats.filter(isChannel);
    if (folder === "groups") return chats.filter(isGroup);
    if (folder === "chats") return chats.filter(isPersonal);
    if (folder === "all") return chats;
    return [];
  }, [chats, folder]);

  const isList = folder === "saved" || folder === "drafts";
  const listData = folder === "saved" ? saved : folder === "drafts" ? drafts : null;
  const listItems = listData?.items ?? [];
  const accName = current?.displayName ?? current?.label ?? current?.slotId ?? "—";
  const ready = current?.status === "ready" || current?.authorizationState === "authorizationStateReady";
  const sourceLabel = isList ? (folder === "saved" ? SAVED_SOURCE : DRAFTS_SOURCE) : (source || "—");

  return (
    <section className="mx-auto mb-4 max-w-5xl rounded-2xl border border-white/10 bg-white/5">
      {/* Account-aware header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white ${avatarColor(accName)}`}>{accName.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{accName}</div>
          <div className="text-[11px] text-white/50">{current?.phoneMasked ?? "—"} · {current?.authorizationState ?? current?.status ?? "—"}</div>
        </div>
        <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${ready ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"}`}>{ready ? "online" : "offline"}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-white/40">{lastRefreshed ? `обновлено ${lastRefreshed}` : ""}</span>
          <button onClick={load} disabled={refreshing} className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/80 hover:bg-white/20 disabled:opacity-40">{refreshing ? "…" : "Обновить"}</button>
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[180px_1fr]">
        {/* Folders rail */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFolder(f.id)}
              className={`flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${folder === f.id ? "bg-fuchsia-500/15 text-fuchsia-100" : "text-white/70 hover:bg-white/10"}`}
            >
              <span>{f.label}</span>
              <span className="rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] text-white/50">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {/* Data list (fixed height, internal scroll — Telegram-like) */}
        <div className="max-h-[560px] min-h-[220px] overflow-auto p-2">
          {loading && <div className="p-4 text-sm text-white/50">Загрузка Telegram Data…</div>}
          {!loading && error && <div className="m-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
          {!loading && !error && notReady && !isList && (
            <div className="m-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Telegram не авторизован для активного слота — данные недоступны.</div>
          )}

          {/* Saved / Drafts */}
          {!loading && !error && isList && (
            listItems.length > 0 ? (
              <div className="space-y-1">
                {listItems.map((it, i) => (
                  <div key={it.id ?? i} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${avatarColor(it.title ?? String(i))}`}>{(it.title ?? "•").slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{it.title ?? "—"}</div>
                      <div className="truncate text-[12px] text-white/45">{it.preview ?? ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="m-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                {folder === "saved" ? "Saved messages unavailable or empty" : "No drafts available"}
                <div className="mt-1 text-[11px] text-white/35">{listData?.message ?? "бэкенд-эндпоинт вернул пустое состояние (данные не подделываются)"}</div>
              </div>
            )
          )}

          {/* Dialogs */}
          {!loading && !error && !notReady && !isList && (
            <>
              {visible.length === 0 && <div className="p-4 text-sm text-white/40">Пусто в этой папке.</div>}
              <div className="space-y-1">
                {visible.map((c) => {
                  const title = c.title || "Без названия";
                  const kind = isChannel(c) ? "канал" : isGroup(c) ? "группа" : c.isBot ? "бот" : "чат";
                  return (
                    <div key={c.id ?? title} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${avatarColor(title)}`}>{title.slice(0, 1).toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 truncate text-sm font-semibold text-white">{title}</span>
                          <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">{kind}</span>
                        </div>
                        <div className="truncate text-[12px] text-white/45">{c.lastMessage?.content || c.username || "—"}</div>
                      </div>
                      {Boolean(c.unreadCount) && <span className="shrink-0 rounded-full bg-fuchsia-500/70 px-2 py-0.5 text-[11px] font-bold text-white">{c.unreadCount}</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-2 px-2 text-[10px] text-white/30">источник: {sourceLabel} · только чтение</div>
        </div>
      </div>
    </section>
  );
}
