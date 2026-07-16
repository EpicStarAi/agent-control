"use client";

import { useEffect, useState, type ReactNode } from "react";

const SESSION_KEY = "epicgram.telegram.browser-session.v1";

type TelegramAccount = {
  slotId?: string;
  id?: string;
  active?: boolean;
};

type TelegramStatus = {
  runtime?: string;
  authorizationState?: string;
  activeAccountId?: string;
  account?: TelegramAccount | null;
  accounts?: TelegramAccount[];
};

type StoredBinding = {
  accountId: string;
  boundAt: number;
};

function readBinding(): StoredBinding | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBinding;
    if (!parsed.accountId || !Number.isFinite(parsed.boundAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getExplicitActiveAccountId(status: TelegramStatus) {
  const account = status.account ?? status.accounts?.find((item) => item.active) ?? null;
  return status.activeAccountId ?? account?.slotId ?? account?.id ?? null;
}

export function TelegramClientGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "allowed" | "blocked">("checking");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const binding = readBinding();
      if (!binding) {
        setState("blocked");
        return;
      }

      const response = await fetch("/api/telegram/status", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok || cancelled) {
        setState("blocked");
        return;
      }

      const status = (await response.json()) as TelegramStatus;
      const ready = status.runtime === "ready" || status.authorizationState === "authorizationStateReady";
      const activeAccountId = getExplicitActiveAccountId(status);

      if (!ready || !activeAccountId || activeAccountId !== binding.accountId) {
        window.sessionStorage.removeItem(SESSION_KEY);
        setState("blocked");
        return;
      }

      setState("allowed");
    }

    verify().catch(() => setState("blocked"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return <main className="grid min-h-screen place-items-center bg-[#050716] text-sm text-white/60">Проверяем Telegram-сессию…</main>;
  }

  if (state === "blocked") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050716] px-4 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
          <h1 className="text-xl font-bold">Telegram не подключён в этом браузере</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Клиент заблокирован, чтобы не показывать аккаунт, авторизованный в другой браузерной сессии.
          </p>
          <a href="/login" className="mt-5 block rounded-xl bg-white px-4 py-3 font-semibold text-black">
            Подключить Telegram
          </a>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
