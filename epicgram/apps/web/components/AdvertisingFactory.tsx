"use client";

// ADVERTISING FACTORY — ads as content: viral sketches, memes, native integrations, story campaigns.
// Category: MEDIA · ACTIVE. UI + localStorage + mock/derived only. No real ad accounts, no publishing,
// no external APIs/OAuth/secrets. Additive.

import { useEffect, useMemo, useState } from "react";

const NAV = [
  ["sketches", "🎭 Viral Sketches"], ["studio", "🎬 Ad Studio"], ["memes", "😂 Meme Factory"], ["native", "🎙 Native Integrations"],
  ["story", "📖 Story Campaigns"], ["analytics", "📈 Ad Analytics"], ["commercials", "🤖 AI Commercials"], ["sponsors", "🏆 Sponsors"],
] as const;
const FORMATS = ["15 sec", "30 sec", "60 sec", "3 min"];
const TYPES = ["юмор", "пранк", "разбор", "интервью", "мем", "новости", "сериал", "радио-шоу"];
const PLATFORMS = ["TikTok", "YouTube Shorts", "Instagram Reels", "Telegram", "Facebook", "X", "Сайт", "Радиоэфир"];
const BLOCKS = ["HOOK", "PROBLEM", "CHAOS", "SOLUTION", "TWIST", "CTA"];
const MEME_CATS = ["AI", "Tech", "Internet", "Cyber", "Startup", "Gaming", "Business"];
const SAMPLE_SCRIPT = [["BUCHIHA 😇", "— Буч, это опять ты сломал интернет?"], ["BUCH ☠️", "— Нет. Сегодня я сломал только три сервера."], ["BUCHIHA 😇", "— А четвёртый?"], ["BUCH ☠️", "— Его спас VPN."]];
const SKETCHES: [string, string, string, number][] = [["Серверный апокалипсис", "юмор", "30 sec", 92], ["BUCH ломает AI", "пранк", "60 sec", 88], ["EVA в новостях", "новости", "15 sec", 74], ["Ночной DJ-сет NOVA", "радио-шоу", "3 min", 81], ["Интервью с багом", "интервью", "60 sec", 79]];
const SPONSORS = [["NeonVPN", "Серверный апокалипсис", "native sketch", "active", "1.2M", "4.8%", 320], ["CyberHost", "BUCH ломает AI", "story arc", "active", "860k", "5.1%", 210], ["SynthBeats", "Ночной DJ-сет", "radio integration", "review", "—", "—", 0]];

const SCLR: Record<string, string> = { active: "#4ade80", live: "#4ade80", review: "#fbbf24", draft: "#9ca3af", ready: "#38bdf8" };
function Dot({ s }: { s: string }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCLR[s] || "#9ca3af" }} />; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }

export function AdvertisingFactory({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("sketches");
  const viral = useMemo(() => SKETCHES.map((s) => ({ name: s[0], scores: { Humor: 70 + ((s[0].length * 7) % 30), Meme: 60 + ((s[0].length * 5) % 40), Share: 65 + ((s[0].length * 3) % 35), Watch: 72, Comment: 55 } })), []);
  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("epic_ad_factory_v1", JSON.stringify({ ts, sketches: SKETCHES.length, sponsors: SPONSORS.length, formats: FORMATS, platforms: PLATFORMS }));
    localStorage.setItem("epic_ad_sketches_v1", JSON.stringify({ ts, items: SKETCHES }));
    localStorage.setItem("epic_ad_sponsors_v1", JSON.stringify({ ts, items: SPONSORS }));
  } catch {} }, []);

  function Body() {
    if (tab === "sketches") return <div className="space-y-3">
      <div className="flex flex-wrap gap-1 text-[11px]">{FORMATS.map((f) => <span key={f} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{f}</span>)}<span className="mx-1 text-tg-muted">·</span>{TYPES.map((tp) => <span key={tp} className="rounded-full bg-tg-bg px-2 py-0.5 text-tg-muted">{tp}</span>)}</div>
      <Card t="Sample Native Script"><div className="space-y-1 text-sm">{SAMPLE_SCRIPT.map(([who, line], i) => <div key={i}><b className="text-tg-accent">{who}:</b> <span className="text-tg-text">{line}</span></div>)}<div className="mt-1 text-[11px] text-tg-muted">…далее нативная интеграция спонсора как часть скетча.</div></div></Card>
      <Card t="Viral Sketches"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Sketch", "Type", "Format", "Viral Score"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{SKETCHES.map((s) => <tr key={s[0]} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{s[0]}</td><td className="px-2 text-tg-muted">{s[1]}</td><td className="px-2">{s[2]}</td><td className="px-2"><b className="text-cyan-300">{s[3]}</b></td></tr>)}</tbody></table></Card></div>;
    if (tab === "studio") return <div className="space-y-3"><Card t="AI Commercial Studio · Constructor"><div className="flex flex-wrap items-center gap-1.5">{BLOCKS.map((b, i) => <span key={b} className="flex items-center gap-1.5"><span className="rounded-lg border border-tg-accent/50 bg-tg-active/15 px-3 py-1.5 text-[11px] font-bold">{b}</span>{i < BLOCKS.length - 1 && <span className="text-tg-muted">→</span>}</span>)}</div>
      <div className="mt-2 text-[11px] text-tg-muted">Поддержка: вертикальные / горизонтальные видео, радиоролики, подкасты.</div></Card>
      <Card t="Content Matrix (авто-адаптация)"><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">{PLATFORMS.map((p) => <div key={p} className="rounded-lg bg-tg-bg/40 px-3 py-2 text-sm"><Dot s="ready" /> {p}</div>)}</div></Card></div>;
    if (tab === "memes") return <div className="space-y-3"><div className="flex flex-wrap gap-1 text-[11px]">{["Telegram", "TikTok", "Instagram", "YouTube Shorts", "Facebook", "X"].map((p) => <span key={p} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{p}</span>)}</div>
      <Card t="Meme Factory · Categories"><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">{MEME_CATS.map((c) => <div key={c} className="rounded-xl bg-tg-bg/40 p-3 text-center text-sm font-semibold">{c}</div>)}</div></Card></div>;
    if (tab === "native") return <Card t="Radio Integrations (DEEP INSIDE FM)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Формат", "Длительность", "Ведущие", "Статус"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{[["DJ интеграция", "20 сек", "AI DJ NOVA", "active"], ["Шутка", "10 сек", "BUCH/BUCHIHA", "active"], ["Мини-скетч", "30 сек", "BUCH/BUCHIHA", "ready"], ["Новостная вставка", "20 сек", "EVA", "active"], ["Разговор ведущих", "60 сек", "BUCH/BUCHIHA", "review"]].map((r) => <tr key={r[0]} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{r[0]}</td><td className="px-2">{r[1]}</td><td className="px-2 text-tg-accent">{r[2]}</td><td className="px-2"><Dot s={r[3]} /> {r[3]}</td></tr>)}</tbody></table></Card>;
    if (tab === "story") return <Card t="Story Campaigns (сериалы)"><div className="space-y-2">{[["Серверный апокалипсис", "S1 · E3", "Арка: восстание AI", "BUCH, BUCHIHA", "NeonVPN"], ["Cyber Kyiv", "S1 · E1", "Арка: ночной город", "EVA, NOVA", "CyberHost"]].map((c) => <div key={c[0]} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3 text-sm"><div className="font-semibold">{c[0]} <span className="text-tg-muted">· {c[1]}</span></div><div className="text-[11px] text-tg-muted">{c[2]} · Герои: {c[3]} · Продукт: {c[4]}</div></div>)}</div><div className="mt-1 text-[10px] text-tg-muted">Каждая серия продолжает предыдущую историю.</div></Card>;
    if (tab === "analytics") return <Card t="Ad Analytics"><div className="space-y-1.5">{([["Просмотры", 82, "#3ea6ff"], ["Удержание", 64, "#a78bfa"], ["Лайки", 71, "#f43f5e"], ["Комментарии", 48, "#fbbf24"], ["Репосты", 59, "#34d399"], ["Конверсии", 37, "#22c55e"]] as const).map(([l, v, c]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-28 text-tg-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: c }} /></div><span className="w-8 text-right">{v}%</span></div>)}</div>
      <div className="mt-2 text-[11px] text-tg-muted">Топ: скетчи · мемы · шоу · кампании.</div></Card>;
    if (tab === "commercials") return <div className="grid gap-3 lg:grid-cols-2">{viral.map((v) => <Card key={v.name} t={v.name}><div className="space-y-1">{Object.entries(v.scores).map(([l, s]) => <div key={l} className="flex items-center gap-2 text-[11px]"><span className="w-16 text-tg-muted">{l}</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-rose-500 to-cyan-400" style={{ width: s + "%" }} /></div><span className="w-7 text-right">{s}</span></div>)}<div className="mt-1 text-[11px]">Viral Score: <b className="text-cyan-300">{Math.round(Object.values(v.scores).reduce((a, b) => a + b, 0) / 5)}</b></div></div></Card>)}</div>;
    return <Card t="Sponsor Center"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Спонсор", "Кампания", "Формат", "Статус", "Охват", "CTR", "Конверсии"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{SPONSORS.map((s) => <tr key={s[0] as string} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{s[0]}</td><td className="px-2 text-tg-muted">{s[1]}</td><td className="px-2">{s[2]}</td><td className="px-2"><Dot s={s[3] as string} /> {s[3]}</td><td className="px-2">{s[4]}</td><td className="px-2">{s[5]}</td><td className="px-2">{s[6]}</td></tr>)}</tbody></table></Card>;
  }

  return (
    <div className="fixed inset-0 z-[64] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">📢 ADVERTISING FACTORY</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · MEDIA</span>
        <div className="ml-2 text-[11px] text-tg-muted">Реклама как контент · BUCH · BUCHIHA · EVA · NOVA</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[190px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">ADVERTISING</div>{NAV.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${tab === id ? "bg-tg-active/30 text-white ring-1 ring-tg-accent" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}</nav>
        <main className="min-h-0 overflow-auto p-4"><Body /></main>
      </div>
    </div>
  );
}
