"use client";

import { useEffect, useRef, useState } from "react";

// P0 consolidation: this screen used to straddle two Telegram auth families,
// probing /api/telegram/active-auth/status on every poll and then picking
// active-auth/* or binding/* per action. That is the duplicate architecture the
// consolidation removes: active-auth/* drives the shared legacy singleton,
// binding/* drives this user's own owner-scoped slot. Mixing them meant the
// same screen could authorise either one depending on backend timing.
//
// It now speaks ONLY the canonical /api/telegram/binding/* family, so the
// account is always resolved server-side from this principal's binding.

type BindingStatus = {
  bound?: boolean;
  binding?: {
    tdlibAccountId?: string;
    authState?: string;
    phoneMasked?: string | null;
    displayName?: string | null;
    authError?: string | null;
  } | null;
  authFlow?: {
    phoneMasked?: string | null;
    message?: string | null;
    qrLink?: string | null;
  } | null;
};

export function TelegramCodeEntry() {
  const [status, setStatus] = useState<BindingStatus | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("Проверяю состояние Telegram...");
  const [busy, setBusy] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);
  const redirectTimerRef = useRef<number | null>(null);
  const redirectStartedRef = useRef(false);

  function returnToClient() {
    if (redirectStartedRef.current) return;
    redirectStartedRef.current = true;
    setMessage("Telegram авторизован. Возвращаю в клиент...");
    redirectTimerRef.current = window.setTimeout(() => window.location.replace("/client"), 600);
  }

  async function refresh() {
    const response = await fetch("/api/telegram/binding/status", { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as BindingStatus | null;
    setStatus(data);
    const state = data?.binding?.authState;
    if (state === "ready") returnToClient();
    else if (state === "waiting_code") setMessage("Код ожидается. Введите код из Telegram.");
    else if (state === "waiting_password") setMessage("Код принят. Теперь нужен облачный пароль 2FA.");
    else if (state === "waiting_qr")
      setMessage("Telegram ждёт подтверждение через QR. Отсканируйте QR или запросите код по номеру.");
    else setMessage(data?.binding?.authError || data?.authFlow?.message || "Активного ожидания кода не найдено.");
  }

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function poll() {
      await refresh().catch(() => {
        if (!cancelled) setMessage("Не удалось прочитать статус.");
      });
      if (!cancelled && !redirectStartedRef.current) timer = window.setTimeout(poll, 4000);
    }

    poll();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      if (redirectTimerRef.current !== null) window.clearTimeout(redirectTimerRef.current);
    };
  }, []);

  async function submitCode() {
    const normalized = code.trim();
    if (!normalized) {
      setMessage("Введите код.");
      return;
    }
    setBusy(true);
    setMessage("Проверяю код...");
    try {
      const response = await fetch("/api/telegram/binding/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: normalized }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setMessage(data?.reason || "Код не принят Telegram.");
        return;
      }
      setStatus(data.status);
      const nextState = data.status?.binding?.authState ?? data.binding?.authState;
      if (nextState === "ready") {
        returnToClient();
      } else if (nextState === "waiting_password") {
        setMessage("Код принят. Нужен облачный пароль 2FA.");
      } else {
        setMessage(data.status?.authFlow?.message || "Код отправлен, ожидаю ответ TDLib.");
      }
    } catch {
      setMessage("Ошибка сети при проверке кода.");
    } finally {
      setBusy(false);
    }
  }

  async function requestPhoneCode() {
    const normalized = phoneNumber.trim();
    if (!normalized) {
      setMessage("Введите номер телефона в международном формате.");
      return;
    }
    setBusy(true);
    setMessage("Запрашиваю код Telegram...");
    try {
      const response = await fetch("/api/telegram/binding/phone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setMessage(data?.reason || "Код не отправлен. Проверьте номер и backend.");
        return;
      }
      setQrDataUrl(null);
      setStatus(data.status ?? null);
      setMessage(data.status?.authFlow?.message || "Код запрошен. Проверьте Telegram и введите код ниже.");
      await refresh();
    } catch {
      setMessage("Ошибка сети при запросе кода.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword() {
    if (!password) {
      setMessage("Введите облачный пароль Telegram.");
      return;
    }
    setBusy(true);
    setMessage("Проверяю облачный пароль...");
    try {
      const response = await fetch("/api/telegram/binding/2fa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      setPassword("");
      if (!response.ok || !data?.ok) {
        setMessage(data?.reason || "Облачный пароль не принят Telegram.");
        return;
      }
      setStatus(data.status ?? null);
      const nextState = data.status?.binding?.authState;
      if (nextState === "ready") returnToClient();
      else setMessage(data.status?.authFlow?.message || "Пароль отправлен, ожидаю ответ TDLib.");
    } catch {
      setMessage("Ошибка сети при проверке облачного пароля.");
    } finally {
      setBusy(false);
    }
  }

  async function requestQr() {
    setQrBusy(true);
    setMessage("Запрашиваю новый QR у TDLib...");
    try {
      const response = await fetch("/api/telegram/binding/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      const qrLink: string | null = data?.status?.authFlow?.qrLink ?? null;
      if (!response.ok || !data?.ok || !qrLink) {
        setMessage(data?.reason || "QR не получен. Попробуйте вход по номеру.");
        setQrDataUrl(null);
        return;
      }
      setStatus(data.status ?? null);
      const qrcode = await import("qrcode");
      const toDataUrl = qrcode.toDataURL ?? qrcode.default.toDataURL;
      setQrDataUrl(await toDataUrl(qrLink, { margin: 1, width: 260 }));
      setMessage("Свежий QR готов. Сканируйте его через Telegram: Настройки → Устройства → Подключить устройство.");
      await refresh();
    } catch {
      setMessage("Ошибка сети при запросе QR.");
      setQrDataUrl(null);
    } finally {
      setQrBusy(false);
    }
  }

  const phone = status?.binding?.phoneMasked ?? status?.authFlow?.phoneMasked ?? null;
  const state = status?.binding?.authState ?? "unknown";

  return (
    <main className="min-h-screen bg-[#07060c] px-4 py-8 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-fuchsia-400/30 bg-[#12101b] p-5 shadow-telegram">
        <a href="/client" className="text-sm font-semibold text-fuchsia-200 hover:text-white">← EPIC☠️GRAM</a>
        <h1 className="mt-4 text-2xl font-black">Код Telegram</h1>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Используется официальный TDLib flow. Код не сохраняется во frontend.
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3 text-sm">
          <div className="text-white/45">Состояние</div>
          <div className="mt-1 font-semibold">{state}</div>
          {phone && <div className="mt-1 text-white/60">Телефон: {phone}</div>}
        </div>

        <label className="mt-5 block text-sm font-semibold">Номер телефона</label>
        <div className="mt-2 flex gap-2">
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="+380..."
            inputMode="tel"
            className="h-12 min-w-0 flex-1 rounded-xl bg-black/35 px-4 text-base font-semibold outline-none ring-1 ring-white/10 focus:ring-emerald-400"
          />
          <button
            onClick={requestPhoneCode}
            disabled={busy}
            className="h-12 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
          >
            Код
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold">Код из Telegram</label>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitCode();
          }}
          placeholder="12345"
          inputMode="numeric"
          autoFocus
          className="mt-2 h-14 w-full rounded-xl bg-black/35 px-4 text-xl font-bold tracking-widest outline-none ring-1 ring-white/10 focus:ring-fuchsia-400"
        />
        <button
          onClick={submitCode}
          disabled={busy}
          className="mt-4 h-12 w-full rounded-xl bg-fuchsia-600 px-4 text-sm font-bold text-white hover:bg-fuchsia-500 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Проверяю..." : "Проверить код"}
        </button>

        {status?.binding?.authState === "waiting_password" && (
          <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
            <label className="block text-sm font-semibold">Облачный пароль Telegram (2FA)</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitPassword();
              }}
              type="password"
              autoComplete="current-password"
              placeholder="Введите пароль 2FA"
              className="mt-2 h-12 w-full rounded-xl bg-black/35 px-4 text-base outline-none ring-1 ring-white/10 focus:ring-amber-400"
            />
            <button
              onClick={submitPassword}
              disabled={busy}
              className="mt-3 h-12 w-full rounded-xl bg-amber-500 px-4 text-sm font-bold text-black hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Проверяю..." : "Подтвердить 2FA"}
            </button>
          </div>
        )}

        <button
          onClick={requestQr}
          disabled={qrBusy}
          className="mt-3 h-12 w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-100 hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-60"
        >
          {qrBusy ? "Обновляю QR..." : "Показать новый QR"}
        </button>

        {qrDataUrl && (
          <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-white p-3">
            <img src={qrDataUrl} alt="QR для входа в Telegram" className="mx-auto h-64 w-64" />
          </div>
        )}

        <div className="mt-4 rounded-xl bg-black/30 p-3 text-sm leading-6 text-white/70">{message}</div>
      </div>
    </main>
  );
}
