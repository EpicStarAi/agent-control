// Telegram Web App (Mini App) helper.
// Safe no-op outside Telegram: web/PWA keeps working normally.
// Telegram injects window.Telegram.WebApp when the page is opened inside a Mini App.

export type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe: Record<string, unknown>;
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  version: string;
  platform: string;
};

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Telegram?: { WebApp?: TelegramWebApp } };
  return w.Telegram?.WebApp ?? null;
}

// True only when actually launched inside Telegram (initData is present).
export function isInTelegram(): boolean {
  const tg = getTelegramWebApp();
  return !!(tg && typeof tg.initData === "string" && tg.initData.length > 0);
}

// Call ready()/expand() once. Returns the WebApp or null (outside Telegram).
export function initTelegram(): TelegramWebApp | null {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand();
  } catch {
    /* ignore — outside Telegram or unsupported */
  }
  return tg;
}
