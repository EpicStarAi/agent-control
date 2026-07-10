"use client";

// DEVICE PROVISIONING AGENT — safe provisioning pipeline for Cloud Phone / Android. Category: OPERATIONS · ACTIVE
// UI + localStorage + mock API adapter only. NO real GeeLark API, NO API keys stored, NO autologin,
// NO Telegram/social actions, NO publishing. Every runtime action is an APPROVAL DRAFT requiring explicit approve.

import { useEffect, useMemo, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; slots: any[]; bind: Record<string, string> };
const KP = "epic_device_provisioning_v1", KC = "epic_device_app_catalog_v1", KL = "epic_device_provisioning_logs_v1", KQ = "epic_device_approval_queue_v1";

const TABS = [
  ["overview", "🏠 Overview"], ["pipeline", "🧰 Provisioning Pipeline"], ["installer", "📦 App Installer"], ["checklist", "✅ Device Checklist"],
  ["proxy", "🌐 Proxy Check"], ["binding", "👤 Account Binding"], ["agent", "🧠 Agent Assignment"], ["mission", "🚀 Mission Assignment"],
  ["queue", "⏳ Approval Queue"], ["logs", "📜 Logs"], ["reports", "📑 Reports"], ["settings", "⚙ Settings"],
] as const;
const MODES: [string, string][] = [["audit", "Read-Only Audit"], ["safe", "Safe Provisioning"], ["manual", "Manual Approval Required"]];
const APPS = ["Telegram", "EPICGRAM", "Google", "YouTube", "TikTok", "Instagram", "Facebook", "GitHub", "Chrome", "Google Drive", "CapCut", "Canva", "DEEPINSIDE PWA"];
const PKG: Record<string, string> = { Telegram: "org.telegram.messenger", EPICGRAM: "life.deepinside.epicgram", Google: "com.google.android.googlequicksearchbox", YouTube: "com.google.android.youtube", TikTok: "com.zhiliaoapp.musically", Instagram: "com.instagram.android", Facebook: "com.facebook.katana", GitHub: "com.github.android", Chrome: "com.android.chrome", "Google Drive": "com.google.android.apps.docs", CapCut: "com.lemon.lvoverseas", Canva: "com.canva.editor", "DEEPINSIDE PWA": "pwa.deepinside.life" };
const STEPS = ["Select Device", "Check Device Health", "Check Proxy", "Install Required Apps", "Verify App Launch", "Bind Agent", "Bind Mission", "Generate Report"];

// ---- MOCK API ADAPTER (no real GeeLark calls, no keys) ----
const geelarkMock = {
  health: () => ({ android: "13", screen: "1080×1920", storageFreeGB: 18, battery: "—", rooted: false }),
  proxy: (name: string) => ({ name, status: name && name !== "—" ? "healthy" : "missing", country: "DE", latencyMs: 42 }),
  appState: () => "not-installed" as const,
};

const SCLR: Record<string, string> = { ok: "#4ade80", healthy: "#4ade80", installed: "#4ade80", done: "#4ade80", approved: "#4ade80", pending: "#fbbf24", queued: "#fbbf24", warning: "#fbbf24", missing: "#f87171", failed: "#f87171", rejected: "#f87171", "not-installed": "#9ca3af", idle: "#9ca3af" };
function Dot({ s }: { s: string }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCLR[s] || "#9ca3af" }} />; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-[rgba(6,182,212,.2)] bg-[rgba(13,20,28,.6)] p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }

export function ProvisioningAgent({ ctx, onClose, onOpenAgent }: { ctx: Ctx; onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const devices = useMemo(() => { try { const d = JSON.parse(localStorage.getItem("epic_device_center_v1") || "null"); if (d?.devices) return d.devices; } catch {} return [{ id: "PHONE-01", status: "online", proxy: "PRX-EU-01", agent: "EVA", mission: "EVA Shorts" }, { id: "PHONE-02", status: "online", proxy: "PRX-US-01", agent: "BUCHIHA", mission: "Teasers" }, { id: "PHONE-04", status: "offline", proxy: "—", agent: "—", mission: "—" }]; }, []);

  const [tab, setTab] = useState("overview");
  const [dev, setDev] = useState<string>(devices[0]?.id || "");
  const [mode, setMode] = useState<string>("audit");
  const [apps, setApps] = useState<Record<string, string>>({}); // app -> not-installed|queued|installed
  const [steps, setSteps] = useState<Record<string, string>>({}); // step -> idle|done|pending
  const [queue, setQueue] = useState<{ id: string; action: string; device: string; status: string }[]>([]);
  const [logs, setLogs] = useState<{ t: string; text: string }[]>([]);
  const [bindAgent, setBindAgent] = useState(""); const [bindMission, setBindMission] = useState(""); const [bindAccount, setBindAccount] = useState("");

  useEffect(() => { try { const q = JSON.parse(localStorage.getItem(KQ) || "[]"); if (Array.isArray(q)) setQueue(q); const l = JSON.parse(localStorage.getItem(KL) || "[]"); if (Array.isArray(l)) setLogs(l); const p = JSON.parse(localStorage.getItem(KP) || "null"); if (p?.apps?.[dev]) setApps(p.apps[dev]); } catch {} }, []);
  useEffect(() => { try {
    localStorage.setItem(KC, JSON.stringify({ apps: APPS.map((a) => ({ name: a, pkg: PKG[a], allowed: true })) }));
    localStorage.setItem(KQ, JSON.stringify(queue));
    localStorage.setItem(KL, JSON.stringify(logs.slice(0, 60)));
    localStorage.setItem(KP, JSON.stringify({ ts: new Date().toISOString(), device: dev, mode, apps: { [dev]: apps }, steps, bind: { agent: bindAgent, mission: bindMission, account: bindAccount } }));
  } catch {} }, [queue, logs, apps, steps, dev, mode, bindAgent, bindMission, bindAccount]);

  const device = devices.find((d: any) => d.id === dev) || devices[0];
  const health = geelarkMock.health();
  const proxy = geelarkMock.proxy(device?.proxy || "—");
  function log(text: string) { setLogs((l) => [{ t: new Date().toISOString().slice(11, 19), text }, ...l].slice(0, 60)); }
  function draft(action: string) { const id = "ap" + Date.now() + Math.floor(Math.random() * 99); setQueue((q) => [{ id, action, device: dev, status: "pending" }, ...q]); log("Draft created: " + action); }
  function resolve(id: string, ok: boolean) { setQueue((q) => q.map((x) => { if (x.id !== id) return x; if (ok && /Install (.+)/.exec(x.action)) { const app = x.action.replace("Install ", ""); setApps((a) => ({ ...a, [app]: "installed" })); } log((ok ? "Approved" : "Rejected") + ": " + x.action); return { ...x, status: ok ? "approved" : "rejected" }; })); }

  function runStep(step: string) {
    if (mode === "audit") { setSteps((s) => ({ ...s, [step]: "done" })); log("Audit: " + step + " — read-only check ok"); return; }
    if (step === "Install Required Apps") { APPS.forEach((a) => { if (apps[a] !== "installed") { setApps((p) => ({ ...p, [a]: "queued" })); draft("Install " + a); } }); setSteps((s) => ({ ...s, [step]: "pending" })); return; }
    if (mode === "manual") { draft("Step: " + step); setSteps((s) => ({ ...s, [step]: "pending" })); return; }
    setSteps((s) => ({ ...s, [step]: "done" })); log("Safe: " + step + " — done");
  }
  function queueApp(a: string) { if (apps[a] === "installed") return; setApps((p) => ({ ...p, [a]: "queued" })); draft("Install " + a); }

  const installed = APPS.filter((a) => apps[a] === "installed").length;
  const pending = queue.filter((q) => q.status === "pending").length;
  const readyDevices = devices.filter((d: any) => d.status === "online").length;

  function genReport() {
    const rep = { schema: "provisioning_report", ts: new Date().toISOString(), device: dev, mode, health, proxy, appsInstalled: APPS.filter((a) => apps[a] === "installed"), appsPending: APPS.filter((a) => apps[a] === "queued"), bind: { agent: bindAgent, mission: bindMission, account: bindAccount }, approvalsPending: pending, note: "Mock provisioning report. No real GeeLark calls, no keys, no autologin." };
    log("Report generated for " + dev);
    const b = new Blob([JSON.stringify(rep, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "provisioning_" + dev + ".json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000);
  }

  function Body() {
    if (tab === "overview") return <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{([["Devices", devices.length], ["Ready", readyDevices], ["Apps Installed", installed], ["Pending Approvals", pending], ["Mode", MODES.find((m) => m[0] === mode)?.[1]]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-2xl font-black text-cyan-300">{v}</div></Card>)}</div>
      <Card t="Safety"><div className="text-sm text-tg-muted">Без реальных GeeLark API, без хранения ключей, без автологина, без Telegram/social-действий. Все runtime-действия — только approval-драфты. Mock API adapter.</div></Card></div>;
    if (tab === "pipeline") return <Card t="Provisioning Pipeline"><div className="space-y-1.5">{STEPS.map((s, i) => <div key={s} className="flex items-center gap-2 text-sm"><span className="w-5 text-tg-muted">{i + 1}</span><Dot s={steps[s] || "idle"} /><span className="flex-1">{s}</span><span className="text-[11px]" style={{ color: SCLR[steps[s] || "idle"] }}>{steps[s] || "idle"}</span>{s !== "Select Device" && <button onClick={() => s === "Generate Report" ? genReport() : runStep(s)} className="rounded-lg bg-tg-active px-2.5 py-1 text-[11px] font-semibold text-white">Run</button>}</div>)}</div>
      <div className="mt-2 text-[11px] text-tg-muted">Audit: только проверки. Safe: установка через approval-драфты. Manual: каждый шаг требует approve.</div></Card>;
    if (tab === "installer") return <Card t="App Installer (approval drafts only)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["App", "Package", "Status", ""].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{APPS.map((a) => <tr key={a} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{a}</td><td className="px-2 font-mono text-tg-muted">{PKG[a]}</td><td className="px-2"><Dot s={apps[a] || "not-installed"} /> {apps[a] || "not-installed"}</td><td className="px-2">{apps[a] !== "installed" && <button onClick={() => queueApp(a)} className="rounded bg-tg-bg px-2 py-1 text-[10px] ring-1 ring-tg-line">Queue install</button>}</td></tr>)}</tbody></table></Card>;
    if (tab === "checklist") return <Card t="Device Checklist"><div className="space-y-1 text-sm">{([["Device", device?.id], ["Status", device?.status], ["Android", health.android], ["Screen", health.screen], ["Free storage", health.storageFreeGB + " GB"], ["Rooted", String(health.rooted)]] as const).map(([l, v]) => <div key={l} className="flex items-center gap-2"><Dot s="ok" /><span className="w-28 text-tg-muted">{l}</span><b className="text-tg-text">{v}</b></div>)}</div></Card>;
    if (tab === "proxy") return <Card t="Proxy Check"><div className="space-y-1 text-sm">{([["Proxy", proxy.name], ["Status", proxy.status], ["Country", proxy.country], ["Latency", proxy.latencyMs + " ms"]] as const).map(([l, v]) => <div key={l} className="flex items-center gap-2"><Dot s={proxy.status} /><span className="w-24 text-tg-muted">{l}</span><b className="text-tg-text">{v}</b></div>)}</div></Card>;
    if (tab === "binding") return <Card t="Account Binding"><div className="text-[12px] text-tg-muted">Привязка аккаунта к устройству — без автологина, только связь в реестре.</div><select value={bindAccount} onChange={(e) => { setBindAccount(e.target.value); draft("Bind account " + e.target.value); }} className="mt-2 w-full max-w-xs rounded-lg bg-tg-bg px-3 py-1.5 text-sm"><option value="">— выбрать аккаунт —</option>{ctx.slots.map((s: any) => <option key={s.slotId || s.label} value={s.displayName || s.slotId}>{s.displayName || s.slotId}</option>)}</select>{bindAccount && <div className="mt-1 text-[11px] text-emerald-300">Draft: bind {bindAccount} ↔ {dev}</div>}</Card>;
    if (tab === "agent") return <Card t="Agent Assignment"><select value={bindAgent} onChange={(e) => { setBindAgent(e.target.value); draft("Assign agent " + e.target.value); }} className="w-full max-w-xs rounded-lg bg-tg-bg px-3 py-1.5 text-sm"><option value="">— выбрать агента —</option>{ctx.agents.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}</select>{bindAgent && <button onClick={() => { const ag = ctx.agents.find((a) => a.name === bindAgent); if (ag) onOpenAgent?.(ag.id); }} className="ml-2 rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open Agent →</button>}</Card>;
    if (tab === "mission") return <Card t="Mission Assignment"><select value={bindMission} onChange={(e) => { setBindMission(e.target.value); draft("Assign mission " + e.target.value); }} className="w-full max-w-xs rounded-lg bg-tg-bg px-3 py-1.5 text-sm"><option value="">— выбрать миссию —</option>{ctx.missions.map((m) => <option key={m.id} value={m.title}>{m.title}</option>)}</select>{bindMission && <div className="mt-1 text-[11px] text-emerald-300">Draft: {dev} → {bindMission}</div>}</Card>;
    if (tab === "queue") return <Card t={"Approval Queue · " + pending + " pending"}><div className="space-y-1">{queue.length ? queue.map((q) => <div key={q.id} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-3 py-1.5 text-sm"><Dot s={q.status} /><span className="flex-1">{q.action}</span><span className="text-[11px] text-tg-muted">{q.device}</span>{q.status === "pending" ? <><button onClick={() => resolve(q.id, true)} className="rounded bg-emerald-600/20 px-2 py-1 text-[10px] text-emerald-300">Approve</button><button onClick={() => resolve(q.id, false)} className="rounded bg-rose-600/20 px-2 py-1 text-[10px] text-rose-300">Reject</button></> : <span className="text-[10px]" style={{ color: SCLR[q.status] }}>{q.status}</span>}</div>) : <div className="text-tg-muted">Очередь пуста.</div>}</div></Card>;
    if (tab === "logs") return <Card t="Provisioning Logs"><div className="space-y-0.5 text-[12px]">{logs.length ? logs.map((l, i) => <div key={i} className="flex gap-2"><span className="text-tg-muted">{l.t}</span><span>{l.text}</span></div>) : <div className="text-tg-muted">Логи пусты.</div>}</div></Card>;
    if (tab === "reports") return <Card t="Reports"><div className="text-sm text-tg-muted">Provisioning report: device {dev}, mode {MODES.find((m) => m[0] === mode)?.[1]}, apps installed {installed}/{APPS.length}, pending approvals {pending}.</div><button onClick={genReport} className="mt-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Generate Report ↓</button></Card>;
    return <Card t="Settings"><div className="text-sm text-tg-muted">Mock API adapter (GeeLark не вызывается). Ключи: epic_device_provisioning_v1 · epic_device_app_catalog_v1 · epic_device_provisioning_logs_v1 · epic_device_approval_queue_v1. Без секретов. Статус пишется в реестр для Device Center / WORLD / EPIC Architect / AI Operator / AI COO / Automation Center.</div></Card>;
  }

  return (
    <div className="fixed inset-0 z-[63] flex flex-col bg-[#070d13] text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(6,182,212,.25)] bg-[#0c151d] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🧰 DEVICE PROVISIONING AGENT</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · approval-only</span>
        <select value={dev} onChange={(e) => setDev(e.target.value)} className="ml-2 rounded-lg border border-tg-line bg-[#070d13] px-2 py-1 text-xs">{devices.map((d: any) => <option key={d.id} value={d.id}>{d.id}</option>)}</select>
        <div className="flex overflow-hidden rounded-lg ring-1 ring-tg-line">{MODES.map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`px-2.5 py-1 text-[11px] ${mode === id ? "bg-cyan-600 text-white" : "bg-tg-bg text-tg-muted"}`}>{label}</button>)}</div>
        <div className="ml-auto flex flex-wrap gap-1 text-[10px]">{([["Ready", readyDevices], ["Installed", installed], ["Pending", pending]] as const).map(([l, v]) => <span key={l} className="rounded-full border border-tg-line bg-tg-bg px-2 py-1"><span className="text-tg-muted">{l} </span><b>{v}</b></span>)}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-[rgba(6,182,212,.15)] bg-[#0c151d] p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">PROVISIONING</div>{TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${tab === id ? "bg-cyan-600/25 text-white ring-1 ring-cyan-500/40" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}</nav>
        <main className="min-h-0 overflow-auto p-4"><Body /></main>
      </div>
    </div>
  );
}
