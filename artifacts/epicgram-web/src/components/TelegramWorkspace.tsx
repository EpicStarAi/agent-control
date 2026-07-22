
// TelegramWorkspace — Enterprise Telegram client UI inside EPIC☠STAR CONTROL.
// Category: COMMUNICATION · Status: ACTIVE
// Chat browsing stays READ-ONLY: real data from the existing Telegram Layer
// (/api/telegram/status, /api/telegram/chats). No deleting / editing / automation.
// The one exception is outgoing sends: an operator can request an AI draft
// (/api/ai/suggest), review/edit it, then explicitly Approve & Send
// (/api/telegram/send with operatorApproved=true) or Reject (/api/ai/audit/reject).
// A blocked/failed send never gets appended to the chat history shown here —
// see `approveAndSend` below. No backend/TDLib logic is duplicated, only called.

import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import SettingsCenter from "@/components/SettingsCenter";
import { AddAccountWizard } from "@/components/AddAccountWizard";

export type OperatorCommand = {
  reqId: string;
  intent: "open_private_chats" | "open_chat_list" | "open_current_chat" | "open_chat_by_name" | "show_chat_context";
  query?: string;
};

type Ctx = {
  agents: any[]; missions: any[]; exec: any[]; devices: any[]; slots: any[];
  bind: Record<string, string>; counts: Record<string, any>; activeId: string;
};
type Chat = {
  id: any; title?: string; username?: string | null;
  category?: "private" | "group" | "channel" | "bot" | "chat"; isChannel?: boolean; isBot?: boolean;
  isMarkedAsUnread?: boolean; unreadCount?: number; isMuted?: boolean; memberCount?: number;
  lastMessage?: { content?: string; text?: string } | null;
  photoSmallFileId?: string | null;
};

const LS = "epic_tg_workspace_v1";
const SECTIONS = [
  ["accounts", "👤 Аккаунты"], ["folders", "🗂 Папки"], ["dialogs", "💬 Диалоги"], ["groups", "👥 Группы"],
  ["channels", "📢 Каналы"], ["bots", "🤖 Боты"], ["contacts", "📇 Контакты"], ["saved", "🔖 Сохранённое"],
  ["media", "🖼 Медиа"], ["files", "📁 Файлы"], ["calls", "📞 Звонки"], ["sessions", "🔐 Сессии"],
  ["analytics", "📊 Аналитика"], ["archive", "🗄 Архив"], ["settings", "⚙ Настройки"],
] as const;
const FILTERS = ["Все", "Непрочитанные", "Без звука", "Боты", "Каналы", "Группы", "Личные"];

// Local AI workspace cards — seeded, non-Telegram "group/channel" cards that document the
// project itself (memory + technical tasks). Mirrors the original EPICGRAM shell's default
// view before a real Telegram session is authorized. Read-only, no backend calls.
type LocalItem = { id: string; folder: "groups" | "channels"; title: string; subtitle: string; badge: string; memory: string[]; tasks: string[] };
const LOCAL_ITEMS: LocalItem[] = [
  { id: "group-tdlib-core", folder: "groups", title: "Техгруппа: TDLib Core", subtitle: "Авторизация, QR, номер телефона, статус сессии", badge: "AI группа",
    memory: ["Подключать только аккаунты владельца через официальный TDLib.", "Сессии хранить на backend в зашифрованном виде.", "QR и код подтверждения не сохранять во frontend."],
    tasks: ["Спроектировать login-flow", "Добавить endpoint статуса", "Подготовить logout/delete session"] },
  { id: "group-sessions", folder: "groups", title: "Техгруппа: Сессии", subtitle: "Шифрование, хранение, список подключенных аккаунтов", badge: "AI группа",
    memory: ["Каждая сессия имеет owner_id и метку согласия.", "Удаление сессии доступно из интерфейса.", "Секреты не попадают в localStorage браузера."],
    tasks: ["Выбрать хранилище", "Добавить encryption key", "Сделать список аккаунтов"] },
  { id: "group-agents", folder: "groups", title: "Техгруппа: AI-операторы", subtitle: "Права агентов, память, подтверждение действий", badge: "AI группа",
    memory: ["AI-агенты не отправляют сообщения без подтверждения человека.", "Каждое действие агента пишется в аудит.", "Память разделяется по аккаунтам и рабочим областям."],
    tasks: ["Описать роли агентов", "Добавить approval queue", "Связать память с аккаунтом"] },
  { id: "channel-memory", folder: "channels", title: "AI Канал: Память", subtitle: "Долговременная память проекта и подключенных аккаунтов", badge: "AI канал",
    memory: ["Пользователь явно авторизует каждый аккаунт.", "Память не включает приватные сообщения без разрешения.", "Сводки хранят источник и время создания."],
    tasks: ["Создать memory schema", "Добавить экспорт", "Добавить очистку памяти"] },
  { id: "channel-decisions", folder: "channels", title: "AI Канал: Решения", subtitle: "Архив технических решений и ограничений безопасности", badge: "AI канал",
    memory: ["Frontend показывает состояние и запускает consent-flow.", "TDLib работает на backend или локальном runtime.", "Telegram-сессии не скрываются от владельца."],
    tasks: ["Зафиксировать архитектуру", "Описать угрозы", "Добавить журнал решений"] },
  { id: "channel-automation", folder: "channels", title: "AI Канал: Автоматизации", subtitle: "План будущих безопасных автоматизаций", badge: "AI канал",
    memory: ["Массовый спам и скрытая имитация запрещены.", "Автоматизация возможна только для разрешенных процессов.", "В MVP внешняя отправка остается на подтверждении человека."],
    tasks: ["Список разрешенных сценариев", "Политика лимитов", "Human approval UI"] },
];

// ---- THEMES ----
// Real, live-switchable themes driven from SettingsCenter → Оформление. Overrides the same
// CSS custom properties Tailwind's tg-* utilities already read (--color-tg-*), plus two extra
// tokens (tg-panel/tg-bubble) for the header/nav/message-bubble surfaces. Pure CSS var override
// on the workspace root — no backend/data change, purely presentational.
export const THEME_SETTINGS_KEY = "epic_settings_center_v1";
export const THEME_CHANGE_EVENT = "epic:theme-changed";
export type ThemeId = "classic" | "epicgram" | "light" | "dark";
type ThemeVars = Record<"--color-tg-bg" | "--color-tg-panel" | "--color-tg-bubble" | "--color-tg-line" | "--color-tg-text" | "--color-tg-muted" | "--color-tg-accent" | "--color-tg-active", string>;
export const THEME_PRESETS: Record<ThemeId, ThemeVars> = {
  classic: { "--color-tg-bg": "#0e1621", "--color-tg-panel": "#17212b", "--color-tg-bubble": "#182533", "--color-tg-line": "rgba(255,255,255,.08)", "--color-tg-text": "#e6e6ea", "--color-tg-muted": "#8b8f9a", "--color-tg-accent": "#38bdf8", "--color-tg-active": "#1d4ed8" },
  epicgram: { "--color-tg-bg": "#0b0710", "--color-tg-panel": "#160f22", "--color-tg-bubble": "#22162f", "--color-tg-line": "rgba(216,140,255,.16)", "--color-tg-text": "#f3e8ff", "--color-tg-muted": "#b79ad1", "--color-tg-accent": "#e879f9", "--color-tg-active": "#a21caf" },
  light: { "--color-tg-bg": "#f4f4f6", "--color-tg-panel": "#ffffff", "--color-tg-bubble": "#eef1f5", "--color-tg-line": "rgba(0,0,0,.08)", "--color-tg-text": "#1c1c1e", "--color-tg-muted": "#6b7280", "--color-tg-accent": "#2563eb", "--color-tg-active": "#2563eb" },
  dark: { "--color-tg-bg": "#050505", "--color-tg-panel": "#111113", "--color-tg-bubble": "#1a1a1d", "--color-tg-line": "rgba(255,255,255,.06)", "--color-tg-text": "#f5f5f5", "--color-tg-muted": "#9a9a9a", "--color-tg-accent": "#22c55e", "--color-tg-active": "#16a34a" },
};
export function readStoredTheme(): ThemeId {
  try { const v = JSON.parse(localStorage.getItem(THEME_SETTINGS_KEY) || "null"); if (v?.theme && v.theme in THEME_PRESETS) return v.theme; } catch {}
  return "classic";
}
function useWorkspaceTheme() {
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);
  useEffect(() => {
    const onChange = (e: Event) => { const id = (e as CustomEvent).detail?.theme; if (id && id in THEME_PRESETS) setTheme(id); };
    const onStorage = (e: StorageEvent) => { if (e.key === THEME_SETTINGS_KEY) setTheme(readStoredTheme()); };
    window.addEventListener(THEME_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(THEME_CHANGE_EVENT, onChange); window.removeEventListener("storage", onStorage); };
  }, []);
  return THEME_PRESETS[theme] as React.CSSProperties;
}

// ---- RESIZABLE PANELS ----
// Each column of the workspace grid (nav / chat-list / main / agent sidebar) can be dragged
// to its own width, independent of the others, and persisted per-browser so it stays put
// across reloads. Pure layout state — no data/backend change.
const RESIZE_LS = "epic_tg_panel_widths_v1";
type PanelWidths = Record<string, number>;
function readStoredWidths(): PanelWidths {
  try { const v = JSON.parse(localStorage.getItem(RESIZE_LS) || "null"); if (v && typeof v === "object") return v; } catch {}
  return {};
}
// Panels anchored to the right edge (e.g. the agent sidebar) shrink as the divider moves right,
// so their delta must be inverted relative to left-anchored panels (nav/list).
const RIGHT_ANCHORED = new Set(["aside"]);
function useResizableWidths(defaults: Record<string, number>, limits: Record<string, [number, number]>) {
  const [widths, setWidths] = useState<PanelWidths>(() => {
    const stored = readStoredWidths();
    // Clamp any persisted values to current limits so a stale/corrupt localStorage entry
    // (e.g. from a previous session with different bounds) can't break the layout.
    const merged: PanelWidths = { ...defaults, ...stored };
    for (const k of Object.keys(merged)) {
      const [min, max] = limits[k] || [80, 800];
      merged[k] = Math.max(min, Math.min(max, merged[k]));
    }
    return merged;
  });
  const widthsRef = useRef(widths); widthsRef.current = widths;
  const defaultsRef = useRef(defaults); defaultsRef.current = defaults;
  const limitsRef = useRef(limits); limitsRef.current = limits;
  const dragRef = useRef<{ key: string; startX: number; startW: number } | null>(null);
  // Mount-once listeners: refs (not state/props) carry the live values, so dragging never
  // re-subscribes mousemove/mouseup on every render and never jitters mid-drag.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      const [min, max] = limitsRef.current[d.key] || [80, 800];
      const dx = e.clientX - d.startX;
      const raw = RIGHT_ANCHORED.has(d.key) ? d.startW - dx : d.startW + dx;
      const next = Math.max(min, Math.min(max, raw));
      setWidths((w) => (w[d.key] === next ? w : { ...w, [d.key]: next }));
    };
    const endDrag = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = ""; document.body.style.userSelect = "";
      setWidths((w) => { try { localStorage.setItem(RESIZE_LS, JSON.stringify(w)); } catch {} return w; });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", endDrag);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", endDrag);
      endDrag(); // if unmounted mid-drag, don't leave the cursor/select style stuck on <body>
    };
  }, []);
  const startDrag = (key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { key, startX: e.clientX, startW: widthsRef.current[key] ?? defaultsRef.current[key] ?? 200 };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
  };
  const resetWidths = () => { setWidths({ ...defaultsRef.current }); try { localStorage.removeItem(RESIZE_LS); } catch {} };
  return { widths, startDrag, resetWidths };
}
function ColResizer({ onMouseDown, title }: { onMouseDown: (e: React.MouseEvent) => void; title?: string }) {
  return (
    <div
      onMouseDown={onMouseDown}
      title={title || "Потяните, чтобы изменить ширину"}
      className="group relative z-10 w-[3px] shrink-0 cursor-col-resize bg-tg-line/60 hover:bg-tg-accent active:bg-tg-accent"
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  );
}

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const av = (s: string) => "#" + ((hash(s) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
const ini = (s: string) => (s || "•").replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "•";
const cat = (c: Chat): "channel" | "group" | "bot" | "private" => c.category === "channel" || c.isChannel ? "channel" : c.category === "bot" || c.isBot ? "bot" : c.category === "group" ? "group" : "private";
const preview = (c: Chat) => c.lastMessage?.content || c.lastMessage?.text || "";

type MobileTab = "chats" | "contacts" | "epic" | "settings" | "profile";

export function TelegramWorkspace({ ctx, slotId, focusKind, focusId, command, onClose, onOpenAgent }: {
  ctx: Ctx; slotId?: string; focusKind?: string; focusId?: string; command?: OperatorCommand | null; onClose: () => void; onOpenAgent?: (id: string) => void;
}) {
  // ctx.slots is populated by embedders that manage accounts/agents centrally.
  // On this page ctx is a static empty stub, so fall back to whatever the
  // read-only /telegram/status poll below found (statusAccounts).
  const [statusAccounts, setStatusAccounts] = useState<any[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const accountSlots = ctx.slots && ctx.slots.length > 0 ? ctx.slots : statusAccounts;
  const accounts = useMemo(() => (accountSlots || []).map((s: any) => {
    const ownerId = ctx.bind?.[s.slotId || s.label]; const owner = ctx.agents?.find((a) => a.id === ownerId);
    return { id: s.slotId || s.label || "acc", name: s.displayName || s.slotId || "Telegram", phone: s.phoneMasked || "—", status: s.status || s.authorizationState || "—", authState: s.authorizationState, username: s.username || null, photoFileId: s.photoSmallFileId || null, owner, device: ctx.devices?.find((d) => d.id === owner?.deviceId)?.name || "—", raw: s };
  }), [ctx, accountSlots]);

  const [section, setSection] = useState<string>("dialogs");
  const [acc, setAcc] = useState<string>(slotId || ctx.activeId || accounts[0]?.id || "");
  const [filter, setFilter] = useState("Все");
  const [chat, setChat] = useState<string>("");
  const [localItem, setLocalItem] = useState<string>("");
  const [q, setQ] = useState("");
  const [palette, setPalette] = useState(false);
  const [pq, setPq] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [conn, setConn] = useState<"connected" | "syncing" | "offline">("offline");

  // `acc` may start empty when accounts only become known asynchronously via
  // the /telegram/status poll (statusAccounts fallback below). Reconcile once
  // real accounts arrive so avatar/photo lookups and chat fetches never use
  // an empty/invalid account id.
  useEffect(() => {
    if (!accounts.length) return;
    if (!accounts.some((a) => a.id === acc)) setAcc(accounts[0].id);
  }, [accounts]);
  const [loading, setLoading] = useState(false);
  const [fetchedAcc, setFetchedAcc] = useState("");
  const [mode, setMode] = useState<"client" | "command">("client");
  const [mobileTab, setMobileTab] = useState<MobileTab>("chats");
  const [cc, setCc] = useState<string>("overview");
  const [gv, setGv] = useState({ tx: 40, ty: 20, s: 0.8 });
  const [gpos, setGpos] = useState<Record<string, { x: number; y: number }>>({});
  const [gsel, setGsel] = useState<string>("");
  const [gfocus, setGfocus] = useState<string>("");
  const [feed, setFeed] = useState<{ t: string; kind: string; text: string }[]>([]);
  const gdrag = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number }>({ mode: null, sx: 0, sy: 0, ox: 0, oy: 0 });
  const [discStatus, setDiscStatus] = useState<"idle" | "discovering" | "indexing" | "building" | "completed" | "error">("idle");
  const [discLog, setDiscLog] = useState<{ t: string; text: string }[]>([]);
  const [index, setIndex] = useState<any>(null);

  // ---- MESSAGE HISTORY ----
  type TgMessage = { id: string; senderId: string | null; content: string; date: string | null };
  const [msgs, setMsgs] = useState<TgMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [msgsHasMore, setMsgsHasMore] = useState(false);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  // ---- DIRECT COMPOSE ----
  const [compose, setCompose] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  // ---- AUDIT VIEWER ----
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ---- AI DRAFT APPROVAL — the only path that can put a message into a real chat.
  // A draft is proposed via /ai/suggest (never sent anywhere), reviewed here, and only
  // reaches Telegram if the operator explicitly clicks "Approve & Send", which sends
  // operatorApproved=true to /telegram/send. If that call is blocked (412) or fails, the
  // draft/error stays local to this panel and is NEVER appended to `sentByChat` — so a
  // send blocked by the approval gate can never appear as if it went out in chat history.
  const [draftByChat, setDraftByChat] = useState<Record<string, { text: string; auditId: string | null; loading: boolean; error: string | null; sending: boolean }>>({});
  const [sentByChat, setSentByChat] = useState<Record<string, { text: string; at: string }[]>>({});
  const themeVars = useWorkspaceTheme();
  const { widths: panelW, startDrag: startPanelDrag } = useResizableWidths(
    { nav: 210, list: 320, aside: 280, ccNav: 180 },
    { nav: [140, 360], list: [220, 520], aside: [200, 460], ccNav: [140, 320] },
  );

  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(LS) || "{}"); if (d.section) setSection(d.section); if (!slotId && d.acc) setAcc(d.acc); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ section, acc })); } catch {} }, [section, acc]);
  useEffect(() => { if (focusKind === "channel") setSection("channels"); else if (focusKind === "group") setSection("groups"); else if (focusKind === "bot") setSection("bots"); }, [focusKind]);

  // ---- LOAD MESSAGE HISTORY when chat changes ----
  useEffect(() => {
    if (!chat) { setMsgs([]); setMsgsHasMore(false); return; }
    let alive = true;
    setMsgsLoading(true);
    setMsgs([]);
    setMsgsHasMore(false);
    fetch(apiUrl(`/telegram/messages?chatId=${encodeURIComponent(chat)}&accountId=${encodeURIComponent(acc)}&limit=30`), { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!alive) return;
        const raw: TgMessage[] = Array.isArray(j?.messages) ? j.messages : [];
        // TDLib returns newest-first; reverse to show oldest at top
        setMsgs([...raw].reverse());
        setMsgsHasMore(raw.length >= 30);
      })
      .catch(() => {})
      .finally(() => { if (alive) setMsgsLoading(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat, acc]);
  useEffect(() => { function onKey(e: KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setPalette((v) => !v); setPq(""); } if (e.key === "Escape") setPalette(false); } window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);

  // ---- READ-ONLY DATA FETCH from existing Telegram Layer ----
  // Helper: fetch with a timeout so we never hang forever on slow TDLib responses
  function fetchWithTimeout(url: string, ms = 15000): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { cache: "no-store", signal: ctrl.signal }).finally(() => clearTimeout(timer));
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      setConn("syncing"); setLoading(true);
      try {
        // First try the fast accounts list so UI shows something quickly
        const acj = await fetchWithTimeout(apiUrl("/v1/accounts"), 8000).then(r => r.ok ? r.json() : null).catch(() => null);
        if (alive && Array.isArray(acj?.accounts) && acj.accounts.length) {
          setStatusAccounts(acj.accounts);
        }

        const s = await fetchWithTimeout(apiUrl("/telegram/status"), 15000).then((r) => r.json()).catch(() => null);
        const active = (s?.accounts || []).find((a: any) => (a.slotId || a.label) === acc) || (s?.accounts || [])[0];
        const ready = active && (active.authorizationState === "authorizationStateReady" || active.status === "ready" || active.status === "authorized");
        if (!alive) return;
        if (Array.isArray(s?.accounts)) setStatusAccounts(s.accounts);
        if (!s || !active) { setConn("offline"); setChats([]); setLoading(false); setFetchedAcc(acc); return; }
        const cj = await fetchWithTimeout(apiUrl("/telegram/chats?") + "accountId=" + encodeURIComponent(acc || active.slotId || ""), 20000).then((r) => r.json()).catch(() => null);
        if (!alive) return;
        const list: Chat[] = cj?.chats || (cj?.body && cj.body.chats) || [];
        setChats(Array.isArray(list) ? list : []);
        setConn(ready ? "connected" : list.length ? "connected" : "offline");
      } catch { if (alive) { setConn("offline"); setChats([]); } }
      if (alive) { setLoading(false); setFetchedAcc(acc); }
    }
    load();
    return () => { alive = false; };
  }, [acc, refreshTick]);

  const account = accounts.find((a) => a.id === acc) || accounts[0];
  const lastCommandRef = useRef<string>("");

  // ---- OPERATOR NATURAL-LANGUAGE COMMANDS (UI navigation only) ----
  // Executes intents forwarded by GlobalAIOperatorSidebar via the `command` prop and reports
  // back over a CustomEvent so the sidebar can render the result. No send, no TDLib, no
  // account/session changes — this only moves `section`/`filter`/`chat` UI state.
  useEffect(() => {
    if (!command || !command.reqId || lastCommandRef.current === command.reqId) return;
    if (loading) return; // wait for the read-only chat list fetch to settle before acting
    lastCommandRef.current = command.reqId;

    const report = (success: boolean, message: string) => {
      try {
        window.dispatchEvent(new CustomEvent("deepinside:operator-result", {
          detail: { reqId: command.reqId, intent: command.intent, success, message },
        }));
      } catch {}
    };

    const privateCount = chats.filter((c) => cat(c) === "private").length;

    if (command.intent === "open_private_chats") {
      setSection("dialogs"); setFilter("Личные");
      report(true, privateCount > 0
        ? `Открыл «Личные сообщения» (${privateCount} чат${privateCount === 1 ? "" : "ов"}).`
        : "Открыл фильтр «Личные сообщения». Пока в списке нет личных чатов.");
      return;
    }
    if (command.intent === "open_chat_list") {
      setSection("dialogs"); setFilter("Все");
      report(true, `Открыл список чатов (${chats.length}).`);
      return;
    }
    if (command.intent === "open_current_chat") {
      const cur = chats.find((c) => c.id === chat);
      if (cur) { setSection("dialogs"); report(true, `Текущий чат уже открыт: «${cur.title || "чат"}».`); }
      else report(false, "Чат не открыт. Выбери чат из списка или напиши точное имя.");
      return;
    }
    if (command.intent === "open_chat_by_name") {
      const query = (command.query || "").trim().toLowerCase();
      const found = chats.find((c) => (c.title || "").toLowerCase() === query || (c.username || "").toLowerCase() === query)
        || chats.find((c) => (c.title || "").toLowerCase().includes(query) || (c.username || "").toLowerCase().includes(query));
      if (found) { setSection("dialogs"); setFilter("Все"); setChat(found.id); setLocalItem(""); report(true, `Открыл чат «${found.title || found.username || query}».`); }
      else report(false, "Не нашёл чат. Выбери его вручную или напиши точное имя.");
      return;
    }
    if (command.intent === "show_chat_context") {
      const cur = chats.find((c) => c.id === chat);
      if (cur) {
        const kind = cat(cur);
        const unread = cur.unreadCount ? `, непрочитано: ${cur.unreadCount}` : "";
        const last = preview(cur) ? ` · последнее: «${preview(cur)}»` : "";
        report(true, `Контекст чата: «${cur.title || cur.username || "чат"}» (тип: ${kind}${unread})${last}.`);
      } else {
        report(false, "Чат не открыт. Выбери чат из списка или напиши точное имя, чтобы я показал контекст.");
      }
      return;
    }
  }, [command, loading, chats, chat]);

  // ---- DERIVE REAL OBJECTS (read-only) ----
  const dialogs = chats;
  const groups = useMemo(() => chats.filter((c) => cat(c) === "group"), [chats]);
  const channels = useMemo(() => chats.filter((c) => cat(c) === "channel"), [chats]);
  const bots = useMemo(() => chats.filter((c) => cat(c) === "bot"), [chats]);
  const contacts = useMemo(() => chats.filter((c) => cat(c) === "private"), [chats]);
  const stats = {
    dialogs: chats.length, groups: groups.length, channels: channels.length, bots: bots.length,
    contacts: contacts.length, media: 0, files: 0, unread: chats.reduce((s, c) => s + (c.unreadCount || 0), 0),
  };

  const fDialogs = useMemo(() => dialogs.filter((d) => {
    if (filter === "Непрочитанные" && !(d.unreadCount || d.isMarkedAsUnread)) return false;
    if (filter === "Без звука" && !d.isMuted) return false;
    if (filter === "Каналы" && cat(d) !== "channel") return false;
    if (filter === "Группы" && cat(d) !== "group") return false;
    if (filter === "Боты" && cat(d) !== "bot") return false;
    if (filter === "Личные" && cat(d) !== "private") return false;
    if (q && !((d.title || "") + " " + (d.username || "") + " " + preview(d)).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [dialogs, filter, q]);

  const requestDraft = async () => {
    if (!selChat) return;
    const chatId = String(selChat.id);
    setDraftByChat((d) => ({ ...d, [chatId]: { text: "", auditId: null, loading: true, error: null, sending: false } }));
    try {
      const r = await fetch(apiUrl("/ai/suggest"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, chatTitle: selChat.title || null, history: [], instruction: "" }),
      });
      const j = await r.json().catch(() => null);
      const draftText = String(j?.draft || "").trim();
      if (!r.ok || !j?.ok || !draftText) {
        setDraftByChat((d) => ({ ...d, [chatId]: { text: "", auditId: null, loading: false, error: j?.message || "AI не смог предложить черновик.", sending: false } }));
        return;
      }
      setDraftByChat((d) => ({ ...d, [chatId]: { text: draftText, auditId: j.auditId ?? null, loading: false, error: null, sending: false } }));
    } catch {
      setDraftByChat((d) => ({ ...d, [chatId]: { text: "", auditId: null, loading: false, error: "Не удалось получить черновик (сеть/сервер).", sending: false } }));
    }
  };
  const editDraft = (text: string) => {
    if (!selChat) return;
    const chatId = String(selChat.id);
    setDraftByChat((d) => ({ ...d, [chatId]: { ...(d[chatId] || { auditId: null, loading: false, sending: false, error: null }), text } }));
  };
  // SAFETY: only this function calls /telegram/send, and only after the operator has
  // explicitly clicked "Approve & Send" here. It always sets operatorApproved: true —
  // the earlier gate in telegram-runtime.mjs still enforces the real check server-side.
  // A blocked/failed result updates only the local error state; nothing is added to
  // `sentByChat`, so the chat history the operator sees can never show a message that
  // was actually rejected by the approval gate.
  const approveAndSend = async () => {
    if (!selChat || !draftState || !draftState.text.trim() || draftState.sending) return;
    const chatId = String(selChat.id);
    const text = draftState.text.trim();
    setDraftByChat((d) => ({ ...d, [chatId]: { ...d[chatId], sending: true, error: null } }));
    try {
      const r = await fetch(apiUrl("/telegram/send"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, chatTitle: selChat.title || null, text, operatorApproved: true, auditId: draftState.auditId }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.sent) {
        setSentByChat((s) => ({ ...s, [chatId]: [...(s[chatId] || []), { text, at: new Date().toISOString() }] }));
        setDraftByChat((d) => ({ ...d, [chatId]: { text: "", auditId: null, loading: false, error: null, sending: false } }));
      } else {
        setDraftByChat((d) => ({ ...d, [chatId]: { ...d[chatId], sending: false, error: j?.message || "Отправка заблокирована или не удалась." } }));
      }
    } catch {
      setDraftByChat((d) => ({ ...d, [chatId]: { ...d[chatId], sending: false, error: "Сетевая ошибка при отправке." } }));
    }
  };
  // ---- DIRECT SEND ----
  const directSend = async () => {
    if (!selChat || !compose.trim() || composeSending) return;
    const text = compose.trim();
    setComposeSending(true);
    setComposeError(null);
    try {
      const r = await fetch(apiUrl("/telegram/send"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: String(selChat.id), chatTitle: selChat.title || null, text, operatorApproved: true }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.sent) {
        setCompose("");
        const now = new Date().toISOString();
        setSentByChat(s => ({ ...s, [String(selChat.id)]: [...(s[String(selChat.id)] || []), { text, at: now }] }));
      } else {
        setComposeError(j?.message || "Отправка заблокирована или не удалась.");
      }
    } catch { setComposeError("Сетевая ошибка при отправке."); }
    finally { setComposeSending(false); }
  };

  const rejectDraft = async () => {
    if (!selChat || !draftState) return;
    const chatId = String(selChat.id);
    try {
      await fetch(apiUrl("/ai/audit/reject"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId: draftState.auditId, chatId, chatTitle: selChat.title || null, reason: "operator_dismissed" }),
      });
    } catch {}
    setDraftByChat((d) => ({ ...d, [chatId]: { text: "", auditId: null, loading: false, error: null, sending: false } }));
  };

  const Avatar = ({ name, size = 36, photoFileId, accountId }: { name: string; size?: number; photoFileId?: string | null; accountId?: string }) => {
    const [broken, setBroken] = useState(false);
    if (photoFileId && !broken) {
      return (
        <img
          src={apiUrl(`/telegram/photo?fileId=${encodeURIComponent(photoFileId)}&accountId=${encodeURIComponent(accountId || acc || "main")}`)}
          alt={name}
          width={size}
          height={size}
          onError={() => setBroken(true)}
          className="shrink-0 rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      );
    }
    return (
      <div className="flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: av(name), fontSize: size / 2.6 }}>{ini(name)}</div>
    );
  };
  const Row = ({ children, active, onClick }: any) => (
    <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${active ? "bg-tg-active/30 ring-1 ring-tg-accent" : "hover:bg-tg-bg/50"}`}>{children}</button>
  );
  const Empty = ({ text }: { text: string }) => (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-tg-muted">
      <div className="text-3xl opacity-40">📭</div>
      <div className="text-sm">{loading ? "Синхронизация…" : text}</div>
      {!loading && conn === "offline" && <div className="text-[11px]">Нет авторизованной сессии Telegram. Подключите аккаунт в разделе авторизации.</div>}
    </div>
  );

  function Center() {
    if (section === "accounts") return (
      <div className="space-y-2 p-2">
        {/* Wizard overlay */}
        {showWizard && (
          <AddAccountWizard
            onSuccess={(newSlotId) => {
              setShowWizard(false);
              setAcc(newSlotId);
              setTimeout(() => setRefreshTick(t => t + 1), 800);
            }}
            onCancel={() => setShowWizard(false)}
          />
        )}
        {/* Account list */}
        {!showWizard && accounts.map((a) => (
          <Row key={a.id} active={acc === a.id} onClick={() => { setAcc(a.id); setSection("dialogs"); setLocalItem(""); setChat(""); }}>
            <Avatar name={a.name} photoFileId={a.photoFileId} accountId={a.id} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{a.name}</div>
              <div className="truncate text-[11px] text-tg-muted">{a.phone} · {a.status}</div>
            </div>
            <span className={`rounded px-1.5 py-0.5 text-[10px] ${a.status === "ready" ? "bg-emerald-500/15 text-emerald-400" : "bg-tg-bg text-tg-muted"}`}>
              {a.status === "ready" ? "✓ подключён" : a.status}
            </span>
          </Row>
        ))}
        {/* Add button */}
        {!showWizard && (
          <button
            onClick={() => setShowWizard(true)}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-2.5 text-[12px] font-medium text-white/40 transition-all hover:border-sky-500/40 hover:bg-sky-500/8 hover:text-sky-400"
          >
            <span className="text-base">+</span> Добавить Telegram-аккаунт
          </button>
        )}
        {accounts.length === 0 && !showWizard && (
          <p className="py-2 text-center text-[11px] text-white/30">Нет подключённых аккаунтов</p>
        )}
      </div>
    );
    if (section === "groups") { const localGroups = LOCAL_ITEMS.filter((i) => i.folder === "groups"); return (groups.length || localGroups.length) ? (
      <div className="space-y-1.5 p-2">
        {localGroups.map((it) => (
          <Row key={it.id} active={localItem === it.id} onClick={() => { setLocalItem(it.id); setChat(""); }}><Avatar name={it.title} />
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{it.title}</div><div className="truncate text-[11px] text-tg-muted">{it.subtitle}</div></div>
            <span className="rounded bg-tg-bg px-1.5 py-0.5 text-[10px] text-fuchsia-300">{it.badge}</span></Row>
        ))}
        {groups.map((g) => (
        <Row key={g.id} active={chat === g.id} onClick={() => { setChat(g.id); setLocalItem(""); }}><Avatar name={g.title || "group"} photoFileId={g.photoSmallFileId} accountId={acc} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{g.title || "group"}</div><div className="truncate text-[11px] text-tg-muted">{g.memberCount ? g.memberCount + " участников · " : ""}{preview(g)}</div></div>
          {g.isMuted && <span className="text-[10px] text-tg-muted">🔕</span>}</Row>))}</div>
    ) : <Empty text="Групп нет." />; }
    if (section === "channels") { const localChannels = LOCAL_ITEMS.filter((i) => i.folder === "channels"); return (channels.length || localChannels.length) ? (
      <div className="space-y-1.5 p-2">
        {localChannels.map((it) => (
          <Row key={it.id} active={localItem === it.id} onClick={() => { setLocalItem(it.id); setChat(""); }}><Avatar name={it.title} />
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{it.title}</div><div className="truncate text-[11px] text-tg-muted">{it.subtitle}</div></div>
            <span className="rounded bg-tg-bg px-1.5 py-0.5 text-[10px] text-fuchsia-300">{it.badge}</span></Row>
        ))}
        {channels.map((c) => { const owner = ctx.bind?.[acc]; const ag = ctx.agents?.find((a) => a.id === owner); return (
        <Row key={c.id} active={chat === c.id} onClick={() => { setChat(c.id); setLocalItem(""); }}><Avatar name={c.title || "channel"} photoFileId={c.photoSmallFileId} accountId={acc} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{c.title || "channel"}</div><div className="truncate text-[11px] text-tg-muted">{c.memberCount ? c.memberCount.toLocaleString() + " подписчиков · " : ""}{preview(c)}</div></div>
          {ag && <span className="rounded bg-tg-bg px-1.5 py-0.5 text-[10px] text-tg-accent">{ag.name}</span>}</Row>); })}</div>
    ) : <Empty text="Каналов нет." />; }
    if (section === "bots") return bots.length ? (
      <div className="space-y-1.5 p-2">{bots.map((b) => (
        <Row key={b.id} active={chat === b.id} onClick={() => { setChat(b.id); setLocalItem(""); }}><Avatar name={b.title || "bot"} photoFileId={b.photoSmallFileId} accountId={acc} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{b.title || "bot"}</div><div className="truncate text-[11px] text-tg-muted">{b.username || ""} {preview(b)}</div></div></Row>))}</div>
    ) : <Empty text="Ботов нет." />;
    if (section === "contacts") return contacts.length ? (
      <div className="space-y-1 p-2">{contacts.filter((c) => !q || (c.title || "").toLowerCase().includes(q.toLowerCase())).map((c) => (
        <Row key={c.id} active={chat === c.id} onClick={() => { setChat(c.id); setLocalItem(""); }}><Avatar name={c.title || "user"} size={32} photoFileId={c.photoSmallFileId} accountId={acc} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{c.title || "user"}</div><div className="text-[11px] text-tg-muted">{c.username || ""}</div></div></Row>))}</div>
    ) : <Empty text="Контактов нет." />;
    if (section === "saved") { const self = chats.find((c) => /saved/i.test(c.title || "")); return self ? <div className="p-2"><Row active onClick={() => { setChat(self.id); setLocalItem(""); }}><Avatar name="Saved" /><span className="text-sm font-semibold">{self.title}</span></Row></div> : <Empty text="«Избранное» недоступно (только чтение)." />; }
    if (section === "media") return <Empty text="Медиа недоступно в read-only режиме (Telegram Layer не отдаёт медиа-историю)." />;
    if (section === "files") return <Empty text="Файлы недоступны в read-only режиме." />;
    if (section === "calls") return <Empty text="История звонков недоступна в read-only режиме." />;
    if (section === "sessions") return accounts.length ? (
      <div className="space-y-1.5 p-2">{accounts.map((a) => (
        <div key={a.id} className="rounded-lg bg-tg-bg/50 px-3 py-2 text-xs"><div className="text-sm font-semibold">{a.name}</div>
          <div className="text-tg-muted">Устройство: {a.device} · Статус: {a.status}</div><div className="text-tg-muted">Владелец: {a.owner?.name || "—"} · Авторизация: {a.authState || "—"}</div></div>))}</div>
    ) : <Empty text="Сессий нет." />;
    if (section === "analytics") return (
      <div className="grid grid-cols-2 gap-2 p-3">{([["Диалоги", stats.dialogs], ["Группы", stats.groups], ["Каналы", stats.channels], ["Боты", stats.bots], ["Контакты", stats.contacts], ["Медиа", stats.media], ["Файлы", stats.files], ["Непрочитанные", stats.unread]] as const).map(([l, v]) => (
        <div key={l} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-extrabold text-tg-accent">{v}</div></div>))}</div>
    );
    if (section === "archive") return <Empty text="Архив недоступен в read-only режиме." />;
    if (section === "settings") return <div className="h-full p-2"><SettingsCenter embedded /></div>;
    if (section === "folders") return (
      <div className="space-y-1 p-2">{(["Все", "Непрочитанные", "Каналы", "Группы", "Боты", "Личные"]).map((f) => <Row key={f} active={filter === f} onClick={() => { setFilter(f); setSection("dialogs"); }}><span className="text-lg">🗂</span><span className="text-sm font-semibold">{f}</span></Row>)}</div>
    );
    // dialogs default
    return fDialogs.length ? (
      <div className="space-y-0.5 p-2">{fDialogs.map((d) => (
        <Row key={d.id} active={chat === d.id} onClick={() => { setChat(d.id); setLocalItem(""); }}><Avatar name={d.title || "чат"} photoFileId={d.photoSmallFileId} accountId={acc} />
          <div className="min-w-0 flex-1"><div className="flex items-center"><span className="truncate text-sm font-semibold">{d.title || "чат"}</span><span className="ml-auto text-[10px] text-tg-muted">{cat(d)}</span></div>
            <div className="flex items-center"><span className="truncate text-[12px] text-tg-muted">{preview(d)}</span>{(d.unreadCount || 0) > 0 && <span className="ml-auto rounded-full bg-tg-accent px-1.5 text-[10px] font-bold text-white">{d.unreadCount}</span>}</div></div>
          {d.isMuted && <span className="text-[10px] text-tg-muted">🔕</span>}</Row>))}</div>
    ) : <Empty text="Чатов нет." />;
  }

  const selChat = chats.find((c) => c.id === chat);
  const selLocalItem = LOCAL_ITEMS.find((i) => i.id === localItem);
  // ---- AI DRAFT APPROVAL actions (scoped to the currently open chat) ----
  const draftState = selChat ? draftByChat[String(selChat.id)] : undefined;
  const ownerAgent = account?.owner;
  const ownerMissions = ctx.missions?.filter((m) => m.agentId === ownerAgent?.id) || [];
  const connClr = conn === "connected" ? "#4ade80" : conn === "syncing" ? "#fbbf24" : "#f87171";
  const connLbl = conn === "connected" ? "Подключено" : conn === "syncing" ? "Синхронизация" : "Офлайн";

  const cmd = (tab: string) => { setMode("command"); setCc(tab); };
  const palCommands = [
    { id: "p_sessions", label: "Открыть сессии", run: () => cmd("sessions") },
    { id: "p_dialogs", label: "Открыть диалоги", run: () => cmd("dialogs") },
    { id: "p_channels", label: "Открыть каналы", run: () => cmd("channels") },
    { id: "p_groups", label: "Открыть группы", run: () => cmd("groups") },
    { id: "p_bots", label: "Открыть ботов", run: () => cmd("bots") },
    { id: "p_analytics", label: "Открыть аналитику", run: () => cmd("analytics") },
    { id: "p_graph", label: "Открыть граф", run: () => cmd("graph") },
    { id: "p_focus_unread", label: "Фокус на непрочитанных", run: () => { setMode("client"); setSection("dialogs"); setFilter("Непрочитанные"); } },
    { id: "p_focus_channels", label: "Фокус на каналах", run: () => cmd("channels") },
    { id: "p_focus_groups", label: "Фокус на группах", run: () => cmd("groups") },
    { id: "p_focus_missions", label: "Фокус на миссиях", run: () => { setMode("command"); setCc("graph"); } },
    { id: "p_run_disc", label: "Запустить обнаружение", run: () => { cmd("discovery"); setTimeout(runDiscovery, 50); } },
    { id: "p_rebuild_idx", label: "Перестроить индекс", run: () => { cmd("discovery"); setTimeout(runDiscovery, 50); } },
    { id: "p_rebuild_rel", label: "Перестроить связи", run: () => { cmd("discovery"); } },
    { id: "p_refresh_graph", label: "Обновить граф", run: () => cmd("graph") },
    { id: "p_show_new", label: "Показать новые объекты", run: () => cmd("dialogs") },
    { id: "p_focus_contacts", label: "Фокус на контактах", run: () => { setMode("client"); setSection("contacts"); } },
    { id: "p_agent", label: "Открыть агента-владельца", run: () => ownerAgent && onOpenAgent?.(ownerAgent.id) },
  ].filter((c) => !pq || c.label.toLowerCase().includes(pq.toLowerCase()));
  const palNodes = pq ? chats.filter((x) => (x.title || "").toLowerCase().includes(pq.toLowerCase())).slice(0, 12) : [];

  // ---------- TELEGRAM GRAPH (real data) ----------
  const GCLR: Record<string, string> = { agent: "#ff2d6b", session: "#e879f9", dialog: "#9ca3af", channel: "#3ea6ff", group: "#34d399", bot: "#f59e0b", mission: "#22c55e" };
  const graph = useMemo(() => {
    const nodes: { id: string; type: string; label: string; ref?: string }[] = [];
    const edges: [string, string][] = [];
    accounts.forEach((a) => {
      if (a.owner) { nodes.push({ id: "ag_" + a.owner.id, type: "agent", label: a.owner.name, ref: a.owner.id }); }
      nodes.push({ id: "ses_" + a.id, type: "session", label: a.name, ref: a.id });
      if (a.owner) edges.push(["ag_" + a.owner.id, "ses_" + a.id]);
    });
    const cur = "ses_" + acc;
    chats.slice(0, 24).forEach((c) => { const k = cat(c); nodes.push({ id: "c_" + c.id, type: k, label: (c.title || k).slice(0, 16), ref: String(c.id) }); edges.push([cur, "c_" + c.id]); });
    (ctx.missions || []).filter((m) => m.agentId === account?.owner?.id).forEach((m) => { nodes.push({ id: "mis_" + m.id, type: "mission", label: m.title.slice(0, 16), ref: m.id }); if (account?.owner) edges.push(["ag_" + account.owner.id, "mis_" + m.id]); });
    return { nodes, edges };
  }, [accounts, chats, acc, ctx]);
  const gDefault = useMemo(() => {
    const cols: Record<string, number> = { agent: 60, mission: 60, session: 320, dialog: 600, channel: 600, group: 820, bot: 1020 };
    const idx: Record<string, number> = {}; const p: Record<string, { x: number; y: number }> = {};
    graph.nodes.forEach((n) => { const c = idx[n.type] = (idx[n.type] ?? -1) + 1; p[n.id] = { x: cols[n.type] ?? 700, y: 60 + c * 80 }; });
    return p;
  }, [graph]);
  const GP = (id: string) => gpos[id] || gDefault[id] || { x: 700, y: 300 };
  useEffect(() => {
    function mv(e: MouseEvent) { const d = gdrag.current; if (!d.mode) return; if (d.mode === "node" && d.id) { const dx = (e.clientX - d.sx) / gv.s, dy = (e.clientY - d.sy) / gv.s; setGpos((p) => ({ ...p, [d.id as string]: { x: d.ox + dx, y: d.oy + dy } })); } else if (d.mode === "pan") setGv((v) => ({ ...v, tx: d.ox + (e.clientX - d.sx), ty: d.oy + (e.clientY - d.sy) })); }
    function up() { gdrag.current.mode = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [gv.s]);
  function gdown(e: React.MouseEvent, id?: string) { const d = gdrag.current; d.sx = e.clientX; d.sy = e.clientY; if (id) { d.mode = "node"; d.id = id; const p = GP(id); d.ox = p.x; d.oy = p.y; setGsel(id); } else { d.mode = "pan"; d.ox = gv.tx; d.oy = gv.ty; } e.stopPropagation(); }
  const gNeighbors = (id: string) => graph.edges.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));

  // ---------- TELEGRAM ACTIVITY FEED (read-only, derived) ----------
  useEffect(() => {
    const ev: { t: string; kind: string; text: string }[] = [];
    const now = new Date().toISOString().slice(11, 19);
    if (conn === "connected") ev.push({ t: now, kind: "sync", text: "Синхронизация завершена · " + (account?.name || "") });
    if (conn === "offline") ev.push({ t: now, kind: "conn", text: "Соединение потеряно" });
    if (conn === "syncing") ev.push({ t: now, kind: "conn", text: "Синхронизация…" });
    channels.slice(0, 2).forEach((c) => ev.push({ t: now, kind: "channel", text: "Канал: " + (c.title || "") }));
    groups.slice(0, 2).forEach((g) => ev.push({ t: now, kind: "group", text: "Группа: " + (g.title || "") }));
    chats.slice(0, 3).forEach((c) => ev.push({ t: now, kind: "dialog", text: "Диалог: " + (c.title || "") }));
    setFeed(ev.slice(0, 10));
  }, [conn, chats, account]);

  const health = { connected: conn === "connected" ? accounts.length : 0, offline: conn === "offline" ? Math.max(1, accounts.length) : 0, syncing: conn === "syncing" ? 1 : 0, error: 0, sessions: accounts.length, channels: channels.length, groups: groups.length, bots: bots.length };

  // ---------- TELEGRAM DISCOVERY ENGINE (read-only) ----------
  const IDX_KEY = "epic_telegram_index_v1";
  useEffect(() => { try { const i = JSON.parse(localStorage.getItem(IDX_KEY) || "null"); if (i) setIndex(i); } catch {} }, []);
  function dlog(text: string) { setDiscLog((l) => [{ t: new Date().toISOString().slice(11, 19), text }, ...l].slice(0, 16)); }
  function buildRelations(accs: any[], list: Chat[]) {
    const rel: { from: string; to: string; kind: string }[] = [];
    accs.forEach((a) => { if (a.owner) rel.push({ from: "ag_" + a.owner.id, to: "ses_" + a.id, kind: "agent→session" });
      (ctx.missions || []).filter((m) => m.agentId === a.owner?.id).forEach((m) => { rel.push({ from: "ag_" + a.owner.id, to: "mis_" + m.id, kind: "agent→mission" }); }); });
    list.forEach((c) => { const k = cat(c); rel.push({ from: "ses_" + acc, to: "c_" + c.id, kind: "session→" + k }); if (k === "private") rel.push({ from: "c_" + c.id, to: "ct_" + c.id, kind: "dialog→contact" }); });
    return rel;
  }
  async function runDiscovery() {
    setDiscStatus("discovering"); setDiscLog([]); dlog("Обнаружение начато");
    try {
      const s = await fetch(apiUrl("/telegram/status"), { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      const accs = (s?.accounts || []).map((x: any) => { const ownerId = ctx.bind?.[x.slotId || x.label]; return { id: x.slotId || x.label, name: x.displayName || x.slotId, owner: ctx.agents?.find((a) => a.id === ownerId) }; });
      dlog("Найдено сессий: " + accs.length);
      const active = (s?.accounts || []).find((a: any) => (a.slotId || a.label) === acc) || (s?.accounts || [])[0];
      const cj = active ? await fetch(apiUrl("/telegram/chats?")+"accountId=" + encodeURIComponent(acc || active.slotId || ""), { cache: "no-store" }).then((r) => r.json()).catch(() => null) : null;
      const list: Chat[] = cj?.chats || (cj?.body && cj.body.chats) || [];
      setChats(Array.isArray(list) ? list : []);
      const dlg = list.filter((c) => cat(c) === "private"), ch = list.filter((c) => cat(c) === "channel"), gr = list.filter((c) => cat(c) === "group"), bt = list.filter((c) => cat(c) === "bot");
      setDiscStatus("indexing");
      dlog("Диалогов проиндексировано: " + list.length); dlog("Каналов проиндексировано: " + ch.length); dlog("Групп проиндексировано: " + gr.length); dlog("Ботов проиндексировано: " + bt.length);
      setDiscStatus("building");
      const rel = buildRelations(accs, list);
      dlog("Связей построено: " + rel.length);
      const idx = {
        schema: IDX_KEY, timestamp: new Date().toISOString(),
        sessions: accs.map((a: any) => ({ id: a.id, name: a.name, owner: a.owner?.name || null })),
        dialogs: dlg.map((c) => ({ id: c.id, title: c.title, unread: c.unreadCount || 0 })),
        channels: ch.map((c) => ({ id: c.id, title: c.title, members: c.memberCount || null })),
        groups: gr.map((c) => ({ id: c.id, title: c.title, members: c.memberCount || null })),
        bots: bt.map((c) => ({ id: c.id, title: c.title, username: c.username || null })),
        contacts: dlg.map((c) => ({ id: c.id, title: c.title })),
        relationships: rel,
        metadata: { source: "telegram-layer", account: acc, readOnly: true },
      };
      try { localStorage.setItem(IDX_KEY, JSON.stringify(idx)); } catch {}
      setIndex(idx); dlog("Граф обновлён"); dlog("Обнаружение завершено");
      setDiscStatus("completed");
    } catch { setDiscStatus("error"); dlog("Ошибка обнаружения"); }
  }
  const discMetrics = index ? {
    sessions: index.sessions?.length || 0, dialogs: index.dialogs?.length || 0, channels: index.channels?.length || 0,
    groups: index.groups?.length || 0, bots: index.bots?.length || 0, contacts: index.contacts?.length || 0,
    media: 0, files: 0, relationships: index.relationships?.length || 0,
  } : { sessions: 0, dialogs: 0, channels: 0, groups: 0, bots: 0, contacts: 0, media: 0, files: 0, relationships: 0 };
  const indexSize = index ? new Blob([JSON.stringify(index)]).size : 0;
  const DISC_LABEL: Record<string, string> = { idle: "Ожидание", discovering: "Поиск", indexing: "Индексация", building: "Построение графа", completed: "Готово", error: "Ошибка" };
  const DISC_CLR: Record<string, string> = { idle: "#9ca3af", discovering: "#fbbf24", indexing: "#38bdf8", building: "#a78bfa", completed: "#4ade80", error: "#f87171" };

  const CC_TABS = ["overview", "discovery", "sessions", "dialogs", "channels", "groups", "bots", "analytics", "audit", "graph", "search"];
  const CC_TAB_LABELS: Record<string, string> = { overview: "Обзор", discovery: "Обнаружение", sessions: "Сессии", dialogs: "Диалоги", channels: "Каналы", groups: "Группы", bots: "Боты", analytics: "Аналитика", audit: "Audit Log", graph: "Граф", search: "Поиск" };
  const Bar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
    <div className="flex items-center gap-2 text-[11px]"><span className="w-20 text-tg-muted">{label}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: (max ? Math.round((value / max) * 100) : 0) + "%", background: color }} /></div><span className="w-8 text-right font-bold">{value}</span></div>
  );

  function CommandCenter() {
    const maxStat = Math.max(1, stats.dialogs, stats.channels, stats.groups, stats.bots, stats.contacts, stats.unread);
    if (cc === "overview") return (
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{([["Аккаунты", accounts.length], ["Диалоги", stats.dialogs], ["Каналы", stats.channels], ["Группы", stats.groups], ["Боты", stats.bots], ["Непрочитанные", stats.unread], ["Медиа", stats.media], ["Файлы", stats.files], ["Сессии", accounts.length], ["Контакты", stats.contacts]] as const).map(([l, v]) => (
          <div key={l} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-extrabold text-tg-accent">{v}</div></div>))}</div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Состояние Telegram</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">{([["Подключено", health.connected, "#4ade80"], ["Офлайн", health.offline, "#f87171"], ["Синхронизация", health.syncing, "#fbbf24"], ["Ошибка", health.error, "#f97316"], ["Сессии", health.sessions, "#e879f9"], ["Каналы", health.channels, "#3ea6ff"], ["Группы", health.groups, "#34d399"], ["Боты", health.bots, "#f59e0b"]] as const).map(([l, v, c]) => <div key={l} className="flex items-center gap-1.5 rounded bg-tg-bg px-2 py-1"><span className="h-2 w-2 rounded-full" style={{ background: c }} /><span className="text-tg-muted">{l}</span><b className="ml-auto">{v}</b></div>)}</div>
            <div className="mt-2 text-[11px] text-tg-muted">Соединение: <b style={{ color: connClr }}>{connLbl}</b> · Последняя синхронизация: <b className="text-tg-text">{new Date().toLocaleTimeString()}</b></div>
          </div>
          <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Лента активности (только чтение)</div>
            <div className="mt-2 space-y-0.5 text-[11px]">{feed.length ? feed.map((e, i) => <div key={i} className="flex gap-1.5"><span className="text-tg-muted">{e.t}</span><span className="rounded bg-tg-bg px-1 text-[9px] uppercase text-cyan-300">{e.kind}</span><span className="truncate text-tg-text">{e.text}</span></div>) : <div className="text-tg-muted">Событий нет.</div>}</div>
          </div>
        </div>
      </div>
    );
    if (cc === "discovery") return (
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-tg-line bg-tg-bg/40 p-3">
          <div className="text-sm font-black tracking-wide">🛰 ДВИЖОК ОБНАРУЖЕНИЯ TELEGRAM</div>
          <span className="flex items-center gap-1.5 rounded-full border border-tg-line bg-tg-bg px-2 py-0.5 text-[10px] font-bold"><span className="h-2 w-2 rounded-full" style={{ background: DISC_CLR[discStatus] }} />{DISC_LABEL[discStatus]}</span>
          <button onClick={runDiscovery} disabled={["discovering", "indexing", "building"].includes(discStatus)} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">▶ Запустить обнаружение</button>
          <button onClick={runDiscovery} className="rounded-lg bg-tg-bg px-3 py-1.5 text-xs ring-1 ring-tg-line">Перестроить индекс</button>
          <button onClick={() => { if (index) { setIndex({ ...index, relationships: buildRelations(accounts, chats), timestamp: new Date().toISOString() }); dlog("Связи перестроены"); } }} className="rounded-lg bg-tg-bg px-3 py-1.5 text-xs ring-1 ring-tg-line">Перестроить связи</button>
          <div className="ml-auto text-[11px] text-tg-muted">Последнее обнаружение: <b className="text-tg-text">{index?.timestamp ? new Date(index.timestamp).toLocaleString() : "—"}</b> · Индекс: <b className="text-tg-text">{(indexSize / 1024).toFixed(1)} КБ</b></div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-5">{([["Найдено сессий", discMetrics.sessions], ["Найдено диалогов", discMetrics.dialogs], ["Найдено каналов", discMetrics.channels], ["Найдено групп", discMetrics.groups], ["Найдено ботов", discMetrics.bots], ["Найдено контактов", discMetrics.contacts], ["Найдено медиа", discMetrics.media], ["Найдено файлов", discMetrics.files], ["Связей построено", discMetrics.relationships], ["Размер индекса (КБ)", +(indexSize / 1024).toFixed(1)]] as const).map(([l, v]) => (
          <div key={l} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-extrabold text-tg-accent">{v}</div></div>))}</div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Лог обнаружения</div>
            <div className="mt-2 max-h-48 space-y-0.5 overflow-auto text-[11px]">{discLog.length ? discLog.map((e, i) => <div key={i} className="flex gap-1.5"><span className="text-tg-muted">{e.t}</span><span className="text-tg-text">{e.text}</span></div>) : <div className="text-tg-muted">Лог пуст. Нажмите «Запустить обнаружение».</div>}</div>
          </div>
          <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Конвейер</div>
            <div className="mt-2 space-y-1 text-[11px]">{["Сессия Telegram", "Поиск диалогов", "Поиск каналов", "Поиск групп", "Поиск ботов", "Поиск контактов", "Построитель связей", "Граф WORLD"].map((s, i) => <div key={i} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: discStatus === "completed" ? "#4ade80" : DISC_CLR[discStatus] }} />{s}</div>)}</div>
            {!index && <div className="mt-2 rounded-lg bg-tg-bg/60 p-2 text-[11px] text-tg-muted">Индекс пуст. Запустите обнаружение для построения карты Telegram-экосистемы.</div>}
          </div>
        </div>
      </div>
    );
    if (cc === "sessions") return (
      <div className="p-3"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["", "Аккаунт", "Телефон", "Статус", "Диалоги", "Каналы", "Группы", "Агент-владелец", "Подключено"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>{accounts.length ? accounts.map((a) => (<tr key={a.id} className="border-t border-tg-line"><td className="px-2 py-1.5"><Avatar name={a.name} photoFileId={a.photoFileId} accountId={a.id} size={28} /></td><td className="px-2 font-semibold">{a.name}</td><td className="px-2 text-tg-muted">{a.phone}</td><td className="px-2">{a.status}</td><td className="px-2">{a.id === acc ? stats.dialogs : "—"}</td><td className="px-2">{a.id === acc ? stats.channels : "—"}</td><td className="px-2">{a.id === acc ? stats.groups : "—"}</td><td className="px-2 text-tg-accent">{a.owner?.name || "—"}</td><td className="px-2"><span style={{ color: a.id === acc ? connClr : "#9ca3af" }}>{a.id === acc ? connLbl : "—"}</span></td></tr>)) : <tr><td colSpan={9} className="px-2 py-4 text-tg-muted">Нет сессий.</td></tr>}</tbody></table></div>
    );
    if (cc === "dialogs" || cc === "channels" || cc === "groups" || cc === "bots") {
      const data = cc === "channels" ? channels : cc === "groups" ? groups : cc === "bots" ? bots : dialogs;
      const filtered = data.filter((d) => !q || ((d.title || "") + (d.username || "")).toLowerCase().includes(q.toLowerCase()));
      return (
        <div className="p-3"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск / фильтр…" className="mb-2 w-full max-w-sm rounded-lg bg-tg-bg px-3 py-1.5 text-sm outline-none" />
          {filtered.length ? <table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["", "Название", "Тип", "Посл. / Юзер", "Непрочит.", "Агент-владелец", "Сессия"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
            <tbody>{filtered.map((d) => (<tr key={d.id} className="border-t border-tg-line hover:bg-tg-bg/40"><td className="px-2 py-1.5"><div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: av(d.title || "x") }}>{ini(d.title || "x")}</div></td><td className="px-2 font-semibold">{d.title || "—"}</td><td className="px-2 text-tg-muted">{cat(d)}</td><td className="px-2 text-tg-muted">{preview(d) || d.username || "—"}</td><td className="px-2">{d.unreadCount || 0}</td><td className="px-2 text-tg-accent">{account?.owner?.name || "—"}</td><td className="px-2 text-tg-muted">{account?.name || "—"}</td></tr>))}</tbody></table>
            : <div className="py-8 text-center text-sm text-tg-muted">{loading ? "Синхронизация…" : "Нет данных (Telegram Layer только для чтения)."}</div>}
        </div>
      );
    }
    if (cc === "audit") {
      // Load audit events when tab opens
      if (!auditLoading && auditEvents.length === 0) {
        setAuditLoading(true);
        fetch(apiUrl("/ai/audit?n=50"), { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .then(j => { setAuditEvents(j?.events ?? []); })
          .catch(() => {})
          .finally(() => setAuditLoading(false));
      }
      return (
        <div className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Audit Log — последние действия AI</div>
            <button onClick={() => { setAuditEvents([]); setAuditLoading(false); }} className="ml-auto rounded-lg bg-tg-bg px-2 py-0.5 text-[10px] ring-1 ring-tg-line hover:ring-tg-accent">↻ Обновить</button>
          </div>
          {auditLoading && <div className="py-6 text-center text-sm text-tg-muted">Загрузка…</div>}
          {!auditLoading && auditEvents.length === 0 && <div className="py-6 text-center text-sm text-tg-muted">Событий нет.</div>}
          {!auditLoading && auditEvents.length > 0 && (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-tg-panel text-tg-muted"><tr>{["Время", "Статус", "Тип", "Актор", "Чат", "Превью"].map(h => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
                <tbody>{auditEvents.map((e: any) => (
                  <tr key={e.auditId || e.ts} className="border-t border-tg-line hover:bg-tg-bg/40">
                    <td className="px-2 py-1.5 text-tg-muted whitespace-nowrap">{e.ts ? new Date(e.ts).toLocaleTimeString() : "—"}</td>
                    <td className="px-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${e.status === "executed" ? "bg-emerald-500/15 text-emerald-300" : e.status === "rejected" || e.status === "blocked" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>{e.status || "—"}</span></td>
                    <td className="px-2 text-tg-muted">{e.actionType || e.tool || "—"}</td>
                    <td className="px-2"><span className={e.actor === "ai" ? "text-tg-accent" : "text-tg-text"}>{e.actor || "—"}</span></td>
                    <td className="px-2 text-tg-muted">{e.chatTitle || e.chatId || "—"}</td>
                    <td className="px-2 max-w-[180px] truncate text-tg-text">{e.preview || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      );
    }
    if (cc === "analytics") return (
      <div className="space-y-2 p-4"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Аналитика Telegram</div>
        <div className="space-y-1.5">{([["Диалоги", stats.dialogs, "#9ca3af"], ["Каналы", stats.channels, "#3ea6ff"], ["Группы", stats.groups, "#34d399"], ["Боты", stats.bots, "#f59e0b"], ["Контакты", stats.contacts, "#e879f9"], ["Непрочитанные", stats.unread, "#ff2d6b"], ["Медиа", stats.media, "#a78bfa"], ["Файлы", stats.files, "#22c55e"]] as const).map(([l, v, c]) => <Bar key={l} label={l} value={v} max={maxStat} color={c} />)}</div>
        <div className="mt-2 text-[11px] text-tg-muted">Сессии: <b className="text-tg-text">{accounts.length}</b> · Последняя активность: <b className="text-tg-text">{new Date().toLocaleTimeString()}</b></div>
      </div>
    );
    if (cc === "search") return (
      <div className="p-4"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Глобальный поиск: dialogs, channels, groups, bots, sessions, agents, missions…" className="w-full rounded-lg bg-tg-bg px-3 py-2 text-sm outline-none" />
        <div className="mt-3 space-y-1 text-sm">
          {[...chats.map((c) => ({ id: "c" + c.id, label: c.title || "чат", kind: cat(c) })), ...accounts.map((a) => ({ id: "a" + a.id, label: a.name, kind: "session" })), ...(ctx.agents || []).map((a) => ({ id: "ag" + a.id, label: a.name, kind: "agent" })), ...(ctx.missions || []).map((m) => ({ id: "m" + m.id, label: m.title, kind: "mission" }))]
            .filter((x) => q && x.label.toLowerCase().includes(q.toLowerCase())).slice(0, 30)
            .map((x) => <div key={x.id} className="flex items-center gap-2 rounded-lg bg-tg-bg/50 px-3 py-1.5"><span className="h-2 w-2 rounded-full" style={{ background: GCLR[x.kind] || "#888" }} /><span className="font-semibold">{x.label}</span><span className="ml-auto text-[11px] text-tg-muted">{x.kind}</span></div>)}
          {!q && <div className="text-tg-muted">Введите запрос для глобального поиска.</div>}
        </div>
      </div>
    );
    // graph
    const gsn = graph.nodes.find((n) => n.id === gsel);
    const focusSet = gfocus ? new Set([gfocus, ...gNeighbors(gfocus)]) : null;
    return (
      <div className="grid h-full grid-cols-[1fr_260px]">
        <div className="relative overflow-hidden bg-tg-bg" style={{ backgroundImage: "linear-gradient(rgba(62,166,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(62,166,255,.06) 1px,transparent 1px)", backgroundSize: "28px 28px" }}>
          <div className="absolute left-3 top-3 z-10 flex gap-1"><button onClick={() => setGv((v) => ({ ...v, s: Math.min(2, +(v.s + 0.15).toFixed(2)) }))} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">+</button><button onClick={() => setGv((v) => ({ ...v, s: Math.max(0.3, +(v.s - 0.15).toFixed(2)) }))} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">−</button><button onClick={() => { setGv({ tx: 40, ty: 20, s: 0.8 }); setGpos({}); setGfocus(""); }} className="rounded-lg bg-tg-panel px-2 text-xs ring-1 ring-tg-line">сброс</button></div>
          <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={(e) => gdown(e)}>
            <div style={{ transform: `translate(${gv.tx}px,${gv.ty}px) scale(${gv.s})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
              <svg className="pointer-events-none absolute" style={{ overflow: "visible", left: 0, top: 0 }} width="1" height="1">{graph.edges.map(([a, b], i) => { const pa = GP(a), pb = GP(b); const on = gfocus && (a === gfocus || b === gfocus); return <line key={i} x1={pa.x + 50} y1={pa.y + 16} x2={pb.x + 50} y2={pb.y + 16} stroke={on ? "#3ea6ff" : "rgba(62,166,255,.25)"} strokeWidth={on ? 2 : 1.2} opacity={focusSet && !on ? 0.12 : 1} />; })}</svg>
              {graph.nodes.map((n) => { const p = GP(n.id); const dim = focusSet ? !focusSet.has(n.id) : false; return (
                <div key={n.id} onMouseDown={(e) => gdown(e, n.id)} onDoubleClick={() => { if (n.type === "agent" && n.ref) onOpenAgent?.(n.ref); else { setGsel(n.id); } }} className={`absolute w-[104px] cursor-grab rounded-lg border bg-tg-panel px-2 py-1 text-center text-[10px] active:cursor-grabbing ${gsel === n.id ? "ring-2 ring-white" : ""}`} style={{ left: p.x, top: p.y, borderColor: GCLR[n.type], opacity: dim ? 0.2 : 1 }}>
                  <div className="truncate font-bold" style={{ color: GCLR[n.type] }}>{n.label}</div><div className="text-tg-muted">{n.type}</div></div>); })}
            </div>
          </div>
          <div className="absolute bottom-3 right-3 h-24 w-40 overflow-hidden rounded-lg border border-tg-line bg-tg-panel/90"><svg width="160" height="96" viewBox="0 0 1200 700">{graph.edges.map(([a, b], i) => { const pa = GP(a), pb = GP(b); return <line key={i} x1={pa.x + 50} y1={pa.y + 16} x2={pb.x + 50} y2={pb.y + 16} stroke="rgba(62,166,255,.3)" strokeWidth={3} />; })}{graph.nodes.map((n) => { const p = GP(n.id); return <circle key={n.id} cx={p.x + 50} cy={p.y + 16} r={11} fill={GCLR[n.type]} />; })}</svg></div>
        </div>
        <aside className="overflow-auto border-l border-tg-line bg-tg-panel p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Инспектор узла</div>
          {gsn ? (<div className="mt-2 space-y-1 text-xs"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: GCLR[gsn.type] }} /><b>{gsn.label}</b></div>
            <div className="text-tg-muted">Тип: <b className="text-tg-text">{gsn.type}</b></div>
            <div className="text-tg-muted">Сессия: <b className="text-tg-text">{account?.name || "—"}</b></div>
            <div className="text-tg-muted">Агент-владелец: <b className="text-tg-text">{account?.owner?.name || "—"}</b></div>
            <div className="text-tg-muted">Связей: <b className="text-tg-text">{gNeighbors(gsn.id).length}</b></div>
            <button onClick={() => setGfocus(gsn.id === gfocus ? "" : gsn.id)} className="mt-1 w-full rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">{gfocus === gsn.id ? "Снять фокус" : "Фокус на связях"}</button>
            {gsn.type === "agent" && gsn.ref && onOpenAgent && <button onClick={() => onOpenAgent(gsn.ref!)} className="w-full rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Открыть рабочую область агента →</button>}
            <div className="mt-2 text-[10px] uppercase text-tg-accent">Связи ({gNeighbors(gsn.id).length})</div>
            <div className="flex flex-wrap gap-1 text-[11px]">{gNeighbors(gsn.id).slice(0, 12).map((id) => { const c = graph.nodes.find((x) => x.id === id); return <span key={id} className="rounded bg-tg-bg px-1.5 py-0.5" style={{ color: c ? GCLR[c.type] : "#888" }}>{c?.label || id}</span>; })}</div>
          </div>) : <div className="mt-2 text-tg-muted">Клик по узлу графа.</div>}
        </aside>
      </div>
    );
  }


  // ─── Mobile helpers ──────────────────────────────────────────────────────────
  const fmtTs = (c: any) => {
    const raw = c.lastMessage?.date || c.date;
    if (!raw) return "";
    const ms = typeof raw === "number" ? raw * 1000 : new Date(raw).getTime();
    if (!ms) return "";
    const d = new Date(ms), now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return ["вс","пн","вт","ср","чт","пт","сб"][d.getDay()];
    return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
  };
  const chatOpen = !!chat && !!selChat;
  const handleNavClick = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === "chats") setSection("dialogs");
    else if (tab === "contacts") setSection("contacts");
    else if (tab === "epic") { setSection("accounts"); setChat(""); }
    else if (tab === "settings") setSection("settings");
  };
  type NavItem = { id: MobileTab; label: string; icon: string; center?: boolean; badge?: number };
  const NAV_ITEMS: NavItem[] = [
    { id: "chats",    label: "Чаты",      icon: "💬", badge: stats.unread },
    { id: "contacts", label: "Контакты",  icon: "👤" },
    { id: "epic",     label: "",          icon: "☠️", center: true },
    { id: "settings", label: "Настройки", icon: "⚙️" },
    { id: "profile",  label: "Профиль",   icon: "○" },
  ];

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-tg-bg text-tg-text" style={themeVars}>

      {/* ═══════════════════════════════════════════════════════════════════════
          COMMAND CENTER (legacy desktop mode — accessible via 🛰 button)
         ═══════════════════════════════════════════════════════════════════════ */}
      {mode === "command" ? (
        <>
          <header className="flex shrink-0 items-center gap-2 border-b border-tg-line bg-tg-panel px-4 py-2">
            <button onClick={() => setMode("client")} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm text-tg-accent">‹ Назад</button>
            <div className="font-black tracking-wide text-cyan-300">🛰 Командный центр</div>
            <button onClick={() => { setPalette(true); setPq(""); }} className="ml-auto rounded-lg border border-cyan-500/40 bg-cyan-600/15 px-3 py-1.5 text-xs font-semibold text-cyan-200">⌘K</button>
          </header>
          <div className="flex min-h-0 flex-1">
            <nav style={{ width: panelW.ccNav, flex: "0 0 auto" }} className="min-h-0 overflow-auto bg-tg-panel p-2">
              <div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Командный центр</div>
              {CC_TABS.map((t) => (
                <button key={t} onClick={() => setCc(t)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${cc === t ? "bg-cyan-600/30 text-tg-text ring-1 ring-cyan-500/50" : "text-tg-muted hover:bg-tg-bg/40 hover:text-tg-text"}`}>{CC_TAB_LABELS[t] || t}</button>
              ))}
            </nav>
            <ColResizer onMouseDown={startPanelDrag("ccNav")} title="Изменить ширину панели командного центра" />
            <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-tg-bg"><CommandCenter /></main>
          </div>
        </>

      /* ═══════════════════════════════════════════════════════════════════════
          CHAT DETAIL — full-screen when a chat is open
         ═══════════════════════════════════════════════════════════════════════ */
      ) : chatOpen ? (
        <div className="flex h-full flex-col">
          {/* Chat header */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-tg-line bg-tg-panel px-3 py-2">
            <button onClick={() => { setChat(""); setLocalItem(""); }} className="rounded-lg p-1.5 text-lg text-tg-accent hover:bg-white/10">‹</button>
            <Avatar name={selChat.title || "чат"} size={38} photoFileId={selChat.photoSmallFileId} accountId={acc} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{selChat.title || "чат"}</div>
              <div className="text-[11px] text-tg-muted">{cat(selChat)}{selChat.memberCount ? " · " + selChat.memberCount.toLocaleString() + " участников" : ""}</div>
            </div>
            <div className="flex shrink-0 gap-2.5 text-tg-muted"><span className="text-xl">🔍</span><span className="text-xl">📌</span></div>
          </div>
          {/* Messages */}
          <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-3">
            {msgsHasMore && (
              <div className="flex justify-center py-1">
                <button onClick={async () => {
                  if (msgsLoading) return; setMsgsLoading(true);
                  try {
                    const oldest = msgs[0];
                    const fromParam = oldest?.id ? `&fromMessageId=${encodeURIComponent(oldest.id)}` : "";
                    const r = await fetch(apiUrl(`/telegram/messages?chatId=${encodeURIComponent(chat)}&accountId=${encodeURIComponent(acc)}&limit=30${fromParam}`), { cache: "no-store" });
                    const j = r.ok ? await r.json() : null;
                    const more: TgMessage[] = Array.isArray(j?.messages) ? [...j.messages].reverse() : [];
                    setMsgs(prev => [...more, ...prev]); setMsgsHasMore(more.length >= 30);
                  } catch {} finally { setMsgsLoading(false); }
                }} className="rounded-full bg-tg-bg px-3 py-0.5 text-[11px] text-tg-muted ring-1 ring-tg-line hover:ring-tg-accent">
                  {msgsLoading ? "Загрузка…" : "↑ Загрузить ещё"}
                </button>
              </div>
            )}
            {msgsLoading && msgs.length === 0 && <div className="flex justify-center py-8 text-sm text-tg-muted">Загрузка истории…</div>}
            {!msgsLoading && msgs.length === 0 && (
              <div className="flex justify-center py-8">
                {preview(selChat) ? (
                  <div className="max-w-[75%] rounded-2xl bg-tg-bubble px-3 py-1.5 text-sm text-tg-text">
                    {preview(selChat)}
                    <div className="mt-0.5 text-[10px] text-tg-muted">последнее сообщение</div>
                  </div>
                ) : <span className="text-sm text-tg-muted">Нет сообщений</span>}
              </div>
            )}
            {msgs.map((m) => {
              const time = m.date ? new Date(m.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl bg-tg-bubble px-3 py-1.5 text-sm text-tg-text">
                    {m.content}
                    <div className="mt-0.5 text-right text-[10px] text-tg-muted">{time}</div>
                  </div>
                </div>
              );
            })}
            {(sentByChat[String(selChat.id)] || []).map((m, i) => (
              <div key={"sent_" + i} className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl bg-tg-active px-3 py-1.5 text-sm text-white">
                  {m.text}
                  <div className="mt-0.5 text-right text-[10px] text-white/60">✓✓ {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
            <div ref={msgsEndRef} />
          </div>
          {/* Compose */}
          <div className="shrink-0 border-t border-tg-line bg-tg-panel px-3 py-2">
            {draftState?.text || draftState?.loading || draftState?.error ? (
              draftState.loading ? (
                <div className="rounded-lg bg-tg-bg px-3 py-2 text-sm text-tg-muted">Генерирую черновик…</div>
              ) : draftState.error ? (
                <div className="space-y-1.5">
                  <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">⚠️ {draftState.error}</div>
                  <button onClick={requestDraft} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">Попробовать снова</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-200">🤖 Черновик AI · проверь перед отправкой</div>
                  <textarea value={draftState.text} onChange={(e) => editDraft(e.target.value)} rows={2} className="w-full resize-none rounded-lg bg-tg-bg px-3 py-2 text-sm outline-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={rejectDraft} disabled={draftState.sending} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-50">Отклонить</button>
                    <button onClick={approveAndSend} disabled={draftState.sending || !draftState.text.trim()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{draftState.sending ? "Отправка…" : "✅ Отправить"}</button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={compose}
                  onChange={e => { setCompose(e.target.value); setComposeError(null); }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); directSend(); } }}
                  placeholder="Сообщение…"
                  rows={1}
                  className="flex-1 resize-none rounded-2xl bg-tg-bg px-4 py-2 text-sm outline-none placeholder:text-tg-muted/60"
                  style={{ maxHeight: 96 }}
                />
                {compose.trim() ? (
                  <button onClick={directSend} disabled={composeSending} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tg-accent text-white disabled:opacity-40 transition-all hover:brightness-110">
                    {composeSending ? "…" : "➤"}
                  </button>
                ) : (
                  <button onClick={requestDraft} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tg-bg text-sm ring-1 ring-tg-line hover:ring-tg-accent transition-all">🤖</button>
                )}
              </div>
            )}
            {composeError && <div className="mt-1 text-[11px] text-rose-300">⚠️ {composeError}</div>}
          </div>
        </div>

      /* ═══════════════════════════════════════════════════════════════════════
          MOBILE TABBED LAYOUT
         ═══════════════════════════════════════════════════════════════════════ */
      ) : (
        <>
          {/* ── Tab-specific header ── */}
          {mobileTab === "chats" && (
            <header className="shrink-0 border-b border-tg-line bg-tg-panel px-4 pt-3 pb-0">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {account && <Avatar name={account.name} photoFileId={account.photoFileId} accountId={acc} size={30} />}
                  <span className="text-[17px] font-black tracking-tight">EPIC<span className="text-tg-accent">☠️</span>GRAM</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: connClr }} title={connLbl} />
                  {accounts.length > 1 && (
                    <select value={acc} onChange={e => setAcc(e.target.value)} className="ml-1 rounded-lg border border-tg-line bg-tg-bg px-1.5 py-0.5 text-[11px] text-tg-muted">
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                  <button onClick={() => { setPalette(true); setPq(""); }} className="flex h-8 w-8 items-center justify-center rounded-full text-tg-muted hover:bg-white/10">🔍</button>
                  <button onClick={() => setMode("command")} className="flex h-8 w-8 items-center justify-center rounded-full text-tg-muted hover:bg-white/10 text-sm" title="Командный центр">🛰</button>
                </div>
              </div>
              <div className="mb-2 flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5">
                <span className="text-sm text-tg-muted/60">🔍</span>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск" className="flex-1 bg-transparent text-sm outline-none placeholder:text-tg-muted/60" />
                {q && <button onClick={() => setQ("")} className="text-tg-muted/60 text-sm">✕</button>}
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-0.5 text-[11.5px] font-medium transition-all ${filter === f ? "bg-tg-accent text-white" : "bg-white/8 text-tg-muted hover:text-tg-text"}`}>{f}</button>
                ))}
              </div>
            </header>
          )}
          {mobileTab === "contacts" && (
            <header className="shrink-0 border-b border-tg-line bg-tg-panel px-4 pt-3 pb-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[20px] font-bold">Контакты</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5">
                <span className="text-sm text-tg-muted/60">🔍</span>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск контактов" className="flex-1 bg-transparent text-sm outline-none placeholder:text-tg-muted/60" />
                {q && <button onClick={() => setQ("")} className="text-tg-muted/60 text-sm">✕</button>}
              </div>
            </header>
          )}
          {mobileTab === "epic" && (
            <header className="shrink-0 border-b border-tg-line bg-tg-panel px-4 py-3 flex items-center justify-between">
              <span className="text-[17px] font-black">☠️ Аккаунты</span>
              <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm text-tg-muted hover:text-tg-text">‹ Выйти</button>
            </header>
          )}
          {mobileTab === "settings" && (
            <header className="shrink-0 border-b border-tg-line bg-tg-panel px-4 py-3 flex items-center justify-between">
              <span className="text-[20px] font-bold">Настройки</span>
            </header>
          )}
          {mobileTab === "profile" && (
            <header className="shrink-0 border-b border-tg-line bg-tg-panel px-4 py-3 flex items-center justify-between">
              <button onClick={onClose} className="text-sm text-tg-muted hover:text-tg-text">‹ Назад</button>
              <span className="font-bold">Профиль</span>
              <span className="w-14" />
            </header>
          )}

          {/* ── Tab content ── */}
          <main className="min-h-0 flex-1 overflow-auto">

            {/* ──────────── ЧАТЫ ──────────── */}
            {mobileTab === "chats" && (
              fDialogs.length > 0 ? (
                <div>
                  {fDialogs.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { setChat(d.id); setLocalItem(""); }}
                      className="flex w-full items-center gap-3 border-b border-tg-line/20 px-4 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/8"
                    >
                      <Avatar name={d.title || "чат"} size={54} photoFileId={d.photoSmallFileId} accountId={acc} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="flex-1 truncate text-[15px] font-semibold text-tg-text">
                            {cat(d) === "channel" ? "📢 " : cat(d) === "bot" ? "🤖 " : ""}{d.title || "чат"}
                          </span>
                          <span className="shrink-0 text-[12px] text-tg-muted">{fmtTs(d as any)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="flex-1 truncate text-[13px] leading-tight text-tg-muted">
                            {preview(d) || (cat(d) === "channel" ? "Канал" : cat(d) === "group" ? "Группа" : cat(d) === "bot" ? "Бот" : "Личный чат")}
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            {d.isMuted && <span className="text-[11px] text-tg-muted">🔕</span>}
                            {(d.unreadCount || 0) > 0 && (
                              <span className={`min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-bold leading-[18px] text-white ${d.isMuted ? "bg-tg-muted/50" : "bg-tg-accent"}`}>
                                {(d.unreadCount || 0) > 99 ? "99+" : d.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-tg-muted">
                  {loading ? (
                    <>
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-tg-accent/30 border-t-tg-accent" />
                      <div className="text-sm">Синхронизация…</div>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl opacity-30">💬</div>
                      <div className="text-sm">
                        {conn === "offline" ? "Нет подключённого аккаунта" : "Чатов нет"}
                      </div>
                      {conn === "offline" ? (
                        <button onClick={() => handleNavClick("epic")} className="rounded-xl bg-tg-active px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110">
                          Добавить аккаунт ☠️
                        </button>
                      ) : (
                        <button onClick={() => setRefreshTick(t => t + 1)} className="rounded-xl border border-tg-line px-4 py-2 text-sm text-tg-muted hover:text-tg-text hover:bg-white/5 transition-all">
                          ↺ Обновить
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            )}

            {/* ──────────── КОНТАКТЫ ──────────── */}
            {mobileTab === "contacts" && (
              <div>
                <div className="mx-4 mt-3 mb-1 overflow-hidden rounded-2xl bg-tg-panel ring-1 ring-tg-line/40">
                  <button className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 active:bg-white/8">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xl text-white">👥</div>
                    <span className="text-[15px]">Пригласить друзей</span>
                  </button>
                  <div className="mx-4 h-px bg-tg-line/40" />
                  <button className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 active:bg-white/8">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xl text-white">📞</div>
                    <span className="text-[15px]">Недавние звонки</span>
                  </button>
                </div>
                {contacts.length > 0 && (
                  <div className="px-4 pt-3 pb-1 text-[12px] font-semibold text-tg-accent">
                    Сортировка по времени захода
                  </div>
                )}
                {contacts.filter(c => !q || (c.title || "").toLowerCase().includes(q.toLowerCase())).map(c => (
                  <button key={c.id} onClick={() => { setChat(c.id); setLocalItem(""); }} className="flex w-full items-center gap-3 border-b border-tg-line/20 px-4 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/8">
                    <Avatar name={c.title || "user"} size={50} photoFileId={c.photoSmallFileId} accountId={acc} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">{c.title || "user"}</div>
                      <div className="text-[12px] text-tg-accent">{c.username ? "@" + c.username : "в сети"}</div>
                    </div>
                  </button>
                ))}
                {contacts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-tg-muted">
                    <div className="text-4xl opacity-30">👤</div>
                    <div className="text-sm">{loading ? "Загрузка…" : conn === "offline" ? "Подключи аккаунт в разделе ☠️" : "Контакты не загружены"}</div>
                  </div>
                )}
              </div>
            )}

            {/* ──────────── EPIC☠️GRAM (аккаунты) ──────────── */}
            {mobileTab === "epic" && (
              <div className="space-y-2 p-3">
                {showWizard ? (
                  <AddAccountWizard
                    onSuccess={newSlotId => {
                      setShowWizard(false); setAcc(newSlotId);
                      setTimeout(() => setRefreshTick(t => t + 1), 800);
                      handleNavClick("chats");
                    }}
                    onCancel={() => setShowWizard(false)}
                  />
                ) : (
                  <>
                    {accounts.map(a => (
                      <button
                        key={a.id}
                        onClick={() => { setAcc(a.id); handleNavClick("chats"); }}
                        className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${acc === a.id ? "bg-tg-active/20 ring-1 ring-tg-accent" : "bg-tg-panel hover:bg-tg-panel/70"}`}
                      >
                        <Avatar name={a.name} size={52} photoFileId={a.photoFileId} accountId={a.id} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-semibold">{a.name}</div>
                          <div className="text-[12px] text-tg-muted">{a.phone !== "—" ? a.phone + " · " : ""}{a.status === "ready" ? "✓ подключён" : a.status}</div>
                        </div>
                        {a.status === "ready" && <span className="shrink-0 text-xl text-emerald-400">✓</span>}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowWizard(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-[13px] font-medium text-white/40 transition-all hover:border-sky-500/40 hover:text-sky-400"
                    >
                      <span className="text-lg">+</span> Добавить Telegram-аккаунт
                    </button>
                    {accounts.length === 0 && <p className="py-2 text-center text-[11px] text-white/30">Нет подключённых аккаунтов</p>}
                    {chats.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {([["💬","Диалоги",stats.dialogs],["👥","Группы",stats.groups],["📢","Каналы",stats.channels],["🤖","Боты",stats.bots],["📇","Контакты",stats.contacts],["📨","Непрочит.",stats.unread]] as const).map(([icon, l, v]) => (
                          <div key={l} className="rounded-xl bg-tg-panel p-3 text-center">
                            <div className="text-xl font-bold text-tg-accent">{v}</div>
                            <div className="mt-0.5 text-[10px] text-tg-muted">{icon} {l}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ──────────── НАСТРОЙКИ ──────────── */}
            {mobileTab === "settings" && (
              <div className="h-full"><SettingsCenter embedded /></div>
            )}

            {/* ──────────── ПРОФИЛЬ ──────────── */}
            {mobileTab === "profile" && (
              <div className="pb-6">
                {account ? (
                  <>
                    {/* Profile card */}
                    <div className="flex flex-col items-center gap-2 border-b border-tg-line bg-tg-panel py-8 px-4">
                      <Avatar name={account.name} size={90} photoFileId={account.photoFileId} accountId={account.id} />
                      <div className="mt-1 text-[22px] font-bold">{account.name}</div>
                      {account.username && <div className="text-[13px] text-tg-accent">@{account.username}</div>}
                      {account.phone && account.phone !== "—" && <div className="text-[13px] text-tg-muted">{account.phone}</div>}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: connClr }} />
                        <span className="text-[12px] text-tg-muted">{connLbl}</span>
                      </div>
                    </div>
                    {/* Stats grid */}
                    <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
                      {([["💬","Диалоги",stats.dialogs,"chats"],["👥","Группы",stats.groups,"chats"],["📢","Каналы",stats.channels,"chats"],["🤖","Боты",stats.bots,"chats"]] as const).map(([icon, l, v, dest]) => (
                        <button key={l} onClick={() => handleNavClick(dest as MobileTab)} className="flex flex-col items-start rounded-2xl bg-tg-panel p-4 text-left transition-all hover:bg-tg-panel/70">
                          <div className="text-[26px] font-extrabold text-tg-accent">{v}</div>
                          <div className="text-[12px] text-tg-muted">{icon} {l}</div>
                        </button>
                      ))}
                    </div>
                    {/* Account switcher */}
                    {accounts.length > 1 && (
                      <div className="mx-4 mt-4 overflow-hidden rounded-2xl bg-tg-panel ring-1 ring-tg-line/40">
                        <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-tg-muted">Аккаунты</div>
                        {accounts.map((a, i) => (
                          <div key={a.id}>
                            {i > 0 && <div className="mx-4 h-px bg-tg-line/40" />}
                            <button onClick={() => { setAcc(a.id); handleNavClick("chats"); }} className={`flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 ${acc === a.id ? "text-tg-accent" : ""}`}>
                              <Avatar name={a.name} size={36} photoFileId={a.photoFileId} accountId={a.id} />
                              <div className="flex-1 text-left">
                                <div className="text-[14px] font-semibold">{a.name}</div>
                                <div className="text-[11px] text-tg-muted">{a.phone}</div>
                              </div>
                              {acc === a.id && <span className="text-tg-accent text-sm">✓</span>}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-tg-muted">
                    <div className="text-5xl opacity-30">👤</div>
                    <div className="text-sm">Нет активного аккаунта</div>
                    <button onClick={() => handleNavClick("epic")} className="rounded-xl bg-tg-active px-4 py-2 text-sm font-semibold text-white">Добавить аккаунт</button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* ── Bottom navigation bar ── */}
          <nav className="shrink-0 border-t border-tg-line bg-tg-panel" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <div className="flex items-end">
              {NAV_ITEMS.map(item => {
                const active = mobileTab === item.id;
                if (item.center) return (
                  <button key={item.id} onClick={() => handleNavClick(item.id)} className="flex flex-1 flex-col items-center pb-2 pt-0">
                    <div className={`-mt-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-xl ring-4 ring-tg-bg transition-all ${active ? "bg-tg-accent scale-110 shadow-tg-accent/40" : "bg-tg-panel"}`}>
                      ☠️
                    </div>
                  </button>
                );
                return (
                  <button key={item.id} onClick={() => handleNavClick(item.id)} className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition-all ${active ? "text-tg-accent" : "text-tg-muted hover:text-tg-text"}`}>
                    <div className="relative">
                      <span className="text-[22px] leading-none">{item.icon}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute -right-1 -top-0.5 min-w-[14px] rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold leading-[14px] text-white">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium leading-none">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}

      {/* ─── Command palette ─── */}
      {palette && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 pt-24" onMouseDown={() => setPalette(false)}>
          <div className="w-[540px] max-w-[92vw] overflow-hidden rounded-2xl border border-cyan-500/30 bg-tg-panel shadow-2xl" onMouseDown={e => e.stopPropagation()}>
            <input autoFocus value={pq} onChange={e => setPq(e.target.value)} placeholder="Команда или поиск по чатам…" className="w-full border-b border-tg-line bg-tg-bg px-4 py-3 text-sm outline-none" />
            <div className="max-h-[52vh] overflow-auto p-2">
              {palCommands.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase text-tg-muted">Команды</div>}
              {palCommands.map(c => <button key={c.id} onClick={() => { c.run(); setPalette(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/60"><span className="text-cyan-300">⌁</span>{c.label}</button>)}
              {palNodes.length > 0 && <div className="px-2 py-1 pt-2 text-[10px] font-bold uppercase text-tg-muted">Чаты ({palNodes.length})</div>}
              {palNodes.map(n => <button key={n.id} onClick={() => { setChat(n.id); setLocalItem(""); setPalette(false); setMobileTab("chats"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/60"><Avatar name={n.title || "чат"} size={22} />{n.title || "чат"}</button>)}
              {pq && palCommands.length === 0 && palNodes.length === 0 && <div className="px-3 py-3 text-sm text-tg-muted">Ничего не найдено.</div>}
            </div>
            <div className="border-t border-tg-line px-3 py-1.5 text-[10px] text-tg-muted">Esc — закрыть</div>
          </div>
        </div>
      )}
    </div>
  );
}
