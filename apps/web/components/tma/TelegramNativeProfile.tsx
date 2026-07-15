"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type OperatorPanelState = "closed" | "compact" | "expanded";
type OperatorMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type TelegramWebAppUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initDataUnsafe?: { user?: TelegramWebAppUser };
        colorScheme?: "light" | "dark";
      };
    };
  }
}

const initialMessages: OperatorMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Я EPIC💀CLAW AI Operator. Анализирую профиль и Telegram-контекст без изменений. Любое действие с аккаунтом потребует Allow.",
  },
];

export default function TelegramNativeProfile() {
  const [panel, setPanel] = useState<OperatorPanelState>("closed");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<OperatorMessage[]>(initialMessages);
  const [telegramUser, setTelegramUser] = useState<TelegramWebAppUser | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const profileScrollRef = useRef(0);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();
    setTelegramUser(webApp?.initDataUnsafe?.user ?? null);
  }, []);

  useEffect(() => {
    if (panel === "closed") return;
    requestAnimationFrame(() => {
      historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, panel]);

  const displayName = useMemo(() => {
    const name = [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ").trim();
    return name || "EPIC💀GRAM AI";
  }, [telegramUser]);

  const username = telegramUser?.username ? `@${telegramUser.username}` : "Telegram-профиль";

  function openPanel(next: OperatorPanelState) {
    profileScrollRef.current = window.scrollY;
    setPanel(next);
  }

  function closePanel() {
    setPanel("closed");
    requestAnimationFrame(() => window.scrollTo({ top: profileScrollRef.current }));
  }

  function submitOperatorMessage(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: value },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Запрос принят в read-only режиме. Подключение к реальному operator API будет следующим интеграционным коммитом. ACTION_CREATED=false · TELEGRAM_MUTATION=false",
      },
    ]);
    setInput("");
  }

  return (
    <main className="min-h-[100dvh] bg-[#09090f] text-white">
      <section className="mx-auto min-h-[100dvh] w-full max-w-md pb-[calc(92px+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#09090f]/90 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-xl">
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-xl" aria-label="Назад">←</button>
          <div className="text-center">
            <p className="text-sm font-semibold">Профиль</p>
            <p className="text-[11px] text-emerald-400">Telegram подключён</p>
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-xl" aria-label="Меню">⋮</button>
        </header>

        <div className="px-5 pt-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative grid h-32 w-32 place-items-center overflow-hidden rounded-full border border-fuchsia-400/40 bg-[radial-gradient(circle_at_50%_50%,#581c87_0%,#111827_52%,#030712_100%)] shadow-[0_0_46px_rgba(217,70,239,0.28)]">
              {telegramUser?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={telegramUser.photo_url} alt="Telegram avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-5xl">💀</span>
              )}
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight">{displayName}</h1>
            <p className="mt-1 text-sm text-white/45">{username}</p>
            <span className="mt-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">в сети</span>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {["Фото", "Изменить", "Настройки"].map((label, index) => (
              <button key={label} className="min-h-20 rounded-3xl border border-white/5 bg-white/[0.055] px-2 text-sm font-medium transition active:scale-95">
                <span className="mb-2 block text-2xl">{["📷", "✎", "⚙️"][index]}</span>
                {label}
              </button>
            ))}
          </div>

          <section className="mt-7 overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.055]">
            <ProfileRow label="Telegram ID" value={telegramUser?.id ? String(telegramUser.id) : "Будет получен из проверенного initData"} />
            <ProfileRow label="Имя пользователя" value={username} />
            <ProfileRow label="О себе" value="AI workspace для Telegram-аккаунтов, каналов и групп" />
            <ProfileRow label="Безопасный режим" value="Approval required" accent />
          </section>

          <section className="mt-6">
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              {["Медиа", "Файлы", "Группы", "Каналы"].map((item, index) => (
                <button key={item} className={`shrink-0 rounded-full px-4 py-2 text-sm ${index === 0 ? "bg-fuchsia-500/20 text-fuchsia-200" : "bg-white/5 text-white/50"}`}>
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
              Реальные данные появятся после безопасного подключения TDLib-профиля.
            </div>
          </section>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid w-full max-w-md grid-cols-5 border-t border-white/10 bg-[#101017]/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
          {[
            ["💬", "Чаты"],
            ["👥", "Контакты"],
            ["✦", "AI"],
            ["⚙", "Настройки"],
            ["◉", "Профиль"],
          ].map(([icon, label]) => (
            <button key={label} onClick={() => label === "AI" && openPanel("compact")} className={`min-h-14 rounded-2xl text-[11px] ${label === "Профиль" ? "bg-fuchsia-500/10 text-fuchsia-200" : "text-white/55"}`}>
              <span className="block text-xl">{icon}</span>{label}
            </button>
          ))}
        </nav>
      </section>

      {panel === "closed" && (
        <button onClick={() => openPanel("compact")} className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] right-5 z-30 grid h-16 w-16 place-items-center rounded-full border border-fuchsia-300/40 bg-[radial-gradient(circle,#ec4899_0%,#7e22ce_45%,#111827_75%)] text-xl shadow-[0_0_36px_rgba(236,72,153,0.5)]" aria-label="Открыть AI Operator">
          💀
        </button>
      )}

      {panel !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && closePanel()}>
          <section className={`grid w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-t border-fuchsia-400/20 bg-[#0d1020] shadow-2xl ${panel === "compact" ? "h-[45dvh] rounded-t-[30px]" : "h-[100dvh]"}`}>
            <header className="flex items-center justify-between border-b border-white/10 px-5 pb-4 pt-[calc(14px+env(safe-area-inset-top))]">
              <div>
                <p className="font-bold">EPIC💀CLAW AI OPERATOR</p>
                <p className="text-xs text-cyan-300/70">Контекст: Telegram-профиль · read-only</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPanel(panel === "compact" ? "expanded" : "compact")} className="grid h-11 w-11 place-items-center rounded-full bg-white/5" aria-label="Изменить размер панели">↕</button>
                <button onClick={closePanel} className="grid h-11 w-11 place-items-center rounded-full bg-white/5" aria-label="Закрыть">×</button>
              </div>
            </header>

            <div ref={historyRef} className="min-h-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
              {messages.map((message) => (
                <div key={message.id} className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-fuchsia-600/30" : "border border-white/10 bg-white/[0.055]"}`}>
                  {message.text}
                </div>
              ))}
            </div>

            <form onSubmit={submitOperatorMessage} className="border-t border-white/10 bg-[#0d1020] px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-end gap-2 rounded-3xl bg-white/[0.07] p-2">
                <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={1} placeholder="Спросить AI о профиле…" className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/30" />
                <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fuchsia-600 font-bold">↑</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function ProfileRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border-b border-white/5 px-5 py-4 last:border-b-0">
      <p className="text-xs text-white/35">{label}</p>
      <p className={`mt-1 text-sm ${accent ? "text-emerald-300" : "text-white/90"}`}>{value}</p>
    </div>
  );
}
