/**
 * DEV-ONLY — rendered only when import.meta.env.DEV is true (Vite dev server).
 * Provides one-click buttons to fire synthetic session-drop / session-recover
 * events onto the SSE bus so the full alert lifecycle can be tested without a
 * real Telegram disconnect.
 *
 * The panel is a small floating pill in the bottom-left corner; it stays out of
 * the way of normal UI and is completely absent from production builds.
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
        bottom: 12,
        left: 12,
        zIndex: 2147483001,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        background: "rgba(15,15,25,0.92)",
        border: "1px solid rgba(255,255,100,0.35)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 11,
        fontFamily: "monospace",
        color: "#ffd",
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
        pointerEvents: "auto"
      }}
    >
      <span style={{ opacity: 0.6, fontSize: 10, letterSpacing: "0.05em" }}>DEV · session sim</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={drop}
          title="Emit synthetic auth.state_changed (unexpectedDrop: true)"
          style={{
            background: "#7a1f1f",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: "pointer",
            fontSize: 11,
            padding: "2px 8px",
            fontFamily: "monospace"
          }}
        >
          drop
        </button>
        <button
          onClick={recover}
          title="Emit synthetic auth.state_changed (authorizationStateReady)"
          style={{
            background: "#1a4a1a",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: "pointer",
            fontSize: 11,
            padding: "2px 8px",
            fontFamily: "monospace"
          }}
        >
          recover
        </button>
      </div>
      {status && (
        <span style={{ opacity: 0.75, fontSize: 10, maxWidth: 160, wordBreak: "break-all" }}>
          {status}
        </span>
      )}
    </div>
  );
}
