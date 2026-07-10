"use client";
import { useEffect, useState } from "react";

// P31 — AI Operator Initialization (a.k.a. Workspace Initialization). Not a plain form:
// a 7-step interview that produces an AI Identity (digital passport) for the workspace.
// Scoped to the caller's referral session. Telegram is just one connectable module.

type Prof = { displayName: string; goals: string[]; roles: string[]; aiNeeds: string[]; socials: string[]; budget: string; language: string; completed?: boolean };

const C = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", background: "radial-gradient(120% 120% at 50% 25%,#0a1226,#05070f 60%,#020308)", color: "#eaf6ff", fontFamily: "Segoe UI,system-ui,Arial,sans-serif", padding: 24 } as React.CSSProperties,
  card: { width: "min(94vw,560px)", background: "linear-gradient(180deg,rgba(15,23,48,.92),rgba(8,12,26,.94))", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, padding: "30px 30px", boxShadow: "0 30px 80px rgba(0,0,0,.55)" } as React.CSSProperties,
  inp: { width: "100%", marginTop: 10, background: "#070b17", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "13px 15px", color: "#fff", fontSize: 16, outline: "none" } as React.CSSProperties,
  btn: { border: "none", borderRadius: 12, padding: "13px 22px", fontWeight: 800, fontSize: 15, color: "#04121a", cursor: "pointer", background: "linear-gradient(92deg,#22e3ff,#7b5cff 60%,#ff2bd6)" } as React.CSSProperties,
  ghost: { border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: "13px 20px", fontWeight: 700, fontSize: 15, color: "#9fc0da", cursor: "pointer", background: "transparent" } as React.CSSProperties,
};
function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return <span onClick={onClick} style={{ display: "inline-block", margin: 4, padding: "9px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 700, fontSize: 14,
    border: on ? "1px solid #22e3ff" : "1px solid rgba(255,255,255,.14)", color: on ? "#fff" : "#9fc0da", background: on ? "rgba(34,227,255,.14)" : "rgba(255,255,255,.03)" }}>{on ? "✓ " : ""}{label}</span>;
}

const STEPS = [
  { k: "name", t: "Как тебя называть?", kind: "text", ph: "напр. BUCH" },
  { k: "build", t: "Что ты хочешь построить?", kind: "one", opts: ["VPN", "Медиа", "SaaS", "Telegram-сеть", "Бизнес", "Другое"] },
  { k: "role", t: "Какую роль выполняешь?", kind: "one", opts: ["Founder", "Operator", "Marketing", "Developer", "Designer"] },
  { k: "ai", t: "Какие AI нужны?", kind: "many", opts: ["Аналитик", "Копирайтер", "Исследователь", "Publisher", "Voice", "Vision"] },
  { k: "conn", t: "Что подключаем?", kind: "many", opts: ["Telegram", "Gmail", "GitHub", "Google Drive", "Notion", "Discord", "Wallet"] },
  { k: "budget", t: "Бюджет", kind: "one", opts: ["до 100$", "100–500$", "500–2000$", "2000$+"] },
  { k: "lang", t: "Основной язык", kind: "one", opts: ["Русский", "Українська", "English"] },
] as const;

export default function Onboarding() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(true);
  const [i, setI] = useState(0);
  const [name, setName] = useState("");
  const [build, setBuild] = useState(""); const [role, setRole] = useState("");
  const [ai, setAi] = useState<string[]>([]); const [conn, setConn] = useState<string[]>(["Telegram"]);
  const [budget, setBudget] = useState(""); const [lang, setLang] = useState("Русский");
  const [done, setDone] = useState<Prof | null>(null); const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/profile").then(async r => { if (r.status === 401) { setAuthed(false); } else { const d = await r.json(); if (d?.profile?.completed) setDone(d.profile); } setReady(true); }).catch(() => setReady(true)); }, []);
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  async function finish() {
    setBusy(true);
    const body: Prof = { displayName: name, goals: build ? [build] : [], roles: role ? [role] : ["owner"], aiNeeds: ai, socials: conn, budget, language: lang };
    const r = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(x => x.json()).catch(() => null);
    setBusy(false); if (r?.profile) setDone(r.profile);
  }

  if (!ready) return <div style={C.wrap}><div style={{ color: "#7fa6c4" }}>Загрузка…</div></div>;
  if (!authed) return <div style={C.wrap}><div style={C.card}><h2 style={{ marginTop: 0 }}>Нужен вход</h2><div style={{ color: "#9fc0da", fontSize: 14 }}>AI Operator Initialization доступна после входа по referral-коду.</div><div style={{ marginTop: 18 }}><a href="/gate" style={{ ...C.btn, textDecoration: "none", display: "inline-block" }}>→ Access Gate</a></div></div></div>;

  if (done) return (
    <div style={C.wrap}><div style={C.card}>
      <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#39ff14" }}>● AI Identity создан</div>
      <h2 style={{ margin: "10px 0 2px", fontSize: 24 }}>Рабочая среда готова</h2>
      <div style={{ color: "#9fc0da", fontSize: 13, marginBottom: 14 }}>Цифровой паспорт оператора · workspace scoped</div>
      {[["👤 Оператор", done.displayName || "—"], ["🤖 AI-оператор", "персональный · " + (done.aiNeeds.join(", ") || "базовый")],
        ["💼 Workspace", "Personal Workspace"], ["🎯 Цель", done.goals.join(", ") || "—"], ["🧩 Роль", done.roles.join(", ") || "—"],
        ["📱 Подключения", done.socials.join(", ") || "—"], ["💳 Wallet", "подключается позже"], ["🧠 Память", "инициализирована"],
        ["⚙️ Язык / бюджет", (done.language || "—") + " · " + (done.budget || "—")]].map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 14 }}><span style={{ color: "#cfe6f7" }}>{k}</span><span style={{ color: "#9fc0da", textAlign: "right" }}>{v}</span></div>
      ))}
      <div style={{ color: "#6f93b0", fontSize: 12, margin: "12px 0" }}>Telegram — один из подключаемых модулей, подключится на шаге P32 (Telegram Authorization).</div>
      <a href="/client" style={{ ...C.btn, textDecoration: "none", display: "inline-block" }}>Открыть Workspace →</a>
    </div></div>
  );

  const s = STEPS[i]; const last = i === STEPS.length - 1;
  const val = { name, build, role, budget, lang }[s.k as "name" | "build" | "role" | "budget" | "lang"];
  const canNext = s.kind === "many" ? true : s.kind === "text" ? name.trim().length > 0 : Boolean(val);
  return (
    <div style={C.wrap}><div style={C.card}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#7fa6c4", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase" }}><span>AI Operator Initialization</span><span>{i + 1} / {STEPS.length}</span></div>
      <div style={{ height: 3, background: "rgba(255,255,255,.1)", borderRadius: 2, margin: "10px 0 20px" }}><div style={{ height: "100%", width: `${((i + 1) / STEPS.length) * 100}%`, background: "linear-gradient(90deg,#22e3ff,#ff2bd6)", borderRadius: 2 }} /></div>
      <h2 style={{ margin: "0 0 14px", fontSize: 22 }}>{s.t}</h2>
      {s.kind === "text" && <input autoFocus style={C.inp} value={name} onChange={e => setName(e.target.value)} placeholder={(s as any).ph} />}
      {s.kind === "one" && <div>{(s as any).opts.map((o: string) => <Chip key={o} on={val === o} label={o} onClick={() => ({ build: setBuild, role: setRole, budget: setBudget, lang: setLang }[s.k as "build" | "role" | "budget" | "lang"])(o)} />)}</div>}
      {s.kind === "many" && <div>{(s as any).opts.map((o: string) => { const cur = s.k === "ai" ? ai : conn; const set = s.k === "ai" ? setAi : setConn; return <Chip key={o} on={cur.includes(o)} label={o} onClick={() => toggle(cur, set, o)} />; })}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button style={C.ghost} onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Назад</button>
        {last ? <button style={C.btn} onClick={finish} disabled={busy || !canNext}>{busy ? "Создаю…" : "Создать AI Identity"}</button>
              : <button style={C.btn} onClick={() => setI(i + 1)} disabled={!canNext}>Далее</button>}
      </div>
    </div></div>
  );
}
