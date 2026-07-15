"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type OperatorPanelState = "closed" | "compact" | "expanded";
type ActionState = "pending" | "cancelled" | "approved";
type OperatorMessage = {
  id: string;
  role: "assistant" | "user";
  title?: string;
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
    id: "analysis",
    role: "assistant",
    title: "Анализ профиля",
    text: "Профиль содержит минимальную информацию. Bio можно сделать более информативным для контактов.",
  },
];

const navItems = [
  ["◌", "Чаты", "75"],
  ["◎", "Контакты", ""],
  ["◒", "AI", ""],
  ["⚙", "Настройки", ""],
  ["◉", "Профиль", ""],
] as const;

export default function TelegramNativeProfile() {
  const [panel, setPanel] = useState<OperatorPanelState>("compact");
  const [actionState, setActionState] = useState<ActionState>("pending");
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
  }, [messages, panel, actionState]);

  const displayName = useMemo(() => {
    const name = [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ").trim();
    return name || "☠️CENSORED";
  }, [telegramUser]);

  const username = telegramUser?.username ? `@${telegramUser.username}` : "@EpicStarAi";
  const telegramId = telegramUser?.id ? String(telegramUser.id) : "798537475";

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
        title: "Read-only ответ",
        text: "Запрос принят без Telegram-мутации. ACTION_CREATED=false · TELEGRAM_MUTATION=false",
      },
    ]);
    setInput("");
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#05050b] text-white selection:bg-fuchsia-500/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(147,51,234,0.10),transparent_28%),radial-gradient(circle_at_85%_72%,rgba(14,165,233,0.08),transparent_24%)]" />

      <section className="relative mx-auto min-h-[100dvh] w-full max-w-md pb-[calc(90px+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-[#06060d]/90 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-2xl">
          <button className="grid h-11 w-11 place-items-center rounded-full text-3xl text-white/85 transition active:scale-95" aria-label="Назад">←</button>
          <h1 className="text-xl font-semibold">Профиль</h1>
          <button className="grid h-11 w-11 place-items-center rounded-full text-3xl text-white/75 transition active:scale-95" aria-label="Меню">⋮</button>
        </header>

        <div className="px-4 pt-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-36 w-36 rounded-full p-[3px] shadow-[0_0_38px_rgba(217,70,239,0.35)]">
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#22d3ee,#a855f7,#ec4899,#7c3aed,#22d3ee)] blur-[1px]" />
              <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_45%,#11152a_0%,#070713_55%,#020205_100%)]">
                {telegramUser?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={telegramUser.photo_url} alt="Telegram avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-5xl opacity-90">✦</span>
                )}
              </div>
            </div>

            <h2 className="mt-4 text-[30px] font-semibold tracking-tight">{displayName}</h2>
            <p className="mt-1 text-lg font-medium text-fuchsia-400">{username}</p>
            <p className="mt-1 text-base font-medium text-emerald-400">в сети</p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              ["▣+", "Выбрать фото"],
              ["✎", "Изменить"],
              ["⚙", "Настройки"],
            ].map(([icon, label]) => (
              <button key={label} className="min-h-24 rounded-[22px] border border-white/10 bg-white/[0.055] px-2 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition active:scale-[0.97]">
                <span className="mb-2 block text-3xl text-fuchsia-400">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xl font-medium">id: {telegramId}</p>
              <span className="shrink-0 rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">◉ God&apos;s Eye</span>
            </div>
            <InfoField label="Телефон" value="Скрыт Telegram" />
            <InfoField label="О себе" value="TOP SECRET" />
            <InfoField label="Имя пользователя" value={username} />
          </section>

          <div className="mt-3 grid grid-cols-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-1 text-sm">
            <button className="rounded-xl px-3 py-3 font-medium text-fuchsia-300 shadow-[inset_0_-2px_0_#d946ef]">Публикации</button>
            <button className="rounded-xl px-3 py-3 text-white/45">Архив публикаций</button>
          </div>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-md grid-cols-5 border-t border-white/10 bg-[#080812]/94 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
          {navItems.map(([icon, label, badge]) => (
            <button
              key={label}
              onClick={() => label === "AI" && openPanel("compact")}
              className={`relative min-h-14 rounded-2xl text-[11px] transition active:scale-95 ${label === "Профиль" ? "bg-fuchsia-500/10 text-fuchsia-300" : "text-white/70"}`}
            >
              {badge ? <span className="absolute right-2 top-0 rounded-full bg-fuchsia-600 px-1.5 py-0.5 text-[10px] text-white">{badge}</span> : null}
              <span className="block text-2xl">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </section>

      {panel === "closed" ? (
        <button
          onClick={() => openPanel("compact")}
          className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] right-5 z-40 grid h-16 w-16 place-items-center rounded-full border border-fuchsia-300/50 bg-[radial-gradient(circle,#ec4899_0%,#7e22ce_45%,#111827_75%)] text-xl shadow-[0_0_36px_rgba(236,72,153,0.5)]"
          aria-label="Открыть AI Operator"
        >
          💀
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && closePanel()}>
          <section className={`relative mx-auto grid w-full max-w-md grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden border border-cyan-300/30 bg-[linear-gradient(180deg,rgba(9,18,40,0.98),rgba(8,9,22,0.99))] shadow-[0_-20px_70px_rgba(8,145,178,0.18)] ${panel === "compact" ? "h-[62dvh] rounded-t-[28px]" : "h-[100dvh]"}`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#a21caf,#ec4899,#06b6d4)]" />
            <div className="mx-auto mt-2 h-1.5 w-20 rounded-full bg-white/70" />

            <header className="flex items-center justify-between border-b border-white/10 bg-[linear-gradient(90deg,rgba(88,28,135,0.65),rgba(8,47,73,0.62))] px-4 pb-4 pt-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⠿</span>
                  <span className="text-lg">🤖</span>
                  <p className="truncate text-base font-black tracking-tight">EPIC💀CLAW AI OPERATOR</p>
                </div>
                <p className="mt-1 text-[10px] font-medium tracking-[0.24em] text-cyan-200/75">CONVERSATION · ANALYSIS · PLANNING · ACTION</p>
              </div>
              <div className="ml-3 flex gap-1">
                <button onClick={() => setPanel(panel === "compact" ? "expanded" : "compact")} className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-xl" aria-label="Изменить размер панели">⤢</button>
                <button onClick={closePanel} className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-2xl" aria-label="Закрыть">×</button>
              </div>
            </header>

            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 text-sm">
              <span className="text-white/75">Telegram · {username}</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">TDLib ready ●</span>
            </div>

            <div ref={historyRef} className="min-h-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="rounded-2xl border border-fuchsia-400/55 bg-[linear-gradient(90deg,rgba(88,28,135,0.16),rgba(8,47,73,0.22))] p-4 text-sm leading-6 text-white/85">
                <span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-violet-500 text-white">i</span>
                Я проанализировал профиль {username} и подготовил действие. Оно будет выполнено <span className="text-fuchsia-300">только после вашего подтверждения</span>.
              </div>

              {messages.map((message) => (
                <div key={message.id} className={`max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto border-fuchsia-400/40 bg-fuchsia-600/20" : "border-white/10 bg-white/[0.045]"}`}>
                  {message.title ? <p className="mb-1 font-semibold text-fuchsia-300">⌕ {message.title}</p> : null}
                  <p>{message.text}</p>
                  {message.role === "assistant" ? <p className="mt-1 text-xs text-white/35">22:12</p> : null}
                </div>
              ))}

              <div className="rounded-2xl border border-fuchsia-400/60 bg-fuchsia-950/10 p-4">
                <p className="text-sm font-semibold text-fuchsia-300">✣ Действие {actionState === "pending" ? "(ожидает подтверждения)" : actionState === "cancelled" ? "— отменено" : "— разрешено"}</p>
                <p className="mt-2 text-sm text-white/90">Изменить bio на: TOP SECRET // AI MODE</p>

                {actionState === "pending" ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button onClick={() => setActionState("cancelled")} className="min-h-12 rounded-xl border border-red-500/70 bg-red-500/10 font-semibold text-red-400 transition active:scale-95">Deny</button>
                    <button onClick={() => setActionState("approved")} className="min-h-12 rounded-xl border border-emerald-400/60 bg-emerald-400/10 font-semibold text-emerald-300 transition active:scale-95">Allow</button>
                  </div>
                ) : (
                  <div className={`mt-4 rounded-xl px-4 py-3 text-center text-sm font-semibold ${actionState === "cancelled" ? "bg-red-500/10 text-red-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                    {actionState === "cancelled" ? "Отменено · TELEGRAM_MUTATION=false" : "Разрешено · ожидает безопасного executor"}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={submitOperatorMessage} className="border-t border-white/10 bg-[#090b18] px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-end gap-2 rounded-2xl border border-cyan-300/45 bg-white/[0.035] p-2 shadow-[0_0_28px_rgba(14,165,233,0.08)]">
                <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={1} placeholder="Поговори со мной или поставь задачу..." className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/35" />
                <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#7c3aed,#38bdf8)] text-xl font-bold shadow-[0_0_20px_rgba(124,58,237,0.35)]">➤</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-5">
      <p className="text-sm text-white/40">{label}</p>
      <p className="mt-1 text-lg text-white/95">{value}</p>
    </div>
  );
}
