/**
 * DEV-ONLY — rendered only when import.meta.env.DEV is true (Vite dev server).
 * Provides one-click buttons to fire synthetic session-drop / session-recover
 * events onto the SSE bus so the full alert lifecycle can be tested without a
 * real Telegram disconnect.
 *
 * Starts collapsed as a tiny badge; click to expand/collapse.
 * Completely absent from production builds.
 */

import { useState } from "react";
import { apiUrl } from "@/lib/api";

async function trigger(path: string): Promise<string> {
  try {
    const res = await fetch(apiUrl(path), { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return `Error ${res.status}: ${json?.message ?? "unknown"}`;
    return json?.ok ? "ok" : JSON.stringify(json);
  } catch (e) {
    return e instanceof Error ? e.message : "fetch failed";
  }
}

export default function DevSessionPanel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function drop() {
    setStatus("…");
    setStatus(await trigger("/dev/session-drop"));
  }

  async function recover() {
    setStatus("…");
    setStatus(await trigger("/dev/session-recover"));
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 76,       // above the mobile bottom nav bar
        left: 12,
        zIndex: 2147483001,
        fontFamily: "monospace",
        pointerEvents: "auto",
      }}
    >
      {/* collapsed pill — always visible */}
      <button
        onClick={() => { setOpen(o => !o); setStatus(null); }}
        title={open ? "Скрыть DEV панель" : "Открыть DEV панель сессии"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: open ? "rgba(15,15,25,0.96)" : "rgba(15,15,25,0.75)",
          border: `1px solid ${open ? "rgba(255,255,100,0.55)" : "rgba(255,255,100,0.22)"}`,
          borderRadius: 20,
          padding: "3px 10px 3px 8px",
          fontSize: 10,
          color: "#ffd",
          cursor: "pointer",
          letterSpacing: "0.05em",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          transition: "all 0.15s ease",
        }}
      >
        <span style={{ fontSize: 9, opacity: 0.7 }}>⚙</span>
        <span style={{ opacity: 0.65 }}>DEV</span>
        <span style={{ opacity: 0.35, fontSize: 9, marginLeft: 1 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* expanded panel */}
      {open && (
        <div
          style={{
            marginTop: 6,
            background: "rgba(12,12,22,0.96)",
            border: "1px solid rgba(255,255,100,0.35)",
            borderRadius: 10,
            padding: "8px 12px 10px",
            fontSize: 11,
            color: "#ffd",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            minWidth: 190,
          }}
        >
          <div style={{ marginBottom: 6, opacity: 0.55, fontSize: 10, letterSpacing: "0.06em" }}>
            SESSION SIMULATOR
          </div>
          <div style={{ marginBottom: 5, opacity: 0.4, fontSize: 9, lineHeight: 1.4 }}>
            Имитирует drop/recover Telegram-сессии для тестирования алертов без реального отключения.
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              onClick={drop}
              title="POST /dev/session-drop — synthetic auth drop event"
              style={{
                flex: 1,
                background: "#7a1f1f",
                border: "1px solid rgba(255,80,80,0.3)",
                borderRadius: 6,
                color: "#fff",
                cursor: "pointer",
                fontSize: 11,
                padding: "4px 0",
                fontFamily: "monospace",
                letterSpacing: "0.04em",
              }}
            >
              drop
            </button>
            <button
              onClick={recover}
              title="POST /dev/session-recover — synthetic auth recover event"
              style={{
                flex: 1,
                background: "#1a4a1a",
                border: "1px solid rgba(80,200,80,0.3)",
                borderRadius: 6,
                color: "#fff",
                cursor: "pointer",
                fontSize: 11,
                padding: "4px 0",
                fontFamily: "monospace",
                letterSpacing: "0.04em",
              }}
            >
              recover
            </button>
          </div>
          {status && (
            <div style={{ marginTop: 7, opacity: 0.7, fontSize: 10, maxWidth: 170, wordBreak: "break-all", color: status === "ok" ? "#6f6" : status.startsWith("Error") ? "#f88" : "#ffd" }}>
              {status === "ok" ? "✓ отправлено" : status}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
