"use client";

import { useEffect } from "react";
import { initTelegram } from "../lib/telegram";

// Initializes the Telegram Mini App runtime if the page is opened inside Telegram.
// Outside Telegram it is a harmless no-op — normal web/PWA continues unchanged.
// Non-destructive: only calls ready()/expand() and sets data-* attributes for theming.
export default function TelegramInit() {
  useEffect(() => {
    const tg = initTelegram();
    if (!tg) return;
    try {
      const root = document.documentElement;
      root.setAttribute("data-tg", "1");
      root.setAttribute("data-tg-platform", tg.platform || "unknown");
      root.setAttribute("data-tg-color", tg.colorScheme || "dark");
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
