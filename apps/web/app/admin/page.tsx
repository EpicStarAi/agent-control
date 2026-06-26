"use client";

import { useEffect, useState } from "react";

type Status = "ok" | "down" | "unknown" | "checking";

function Dot({ s }: { s: Status }) {
  const color = s === "ok" ? "#3ad17a" : s === "down" ? "#e5484d" : "#b1742d";
  return <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 6, background: color, marginRight: 8 }} />;
}

const wrap: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "40px 24px", color: "#e8edf2", lineHeight: 1.6 };
const card: React.CSSProperties = { background: "rgba(23,33,43,.7)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 18, marginBottom: 16 };

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [backend, setBackend] = useState<Status>("unknown");
  const [tg, setTg] = useState<Status>("unknown");
  const [pwa, setPwa] = useState<Status>("unknown");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await r.json();
      if (j.ok) setAuthed(true);
      else if (j.configured === false) setError("Admin gate is not configured yet. Set EPICGRAM_OPERATOR_PASSWORD_SCRYPT (npm run operator:hash).");
      else setError("Wrong password.");
    } catch {
      setError("Login failed (network).");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }

  useEffect(() => {
    if (!authed) return;
    // backend status via the operator proxy
    fetch("/api/operator/status", { cache: "no-store" })
      .then((r) => setBackend(r.ok ? "ok" : "down"))
      .catch(() => setBackend("down"));
    // telegram web app present?
    const w = window as unknown as { Telegram?: { WebApp?: unknown } };
    setTg(w.Telegram?.WebApp ? "ok" : "unknown");
    // pwa installable?
    setPwa("serviceWorker" in navigator ? "ok" : "down");
  }, [authed]);

  if (!authed) {
    return (
      <main style={wrap}>
        <h1>EPIC GRAM — Admin</h1>
        <p style={{ color: "#b1742d" }}>Private beta. Operator access only.</p>
        <form onSubmit={login} style={card}>
          <label htmlFor="pw">Operator password</label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 8, padding: 10, borderRadius: 8, background: "#0e1621", color: "#e8edf2", border: "1px solid rgba(255,255,255,.12)" }}
            autoComplete="current-password"
          />
          <button type="submit" disabled={busy} style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, background: "#17212b", color: "#e8edf2", border: "1px solid rgba(255,255,255,.18)", cursor: "pointer" }}>
            {busy ? "Checking..." : "Enter"}
          </button>
          {error && <p style={{ color: "#e5484d", marginTop: 10 }}>{error}</p>}
        </form>
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          The gate verifies a local scrypt hash. No password is stored in the repository.
        </p>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <h1>EPIC GRAM — Admin</h1>
      <p style={{ color: "#b1742d", fontWeight: 600 }}>⚠ PRIVATE BETA — not a public production release.</p>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Service status</h2>
        <p><Dot s="ok" /> EPIC GRAM web (Next.js apps/web) — serving</p>
        <p><Dot s={backend} /> Backend API (services/api, :8788) — {backend}</p>
        <p><Dot s={tg} /> Telegram Web App — {tg === "ok" ? "running inside Telegram" : "not in Telegram (web mode)"}</p>
        <p><Dot s={pwa} /> PWA — {pwa === "ok" ? "installable" : "unavailable"}</p>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Release checklist</h2>
        <p>See <code>docs/RELEASE-CHECKLIST.md</code>. Outbound Telegram / publishing is MANUAL_APPROVAL_ONLY.</p>
        <p>Operator console UI: agent OS &amp; operator sidebar are available in the main app workspace.</p>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Legal</h2>
        <p>
          <a style={{ color: "#7cc2ff" }} href="/terms">Terms</a> ·{" "}
          <a style={{ color: "#7cc2ff" }} href="/privacy">Privacy</a> ·{" "}
          <a style={{ color: "#7cc2ff" }} href="/abuse">Abuse Policy</a>
        </p>
      </div>

      <p style={{ fontSize: 13, opacity: 0.7 }}>Session-only access. Refresh requires re-entering the password.</p>
    </main>
  );
}
