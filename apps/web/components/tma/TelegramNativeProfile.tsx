"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useReducer, useRef, useState } from "react";
import VisualExecutorCursor from "@/components/tma/VisualExecutorCursor";
import {
  clampToViewport,
  initialContext,
  isActive,
  phaseColor,
  reduce,
  resolveTargetSelector,
  saveAudit,
  telegramMutation,
  EXECUTION_MODE,
  DEMO_OLD_BIO,
  DEMO_NEW_BIO,
  type AuditEvent,
  type ExecContext,
  type ExecutionPhase,
  type Point,
} from "@/lib/visualExecutor";

type OperatorPanelState = "closed" | "compact" | "expanded";
type OperatorMessage = { id: string; role: "assistant" | "user"; title?: string; text: string };
type TelegramWebAppUser = { id?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };

declare global {
  interface Window {
    Telegram?: { WebApp?: { ready?: () => void; expand?: () => void; initDataUnsafe?: { user?: TelegramWebAppUser } } };
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

type Overlay = { rect: DOMRect; point: Point; label: string; phase: ExecutionPhase };

const nowISO = () => new Date().toISOString();

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function TelegramNativeProfile() {
  const [panel, setPanel] = useState<OperatorPanelState>("compact");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<OperatorMessage[]>(initialMessages);
  const [telegramUser, setTelegramUser] = useState<TelegramWebAppUser | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const profileScrollRef = useRef(0);

  // The approval-gated visual executor. initialContext() starts in
  // "pending_approval" so the existing action card renders as before.
  const [ctx, dispatch] = useReducer(reduce, undefined, () => initialContext());

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();
    setTelegramUser(webApp?.initDataUnsafe?.user ?? null);
  }, []);

  useEffect(() => {
    if (panel === "closed") return;
    requestAnimationFrame(() => historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" }));
  }, [messages, panel, ctx.state, ctx.currentStepIndex]);

  // Persist the audit trail (structured for a future server audit API).
  useEffect(() => {
    saveAudit(ctx.audit);
  }, [ctx.audit]);

  // --- Executor driver -----------------------------------------------------
  // approved → executing (kick off the plan after the approval is recorded).
  useEffect(() => {
    if (ctx.state !== "approved") return;
    const timer = window.setTimeout(() => dispatch({ type: "START", at: nowISO() }), 480);
    return () => window.clearTimeout(timer);
  }, [ctx.state]);

  // executing → advance one step per tick. Pausing flips state away from
  // "executing", which tears down this timer; resuming re-arms it.
  useEffect(() => {
    if (ctx.state !== "executing") return;
    const delay = prefersReducedMotion() ? 360 : 1050;
    const timer = window.setTimeout(() => dispatch({ type: "ADVANCE", at: nowISO() }), delay);
    return () => window.clearTimeout(timer);
  }, [ctx.state, ctx.currentStepIndex]);

  // --- Cursor / highlight targeting ---------------------------------------
  // While the executor is active, continuously track the active step's target.
  // Resolution goes ONLY through the allowlisted attribute selector, scoped to
  // this component's root — no text search, no arbitrary CSS. We poll on a short
  // interval rather than requestAnimationFrame so tracking keeps working even
  // when the page is backgrounded (rAF is paused for hidden tabs); the cursor's
  // CSS transition keeps motion smooth between samples. reduced-motion disables
  // that transition in the cursor component itself.
  const currentStep = ctx.steps[ctx.currentStepIndex];
  const targetId = isActive(ctx) && ctx.state !== "approved" ? currentStep?.targetId : undefined;
  const stepLabel = currentStep?.label ?? "";
  const stepPhase: ExecutionPhase = currentStep?.phase ?? "analysis";

  useEffect(() => {
    if (!targetId) {
      setOverlay(null);
      return;
    }
    const selector = resolveTargetSelector(targetId);
    if (!selector) {
      setOverlay(null);
      return;
    }
    let lastKey = "";
    const measure = () => {
      const el = rootRef.current?.querySelector(selector) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const key = `${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
      if (key === lastKey) return;
      lastKey = key;
      const raw = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const point = clampToViewport(raw, {
        width: window.innerWidth,
        height: window.innerHeight,
        safeTop: 16,
        safeBottom: 16,
        safeLeft: 8,
        safeRight: 8,
        margin: 18,
      });
      setOverlay({ rect, point, label: stepLabel, phase: stepPhase });
    };
    measure();
    const interval = window.setInterval(measure, 120);
    return () => window.clearInterval(interval);
  }, [targetId, stepLabel, stepPhase]);

  const displayName = useMemo(() => {
    const name = [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ").trim();
    return name || "☠️CENSORED";
  }, [telegramUser]);

  const username = telegramUser?.username ? `@${telegramUser.username}` : "@EpicStarAi";
  const telegramId = telegramUser?.id ? String(telegramUser.id) : "—";

  // Show the staged draft while the (simulated) form is open, otherwise the
  // committed local-demo bio. Only COMMIT_SAVE moves draftBio → bio.
  const showingDraft =
    ctx.formOpen &&
    ctx.draftBio !== ctx.bio &&
    (ctx.state === "executing" || ctx.state === "paused" || ctx.state === "awaiting_final_confirmation");
  const bioValue = showingDraft ? ctx.draftBio : ctx.bio;

  function openPanel(next: OperatorPanelState) {
    profileScrollRef.current = window.scrollY;
    setPanel(next);
  }

  // "Скрыть окно" / close — hides the operator WITHOUT cancelling: execution
  // context is preserved and can be resumed via "Вернуть оператора".
  function hidePanel() {
    setPanel("closed");
    requestAnimationFrame(() => window.scrollTo({ top: profileScrollRef.current }));
  }

  function submitOperatorMessage(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    // Read-only path: appends chat only. It must NOT start or mutate the executor.
    dispatch({ type: "READ_ONLY_MESSAGE" });
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

  const executorRunning = isActive(ctx) || ctx.state === "completed" || ctx.state === "cancelled" || ctx.state === "failed";

  return (
    <main ref={rootRef} className="min-h-[100dvh] overflow-x-hidden bg-[#05050a] text-white selection:bg-fuchsia-500/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(217,70,239,0.12),transparent_25%),radial-gradient(circle_at_85%_70%,rgba(6,182,212,0.08),transparent_25%)]" />

      <section className="relative mx-auto min-h-[100dvh] w-full max-w-md pb-[calc(86px+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-[#05050a]/88 px-4 pb-3 pt-[calc(10px+env(safe-area-inset-top))] backdrop-blur-2xl">
          <IconButton label="Назад"><ArrowLeftIcon /></IconButton>
          <h1 className="text-[22px] font-semibold">Профиль</h1>
          <IconButton label="Меню"><DotsIcon /></IconButton>
        </header>

        <div className="px-4 pt-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-36 w-36 rounded-full p-[3px] shadow-[0_0_46px_rgba(217,70,239,0.42)]">
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#22d3ee,#7c3aed,#ec4899,#a21caf,#22d3ee)] blur-[1px]" />
              <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_45%,#11152a_0%,#080812_58%,#020205_100%)]">
                {telegramUser?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={telegramUser.photo_url} alt="Telegram avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-[radial-gradient(circle,#1e293b_0%,#020617_65%)] shadow-[0_0_32px_rgba(59,130,246,0.3)]" />
                )}
              </div>
            </div>
            <h2 className="mt-4 text-[30px] font-semibold tracking-tight">{displayName}</h2>
            <p className="mt-1 text-lg font-medium text-fuchsia-400">{username}</p>
            <p className="mt-1 text-base font-medium text-emerald-400">в сети</p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <ActionButton icon={<CameraIcon />} label="Выбрать фото" />
            <ActionButton icon={<EditIcon />} label="Изменить" targetId="profile-edit-button" />
            <ActionButton icon={<SettingsIcon />} label="Настройки" />
          </div>

          <section
            data-epic-target="profile-card"
            className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xl font-medium">id: {telegramId}</p>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200"><EyeIcon />God&apos;s Eye</span>
            </div>
            <InfoField label="Телефон" value="Скрыт Telegram" />
            <InfoField
              label="О себе"
              value={bioValue}
              targetId="profile-bio-field"
              badge={showingDraft ? "черновик" : undefined}
            />
            <InfoField label="Имя пользователя" value={username} />
          </section>

          <div className="mt-3 grid grid-cols-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-1 text-sm">
            <button className="rounded-xl px-3 py-3 font-medium text-fuchsia-300 shadow-[inset_0_-2px_0_#d946ef]">Публикации</button>
            <button className="rounded-xl px-3 py-3 text-white/45">Архив публикаций</button>
          </div>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-md grid-cols-5 border-t border-white/10 bg-[#080812]/94 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
          <NavItem icon={<ChatIcon />} label="Чаты" badge="75" />
          <NavItem icon={<UserIcon />} label="Контакты" />
          <NavItem icon={<SparkIcon />} label="AI" onClick={() => openPanel("compact")} />
          <NavItem icon={<SettingsIcon />} label="Настройки" />
          <NavItem icon={<ProfileOrb />} label="Профиль" active />
        </nav>
      </section>

      {/* Action highlight overlay — a separate element that never mutates the
          target's own styles and is removed when the step changes. */}
      {overlay ? (
        <div
          aria-hidden="true"
          data-epic-highlight="1"
          style={{
            position: "fixed",
            left: overlay.rect.left - 6,
            top: overlay.rect.top - 6,
            width: overlay.rect.width + 12,
            height: overlay.rect.height + 12,
            borderRadius: 18,
            border: `2px solid ${phaseColor(overlay.phase)}`,
            boxShadow: `0 0 0 3px ${phaseColor(overlay.phase)}33, 0 0 26px ${phaseColor(overlay.phase)}88 inset`,
            pointerEvents: "none",
            zIndex: 200,
            // Animate only geometry, never colour — phase colour should switch
            // instantly (a colour transition can also stall on hidden tabs).
            transition: prefersReducedMotion()
              ? "none"
              : "left 300ms cubic-bezier(0.22,1,0.36,1), top 300ms cubic-bezier(0.22,1,0.36,1), width 300ms cubic-bezier(0.22,1,0.36,1), height 300ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      ) : null}

      {/* AI cursor — pointer-events:none, cannot click anything. */}
      <VisualExecutorCursor
        visible={!!overlay && panel !== "closed"}
        position={overlay?.point ?? { x: -100, y: -100 }}
        label={overlay?.label ?? ""}
        phase={overlay?.phase ?? "analysis"}
      />

      {panel === "closed" ? (
        <button
          onClick={() => openPanel("compact")}
          className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] right-5 z-40 flex items-center gap-2 rounded-full border border-fuchsia-300/50 bg-[radial-gradient(circle,#ec4899_0%,#7e22ce_45%,#111827_75%)] px-3 py-2 shadow-[0_0_36px_rgba(236,72,153,0.5)]"
          aria-label={executorRunning ? "Вернуть оператора" : "Открыть AI Operator"}
        >
          <SkullIcon />
          {executorRunning ? <span className="pr-1 text-xs font-semibold">Вернуть оператора</span> : null}
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && hidePanel()}>
          <section className={`relative mx-auto grid w-full max-w-md grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden border border-cyan-300/30 bg-[linear-gradient(180deg,rgba(9,18,40,0.98),rgba(8,9,22,0.99))] shadow-[0_-20px_70px_rgba(8,145,178,0.18)] ${panel === "compact" ? "h-[58dvh] rounded-t-[28px]" : "h-[100dvh]"}`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#a21caf,#ec4899,#06b6d4)]" />
            <div className="mx-auto mt-2 h-1.5 w-20 rounded-full bg-white/70" />

            <header className="flex items-center justify-between border-b border-white/10 bg-[linear-gradient(90deg,rgba(88,28,135,0.68),rgba(8,47,73,0.66))] px-4 pb-4 pt-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <GridIcon /><BotIcon />
                  <p className="truncate text-base font-black tracking-tight">EPIC💀CLAW AI OPERATOR</p>
                </div>
                <p className="mt-1 text-[10px] font-medium tracking-[0.24em] text-cyan-200/75">CONVERSATION · ANALYSIS · PLANNING · ACTION</p>
              </div>
              <div className="ml-3 flex gap-1">
                <IconButton label="Изменить размер" onClick={() => setPanel(panel === "compact" ? "expanded" : "compact")}><ExpandIcon /></IconButton>
                <IconButton label="Скрыть окно" onClick={hidePanel}><CloseIcon /></IconButton>
              </div>
            </header>

            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 text-sm">
              <span className="truncate text-white/75">Telegram · {username}</span>
              <span className="ml-3 shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">TDLib ready ●</span>
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

              {ctx.state === "pending_approval" ? (
                <div className="rounded-2xl border border-fuchsia-400/60 bg-fuchsia-950/10 p-4">
                  <p className="text-sm font-semibold text-fuchsia-300">✣ Действие (ожидает подтверждения)</p>
                  <p className="mt-2 text-sm text-white/90">Изменить bio на: {DEMO_NEW_BIO}</p>
                  <p className="mt-1 text-xs text-white/45">Первое подтверждение разрешает только подготовительный план. Сохранение потребует отдельного подтверждения.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button onClick={() => dispatch({ type: "DENY", at: nowISO() })} className="min-h-12 rounded-xl border border-red-500/70 bg-red-500/10 font-semibold text-red-400 transition active:scale-95">Отмена</button>
                    <button onClick={() => dispatch({ type: "APPROVE", at: nowISO() })} className="min-h-12 rounded-xl border border-emerald-400/60 bg-emerald-400/10 font-semibold text-emerald-300 transition active:scale-95">Разрешить</button>
                  </div>
                </div>
              ) : null}

              {executorRunning ? (
                <ProgressPanel
                  ctx={ctx}
                  onPause={() => dispatch({ type: "PAUSE", at: nowISO() })}
                  onResume={() => dispatch({ type: "RESUME", at: nowISO() })}
                  onCancel={() => dispatch({ type: "CANCEL", at: nowISO() })}
                  onHide={hidePanel}
                />
              ) : null}

              {ctx.state === "awaiting_final_confirmation" ? (
                <div className="rounded-2xl border border-amber-400/70 bg-amber-500/[0.08] p-4">
                  <p className="text-sm font-semibold text-amber-200">⚠ Сохранить изменения профиля?</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-white/70">Старое: <span className="text-white/90">{DEMO_OLD_BIO}</span></p>
                    <p className="text-white/70">Новое: <span className="font-semibold text-amber-100">{DEMO_NEW_BIO}</span></p>
                  </div>
                  <p className="mt-2 text-xs text-white/45">EXECUTION_MODE={EXECUTION_MODE} · TELEGRAM_MUTATION={String(telegramMutation(ctx))}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button onClick={() => dispatch({ type: "BACK", at: nowISO() })} className="min-h-12 rounded-xl border border-white/20 bg-white/[0.05] text-sm font-semibold text-white/80 transition active:scale-95">Назад</button>
                    <button onClick={() => dispatch({ type: "CANCEL", at: nowISO() })} className="min-h-12 rounded-xl border border-red-500/70 bg-red-500/10 text-sm font-semibold text-red-400 transition active:scale-95">Отмена</button>
                    <button
                      data-epic-target="profile-save-button"
                      onClick={() => dispatch({ type: "COMMIT_SAVE", at: nowISO() })}
                      className="min-h-12 rounded-xl border border-emerald-400/60 bg-emerald-400/15 text-sm font-semibold text-emerald-200 transition active:scale-95"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : null}

              {ctx.audit.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <button
                    onClick={() => setShowAudit((value) => !value)}
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-cyan-200"
                  >
                    <span>⌗ Журнал аудита · {ctx.audit.length}</span>
                    <span className="text-white/40">{showAudit ? "▾" : "▸"}</span>
                  </button>
                  {showAudit ? (
                    <ol className="mt-3 space-y-1.5 text-xs">
                      {ctx.audit.map((entry: AuditEvent) => (
                        <li key={entry.id} className="flex items-start justify-between gap-3 border-l-2 border-cyan-400/30 pl-2">
                          <span className="text-white/80">
                            <span className="font-mono text-cyan-300">{entry.event}</span>
                            {entry.stepId ? <span className="text-white/45"> · {entry.stepId}</span> : null}
                            {entry.result ? <span className="text-white/45"> · {entry.result}</span> : null}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-white/30">{entry.timestamp ? entry.timestamp.slice(11, 19) : ""}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              ) : null}
            </div>

            <form onSubmit={submitOperatorMessage} className="border-t border-white/10 bg-[#090b18] px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-end gap-2 rounded-2xl border border-cyan-300/45 bg-white/[0.035] p-2 shadow-[0_0_28px_rgba(14,165,233,0.08)]">
                <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={1} placeholder="Поговори со мной или поставь задачу..." className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/35" />
                <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#7c3aed,#38bdf8)] shadow-[0_0_20px_rgba(124,58,237,0.35)]"><SendIcon /></button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function ProgressPanel({
  ctx,
  onPause,
  onResume,
  onCancel,
  onHide,
}: {
  ctx: ExecContext;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onHide: () => void;
}) {
  const finished = ctx.state === "completed" || ctx.state === "cancelled" || ctx.state === "failed";
  const headline =
    ctx.state === "completed"
      ? "Задача выполнена (local demo)"
      : ctx.state === "cancelled"
        ? "Задача отменена"
        : ctx.state === "failed"
          ? "Задача прервана"
          : "Выполнение задачи";

  return (
    <div className="rounded-2xl border border-cyan-300/40 bg-cyan-950/10 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-cyan-200">▤ {headline}</p>
        <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-white/60">{ctx.state}</span>
      </div>

      <ol className="mt-3 space-y-2">
        {ctx.steps.map((step, index) => {
          const color = phaseColor(step.phase);
          const symbol =
            step.status === "completed" ? "✓" : step.status === "active" ? "◔" : step.status === "cancelled" ? "✕" : step.status === "failed" ? "!" : index + 1;
          return (
            <li key={step.id} className="flex items-center gap-3 text-sm">
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold"
                style={{
                  borderColor: step.status === "pending" ? "rgba(255,255,255,0.2)" : color,
                  color: step.status === "pending" ? "rgba(255,255,255,0.5)" : color,
                  background: step.status === "active" ? `${color}22` : "transparent",
                }}
              >
                {symbol}
              </span>
              <span className={step.status === "pending" ? "text-white/45" : "text-white/90"}>{step.label}</span>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 font-mono text-[10px] text-white/40">
        ACTION_STATE={ctx.state} · TELEGRAM_MUTATION={String(telegramMutation(ctx))} · EXECUTION_MODE={EXECUTION_MODE}
      </p>

      {!finished ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {ctx.state === "paused" ? (
            <button onClick={onResume} className="min-h-11 rounded-xl border border-emerald-400/50 bg-emerald-400/10 text-sm font-semibold text-emerald-200 transition active:scale-95">Продолжить</button>
          ) : (
            <button
              onClick={onPause}
              disabled={ctx.state !== "executing"}
              className="min-h-11 rounded-xl border border-cyan-300/50 bg-cyan-400/10 text-sm font-semibold text-cyan-200 transition active:scale-95 disabled:opacity-40"
            >
              Пауза
            </button>
          )}
          <button onClick={onCancel} className="min-h-11 rounded-xl border border-red-500/60 bg-red-500/10 text-sm font-semibold text-red-400 transition active:scale-95">Отмена</button>
          <button onClick={onHide} className="min-h-11 rounded-xl border border-white/20 bg-white/[0.05] text-sm font-semibold text-white/80 transition active:scale-95">Скрыть окно</button>
        </div>
      ) : null}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className="grid h-11 w-11 place-items-center rounded-full text-white/80 transition hover:bg-white/5 active:scale-95" aria-label={label}>{children}</button>;
}

function ActionButton({ icon, label, targetId }: { icon: ReactNode; label: string; targetId?: string }) {
  return <button data-epic-target={targetId} className="min-h-24 rounded-[22px] border border-white/10 bg-white/[0.055] px-2 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition active:scale-[0.97]"><span className="mx-auto mb-2 grid h-8 w-8 place-items-center text-fuchsia-400">{icon}</span>{label}</button>;
}

function NavItem({ icon, label, badge, active = false, onClick }: { icon: ReactNode; label: string; badge?: string; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`relative min-h-14 rounded-2xl text-[11px] transition active:scale-95 ${active ? "bg-fuchsia-500/10 text-fuchsia-300" : "text-white/70"}`}>{badge ? <span className="absolute right-2 top-0 rounded-full bg-fuchsia-600 px-1.5 py-0.5 text-[10px] text-white">{badge}</span> : null}<span className="mx-auto mb-0.5 grid h-6 w-6 place-items-center">{icon}</span>{label}</button>;
}

function InfoField({ label, value, targetId, badge }: { label: string; value: string; targetId?: string; badge?: string }) {
  return (
    <div className="mt-5" data-epic-target={targetId}>
      <div className="flex items-center gap-2">
        <p className="text-sm text-white/40">{label}</p>
        {badge ? <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">{badge}</span> : null}
      </div>
      <p className="mt-1 text-lg text-white/95">{value}</p>
    </div>
  );
}

const Svg = ({ children, className = "h-6 w-6" }: { children: ReactNode; className?: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{children}</svg>;
const ArrowLeftIcon = () => <Svg><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></Svg>;
const DotsIcon = () => <Svg><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></Svg>;
const CameraIcon = () => <Svg><path d="M14.5 4 16 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2l1.5-3z"/><circle cx="12" cy="13" r="3"/><path d="M19 3v4M17 5h4"/></Svg>;
const EditIcon = () => <Svg><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></Svg>;
const SettingsIcon = () => <Svg><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></Svg>;
const EyeIcon = () => <Svg className="h-5 w-5"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Svg>;
const ChatIcon = () => <Svg><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-4.8A8 8 0 1 1 21 15z"/></Svg>;
const UserIcon = () => <Svg><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Svg>;
const SparkIcon = () => <Svg><path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></Svg>;
const ProfileOrb = () => <span className="block h-6 w-6 rounded-full border border-fuchsia-400 bg-[radial-gradient(circle,#111827_35%,#ec4899_100%)] shadow-[0_0_14px_rgba(236,72,153,.7)]"/>;
const SkullIcon = () => <span className="text-2xl">💀</span>;
const GridIcon = () => <Svg className="h-5 w-5"><circle cx="5" cy="5" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="19" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="19" cy="19" r="1"/></Svg>;
const BotIcon = () => <Svg className="h-5 w-5"><rect x="4" y="7" width="16" height="11" rx="3"/><path d="M12 3v4"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><path d="M8 16h8"/></Svg>;
const ExpandIcon = () => <Svg><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></Svg>;
const CloseIcon = () => <Svg><path d="m6 6 12 12M18 6 6 18"/></Svg>;
const SendIcon = () => <Svg><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></Svg>;
