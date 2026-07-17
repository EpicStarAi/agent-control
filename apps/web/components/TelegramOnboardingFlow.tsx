"use client";
// TelegramOnboardingFlow — P0 Per-User Telegram Binding UI
// Embedded inside EpicGramShell. No routing, no demo/mock data.

import { useCallback, useEffect, useRef, useState } from "react";
import type { BindingStatus, TelegramBindingAuthState } from "../lib/telegramBindings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OnboardingProps {
  binding: BindingStatus;
  onStateChange?: (status: BindingStatus) => void;
}

type Step = "idle" | "qr" | "phone" | "code" | "password" | "success" | "error" | "closed";

const STEPPERS: Record<Step, string> = {
  idle: "Начало",
  qr: "QR-код",
  phone: "Телефон",
  code: "Код",
  password: "2FA",
  success: "Готово",
  error: "Ошибка",
  closed: "Отключено",
};

// Country codes for phone input
const COUNTRIES = [
  { code: "+380", label: "🇺🇦 Украина", default: true },
  { code: "+7",   label: "🇷🇺 Россия" },
  { code: "+1",   label: "🇺🇸 США" },
  { code: "+44",  label: "🇬🇧 Британия" },
  { code: "+49",  label: "🇩🇪 Германия" },
  { code: "+33",  label: "🇫🇷 Франция" },
];

const POLL_INTERVAL_MS = 2000;

// ---------------------------------------------------------------------------
// QR Panel
// ---------------------------------------------------------------------------
function QrPanel({
  qrLink,
  onReset,
}: {
  qrLink: string | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="text-sm text-white/60">Сканируйте QR-код в приложении Telegram</div>
      {qrLink ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          {/* Telegram QR codes are tg:// links. Render as a styled card with the link. */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl">📱</div>
            <div className="max-w-[200px] truncate text-center text-xs text-fuchsia-300/80 break-all">
              {qrLink}
            </div>
            <div className="text-[11px] text-white/40">
              Откройте Telegram → Настройки → Устройства → Подключить по QR
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-40 h-40 rounded-xl border border-white/10 bg-white/5">
          <div className="text-white/30 text-sm animate-pulse">Загрузка...</div>
        </div>
      )}
      <button
        onClick={onReset}
        className="text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        Отмена
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone Input
// ---------------------------------------------------------------------------
function PhoneInput({
  defaultCountry,
  onSubmit,
  loading,
  error,
}: {
  defaultCountry: string;
  onSubmit: (phone: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [country, setCountry] = useState(
    COUNTRIES.find((c) => c.code === defaultCountry)?.code ?? "+380"
  );
  const [number, setNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim()) return;
    onSubmit(`${country}${number.replace(/\D/g, "")}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
      <div className="text-sm text-white/60">
        Введите номер телефона, привязанного к Telegram
      </div>
      <div className="flex gap-2">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/80 focus:border-fuchsia-500/50 focus:outline-none"
          style={{ minWidth: 52 }}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-[#0a0814]">
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="90 XXX XX XX"
          className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-fuchsia-500/50 focus:outline-none"
          autoFocus
          disabled={loading}
        />
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !number.trim()}
        className="rounded-xl bg-fuchsia-600/40 px-4 py-2.5 text-sm font-semibold text-fuchsia-100 transition-all hover:bg-fuchsia-600/60 disabled:opacity-40"
      >
        {loading ? "Отправка..." : "Получить код"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Code Input
// ---------------------------------------------------------------------------
function CodeInput({
  phoneMasked,
  onSubmit,
  onBack,
  loading,
  error,
}: {
  phoneMasked: string | null;
  onSubmit: (code: string) => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onSubmit(code.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
      <div className="text-sm text-white/60">
        Введите код, отправленный на{" "}
        <span className="text-white/80">{phoneMasked ?? "Telegram"}</span>
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="12345"
        maxLength={8}
        className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.3em] text-white placeholder-white/20 focus:border-fuchsia-500/50 focus:outline-none"
        autoFocus
        disabled={loading}
      />
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/10 transition-colors"
        >
          Назад
        </button>
        <button
          type="submit"
          disabled={loading || code.length < 3}
          className="flex-1 rounded-xl bg-fuchsia-600/40 px-4 py-2.5 text-sm font-semibold text-fuchsia-100 transition-all hover:bg-fuchsia-600/60 disabled:opacity-40"
        >
          {loading ? "Проверка..." : "Подтвердить"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// 2FA Password Input
// ---------------------------------------------------------------------------
function PasswordInput({
  onSubmit,
  onBack,
  loading,
  error,
}: {
  onSubmit: (password: string) => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [pwd, setPwd] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd) return;
    onSubmit(pwd);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
      <div className="text-sm text-white/60">
        Введите пароль двухфакторной авторизации
      </div>
      <input
        ref={inputRef}
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        placeholder="Пароль 2FA"
        className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-fuchsia-500/50 focus:outline-none"
        autoFocus
        disabled={loading}
      />
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/10 transition-colors"
        >
          Назад
        </button>
        <button
          type="submit"
          disabled={loading || !pwd}
          className="flex-1 rounded-xl bg-fuchsia-600/40 px-4 py-2.5 text-sm font-semibold text-fuchsia-100 transition-all hover:bg-fuchsia-600/60 disabled:opacity-40"
        >
          {loading ? "Проверка..." : "Подтвердить"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Success / Error / Closed states
// ---------------------------------------------------------------------------
function SuccessPanel({ onClose }: { onClose: () => void }) {
  // Auto-close after 2s and refresh the chat list / binding display
  useEffect(() => {
    const t = setTimeout(() => onClose(), 2000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="text-5xl">✅</div>
      <div className="text-base font-semibold text-emerald-300">Telegram подключён!</div>
      <div className="text-sm text-white/50">Привязка активна. Сообщения доступны.</div>
      <div className="text-xs text-white/30 animate-pulse">Закрытие окна…</div>
      <button
        onClick={onClose}
        className="mt-1 rounded-xl border border-white/10 bg-white/5 px-6 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
      >
        Закрыть
      </button>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
  onClose,
}: {
  message: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="text-5xl">⚠️</div>
      <div className="text-sm font-semibold text-red-300">{message ?? "Произошла ошибка"}</div>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors"
        >
          Закрыть
        </button>
        <button
          onClick={onRetry}
          className="rounded-xl bg-fuchsia-600/40 px-4 py-2 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-600/60 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Onboarding Flow Component
// ---------------------------------------------------------------------------
export function TelegramOnboardingFlow({ binding, onStateChange }: OnboardingProps) {
  // Determine current step from binding state
  const authState: TelegramBindingAuthState = binding.binding?.authState ?? "init";
  const authFlow = binding.authFlow;

  const [step, setStep] = useState<Step>(() => {
    switch (authState) {
      case "waiting_qr":       return "qr";
      case "waiting_code":     return authFlow?.type === "phone" ? "phone" : "code";
      case "waiting_password": return "password";
      case "ready":            return "success";
      case "error":            return "error";
      case "closed":           return "closed";
      default:                 return "idle";
    }
  });

  // Sync step when binding prop changes (e.g., after polling update)
  useEffect(() => {
    switch (authState) {
      case "waiting_qr":       setStep("qr"); break;
      case "waiting_code":     setStep("code"); break;
      case "waiting_password": setStep("password"); break;
      case "ready":            setStep("success"); break;
      case "error":            setStep("error"); break;
      case "closed":           setStep("closed"); break;
      default:                 setStep("idle");
    }
  }, [authState]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Trigger state change upward
  const notifyChange = useCallback(
    (s: BindingStatus) => {
      onStateChange?.(s);
    },
    [onStateChange]
  );

  // Poll for status updates (every 2s)
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    abortRef.current = new AbortController();

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/telegram/binding/qr", {
          signal: abortRef.current!.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: BindingStatus = await res.json();
        notifyChange(data);
      } catch {
        // abort/silent
      }
    }, POLL_INTERVAL_MS);
  }, [notifyChange]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Stop polling when step leaves qr
  useEffect(() => {
    if (step === "qr") {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [step, startPolling, stopPolling]);

  // ---- Actions ----

  const handleStartQr = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/binding/qr", {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        notifyChange(data.status as BindingStatus);
        setStep("qr");
      } else {
        setError(data.reason ?? "Ошибка запуска QR");
      }
    } catch {
      setError("Не удалось запустить QR. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/binding/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        notifyChange(data.status as BindingStatus);
        if (data.status?.authFlow?.type === "phone") {
          setStep("code");
        } else {
          setStep("code");
        }
      } else {
        setError(data.reason ?? "Ошибка отправки номера");
      }
    } catch {
      setError("Не удалось отправить номер. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/binding/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        notifyChange(data.status as BindingStatus);
        const newState = (data.status as BindingStatus).binding?.authState;
        if (newState === "waiting_password") {
          setStep("password");
        } else if (newState === "ready") {
          setStep("success");
        } else {
          setStep("code");
          setError(data.reason ?? "Неверный код");
        }
      } else {
        setError(data.reason ?? "Неверный код");
      }
    } catch {
      setError("Не удалось проверить код. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/binding/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        notifyChange(data.status as BindingStatus);
        const newState = (data.status as BindingStatus).binding?.authState;
        if (newState === "ready") {
          setStep("success");
        } else {
          setError(data.reason ?? "Неверный пароль");
        }
      } else {
        setError(data.reason ?? "Неверный пароль");
      }
    } catch {
      setError("Не удалось проверить пароль. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/binding/reset", {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        notifyChange(data.status as BindingStatus);
        setStep("idle");
      }
    } catch {
      setError("Не удалось сбросить. Обновите страницу.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    await handleReset();
    if (step === "error") setStep("idle");
  };

  // Stepper navigation
  const stepIndex = (s: Step) => {
    const order: Step[] = ["idle", "qr", "phone", "code", "password", "success", "error", "closed"];
    return order.indexOf(s);
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Stepper */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 overflow-x-auto">
        {(["idle", "qr", "phone", "code", "password", "success"] as Step[]).map((s, i, arr) => {
          const current = stepIndex(step);
          const thisIdx = stepIndex(s);
          const done = thisIdx < current;
          const active = s === step;
          return (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] transition-all whitespace-nowrap ${
                  done
                    ? "text-emerald-400/70"
                    : active
                    ? "bg-fuchsia-600/30 text-fuchsia-200"
                    : "text-white/25"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                    done
                      ? "bg-emerald-500/30 text-emerald-300"
                      : active
                      ? "bg-fuchsia-500/30 text-fuchsia-200"
                      : "bg-white/10 text-white/30"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span className="hidden sm:inline">{STEPPERS[s]}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`w-3 h-px mx-0.5 ${done ? "bg-emerald-500/30" : "bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/5" />

      {/* Panel content */}
      <div className="px-4 pb-4 pt-3">
        {step === "idle" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="text-center">
              <div className="text-4xl mb-2">🔗</div>
              <div className="text-sm font-semibold text-white/80">Подключить Telegram</div>
              <div className="mt-1 text-xs text-white/40">
                Привяжите свой аккаунт для работы с чатами и сообщениями
              </div>
            </div>

            {/* Feature list */}
            <div className="rounded-xl border border-white/5 bg-white/3 p-3 space-y-1.5">
              {[
                "Просмотр чатов и сообщений",
                "QR-код или номер телефона",
                "Без отправки сообщений (P0)",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-white/50">
                  <span className="text-emerald-400/60">✓</span>
                  {f}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleStartQr}
                disabled={loading}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70 hover:bg-white/10 transition-all disabled:opacity-40"
              >
                <span className="text-xl">📱</span>
                <span className="font-medium">QR-код</span>
                <span className="text-[10px] text-white/30">Быстро</span>
              </button>
              <button
                onClick={() => setStep("phone")}
                disabled={loading}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70 hover:bg-white/10 transition-all disabled:opacity-40"
              >
                <span className="text-xl">📞</span>
                <span className="font-medium">По номеру</span>
                <span className="text-[10px] text-white/30">Через код</span>
              </button>
            </div>
          </div>
        )}

        {step === "qr" && (
          <QrPanel
            qrLink={authFlow?.qrLink ?? null}
            onReset={handleReset}
          />
        )}

        {step === "phone" && (
          <PhoneInput
            defaultCountry="+380"
            onSubmit={handlePhoneSubmit}
            loading={loading}
            error={error}
          />
        )}

        {step === "code" && (
          <CodeInput
            phoneMasked={binding.binding?.phoneMasked ?? authFlow?.phoneMasked ?? null}
            onSubmit={handleCodeSubmit}
            onBack={handleReset}
            loading={loading}
            error={error}
          />
        )}

        {step === "password" && (
          <PasswordInput
            onSubmit={handlePasswordSubmit}
            onBack={handleReset}
            loading={loading}
            error={error}
          />
        )}

        {step === "success" && <SuccessPanel onClose={() => notifyChange(binding)} />}

        {step === "error" && (
          <ErrorPanel
            message={binding.binding?.authError ?? error}
            onRetry={handleRetry}
            onClose={() => notifyChange(binding)}
          />
        )}

        {step === "closed" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="text-5xl">🔌</div>
            <div className="text-sm text-white/60">Аккаунт отключён.</div>
            <button
              onClick={handleRetry}
              className="rounded-xl bg-fuchsia-600/40 px-4 py-2 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-600/60 transition-colors"
            >
              Подключить снова
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
