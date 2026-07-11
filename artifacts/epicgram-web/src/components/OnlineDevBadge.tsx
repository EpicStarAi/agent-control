
/**
 * Compact, professional status indicator shown across all routes while this
 * app is running as the Replit online-dev copy of EPICGRAM.
 *
 * Safety: this is a UI-only label. It does not gate or enable any send
 * behavior itself -- live Telegram sending stays locked via the
 * EPICGRAM_ENABLE_LIVE_TELEGRAM / EPICGRAM_DISABLE_SEND env flags and the
 * operator's approval-gated send mode.
 */
export default function OnlineDevBadge() {
  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(15, 15, 20, 0.82)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        backdropFilter: "blur(6px)",
        fontFamily: "var(--font-jetbrains, monospace)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: "#e6e6ea",
        pointerEvents: "none",
        userSelect: "none",
      }}
      aria-label="Статус онлайн dev-окружения"
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#f5a524",
          boxShadow: "0 0 6px rgba(245, 165, 36, 0.8)",
        }}
      />
      DEV-СРЕДА / ОТПРАВКА ЗАБЛОКИРОВАНА
    </div>
  );
}
