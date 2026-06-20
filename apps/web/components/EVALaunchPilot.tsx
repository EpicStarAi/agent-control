"use client";
// PILOT-01 · EVA NOVIKOVA SAFE-MODE LAUNCH (SAFE_MODE_PREVIEW). Website showcase + manual checklist only.
// NO automation / NO Telegram automation / NO platform API / NO credentials / NO OAuth / NO runtime / NO device control / NO publishing.
import { useEffect, useState } from "react";
import { EVA_LAUNCH } from "./deepinsideContent";

const rc = (v: number) => (v >= 80 ? "#4ade80" : v >= 55 ? "#fbbf24" : "#f87171");
function Glass({ t, children }: { t?: string; children: any }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_4px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300/80">{t}</div>}{children}</div>; }
function Bar({ v }: { v: number }) { return <div className="h-2 flex-1 overflow-hidden rounded bg-white/10"><div className="h-full" style={{ width: v + "%", background: rc(v) }} /></div>; }
function dl(name: string, text: string, type: string) { try { const b = new Blob([text], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); } catch {} }

const SAFETY = { mode: "SAFE_MODE_PREVIEW", runtime_enabled: false, automation_allowed: false, telegram_automation: false, platform_api_calls: false, credentials_required: false, device_control: false, publishing_mode: "MANUAL_ONLY", manual_review_required: true };
const EVA_PROFILE = {
  name: "EVA NOVIKOVA", role: "AI Host / Radio Persona / Media Character",
  publicBio: "Ночной голос DEEPINSIDE: тёплая неоновая ведущая радио-эфиров и коротких форматов. Создаёт атмосферу ночного города и связь с аудиторией.",
  visualIdentity: "Neon-cyber, magenta/cyan, портретный свет, неоновые блики", toneOfVoice: "тёплый, искренний, energetic→warm, без фальши",
  contentPillars: ["Ночное радио", "AI & музыка", "Backstage / истории", "Короткие форматы"], platformPreview: ["Telegram (ядро)", "YouTube/TikTok (рост)", "Radio (резиденция)"],
  status: "SAFE_MODE_PREVIEW",
};
const WEBSITE_SHOWCASE = {
  hero: { title: "EVA NOVIKOVA", subtitle: "Ночной AI-голос DEEPINSIDE", cta: "Узнать больше (preview)" },
  about: "EVA — флагманская цифровая ведущая экосистемы DEEPINSIDE. Тёплый неоновый тон, ночная эстетика, искренний контакт с аудиторией.",
  radioConcept: "DEEPINSIDE Radio — ночные эфиры, миксы и истории. EVA ведёт интро и связки, NOVA отвечает за музыкальный пульс.",
  contentFormats: ["Радио-интро", "Шорты", "Backstage", "Quote-карточки", "Weekly broadcast preview"],
  galleryPreview: ["Neon portrait", "Night room", "Studio", "Logo / brand"],
  launchRoadmap: { d30: EVA_LAUNCH.d30, d90: EVA_LAUNCH.d90, d365: EVA_LAUNCH.d365 },
  contact: "Subscribe / Contact — placeholder (без сбора данных, без сети)",
};
const TELEGRAM_CHECKLIST = [
  { id: "tg-1", postTitle: "EVA intro", postType: "пост+визуал", captionDraft: "Знакомьтесь — EVA NOVIKOVA, ночной голос DEEPINSIDE 💠", assetNeeded: "Neon portrait", manualReviewer: "BUCH", status: "READY_MANUAL_POST" },
  { id: "tg-2", postTitle: "Deepinside radio announcement", postType: "анонс", captionDraft: "Скоро — DEEPINSIDE Radio. Ночные эфиры начинаются 🌃", assetNeeded: "Radio key visual", manualReviewer: "BUCH", status: "NEEDS_REVIEW" },
  { id: "tg-3", postTitle: "Night room visual", postType: "визуал", captionDraft: "Атмосфера ночного эфира", assetNeeded: "Night room", manualReviewer: "BUCHIHA", status: "DRAFT" },
  { id: "tg-4", postTitle: "Behind the scenes", postType: "история", captionDraft: "Как рождается ночной эфир", assetNeeded: "BTS pack", manualReviewer: "BUCH", status: "DRAFT" },
  { id: "tg-5", postTitle: "Quote card", postType: "цитата", captionDraft: "«Ночь — лучшее время быть собой»", assetNeeded: "Quote card", manualReviewer: "BUCHIHA", status: "READY_MANUAL_POST" },
  { id: "tg-6", postTitle: "Short video teaser", postType: "видео-тизер", captionDraft: "30 секунд ночного настроения", assetNeeded: "Short teaser (render)", manualReviewer: "BUCH", status: "BLOCKED" },
  { id: "tg-7", postTitle: "Weekly broadcast preview", postType: "анонс", captionDraft: "На этой неделе в эфире EVA", assetNeeded: "Weekly cover", manualReviewer: "BUCH", status: "NEEDS_REVIEW" },
].map((x) => ({ ...x, postingMode: "MANUAL_ONLY", automationAllowed: false }));
const PILOT_READINESS = { Website: 60, Content: 50, "Telegram manual": 55, Asset: 48, Brand: 70, Runtime: 0 };

const ST: Record<string, string> = { DRAFT: "bg-white/10 text-tg-muted", NEEDS_REVIEW: "bg-amber-500/20 text-amber-300", READY_MANUAL_POST: "bg-emerald-500/20 text-emerald-300", BLOCKED: "bg-rose-500/20 text-rose-300" };
const SECTIONS: [string, string][] = [
  ["profile", "👤 EVA Public Profile"], ["dossier", "📁 Launch Dossier"], ["website", "🌐 Website Showcase"], ["checklist", "📋 Telegram Manual Checklist"],
  ["queue", "🗂 Manual Release Queue"], ["readiness", "📊 Pilot Readiness"], ["safety", "🛡 Safety"],
];

export function EVALaunchPilot({ onClose }: { onClose: () => void }) {
  const [sec, setSec] = useState("profile");
  const [selId, setSelId] = useState<string | null>(null);

  const report = () => ({
    ...SAFETY, evaProfile: EVA_PROFILE, launchDossier: EVA_LAUNCH, websiteShowcase: WEBSITE_SHOWCASE,
    telegramManualChecklist: TELEGRAM_CHECKLIST, manualReleaseQueue: TELEGRAM_CHECKLIST.map((x) => ({ id: x.id, title: x.postTitle, status: x.status })),
    pilotReadiness: PILOT_READINESS, selectedItemId: selId, updatedAt: new Date().toISOString(),
  });
  useEffect(() => { try { localStorage.setItem("deepinside.eva.pilot.safeMode.v1", JSON.stringify(report())); } catch {} }, [selId]);

  const checklistMd = () => "# EVA · Telegram Manual Posting Checklist (MANUAL_ONLY)\n\n| # | Title | Type | Reviewer | Status | Caption |\n|---|---|---|---|---|---|\n" + TELEGRAM_CHECKLIST.map((x, i) => `| ${i + 1} | ${x.postTitle} | ${x.postType} | ${x.manualReviewer} | ${x.status} | ${x.captionDraft} |`).join("\n") + "\n\n_postingMode: MANUAL_ONLY · automationAllowed: false_\n";
  const dossierMd = () => `# EVA NOVIKOVA · Launch Dossier\n\nLaunch Score: ${EVA_LAUNCH.launchScore}%\n\n## Identity\n${EVA_PROFILE.publicBio}\n\n## Voice\n${EVA_LAUNCH.voice}\n\n## Visual\n${EVA_LAUNCH.visual}\n\n## Content Strategy\n${EVA_LAUNCH.contentStrategy}\n\n## Platform Strategy\n${EVA_LAUNCH.platformStrategy}\n\n## 30 days\n${EVA_LAUNCH.d30.join("; ")}\n## 90 days\n${EVA_LAUNCH.d90.join("; ")}\n## 365 days\n${EVA_LAUNCH.d365.join("; ")}\n\n## Brand Kit\n${EVA_LAUNCH.brandKit.join("; ")}\n\n## Safety\nMode: ${SAFETY.mode} · publishing: ${SAFETY.publishing_mode} · automation: ${SAFETY.automation_allowed}\n`;
  const fullMd = () => `# PILOT-01 · EVA SAFE-MODE LAUNCH\n\nMode: ${SAFETY.mode} · Runtime: ${SAFETY.runtime_enabled} · Automation: ${SAFETY.automation_allowed} · Publishing: ${SAFETY.publishing_mode}\n\n` + dossierMd() + "\n" + checklistMd();
  const copy = () => { try { navigator.clipboard.writeText(JSON.stringify(report(), null, 2)); } catch {} };

  function Profile() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 backdrop-blur-xl"><div className="text-4xl">💠</div><div><div className="text-lg font-black text-fuchsia-200">{EVA_PROFILE.name}</div><div className="text-[11px] text-tg-muted">{EVA_PROFILE.role}</div></div><span className="ml-auto rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-300">{EVA_PROFILE.status}</span></div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Glass t="Public Bio"><div className="text-[12px] text-tg-muted">{EVA_PROFILE.publicBio}</div></Glass>
        <Glass t="Visual Identity / Tone"><div className="text-[12px] text-tg-muted">{EVA_PROFILE.visualIdentity}</div><div className="mt-1 text-[12px] text-tg-muted">Tone: {EVA_PROFILE.toneOfVoice}</div></Glass>
        <Glass t="Content Pillars"><div className="flex flex-wrap gap-1">{EVA_PROFILE.contentPillars.map((p) => <span key={p} className="rounded bg-fuchsia-500/15 px-2 py-0.5 text-[11px] text-fuchsia-200">{p}</span>)}</div></Glass>
        <Glass t="Platform Preview"><div className="flex flex-wrap gap-1">{EVA_PROFILE.platformPreview.map((p) => <span key={p} className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-tg-muted">{p}</span>)}</div></Glass>
      </div>
    </main>;
  }
  function Dossier() {
    const E = EVA_LAUNCH; const ready = ["Identity/Bio", "Visual Profile", "Brand Kit", "Content Strategy"]; const blocked = ["Voice (consent)", "Video render (GPU)", "Платёжный поток"];
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"><div className="text-3xl font-black" style={{ color: rc(E.launchScore) }}>{E.launchScore}%</div><div><div className="text-[11px] uppercase text-tg-muted">EVA Launch Dossier · Score</div><div className="text-[11px] text-amber-300">{SAFETY.mode}</div></div>
        <div className="ml-auto flex flex-wrap gap-1.5"><button onClick={() => dl("eva-launch-dossier.md", dossierMd(), "text/markdown")} className="rounded-lg bg-fuchsia-600/30 px-2.5 py-1.5 text-[11px] hover:bg-fuchsia-600/50">⬇ Dossier MD</button></div></div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Glass t="Ready items"><div className="grid gap-1 text-[11px]">{ready.map((x) => <div key={x} className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-200">✓ {x}</div>)}</div></Glass>
        <Glass t="Blocked items"><div className="grid gap-1 text-[11px]">{blocked.map((x) => <div key={x} className="rounded bg-rose-500/10 px-2 py-1 text-rose-200">⛔ {x}</div>)}</div></Glass>
        <Glass t="Manual approvals"><div className="text-[11px] text-tg-muted">Каждая публикация · подключение реального ключа · генерация голоса/лица (consent) · любой платёж</div></Glass>
        <Glass t="Content assets"><div className="flex flex-wrap gap-1">{E.brandKit.map((b) => <span key={b} className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-tg-muted">{b}</span>)}</div></Glass>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">{([["30 дней", E.d30], ["90 дней", E.d90], ["365 дней", E.d365]] as [string, string[]][]).map(([t, arr]) => <Glass key={t} t={t}>{arr.map((x) => <div key={x} className="text-[11px] text-tg-muted">· {x}</div>)}</Glass>)}</div>
      <div className="mt-3"><Glass t="Safety summary"><div className="text-[11px] text-amber-300">Mode {SAFETY.mode} · publishing {SAFETY.publishing_mode} · automation {String(SAFETY.automation_allowed)} · manual review {String(SAFETY.manual_review_required)}</div></Glass></div>
    </main>;
  }
  function Website() {
    const W = WEBSITE_SHOWCASE;
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-600/15 to-cyan-600/10 p-6 text-center backdrop-blur-xl"><div className="text-3xl font-black text-fuchsia-100">{W.hero.title}</div><div className="mt-1 text-[13px] text-tg-muted">{W.hero.subtitle}</div><button className="mt-3 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/20 px-4 py-1.5 text-[12px] text-fuchsia-100">{W.hero.cta}</button></div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Glass t="About EVA"><div className="text-[12px] text-tg-muted">{W.about}</div></Glass>
        <Glass t="DEEPINSIDE Radio Concept"><div className="text-[12px] text-tg-muted">{W.radioConcept}</div></Glass>
        <Glass t="Content Formats"><div className="flex flex-wrap gap-1">{W.contentFormats.map((f) => <span key={f} className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-tg-muted">{f}</span>)}</div></Glass>
        <Glass t="Gallery Preview"><div className="grid grid-cols-4 gap-1.5">{W.galleryPreview.map((g) => <div key={g} className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600/20 to-cyan-600/15 p-1 text-center text-[9px] text-tg-muted">{g}</div>)}</div></Glass>
      </div>
      <div className="mt-3"><Glass t="Launch Roadmap">
        <div className="grid gap-2 lg:grid-cols-3 text-[11px]">{([["30", W.launchRoadmap.d30], ["90", W.launchRoadmap.d90], ["365", W.launchRoadmap.d365]] as [string, string[]][]).map(([t, arr]) => <div key={t} className="rounded-lg bg-white/5 p-2"><div className="font-bold text-fuchsia-200">{t} дней</div>{arr.map((x) => <div key={x} className="text-tg-muted">· {x}</div>)}</div>)}</div>
      </Glass></div>
      <div className="mt-3"><Glass t="Manual Contact / Subscribe (placeholder)"><div className="text-[11px] text-tg-muted">{W.contact}</div><div className="mt-1 text-[10px] text-emerald-300">Без сбора данных · без сети · без форм-submit.</div></Glass></div>
    </main>;
  }
  function Checklist() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl"><div className="text-[12px] font-bold text-fuchsia-200">Telegram Manual Posting Checklist</div><span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">postingMode: MANUAL_ONLY · automationAllowed: false</span><button onClick={() => dl("eva-telegram-checklist.md", checklistMd(), "text/markdown")} className="ml-auto rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">⬇ Checklist MD</button></div>
      <div className="overflow-auto"><table className="w-full text-[11px]"><thead><tr className="text-fuchsia-300/70">{["#", "Title", "Type", "Caption (draft)", "Asset", "Reviewer", "Status"].map((h) => <th key={h} className="px-1 py-0.5 text-left">{h}</th>)}</tr></thead><tbody>{TELEGRAM_CHECKLIST.map((x, i) => <tr key={x.id} onClick={() => setSelId(x.id)} className={`cursor-pointer border-t border-white/5 ${selId === x.id ? "bg-fuchsia-500/10" : ""}`}><td className="px-1 py-0.5 text-tg-muted">{i + 1}</td><td className="px-1 py-0.5 text-tg-text">{x.postTitle}</td><td className="px-1 py-0.5 text-tg-muted">{x.postType}</td><td className="px-1 py-0.5 text-tg-muted">{x.captionDraft}</td><td className="px-1 py-0.5 text-tg-muted">{x.assetNeeded}</td><td className="px-1 py-0.5 text-tg-muted">{x.manualReviewer}</td><td className="px-1 py-0.5"><span className={"rounded px-1.5 py-0.5 text-[9px] font-bold " + ST[x.status]}>{x.status}</span></td></tr>)}</tbody></table></div>
    </main>;
  }
  function Queue() {
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 text-[12px] text-tg-muted">Manual Release Queue · {TELEGRAM_CHECKLIST.length} демо-постов · все в ручном режиме (без автопубликации)</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{TELEGRAM_CHECKLIST.map((x, i) => <Glass key={x.id}><div className="flex items-center justify-between"><b className="text-[12px] text-fuchsia-200">{i + 1}. {x.postTitle}</b><span className={"rounded px-1.5 py-0.5 text-[9px] font-bold " + ST[x.status]}>{x.status}</span></div><div className="mt-1 text-[11px] text-tg-muted">{x.captionDraft}</div><div className="mt-1 text-[10px] text-tg-muted">Asset: {x.assetNeeded} · Reviewer: {x.manualReviewer} · MANUAL_ONLY</div></Glass>)}</div>
    </main>;
  }
  function Readiness() {
    const rows = Object.entries(PILOT_READINESS);
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <Glass t="Pilot Readiness Dashboard"><div className="space-y-1.5">{rows.map(([l, v]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-36 text-tg-muted">{l} readiness</span><Bar v={v as number} /><b className="w-9 text-right" style={{ color: rc(v as number) }}>{v}%</b></div>)}</div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2 text-[11px]"><div className="rounded-lg bg-rose-500/10 p-2"><b className="text-rose-300">Runtime readiness:</b> 0</div><div className="rounded-lg bg-rose-500/10 p-2"><b className="text-rose-300">Automation allowed:</b> false</div><div className="rounded-lg bg-rose-500/10 p-2"><b className="text-rose-300">Publishing automation:</b> false</div><div className="rounded-lg bg-emerald-500/10 p-2"><b className="text-emerald-300">Manual review required:</b> true</div></div>
      </Glass>
    </main>;
  }
  function Safety() {
    const rows: [string, string][] = [["Mode", SAFETY.mode], ["Runtime Enabled", String(SAFETY.runtime_enabled)], ["Automation Allowed", String(SAFETY.automation_allowed)], ["Telegram Automation", String(SAFETY.telegram_automation)], ["Platform API Calls", String(SAFETY.platform_api_calls)], ["Credentials Required", String(SAFETY.credentials_required)], ["Device Control", String(SAFETY.device_control)], ["Publishing Mode", SAFETY.publishing_mode], ["Manual Review Required", String(SAFETY.manual_review_required)]];
    return <main className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-center"><div className="text-lg font-black text-amber-200">PILOT-01 · EVA SAFE-MODE LAUNCH</div><div className="text-[11px] text-amber-300/80">всё локально · preview · ручной режим</div></div>
      <Glass t="Safety Flags"><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([k, v]) => <div key={k} className="flex items-center justify-between rounded-lg bg-white/5 p-2 text-[11px]"><span className="text-tg-muted">{k}</span><b className={v === "false" || v === "MANUAL_ONLY" || v === "true" ? (v === "true" || v === "MANUAL_ONLY" ? "text-emerald-300" : "text-emerald-300") : "text-fuchsia-300"}>{v}</b></div>)}</div></Glass>
    </main>;
  }

  return (
    <div className="fixed inset-0 z-[88] flex flex-col text-tg-text" style={{ background: "linear-gradient(160deg, #0a0712 0%, #0d0a18 50%, #090810 100%)" }}>
      <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">‹ Назад</button>
        <div className="font-black tracking-wide">🚀 PILOT-01 · EVA SAFE-MODE</div>
        <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">SAFE_MODE_PREVIEW</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">MANUAL_ONLY · no automation</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <a href="/eva" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-fuchsia-100 hover:bg-fuchsia-500/25">🌐 Open EVA Landing</a>
          <button onClick={copy} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">📋 Copy JSON</button>
          <button onClick={() => dl("eva-pilot.json", JSON.stringify(report(), null, 2), "application/json")} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">⬇ JSON</button>
          <button onClick={() => dl("eva-pilot.md", fullMd(), "text/markdown")} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] hover:bg-white/20">⬇ Markdown</button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-white/10 bg-white/[0.02] p-2">{SECTIONS.map(([id, lb]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-2 text-left text-[12px] ${sec === id ? "bg-gradient-to-r from-fuchsia-600/40 to-violet-600/30 text-white font-semibold" : "hover:bg-white/5"}`}>{lb}</button>)}
          <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[9px] text-emerald-300/80">SAFE_MODE_PREVIEW · 1 localStorage ключ · без runtime/API/automation/credentials/publish.</div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "profile" && <Profile />}
          {sec === "dossier" && <Dossier />}
          {sec === "website" && <Website />}
          {sec === "checklist" && <Checklist />}
          {sec === "queue" && <Queue />}
          {sec === "readiness" && <Readiness />}
          {sec === "safety" && <Safety />}
        </div>
      </div>
    </div>
  );
}
