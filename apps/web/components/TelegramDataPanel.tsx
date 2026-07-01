"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// P21: Telegram Data View — read-only visual layer that makes /platform look like
// the start of a Telegram client (folders + dialogs), on top of existing data.
// Reads ONLY existing endpoints: /api/v1/accounts/current (active account) and
// /api/telegram/chats (real dialogs). No sending, scraping, mass actions or
// bypass. Saved/Drafts have no backend endpoint yet → honest "unavailable".

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
type ChatsResp = { chats?: Chat[]; runtime?: string; message?: string; tdlibConfigured?: boolean };
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

const CHATS_SOURCE = "/api/telegram/chats";
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
      const res = await fetch(`${CHATS_SOURCE}?accountId=${encodeURIComponent(slotId)}`, { cache: "no-store" });
      const data = (await res.json()) as ChatsResp;
      if (res.status === 503 || data.tdlibConfigured === false) {
        setNotReady(true);
        setChats([]);
        setError("");
      } else if (!res.ok) {
        setNotReady(false);
        setChats([]);
        setError("Данные Telegram недоступны.");
      } else {
        setNotReady(false);
        setChats(Array.isArray(data.chats) ? data.chats : []);
        setError("");
      }
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
    saved: 0,
    drafts: 0
  }), [chats]);

  const visible = useMemo(() => {
    if (folder === "channels") return chats.filter(isChannel);
    if (folder === "groups") return chats.filter(isGroup);
    if (folder === "chats") return chats.filter(isPersonal);
    if (folder === "all") return chats;
    return [];
  }, [chats, folder]);

  const notImplemented = folder === "saved" || folder === "drafts";
  const accName = current?.displayName ?? current?.label ?? current?.slotId ?? "—";
  const ready = current?.status === "ready" || current?.authorizationState === "authorizationStateReady";

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
          {!loading && !error && notReady && (
            <div className="m-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Telegram не авторизован для активного слота — данные недоступны.</div>
          )}
          {!loading && !error && !notReady && notImplemented && (
            <div className="m-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              «{folder === "saved" ? "Saved Messages" : "Черновики"}» — бэкенд-эндпоинт ещё не реализован. Появится в следующем этапе (read-only). Данные не подделываются.
            </div>
          )}
          {!loading && !error && !notReady && !notImplemented && (
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
          <div className="mt-2 px-2 text-[10px] text-white/30">источник: {folder === "saved" || folder === "drafts" ? "— (не реализовано)" : CHATS_SOURCE} · только чтение</div>
        </div>
      </div>
    </section>
  );
}
