"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, QrCode, Smartphone } from "lucide-react";

type LoginMode = "phone" | "qr";
type LoginStep = "choose" | "code" | "password" | "progress" | "ready";

type TelegramAccount = {
  slotId?: string;
  id?: string;
  displayName?: string;
  phoneMasked?: string | null;
  authorizationState?: string | null;
  status?: string | null;
  active?: boolean;
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

const countries = [
  { code: "UA", flag: "🇺🇦", name: "Украина", dial: "+380" },
  { code: "PL", flag: "🇵🇱", name: "Польша", dial: "+48" },
  { code: "DE", flag: "🇩🇪", name: "Германия", dial: "+49" },
  { code: "CZ", flag: "🇨🇿", name: "Чехия", dial: "+420" },
  { code: "RO", flag: "🇷🇴", name: "Румыния", dial: "+40" },
  { code: "US", flag: "🇺🇸", name: "США", dial: "+1" },
  { code: "GB", flag: "🇬🇧", name: "Великобритания", dial: "+44" },
  { code: "GE", flag: "🇬🇪", name: "Грузия", dial: "+995" },
  { code: "TR", flag: "🇹🇷", name: "Турция", dial: "+90" },
  { code: "KZ", flag: "🇰🇿", name: "Казахстан", dial: "+7" },
];

function isReady(status: TelegramStatus | null) {
  return status?.runtime === "ready" || status?.authorizationState === "authorizationStateReady";
}

function activeAccount(status: TelegramStatus | null) {
  return status?.account ?? status?.accounts?.find((item) => item.active) ?? status?.accounts?.[0] ?? null;
}

export default function SimpleTelegramLogin() {
  const [mode, setMode] = useState<LoginMode>("phone");
  const [step, setStep] = useState<LoginStep>("choose");
  const [countryCode, setCountryCode] = useState("UA");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [message, setMessage] = useState("Выберите удобный способ входа.");
  const [busy, setBusy] = useState(false);

  const country = useMemo(
    () => countries.find((item) => item.code === countryCode) ?? countries[0],
    [countryCode],
  );
  const account = activeAccount(status);
  const accountId = status?.activeAccountId ?? account?.slotId ?? "main";

  useEffect(() => {
    let cancelled = false;

    async function syncStatus() {
      const response = await fetch("/api/telegram/status", { cache: "no-store" });
      const next = (await response.json()) as TelegramStatus;
      if (cancelled) return;
      setStatus(next);

      if (isReady(next)) {
        setStep("ready");
        setMessage(next.account?.displayName ? `Аккаунт подключён: ${next.account.displayName}` : "Telegram подключён.");
        return;
      }

      if (next.authorizationState === "authorizationStateWaitCode") setStep("code");
      if (next.authorizationState === "authorizationStateWaitPassword") setStep("password");
      if (next.qrLink && mode === "qr") setStep("progress");
    }

    syncStatus().catch(() => setMessage("Не удалось получить статус Telegram."));
    const timer = window.setInterval(() => syncStatus().catch(() => undefined), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    const qrLink = status?.qrLink;
    if (!qrLink) {
      setQrDataUrl("");
      return undefined;
    }

    import("qrcode")
      .then(async (qrcode) => {
        const toDataUrl = qrcode.toDataURL ?? qrcode.default.toDataURL;
        const dataUrl = await toDataUrl(qrLink, {
          errorCorrectionLevel: "M",
          margin: 1,
          scale: 8,
          color: { dark: "#070914", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => setQrDataUrl(""));

    return () => {
      cancelled = true;
    };
  }, [status?.qrLink]);

  async function createFreshSlot() {
    const response = await fetch("/api/telegram/accounts/new", { method: "POST" });
    const next = (await response.json()) as TelegramStatus;
    setStatus(next);
    setCode("");
    setPassword("");
    setStep("choose");
    setMessage(next.message ?? (response.ok ? "Новый аккаунт готов к авторизации." : "Не удалось создать слот аккаунта."));
  }

  async function requestPhone() {
    const cleanLocal = phone.replace(/\D/g, "");
    if (!cleanLocal) {
      setMessage("Введите номер телефона.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/telegram/auth/phone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, phoneNumber: `${country.dial}${cleanLocal}` }),
      });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? (response.ok ? "Код отправлен. Проверьте Telegram." : "Не удалось отправить код."));
      if (response.ok) setStep("code");
    } finally {
      setBusy(false);
    }
  }

  async function requestQr() {
    setBusy(true);
    try {
      const response = await fetch("/api/telegram/auth/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = (await response.json()) as { message?: string; qrLink?: string };
      setStatus((current) => ({ ...(current ?? {}), qrLink: data.qrLink ?? current?.qrLink ?? null }));
      setMessage(data.message ?? (response.ok ? "Отсканируйте QR-код в Telegram." : "QR-вход не запустился."));
      if (response.ok) setStep("progress");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    setBusy(true);
    try {
      const response = await fetch("/api/telegram/auth/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, code: code.trim() }),
      });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? (response.ok ? "Код принят. Завершаем вход…" : "Код не принят."));
      if (response.ok) setStep("progress");
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword() {
    setBusy(true);
    try {
      const response = await fetch("/api/telegram/auth/2fa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, password }),
      });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? (response.ok ? "Пароль принят. Завершаем вход…" : "Пароль не принят."));
      if (response.ok) setStep("progress");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050716] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(255,45,214,.65),transparent_34%),radial-gradient(circle_at_88%_42%,rgba(39,235,255,.6),transparent_34%),linear-gradient(180deg,#101a3d_0%,#050716_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:100%_4px]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/15 bg-[#15214d]/75 p-6 shadow-[0_0_60px_rgba(33,231,255,.16)] backdrop-blur-xl">
          <div className="text-center">
            <div className="text-3xl font-black tracking-tight">
              <span className="text-cyan-300">EPIC</span><span className="text-white">☠</span><span className="text-fuchsia-300">GRAM</span>
            </div>
            <p className="mt-2 text-sm text-white/65">Вход в Telegram и AI Operator</p>
          </div>

          {step === "ready" ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-300" />
                <div className="mt-2 font-semibold">{account?.displayName ?? "Telegram подключён"}</div>
                <div className="text-sm text-white/55">{account?.phoneMasked ?? "authorizationStateReady"}</div>
              </div>
              <a href="/client" className="block rounded-xl bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-4 py-3 text-center font-bold text-[#071022] shadow-[0_0_22px_rgba(54,230,255,.32)]">
                Открыть EPIC💀GRAM
              </a>
              <button onClick={createFreshSlot} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75 hover:bg-white/10">
                Подключить другой аккаунт
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1">
                <button onClick={() => { setMode("phone"); setStep("choose"); }} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "phone" ? "bg-white/12 text-white" : "text-white/45"}`}>
                  <Smartphone className="h-4 w-4" /> По номеру
                </button>
                <button onClick={() => { setMode("qr"); setStep("choose"); }} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "qr" ? "bg-white/12 text-white" : "text-white/45"}`}>
                  <QrCode className="h-4 w-4" /> Через QR
                </button>
              </div>

              {mode === "phone" && step === "choose" && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-[145px_1fr] gap-2">
                    <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="rounded-xl border border-white/10 bg-[#0d1533] px-3 py-3 text-sm outline-none focus:border-cyan-300/60">
                      {countries.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.dial}</option>)}
                    </select>
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="Номер телефона" className="rounded-xl border border-white/10 bg-[#0d1533] px-3 py-3 outline-none placeholder:text-white/30 focus:border-cyan-300/60" />
                  </div>
                  <button disabled={busy} onClick={requestPhone} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-4 py-3 font-bold text-[#071022] disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Получить код
                  </button>
                </div>
              )}

              {mode === "phone" && step === "code" && (
                <div className="mt-4 space-y-3">
                  <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} inputMode="numeric" autoFocus placeholder="Код из Telegram" className="w-full rounded-xl border border-white/10 bg-[#0d1533] px-4 py-3 text-center text-xl tracking-[.35em] outline-none focus:border-cyan-300/60" />
                  <button disabled={busy || !code.trim()} onClick={submitCode} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-4 py-3 font-bold text-[#071022] disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Войти
                  </button>
                </div>
              )}

              {mode === "phone" && step === "password" && (
                <div className="mt-4 space-y-3">
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus placeholder="Пароль Telegram 2FA" className="w-full rounded-xl border border-white/10 bg-[#0d1533] px-4 py-3 outline-none focus:border-cyan-300/60" />
                  <button disabled={busy || !password} onClick={submitPassword} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-4 py-3 font-bold text-[#071022] disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Подтвердить
                  </button>
                </div>
              )}

              {mode === "qr" && (
                <div className="mt-4 space-y-4 text-center">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="Telegram QR" className="mx-auto h-56 w-56 rounded-2xl bg-white p-3" />
                  ) : (
                    <div className="grid h-56 place-items-center rounded-2xl border border-dashed border-white/15 bg-black/15 text-white/40">
                      {busy || step === "progress" ? <Loader2 className="h-8 w-8 animate-spin" /> : <QrCode className="h-10 w-10" />}
                    </div>
                  )}
                  <p className="text-sm leading-6 text-white/55">Telegram → Настройки → Устройства → Подключить устройство</p>
                  {!qrDataUrl && (
                    <button disabled={busy} onClick={requestQr} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-4 py-3 font-bold text-[#071022] disabled:opacity-60">
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />} Показать QR-код
                    </button>
                  )}
                </div>
              )}

              {step === "progress" && mode === "phone" && (
                <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4 text-center text-sm text-cyan-100">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Завершаем авторизацию…
                </div>
              )}
            </div>
          )}

          <p className="mt-5 min-h-10 text-center text-xs leading-5 text-white/45">{message}</p>
          <p className="text-center text-[10px] uppercase tracking-[.18em] text-white/25">Safe Mode · отправка только после подтверждения</p>
        </div>
      </section>
    </main>
  );
}
