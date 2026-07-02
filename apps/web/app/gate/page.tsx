"use client";
import { useEffect, useState } from "react";

// P30 Access Gate — real app entry. Referral code required. Public demo (GitHub Pages)
// stays open/mock; this gate protects the real workspace. No Telegram/TDLib here yet.
type Sess = { authenticated: boolean; user?: { displayName: string; role: string }; workspace?: { id: string; title: string }; source?: string };

const wrap: React.CSSProperties = { minHeight: "100vh", display: "grid", placeItems: "center", background: "radial-gradient(120% 120% at 50% 30%,#0a1226,#05070f 60%,#020308)", color: "#eaf6ff", fontFamily: "Segoe UI,system-ui,Arial,sans-serif", padding: 24 };
const card: React.CSSProperties = { width: "min(94vw,420px)", background: "linear-gradient(180deg,rgba(15,23,48,.92),rgba(8,12,26,.94))", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, padding: "34px 30px", boxShadow: "0 30px 80px rgba(0,0,0,.55)", textAlign: "center" };
const inp: React.CSSProperties = { width: "100%", marginTop: 8, background: "#070b17", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 16, letterSpacing: ".08em", outline: "none", textAlign: "center" };
const btn: React.CSSProperties = { marginTop: 18, width: "100%", border: "none", borderRadius: 12, padding: 15, fontWeight: 800, fontSize: 16, color: "#04121a", cursor: "pointer", background: "linear-gradient(92deg,#22e3ff,#7b5cff 60%,#ff2bd6)" };
const badge = (t: string, c: string): React.CSSProperties => ({ display: "inline-block", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: c, border: `1px solid ${c}55`, borderRadius: 999, padding: "5px 12px", background: "rgba(10,15,30,.6)" });

export default function GatePage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sess, setSess] = useState<Sess | null>(null);

  useEffect(() => { fetch("/api/auth/session").then(r => r.json()).then(setSess).catch(() => setSess({ authenticated: false })); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch("/api/auth/referral-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })
      .then(x => x.json()).catch(() => ({ ok: false, reason: "network" }));
    setBusy(false);
    if (r.ok) setSess({ authenticated: true, user: r.user, workspace: r.workspace, source: r.source });
    else setErr({ invalid: "Неверный код", revoked: "Код отозван", expired: "Код истёк", exhausted: "Код исчерпан", rate_limited: "Слишком много попыток, подождите", network: "Сеть недоступна" }[r.reason as string] || "Ошибка");
  }
  async function doLogout() { await fetch("/api/auth/logout", { method: "POST" }); setSess({ authenticated: false }); setCode(""); }

  if (sess?.authenticated) return (
    <div style={wrap}><div style={card}>
      <div style={badge("PRIVATE WORKSPACE", "#39ff14")}>● Private Workspace</div>
      <h2 style={{ margin: "16px 0 4px", fontSize: 22 }}>Доступ открыт</h2>
      <div style={{ color: "#9fc0da", fontSize: 14 }}>{sess.user?.displayName} · {sess.user?.role}<br />{sess.workspace?.title}</div>
      <div style={{ color: "#6f93b0", fontSize: 12, marginTop: 10 }}>источник: {sess.source} · сессия httpOnly · Telegram/TDLib подключается внутри</div>
      <button style={{ ...btn, background: "transparent", color: "#9fc0da", border: "1px solid rgba(255,255,255,.12)" }} onClick={doLogout}>Выйти</button>
    </div></div>
  );

  return (
    <div style={wrap}><form style={card} onSubmit={submit}>
      <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: "-.01em" }}>EPIC<span style={{ filter: "drop-shadow(0 0 14px #ff2bd6)" }}>💀</span>GRAM</div>
      <div style={{ marginTop: 12 }}><span style={badge("Access Gate", "#22e3ff")}>Access Gate</span></div>
      <h2 style={{ margin: "16px 0 4px", fontSize: 20 }}>Закрытый доступ</h2>
      <div style={{ color: "#9fc0da", fontSize: 13, lineHeight: 1.4 }}>Введите referral-код. Публичное демо открыто всем и не содержит реальных данных; реальный клиент — только по коду.</div>
      <input style={inp} value={code} onChange={e => setCode(e.target.value)} placeholder="REFERRAL CODE" autoFocus />
      {err && <div style={{ color: "#ff6b8b", fontSize: 13, marginTop: 10 }}>{err}</div>}
      <button style={btn} disabled={busy} type="submit">{busy ? "Проверяю…" : "Войти"}</button>
      <div style={{ marginTop: 16 }}><a href="https://epicstarai.github.io/agent-control/" style={{ color: "#6f93b0", fontSize: 12 }}>→ открыть PUBLIC DEMO (без входа)</a></div>
    </form></div>
  );
}
