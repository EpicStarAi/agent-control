"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  FileClock,
  Inbox,
  Menu,
  MessageCircle,
  Moon,
  MoreVertical,
  PanelRight,
  QrCode,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  User,
  Users,
  X
} from "lucide-react";
import type { Section } from "@/data/mock";

type Props = { section: Section };
type AuthMode = "qr" | "phone";
type FolderId = "all" | "private" | "groups" | "channels" | "bots" | "unread" | "archive";
type TelegramAccount = {
  id?: string;
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
  authorizationState?: string;
  qrLink?: string | null;
  message?: string;
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
  { href: "/", label: "Рабочая область", icon: MessageCircle },
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
  return status?.accounts?.[0] ?? null;
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
    <div className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full ${active ? "bg-white/15" : "bg-gradient-to-br from-[#2b5278] to-[#17212b]"} text-sm font-bold text-tg-accent ring-1 ring-white/10`}>
      {photoFileId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/telegram/photo?fileId=${encodeURIComponent(photoFileId)}`} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{isPrivate ? initialsFromTitle(title) : initialsFromTitle(title)}</span>
      )}
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
  const [qrLink, setQrLink] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [authMessage, setAuthMessage] = useState("TDLib backend пока не подключен.");
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [telegramChats, setTelegramChats] = useState<TelegramChat[]>([]);
  const [selectedTelegramChatId, setSelectedTelegramChatId] = useState("");
  const [telegramMessages, setTelegramMessages] = useState<TelegramMessage[]>([]);
  const [clientDiagnostics, setClientDiagnostics] = useState("проверка кэша...");
  const telegramReady = isTelegramReady(telegramStatus);

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
          dark: "#0e1621",
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
    if (!telegramReady) {
      setTelegramChats([]);
      return undefined;
    }

    let cancelled = false;

    async function loadTelegramChats() {
      const response = await fetch("/api/telegram/chats", { cache: "no-store" });
      const data = (await response.json()) as TelegramChatsResponse;
      if (!cancelled && response.ok) setTelegramChats(data.chats ?? []);
    }

    loadTelegramChats().catch(() => undefined);
    const timer = window.setInterval(() => {
      loadTelegramChats().catch(() => undefined);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [telegramReady]);

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
      return undefined;
    }

    let cancelled = false;

    async function loadTelegramMessages() {
      const response = await fetch(`/api/telegram/messages?chatId=${encodeURIComponent(selectedTelegramChatId)}`, { cache: "no-store" });
      const data = (await response.json()) as TelegramMessagesResponse;
      if (!cancelled && response.ok) setTelegramMessages(data.messages ?? []);
    }

    loadTelegramMessages().catch(() => undefined);
    const timer = window.setInterval(() => {
      loadTelegramMessages().catch(() => undefined);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedTelegramChatId]);

  const filteredItems = useMemo(() => localItems.filter((item) => item.folder === activeFolder), [activeFolder]);
  const activeItem = localItems.find((item) => item.id === activeItemId) ?? filteredItems[0] ?? localItems[0];
  const useTelegramChats = telegramReady && telegramChats.length > 0;
  const visibleTelegramChats = useMemo(
    () => telegramChats.filter((chat) => chatMatchesFolder(chat, activeFolder)),
    [activeFolder, telegramChats]
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

  async function requestQrAuth() {
    setAuthFlowActive(true);
    const response = await fetch("/api/telegram/auth/qr", { method: "POST" });
    const data = (await response.json()) as { message?: string; qrLink?: string };
    setQrLink(data.qrLink ?? "");
    setAuthMessage(data.message ?? (response.ok ? "QR авторизация запрошена." : "QR авторизация не запустилась."));
  }

  async function requestPhoneAuth() {
    setAuthFlowActive(true);
    setQrLink("");
    setQrDataUrl("");
    const response = await fetch("/api/telegram/auth/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: phone })
    });
    const data = (await response.json()) as { message?: string };
    setAuthMessage(data.message ?? (response.ok ? "Код запрошен. Проверьте Telegram." : "Код не отправлен. Проверьте номер и backend."));
  }

  async function requestCodeAuth() {
    setAuthFlowActive(true);
    const response = await fetch("/api/telegram/auth/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
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

  async function resetAuth() {
    const response = await fetch("/api/telegram/auth/reset", { method: "POST" });
    const data = (await response.json()) as { message?: string };
    setQrLink("");
    setQrDataUrl("");
    setCode("");
    setAuthFlowActive(false);
    setAuthMessage(data.message ?? (response.ok ? "Авторизация сброшена." : "Не удалось сбросить авторизацию."));
  }

  return (
    <main className="h-screen min-h-0 overflow-hidden bg-tg-bg text-tg-text">
      <div className="grid h-full min-h-0 grid-cols-[minmax(320px,390px)_1fr] xl:grid-cols-[390px_1fr_320px]">
        <section className="relative flex h-full min-h-0 flex-col border-r border-tg-line bg-tg-panel">
          {menuOpen && <TelegramMenu onClose={() => setMenuOpen(false)} onAuth={() => setAuthOpen(true)} />}
          <header className="border-b border-tg-line px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setMenuOpen((value) => !value)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-tg-muted hover:bg-tg-hover hover:text-tg-text" aria-label="Открыть меню">
                <Menu className="h-5 w-5" />
              </button>
              <label className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-full bg-tg-bg px-4 text-tg-muted">
                <Search className="h-4 w-4" />
                <input className="w-full bg-transparent text-sm outline-none placeholder:text-tg-muted" placeholder="Поиск" />
              </label>
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
                : <EmptyChatFilter folder={activeFolder} />
              : filteredItems.map((item) => (
                  <LocalItemRow key={item.id} item={item} active={item.id === activeItem.id} onClick={() => setActiveItemId(item.id)} />
                ))}
          </div>
        </section>

        <section className="flex h-full min-h-0 min-w-0 flex-col bg-tg-chat">
          {showTelegramChat ? <TelegramChatHeader chat={activeTelegramChat as TelegramChat} /> : <SectionHeader section={section} item={activeItem} />}
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_20%_10%,rgba(100,255,154,.08),transparent_24%),linear-gradient(135deg,rgba(14,22,33,.96),rgba(8,13,20,.98))] p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(100,255,154,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(100,255,154,.7)_1px,transparent_1px)] [background-size:32px_32px]" />
            {showTelegramChat ? (
              <TelegramChatWorkspace chat={activeTelegramChat as TelegramChat} messages={telegramMessages} />
            ) : section === "settings" ? (
              <SettingsWorkspace
                telegramStatus={telegramStatus}
                telegramChats={telegramChats}
                clientDiagnostics={clientDiagnostics}
                onClearClient={() => clearClientCaches(true)}
                onAuth={() => setAuthOpen(true)}
              />
            ) : section === "accounts" ? (
              <AccountsWorkspace telegramStatus={telegramStatus} telegramChats={telegramChats} onAuth={() => setAuthOpen(true)} />
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
          qrLink={qrLink}
          qrDataUrl={qrDataUrl}
          authMessage={authMessage}
          telegramStatus={telegramStatus}
          telegramChatsCount={telegramChats.length}
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
    </main>
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
          <div className={`text-xs ${active ? "text-blue-100/80" : "text-tg-muted"}`}>{item.badge}</div>
        </div>
        <p className={`mt-1 truncate text-sm ${active ? "text-blue-100/85" : "text-tg-muted"}`}>{item.subtitle}</p>
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
          <div className={`text-xs ${active ? "text-blue-100/80" : "text-tg-muted"}`}>{formatMessageTime(chat.lastMessage?.date)}</div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-sm ${active ? "text-blue-100/85" : "text-tg-muted"}`}>{preview}</p>
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

function EmptyChatFilter({ folder }: { folder: FolderId }) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tg-bg text-tg-muted">
        <MessageCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-semibold">В папке «{telegramFolderLabel(folder)}» пусто</h3>
      <p className="mt-2 text-sm leading-6 text-tg-muted">Это реальный фильтр TDLib. Если чат есть в Telegram, он появится после синхронизации backend.</p>
    </div>
  );
}

function TelegramChatWorkspace({ chat, messages }: { chat: TelegramChat; messages: TelegramMessage[] }) {
  return (
    <div className="relative mx-auto flex max-w-3xl flex-col gap-3">
      <div className="mx-auto rounded-full bg-black/30 px-3 py-1 text-xs text-tg-muted">Реальный Telegram-чат · {messages.length} сообщений</div>
      {messages.length === 0 && (
        <section className="rounded-2xl bg-tg-panel p-4 shadow-telegram">
          <h2 className="font-semibold">{chat.title}</h2>
          <p className="mt-2 text-sm leading-6 text-tg-muted">TDLib авторизован, чат выбран, история сообщений еще загружается или недоступна локально.</p>
        </section>
      )}
      {messages.map((message) => (
        <div key={message.id} className={`flex ${message.isOutgoing ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[78%] rounded-2xl px-4 py-2 shadow-telegram ${message.isOutgoing ? "bg-tg-active text-white" : "bg-tg-bubble text-tg-text"}`}>
            {message.authorSignature && <div className="mb-1 text-xs font-semibold text-tg-accent">{message.authorSignature}</div>}
            <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.content || "Сообщение без текстового превью"}</div>
            <div className={`mt-1 text-right text-[11px] ${message.isOutgoing ? "text-blue-100/75" : "text-tg-muted"}`}>{formatMessageTime(message.date)}</div>
          </div>
        </div>
      ))}
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
      <section className="rounded-2xl bg-[#143236] p-4 shadow-telegram">
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
  clientDiagnostics,
  onClearClient,
  onAuth
}: {
  telegramStatus: TelegramStatus | null;
  telegramChats: TelegramChat[];
  clientDiagnostics: string;
  onClearClient: () => void;
  onAuth: () => void;
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
          <InfoRow label="TDLib" value={telegramStatus?.authorizationState ?? "ожидание"} />
          <InfoRow label="Аккаунт" value={account?.displayName ?? "нет"} />
          <InfoRow label="Телефон" value={account?.phoneMasked ?? "нет"} />
          <InfoRow label="Чаты загружены" value={`${telegramChats.length}`} />
          <InfoRow label="Категории" value={`личные ${privateCount} · группы ${groupCount} · каналы ${channelCount} · боты ${botCount}`} />
        </div>
        <button onClick={onAuth} className="mt-4 w-full rounded-xl bg-tg-blue px-4 py-3 text-sm font-semibold text-white">
          {telegramReady ? "Управлять авторизацией" : "Авторизовать Telegram"}
        </button>
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
    </div>
  );
}

function AccountsWorkspace({ telegramStatus, telegramChats, onAuth }: { telegramStatus: TelegramStatus | null; telegramChats: TelegramChat[]; onAuth: () => void }) {
  const account = primaryTelegramAccount(telegramStatus);
  const telegramReady = isTelegramReady(telegramStatus);

  return (
    <div className="relative mx-auto flex max-w-3xl flex-col gap-4">
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
    </div>
  );
}

function TelegramMenu({ onClose, onAuth }: { onClose: () => void; onAuth: () => void }) {
  return (
    <div className="absolute inset-y-0 left-0 z-20 w-full border-r border-tg-line bg-tg-panel shadow-telegram">
      <div className="bg-gradient-to-br from-[#22364a] to-[#17212b] p-5">
        <button onClick={onClose} className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-tg-active text-lg font-bold">E</button>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-semibold tracking-wide">{BRAND_NAME}</div>
            <div className="mt-1 text-sm text-tg-muted">Локальная AI-структура создана</div>
          </div>
          <span className="rounded-full bg-tg-bg px-2 py-1 text-xs text-tg-muted">offline</span>
        </div>
      </div>
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
  qrLink,
  qrDataUrl,
  authMessage,
  telegramStatus,
  telegramChatsCount,
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
  qrLink: string;
  qrDataUrl: string;
  authMessage: string;
  telegramStatus: TelegramStatus | null;
  telegramChatsCount: number;
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
      <p className="mt-2 text-sm leading-6 text-tg-muted">Подключение должно идти через официальный Telegram API/TDLib на backend. В браузере не храним сессии, коды и секреты.</p>
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
      <div className="mx-auto grid h-56 w-56 place-items-center rounded-2xl bg-white p-5 text-[#17212b]">
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
  qrLink,
  qrDataUrl,
  authMessage,
  telegramStatus,
  telegramChatsCount,
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
  qrLink: string;
  qrDataUrl: string;
  authMessage: string;
  telegramStatus: TelegramStatus | null;
  telegramChatsCount: number;
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
            qrLink={qrLink}
            qrDataUrl={qrDataUrl}
            authMessage={authMessage}
            telegramStatus={telegramStatus}
            telegramChatsCount={telegramChatsCount}
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
