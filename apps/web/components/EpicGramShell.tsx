"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Users,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import type { Section } from "@/data/mock";

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
  { href: "/chats", label: "Чаты", icon: Users },
  { href: "/accounts", label: "Аккаунты", icon: User },
  { href: "/agents", label: "AI-агенты", icon: Cpu },
  { href: "/logs", label: "Журнал аудита", icon: FileClock },
  { href: "/settings", label: "Настройки", icon: Settings }
];

function isTelegramReady(status: TelegramStatus | null) {
  return status?.runtime === "ready" || status?.authorizationState === "authorizationStateReady";
}

function primaryTelegramAccount(status: TelegramStatus | null) {
  return status?.account ?? status?.accounts?.find((account) => account.active) ?? status?.accounts?.[0] ?? null;
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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [redButtonNotice, setRedButtonNotice] = useState("");
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

  function playOperatorBeep() {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 520;
      gain.gain.value = 0.035;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
      window.setTimeout(() => context.close().catch(() => undefined), 180);
    } catch {
      // Browser audio can be unavailable; the UI state is still authoritative.
    }
  }

  function toggleSound() {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      if (next) playOperatorBeep();
      return next;
    });
  }

  async function handleRedButton() {
    if (soundEnabled) playOperatorBeep();
    setRedButtonNotice("SAFE MODE: активирую аварийную блокировку оператора…");
    try {
      const r = await fetch("/api/operator/production/lock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operator: "human", reason: "red_button" })
      }).then((x) => x.json()).catch(() => null);
      if (r && (r.killSwitch === true || r.runtimeMode === "LOCKED" || r.ok === true)) {
        setRedButtonNotice("🔒 SAFE MODE ACTIVE — оператор LOCKED. Write/автопилот выключены, отправки заблокированы. Просмотр чатов остаётся. Разблокировка: Agent OS → Production Gate → Unlock (фраза «UNLOCK OPERATOR»).");
      } else {
        setRedButtonNotice("SAFE MODE недоступен (backend не ответил). Отправки в любом случае требуют подтверждения человека.");
      }
    } catch {
      setRedButtonNotice("SAFE MODE недоступен (backend не ответил). Отправки в любом случае требуют подтверждения человека.");
    }
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
    const response = await fetch("/api/telegram/auth/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: activeAccountId })
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
    const response = await fetch("/api/telegram/auth/phone", {
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
      <div className="fixed right-4 top-4 z-30 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-tg-line bg-tg-panel/95 p-2 shadow-telegram backdrop-blur">
        <button
          onClick={toggleSound}
          className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${soundEnabled ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:bg-tg-hover hover:text-white"}`}
          aria-pressed={soundEnabled}
          title={soundEnabled ? "Выключить звук" : "Включить звук"}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span className="hidden sm:inline">Звук {soundEnabled ? "вкл" : "выкл"}</span>
        </button>
        <button
          onClick={handleRedButton}
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_18px_rgba(220,38,38,.45)] hover:bg-red-500"
          title="Не нажимать"
        >
          <AlertTriangle className="h-4 w-4" />
          Не нажимать
        </button>
      </div>
      {redButtonNotice && (
        <div className="fixed right-4 top-20 z-30 max-w-sm rounded-2xl border border-red-500/50 bg-red-950/95 p-3 text-sm leading-6 text-red-50 shadow-telegram backdrop-blur">
          {redButtonNotice}
        </div>
      )}
      <div className="grid h-full min-h-0 grid-cols-[auto_minmax(300px,380px)_1fr] xl:grid-cols-[auto_380px_1fr_320px]">
        <AccountRail
          className="hidden md:flex"
          accounts={railAccounts}
          activeId={activeAccountId}
          unreadActive={unreadActiveTotal}
          onSelect={(id) => selectTelegramAccount(id)}
          onAdd={() => setAuthOpen(true)}
          onDelete={(id) => deleteTelegramAccount(id)}
        />
        <section className="relative flex h-full min-h-0 flex-col border-r border-tg-line bg-tg-panel">
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
              <label className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-full bg-tg-bg px-4 text-tg-muted">
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

          <div className="min-h-0 flex-1 overflow-y-auto">
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

        <section className="flex h-full min-h-0 min-w-0 flex-col bg-tg-chat">
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
      <OperatorDock />
    </main>
  );
}

type OpAction = { tool: string; chatId: string; chatTitle: string; text: string };
type OpMsg = { role: "user" | "op"; text: string; files?: string[]; pending?: OpAction | null };

function OperatorDock() {
  const [open, setOpen] = useState(true);
  const [msgs, setMsgs] = useState<OpMsg[]>([
    { role: "op", text: "На связи. Я EPIC☠STAR — оператор. Пиши задачу, кидай фото/видео/аудио — разрулю." }
  ]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([{ id: "p_main", name: "Основной" }]);
  const [activeId, setActiveId] = useState("p_main");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [msgs, open]);

  const GREET: OpMsg[] = [{ role: "op", text: "На связи. Я EPIC☠STAR — оператор. Пиши задачу, кидай фото/видео/аудио — разрулю." }];
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
      const rm = localStorage.getItem("epicstar_op_msgs_" + activeId);
      setMsgs(rm ? JSON.parse(rm) : GREET);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  useEffect(() => {
    try { localStorage.setItem("epicstar_op_msgs_" + activeId, JSON.stringify(msgs)); } catch {}
  }, [msgs, activeId]);
  useEffect(() => {
    try { localStorage.setItem("epicstar_op_projects", JSON.stringify(projects)); } catch {}
  }, [projects]);

  function newProject() {
    const id = "p_" + Date.now().toString(36);
    setProjects((p) => [...p, { id, name: "Проект " + (p.length + 1) }]);
    setActiveId(id);
  }

  async function send() {
    const t = text.trim();
    if (!t && files.length === 0) return;
    const fnames = files.map((f) => f.name);
    const mine: OpMsg = { role: "user", text: t, files: fnames };
    const next = [...msgs, mine];
    const history = next.slice(-16).map((m) => ({
      content: (m.files && m.files.length ? "[вложения: " + m.files.join(", ") + "] " : "") + m.text,
      isOutgoing: m.role === "user"
    }));
    setMsgs(next);
    setText("");
    setFiles([]);
    setBusy(true);
    try {
      const r = await fetch("/api/operator/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t, history, conversationId: activeId })
      });
      const d = await r.json().catch(() => null);
      if (d && d.kind === "pending" && d.action) {
        setMsgs((p) => [...p, { role: "op", text: d.reply || "Подтвердить действие?", pending: d.action as OpAction }]);
      } else {
        const reply = (d && (d.text || d.error)) || "⚠ оператор не ответил";
        setMsgs((p) => [...p, { role: "op", text: reply }]);
      }
    } catch {
      setMsgs((p) => [...p, { role: "op", text: "⚠ нет связи с мозгом" }]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction(idx: number, action: OpAction) {
    setMsgs((p) => p.map((m, i) => (i === idx ? { ...m, pending: null } : m)));
    try {
      const r = await fetch("/api/operator/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      const d = await r.json().catch(() => null);
      setMsgs((p) => [...p, { role: "op", text: (d && d.message) || "Готово" }]);
    } catch {
      setMsgs((p) => [...p, { role: "op", text: "⚠ не удалось выполнить" }]);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_22px_rgba(220,38,38,.5)] hover:bg-red-500"
      >
        <Bot className="h-5 w-5" /> AI-Оператор
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 z-40 flex h-screen w-[340px] max-w-[88vw] flex-col border-l border-tg-line bg-tg-panel/98 shadow-telegram backdrop-blur">
      <div className="flex items-center justify-between border-b border-tg-line px-4 py-3">
        <div className="flex items-center gap-2 font-black uppercase tracking-wide text-white">
          <Bot className="h-5 w-5 text-red-500" /> AI-Оператор
        </div>
        <button onClick={() => setOpen(false)} className="text-tg-muted hover:text-white" title="Свернуть">
          <X className="h-5 w-5" />
        </button>
      </div>
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
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-snug ${m.role === "user" ? "ml-auto bg-tg-active text-white" : "bg-tg-bg text-tg-text"}`}
          >
            {m.files && m.files.length ? <div className="mb-1 text-xs text-tg-muted">📎 {m.files.join(", ")}</div> : null}
            <div className="whitespace-pre-wrap">{m.text}</div>
            {m.pending ? (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => confirmAction(i, m.pending as OpAction)}
                  className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
                >
                  ✅ Подтвердить
                </button>
                <button
                  onClick={() => setMsgs((p) => p.map((x, j) => (j === i ? { ...x, pending: null } : x)))}
                  className="rounded-lg bg-tg-active px-3 py-1 text-xs text-white"
                >
                  ✖ Отмена
                </button>
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
        <div className="flex flex-wrap gap-1 px-3 pb-1">
          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-tg-bg px-2 py-1 text-xs text-tg-muted">
              {f.name}
              <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </button>
            </span>
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
          onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files || [])])}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
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
    </div>
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
    <button onClick={onClick} className={`flex w-full gap-3 px-3 py-2.5 text-left ${active ? "bg-tg-active" : "hover:bg-tg-hover"}`}>
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
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
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={1}
          placeholder="Черновик ответа (можно отредактировать перед отправкой)"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl bg-tg-bg px-4 py-2.5 text-sm leading-5 outline-none placeholder:text-tg-muted"
        />
        <button
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
  const telegramReady = isTelegramReady(telegramStatus);
  const account = primaryTelegramAccount(telegramStatus);
  const privateCount = telegramChats.filter((chat) => chat.category === "private").length;
  const groupCount = telegramChats.filter((chat) => chat.category === "group").length;
  const channelCount = telegramChats.filter((chat) => chat.category === "channel" || chat.isChannel).length;
  const botCount = telegramChats.filter((chat) => chat.category === "bot" || chat.isBot).length;

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
          AI Operator · Second Pilot · безопасность
        </div>
        <div className="overflow-hidden rounded-xl bg-tg-bg">
          <InfoRow label="AI Operator" value="EPICSTAR · MANUAL_APPROVAL_ONLY" />
          <InfoRow label="Режим отправки" value={aiStatus?.sendMode === "operator_approval_required" ? "только после подтверждения" : "не настроен"} />
          <InfoRow label="Approval Gate" value="ON — человек подтверждает" />
          <InfoRow label="Auto-send / bulk" value="OFF" />
          <InfoRow label="Kill Switch" value="Agent OS → Production Gate (🔒 Emergency Lock)" />
          <InfoRow label="Права (матрица)" value="глобальные caps · per-object — план P1" />
          <InfoRow label="Audit Log" value="Agent OS → Audit Log" />
          <InfoRow label="Устройство / User-Agent" value={typeof navigator !== "undefined" ? navigator.userAgent : "—"} />
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
            <Link key={item.href} href={item.href} className="flex items-center gap-4 px-5 py-3 text-sm text-tg-text hover:bg-tg-hover">
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
