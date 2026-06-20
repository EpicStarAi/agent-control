"use client";

// SOCIAL EMPIRE — digital identities, platform matrix, audience intelligence, growth, monetization,
// creator ranking, Pinterest network. Category: GROWTH · ACTIVE. UI + localStorage + mock/derived only.
// No publishing, no real APIs/OAuth, no secrets. Additive.

import { useEffect, useMemo, useState } from "react";

const NAV = [
  ["identities", "👤 Digital Identities"], ["matrix", "📱 Platform Matrix"], ["audience", "📊 Audience Intelligence"],
  ["planner", "📅 Content Planner"], ["growth", "🚀 Growth Engine"], ["monetization", "💰 Monetization"],
  ["ranking", "🏆 Creator Ranking"], ["pinterest", "📌 Pinterest"], ["analytics", "🧠 Platform Analytics"],
] as const;
const PLATFORMS = ["Telegram", "TikTok", "Instagram", "YouTube", "Facebook", "X", "Pinterest", "LinkedIn", "Threads", "Website"];
const PINS = ["Photos Board", "Lifestyle Board", "Studio Board", "Music Board", "Quotes Board", "Projects Board"];
const PIN_TYPES = ["Posters", "Quotes", "Album Covers", "Character Cards", "Studio Photos", "Infographics", "Mood Boards", "Announcements"];
const PYRAMID = ["MASTER CONTENT", "YouTube Video", "Shorts", "TikTok", "Instagram Reels", "Pinterest Pins", "Telegram Posts", "X Posts", "Facebook Posts"];
const MONET = ["YouTube", "Telegram Premium", "Music", "Radio", "Podcast", "Sponsors", "Merch", "Affiliate"];

const ENTITIES = [
  { id: "buch", name: "BUCH ☠️", role: "founder · host", base: 9 },
  { id: "buchiha", name: "BUCHIHA 😇", role: "co-host · artist", base: 7 },
  { id: "eva", name: "EVA NOVIKOVA", role: "news · lifestyle", base: 6 },
  { id: "nova", name: "AI DJ NOVA", role: "night DJ", base: 5 },
];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const fol = (e: string, p: string) => Math.round((((hash(e + p) % 90) + 10) / 100) * (e.includes("BUCH") ? 220000 : 120000));
const av = (s: string) => "#" + ((hash(s) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
const ini = (s: string) => (s || "•").replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const PCLR: Record<string, string> = { Telegram: "#3ea6ff", TikTok: "#ff2d6b", Instagram: "#e879f9", YouTube: "#f87171", Facebook: "#60a5fa", X: "#e5e7eb", Pinterest: "#fb7185", LinkedIn: "#38bdf8", Threads: "#a78bfa", Website: "#34d399" };

export function SocialEmpire({ onClose, onOpenAgent }: { onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [tab, setTab] = useState("identities");
  const [ent, setEnt] = useState("buch");
  const e = ENTITIES.find((x) => x.id === ent) || ENTITIES[0];

  const totals = useMemo(() => ENTITIES.map((en) => ({ ...en, followers: PLATFORMS.reduce((s, p) => s + fol(en.name, p), 0), views: (hash(en.name) % 900 + 100) * 1000, eng: 3 + (hash(en.name) % 6) })), []);
  const ranked = useMemo(() => [...totals].sort((a, b) => b.followers - a.followers), [totals]);

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("epic_social_empire_v1", JSON.stringify({ ts, entities: ENTITIES.map((x) => x.name), platforms: PLATFORMS }));
    localStorage.setItem("epic_platform_matrix_v1", JSON.stringify({ ts, matrix: ENTITIES.map((en) => ({ name: en.name, platforms: PLATFORMS })) }));
    localStorage.setItem("epic_audience_v1", JSON.stringify({ ts, totals: totals.map((t) => ({ name: t.name, followers: t.followers, views: t.views })) }));
    localStorage.setItem("epic_creator_ranking_v1", JSON.stringify({ ts, ranking: ranked.map((r, i) => ({ rank: i + 1, name: r.name, followers: r.followers })) }));
    localStorage.setItem("epic_monetization_v1", JSON.stringify({ ts, directions: MONET }));
    localStorage.setItem("epic_pinterest_v1", JSON.stringify({ ts, boards: PINS, types: PIN_TYPES }));
  } catch {} }, [totals, ranked]);

  function score(seed: string) { return 50 + (hash(e.id + seed) % 50); }

  function Body() {
    if (tab === "identities") return <div className="space-y-3">
      <div className="flex flex-wrap gap-2">{ENTITIES.map((en) => <button key={en.id} onClick={() => setEnt(en.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left ${ent === en.id ? "border-tg-accent bg-tg-active/20" : "border-tg-line bg-tg-bg/40"}`}><div className="flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: av(en.name) }}>{ini(en.name)}</div><div><div className="text-sm font-semibold">{en.name}</div><div className="text-[10px] text-tg-muted">{en.role}</div></div></button>)}</div>
      <Card t={"Digital Passport · " + e.name}><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">{PLATFORMS.map((p) => <div key={p} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-2.5 py-1.5 text-[12px]"><span className="h-2 w-2 rounded-full" style={{ background: PCLR[p] }} /><span className="flex-1">{p}</span><span className="text-emerald-400">✓</span></div>)}</div>
        <button onClick={() => onOpenAgent?.(e.id)} className="mt-2 rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open Agent →</button></Card>
      <Card t="Content Pyramid (авто-адаптация одного контента)"><div className="flex flex-wrap items-center gap-1.5 text-[11px]">{PYRAMID.map((p, i) => <span key={p} className="flex items-center gap-1.5"><span className={`rounded-lg px-2.5 py-1 ${i === 0 ? "bg-tg-active text-white font-bold" : "bg-tg-bg text-tg-muted"}`}>{p}</span>{i < PYRAMID.length - 1 && <span className="text-tg-muted">↓</span>}</span>)}</div></Card></div>;
    if (tab === "matrix") return <Card t="Platform Matrix"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr><th className="px-2 py-1">Entity</th>{PLATFORMS.map((p) => <th key={p} className="px-1 py-1 text-center">{p.slice(0, 4)}</th>)}</tr></thead><tbody>{ENTITIES.map((en) => <tr key={en.id} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{en.name}</td>{PLATFORMS.map((p) => <td key={p} className="px-1 text-center text-emerald-400">✓</td>)}</tr>)}</tbody></table></Card>;
    if (tab === "audience") return <Card t={"Audience Intelligence · " + e.name}><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Platform", "Followers", "Views", "Engagement", "Growth", "Reach", "Retention"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{PLATFORMS.map((p) => <tr key={p} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold"><span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: PCLR[p] }} />{p}</td><td className="px-2">{fol(e.name, p).toLocaleString()}</td><td className="px-2">{((hash(e.name + p) % 500 + 50) * 100).toLocaleString()}</td><td className="px-2">{(3 + hash(e.name + p) % 7) + "%"}</td><td className="px-2 text-emerald-400">+{(hash(p + e.name) % 12) + 1}%</td><td className="px-2">{(hash(p) % 40 + 30) + "%"}</td><td className="px-2">{(hash(e.name) % 30 + 40) + "%"}</td></tr>)}</tbody></table></Card>;
    if (tab === "planner") return <div className="space-y-3"><div className="flex flex-wrap gap-1 text-[11px]">{["Сегодня", "Завтра", "Неделя", "Месяц"].map((d) => <span key={d} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{d}</span>)}</div>
      <Card t="Content Calendar (по платформам)"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{PLATFORMS.slice(0, 10).map((p, i) => <div key={p} className="rounded-xl border border-tg-line bg-tg-bg/40 p-2.5"><div className="flex items-center gap-1.5 text-[12px] font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: PCLR[p] }} />{p}</div><div className="mt-1 text-[10px] text-tg-muted">{(i % 3) + 1} поста сегодня · {(i % 4) + 2} запланировано</div></div>)}</div></Card></div>;
    if (tab === "growth") return <Card t={"Growth Engine · " + e.name}><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{["Audience Score", "Growth Score", "Content Score", "Trust Score", "Influence Score"].map((s) => { const v = score(s); return <div key={s} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] uppercase text-tg-muted">{s}</div><div className="text-2xl font-black text-cyan-300">{v}</div><div className="mt-1 h-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: v + "%" }} /></div></div>; })}</div></Card>;
    if (tab === "monetization") return <Card t={"Monetization · " + e.name}><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Direction", "Status", "Income", "Potential", "Readiness"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{MONET.map((m, i) => { const ready = (hash(e.id + m) % 100); const active = ready > 55; return <tr key={m} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{m}</td><td className="px-2"><span style={{ color: active ? "#4ade80" : "#fbbf24" }}>{active ? "active" : "potential"}</span></td><td className="px-2">${active ? ((hash(m) % 900 + 100)) : 0}</td><td className="px-2 text-tg-muted">{(hash(m + e.id) % 5 + 5)}/10</td><td className="px-2">{ready}%</td></tr>; })}</tbody></table></Card>;
    if (tab === "ranking") return <Card t="Creator Ranking"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["#", "Creator", "Followers", "Views", "Engagement"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{ranked.map((r, i) => <tr key={r.id} className="border-t border-tg-line"><td className="px-2 py-1.5 font-black text-cyan-300">{i + 1}</td><td className="px-2 font-semibold">{r.name}</td><td className="px-2">{r.followers.toLocaleString()}</td><td className="px-2">{r.views.toLocaleString()}</td><td className="px-2 text-emerald-400">{r.eng}%</td></tr>)}</tbody></table></Card>;
    if (tab === "pinterest") return <div className="space-y-3">
      <Card t={"Pinterest Boards · " + e.name}><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{PINS.map((b) => <div key={b} className="rounded-xl border border-rose-400/30 bg-tg-bg/40 p-2.5"><div className="text-[12px] font-semibold">{b}</div><div className="text-[10px] text-tg-muted">{hash(b) % 80 + 12} пинов</div></div>)}</div></Card>
      <Card t="Pinterest Factory · Content Types"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{PIN_TYPES.map((t) => <div key={t} className="rounded-lg bg-tg-bg/40 px-3 py-2 text-sm">📌 {t}</div>)}</div></Card></div>;
    // analytics + social graph
    const nodes = [{ id: "e", label: e.name, x: 360, y: 200, type: "entity" }, ...PLATFORMS.map((p, i) => { const a = (i / PLATFORMS.length) * Math.PI * 2; return { id: p, label: p, x: 360 + Math.cos(a) * 250, y: 200 + Math.sin(a) * 150, type: "platform" }; })];
    return <div className="space-y-3">
      <Card t="Platform Analytics"><div className="space-y-1.5">{PLATFORMS.map((p) => { const v = hash(e.name + p) % 80 + 20; return <div key={p} className="flex items-center gap-2 text-[12px]"><span className="w-20 text-tg-muted">{p}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: PCLR[p] }} /></div><span className="w-8 text-right">{v}</span></div>; })}</div></Card>
      <Card t="Social Graph (entity ↔ platforms ↔ content)"><svg width="100%" height="320" viewBox="0 0 720 400">{PLATFORMS.map((p, i) => { const n = nodes.find((x) => x.id === p)!; return <line key={i} x1={360} y1={200} x2={n.x} y2={n.y} stroke="rgba(255,45,107,.25)" strokeWidth={1.3} />; })}{nodes.map((n) => <g key={n.id}><circle cx={n.x} cy={n.y} r={n.type === "entity" ? 26 : 16} fill={n.type === "entity" ? av(e.name) : PCLR[n.label] || "#888"} opacity={0.85} /><text x={n.x} y={n.y + (n.type === "entity" ? 42 : 30)} fill="#cbd5e1" fontSize="11" textAnchor="middle">{n.label}</text></g>)}</svg></Card></div>;
  }

  return (
    <div className="fixed inset-0 z-[64] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🌍 SOCIAL EMPIRE</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · GROWTH</span>
        <div className="ml-2 text-[11px] text-tg-muted">{ENTITIES.length} сущностей · {PLATFORMS.length} платформ</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">SOCIAL EMPIRE</div>{NAV.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${tab === id ? "bg-tg-active/30 text-white ring-1 ring-tg-accent" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}</nav>
        <main className="min-h-0 overflow-auto p-4"><Body /></main>
      </div>
    </div>
  );
}
