"use client";

import { FormEvent, useEffect, useState } from "react";

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

type LoginState = "idle" | "checking" | "submitting" | "error";

function safeNextPath(): string {
  if (typeof window === "undefined") return "/client";
  const value = new URLSearchParams(window.location.search).get("next") || "/client";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/client";
}

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<LoginState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!active) return;
        if (response.ok && data?.user?.id) {
          window.location.replace(safeNextPath());
          return;
        }
        setState("idle");
      })
      .catch(() => {
        if (active) setState("idle");
      });

    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim();
    if (!normalized) {
      setState("error");
      setMessage("Введите код доступа EPICGRAM.");
      return;
    }

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/auth/referral-login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: normalized })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setState("error");
        setMessage(
          data?.reason === "rate_limited"
            ? "Слишком много попыток. Подождите минуту и повторите."
            : "Код доступа недействителен или уже использован."
        );
        return;
      }

      window.location.replace(safeNextPath());
    } catch {
      setState("error");
      setMessage("Сервер авторизации недоступен. Повторите попытку.");
    }
  }

  const busy = state === "checking" || state === "submitting";

  return (
    <main
      className="min-h-screen px-5 py-12 text-[#e8ecf5]"
      style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}
    >
      <div className="mx-auto max-w-lg">
        <a href="/" className="text-sm text-sky-300">← EPIC☠GRAM</a>
        <h1 className="mb-1 mt-2 text-3xl font-black text-fuchsia-100">Вход в EPICGRAM</h1>
        <p className="mb-6 text-white/70">
          Сначала создаётся защищённая EPICGRAM-сессия. Затем в Web Client подключается ваш Telegram через QR-код или номер телефона.
        </p>

        <form className={card} onSubmit={submit}>
          <label htmlFor="referral-code" className="mb-2 block text-sm uppercase tracking-widest text-fuchsia-300/70">
            Код доступа
          </label>
          <input
            id="referral-code"
            name="code"
            type="password"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={busy}
            placeholder="Введите код EPICGRAM"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-400/60 disabled:opacity-60"
          />

          {message ? (
            <p role="alert" className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 block w-full rounded-xl bg-fuchsia-600/50 px-4 py-3 text-center text-sm font-semibold hover:bg-fuchsia-600/70 disabled:cursor-wait disabled:opacity-60"
          >
            {state === "checking" ? "Проверяем сессию…" : state === "submitting" ? "Входим…" : "Продолжить в Telegram Web Client"}
          </button>
        </form>

        <div className={`${card} mt-4`}>
          <div className="mb-1 text-sm font-semibold text-fuchsia-100">Что произойдёт дальше</div>
          <ul className="space-y-1 text-[13px] text-white/70">
            <li>• откроется персональный Web Client;</li>
            <li>• появится экран «Telegram не подключён»;</li>
            <li>• авторизация Telegram пройдёт через QR, телефон, код и 2FA;</li>
            <li>• чужие аккаунты и NOVIKOVA не используются как fallback.</li>
          </ul>
        </div>

        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-200">
          Отправка сообщений заблокирована до ручного подтверждения. Safe Mode включён по умолчанию.
        </p>
      </div>
    </main>
  );
}
