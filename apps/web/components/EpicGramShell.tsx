"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Cpu,
  Database,
  FileClock,
  Menu,
  MessageCircle,
  Moon,
  MoreVertical,
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
type FolderId = "chats" | "channels";

const BRAND_NAME = "EPIC☠️GRAM";

type LocalItem = {
  id: string;
  folder: FolderId;
  title: string;
  subtitle: string;
  kind: "group" | "channel";
  badge: string;
  memory: string[];
  tasks: string[];
};

const folders = [
  { id: "chats" as const, label: "Чаты", icon: Users },
  { id: "channels" as const, label: "Каналы", icon: Radio }
];

const localItems: LocalItem[] = [
  {
    id: "group-tdlib-core",
    folder: "chats",
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
    folder: "chats",
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
    folder: "chats",
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

export function EpicGramShell({ section }: Props) {
  const [activeFolder, setActiveFolder] = useState<FolderId>("chats");
  const [activeItemId, setActiveItemId] = useState(localItems[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("qr");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [authMessage, setAuthMessage] = useState("TDLib backend пока не подключен.");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const filteredItems = useMemo(() => localItems.filter((item) => item.folder === activeFolder), [activeFolder]);
  const activeItem = localItems.find((item) => item.id === activeItemId) ?? filteredItems[0] ?? localItems[0];

  function selectFolder(folder: FolderId) {
    setActiveFolder(folder);
    const first = localItems.find((item) => item.folder === folder);
    if (first) setActiveItemId(first.id);
  }

  async function requestQrAuth() {
    const response = await fetch("/api/telegram/auth/qr", { method: "POST" });
    const data = (await response.json()) as { message?: string };
    setAuthMessage(data.message ?? "QR авторизация ожидает backend.");
  }

  async function requestPhoneAuth() {
    const response = await fetch("/api/telegram/auth/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: phone })
    });
    const data = (await response.json()) as { message?: string };
    setAuthMessage(data.message ?? "Авторизация по номеру ожидает backend.");
  }

  async function requestCodeAuth() {
    const response = await fetch("/api/telegram/auth/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = (await response.json()) as { message?: string };
    setAuthMessage(data.message ?? "Проверка кода ожидает backend.");
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

          <div className="grid grid-cols-2 gap-2 border-b border-tg-line px-3 py-2">
            {folders.map((folder) => {
              const Icon = folder.icon;
              const count = localItems.filter((item) => item.folder === folder.id).length;
              return (
                <button key={folder.id} onClick={() => selectFolder(folder.id)} className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm ${activeFolder === folder.id ? "bg-tg-active text-white" : "text-tg-muted hover:bg-tg-hover hover:text-tg-text"}`}>
                  <Icon className="h-4 w-4" />
                  {folder.label}
                  <span className="rounded-full bg-black/20 px-1.5 text-xs">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredItems.map((item) => (
              <LocalItemRow key={item.id} item={item} active={item.id === activeItem.id} onClick={() => setActiveItemId(item.id)} />
            ))}
          </div>
        </section>

        <section className="flex h-full min-h-0 min-w-0 flex-col bg-tg-chat">
          <ItemHeader item={activeItem} />
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_20%_10%,rgba(100,255,154,.08),transparent_24%),linear-gradient(135deg,rgba(14,22,33,.96),rgba(8,13,20,.98))] p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(100,255,154,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(100,255,154,.7)_1px,transparent_1px)] [background-size:32px_32px]" />
            <ItemWorkspace item={activeItem} onAuth={() => setAuthOpen(true)} />
          </div>
        </section>

        <aside className="hidden h-full min-h-0 flex-col border-l border-tg-line bg-tg-panel xl:flex">
          <InfoPanel item={activeItem} onAuth={() => setAuthOpen(true)} />
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
          authMessage={authMessage}
          requestQrAuth={requestQrAuth}
          requestPhoneAuth={requestPhoneAuth}
          requestCodeAuth={requestCodeAuth}
          onClose={() => setAuthOpen(false)}
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

function ItemWorkspace({ item, onAuth }: { item: LocalItem; onAuth: () => void }) {
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
        <h3 className="font-semibold">Telegram-аккаунт пока не подключен</h3>
        <p className="mt-2 text-sm leading-6 text-tg-muted">Эти группы и каналы являются локальной AI-структурой проекта. Реальные Telegram-чаты появятся после авторизации через официальный TDLib backend.</p>
        <button onClick={onAuth} className="mt-4 rounded-xl bg-tg-blue px-4 py-3 text-sm font-semibold text-white">Авторизовать Telegram</button>
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

function AuthPanel({
  authMode,
  setAuthMode,
  phone,
  setPhone,
  code,
  setCode,
  authMessage,
  requestQrAuth,
  requestPhoneAuth,
  requestCodeAuth
}: {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  authMessage: string;
  requestQrAuth: () => void;
  requestPhoneAuth: () => void;
  requestCodeAuth: () => void;
}) {
  return (
    <div className="relative w-full max-w-md rounded-2xl bg-tg-panel p-5 shadow-telegram">
      <h2 className="text-xl font-semibold">Авторизация Telegram</h2>
      <p className="mt-2 text-sm leading-6 text-tg-muted">Подключение должно идти через официальный Telegram API/TDLib на backend. В браузере не храним сессии, коды и секреты.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-tg-bg p-1">
        <button onClick={() => setAuthMode("qr")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${authMode === "qr" ? "bg-tg-active text-white" : "text-tg-muted"}`}>QR-код</button>
        <button onClick={() => setAuthMode("phone")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${authMode === "phone" ? "bg-tg-active text-white" : "text-tg-muted"}`}>Номер телефона</button>
      </div>
      {authMode === "qr" ? (
        <QrAuthState requestQrAuth={requestQrAuth} />
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
    </div>
  );
}

function QrAuthState({ requestQrAuth }: { requestQrAuth: () => void }) {
  return (
    <div className="mt-5">
      <div className="mx-auto grid h-56 w-56 place-items-center rounded-2xl bg-white p-5 text-[#17212b]"><QrCode className="h-40 w-40" /></div>
      <ol className="mt-5 space-y-2 text-sm leading-6 text-tg-muted">
        <li>1. Откройте Telegram на телефоне.</li>
        <li>2. Настройки → Устройства → Подключить устройство.</li>
        <li>3. После backend-подключения здесь появится реальный QR.</li>
      </ol>
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
      <p className="mt-3 text-sm leading-6 text-tg-muted">После подключения backend эта форма будет запускать официальный TDLib login-flow.</p>
      <button onClick={requestPhoneAuth} className="mt-5 w-full rounded-xl bg-tg-blue px-4 py-3 font-semibold text-white">Запросить код</button>
      <div className="mt-5 border-t border-tg-line pt-5">
        <label className="text-sm font-semibold">Код Telegram</label>
        <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="12345" inputMode="numeric" className="mt-2 h-12 w-full rounded-xl bg-tg-bg px-4 text-base outline-none ring-1 ring-tg-line focus:ring-tg-blue" />
        <button onClick={requestCodeAuth} className="mt-3 w-full rounded-xl bg-tg-active px-4 py-3 font-semibold text-white">Проверить код</button>
      </div>
    </div>
  );
}

function InfoPanel({ item, onAuth }: { item: LocalItem; onAuth: () => void }) {
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
          <InfoRow label="Папка" value={item.folder === "chats" ? "Чаты" : "Каналы"} />
          <InfoRow label="Память" value={`${item.memory.length} записи`} />
          <InfoRow label="Задачи" value={`${item.tasks.length} пункта`} />
          <InfoRow label="Telegram" value="не авторизован" />
        </section>
        <section className="rounded-xl bg-tg-bg p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-tg-accent" />Правила</div>
          <ul className="space-y-2 text-sm leading-6 text-tg-muted">
            <li>Системные AI-папки созданы локально.</li>
            <li>Реальные Telegram-чаты появятся только после авторизации.</li>
            <li>Сессии должны храниться на backend в зашифрованном виде.</li>
          </ul>
          <button onClick={onAuth} className="mt-4 w-full rounded-xl bg-tg-blue px-4 py-3 text-sm font-semibold text-white">Авторизовать Telegram</button>
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
  authMessage,
  requestQrAuth,
  requestPhoneAuth,
  requestCodeAuth,
  onClose
}: {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  authMessage: string;
  requestQrAuth: () => void;
  requestPhoneAuth: () => void;
  requestCodeAuth: () => void;
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
            authMessage={authMessage}
            requestQrAuth={requestQrAuth}
            requestPhoneAuth={requestPhoneAuth}
            requestCodeAuth={requestCodeAuth}
          />
        </div>
      </div>
    </div>
  );
}
