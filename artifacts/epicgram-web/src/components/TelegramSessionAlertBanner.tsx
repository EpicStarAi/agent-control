import { Link } from "wouter";
import { useTelegramSessionAlert, dismissTelegramAlert } from "@/hooks/useTelegramSessionWatchdog";

/**
 * Global, dismissible banner that surfaces when the owner's real Telegram
 * session drops out of authorizationStateReady unexpectedly (see
 * useTelegramSessionWatchdog.ts). Mounted once near the app root so it shows
 * regardless of which page the owner is currently on.
 */
export default function TelegramSessionAlertBanner() {
  const alert = useTelegramSessionAlert();
  if (!alert) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2147483000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "10px 16px",
        background: "#7a1f1f",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 2px 10px rgba(0,0,0,0.35)"
      }}
    >
      <span>
        ⚠ Telegram-сессия отключилась неожиданно ({alert.authorizationState ?? "unknown"}). Переавторизуйтесь, чтобы продолжить получать сообщения.
      </span>
      <Link
        href="/settings"
        style={{ color: "#fff", textDecoration: "underline", whiteSpace: "nowrap" }}
        onClick={() => dismissTelegramAlert()}
      >
        Открыть настройки
      </Link>
      <button
        onClick={() => dismissTelegramAlert()}
        aria-label="Скрыть предупреждение"
        style={{
          background: "transparent",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          padding: 0
        }}
      >
        ×
      </button>
    </div>
  );
}
