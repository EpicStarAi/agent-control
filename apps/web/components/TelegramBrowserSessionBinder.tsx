"use client";

import { useEffect } from "react";

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

function getExplicitActiveAccount(status: TelegramStatus) {
  const account = status.account ?? status.accounts?.find((item) => item.active) ?? null;
  const accountId = status.activeAccountId ?? account?.slotId ?? account?.id ?? null;
  if (!account || !accountId) return null;
  return { accountId };
}

export function TelegramBrowserSessionBinder() {
  useEffect(() => {
    let cancelled = false;

    async function bindAuthorizedAccount() {
      const response = await fetch("/api/telegram/status", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok || cancelled) return;

      const status = (await response.json()) as TelegramStatus;
      const ready = status.runtime === "ready" || status.authorizationState === "authorizationStateReady";
      const active = getExplicitActiveAccount(status);
      if (!ready || !active) return;

      window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ accountId: active.accountId, boundAt: Date.now() }),
      );
    }

    bindAuthorizedAccount().catch(() => undefined);
    const timer = window.setInterval(() => bindAuthorizedAccount().catch(() => undefined), 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
