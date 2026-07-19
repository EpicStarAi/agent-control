"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot, ShieldCheck, Smartphone, MessageCircle, Inbox, CheckCircle2, Eye, Lock,
  ArrowRight, ArrowLeft, Sparkles, Menu, X,
} from "lucide-react";
import { ONBOARDING_STEP_COUNT } from "@/lib/onboarding";

// Forced first-run onboarding for EPIC☠GRAM.
//
// Why this exists: a first-time user used to drop straight into the client with
// no explanation. This overlay explains, in plain language, what the product is,
// that the AI operator never sends anything without confirmation, what the
// Approval Gate is, walks the user through connecting their Telegram account,
// and shows where the operator / chats / missions live.
//
// State model:
//  - Progress is persisted PER WORKSPACE in the DB via /api/onboarding/status
//    (never localStorage). This component only reflects that server state.
//  - It is forced when the flow is neither completed nor skipped. It can always
//    be re-opened later from the menu (event `epicgram:onboarding:open`) or with
//    ?onboarding=1 — that is the "пройти заново" (start over) affordance.
//  - The "connect" step does NOT duplicate the Telegram auth UI. It steps aside
//    (renders nothing) to reveal the existing <TelegramBindingWizard/> mounted
//    underneath, then resumes after the wizard reloads on success.
//
// Honesty: no fake success. If no Telegram account is connected, the flow says
// the system cannot do anything yet — it never pretends otherwise.

type OnboardingState = { step: number; completed: boolean; skipped: boolean };

const OPEN_EVENT = "epicgram:onboarding:open";
const OPERATOR_OPEN_EVENT = "epicgram:operator:open";

async function readStatus(): Promise<OnboardingState | null> {
  try {
    const r = await fetch("/api/onboarding/status", { cache: "no-store" });
    if (!r.ok) return null; // 401 => no session; the page guard handles that
    const j = await r.json().catch(() => ({}));
    return (j?.state ?? null) as OnboardingState | null;
  } catch { return null; }
}

async function patchStatus(patch: Partial<OnboardingState> & { reset?: boolean }): Promise<void> {
  try {
    await fetch("/api/onboarding/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
      cache: "no-store",
    });
  } catch { /* best-effort; the overlay still advances locally */ }
}

async function readBound(): Promise<boolean | null> {
  try {
    const r = await fetch("/api/telegram/binding/status", { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    return Boolean(j?.bound || j?.binding?.authState === "ready");
  } catch { return null; }
}

export function OnboardingGate() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [bound, setBound] = useState<boolean | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [forceOpen, setForceOpen] = useState(false);
  const [standAside, setStandAside] = useState(false);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(false);

  // Initial load + honor ?onboarding=1 / #onboarding as a "start over" deep link.
  useEffect(() => {
    mounted.current = true;
    (async () => {
      const [s, b] = await Promise.all([readStatus(), readBound()]);
      if (!mounted.current) return;
      if (s) { setState(s); setStepIdx(Math.min(s.step, ONBOARDING_STEP_COUNT - 1)); }
      setBound(b);
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("onboarding") === "1" || window.location.hash === "#onboarding") {
          setForceOpen(true);
          setStepIdx(0);
        }
      } catch { /* ignore */ }
    })();
    return () => { mounted.current = false; };
  }, []);

  // Re-open from the menu.
  useEffect(() => {
    const onOpen = () => {
      setForceOpen(true);
      setStandAside(false);
      setStepIdx(0);
      readBound().then((b) => { if (mounted.current) setBound(b); });
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Whenever the connect step is shown (or the tab regains focus while active),
  // refresh the real binding status so a just-connected account reflects at once.
  const active = forceOpen || (state ? !state.completed && !state.skipped : false);
  useEffect(() => {
    if (!active) return;
    const refresh = () => readBound().then((b) => { if (mounted.current) setBound(b); });
    if (stepIdx === 3) refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [active, stepIdx]);

  const persistStep = useCallback((idx: number) => {
    setStepIdx(idx);
    void patchStatus({ step: idx });
  }, []);

  const goNext = useCallback(() => {
    if (stepIdx < ONBOARDING_STEP_COUNT - 1) persistStep(stepIdx + 1);
  }, [stepIdx, persistStep]);
  const goBack = useCallback(() => {
    if (stepIdx > 0) persistStep(stepIdx - 1);
  }, [stepIdx, persistStep]);

  const finish = useCallback(async () => {
    setSaving(true);
    await patchStatus({ completed: true });
    if (!mounted.current) return;
    setState({ step: ONBOARDING_STEP_COUNT - 1, completed: true, skipped: false });
    setForceOpen(false);
    setSaving(false);
  }, []);

  const skip = useCallback(async () => {
    setSaving(true);
    await patchStatus({ skipped: true });
    if (!mounted.current) return;
    setState({ step: stepIdx, completed: false, skipped: true });
    setForceOpen(false);
    setSaving(false);
  }, [stepIdx]);

  if (!active) return null;

  // Stepped aside so the underlying <TelegramBindingWizard/> is usable. Show only
  // a small control to return to the guide.
  if (standAside) {
    return (
      <button
        type="button"
        onClick={() => { setStandAside(false); readBound().then((b) => mounted.current && setBound(b)); }}
        className="fixed left-3 z-[210] flex items-center gap-2 rounded-full border border-tg-line bg-tg-panel/95 px-3 py-2 text-xs font-semibold text-tg-text shadow-telegram backdrop-blur"
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <ArrowLeft className="h-4 w-4" /> К онбордингу
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[210] flex flex-col bg-[#07070c]/97 text-tg-text backdrop-blur-sm"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label="Онбординг EPICGRAM"
    >
      {/* Header: brand + progress + skip */}
      <div
        className="flex shrink-0 items-center gap-3 border-b border-tg-line px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-epic-ink ring-1 ring-tg-line">
          <Sparkles className="h-5 w-5 text-tg-accent" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold tracking-wide">EPIC☠GRAM · знакомство</div>
          <div className="mt-1 flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: ONBOARDING_STEP_COUNT }).map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= stepIdx ? "bg-tg-accent" : "bg-tg-line"}`}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={skip}
          disabled={saving}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs text-tg-muted hover:bg-tg-hover hover:text-tg-text disabled:opacity-50"
        >
          Пропустить
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto w-full max-w-md">
          <StepBody stepIdx={stepIdx} bound={bound} onConnect={() => setStandAside(true)} onOpenOperator={() => window.dispatchEvent(new CustomEvent(OPERATOR_OPEN_EVENT))} />
        </div>
      </div>

      {/* Footer nav */}
      <div
        className="flex shrink-0 items-center gap-3 border-t border-tg-line px-5 py-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={goBack}
          disabled={stepIdx === 0 || saving}
          className="flex h-11 items-center gap-2 rounded-xl border border-tg-line bg-tg-panel px-4 text-sm font-semibold text-tg-text disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>
        <div className="flex-1 text-center text-xs text-tg-muted">
          {stepIdx + 1} / {ONBOARDING_STEP_COUNT}
        </div>
        {stepIdx < ONBOARDING_STEP_COUNT - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={saving}
            className="flex h-11 items-center gap-2 rounded-xl bg-tg-accent px-5 text-sm font-bold text-white shadow-[0_0_18px_rgba(255,59,92,.4)] disabled:opacity-60"
          >
            Далее <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={saving}
            className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "…" : "Готово"} <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function StepBody({
  stepIdx, bound, onConnect, onOpenOperator,
}: {
  stepIdx: number;
  bound: boolean | null;
  onConnect: () => void;
  onOpenOperator: () => void;
}) {
  if (stepIdx === 0) {
    return (
      <Panel icon={<Sparkles className="h-7 w-7 text-tg-accent" />} title="Это ваше рабочее место, а не ещё один Telegram">
        <p>
          EPIC☠GRAM — не клиент Telegram. Это рабочее место, где ИИ-оператор берёт на себя
          рутину в ваших Telegram-аккаунтах и каналах: читает чаты, готовит черновики,
          планирует публикации.
        </p>
        <p>
          Владелец — вы. Оператор готовит работу, но решения остаются за вами.
        </p>
      </Panel>
    );
  }
  if (stepIdx === 1) {
    return (
      <Panel icon={<Bot className="h-7 w-7 text-tg-accent" />} title="Оператор работает — вы решаете">
        <p>
          Оператор может подготовить ответ, черновик поста, план рассылки. Но он
          <b> ничего не отправляет и не публикует</b> без вашего явного подтверждения.
        </p>
        <ul className="space-y-2">
          <Bullet icon={<Eye className="h-4 w-4" />}>Читает и анализирует — да.</Bullet>
          <Bullet icon={<Lock className="h-4 w-4" />}>Отправляет сам, без вас — нет.</Bullet>
        </ul>
      </Panel>
    );
  }
  if (stepIdx === 2) {
    return (
      <Panel icon={<ShieldCheck className="h-7 w-7 text-tg-accent" />} title="Подтверждения (Approval Gate)">
        <p>
          Перед любой отправкой оператор показывает карточку подтверждения: <b>что</b> за
          действие, <b>куда</b>, превью текста и время.
        </p>
        <ul className="space-y-2">
          <Bullet icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}>
            «Одобрить» — действие выполняется один раз.
          </Bullet>
          <Bullet icon={<X className="h-4 w-4 text-rose-400" />}>
            «Отклонить» — не происходит ничего.
          </Bullet>
        </ul>
        <p className="text-tg-muted">
          Каждое решение записывается в аудит — его видно в разделе «Безопасность».
        </p>
      </Panel>
    );
  }
  if (stepIdx === 3) {
    return (
      <Panel icon={<Smartphone className="h-7 w-7 text-tg-accent" />} title="Подключите Telegram-аккаунт">
        {bound === true ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <CheckCircle2 className="h-5 w-5" /> Аккаунт подключён
            </div>
            <p className="mt-1 text-[13px] text-tg-muted">
              Оператор теперь может читать ваши чаты и готовить работу. Отправка — только
              после вашего подтверждения.
            </p>
          </div>
        ) : (
          <>
            <p>
              Чтобы оператор мог что-то делать, подключите свой Telegram. Вход официальный —
              по QR-коду или номеру телефона.
            </p>
            <ul className="space-y-2">
              <Bullet icon={<Lock className="h-4 w-4" />}>
                Хранится только зашифрованная сессия на сервере.
              </Bullet>
              <Bullet icon={<Eye className="h-4 w-4" />}>
                Код из Telegram и пароль 2FA не сохраняются.
              </Bullet>
            </ul>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[13px] text-amber-200">
              Пока аккаунт не подключён, система не может выполнять действия — это не
              демонстрация, а честное состояние.
            </div>
            <button
              type="button"
              onClick={onConnect}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-tg-accent text-sm font-bold text-white shadow-[0_0_18px_rgba(255,59,92,.4)]"
            >
              <Smartphone className="h-5 w-5" /> Подключить Telegram
            </button>
          </>
        )}
      </Panel>
    );
  }
  // stepIdx === 4: map
  return (
    <Panel icon={<MessageCircle className="h-7 w-7 text-tg-accent" />} title="Где что находится">
      <ul className="space-y-3">
        <MapRow icon={<Bot className="h-5 w-5 text-tg-accent" />} title="Оператор">
          Красная кнопка «EPIC💀CLAW AI» внизу справа. На телефоне открывается на весь экран.
        </MapRow>
        <MapRow icon={<Menu className="h-5 w-5 text-tg-accent" />} title="Чаты и разделы">
          Список чатов слева. На телефоне — по кнопке-бургеру вверху. Там же все разделы.
        </MapRow>
        <MapRow icon={<Inbox className="h-5 w-5 text-tg-accent" />} title="Миссии">
          Пункт «Центр миссий» в меню — задачи, которые ведёт оператор.
        </MapRow>
      </ul>
      <button
        type="button"
        onClick={onOpenOperator}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-tg-line bg-tg-panel text-sm font-semibold text-tg-text hover:bg-tg-hover"
      >
        <Bot className="h-5 w-5 text-tg-accent" /> Открыть оператора
      </button>
      {bound !== true && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[13px] text-amber-200">
          Совет: Telegram ещё не подключён — вернитесь на шаг «Подключите Telegram», иначе
          оператор пока не сможет действовать.
        </div>
      )}
    </Panel>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-epic-ink ring-1 ring-tg-line">{icon}</div>
      <h2 className="text-xl font-black leading-tight text-white">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-tg-text/90">{children}</div>
    </div>
  );
}

function Bullet({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-tg-muted">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

function MapRow({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-tg-line bg-tg-panel/60 p-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-[13px] text-tg-muted">{children}</div>
      </div>
    </li>
  );
}
