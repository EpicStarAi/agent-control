import { useEffect } from "react";
import { useLocation } from "wouter";
import { initTelegram, isInTelegram } from "@/lib/telegram";

/**
 * Telegram Mini App entrypoint.
 *
 * When opened inside Telegram the SDK is already injected (via index.html script tag).
 * We call ready()+expand(), then immediately redirect to the full web client so the
 * user gets the real workspace rather than a stub page.
 *
 * Outside Telegram (e.g. browser preview) we also redirect — the Web Client works fine
 * without the SDK.
 */
export default function Tma() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Initialize SDK — no-op outside Telegram
    initTelegram();
    // Small delay so Telegram can paint its loading indicator
    const t = setTimeout(() => navigate("/client"), 150);
    return () => clearTimeout(t);
  }, [navigate]);

  const inTg = isInTelegram();

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: inTg ? "var(--tg-theme-bg-color, #07060c)" : "#07060c",
        color: inTg ? "var(--tg-theme-text-color, #e8ecf5)" : "#e8ecf5",
        fontFamily: "system-ui, sans-serif",
        gap: 16,
      }}
    >
      {/* Logo mark */}
      <div style={{ fontSize: 48, lineHeight: 1 }}>☠</div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.04em" }}>EPIC GRAM AI</div>
      <div style={{ fontSize: 13, opacity: 0.55 }}>Запуск…</div>
    </div>
  );
}
