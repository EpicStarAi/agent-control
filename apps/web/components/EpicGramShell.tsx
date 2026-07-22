"use client";

import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TelegramBindingWizard } from "./TelegramBindingWizard";
import {
  Archive,
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  Database,
  FileClock,
  Inbox,
  Loader2,
  Menu,
  MessageCircle,
  Moon,
  MoreVertical,
  PanelRight,
  Paperclip,
  Pause,
  Pin,
  PinOff,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SkipForward,
  Smartphone,
  Sparkles,
  User,
  Users,
  X
} from "lucide-react";
import { VisualExecutionLayer } from "./VisualExecutionLayer";
import type { AgentVisualStep, AgentStepStatus, UiActionName, VisualTarget } from "@/lib/uiActionRegistry";
import { UI_ACTION_REGISTRY } from "@/lib/uiActionRegistry";
type Section = "dashboard" | "chats" | "agents" | "accounts" | "logs" | "settings";

type Props = { section: Section };
type AuthMode = "qr" | "phone";
type FolderId = "all" | "private" | "groups" | "channels" | "bots" | "unread" | "archive";
type TelegramAccount = {
  slotId?: string;
  id?: string;
  label?: string;
  status?: string;
  active?: boolean;
  authorizationState?: string | null;
  displayName?: string;
  username?: string | null;
  phoneMasked?: string | null;
};
type TelegramChat = {
  id: string;
  title: string;
  type?: string;
  category?: "private" | "group" | "channel" | "bot" | "chat";
  list?: "main" | "archive";
  isChannel?: boolean;
  isBot?: boolean;
  username?: string | null;
  photoSmallFileId?: string | null;
  unreadCount?: number;
  isMarkedAsUnread?: boolean;
  lastMessage?: TelegramMessage | null;
};
type TelegramMessage = {
  id: string;
  chatId: string;
  date?: string | null;
  isOutgoing?: boolean;
  content: string;
  authorSignature?: string | null;
};
type TelegramStatus = {
  runtime?: string;
  connected?: boolean;
  activeAccountId?: string;
  authorizationState?: string;
  qrLink?: string | null;
  message?: string;
  account?: TelegramAccount | null;
  accounts?: TelegramAccount[];
};
type TelegramChatsResponse = {
  chats?: TelegramChat[];
  chatsCount?: number;
  message?: string;
};
type TelegramMessagesResponse = {
  messages?: TelegramMessage[];
  messagesCount?: number;
  message?: string;
};
type AiStatus = {
  runtime?: string;
  provider?: string;
  enabled?: boolean;
  apiKeyPresent?: boolean;
  apiKeyMasked?: string | null;
  model?: string;
  sendMode?: string;
  message?: string;
};

const BRAND_NAME = "EPIC☠️GRAM";
const CLIENT_VERSION = "epicgram-ui-2026-06-13-cachefix";

type LocalItem = {
  id: string;
  folder: "groups" | "channels";
  title: string;
  subtitle: string;
  kind: "group" | "channel";
  badge: string;
  memory: string[];
  tasks: string[];
};

const folders = [
  { id: "all" as const, label: "Все", icon: MessageCircle },
  { id: "private" as const, label: "Личные", icon: User },
  { id: "groups" as const, label: "Группы", icon: Users },
  { id: "channels" as const, label: "Каналы", icon: Radio },
  { id: "bots" as const, label: "Боты", icon: Bot },
  { id: "unread" as const, label: "Новые", icon: Inbox },
  { id: "archive" as const, label: "Архив", icon: Archive }
];

const localItems: LocalItem[] = [
  {
    id: "group-tdlib-core",
    folder: "groups",
    title: "Техгруппа: TDLib Core",
    subtitle: "Авторизация, QR, номер телефона, статус сессии",
    kind: "group",
    badge: "AI группа",
    memory: [
      "Подключать только аккаунты владельца через официальный TDLib.",
      "Сессии хранить на backend в зашифрованном виде.",
      "QR и код подтверждения не сохранять во frontend."
    ],
    tasks: ["Спроектировать login-flow", "Добавить endpoint статуса", "Подготовить logout/delete session"]
  },
  {
    id: "group-sessions",
    folder: "groups",
    title: "Техгруппа: Сессии",
    subtitle: "Шифрование, хранение, список подключенных аккаунтов",
    kind: "group",
    badge: "AI группа",
    memory: [
      "Каждая сессия имеет owner_id и метку согласия.",
      "Удаление сессии доступно из интерфейса.",
      "Секреты не попадают в localStorage браузера."
    ],
    tasks: ["Выбрать хранилище", "Добавить encryption key", "Сделать список аккаунтов"]
  },
  {
    id: "group-agents",
    folder: "groups",
    title: "Техгруппа: AI-операторы",
    subtitle: "Права агентов, память, подтверждение действий",
    kind: "group",
    badge: "AI группа",
    memory: [
      "AI-агенты не отправляют сообщения без подтверждения человека.",
      "Каждое действие агента пишется в аудит.",
      "Память разделяется по аккаунтам и рабочим областям."
    ],
    tasks: ["Описать роли агентов", "Добавить approval queue", "Связать память с аккаунтом"]
  },
  {
    id: "channel-memory",
    folder: "channels",
    title: "AI Канал: Память",
    subtitle: "Долговременная память проекта и подключенных аккаунтов",
    kind: "channel",
    badge: "AI канал",
    memory: [
      "Пользователь явно авторизует каждый аккаунт.",
      "Память не включает приватные сообщения без разрешения.",
      "Сводки хранят источник и время создания."
    ],
    tasks: ["Создать memory schema", "Добавить экспорт", "Добавить очистку памяти"]
  },
  {
    id: "channel-decisions",
    folder: "channels",
    title: "AI Канал: Решения",
    subtitle: "Архив технических решений и ограничений безопасности",
    kind: "channel",
    badge: "AI канал",
    memory: [
      "Frontend показывает состояние и запускает consent-flow.",
      "TDLib работает на backend или локальном runtime.",
      "Telegram-сессии не скрываются от владельца."
    ],
    tasks: ["Зафиксировать архитектуру", "Описать угрозы", "Добавить журнал решений"]
  },
  {
    id: "channel-automation",
    folder: "channels",
    title: "AI Канал: Автоматизации",
    subtitle: "План будущих безопасных автоматизаций",
    kind: "channel",
    badge: "AI канал",
    memory: [
      "Массовый спам и скрытая имитация запрещены.",
      "Автоматизация возможна только для разрешенных процессов.",
      "В MVP внешняя отправка остается на подтверждении человека."
    ],
    tasks: ["Список разрешенных сценариев", "Политика лимитов", "Human approval UI"]
  }
];

const routeItems = [
  { href: "/client", label: "Рабочая область", icon: MessageCircle },
  { href: "/platform", label: "Платформа", icon: Smartphone },
  { href: "/council", label: "Совет", icon: Sparkles },
  { href: "/missions", label: "Миссии", icon: Inbox },
  { href: "/chats", label: "Чаты", icon: Users },
  { href: "/accounts", label: "Аккаунты", icon: User },
  { href: "/agents", label: "AI-агенты", icon: Cpu },
  { href: "/logs", label: "Журнал аудита", icon: FileClock },
  { href: "/settings", label: "Настройки", icon: Settings }
];

function isTelegramReady(status: TelegramStatus | null) {
  // Bridged per-user shape: /api/telegram/status returns runtime "owner_bound" +
  // connected:true for an owner-matched ready binding.
  return (
    status?.runtime === "ready" ||
    status?.runtime === "owner_bound" ||
    status?.connected === true ||
    status?.authorizationState === "authorizationStateReady"
  );
}

function primaryTelegramAccount(status: TelegramStatus | null) {
  return status?.account ?? status?.accounts?.find((account) => account.active) ?? status?.accounts?.[0] ?? null;
}

function activeAuthorizationState(status: TelegramStatus | null) {
  const activeId = status?.activeAccountId;
  const active = activeId ? status?.accounts?.find((account) => account.slotId === activeId) : null;
  return active?.authorizationState ?? status?.authorizationState ?? null;
}

function chatMatchesFolder(chat: TelegramChat, folder: FolderId) {
  if (folder === "all") return chat.list !== "archive";
  if (folder === "archive") return chat.list === "archive";
  if (folder === "unread") return Boolean(chat.unreadCount) || Boolean(chat.isMarkedAsUnread);
  if (folder === "channels") return chat.category === "channel" || Boolean(chat.isChannel);
  if (folder === "bots") return chat.category === "bot" || Boolean(chat.isBot);
  if (folder === "groups") return chat.category === "group";
  if (folder === "private") return chat.category === "private";
  return true;
}

function telegramFolderLabel(folder: FolderId) {
  return folders.find((item) => item.id === folder)?.label ?? "Все";
}

function chatTypeLabel(chat?: TelegramChat | null) {
  if (!chat) return "чат";
  if (chat.category === "bot") return "бот";
  if (chat.category === "private") return "личный чат";
  if (chat.category === "group") return "группа";
  if (chat.category === "channel") return "канал";
  if (chat.isChannel) return "канал";
  return "чат";
}

function chatMatchesSearch(chat: TelegramChat, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  const haystack = [
    chat.title,
    chat.username,
    chatTypeLabel(chat),
    chat.lastMessage?.content
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
}

function formatMessageTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function initialsFromTitle(title?: string | null) {
  const clean = (title ?? "").replace(/[^\wа-яА-ЯёЁ\s]/g, " ").trim();
  if (!clean) return "TG";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]).join("").toUpperCase();
}

function TelegramAvatar({ title, type, active, photoFileId }: { title: string; type?: string; active?: boolean; photoFileId?: string | null }) {
  const isPrivate = type === "chatTypePrivate";
  return (
    <div className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full ${active ? "bg-white/10" : "bg-gradient-to-br from-[#3d1320] to-[#12131a]"} text-sm font-bold text-tg-accent ring-1 ring-white/10`}>
      {photoFileId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/telegram/photo?fileId=${encodeURIComponent(photoFileId)}`} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{isPrivate ? initialsFromTitle(title) : initialsFromTitle(title)}</span>
      )}
    </div>
  );
}

function EpicStarMark({ className = "h-7 w-7" }: { className?: string }) {
  // EPIC☠STAR neon skull-star mark (red). Inline SVG so it inherits brand glow.
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="EPIC☠STAR">
      <defs>
        <linearGradient id="epicStarGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff6b81" />
          <stop offset="55%" stopColor="#ff2d55" />
          <stop offset="100%" stopColor="#e11d3f" />
        </linearGradient>
      </defs>
      <path
        d="M24 3l5.5 11.1 12.2 1.8-8.8 8.6 2.1 12.2L24 31.9 11 36.7l2.1-12.2-8.8-8.6 12.2-1.8L24 3z"
        fill="none"
        stroke="url(#epicStarGrad)"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M24 13c-4.5 0-8 3.4-8 8 0 2.9 1.4 5 3.4 6.3v3.1c0 1 .8 1.8 1.8 1.8h5.6c1 0 1.8-.8 1.8-1.8v-3.1c2-1.3 3.4-3.4 3.4-6.3 0-4.6-3.5-8-8-8z"
        fill="url(#epicStarGrad)"
      />
      <circle cx="20.5" cy="20.8" r="2.3" fill="#0a0b0f" />
      <circle cx="27.5" cy="20.8" r="2.3" fill="#0a0b0f" />
      <path d="M22.5 26h3M23 26v3M25 26v3" stroke="#0a0b0f" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BrandBar() {
  return (
    <div className="flex items-center gap-2.5 border-b border-tg-line bg-tg-header/80 px-4 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-epic-ink ring-1 ring-tg-line epic-glow">
        <EpicStarMark className="h-7 w-7" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-bold tracking-wide epic-title">EPIC☠STAR</div>
        <div className="truncate text-[11px] text-tg-muted">DEEP INSIDE · EPIC☠️GRAM</div>
      </div>
      <span className="shrink-0 rounded-full border border-tg-line bg-tg-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tg-accent">
        client
      </span>
    </div>
  );
}

export function EpicGramShell({ section }: Props) {
  const [activeFolder, setActiveFolder] = useState<FolderId>("all");
  const [activeItemId, setActiveItemId] = useState(localItems[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authFlowActive, setAuthFlowActive] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("qr");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pass2fa, setPass2fa] = useState("");
  const [qrLink, setQrLink] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [authMessage, setAuthMessage] = useState("TDLib backend пока не подключен.");
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [telegramChats, setTelegramChats] = useState<TelegramChat[]>([]);
  const [selectedTelegramChatId, setSelectedTelegramChatId] = useState("");
  const [telegramMessages, setTelegramMessages] = useState<TelegramMessage[]>([]);
  const [clientDiagnostics, setClientDiagnostics] = useState("проверка кэша...");
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSyncMessage, setChatSyncMessage] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [approvalNotice, setApprovalNotice] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const telegramReady = isTelegramReady(telegramStatus);
  const activeAccountId = telegramStatus?.activeAccountId ?? primaryTelegramAccount(telegramStatus)?.slotId ?? "main";

  useEffect(() => {
    clearClientCaches(false).catch(() => undefined);
  }, []);

  async function clearClientCaches(reload: boolean) {
    const registrations = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
    await Promise.all(registrations.map((registration) => registration.unregister()));

    const cacheKeys = "caches" in window ? await caches.keys() : [];
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));

    setClientDiagnostics(`версия ${CLIENT_VERSION}; service workers: ${registrations.length}; caches: ${cacheKeys.length}`);
    if (reload) window.location.reload();
  }

  useEffect(() => {
    let cancelled = false;

    async function renderQr() {
      if (!qrLink) {
        setQrDataUrl("");
        return;
      }

      const qrcode = await import("qrcode");
      const toDataUrl = qrcode.toDataURL ?? qrcode.default.toDataURL;
      const dataUrl = await toDataUrl(qrLink, {
        errorCorrectionLevel: "M",
        margin: 1,
        scale: 8,
        color: {
          dark: "#0a0b0f",
          light: "#ffffff"
        }
      });
      if (!cancelled) setQrDataUrl(dataUrl);
    }

    renderQr().catch(() => {
      if (!cancelled) setQrDataUrl("");
    });

    return () => {
      cancelled = true;
    };
  }, [qrLink]);

  useEffect(() => {
    let cancelled = false;

    async function syncTelegramStatus() {
      const response = await fetch("/api/telegram/status", { cache: "no-store" });
      const status = (await response.json()) as TelegramStatus;
      if (cancelled) return;

      setTelegramStatus(status);
      if (authOpen && status.qrLink) setQrLink(status.qrLink);

      const authState = activeAuthorizationState(status);
      if (authFlowActive && authState === "authorizationStateWaitCode") {
        setAuthMode("phone");
        setAuthOpen(true);
        setQrLink("");
        setQrDataUrl("");
        const active = primaryTelegramAccount(status);
        setAuthMessage(active?.phoneMasked ? `Введите код Telegram для ${active.phoneMasked}.` : "Введите код Telegram.");
      } else if (authFlowActive && authState === "authorizationStateWaitPassword") {
        setAuthOpen(true);
        setAuthMessage("Введите облачный пароль Telegram (2FA).");
      }

      if (authOpen && authFlowActive && isTelegramReady(status)) {
        const accountName = primaryTelegramAccount(status)?.displayName;
        setQrLink("");
        setQrDataUrl("");
        setAuthOpen(false);
        setAuthFlowActive(false);
        setAuthMessage(accountName ? `Telegram авторизован: ${accountName}` : "Telegram аккаунт авторизован.");
      }
    }

    syncTelegramStatus().catch(() => undefined);
    const timer = window.setInterval(() => {
      syncTelegramStatus().catch(() => undefined);
    }, authOpen ? 2000 : 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authFlowActive, authOpen]);

  useEffect(() => {
    let cancelled = false;

    async function syncAiStatus() {
      const response = await fetch("/api/ai/status", { cache: "no-store" });
      const status = (await response.json()) as AiStatus;
      if (!cancelled) setAiStatus(status);
    }

    syncAiStatus().catch(() => undefined);
    const timer = window.setInterval(() => {
      syncAiStatus().catch(() => undefined);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // P17.5: instant account switch via Ctrl/Cmd+1..9 (active-slot swap only, no re-auth).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key < "1" || event.key > "9") return;
      const slot = (telegramStatus?.accounts ?? [])[Number(event.key) - 1];
      if (!slot?.slotId || slot.slotId === activeAccountId) return;
      event.preventDefault();
      selectTelegramAccount(slot.slotId).catch(() => undefined);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [telegramStatus, activeAccountId]);

  useEffect(() => {
    if (!telegramReady) {
      setTelegramChats([]);
      setChatSyncMessage("Telegram не авторизован");
      return undefined;
    }

    let cancelled = false;

    async function loadTelegramChats() {
      setChatSyncMessage("Синхронизация TDLib...");
      const response = await fetch(`/api/telegram/chats?accountId=${encodeURIComponent(activeAccountId)}`, { cache: "no-store" });
      const data = (await response.json()) as TelegramChatsResponse;
      if (!cancelled && response.ok) {
        setTelegramChats(data.chats ?? []);
        setChatSyncMessage(`обновлено: ${data.chats?.length ?? 0}`);
      }
    }

    loadTelegramChats().catch(() => undefined);
    const timer = window.setInterval(() => {
      loadTelegramChats().catch(() => undefined);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeAccountId, telegramReady]);

  useEffect(() => {
    if (telegramChats.length === 0) {
      setSelectedTelegramChatId("");
      return;
    }

    const visibleChats = telegramChats.filter((chat) => chatMatchesFolder(chat, activeFolder));
    const currentExists = visibleChats.some((chat) => chat.id === selectedTelegramChatId);
    if (!currentExists) setSelectedTelegramChatId((visibleChats[0] ?? telegramChats[0]).id);
  }, [activeFolder, selectedTelegramChatId, telegramChats]);

  useEffect(() => {
    if (!selectedTelegramChatId) {
      setTelegramMessages([]);
      setMessagesLoading(false);
      return undefined;
    }

    let cancelled = false;
    setMessagesLoading(true);

    async function loadTelegramMessages() {
      const response = await fetch(`/api/telegram/messages?accountId=${encodeURIComponent(activeAccountId)}&chatId=${encodeURIComponent(selectedTelegramChatId)}`, { cache: "no-store" });
      const data = (await response.json()) as TelegramMessagesResponse;
      if (!cancelled && response.ok) setTelegramMessages(data.messages ?? []);
      if (!cancelled) setMessagesLoading(false);
    }

    loadTelegramMessages().catch(() => {
      if (!cancelled) setMessagesLoading(false);
    });
    const timer = window.setInterval(() => {
      loadTelegramMessages().catch(() => undefined);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeAccountId, selectedTelegramChatId]);

  // Memory indicator: read-only probe of the persona's per-conversation memory.
  // Purely additive — surfaces "помнит N реплик" without changing send/suggest flow.
  useEffect(() => {
    if (!selectedTelegramChatId) {
      setMemoryCount(null);
      return undefined;
    }

    let cancelled = false;

    async function loadMemory() {
      try {
        const response = await fetch(`/api/ai/memory?conversationId=${encodeURIComponent(selectedTelegramChatId)}&limit=50`, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setMemoryCount(null);
          return;
        }
        const data = (await response.json()) as { count?: number };
        if (!cancelled) setMemoryCount(typeof data.count === "number" ? data.count : null);
      } catch {
        if (!cancelled) setMemoryCount(null);
      }
    }

    loadMemory();
    const timer = window.setInterval(loadMemory, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedTelegramChatId, telegramMessages.length]);

  const filteredItems = useMemo(() => localItems.filter((item) => item.folder === activeFolder), [activeFolder]);
  const activeItem = localItems.find((item) => item.id === activeItemId) ?? filteredItems[0] ?? localItems[0];
  const useTelegramChats = telegramReady && telegramChats.length > 0;
  const visibleTelegramChats = useMemo(
    () => telegramChats.filter((chat) => chatMatchesFolder(chat, activeFolder) && chatMatchesSearch(chat, searchQuery)),
    [activeFolder, searchQuery, telegramChats]
  );
  const activeTelegramChat = useTelegramChats
    ? telegramChats.find((chat) => chat.id === selectedTelegramChatId) ?? visibleTelegramChats[0] ?? telegramChats[0]
    : null;
  const showTelegramChat = Boolean(activeTelegramChat && (section === "dashboard" || section === "chats"));
  // P-MOBILE-1a: on narrow screens show ONE pane at a time. Right pane (messages
  // / settings / accounts) is shown when a chat is open OR the section is not a
  // chat list section; otherwise the chat list is shown. Desktop (md+) keeps the
  // full multi-column grid regardless.
  const mobileRightPane = showTelegramChat || !(section === "dashboard" || section === "chats");

  function selectFolder(folder: FolderId) {
    setActiveFolder(folder);
    const first = localItems.find((item) => item.folder === folder);
    if (first) setActiveItemId(first.id);
  }

  async function refreshTelegramChats() {
    if (!telegramReady) {
      setChatSyncMessage("Telegram не авторизован");
      return;
    }

    setChatSyncMessage("Синхронизация TDLib...");
    const response = await fetch(`/api/telegram/chats?accountId=${encodeURIComponent(activeAccountId)}`, { cache: "no-store" });
    const data = (await response.json()) as TelegramChatsResponse;
    if (response.ok) {
      setTelegramChats(data.chats ?? []);
      setChatSyncMessage(`обновлено: ${data.chats?.length ?? 0}`);
    } else {
      setChatSyncMessage(data.message ?? "ошибка синхронизации");
    }
  }

  async function refreshTelegramMessages() {
    if (!selectedTelegramChatId) return;
    const response = await fetch(`/api/telegram/messages?accountId=${encodeURIComponent(activeAccountId)}&chatId=${encodeURIComponent(selectedTelegramChatId)}`, { cache: "no-store" });
    const data = (await response.json()) as TelegramMessagesResponse;
    if (response.ok) setTelegramMessages(data.messages ?? []);
  }

  async function requestAiSuggestion() {
    if (!selectedTelegramChatId) return;
    setAiBusy(true);
    setApprovalNotice("EPIC☠STAR готовит черновик...");
    try {
      const response = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedTelegramChatId,
          chatTitle: activeTelegramChat?.title ?? null,
          history: telegramMessages
        })
      });
      const data = (await response.json()) as { draft?: string; error?: string };
      if (response.ok && data.draft) {
        setMessageDraft(data.draft);
        setApprovalNotice("AI-черновик готов. Проверьте, при необходимости отредактируйте и нажмите «Отправить». Автоматической отправки нет.");
      } else {
        setApprovalNotice(data.error ?? "Не удалось получить черновик от мозга.");
      }
    } catch {
      setApprovalNotice("Backend недоступен для AI-подсказки.");
    } finally {
      setAiBusy(false);
    }
  }

  // Real outbound send. Only fires on an explicit operator click and the backend
  // re-checks the approval gate (operatorApproved). The AI never calls this.
  async function sendApprovedMessage() {
    const cleanDraft = messageDraft.trim();
    if (!cleanDraft || !selectedTelegramChatId) return;
    setSendBusy(true);
    setApprovalNotice("Отправка по подтверждению оператора...");
    try {
      const response = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: activeAccountId, chatId: selectedTelegramChatId, text: cleanDraft, operatorApproved: true })
      });
      const data = (await response.json()) as { sent?: boolean; message?: string };
      if (response.ok && data.sent) {
        setMessageDraft("");
        setApprovalNotice("Сообщение отправлено в Telegram (подтверждено оператором).");
        await refreshTelegramMessages();
      } else {
        setApprovalNotice(data.message ?? "Отправка не удалась.");
      }
    } catch {
      setApprovalNotice("Backend недоступен для отправки.");
    } finally {
      setSendBusy(false);
    }
  }

  function activeSlotIsReady() {
    const slot = telegramStatus?.accounts?.find((a) => a.slotId === activeAccountId);
    return Boolean(slot && (slot.status === "ready" || slot.authorizationState === "authorizationStateReady"));
  }

  async function requestQrAuth() {
    if (activeSlotIsReady()) {
      setAuthMessage("Этот аккаунт уже авторизован. Откройте рабочую область или нажмите «Добавить аккаунт», чтобы войти в новый.");
      return;
    }
    setAuthFlowActive(true);
    const response = await fetch("/api/telegram/active-auth/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = (await response.json()) as { message?: string; qrLink?: string };
    setQrLink(data.qrLink ?? "");
    setAuthMessage(data.message ?? (response.ok ? "QR авторизация запрошена." : "QR авторизация не запустилась."));
  }

  async function requestPhoneAuth() {
    if (activeSlotIsReady()) {
      setAuthMessage("Этот аккаунт уже авторизован. Откройте рабочую область или нажмите «Добавить аккаунт», чтобы войти в новый.");
      return;
    }
    setAuthFlowActive(true);
    setQrLink("");
    setQrDataUrl("");
    const response = await fetch("/api/telegram/active-auth/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: activeAccountId, phoneNumber: phone })
    });
    const data = (await response.json()) as { message?: string };
    setAuthMessage(data.message ?? (response.ok ? "Код запрошен. Проверьте Telegram." : "Код не отправлен. Проверьте номер и backend."));
  }

  async function requestCodeAuth() {
    setAuthFlowActive(true);
    const response = await fetch("/api/telegram/auth/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: activeAccountId, code })
    });
    const data = (await response.json()) as { message?: string };
    setAuthMessage(data.message ?? (response.ok ? "Код отправлен на проверку." : "Код не принят Telegram."));
    if (response.ok) {
      const statusResponse = await fetch("/api/telegram/status", { cache: "no-store" });
      const status = (await statusResponse.json()) as TelegramStatus;
      setTelegramStatus(status);
      if (isTelegramReady(status)) {
        const accountName = primaryTelegramAccount(status)?.displayName;
        setAuthOpen(false);
        setAuthFlowActive(false);
        setAuthMessage(accountName ? `Telegram авторизован: ${accountName}` : "Telegram аккаунт авторизован.");
      }
    }
  }

  async function requestTwoFaAuth() {
    setAuthFlowActive(true);
    const response = await fetch("/api/telegram/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: activeAccountId, password: pass2fa })
    });
    const data = (await response.json()) as { message?: string };
    setPass2fa("");
    setAuthMessage(data.message ?? (response.ok ? "2FA отправлен на проверку." : "2FA не принят."));
    if (response.ok) {
      const statusResponse = await fetch("/api/telegram/status", { cache: "no-store" });
      const status = (await statusResponse.json()) as TelegramStatus;
      setTelegramStatus(status);
      if (isTelegramReady(status)) {
        const accountName = primaryTelegramAccount(status)?.displayName;
        setAuthOpen(false);
        setAuthFlowActive(false);
        setAuthMessage(accountName ? `Telegram авторизован: ${accountName}` : "Telegram аккаунт авторизован.");
      }
    }
  }

  async function createTelegramAccount() {
    const response = await fetch("/api/telegram/accounts/new", { method: "POST" });
    const status = (await response.json()) as TelegramStatus;
    setTelegramStatus(status);
    setTelegramChats([]);
    setTelegramMessages([]);
    setSelectedTelegramChatId("");
    setQrLink("");
    setQrDataUrl("");
    setCode("");
    setAuthOpen(true);
    setAuthFlowActive(false);
    setAuthMessage(status.message ?? (response.ok ? "Создан новый слот аккаунта." : "Не удалось создать слот аккаунта."));
  }

  async function deleteTelegramAccount(slotId?: string) {
    const target = slotId ?? activeAccountId;
    if (!target) return;
    if (typeof window !== "undefined" && !window.confirm("Удалить этот аккаунт-слот? Сессия будет стёрта.")) return;
    const response = await fetch("/api/telegram/accounts/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: target })
    });
    const status = (await response.json()) as TelegramStatus;
    setTelegramStatus(status);
    setTelegramChats([]);
    setTelegramMessages([]);
    setSelectedTelegramChatId("");
    setQrLink("");
    setQrDataUrl("");
    setCode("");
    setAuthMessage(status.message ?? (response.ok ? "Слот удалён." : "Не удалось удалить слот."));
  }

  async function showTelegramAccount() {
    if (activeAccountId) {
      await selectTelegramAccount(activeAccountId);
    }
    setAuthOpen(false);
  }

  async function selectTelegramAccount(accountId: string) {
    const response = await fetch("/api/telegram/accounts/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId })
    });
    const status = (await response.json()) as TelegramStatus;
    setTelegramStatus(status);
    setTelegramChats([]);
    setTelegramMessages([]);
    setSelectedTelegramChatId("");
    setQrLink(status.qrLink ?? "");
    setQrDataUrl("");
    setCode("");
    setAuthMessage(status.message ?? (response.ok ? "Аккаунт переключен." : "Не удалось переключить аккаунт."));
  }

  async function resetAuth() {
    const response = await fetch("/api/telegram/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: activeAccountId })
    });
    const data = (await response.json()) as { message?: string };
    setQrLink("");
    setQrDataUrl("");
    setCode("");
    setAuthFlowActive(false);
    setAuthMessage(data.message ?? (response.ok ? "Авторизация сброшена." : "Не удалось сбросить авторизацию."));
  }

  const railAccounts = telegramStatus?.accounts ?? [];
  const unreadActiveTotal = telegramChats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <main className="h-screen min-h-0 overflow-hidden bg-tg-bg text-tg-text">
      <TelegramBindingWizard />
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[auto_minmax(300px,380px)_1fr] xl:grid-cols-[auto_380px_1fr_320px]">
        <AccountRail
          className="hidden md:flex"
          accounts={railAccounts}
          activeId={activeAccountId}
          unreadActive={unreadActiveTotal}
          onSelect={(id) => selectTelegramAccount(id)}
          onAdd={() => setAuthOpen(true)}
          onDelete={(id) => deleteTelegramAccount(id)}
        />
        <section className={`relative h-full min-h-0 flex-col border-r border-tg-line bg-tg-panel ${mobileRightPane ? "hidden md:flex" : "flex"}`}>
          {menuOpen && (
            <TelegramMenu
              onClose={() => setMenuOpen(false)}
              onAuth={() => setAuthOpen(true)}
              accounts={railAccounts}
              activeId={activeAccountId}
              unreadActive={unreadActiveTotal}
              onSelectAccount={(id) => selectTelegramAccount(id)}
              onAddAccount={() => setAuthOpen(true)}
            />
          )}
          <BrandBar />
          <header className="border-b border-tg-line px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setMenuOpen((value) => !value)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-tg-muted hover:bg-tg-hover hover:text-tg-text" aria-label="Открыть меню">
                <Menu className="h-5 w-5" />
              </button>
              <label data-ui-target="chat-search" className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-full bg-tg-bg px-4 text-tg-muted">
                <Search className="h-4 w-4" />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-tg-muted" placeholder="Поиск" />
              </label>
              <button onClick={refreshTelegramChats} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-tg-muted hover:bg-tg-hover hover:text-tg-text" aria-label="Обновить чаты">
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-tg-muted">
              <span>{telegramReady ? "TDLib подключен" : "ожидание Telegram"}</span>
              <span className="truncate">{chatSyncMessage}</span>
            </div>
          </header>

          <div className="flex gap-2 overflow-x-auto border-b border-tg-line px-3 py-2">
            {folders.map((folder) => {
              const Icon = folder.icon;
              const count = useTelegramChats
                ? telegramChats.filter((chat) => chatMatchesFolder(chat, folder.id)).length
                : localItems.filter((item) => item.folder === folder.id).length;
              return (
                <button key={folder.id} onClick={() => selectFolder(folder.id)} className={`flex shrink-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm ${activeFolder === folder.id ? "bg-tg-active text-white" : "text-tg-muted hover:bg-tg-hover hover:text-tg-text"}`}>
                  <Icon className="h-4 w-4" />
                  {folder.label}
                  <span className="rounded-full bg-black/20 px-1.5 text-xs">{count}</span>
                </button>
              );
            })}
          </div>

          <div data-ui-target="chat-list" className="min-h-0 flex-1 overflow-y-auto">
            {useTelegramChats
              ? visibleTelegramChats.length > 0
                ? visibleTelegramChats.map((chat) => (
                    <TelegramChatRow
                      key={chat.id}
                      chat={chat}
                      active={chat.id === activeTelegramChat?.id}
                      onClick={() => setSelectedTelegramChatId(chat.id)}
                    />
                  ))
                : <EmptyChatFilter folder={activeFolder} query={searchQuery} />
              : filteredItems.map((item) => (
                  <LocalItemRow key={item.id} item={item} active={item.id === activeItem.id} onClick={() => setActiveItemId(item.id)} />
                ))}
          </div>
        </section>

        <section className={`h-full min-h-0 min-w-0 flex-col bg-tg-chat ${mobileRightPane ? "flex" : "hidden md:flex"}`}>
          {showTelegramChat ? (
            <button
              onClick={() => setSelectedTelegramChatId("")}
              className="flex items-center gap-1 border-b border-tg-line px-4 py-2 text-sm text-tg-muted hover:text-white md:hidden"
              aria-label="Назад к чатам"
            >
              ← Назад к чатам
            </button>
          ) : null}
          {showTelegramChat ? <TelegramChatHeader chat={activeTelegramChat as TelegramChat} /> : <SectionHeader section={section} item={activeItem} />}
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_20%_10%,rgba(255,45,85,.09),transparent_26%),linear-gradient(135deg,rgba(12,12,18,.96),rgba(7,7,12,.98))] p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,59,92,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,59,92,.7)_1px,transparent_1px)] [background-size:32px_32px]" />
            {showTelegramChat ? (
              <TelegramChatWorkspace
                chat={activeTelegramChat as TelegramChat}
                messages={telegramMessages}
                draft={messageDraft}
                setDraft={setMessageDraft}
                approvalNotice={approvalNotice}
                onRefreshMessages={refreshTelegramMessages}
                onSuggest={requestAiSuggestion}
                onSendApproved={sendApprovedMessage}
                aiBusy={aiBusy}
                sendBusy={sendBusy}
                aiStatus={aiStatus}
                messagesLoading={messagesLoading}
                memoryCount={memoryCount}
              />
            ) : section === "settings" ? (
              <SettingsWorkspace
                telegramStatus={telegramStatus}
                telegramChats={telegramChats}
                aiStatus={aiStatus}
                clientDiagnostics={clientDiagnostics}
                onClearClient={() => clearClientCaches(true)}
                onAuth={() => setAuthOpen(true)}
                onCreateAccount={createTelegramAccount}
                onSelectAccount={selectTelegramAccount}
              />
            ) : section === "accounts" ? (
              <AccountsWorkspace
                telegramStatus={telegramStatus}
                telegramChats={telegramChats}
                onAuth={() => setAuthOpen(true)}
                onCreateAccount={createTelegramAccount}
                onSelectAccount={selectTelegramAccount}
              />
            ) : (
              <ItemWorkspace item={activeItem} telegramStatus={telegramStatus} telegramChats={telegramChats} onAuth={() => setAuthOpen(true)} />
            )}
          </div>
        </section>

        <aside className="hidden h-full min-h-0 flex-col border-l border-tg-line bg-tg-panel xl:flex">
          {activeTelegramChat ? (
            <TelegramInfoPanel
              chat={activeTelegramChat}
              activeFolder={activeFolder}
              messages={telegramMessages}
              telegramStatus={telegramStatus}
              telegramChats={telegramChats}
              onAuth={() => setAuthOpen(true)}
            />
          ) : (
            <InfoPanel item={activeItem} telegramStatus={telegramStatus} telegramChats={telegramChats} onAuth={() => setAuthOpen(true)} />
          )}
        </aside>
      </div>

      {authOpen && (
        <AuthModal
          authMode={authMode}
          setAuthMode={setAuthMode}
          phone={phone}
          setPhone={setPhone}
          code={code}
          setCode={setCode}
          pass2fa={pass2fa}
          setPass2fa={setPass2fa}
          requestTwoFaAuth={requestTwoFaAuth}
          qrLink={qrLink}
          qrDataUrl={qrDataUrl}
          authMessage={authMessage}
          telegramStatus={telegramStatus}
          telegramChatsCount={telegramChats.length}
          onCreateAccount={createTelegramAccount}
          onDeleteAccount={deleteTelegramAccount}
          onShowAccount={showTelegramAccount}
          onSelectAccount={selectTelegramAccount}
          requestQrAuth={requestQrAuth}
          requestPhoneAuth={requestPhoneAuth}
          requestCodeAuth={requestCodeAuth}
          resetAuth={resetAuth}
          onClose={() => {
            setAuthOpen(false);
            setAuthFlowActive(false);
          }}
        />
      )}
      {authFlowActive && activeAuthorizationState(telegramStatus) === "authorizationStateWaitCode" && !authOpen && (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-2xl border border-fuchsia-400/40 bg-tg-panel/95 p-4 shadow-telegram backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fuchsia-500/20 text-lg">#</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white">Введите код Telegram</div>
              <div className="mt-0.5 text-xs text-tg-muted">
                Код уже отправлен{primaryTelegramAccount(telegramStatus)?.phoneMasked ? ` на ${primaryTelegramAccount(telegramStatus)?.phoneMasked}` : ""}.
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="12345"
                  inputMode="numeric"
                  autoFocus
                  className="h-11 min-w-0 flex-1 rounded-xl bg-tg-bg px-4 text-base outline-none ring-1 ring-tg-line focus:ring-tg-blue"
                />
                <button onClick={requestCodeAuth} className="rounded-xl bg-tg-active px-4 text-sm font-semibold text-white">
                  Проверить
                </button>
              </div>
              <button
                onClick={() => {
                  setAuthMode("phone");
                  setAuthOpen(true);
                  setAuthFlowActive(true);
                }}
                className="mt-2 text-xs font-semibold text-tg-accent hover:text-white"
              >
                Открыть полное окно авторизации
              </button>
            </div>
          </div>
        </div>
      )}
      <OperatorDock
          activeAccountId={activeAccountId}
          selectedTelegramChatId={selectedTelegramChatId}
          selectedTelegramChatTitle={activeTelegramChat?.title ?? ""}
          telegramChats={telegramChats}
          telegramMessages={telegramMessages}
          onSetSearchQuery={setSearchQuery}
          onSelectTelegramChat={setSelectedTelegramChatId}
          onDraftGenerated={(draft) => {
            setMessageDraft(draft);
            setApprovalNotice("EPIC💀CLAW AI вывел результат в composer выбранного чата. Проверьте текст и отправьте вручную.");
          }}
        />
    </main>
  );
}

type OpAction = { tool: string; chatId: string; chatTitle: string; text: string; accountId?: string; auditId?: string; actionType?: string; approvalId?: string; token?: string; stage?: string };
type OpAttachment = { name: string; type: string; previewUrl?: string };
type OpMsg = { role: "user" | "op"; text: string; tool?: string; files?: string[]; attachments?: OpAttachment[]; pending?: OpAction | null };
type BackendToolDetection = { tool: string; message: string; visualTarget: VisualTarget };
const OPERATOR_STORAGE_VERSION = "v4";
const operatorMessagesKey = (projectId: string) => `epicstar_op_msgs_${OPERATOR_STORAGE_VERSION}_${projectId}`;
type OperatorWindowState = "CLOSED" | "BUTTON" | "COMPACT" | "DOCKED" | "FLOATING" | "MAXIMIZED";
type OperatorGeometry = { x: number; y: number; width: number; height: number; previous?: { x: number; y: number; width: number; height: number } | null };
type OperatorRunStatus = "ready" | "running" | "approval" | "error" | "complete" | "paused" | "cancelled";

const OPERATOR_WINDOW_STORAGE_VERSION = "v2";
const operatorWindowStorageKey = (accountId: string) =>
  `epicgram.operator.window.${OPERATOR_WINDOW_STORAGE_VERSION}.${accountId || "default"}`;
const OPERATOR_MIN_WIDTH = 340;
const OPERATOR_MIN_HEIGHT = 420;
const OPERATOR_MAX_WIDTH = 920;
const OPERATOR_MAX_HEIGHT = 860;
const OPERATOR_EDGE = 12;

function defaultOperatorGeometry(): OperatorGeometry {
  if (typeof window === "undefined") return { x: 96, y: 72, width: 420, height: 680, previous: null };
  return {
    x: Math.max(OPERATOR_EDGE, window.innerWidth - 460),
    y: 76,
    width: Math.min(420, Math.max(OPERATOR_MIN_WIDTH, window.innerWidth - OPERATOR_EDGE * 2)),
    height: Math.min(680, Math.max(OPERATOR_MIN_HEIGHT, window.innerHeight - 110)),
    previous: null,
  };
}

function clampOperatorGeometry(geometry: OperatorGeometry): OperatorGeometry {
  if (typeof window === "undefined") return geometry;
  const maxWidth = Math.min(OPERATOR_MAX_WIDTH, Math.max(OPERATOR_MIN_WIDTH, window.innerWidth - OPERATOR_EDGE * 2));
  const maxHeight = Math.min(OPERATOR_MAX_HEIGHT, Math.max(OPERATOR_MIN_HEIGHT, window.innerHeight - OPERATOR_EDGE * 2));
  const width = Math.min(Math.max(geometry.width, OPERATOR_MIN_WIDTH), maxWidth);
  const height = Math.min(Math.max(geometry.height, OPERATOR_MIN_HEIGHT), maxHeight);
  return {
    ...geometry,
    width,
    height,
    x: Math.min(Math.max(geometry.x, OPERATOR_EDGE), Math.max(OPERATOR_EDGE, window.innerWidth - width - OPERATOR_EDGE)),
    y: Math.min(Math.max(geometry.y, OPERATOR_EDGE), Math.max(OPERATOR_EDGE, window.innerHeight - height - OPERATOR_EDGE)),
  };
}

function makeVisualStep(input: {
  tool: string;
  uiAction: AgentVisualStep["uiAction"];
  visualTarget: VisualTarget;
  message: string;
  expectedResult: string;
}): AgentVisualStep {
  return {
    stepId: `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    tool: input.tool,
    status: "RUNNING",
    uiAction: input.uiAction,
    visualTarget: input.visualTarget,
    message: input.message,
    expectedResult: input.expectedResult,
    actualResult: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

function OperatorDock({
  activeAccountId,
  selectedTelegramChatId,
  selectedTelegramChatTitle,
  telegramChats,
  telegramMessages,
  onSetSearchQuery,
  onSelectTelegramChat,
  onDraftGenerated,
}: {
  activeAccountId: string;
  selectedTelegramChatId: string;
  selectedTelegramChatTitle: string;
  telegramChats: TelegramChat[];
  telegramMessages: any[];
  onSetSearchQuery: (query: string) => void;
  onSelectTelegramChat: (chatId: string) => void;
  onDraftGenerated: (draft: string) => void;
}) {
  const [windowState, setWindowState] = useState<OperatorWindowState>("FLOATING");
  const [geometry, setGeometry] = useState<OperatorGeometry>({ x: 96, y: 72, width: 420, height: 680, previous: null });
  const [loadedWindowStorageKey, setLoadedWindowStorageKey] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<OperatorRunStatus>("ready");
  const [activeStep, setActiveStep] = useState<AgentVisualStep | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visualSkipped, setVisualSkipped] = useState(false);
  const [stepLogOpen, setStepLogOpen] = useState(false);
  const [stepLog, setStepLog] = useState<AgentVisualStep[]>([]);
  const [msgs, setMsgs] = useState<OpMsg[]>([
    { role: "op", text: "EPIC💀CLAW на связи. Работаю с клиентом, выбранным Telegram-чатом, n8n и локальным AI. Пиши задачу обычным текстом или запускай несколько команд списком." }
  ]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([{ id: "p_main", name: "Основной" }]);
  const [activeId, setActiveId] = useState("p_main");
  // Guards double-submit on the approval card (holds the confirming message index).
  const [confirming, setConfirming] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const operatorRootRef = useRef<HTMLDivElement | null>(null);
  const filePreviewsRef = useRef<Record<string, string>>({});
  const dragRef = useRef<{ x: number; y: number; gx: number; gy: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const toolsPanelRef = useRef<HTMLDivElement | null>(null);
  const windowStorageKey = operatorWindowStorageKey(activeAccountId);
  const visibleWindow = windowState !== "CLOSED" && windowState !== "BUTTON";
  const selectedChat = useMemo(
    () => telegramChats.find((chat) => chat.id === selectedTelegramChatId) ?? null,
    [telegramChats, selectedTelegramChatId],
  );
  const selectedChatActionType = selectedChat?.isChannel || selectedChat?.category === "channel" ? "publish_channel" : "send_text";
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [msgs, visibleWindow]);

  useEffect(() => {
    filePreviewsRef.current = filePreviews;
  }, [filePreviews]);

  useEffect(() => () => {
    Object.values(filePreviewsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    setLoadedWindowStorageKey(null);
    try {
      const raw = localStorage.getItem(windowStorageKey);
      if (!raw) {
        setWindowState("FLOATING");
        setGeometry(defaultOperatorGeometry());
        setLoadedWindowStorageKey(windowStorageKey);
        return;
      }
      const saved = JSON.parse(raw) as { state?: OperatorWindowState; geometry?: OperatorGeometry; visualSkipped?: boolean };
      if (saved.state) setWindowState(saved.state);
      if (saved.geometry) setGeometry(clampOperatorGeometry(saved.geometry));
      if (typeof saved.visualSkipped === "boolean") setVisualSkipped(saved.visualSkipped);
    } catch {
      setWindowState("FLOATING");
      setGeometry(defaultOperatorGeometry());
    }
    setLoadedWindowStorageKey(windowStorageKey);
  }, [windowStorageKey]);

  useEffect(() => {
    if (loadedWindowStorageKey !== windowStorageKey) return;
    try {
      localStorage.setItem(windowStorageKey, JSON.stringify({ state: windowState, geometry, visualSkipped }));
    } catch {}
  }, [windowState, geometry, visualSkipped, windowStorageKey, loadedWindowStorageKey]);

  useEffect(() => {
    function onViewportResize() {
      setGeometry((current) => clampOperatorGeometry(current));
    }
    window.addEventListener("resize", onViewportResize);
    return () => window.removeEventListener("resize", onViewportResize);
  }, []);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (dragRef.current && windowState === "FLOATING") {
        const next = clampOperatorGeometry({
          ...geometry,
          x: dragRef.current.gx + event.clientX - dragRef.current.x,
          y: dragRef.current.gy + event.clientY - dragRef.current.y,
        });
        setGeometry(next);
      }
      if (resizeRef.current && windowState === "FLOATING") {
        const next = clampOperatorGeometry({
          ...geometry,
          width: resizeRef.current.width + event.clientX - resizeRef.current.x,
          height: resizeRef.current.height + event.clientY - resizeRef.current.y,
        });
        setGeometry(next);
      }
    }
    function onUp() {
      dragRef.current = null;
      resizeRef.current = null;
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [geometry, windowState]);

  function setOperatorState(next: OperatorWindowState) {
    setWindowState(next);
    if (next === "BUTTON" || next === "CLOSED") setRunStatus((status) => (status === "running" ? "running" : status));
  }

  function beginStep(input: Parameters<typeof makeVisualStep>[0]) {
    const definition = UI_ACTION_REGISTRY[input.uiAction];
    const step = makeVisualStep({
      ...input,
      expectedResult: input.expectedResult || definition.successCondition,
    });
    setStepCount((count) => count + 1);
    setActiveStep(step);
    setStepLog((log) => [...log, step]);
    setRunStatus("running");
    return step;
  }

  function completeStep(stepId: string, actualResult: string, status: AgentStepStatus = "COMPLETED") {
    const completedAt = new Date().toISOString();
    setActiveStep((step) => (step?.stepId === stepId ? { ...step, status, actualResult, completedAt } : step));
    setStepLog((log) => log.map((step) => (step.stepId === stepId ? { ...step, status, actualResult, completedAt } : step)));
    window.setTimeout(() => {
      setActiveStep((step) => (step?.stepId === stepId ? null : step));
    }, 900);
  }

  function runUiStep(input: {
    tool: string;
    uiAction: UiActionName;
    visualTarget: VisualTarget;
    message: string;
    expectedResult?: string;
    action: () => string | void;
  }) {
    const definition = UI_ACTION_REGISTRY[input.uiAction];
    const step = beginStep({
      tool: input.tool,
      uiAction: input.uiAction,
      visualTarget: input.visualTarget,
      message: input.message,
      expectedResult: input.expectedResult || definition.successCondition,
    });
    try {
      const result = input.action() || definition.successCondition;
      completeStep(step.stepId, result, "COMPLETED");
      setRunStatus("complete");
      setMsgs((p) => [...p, { role: "op", text: `Готово: ${result}` }]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      completeStep(step.stepId, reason || definition.failureCondition, "FAILED");
      setRunStatus("error");
      setMsgs((p) => [...p, { role: "op", text: `⚠ Не смог выполнить UI-действие: ${reason || definition.failureCondition}` }]);
    }
  }

  function focusDomTarget(target: VisualTarget) {
    const selector = `[data-ui-target="${CSS.escape(target)}"]`;
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`цель ${target} не найдена`);
    node.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    const focusable = node.matches("input, textarea, button, a")
      ? node
      : node.querySelector<HTMLElement>("input, textarea, button, a");
    focusable?.focus();
  }

  function extractAfter(command: string, markers: RegExp[]) {
    for (const marker of markers) {
      const match = command.match(marker);
      const value = match?.[1]?.trim();
      if (value) return value;
    }
    return "";
  }

  function executeLocalUiCommand(raw: string): boolean {
    const command = raw.trim();
    const s = command.toLowerCase();
    if (!command) return false;

    if (/открой|перейди|покажи|сфокус|найди|поиск|вставь|черновик|разверни|сверни|закрепи|чат/.test(s) === false) {
      return false;
    }

    if (/настройк|settings/.test(s)) {
      runUiStep({
        tool: "client.navigate",
        uiAction: "ui.open_settings",
        visualTarget: "settings-button",
        message: "Открываю настройки клиента",
        action: () => {
          window.location.assign("/settings");
          return "открываю /settings";
        },
      });
      return true;
    }

    if (/(?:открой|перейди|покажи).*(?:лог|audit|журнал)|(?:лог|журнал).*(?:открой|перейди|покажи)/.test(s)) {
      runUiStep({
        tool: "client.navigate",
        uiAction: "ui.open_audit_log",
        visualTarget: "operator-window",
        message: "Открываю журнал клиента",
        action: () => {
          window.location.assign("/logs");
          return "открываю /logs";
        },
      });
      return true;
    }

    if (/разверни|полный экран|maximiz|fullscreen/.test(s)) {
      runUiStep({
        tool: "client.operator_window",
        uiAction: "ui.maximize_operator",
        visualTarget: "operator-window",
        message: "Разворачиваю окно оператора",
        action: () => {
          if (windowState !== "MAXIMIZED") toggleMaximize();
          return "окно оператора развёрнуто";
        },
      });
      return true;
    }

    if (/сверни|минимиз|minimiz/.test(s)) {
      runUiStep({
        tool: "client.operator_window",
        uiAction: "ui.minimize_operator",
        visualTarget: "operator-window",
        message: "Сворачиваю окно оператора",
        action: () => {
          setOperatorState("BUTTON");
          return "окно оператора свернуто в кнопку";
        },
      });
      return true;
    }

    if (/закрепи|справа|dock/.test(s)) {
      runUiStep({
        tool: "client.operator_window",
        uiAction: "ui.open_operator",
        visualTarget: "operator-window",
        message: "Закрепляю окно оператора справа",
        action: () => {
          setOperatorState("DOCKED");
          return "окно оператора закреплено справа";
        },
      });
      return true;
    }

    if (/поиск|найди|search|сфокус.*чат/.test(s)) {
      const query = extractAfter(command, [/поиск(?:ай)?\s+(.+)$/i, /найди\s+(.+)$/i, /search\s+(.+)$/i]);
      runUiStep({
        tool: "client.focus_search",
        uiAction: "ui.focus_chat_search",
        visualTarget: "chat-search",
        message: query ? `Фокусирую поиск: ${query}` : "Фокусирую поиск чатов",
        action: () => {
          if (query) onSetSearchQuery(query);
          focusDomTarget("chat-search");
          return query ? `поиск чатов сфокусирован; запрос: ${query}` : "поиск чатов сфокусирован";
        },
      });
      return true;
    }

    if (/composer|поле ввода|поле ответа|фокус.*ответ|сообщени/.test(s) && /сфокус|открой|перейди|поле/.test(s)) {
      runUiStep({
        tool: "client.focus_composer",
        uiAction: "ui.focus_composer",
        visualTarget: "composer",
        message: "Фокусирую composer выбранного чата",
        action: () => {
          focusDomTarget("composer");
          return "composer выбранного чата сфокусирован";
        },
      });
      return true;
    }

    if (/вставь|черновик|draft/.test(s)) {
      const draft = extractAfter(command, [/вставь(?:\s+черновик)?[:\s]+([\s\S]+)$/i, /черновик[:\s]+([\s\S]+)$/i, /draft[:\s]+([\s\S]+)$/i]);
      if (draft) {
        runUiStep({
          tool: "client.insert_draft",
          uiAction: "ui.insert_draft",
          visualTarget: "composer",
          message: "Вставляю черновик в composer",
          action: () => {
            onDraftGenerated(draft);
            window.setTimeout(() => focusDomTarget("composer"), 80);
            return "черновик вставлен в composer";
          },
        });
        return true;
      }
    }

    const chatName = extractAfter(command, [/открой\s+чат\s+(.+)$/i, /перейди\s+в\s+чат\s+(.+)$/i, /чат\s+(.+)$/i]);
    if (chatName) {
      const needle = chatName.toLowerCase();
      const chat = telegramChats.find((item) => item.title.toLowerCase().includes(needle) || item.id === chatName);
      runUiStep({
        tool: "client.open_chat",
        uiAction: "ui.open_chat",
        visualTarget: chat ? `chat-row:${chat.id}` : "chat-list",
        message: `Открываю чат: ${chatName}`,
        action: () => {
          if (!chat) throw new Error(`чат "${chatName}" не найден в текущем списке`);
          onSelectTelegramChat(chat.id);
          return `чат открыт: ${chat.title}`;
        },
      });
      return true;
    }

    return false;
  }

  function detectBackendToolSegment(raw: string): BackendToolDetection | null {
    const s = raw.trim().toLowerCase();
    if (!s) return null;
    if (/аудит|проверь.*epic.?gram|read[\s-]?only.*(?:проверк|audit)|проверь.*(?:ui|api).*(?:telegram|tdlib|n8n|openclaw)|с чего (?:нач|старт)|что (?:делаем|дальше)|начн[её]м работу|первый шаг/.test(s)) {
      return { tool: "system_audit", message: "Провожу READ-ONLY аудит EPICGRAM", visualTarget: "operator-window" };
    }
    if (/проверь.*состояни.*клиент|состояни.*клиент|state|inspect|диагност.*клиент|что открыто/.test(s)) {
      return { tool: "inspect_state", message: "Читаю состояние клиента", visualTarget: "operator-window" };
    }
    if (/n8n|воркфлоу|workflow|workflows/.test(s)) {
      if (/draft|черновик|ответ|approval|апрув|карточ/i.test(s)) {
        return { tool: "n8n_draft_approval", message: "Готовлю черновик через n8n", visualTarget: "approval-card" };
      }
      return { tool: /воркфлоу|workflow|workflows/.test(s) ? "n8n_workflows" : "n8n_status", message: "Проверяю n8n", visualTarget: "operator-window" };
    }
    if (/openclaw|open claw|claw|qclaw/.test(s)) {
      return { tool: "openclaw_status", message: "Проверяю OpenClaw runtime", visualTarget: "operator-window" };
    }
    if (/прочитай.*чат|покажи.*сообщ|послед.*сообщ|read.*chat|last.*message/.test(s)) {
      return { tool: "read_chat", message: "Читаю выбранный Telegram-чат", visualTarget: "message-list" };
    }
    if (/суммар|резюм|summary|summar|проанализ.*чат|анализ.*чат/.test(s)) {
      return { tool: "summarize_chat", message: "Суммаризирую выбранный Telegram-чат", visualTarget: "message-list" };
    }
    if (/approval|апрув|подтвержден|подтверждён|карточк.*подтверж|создай.*карточ/.test(s)) {
      return { tool: "create_approval", message: "Готовлю approval-карточку", visualTarget: "approval-card" };
    }
    if (/черновик|draft|подготов.*ответ|предлож.*ответ|ответь/.test(s)) {
      return { tool: "prepare_draft", message: "Готовлю черновик ответа", visualTarget: "composer" };
    }
    return null;
  }

  function detectBackendTools(raw: string): BackendToolDetection[] {
    const segments = raw
      .split(/\r?\n|;|[.!?]+\s+|\s+(?:затем|потом|после этого)\s+|\s+и\s+(?=(?:проверь|прочитай|покажи|суммар|проанализ|подготов|создай|сделай|открой))/i)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const candidates = segments.length > 1 ? segments : [raw];
    const seen = new Set<string>();
    const detected: BackendToolDetection[] = [];

    for (const candidate of candidates) {
      const item = detectBackendToolSegment(candidate);
      if (!item || seen.has(item.tool)) continue;
      seen.add(item.tool);
      detected.push(item);
    }

    if (detected.length === 0) {
      const item = detectBackendToolSegment(raw);
      if (item) detected.push(item);
    }
    return detected;
  }

  function formatToolResult(tool: string, result: any) {
    const r = result?.result ?? result;
    if (tool === "system_audit") {
      const rows = Array.isArray(r?.rows) ? r.rows : [];
      return [
        "READ-ONLY аудит EPICGRAM",
        "Компонент | Статус | Результат | Решение",
        "--- | --- | --- | ---",
        ...rows.map((row: any) => [row.component, row.status, row.detail, row.solution]
          .map((value) => String(value ?? "-").replace(/\|/g, "/").replace(/\s+/g, " ").trim())
          .join(" | ")),
      ].join("\n");
    }
    if (tool === "inspect_state") {
      return [
        "Состояние клиента:",
        `section: ${r?.clientState?.section ?? "client"}`,
        `selectedChat: ${r?.clientState?.selectedTelegramChatTitle || r?.clientState?.selectedTelegramChatId || "не выбран"}`,
        `visibleChats: ${r?.clientState?.visibleChatsCount ?? 0}`,
        `telegramBinding: ${r?.telegramBinding?.bound ? "bound" : "not bound"}`,
      ].join("\n");
    }
    if (tool === "n8n_status") {
      return `n8n: ${r?.online ? "online" : "offline"}${r?.workflows != null ? ` · workflows: ${r.workflows}` : ""}${r?.executions != null ? ` · executions: ${r.executions}` : ""}`;
    }
    if (tool === "n8n_workflows") {
      const workflows = Array.isArray(r?.workflows) ? r.workflows.slice(0, 8) : [];
      return workflows.length
        ? `n8n workflows (${r?.counts?.total ?? workflows.length}):\n` + workflows.map((w: any) => `• ${w.name} · ${w.active ? "active" : "off"} · nodes ${w.nodesCount ?? "?"}`).join("\n")
        : `n8n workflows: ${r?.reason || "список пуст"}`;
    }
    if (tool === "openclaw_status") {
      return `OpenClaw/operator status:\n${JSON.stringify(r, null, 2).slice(0, 1600)}`;
    }
    return String(r?.text || result?.text || result?.error || "Готово.");
  }

  async function executeBackendTool(raw: string, detected: { tool: string; message: string; visualTarget: VisualTarget }) {
    const step = beginStep({
      tool: `operator.${detected.tool}`,
      uiAction: detected.tool === "create_approval" ? "ui.show_approval" : detected.tool === "prepare_draft" ? "ui.insert_draft" : "ui.show_task_progress",
      visualTarget: detected.visualTarget,
      message: detected.message,
      expectedResult: "Backend tool вернёт read-only результат или approval-карточку",
    });
    setBusy(true);
    try {
      const response = await fetch("/api/operator-tools", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: detected.tool,
          instruction: raw,
          chatId: selectedTelegramChatId || activeId,
          chatTitle: selectedTelegramChatTitle || selectedTelegramChatId || "Telegram chat",
          clientState: {
            section: "client",
            activeAccountId,
            selectedTelegramChatId,
            selectedTelegramChatTitle,
            visibleChatsCount: telegramChats.length,
            operatorWindow: { state: windowState, runStatus, visualSkipped },
          },
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        const reason = String(data?.text || data?.error || `HTTP ${response.status}`);
        completeStep(step.stepId, reason, "FAILED");
        setRunStatus("error");
        setMsgs((p) => [...p, { role: "op", text: `⚠ ${reason}` }]);
        return;
      }

      const resultText = formatToolResult(detected.tool, data);
      if (data.pendingAction?.text) {
        setMsgs((p) => [...p, {
          role: "op",
          text: resultText,
          tool: `operator.${detected.tool}`,
          pending: {
            tool: "tg_send",
            accountId: activeAccountId,
            chatId: data.pendingAction.chatId || selectedTelegramChatId,
            chatTitle: data.pendingAction.chatTitle || selectedTelegramChatTitle || "Telegram chat",
            text: String(data.pendingAction.text || ""),
            auditId: data.pendingAction.auditId || undefined,
            actionType: data.pendingAction.actionType || "telegram_send",
          },
        }]);
        completeStep(step.stepId, "Approval card создана", "COMPLETED");
        setRunStatus("approval");
        return;
      }

      setMsgs((p) => [...p, { role: "op", text: resultText, tool: `operator.${detected.tool}` }]);
      if (detected.tool === "prepare_draft" && selectedTelegramChatId) onDraftGenerated(resultText);
      completeStep(step.stepId, "Tool result получен", "COMPLETED");
      setRunStatus("complete");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      completeStep(step.stepId, reason, "FAILED");
      setRunStatus("error");
      setMsgs((p) => [...p, { role: "op", text: `⚠ Backend tool недоступен: ${reason}` }]);
    } finally {
      setBusy(false);
    }
  }

  async function runToolButton(tool: string, label: string) {
    const detected: { tool: string; message: string; visualTarget: VisualTarget } = {
      tool,
      message:
        tool === "system_audit" ? "Провожу READ-ONLY аудит EPICGRAM"
          : tool === "inspect_state" ? "Читаю состояние клиента"
          : tool === "n8n_workflows" ? "Проверяю n8n workflows"
          : tool === "n8n_draft_approval" ? "Готовлю черновик через n8n"
          : tool === "openclaw_status" ? "Проверяю OpenClaw runtime"
          : tool === "read_chat" ? "Читаю выбранный Telegram-чат"
          : tool === "summarize_chat" ? "Суммаризирую выбранный Telegram-чат"
          : tool === "create_approval" ? "Готовлю approval-карточку"
          : "Готовлю черновик ответа",
      visualTarget:
        tool === "read_chat" || tool === "summarize_chat" ? "message-list"
          : tool === "prepare_draft" ? "composer"
          : tool === "create_approval" || tool === "n8n_draft_approval" ? "approval-card"
          : "operator-window",
    };
    await executeBackendTool(label, detected);
  }

  async function allowlistSelectedChat() {
    const step = beginStep({
      tool: "telegram.allowlist_chat",
      uiAction: "ui.show_task_progress",
      visualTarget: "operator-window",
      message: "Добавляю выбранный чат в allowlist",
      expectedResult: "Approval gate разрешит подготовку отправки в этот чат",
    });
    if (!selectedTelegramChatId) {
      completeStep(step.stepId, "Чат не выбран", "FAILED");
      setRunStatus("error");
      setMsgs((p) => [...p, { role: "op", text: "⚠ Сначала выбери Telegram-чат слева." }]);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/telegram/binding/send/allowlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: selectedTelegramChatId,
          actionType: selectedChatActionType,
          label: selectedTelegramChatTitle || selectedTelegramChatId,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        const reason = humanReason(data?.reason || `HTTP ${response.status}`);
        completeStep(step.stepId, reason, "FAILED");
        setRunStatus("error");
        setMsgs((p) => [...p, { role: "op", text: `⚠ Allowlist не добавлен: ${reason}` }]);
        return;
      }
      const title = data.chatTitle || selectedTelegramChatTitle || selectedTelegramChatId;
      completeStep(step.stepId, `allowlist ok: ${title}`, "COMPLETED");
      setRunStatus("complete");
      setMsgs((p) => [...p, { role: "op", text: `✅ Чат добавлен в allowlist для ${selectedChatActionType}: ${title}` }]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      completeStep(step.stepId, reason, "FAILED");
      setRunStatus("error");
      setMsgs((p) => [...p, { role: "op", text: `⚠ Allowlist endpoint недоступен: ${reason}` }]);
    } finally {
      setBusy(false);
    }
  }

  function startDrag(event: React.PointerEvent) {
    if (windowState !== "FLOATING") return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, a")) return;
    dragRef.current = { x: event.clientX, y: event.clientY, gx: geometry.x, gy: geometry.y };
    document.body.style.userSelect = "none";
  }

  function startResize(event: React.PointerEvent) {
    if (windowState !== "FLOATING") return;
    resizeRef.current = { x: event.clientX, y: event.clientY, width: geometry.width, height: geometry.height };
    document.body.style.userSelect = "none";
    event.preventDefault();
    event.stopPropagation();
  }

  function toggleMaximize() {
    if (windowState === "MAXIMIZED") {
      setGeometry((current) => clampOperatorGeometry(current.previous ? { ...current.previous, previous: null } : defaultOperatorGeometry()));
      setWindowState("FLOATING");
      return;
    }
    setGeometry((current) => {
      const safe = clampOperatorGeometry(current);
      return {
        x: OPERATOR_EDGE,
        y: OPERATOR_EDGE,
        width: Math.max(OPERATOR_MIN_WIDTH, window.innerWidth - OPERATOR_EDGE * 2),
        height: Math.max(OPERATOR_MIN_HEIGHT, window.innerHeight - OPERATOR_EDGE * 2),
        previous: { x: safe.x, y: safe.y, width: safe.width, height: safe.height },
      };
    });
    setWindowState("MAXIMIZED");
  }

  function revealToolsPanel() {
    if (windowState === "BUTTON" || windowState === "CLOSED" || windowState === "COMPACT") {
      setOperatorState("DOCKED");
    }
    window.setTimeout(() => toolsPanelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 80);
  }

  const GREET: OpMsg[] = [{ role: "op", text: "EPIC💀CLAW на связи. Работаю с клиентом, выбранным Telegram-чатом, n8n и локальным AI. Пиши задачу обычным текстом или запускай несколько команд списком." }];
  useEffect(() => {
    try {
      const rp = localStorage.getItem("epicstar_op_projects");
      if (rp) { const p = JSON.parse(rp); if (Array.isArray(p) && p.length) setProjects(p); }
      const ra = localStorage.getItem("epicstar_op_active");
      if (ra) setActiveId(ra);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("epicstar_op_active", activeId);
      const rm = localStorage.getItem(operatorMessagesKey(activeId));
      setMsgs(rm ? JSON.parse(rm) : GREET);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  useEffect(() => {
    try { localStorage.setItem(operatorMessagesKey(activeId), JSON.stringify(msgs)); } catch {}
  }, [msgs, activeId]);
  useEffect(() => {
    try { localStorage.setItem("epicstar_op_projects", JSON.stringify(projects)); } catch {}
  }, [projects]);

  function newProject() {
    const id = "p_" + Date.now().toString(36);
    setProjects((p) => [...p, { id, name: "Проект " + (p.length + 1) }]);
    setActiveId(id);
  }

  const fileKey = useCallback((file: File) => {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }, []);

  const addOperatorFiles = useCallback((nextFiles: File[]) => {
    if (nextFiles.length === 0) return;
    setFiles((current) => {
      const duplicateKey = (file: File) => `${file.name}:${file.size}:${file.type}`;
      const existing = new Set(current.map(duplicateKey));
      const unique = nextFiles.filter((file) => {
        const key = duplicateKey(file);
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });
      const merged = [...current, ...unique].slice(0, 8);
      return merged;
    });
    setFilePreviews((current) => {
      const next = { ...current };
      for (const file of nextFiles) {
        if (file.type.startsWith("image/")) {
          const key = fileKey(file);
          if (!next[key]) next[key] = URL.createObjectURL(file);
        }
      }
      return next;
    });
  }, [fileKey]);

  function removeOperatorFile(index: number) {
    setFiles((current) => {
      const file = current[index];
      if (file) {
        const key = fileKey(file);
        const preview = filePreviews[key];
        if (preview) URL.revokeObjectURL(preview);
        setFilePreviews((previews) => {
          const next = { ...previews };
          delete next[key];
          return next;
        });
      }
      return current.filter((_, i) => i !== index);
    });
  }

  function onPaste(event: React.ClipboardEvent) {
    const pastedFiles = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (pastedFiles.length === 0) return;
    event.preventDefault();
    addOperatorFiles(pastedFiles);
    setText((value) => value || "Проанализируй вложенный скриншот и выдай результат прямо в окне оператора.");
  }

  async function readImageAttachmentsForAi(sourceFiles: File[]) {
    const images = sourceFiles.filter((file) => file.type.startsWith("image/")).slice(0, 3);
    const maxBytes = 2_500_000;
    const readOne = (file: File) => new Promise<{ name: string; type: string; size: number; dataUrl: string } | null>((resolve) => {
      if (file.size > maxBytes) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        type: file.type || "image/png",
        size: file.size,
        dataUrl: typeof reader.result === "string" ? reader.result : "",
      });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    const result = await Promise.all(images.map(readOne));
    return result.filter((item): item is { name: string; type: string; size: number; dataUrl: string } => Boolean(item?.dataUrl));
  }

  useEffect(() => {
    function onWindowPaste(event: ClipboardEvent) {
      if (!visibleWindow) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (!operatorRootRef.current?.contains(target)) return;
      const pastedFiles = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));
      if (pastedFiles.length === 0) return;
      event.preventDefault();
      addOperatorFiles(pastedFiles);
    }
    window.addEventListener("paste", onWindowPaste);
    return () => window.removeEventListener("paste", onWindowPaste);
  }, [addOperatorFiles, visibleWindow]);

  async function send() {
    const t = text.trim();
    if (!t && files.length === 0) return;
    const fnames = files.map((f) => f.name);
    const attachments = files.map((f) => ({ name: f.name, type: f.type || "application/octet-stream", previewUrl: filePreviews[fileKey(f)] }));
    const aiAttachments = await readImageAttachmentsForAi(files);
    const mine: OpMsg = { role: "user", text: t, files: fnames, attachments };
    const next = [...msgs, mine];
    const operatorHistory = next.slice(-16).map((m) => ({
      content: (m.files && m.files.length ? "[вложения: " + m.files.join(", ") + "] " : "") + m.text,
      role: m.role,
      isOutgoing: m.role === "op"
    }));
    setMsgs(next);
    setText("");
    setFiles([]);

    if (files.length === 0 && executeLocalUiCommand(t)) {
      return;
    }

    const backendTools = files.length === 0 ? detectBackendTools(t) : [];
    if (backendTools.length > 0) {
      for (const backendTool of backendTools) {
        await executeBackendTool(t, backendTool);
      }
      return;
    }

    setBusy(true);
    const commandStep = beginStep({
      tool: "operator.command",
      uiAction: "ui.show_task_progress",
      visualTarget: "operator-window",
      message: "Запускаю AgentRun",
      expectedResult: "Команда попадёт в EPIC💀CLAW AI Operator",
    });
    try {
      const r = await fetch("/api/operator/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: t,
          command: t,
          conversationId: selectedTelegramChatId || activeId,
          chatId: selectedTelegramChatId || activeId,
          accountId: activeAccountId,
          chatTitle: selectedTelegramChatTitle || selectedTelegramChatId || "Telegram chat",
          attachments: aiAttachments,
          operatorHistory,
          history: telegramMessages.slice(-20).map((m: any) => ({
            content: String(m?.content ?? m?.text ?? m?.message ?? ""),
            isOutgoing: Boolean(m?.isOutgoing ?? m?.outgoing ?? m?.is_outgoing),
          })).filter((m: any) => m.content.trim().length > 0),
          tgContext: {
            accountId: activeAccountId,
            chatId: selectedTelegramChatId || activeId,
            chatTitle: selectedTelegramChatTitle || selectedTelegramChatId || "Telegram chat",
            attachments: aiAttachments,
            messages: telegramMessages.slice(-20).map((m: any) => ({
              content: String(m?.content ?? m?.text ?? m?.message ?? ""),
              isOutgoing: Boolean(m?.isOutgoing ?? m?.outgoing ?? m?.is_outgoing),
            })).filter((m: any) => m.content.trim().length > 0),
          },
        })
      });
      const d = await r.json().catch(() => null);
      const executedTool = String(d?.tool || "").trim();
      completeStep(
        commandStep.stepId,
        r.ok ? (executedTool ? `Выполнен ${executedTool}` : "Команда обработана backend") : "Backend вернул ошибку",
        r.ok ? "COMPLETED" : "FAILED",
      );
      // The approval card appears ONLY when the backend proposes a REAL external
      // action (pendingAction). Drafts, analysis, summaries, read-only results and
      // plain answers render as a normal reply with no controls.
      if (d && d.ok && d.pendingAction && String(d.pendingAction.text || "").trim()) {
        const pa = d.pendingAction;
        const approvalStep = beginStep({
          tool: "telegram.prepare_reply",
          uiAction: "ui.show_approval",
          visualTarget: "approval-card",
          message: "Показываю карточку подтверждения",
          expectedResult: "Оператор увидит preview и кнопки подтверждения",
        });
        setMsgs((p) => [
          ...p,
          {
            role: "op",
            text: String(d.text || pa.text || "").trim() || "Готово.",
            tool: executedTool || undefined,
            pending: {
              tool: "tg_send",
              accountId: activeAccountId,
              chatId: pa.chatId || selectedTelegramChatId || activeId,
              chatTitle: pa.chatTitle || selectedTelegramChatId || "Telegram chat",
              text: String(pa.text || "").trim(),
              auditId: pa.auditId || undefined,
              actionType: pa.actionType || "telegram_send",
            },
          },
        ]);
        setRunStatus("approval");
        window.setTimeout(() => completeStep(approvalStep.stepId, "Approval card показана", "COMPLETED"), 250);
      } else if (d && d.ok && (d.text || d.draft)) {
        const isOperatorReply = Boolean(d.operatorOnly);
        const responseStep = beginStep({
          tool: isOperatorReply ? "operator.reply" : "telegram.prepare_reply",
          uiAction: isOperatorReply ? "ui.show_operator_reply" : "ui.insert_draft",
          visualTarget: isOperatorReply ? "operator-window" : "composer",
          message: isOperatorReply ? "Показываю ответ оператора" : "Готовлю черновик ответа",
          expectedResult: isOperatorReply
            ? "Ответ появится в диалоге EPIC💀CLAW"
            : "Черновик появится в рабочем контексте оператора",
        });
        const resultText = String(d.text || d.draft || "").trim() || "Готово.";
        setMsgs((p) => [...p, { role: "op", text: resultText, tool: executedTool || undefined }]);
        if (selectedTelegramChatId && !isOperatorReply) onDraftGenerated(resultText);
        completeStep(
          responseStep.stepId,
          isOperatorReply ? "Ответ добавлен в диалог оператора" : "Черновик добавлен в историю оператора",
          "COMPLETED",
        );
        setRunStatus("complete");
      } else {
        const reply = (d && (d.text || d.error)) || "⚠ EPIC💀CLAW AI не ответил";
        setMsgs((p) => [...p, { role: "op", text: reply }]);
        setRunStatus(d?.ok ? "complete" : "error");
      }
    } catch {
      setMsgs((p) => [...p, { role: "op", text: "⚠ Нет связи с EPIC💀CLAW AI" }]);
      completeStep(commandStep.stepId, "Нет связи с backend", "FAILED");
      setRunStatus("error");
    } finally {
      setBusy(false);
    }
  }

  function finishCard(idx: number, text: string) {
    setMsgs((p) => p.map((m, i) => (i === idx ? { ...m, pending: null } : m)).concat([{ role: "op", text }]));
  }
  function humanReason(reason?: string): string {
    const r = String(reason || "").toLowerCase();
    if (!r) return "Действие не выполнено.";
    if (r.includes("мутаци") || r.includes("mutation") || r.includes("send_disabled")) return "Отправка выключена (безопасный режим).";
    if (r.includes("not_allowlisted")) return "Этот чат не в списке разрешённых для отправки.";
    if (r.includes("owner_mismatch") || r.includes("запрещ")) return "Доступ к этой сессии запрещён.";
    if (r.includes("payload_hash_mismatch")) return "Содержание изменилось — подтвердите заново.";
    if (r.includes("replay")) return "Действие уже выполнено.";
    if (r.includes("expired")) return "Срок подтверждения истёк. Повторите.";
    if (r.includes("no_binding")) return "Telegram не подключён.";
    if (r.includes("runtime_media_unsupported")) return "Отправка медиа пока не поддержана.";
    return reason || "Действие не выполнено.";
  }
  async function gateExecute(idx: number, approvalId: string, token: string, action: OpAction, at: string) {
    const step = beginStep({
      tool: "telegram.send_message",
      uiAction: "ui.show_approval",
      visualTarget: "approval-card",
      message: "Выполняю подтверждённую отправку",
      expectedResult: "Backend вернёт Telegram message ID или честную ошибку",
    });
    try {
      const r = await fetch("/api/telegram/binding/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ approvalId, token, chatId: action.chatId, actionType: at, text: action.text }) });
      const d = await r.json().catch(() => ({}));
      if (d?.sent) {
        completeStep(step.stepId, d.telegramMessageId ? `Telegram message id ${d.telegramMessageId}` : "Telegram подтвердил отправку", "COMPLETED");
        setRunStatus("complete");
        finishCard(idx, `✅ Отправлено${d.telegramMessageId ? ` (id ${d.telegramMessageId})` : ""}`);
      } else {
        completeStep(step.stepId, humanReason(d?.reason || d?.message), "FAILED");
        setRunStatus("error");
        finishCard(idx, `⚠ ${humanReason(d?.reason || d?.message)}`);
      }
    } catch {
      completeStep(step.stepId, "Нет связи с сервером", "FAILED");
      setRunStatus("error");
      finishCard(idx, "⚠ Нет связи с сервером.");
    }
  }
  // Real approval: reuse the per-user binding/send gate (user+account+action+payload
  // hash, single-use). The AI never sends — only an explicit operator confirm does.
  // Channel publishing requires a genuine second confirmation.
  async function confirmAction(idx: number, action: OpAction) {
    if (confirming !== null) return; // no double-submit
    setConfirming(idx);
    try {
      const at = action.actionType === "publish_post" ? "publish_channel" : "send_text";
      const text = String(action.text || "").trim();
      if (!text) { finishCard(idx, "⚠ Пустой текст для отправки"); return; }
      const post = (path: string, body: unknown) => fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => ({}));
      if (action.stage === "await2" && action.approvalId && action.token) {
        const c2 = await post("/api/telegram/binding/send/confirm", { approvalId: action.approvalId, token: action.token });
        if (!c2?.ok) { finishCard(idx, `⚠ ${humanReason(c2?.reason)}`); return; }
        await gateExecute(idx, action.approvalId, action.token, action, at);
        return;
      }
      const pr = await post("/api/telegram/binding/send/prepare", { chatId: action.chatId, actionType: at, text });
      if (!pr?.ok) { finishCard(idx, `⚠ ${humanReason(pr?.reason)}`); return; }
      const c = await post("/api/telegram/binding/send/confirm", { approvalId: pr.approvalId, token: pr.token });
      if (!c?.ok) { finishCard(idx, `⚠ ${humanReason(c?.reason)}`); return; }
      if (c.needsSecondConfirmation) {
        setMsgs((p) => p.map((m, i) => (i === idx ? { ...m, pending: { ...(m.pending as OpAction), approvalId: pr.approvalId, token: pr.token, stage: "await2" } } : m)));
        return;
      }
      await gateExecute(idx, pr.approvalId, pr.token, action, at);
    } finally {
      setConfirming(null);
    }
  }

  // P3.5b: operator dismissed/rejected a proposal. Fire an audit-only beacon.
  // NEVER sends a Telegram message; only clears the pending card + records reject.
  function rejectAction(idx: number, action: OpAction | null) {
    setMsgs((p) => p.map((m, i) => (i === idx ? { ...m, pending: null } : m)));
    setRunStatus("cancelled");
    const auditId = action?.auditId;
    if (!auditId) return;
    try {
      void fetch("/api/operator/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          auditId,
          reason: "operator_dismissed",
          chatId: action?.chatId || selectedTelegramChatId,
          chatTitle: action?.chatTitle,
        }),
      }).catch(() => {});
    } catch {}
  }

  function pauseRun() {
    setPaused(true);
    setRunStatus("paused");
    setActiveStep((step) => step ? { ...step, status: "PAUSED" } : step);
  }

  function resumeRun() {
    setPaused(false);
    setRunStatus(activeStep ? "running" : "ready");
    setActiveStep((step) => step ? { ...step, status: "RUNNING" } : step);
  }

  function cancelRun() {
    setPaused(false);
    setRunStatus("cancelled");
    setActiveStep((step) => step ? { ...step, status: "CANCELLED", actualResult: "Оператор отменил дальнейшие шаги", completedAt: new Date().toISOString() } : step);
    setMsgs((p) => [...p, { role: "op", text: "AgentRun отменён. Уже выполненные внешние действия не откатываются; новые шаги остановлены." }]);
  }

  const statusTone =
    runStatus === "running" ? "bg-blue-400 shadow-[0_0_16px_rgba(96,165,250,.75)] animate-pulse"
      : runStatus === "approval" ? "bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,.75)]"
      : runStatus === "error" ? "bg-red-500 shadow-[0_0_16px_rgba(239,68,68,.75)]"
      : runStatus === "complete" ? "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.75)]"
      : runStatus === "paused" ? "bg-yellow-300 shadow-[0_0_16px_rgba(250,204,21,.75)]"
      : "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.65)]";
  const buttonLabel = runStatus === "running" ? "выполняется" : runStatus === "approval" ? "ждёт подтверждения" : runStatus === "error" ? "ошибка" : runStatus === "complete" ? "готово" : runStatus === "paused" ? "пауза" : "готов";

  const windowStyle: React.CSSProperties =
    windowState === "MAXIMIZED"
      ? { left: OPERATOR_EDGE, top: OPERATOR_EDGE, width: `calc(100vw - ${OPERATOR_EDGE * 2}px)`, height: `calc(100vh - ${OPERATOR_EDGE * 2}px)` }
      : windowState === "DOCKED"
        ? { right: 16, top: 72, width: 390, height: "calc(100vh - 92px)" }
        : windowState === "COMPACT"
          ? { left: geometry.x, top: geometry.y, width: Math.min(geometry.width, 420), height: 132 }
          : { left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height };

  // Scheduling is now natural-language ("опубликуй завтра в 10:00"); the operator
  // asks for a time if it is missing. No per-message scheduler control.

  if (windowState === "BUTTON" || windowState === "CLOSED") {
    return (
      <>
        <VisualExecutionLayer step={activeStep} paused={paused} skipped={visualSkipped} />
        <button
          onClick={() => setOperatorState("FLOATING")}
          className="fixed bottom-5 right-5 z-[160] flex items-center gap-3 rounded-full border border-red-300/40 bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_28px_rgba(220,38,38,.55)] hover:bg-red-500"
          title={`EPIC💀CLAW AI · ${buttonLabel}`}
        >
          <span className={`h-3 w-3 rounded-full ${statusTone}`} />
          <Bot className="h-5 w-5" />
          EPIC💀CLAW AI
          {stepCount > 0 && <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs">{stepCount}</span>}
        </button>
      </>
    );
  }

  return (
    <>
    <VisualExecutionLayer step={activeStep} paused={paused} skipped={visualSkipped} />
    <div
      ref={operatorRootRef}
      data-ui-target="operator-window"
      className={`fixed z-[150] flex max-h-[calc(100vh-24px)] max-w-[calc(100vw-24px)] flex-col overflow-hidden border border-red-400/35 bg-tg-panel/98 shadow-[0_24px_90px_rgba(0,0,0,.6),0_0_42px_rgba(239,68,68,.18)] backdrop-blur ${windowState === "MAXIMIZED" ? "rounded-xl" : "rounded-2xl"}`}
      style={windowStyle}
    >
      <div
        onPointerDown={startDrag}
        className={`flex items-center justify-between border-b border-tg-line px-3 py-2 ${windowState === "FLOATING" ? "cursor-move touch-none" : "cursor-default"}`}
      >
        <div className="min-w-0 flex items-center gap-2 font-black uppercase tracking-wide text-white">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusTone}`} />
          <Bot className="h-5 w-5 shrink-0 text-red-500" />
          <span className="truncate">EPIC💀CLAW AI</span>
          <span className="hidden rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-white/70 sm:inline">{buttonLabel}</span>
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={revealToolsPanel}
            className="rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-black text-red-200 hover:bg-red-500/20"
            title="Показать Operator Tools"
          >
            TOOLS
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={paused ? resumeRun : pauseRun} className="grid h-8 w-8 place-items-center rounded-lg bg-tg-bg text-tg-muted hover:text-white" title={paused ? "Продолжить" : "Пауза"}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button onClick={() => setVisualSkipped((value) => !value)} className="grid h-8 w-8 place-items-center rounded-lg bg-tg-bg text-tg-muted hover:text-white" title="Пропустить визуализацию">
            <SkipForward className="h-4 w-4" />
          </button>
          <button onClick={() => setOperatorState(windowState === "DOCKED" ? "FLOATING" : "DOCKED")} className="grid h-8 w-8 place-items-center rounded-lg bg-tg-bg text-tg-muted hover:text-white" title={windowState === "DOCKED" ? "Открепить" : "Закрепить справа"}>
            {windowState === "DOCKED" ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
          <button onClick={() => setOperatorState(windowState === "COMPACT" ? "FLOATING" : "COMPACT")} className="grid h-8 w-8 place-items-center rounded-lg bg-tg-bg text-tg-muted hover:text-white" title="Компактный режим">
            <PanelRight className="h-4 w-4" />
          </button>
          <button onClick={toggleMaximize} className="grid h-8 w-8 place-items-center rounded-lg bg-tg-bg text-tg-muted hover:text-white" title="Полный экран / восстановить">
            <Moon className="h-4 w-4" />
          </button>
          <button onClick={() => setOperatorState("BUTTON")} className="grid h-8 w-8 place-items-center rounded-lg bg-tg-bg text-tg-muted hover:text-white" title="Свернуть в кнопку">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {windowState === "COMPACT" ? (
        <div className="grid flex-1 grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">AgentRun: {buttonLabel}</div>
            <div className="truncate text-xs text-tg-muted">{activeStep?.message ?? "Оператор готов. Сворачивание не останавливает задачу."}</div>
          </div>
          <button onClick={() => setOperatorState("FLOATING")} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Развернуть</button>
        </div>
      ) : (
      <>
      <div className="flex items-center gap-1 overflow-x-auto border-b border-tg-line px-2 py-2">
        {projects.map((pr) => (
          <button
            key={pr.id}
            onClick={() => setActiveId(pr.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${pr.id === activeId ? "bg-red-600 text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}
            title={pr.name}
          >
            {pr.name}
          </button>
        ))}
        <button onClick={newProject} className="shrink-0 rounded-full bg-tg-bg px-3 py-1 text-xs text-tg-muted hover:text-white" title="Новый проект">
          + Проект
        </button>
      </div>
      <div ref={toolsPanelRef} className="border-b border-tg-line bg-black/10 px-3 py-2">
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-300/80">
          <span>Operator Tools</span>
          <span className="truncate text-[9px] text-tg-muted">{selectedTelegramChatTitle || selectedTelegramChatId || "чат не выбран"}</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {[
            ["system_audit", "Audit"],
            ["inspect_state", "State"],
            ["read_chat", "Read"],
            ["summarize_chat", "Summary"],
            ["prepare_draft", "Draft"],
            ["create_approval", "Approval"],
            ["n8n_draft_approval", "n8n Draft"],
            ["n8n_workflows", "n8n"],
            ["openclaw_status", "OpenClaw"],
          ].map(([tool, label]) => (
            <button
              key={tool}
              onClick={() => runToolButton(tool, label)}
              disabled={busy || ((tool === "read_chat" || tool === "summarize_chat" || tool === "prepare_draft" || tool === "create_approval" || tool === "n8n_draft_approval") && !selectedTelegramChatId)}
              className="shrink-0 rounded-lg border border-white/10 bg-tg-bg px-2.5 py-1.5 text-[11px] font-semibold text-tg-muted hover:border-red-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              title={label}
            >
              {label}
            </button>
          ))}
          <button
            onClick={allowlistSelectedChat}
            disabled={busy || !selectedTelegramChatId}
            className="shrink-0 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            title="Разрешить выбранный чат для approval/send gate"
          >
            Allowlist {selectedChatActionType === "publish_channel" ? "Channel" : "Chat"}
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div className="rounded-xl border border-white/10 bg-black/25 p-2 text-[11px] text-tg-muted">
          <div className="flex items-center justify-between gap-2">
            <span>AgentRun · шагов {stepCount}</span>
            <button onClick={() => setStepLogOpen((value) => !value)} className="text-cyan-200 hover:text-white">Журнал шагов</button>
          </div>
          {activeStep && <div className="mt-1 text-cyan-100">{activeStep.message} → {activeStep.visualTarget}</div>}
          {stepLogOpen && (
            <div className="mt-2 max-h-28 overflow-y-auto rounded-lg bg-black/30 p-2">
              {stepLog.length === 0 ? "Шагов пока нет." : stepLog.slice(-8).map((step) => (
                <div key={step.stepId} className="mb-1">
                  <span className="font-bold text-white/80">{step.status}</span> · {step.uiAction} · {step.visualTarget}
                </div>
              ))}
            </div>
          )}
        </div>
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-snug ${m.role === "user" ? "ml-auto bg-tg-active text-white" : "bg-tg-bg text-tg-text"}`}
          >
            {m.tool ? (
              <div className="mb-1 truncate font-mono text-[10px] font-bold uppercase text-red-300/80">{m.tool}</div>
            ) : null}
            {m.attachments && m.attachments.length ? (
              <div className="mb-2 grid grid-cols-2 gap-2">
                {m.attachments.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
                    {file.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.previewUrl} alt={file.name} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="grid h-20 place-items-center text-xs text-tg-muted">файл</div>
                    )}
                    <div className="truncate px-2 py-1 text-[11px] text-tg-muted">{file.name}</div>
                  </div>
                ))}
              </div>
            ) : m.files && m.files.length ? <div className="mb-1 text-xs text-tg-muted">📎 {m.files.join(", ")}</div> : null}
            <div className="whitespace-pre-wrap">{m.text}</div>
            {m.pending ? (
              <div data-ui-target="approval-card" className="mt-2 rounded-xl border-2 border-red-500 bg-red-950/25 p-3" style={{ animation: "epicApprovalPulse 1.6s ease-in-out infinite" }}>
                <style>{"@keyframes epicApprovalPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}50%{box-shadow:0 0 0 4px rgba(239,68,68,0)}}"}</style>
                <div className="text-[11px] font-black uppercase tracking-wide text-red-300">⚠ Требуется подтверждение · EPIC💀CLAW AI</div>
                <div className="mt-2 space-y-1 text-[12px]">
                  <div className="flex gap-2"><span className="w-14 shrink-0 text-tg-muted">Действие</span><span className="min-w-0 flex-1 break-words font-semibold text-white">{(m.pending as OpAction).actionType === "publish_post" ? "Публикация поста в канал" : "Отправка сообщения"}</span></div>
                  <div className="flex gap-2"><span className="w-14 shrink-0 text-tg-muted">Куда</span><span className="min-w-0 flex-1 break-words text-white">{(m.pending as OpAction).chatTitle || (m.pending as OpAction).chatId}</span></div>
                  <div className="flex gap-2"><span className="w-14 shrink-0 text-tg-muted">Превью</span><span className="min-w-0 flex-1 break-words text-white/90">{String((m.pending as OpAction).text || "").slice(0, 120)}{String((m.pending as OpAction).text || "").length > 120 ? "…" : ""}</span></div>
                  <div className="flex gap-2"><span className="w-14 shrink-0 text-tg-muted">Время</span><span className="min-w-0 flex-1 text-white/70">{new Date().toLocaleString("ru-RU")}</span></div>
                </div>
                {(m.pending as OpAction).stage === "await2" && (
                  <div className="mt-2 text-[11px] font-bold text-amber-300">Необратимое действие в канал — подтвердите ещё раз.</div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => confirmAction(i, m.pending as OpAction)}
                    disabled={confirming !== null}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {confirming === i ? "…" : ((m.pending as OpAction).stage === "await2" ? "Подтвердить публикацию" : "Подтвердить")}
                  </button>
                  <button
                    onClick={() => rejectAction(i, m.pending as OpAction)}
                    disabled={confirming !== null}
                    className="flex-1 rounded-lg border border-tg-line bg-tg-bg px-3 py-2 text-xs text-white disabled:opacity-50"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-tg-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> думает…
          </div>
        )}
      </div>
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-2">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative overflow-hidden rounded-xl border border-tg-line bg-tg-bg">
              {filePreviews[fileKey(f)] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filePreviews[fileKey(f)]} alt={f.name} className="h-24 w-full object-cover" />
              ) : (
                <div className="grid h-16 place-items-center text-xs text-tg-muted">{f.type || "файл"}</div>
              )}
              <div className="truncate px-2 py-1 text-[11px] text-tg-muted">{f.name}</div>
              <button onClick={() => removeOperatorFile(i)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 border-t border-tg-line p-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tg-bg text-tg-muted hover:text-white"
          title="Вложить фото / видео / аудио / файл"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => addOperatorFiles(Array.from(e.target.files || []))}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Команда оператору…"
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl bg-tg-bg px-3 py-2 text-sm text-tg-text outline-none"
        />
        <button
          onClick={send}
          disabled={busy}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
          title="Отправить"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      </>
      )}
      {windowState === "FLOATING" && (
        <div
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 h-6 w-6 cursor-nwse-resize rounded-br-2xl bg-gradient-to-br from-transparent via-cyan-400/80 to-red-500/80"
          title="Изменить размер"
        />
      )}
    </div>
    </>
  );
}

function LocalItemRow({ item, active, onClick }: { item: LocalItem; active: boolean; onClick: () => void }) {
  const Icon = item.kind === "group" ? Users : Radio;
  return (
    <button onClick={onClick} className={`flex w-full gap-3 px-3 py-2.5 text-left ${active ? "bg-tg-active" : "hover:bg-tg-hover"}`}>
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${active ? "bg-white/15" : "bg-tg-bg"} text-tg-accent`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 border-b border-tg-line/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate font-semibold">{item.title}</div>
          <div className={`text-xs ${active ? "text-white/75" : "text-tg-muted"}`}>{item.badge}</div>
        </div>
        <p className={`mt-1 truncate text-sm ${active ? "text-white/80" : "text-tg-muted"}`}>{item.subtitle}</p>
      </div>
    </button>
  );
}

function TelegramChatRow({ chat, active, onClick }: { chat: TelegramChat; active: boolean; onClick: () => void }) {
  const preview = chat.lastMessage?.content || "Нет превью сообщения";

  return (
    <button data-ui-target={`chat-row:${chat.id}`} onClick={onClick} className={`flex w-full gap-3 px-3 py-2.5 text-left ${active ? "bg-tg-active" : "hover:bg-tg-hover"}`}>
      <TelegramAvatar title={chat.title} type={chat.type} active={active} photoFileId={chat.photoSmallFileId} />
      <div className="min-w-0 flex-1 border-b border-tg-line/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate font-semibold">{chat.title}</div>
          <div className={`text-xs ${active ? "text-white/75" : "text-tg-muted"}`}>{formatMessageTime(chat.lastMessage?.date)}</div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-sm ${active ? "text-white/80" : "text-tg-muted"}`}>{preview}</p>
          {Boolean(chat.unreadCount) && <span className="rounded-full bg-tg-blue px-2 py-0.5 text-xs text-white">{chat.unreadCount}</span>}
        </div>
      </div>
    </button>
  );
}

function TelegramChatHeader({ chat }: { chat: TelegramChat }) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-tg-line bg-tg-header px-4">
      <TelegramAvatar title={chat.title} type={chat.type} active photoFileId={chat.photoSmallFileId} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold">{chat.title}</h1>
        <p className="text-sm text-tg-muted">Telegram · {chatTypeLabel(chat)}{chat.username ? ` · ${chat.username}` : ""}</p>
      </div>
      <button className="grid h-10 w-10 place-items-center rounded-full text-tg-muted hover:bg-tg-hover hover:text-tg-text">
        <MoreVertical className="h-5 w-5" />
      </button>
    </header>
  );
}

function EmptyChatFilter({ folder, query }: { folder: FolderId; query: string }) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tg-bg text-tg-muted">
        <MessageCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-semibold">{query.trim() ? "Ничего не найдено" : `В папке «${telegramFolderLabel(folder)}» пусто`}</h3>
      <p className="mt-2 text-sm leading-6 text-tg-muted">
        {query.trim()
          ? "Поиск работает по названию, username, типу чата и последнему превью сообщения."
          : "Это реальный фильтр TDLib. Если чат есть в Telegram, он появится после синхронизации backend."}
      </p>
    </div>
  );
}

function isNoticeError(notice: string) {
  const lowered = notice.toLowerCase();
  return ["не удалось", "недоступ", "ошибка", "не отправ", "не принят", "не запуст"].some((token) => lowered.includes(token));
}

function TelegramChatWorkspace({
  chat,
  messages,
  draft,
  setDraft,
  approvalNotice,
  onRefreshMessages,
  onSuggest,
  onSendApproved,
  aiBusy,
  sendBusy,
  aiStatus,
  messagesLoading,
  memoryCount
}: {
  chat: TelegramChat;
  messages: TelegramMessage[];
  draft: string;
  setDraft: (value: string) => void;
  approvalNotice: string;
  onRefreshMessages: () => void;
  onSuggest: () => void;
  onSendApproved: () => void;
  aiBusy: boolean;
  sendBusy: boolean;
  aiStatus: AiStatus | null;
  messagesLoading: boolean;
  memoryCount: number | null;
}) {
  const brainOnline = aiStatus?.runtime === "ready";
  const noticeIsError = approvalNotice ? isNoticeError(approvalNotice) : false;

  return (
    <div className="relative mx-auto flex h-full max-w-3xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="rounded-full bg-black/30 px-3 py-1 text-xs text-tg-muted">Реальный Telegram-чат · {messages.length} сообщений</div>
        {memoryCount !== null && (
          <div className="flex items-center gap-1.5 rounded-full border border-tg-line bg-black/30 px-3 py-1 text-xs text-tg-accent" title="Персона помнит контекст этого диалога">
            <Brain className="h-3.5 w-3.5" />
            {memoryCount > 0 ? `помнит ${memoryCount} реплик контекста` : "память диалога пуста"}
          </div>
        )}
        <button onClick={onRefreshMessages} className="grid h-7 w-7 place-items-center rounded-full bg-black/30 text-tg-muted hover:bg-tg-hover hover:text-white" aria-label="Обновить историю">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div data-ui-target="message-list" className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && messagesLoading && (
          <section className="flex items-center gap-3 rounded-2xl border border-tg-line bg-tg-panel p-4 shadow-telegram">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-tg-accent" />
            <p className="text-sm leading-6 text-tg-muted">Загружаем историю из TDLib…</p>
          </section>
        )}
        {messages.length === 0 && !messagesLoading && (
          <section className="rounded-2xl border border-tg-line bg-tg-panel p-5 text-center shadow-telegram">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-tg-bg text-tg-accent">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-3 font-semibold">{chat.title}</h2>
            <p className="mt-2 text-sm leading-6 text-tg-muted">
              История пока пуста или недоступна локально. Напишите первое сообщение — или попросите EPIC☠STAR подсказать черновик ответа.
            </p>
          </section>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isOutgoing ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] rounded-2xl px-4 py-2 shadow-telegram ${message.isOutgoing ? "bg-tg-active text-white" : "bg-tg-bubble text-tg-text"}`}>
              {message.authorSignature && <div className="mb-1 text-xs font-semibold text-tg-accent">{message.authorSignature}</div>}
              <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.content || "Сообщение без текстового превью"}</div>
              <div className={`mt-1 text-right text-[11px] ${message.isOutgoing ? "text-white/70" : "text-tg-muted"}`}>{formatMessageTime(message.date)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI panel — EPIC☠STAR suggests, the operator sends. */}
      <div className="rounded-2xl border border-tg-line bg-tg-panel/90 p-3 shadow-neon">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-tg-text">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-epic-ink ring-1 ring-tg-line epic-glow">
              <EpicStarMark className="h-5 w-5" />
            </span>
            AI-ассистент
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              brainOnline ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-tg-line bg-black/30 text-tg-muted"
            }`}
            title={aiStatus?.message ?? ""}
          >
            <span className={`h-2 w-2 rounded-full ${brainOnline ? "bg-emerald-400 animate-epic-pulse" : "bg-tg-muted"}`} />
            {brainOnline ? `мозг онлайн · ${aiStatus?.provider ?? "ai"}${aiStatus?.model ? ` · ${aiStatus.model}` : ""}` : "мозг оффлайн"}
          </span>
        </div>

        <button
          onClick={onSuggest}
          disabled={aiBusy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-epic-neon to-epic-ember px-4 py-2.5 text-sm font-semibold text-white shadow-neon transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Сгенерировать черновик ответа EPIC☠STAR"
        >
          {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {aiBusy ? "EPIC☠STAR думает…" : "🤖 Подсказать ответ (EPIC☠STAR)"}
        </button>
        <p className="mt-2 text-center text-[11px] text-tg-muted">AI предлагает — отправляешь ты.</p>
      </div>

      {approvalNotice && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
            noticeIsError ? "border-epic-ember/40 bg-epic-deep/20 text-tg-text" : "border-tg-line bg-tg-panel text-tg-muted"
          }`}
        >
          {noticeIsError ? <X className="mt-0.5 h-4 w-4 shrink-0 text-epic-neon" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-tg-accent" />}
          <span className="leading-6">{approvalNotice}</span>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl border border-tg-line bg-tg-panel p-2 shadow-telegram">
        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-tg-muted hover:bg-tg-hover hover:text-white" aria-label="Вложение">
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          data-ui-target="composer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={1}
          placeholder="Черновик ответа (можно отредактировать перед отправкой)"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl bg-tg-bg px-4 py-2.5 text-sm leading-5 outline-none placeholder:text-tg-muted"
        />
        <button
          data-ui-target="send-button"
          onClick={onSendApproved}
          disabled={sendBusy || !draft.trim()}
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-tg-blue px-3.5 text-sm font-semibold text-white shadow-neon hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Отправить в Telegram (подтверждение оператора)"
        >
          {sendBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          <span className="hidden sm:inline">Отправить</span>
        </button>
      </div>
      <div className="flex items-start gap-2 px-2 text-xs text-tg-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-tg-accent" />
        <span>
          Approval-гейт: AI только предлагает черновик. Отправка в Telegram — исключительно по вашему клику «Отправить», автоотправки нет
          (EPICGRAM_AI_SEND_MODE={aiStatus?.sendMode ?? "operator_approval_required"}).
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ section, item }: { section: Section; item: LocalItem }) {
  if (section === "settings") {
    return <PlainHeader title="Настройки EPIC☠️GRAM" subtitle="TDLib, сессия, безопасность, интерфейс" icon={Settings} />;
  }
  if (section === "accounts") {
    return <PlainHeader title="Telegram-аккаунты" subtitle="Подключенные сессии и состояние TDLib" icon={User} />;
  }
  if (section === "agents") {
    return <PlainHeader title="AI-агенты" subtitle="Память, роли и подтверждение действий" icon={Cpu} />;
  }
  if (section === "logs") {
    return <PlainHeader title="Журнал аудита" subtitle="Локальные события клиента и backend" icon={FileClock} />;
  }
  return <ItemHeader item={item} />;
}

function PlainHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-tg-line bg-tg-header px-4">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-tg-active text-tg-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold">{title}</h1>
        <p className="text-sm text-tg-muted">{subtitle}</p>
      </div>
    </header>
  );
}

function ItemHeader({ item }: { item: LocalItem }) {
  const Icon = item.kind === "group" ? Users : Radio;
  return (
    <header className="flex h-16 items-center gap-3 border-b border-tg-line bg-tg-header px-4">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-tg-active text-tg-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold">{item.title}</h1>
        <p className="text-sm text-tg-muted">{item.badge} · локальная рабочая область</p>
      </div>
      <button className="grid h-10 w-10 place-items-center rounded-full text-tg-muted hover:bg-tg-hover hover:text-tg-text">
        <MoreVertical className="h-5 w-5" />
      </button>
    </header>
  );
}

function ItemWorkspace({
  item,
  telegramStatus,
  telegramChats,
  onAuth
}: {
  item: LocalItem;
  telegramStatus: TelegramStatus | null;
  telegramChats: TelegramChat[];
  onAuth: () => void;
}) {
  const telegramReady = isTelegramReady(telegramStatus);
  const account = primaryTelegramAccount(telegramStatus);

  return (
    <div className="relative mx-auto flex max-w-3xl flex-col gap-4">
      <div className="mx-auto rounded-full bg-black/30 px-3 py-1 text-xs text-tg-muted">Создано по умолчанию</div>
      <section className="rounded-2xl bg-tg-bubble p-4 shadow-telegram">
        <div className="text-xs font-semibold text-tg-blue">Системное описание</div>
        <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
        <p className="mt-2 text-sm leading-6 text-tg-muted">{item.subtitle}</p>
      </section>
      <section className="rounded-2xl border border-tg-line bg-[#1c1117] p-4 shadow-telegram">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-tg-accent">
          <Database className="h-4 w-4" />
          Память
        </div>
        <div className="space-y-2">
          {item.memory.map((memory) => (
            <div key={memory} className="rounded-xl bg-black/20 px-3 py-2 text-sm leading-6">{memory}</div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl bg-tg-bubble p-4 shadow-telegram">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-tg-muted">
          <CheckCircle2 className="h-4 w-4 text-tg-accent" />
          Технические задачи
        </div>
        <div className="space-y-2">
          {item.tasks.map((task) => (
            <label key={task} className="flex items-center gap-3 rounded-xl bg-tg-bg px-3 py-2 text-sm">
              <span className="h-4 w-4 rounded border border-tg-muted" />
              {task}
            </label>
          ))}
        </div>
      </section>
      <section className="rounded-2xl bg-tg-panel p-4 shadow-telegram">
        <h3 className="font-semibold">{telegramReady ? "Telegram-аккаунт подключен" : "Telegram-аккаунт пока не подключен"}</h3>
        <p className="mt-2 text-sm leading-6 text-tg-muted">
          {telegramReady
            ? `${account?.displayName ?? "Аккаунт"} авторизован через официальный TDLib backend. Загружено чатов: ${telegramChats.length}.`
            : "Эти группы и каналы являются локальной AI-структурой проекта. Реальные Telegram-чаты появятся после авторизации через официальный TDLib backend."}
        </p>
        {telegramReady && (
          <div className="mt-4 space-y-2">
            {telegramChats.slice(0, 6).map((chat) => (
              <div key={chat.id} className="flex items-center justify-between gap-3 rounded-xl bg-tg-bg px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{chat.title}</span>
                {Boolean(chat.unreadCount) && <span className="rounded-full bg-tg-blue px-2 py-0.5 text-xs text-white">{chat.unreadCount}</span>}
              </div>
            ))}
            {telegramChats.length === 0 && <div className="rounded-xl bg-tg-bg px-3 py-2 text-sm text-tg-muted">TDLib авторизован, но список чатов пока пуст или еще загружается.</div>}
          </div>
        )}
        <button onClick={onAuth} className="mt-4 rounded-xl bg-tg-blue px-4 py-3 text-sm font-semibold text-white">
          {telegramReady ? "Управлять авторизацией" : "Авторизовать Telegram"}
        </button>
      </section>
    </div>
  );
}

function SettingsWorkspace({
  telegramStatus,
  telegramChats,
  aiStatus,
  clientDiagnostics,
  onClearClient,
  onAuth,
  onCreateAccount,
  onSelectAccount
}: {
  telegramStatus: TelegramStatus | null;
  telegramChats: TelegramChat[];
  aiStatus: AiStatus | null;
  clientDiagnostics: string;
  onClearClient: () => void;
  onAuth: () => void;
  onCreateAccount: () => void;
  onSelectAccount: (accountId: string) => void;
}) {
  const [userAgent, setUserAgent] = useState("—");
  const telegramReady = isTelegramReady(telegramStatus);
  const account = primaryTelegramAccount(telegramStatus);
  const privateCount = telegramChats.filter((chat) => chat.category === "private").length;
  const groupCount = telegramChats.filter((chat) => chat.category === "group").length;
  const channelCount = telegramChats.filter((chat) => chat.category === "channel" || chat.isChannel).length;
  const botCount = telegramChats.filter((chat) => chat.category === "bot" || chat.isBot).length;

  useEffect(() => {
    setUserAgent(window.navigator.userAgent);
  }, []);

  return (
    <div className="relative mx-auto grid max-w-4xl gap-4 lg:grid-cols-2">
      <section className="rounded-2xl bg-tg-panel p-4 shadow-telegram">
        <div className="mb-3 flex items-center gap-2 font-semibold text-tg-accent">
          <ShieldCheck className="h-5 w-5" />
          Состояние Telegram
        </div>
        <div className="overflow-hidden rounded-xl bg-tg-bg">
          <InfoRow label="Статус" value={telegramReady ? "авторизован" : "не авторизован"} />
          <InfoRow label="Активный слот" value={telegramStatus?.activeAccountId ?? "main"} />
          <InfoRow label="Всего слотов" value={`${telegramStatus?.accounts?.length ?? 1}`} />
          <InfoRow label="TDLib" value={telegramStatus?.authorizationState ?? "ожидание"} />
          <InfoRow label="Аккаунт" value={account?.displayName ?? "нет"} />
          <InfoRow label="Телефон" value={account?.phoneMasked ?? "нет"} />
          <InfoRow label="Чаты загружены" value={`${telegramChats.length}`} />
          <InfoRow label="Категории" value={`личные ${privateCount} · группы ${groupCount} · каналы ${channelCount} · боты ${botCount}`} />
        </div>
        <button onClick={onAuth} className="mt-4 w-full rounded-xl bg-tg-blue px-4 py-3 text-sm font-semibold text-white">
          {telegramReady ? "Управлять авторизацией" : "Авторизовать Telegram"}
        </button>
        <div className="mt-3 grid gap-2">
          {(telegramStatus?.accounts ?? []).map((slot) => (
            <button
              key={slot.slotId ?? slot.label}
              onClick={() => slot.slotId && onSelectAccount(slot.slotId)}
              className={`rounded-xl px-3 py-2 text-left text-sm ${slot.active ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:bg-tg-hover hover:text-white"}`}
            >
              <span className="font-semibold">{slot.displayName ?? slot.label ?? slot.slotId}</span>
              <span className="ml-2 text-xs opacity-75">{slot.status === "ready" ? "авторизован" : "ожидает вход"}</span>
            </button>
          ))}
        </div>
        <button onClick={onCreateAccount} className="mt-3 w-full rounded-xl border border-tg-line px-4 py-3 text-sm font-semibold text-tg-muted hover:bg-tg-hover hover:text-white">
          Добавить Telegram-аккаунт
        </button>
      </section>

      <section className="rounded-2xl bg-tg-panel p-4 shadow-telegram">
        <div className="mb-3 flex items-center gap-2 font-semibold text-tg-accent">
          <Cpu className="h-5 w-5" />
          AI-провайдер
        </div>
        <div className="overflow-hidden rounded-xl bg-tg-bg">
          <InfoRow label="Статус" value={aiStatus?.runtime === "ready" ? "подключен" : aiStatus?.runtime === "missing_key" ? "нет ключа" : "выключен"} />
          <InfoRow label="Провайдер" value={aiStatus?.provider ?? "openai"} />
          <InfoRow label="Модель" value={aiStatus?.model ?? "gpt-4.1-mini"} />
          <InfoRow label="API key" value={aiStatus?.apiKeyMasked ?? "нет"} />
          <InfoRow label="Режим отправки" value={aiStatus?.sendMode === "operator_approval_required" ? "только после подтверждения" : "не настроен"} />
        </div>
        <p className="mt-3 text-sm leading-6 text-tg-muted">{aiStatus?.message ?? "Проверка AI backend..."}</p>
      </section>

      <section className="rounded-2xl bg-tg-panel p-4 shadow-telegram">
        <div className="mb-3 flex items-center gap-2 font-semibold text-tg-accent">
          <Settings className="h-5 w-5" />
          Клиент
        </div>
        <div className="overflow-hidden rounded-xl bg-tg-bg">
          <InfoRow label="Режим" value="локальный TDLib backend" />
          <InfoRow label="Отправка сообщений" value="только после подтверждения человека" />
          <InfoRow label="Секреты" value=".env.local, не в браузере" />
          <InfoRow label="Кэш UI" value={clientDiagnostics} />
          <InfoRow label="Версия UI" value={CLIENT_VERSION} />
        </div>
        <button onClick={onClearClient} className="mt-4 w-full rounded-xl border border-tg-line px-4 py-3 text-sm font-semibold text-tg-muted hover:bg-tg-hover hover:text-white">
          Очистить кэш клиента и перезагрузить
        </button>
      </section>

      <section className="rounded-2xl bg-tg-panel p-4 shadow-telegram">
        <div className="mb-3 flex items-center gap-2 font-semibold text-tg-accent">
          <ShieldCheck className="h-5 w-5" />
          EPIC💀CLAW AI · безопасность
        </div>
        <div className="overflow-hidden rounded-xl bg-tg-bg">
          <InfoRow label="EPIC💀CLAW AI" value="MANUAL_APPROVAL_ONLY" />
          <InfoRow label="Режим отправки" value={aiStatus?.sendMode === "operator_approval_required" ? "только после подтверждения" : "не настроен"} />
          <InfoRow label="Approval Gate" value="ON — человек подтверждает" />
          <InfoRow label="Auto-send / bulk" value="OFF" />
          <InfoRow label="Kill Switch" value="Agent OS → Production Gate (🔒 Emergency Lock)" />
          <InfoRow label="Права (матрица)" value="глобальные caps · per-object — план P1" />
          <InfoRow label="Audit Log" value="Agent OS → Audit Log" />
          <InfoRow label="Устройство / User-Agent" value={userAgent} />
        </div>
        <p className="mt-3 text-sm leading-6 text-tg-muted">
          Second Pilot и аварийная блокировка (SAFE MODE) управляются в разделе Agent OS → Production Gate. По умолчанию отправка идёт только после подтверждения человека.
        </p>
      </section>
    </div>
  );
}

function AccountsWorkspace({
  telegramStatus,
  telegramChats,
  onAuth,
  onCreateAccount,
  onSelectAccount
}: {
  telegramStatus: TelegramStatus | null;
  telegramChats: TelegramChat[];
  onAuth: () => void;
  onCreateAccount: () => void;
  onSelectAccount: (accountId: string) => void;
}) {
  const account = primaryTelegramAccount(telegramStatus);
  const telegramReady = isTelegramReady(telegramStatus);
  const accounts = telegramStatus?.accounts ?? [];

  const dialogsCount = telegramChats.length;
  const channelsCount = telegramChats.filter((c) => c.category === "channel" || c.isChannel).length;
  const groupsCount = telegramChats.filter((c) => c.category === "group").length;

  return (
    <div className="relative mx-auto flex max-w-3xl flex-col gap-4">
      <section className="rounded-2xl border border-tg-line bg-tg-panel p-4 shadow-telegram">
        <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-tg-accent">EPIC GRAM WEB CLIENT</div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-tg-bg px-3 py-2">Status <b className={telegramReady ? "text-emerald-400" : "text-tg-muted"}>{telegramReady ? "ONLINE" : "OFFLINE"}</b></div>
          <div className="rounded-lg bg-tg-bg px-3 py-2">API <b className="text-emerald-400">CONNECTED</b></div>
          <div className="rounded-lg bg-tg-bg px-3 py-2">TDLib <b className={telegramReady ? "text-emerald-400" : "text-amber-400"}>{telegramReady ? "READY" : "NOT READY"}</b></div>
          <div className="rounded-lg bg-tg-bg px-3 py-2">Active <b className="text-white">{account?.displayName ?? "—"}</b></div>
          <div className="rounded-lg bg-tg-bg px-3 py-2">Dialogs <b className="text-white">{dialogsCount}</b></div>
          <div className="rounded-lg bg-tg-bg px-3 py-2">Channels <b className="text-white">{channelsCount}</b></div>
          <div className="rounded-lg bg-tg-bg px-3 py-2">Groups <b className="text-white">{groupsCount}</b></div>
        </div>
      </section>
      <section className="rounded-2xl bg-tg-panel p-4 shadow-telegram">
        <div className="flex items-center gap-3">
          <TelegramAvatar title={account?.displayName ?? "Telegram"} type="chatTypePrivate" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold">{account?.displayName ?? "Telegram не подключен"}</h2>
            <p className="text-sm text-tg-muted">{telegramReady ? "Активная TDLib-сессия" : "Нет активной сессии"}</p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl bg-tg-bg">
          <InfoRow label="ID" value={account?.id ?? "нет"} />
          <InfoRow label="Username" value={account?.username ?? "нет"} />
          <InfoRow label="Телефон" value={account?.phoneMasked ?? "нет"} />
          <InfoRow label="Чаты" value={`${telegramChats.length}`} />
        </div>
        <button onClick={onAuth} className="mt-4 rounded-xl bg-tg-blue px-4 py-3 text-sm font-semibold text-white">
          {telegramReady ? "Открыть управление сессией" : "Авторизовать Telegram"}
        </button>
      </section>
      <section className="rounded-2xl bg-tg-panel p-4 shadow-telegram">
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <Inbox className="h-5 w-5 text-tg-accent" />
          Live Telegram Data
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${telegramReady ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-tg-muted"}`}>{telegramReady ? "ACTIVE" : "OFFLINE"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ["Диалоги", telegramChats.length],
            ["Каналы", telegramChats.filter((c) => c.category === "channel" || c.isChannel).length],
            ["Группы", telegramChats.filter((c) => c.category === "group").length],
            ["Личные", telegramChats.filter((c) => c.category === "private").length],
            ["Непрочит.", telegramChats.reduce((s, c) => s + (c.unreadCount ?? 0), 0)]
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-tg-bg p-3 text-center">
              <div className="text-2xl font-extrabold text-white">{value as number}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-tg-muted">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-tg-muted">Реальные данные TDLib активного аккаунта ({account?.displayName ?? "—"}). По другим слотам — переключись, и счётчики подгрузятся.</p>
      </section>
      <section className="rounded-2xl bg-tg-panel p-4 shadow-telegram">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Слоты аккаунтов</h3>
          <button onClick={onCreateAccount} className="rounded-xl bg-tg-blue px-3 py-2 text-sm font-semibold text-white">
            Добавить
          </button>
        </div>
        <div className="space-y-2">
          {accounts.map((slot) => (
            <button
              key={slot.slotId ?? slot.label}
              onClick={() => slot.slotId && onSelectAccount(slot.slotId)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${slot.active ? "bg-tg-active" : "bg-tg-bg hover:bg-tg-hover"}`}
            >
              <TelegramAvatar title={slot.displayName ?? slot.label ?? "Telegram"} type="chatTypePrivate" active={slot.active} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{slot.displayName ?? slot.label ?? slot.slotId}</div>
                <div className="truncate text-sm text-tg-muted">{slot.username ?? slot.phoneMasked ?? slot.authorizationState ?? "не авторизован"}</div>
              </div>
              <span className="rounded-full bg-black/25 px-2 py-1 text-xs">{slot.status === "ready" ? "online" : "login"}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function accountInitial(name: string) {
  const t = (name || "?").trim();
  return t ? t[0].toUpperCase() : "?";
}
function accountColor(seed: string) {
  const palette = ["bg-rose-600", "bg-orange-600", "bg-amber-600", "bg-emerald-600", "bg-teal-600", "bg-sky-600", "bg-indigo-600", "bg-fuchsia-600"];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function AccountAvatar({ account, active, size = 44 }: { account: TelegramAccount; active?: boolean; size?: number }) {
  const name = account.displayName || account.label || account.slotId || "?";
  const ready = account.status === "ready" || account.authorizationState === "authorizationStateReady";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className={`grid h-full w-full place-items-center rounded-full text-base font-bold text-white ${accountColor(account.slotId || name)} ${active ? "ring-2 ring-white" : "ring-1 ring-black/30"}`}>
        {accountInitial(name)}
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-tg-panel ${ready ? "bg-emerald-400" : "bg-tg-muted"}`} title={ready ? "online" : "offline"} />
    </div>
  );
}

function AccountRail({
  accounts,
  activeId,
  unreadActive,
  onSelect,
  onAdd,
  onDelete,
  className = ""
}: {
  accounts: TelegramAccount[];
  activeId: string;
  unreadActive: number;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete?: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex h-full w-[68px] shrink-0 flex-col items-center gap-3 border-r border-tg-line bg-epic-ink/60 py-3 ${className}`}>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto">
        {accounts.map((a) => {
          const id = a.slotId || "";
          const isActive = id === activeId || Boolean(a.active);
          const name = a.displayName || a.label || id;
          return (
            <div key={id || name} className="group relative">
              <button
                onClick={() => id && onSelect(id)}
                title={name}
                className={`grid place-items-center rounded-full transition ${isActive ? "" : "opacity-70 hover:opacity-100"}`}
              >
                <AccountAvatar account={a} active={isActive} />
              </button>
              {isActive && unreadActive > 0 && (
                <span className="pointer-events-none absolute -right-1 -top-1 min-w-[18px] rounded-full bg-tg-blue px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                  {unreadActive > 99 ? "99+" : unreadActive}
                </span>
              )}
              {onDelete && accounts.length > 1 && (
                <button
                  onClick={() => id && onDelete(id)}
                  title="Удалить аккаунт"
                  className="absolute -left-1 -top-1 hidden h-4 w-4 place-items-center rounded-full bg-red-600 text-[11px] leading-none text-white group-hover:grid"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={onAdd}
          title="Добавить аккаунт"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-dashed border-tg-line text-2xl leading-none text-tg-muted hover:border-tg-blue hover:text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TelegramMenu({
  onClose,
  onAuth,
  accounts = [],
  activeId = "",
  unreadActive = 0,
  onSelectAccount,
  onAddAccount
}: {
  onClose: () => void;
  onAuth: () => void;
  accounts?: TelegramAccount[];
  activeId?: string;
  unreadActive?: number;
  onSelectAccount?: (id: string) => void;
  onAddAccount?: () => void;
}) {
  return (
    <div className="absolute inset-y-0 left-0 z-20 w-full border-r border-tg-line bg-tg-panel shadow-telegram">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2a0c16] to-[#101218] p-5">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,59,92,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,59,92,.7)_1px,transparent_1px)] [background-size:26px_26px]" />
        <button onClick={onClose} className="relative mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-epic-ink ring-1 ring-tg-line epic-glow" aria-label="Закрыть меню">
          <EpicStarMark className="h-10 w-10" />
        </button>
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold tracking-wide epic-title">EPIC☠STAR</div>
            <div className="mt-1 text-sm text-tg-muted">{BRAND_NAME} · DEEP INSIDE</div>
          </div>
          <span className="shrink-0 rounded-full border border-tg-line bg-tg-bg px-2 py-1 text-xs text-tg-muted">v3</span>
        </div>
      </div>
      {accounts.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto border-b border-tg-line px-4 py-3">
          {accounts.map((a) => {
            const id = a.slotId || "";
            const isActive = id === activeId || Boolean(a.active);
            const name = a.displayName || a.label || id;
            return (
              <button
                key={id || name}
                onClick={() => { if (id && onSelectAccount) onSelectAccount(id); onClose(); }}
                title={name}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <AccountAvatar account={a} active={isActive} size={48} />
                <span className="max-w-[64px] truncate text-[11px] text-tg-muted">{name}</span>
              </button>
            );
          })}
          <button
            onClick={() => { if (onAddAccount) onAddAccount(); else onAuth(); }}
            title="Добавить аккаунт"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-dashed border-tg-line text-2xl leading-none text-tg-muted hover:border-tg-blue hover:text-white"
          >
            +
          </button>
        </div>
      )}
      <div className="border-b border-tg-line px-3 py-2">
        <button onClick={onAuth} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-tg-text hover:bg-tg-hover">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-tg-hover text-tg-muted"><Smartphone className="h-5 w-5" /></span>
          Подключить Telegram
        </button>
      </div>
      <nav className="py-2">
        {routeItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-ui-target={item.href === "/settings" ? "settings-button" : undefined}
              className="flex items-center gap-4 px-5 py-3 text-sm text-tg-text hover:bg-tg-hover"
            >
              <Icon className="h-5 w-5 text-tg-muted" />
              {item.label}
            </Link>
          );
        })}
        <div className="my-2 border-t border-tg-line" />
        <MenuItem icon={Archive} label="Избранное" value="пусто" />
        <MenuItem icon={Moon} label="Ночной режим" value="вкл" />
        <MenuItem icon={ShieldCheck} label="Законный режим" value="вкл" />
      </nav>
    </div>
  );
}

function MenuItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3 text-sm text-tg-text">
      <Icon className="h-5 w-5 text-tg-muted" />
      <span className="flex-1">{label}</span>
      {value && <span className="text-xs text-tg-muted">{value}</span>}
    </div>
  );
}

function TelegramInfoPanel({
  chat,
  activeFolder,
  messages,
  telegramStatus,
  telegramChats,
  onAuth
}: {
  chat: TelegramChat;
  activeFolder: FolderId;
  messages: TelegramMessage[];
  telegramStatus: TelegramStatus | null;
  telegramChats: TelegramChat[];
  onAuth: () => void;
}) {
  const account = primaryTelegramAccount(telegramStatus);
  const unreadTotal = telegramChats.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0);

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-tg-line px-4">
        <div>
          <h3 className="font-semibold">Инфо</h3>
          <p className="text-sm text-tg-muted">Telegram + AI workspace</p>
        </div>
        <PanelRight className="h-5 w-5 text-tg-muted" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section className="mb-5 flex flex-col items-center rounded-xl bg-tg-bg p-4 text-center">
          <TelegramAvatar title={chat.title} type={chat.type} active photoFileId={chat.photoSmallFileId} />
          <h3 className="mt-3 max-w-full truncate text-lg font-semibold">{chat.title}</h3>
          <p className="mt-1 text-sm text-tg-muted">{chatTypeLabel(chat)}{chat.username ? ` · ${chat.username}` : ""}</p>
        </section>

        <section className="mb-5 overflow-hidden rounded-xl bg-tg-bg">
          <InfoRow label="Активная папка" value={telegramFolderLabel(activeFolder)} />
          <InfoRow label="Список TDLib" value={chat.list === "archive" ? "архив" : "основной"} />
          <InfoRow label="Категория" value={chatTypeLabel(chat)} />
          <InfoRow label="Непрочитано в чате" value={`${chat.unreadCount ?? 0}`} />
          <InfoRow label="Сообщений загружено" value={`${messages.length}`} />
          <InfoRow label="Последнее сообщение" value={chat.lastMessage?.date ? new Date(chat.lastMessage.date).toLocaleString("ru-RU") : "нет"} />
        </section>

        <section className="mb-5 rounded-xl bg-tg-bg p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Cpu className="h-5 w-5 text-tg-accent" />
            AI-контекст
          </div>
          <div className="space-y-2 text-sm leading-6 text-tg-muted">
            <div className="rounded-lg bg-tg-panel px-3 py-2">Память: отдельная для этого чата, пока только локальный слой.</div>
            <div className="rounded-lg bg-tg-panel px-3 py-2">Сводки: будут создаваться после явного действия оператора.</div>
            <div className="rounded-lg bg-tg-panel px-3 py-2">Отправка: в MVP только через подтверждение человека.</div>
          </div>
        </section>

        <section className="rounded-xl bg-tg-bg p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-tg-accent" />
            Сессия
          </div>
          <div className="space-y-2 text-sm leading-6 text-tg-muted">
            <div>Аккаунт: {account?.displayName ?? "подключен"}</div>
            <div>Всего чатов: {telegramChats.length}</div>
            <div>Всего непрочитано: {unreadTotal}</div>
          </div>
          <button onClick={onAuth} className="mt-4 w-full rounded-xl bg-tg-blue px-4 py-3 text-sm font-semibold text-white">
            Управлять авторизацией
          </button>
        </section>
      </div>
    </>
  );
}

function AuthPanel({
  authMode,
  setAuthMode,
  phone,
  setPhone,
  code,
  setCode,
  pass2fa,
  setPass2fa,
  requestTwoFaAuth,
  qrLink,
  qrDataUrl,
  authMessage,
  telegramStatus,
  telegramChatsCount,
  onCreateAccount,
  onDeleteAccount,
  onShowAccount,
  onSelectAccount,
  requestQrAuth,
  requestPhoneAuth,
  requestCodeAuth,
  resetAuth
}: {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  pass2fa: string;
  setPass2fa: (value: string) => void;
  requestTwoFaAuth: () => void;
  qrLink: string;
  qrDataUrl: string;
  authMessage: string;
  telegramStatus: TelegramStatus | null;
  telegramChatsCount: number;
  onCreateAccount: () => void;
  onDeleteAccount: () => void;
  onShowAccount: () => void;
  onSelectAccount: (accountId: string) => void;
  requestQrAuth: () => void;
  requestPhoneAuth: () => void;
  requestCodeAuth: () => void;
  resetAuth: () => void;
}) {
  const telegramReady = isTelegramReady(telegramStatus);
  const account = primaryTelegramAccount(telegramStatus);

  return (
    <div className="relative w-full max-w-md rounded-2xl bg-tg-panel p-5 shadow-telegram">
      <h2 className="text-xl font-semibold">Авторизация Telegram</h2>
      <p className="mt-2 text-sm leading-6 text-tg-muted">Переключение аккаунтов — в левой панели (rail). Здесь только авторизация новой сессии через официальный Telegram API/TDLib.</p>
      {telegramReady && (
        <div className="mt-4 rounded-xl border border-tg-line bg-tg-bg p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-tg-accent">
            <ShieldCheck className="h-4 w-4" />
            Telegram уже подключен
          </div>
          <div className="mt-2 text-sm leading-6 text-tg-muted">
            <div>Аккаунт: {account?.displayName ?? "подключен"}</div>
            {account?.phoneMasked && <div>Телефон: {account.phoneMasked}</div>}
            <div>Чатов загружено: {telegramChatsCount}</div>
          </div>
        </div>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-tg-bg p-1">
        <button onClick={() => setAuthMode("qr")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${authMode === "qr" ? "bg-tg-active text-white" : "text-tg-muted"}`}>QR-код</button>
        <button onClick={() => setAuthMode("phone")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${authMode === "phone" ? "bg-tg-active text-white" : "text-tg-muted"}`}>Номер телефона</button>
      </div>
      {authMode === "qr" ? (
        <QrAuthState qrLink={qrLink} qrDataUrl={qrDataUrl} requestQrAuth={requestQrAuth} />
      ) : (
        <PhoneAuthState
          phone={phone}
          setPhone={setPhone}
          code={code}
          setCode={setCode}
          requestPhoneAuth={requestPhoneAuth}
          requestCodeAuth={requestCodeAuth}
        />
      )}
      {telegramStatus?.authorizationState === "authorizationStateWaitPassword" && (
        <div className="mt-4 rounded-xl border border-tg-accent/40 bg-tg-bg p-3">
          <label className="text-sm font-semibold">Облачный пароль (2FA)</label>
          <input
            type="password"
            value={pass2fa}
            onChange={(event) => setPass2fa(event.target.value)}
            placeholder="2FA password"
            autoComplete="off"
            className="mt-2 h-12 w-full rounded-xl bg-tg-panel px-4 text-base outline-none ring-1 ring-tg-line focus:ring-tg-blue"
          />
          <button onClick={requestTwoFaAuth} className="mt-3 w-full rounded-xl bg-tg-active px-4 py-3 font-semibold text-white">Подтвердить 2FA</button>
          <p className="mt-2 text-xs text-tg-muted">Пароль уходит только на backend TDLib, не сохраняется и не логируется.</p>
        </div>
      )}
      <div className="mt-4 rounded-xl bg-tg-bg px-3 py-2 text-sm leading-6 text-tg-muted">{authMessage}</div>
      <button onClick={resetAuth} className="mt-3 w-full rounded-xl border border-tg-line px-4 py-3 text-sm font-semibold text-tg-muted hover:bg-tg-hover hover:text-white">
        Сбросить авторизацию
      </button>
    </div>
  );
}

function QrAuthState({ qrLink, qrDataUrl, requestQrAuth }: { qrLink: string; qrDataUrl: string; requestQrAuth: () => void }) {
  return (
    <div className="mt-5">
      <div className="mx-auto grid h-56 w-56 place-items-center rounded-2xl bg-white p-5 text-[#0a0b0f]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qrDataUrl ? <img src={qrDataUrl} alt="Telegram QR authorization" className="h-48 w-48" /> : <QrCode className="h-40 w-40" />}
      </div>
      <ol className="mt-5 space-y-2 text-sm leading-6 text-tg-muted">
        <li>1. Откройте Telegram на телефоне.</li>
        <li>2. Настройки → Устройства → Подключить устройство.</li>
        <li>3. Нажмите запрос QR и отсканируйте код.</li>
      </ol>
      {qrLink && (
        <a href={qrLink} className="mt-4 block truncate rounded-xl bg-tg-bg px-3 py-2 text-center text-sm text-tg-accent hover:bg-tg-hover">
          Открыть ссылку Telegram
        </a>
      )}
      <button onClick={requestQrAuth} className="mt-5 w-full rounded-xl bg-tg-blue px-4 py-3 font-semibold text-white">Запросить QR</button>
    </div>
  );
}

function PhoneAuthState({
  phone,
  setPhone,
  code,
  setCode,
  requestPhoneAuth,
  requestCodeAuth
}: {
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  requestPhoneAuth: () => void;
  requestCodeAuth: () => void;
}) {
  return (
    <div className="mt-5">
      <label className="text-sm font-semibold">Номер телефона</label>
      <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+380..." className="mt-2 h-12 w-full rounded-xl bg-tg-bg px-4 text-base outline-none ring-1 ring-tg-line focus:ring-tg-blue" />
      <p className="mt-3 text-sm leading-6 text-tg-muted">Запрос кода идет через официальный TDLib backend. Если был открыт QR, он будет сброшен.</p>
      <button onClick={requestPhoneAuth} className="mt-5 w-full rounded-xl bg-tg-blue px-4 py-3 font-semibold text-white">Запросить код</button>
      <div className="mt-5 border-t border-tg-line pt-5">
        <label className="text-sm font-semibold">Код Telegram</label>
        <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="12345" inputMode="numeric" className="mt-2 h-12 w-full rounded-xl bg-tg-bg px-4 text-base outline-none ring-1 ring-tg-line focus:ring-tg-blue" />
        <button onClick={requestCodeAuth} className="mt-3 w-full rounded-xl bg-tg-active px-4 py-3 font-semibold text-white">Проверить код</button>
      </div>
    </div>
  );
}

function InfoPanel({
  item,
  telegramStatus,
  telegramChats,
  onAuth
}: {
  item: LocalItem;
  telegramStatus: TelegramStatus | null;
  telegramChats: TelegramChat[];
  onAuth: () => void;
}) {
  const telegramReady = isTelegramReady(telegramStatus);
  const account = primaryTelegramAccount(telegramStatus);

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-tg-line px-4">
        <div>
          <h3 className="font-semibold">Состояние</h3>
          <p className="text-sm text-tg-muted">Локальная AI-структура</p>
        </div>
        <MoreVertical className="h-5 w-5 text-tg-muted" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section className="mb-5 overflow-hidden rounded-xl bg-tg-bg">
          <InfoRow label="Папка" value={item.folder === "groups" ? "Группы" : "Каналы"} />
          <InfoRow label="Память" value={`${item.memory.length} записи`} />
          <InfoRow label="Задачи" value={`${item.tasks.length} пункта`} />
          <InfoRow label="Telegram" value={telegramReady ? "авторизован" : "не авторизован"} />
          {telegramReady && <InfoRow label="Аккаунт" value={account?.displayName ?? "подключен"} />}
          {telegramReady && account?.username && <InfoRow label="Username" value={account.username} />}
          {telegramReady && <InfoRow label="Чаты TDLib" value={`${telegramChats.length}`} />}
        </section>
        <section className="rounded-xl bg-tg-bg p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-tg-accent" />Правила</div>
          <ul className="space-y-2 text-sm leading-6 text-tg-muted">
            <li>Системные AI-папки созданы локально.</li>
            <li>Реальные Telegram-чаты появятся только после авторизации.</li>
            <li>Сессии должны храниться на backend в зашифрованном виде.</li>
          </ul>
          <button onClick={onAuth} className="mt-4 w-full rounded-xl bg-tg-blue px-4 py-3 text-sm font-semibold text-white">
            {telegramReady ? "Управлять авторизацией" : "Авторизовать Telegram"}
          </button>
        </section>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-tg-line px-3 py-3 last:border-b-0">
      <div className="text-xs text-tg-muted">{label}</div>
      <div className="mt-0.5 text-sm leading-5">{value}</div>
    </div>
  );
}

function AuthModal({
  authMode,
  setAuthMode,
  phone,
  setPhone,
  code,
  setCode,
  pass2fa,
  setPass2fa,
  requestTwoFaAuth,
  qrLink,
  qrDataUrl,
  authMessage,
  telegramStatus,
  telegramChatsCount,
  onCreateAccount,
  onDeleteAccount,
  onShowAccount,
  onSelectAccount,
  requestQrAuth,
  requestPhoneAuth,
  requestCodeAuth,
  resetAuth,
  onClose
}: {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  pass2fa: string;
  setPass2fa: (value: string) => void;
  requestTwoFaAuth: () => void;
  qrLink: string;
  qrDataUrl: string;
  authMessage: string;
  telegramStatus: TelegramStatus | null;
  telegramChatsCount: number;
  onCreateAccount: () => void;
  onDeleteAccount: () => void;
  onShowAccount: () => void;
  onSelectAccount: (accountId: string) => void;
  requestQrAuth: () => void;
  requestPhoneAuth: () => void;
  requestCodeAuth: () => void;
  resetAuth: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-tg-panel shadow-telegram">
        <button onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-tg-muted hover:bg-tg-hover hover:text-tg-text"><X className="h-5 w-5" /></button>
        <div className="p-5">
          <AuthPanel
            authMode={authMode}
            setAuthMode={setAuthMode}
            phone={phone}
            setPhone={setPhone}
            code={code}
            setCode={setCode}
            pass2fa={pass2fa}
            setPass2fa={setPass2fa}
            requestTwoFaAuth={requestTwoFaAuth}
            qrLink={qrLink}
            qrDataUrl={qrDataUrl}
            authMessage={authMessage}
            telegramStatus={telegramStatus}
            telegramChatsCount={telegramChatsCount}
            onCreateAccount={onCreateAccount}
            onDeleteAccount={onDeleteAccount}
            onShowAccount={onShowAccount}
            onSelectAccount={onSelectAccount}
            requestQrAuth={requestQrAuth}
            requestPhoneAuth={requestPhoneAuth}
            requestCodeAuth={requestCodeAuth}
            resetAuth={resetAuth}
          />
        </div>
      </div>
    </div>
  );
}
