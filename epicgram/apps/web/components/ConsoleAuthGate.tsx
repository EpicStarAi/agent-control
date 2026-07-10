"use client";

import { useState, type ReactNode } from "react";

export function ConsoleAuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
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
      else if (j.configured === false)
        setError("Гейт не настроен. Задай EPICGRAM_OPERATOR_PASSWORD_SCRYPT (npm run operator:hash).");
      else setError("Неверный пароль.");
    } catch {
      setError("Ошибка входа (сеть).");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }

  if (authed) return <>{children}</>;

  return (
    <main style={screen}>
      <form onSubmit={submit} style={cardStyle}>
        <div style={brand}>
          <span style={{ opacity: 0.65, letterSpacing: 2, fontSize: 12 }}>EPIC GRAM ☠ CONTROL CONSOLE</span>
          <h1 style={title}>Вход оператора</h1>
        </div>

        <label htmlFor="op-pw" style={label}>Пароль</label>
        <input
          id="op-pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          style={input}
        />

        <button type="submit" disabled={busy} style={button}>
          {busy ? "Проверка…" : "Войти"}
        </button>

        {error && <p style={errorLine}>{error}</p>}

        <p style={hint}>Private beta · доступ только оператору. Сессия не сохраняется.</p>
      </form>
    </main>
  );
}

const screen: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "radial-gradient(1200px 600px at 50% -10%, #11321f 0%, #0a0f0c 55%, #070a08 100%)",
  color: "#e8edf2",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 360,
  background: "rgba(12,18,15,0.82)",
  border: "1px solid rgba(120,255,180,0.16)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
  backdropFilter: "blur(8px)",
};

const brand: React.CSSProperties = { textAlign: "center", marginBottom: 22 };
const title: React.CSSProperties = { margin: "10px 0 0", fontSize: 22, fontWeight: 700 };
const label: React.CSSProperties = { display: "block", fontSize: 13, opacity: 0.8, marginBottom: 6 };

const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "11px 12px",
  borderRadius: 10,
  background: "#0c1310",
  color: "#e8edf2",
  border: "1px solid rgba(255,255,255,0.12)",
  outline: "none",
  fontSize: 15,
  boxSizing: "border-box",
};

const button: React.CSSProperties = {
  marginTop: 20,
  width: "100%",
  padding: "12px 16px",
  borderRadius: 10,
  background: "linear-gradient(180deg, #1c8c52 0%, #156b3f 100%)",
  color: "#eafff3",
  border: "1px solid rgba(120,255,180,0.35)",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
};

const errorLine: React.CSSProperties = { color: "#ff6b6f", marginTop: 12, fontSize: 14, textAlign: "center" };
const hint: React.CSSProperties = { marginTop: 18, fontSize: 12, opacity: 0.55, textAlign: "center", lineHeight: 1.5 };
