"use client";

// ECONOMY ENGINE — AI Asset Valuation & ecosystem economy. Category: BUSINESS · ACTIVE.
// UI + localStorage + derived/mock data only. No payments, no external API, no OAuth, no secrets. Additive.

import { useEffect, useMemo, useState } from "react";

type Ctx = { agents: any[]; missions: any[]; counts: Record<string, any> };

const SECTIONS: [string, string][] = [
  ["portfolio", "📊 Asset Portfolio"], ["revenue", "💵 Revenue Center"], ["monetization", "🎯 Monetization Center"],
  ["sponsors", "🤝 Sponsor Marketplace"], ["affiliate", "🔗 Affiliate Hub"], ["merch", "👕 Merch Center"],
  ["music", "🎵 Music Revenue"], ["radio", "📻 Radio Revenue"], ["content", "🎬 Content Revenue"],
  ["roi", "📈 ROI Analytics"], ["ranking", "🏆 Asset Ranking"], ["map", "🌍 World Economy Map"],
];

const ENTITIES = [
  { id: "buch", name: "BUCH", emoji: "☠️", platforms: ["Telegram", "YouTube", "Radio", "Music"], followers: 18000, views: 740000, engagement: 7.4, growth: 12, revenue: 320 },
  { id: "buchiha", name: "BUCHIHA", emoji: "😇", platforms: ["Instagram", "Pinterest", "Radio", "Merch"], followers: 21500, views: 910000, engagement: 8.1, growth: 15, revenue: 410 },
  { id: "eva", name: "EVA NOVIKOVA", emoji: "💠", platforms: ["TikTok", "YouTube", "Telegram"], followers: 32000, views: 1480000, engagement: 9.2, growth: 22, revenue: 560 },
  { id: "nova", name: "NOVA", emoji: "🎧", platforms: ["Radio", "Music", "YouTube"], followers: 12500, views: 430000, engagement: 6.5, growth: 9, revenue: 190 },
  { id: "reporter", name: "AI REPORTER", emoji: "📰", platforms: ["Telegram", "YouTube"], followers: 8600, views: 260000, engagement: 5.4, growth: 7, revenue: 95 },
  { id: "newscaster", name: "AI NEWSCASTER", emoji: "🎙", platforms: ["YouTube", "Radio"], followers: 7400, views: 210000, engagement: 5.0, growth: 6, revenue: 80 },
];

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
function valuate(e: typeof ENTITIES[number]) {
  const audience = clamp(Math.log10(e.followers) * 20 - 10);
  const growthS = clamp(e.growth * 4);
  const engagementS = clamp(e.engagement * 10);
  const trust = clamp(60 + e.engagement * 3);
  const content = clamp(Math.log10(e.views) * 14 - 20);
  const revenueS = clamp(e.revenue / 7);
  const rating = clamp((audience + growthS + engagementS + trust + content + revenueS) / 6);
  const value = Math.round((e.followers * 0.05 + e.views * 0.0015 + e.revenue * 4) * (1 + rating / 200));
  return { audience, growthS, engagementS, trust, content, revenueS, rating, value };
}
const ENRICHED = ENTITIES.map((e) => ({ ...e, ...valuate(e) }));
const money = (n: number) => "$" + n.toLocaleString("en-US");
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");

const REVENUE_STREAMS = [
  { k: "YouTube", month: 640 }, { k: "Telegram", month: 380 }, { k: "Music", month: 520 }, { k: "Radio", month: 290 },
  { k: "Podcast", month: 140 }, { k: "Merch", month: 230 }, { k: "Sponsors", month: 760 }, { k: "Affiliate", month: 310 },
];
const SPONSORS = [
  { sponsor: "NeonHost", campaign: "Cyber Hosting Q3", platform: "YouTube", reach: 320000, ctr: 3.1, revenue: 280, status: "ACTIVE" },
  { sponsor: "VPNova", campaign: "Privacy Push", platform: "Telegram", reach: 180000, ctr: 2.4, revenue: 160, status: "ACTIVE" },
  { sponsor: "SynthLabs", campaign: "AI Tools Promo", platform: "TikTok", reach: 410000, ctr: 4.0, revenue: 420, status: "NEGOTIATION" },
  { sponsor: "BeatForge", campaign: "Music Gear", platform: "Radio", reach: 95000, ctr: 1.8, revenue: 90, status: "PLANNED" },
];
const AFFILIATE = { "AI Tools": 6, Hosting: 4, VPN: 3, Software: 5, Education: 4, Media: 3, Music: 4 };
const MERCH = [
  { cat: "Clothes", items: 12, revenue: 140 }, { cat: "Accessories", items: 8, revenue: 60 }, { cat: "Posters", items: 15, revenue: 75 },
  { cat: "Stickers", items: 24, revenue: 40 }, { cat: "Digital Assets", items: 30, revenue: 210 },
];
const TRACKS = [
  { track: "Neon Pulse", artist: "NOVA", genre: "Synthwave", streams: 142000, royalties: 180 },
  { track: "Skull Beat", artist: "BUCH", genre: "Cyber Trap", streams: 98000, royalties: 120 },
  { track: "Angel Static", artist: "BUCHIHA", genre: "Dream Pop", streams: 121000, royalties: 150 },
  { track: "Night Drive", artist: "EVA NOVIKOVA", genre: "Synthwave", streams: 167000, royalties: 210 },
];
const RADIO_SHOWS = [
  { show: "Night Radio Intro", host: "EVA NOVIKOVA", listeners: 4200, airTime: "22:00", revenue: 90 },
  { show: "Cyber Segment", host: "BUCH", listeners: 3100, airTime: "20:00", revenue: 70 },
  { show: "Angel Hour", host: "BUCHIHA", listeners: 3600, airTime: "18:00", revenue: 80 },
];
const CONTENT = [
  { title: "EVA — Night Intro", views: 142000, likes: 9800, comments: 640, shares: 1200, cost: 6, revenue: 78 },
  { title: "BUCH — Cyber Talk", views: 88000, likes: 5200, comments: 410, shares: 720, cost: 4, revenue: 52 },
  { title: "BUCHIHA — Neon Sketch", views: 121000, likes: 8400, comments: 560, shares: 980, cost: 9, revenue: 64 },
  { title: "NOVA — Live Mix", views: 64000, likes: 3900, comments: 280, shares: 540, cost: 3, revenue: 41 },
].map((c) => ({ ...c, roi: Math.round(((c.revenue - c.cost) / c.cost) * 100) }));

const MONET_LEVELS = [
  { level: "Sandbox", tools: "preview, drafts", threshold: "0", min: 0 },
  { level: "Creator", tools: "publishing preview, analytics", threshold: "5k followers", min: 40 },
  { level: "Influencer", tools: "sponsors, affiliate", threshold: "15k + 6% eng", min: 60 },
  { level: "Media Asset", tools: "merch, music royalties", threshold: "rating 70", min: 70 },
  { level: "Business Unit", tools: "full economy", threshold: "rating 85 + revenue", min: 85 },
];

function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
function Stat({ l, v, c }: { l: string; v: any; c?: string }) { return <div className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-lg font-black" style={{ color: c }}>{v}</div></div>; }
function Bar({ l, v, max }: { l: string; v: number; max: number }) { return <div className="flex items-center gap-2 text-[12px]"><span className="w-28 text-tg-muted">{l}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400" style={{ width: (v / max * 100) + "%" }} /></div><span className="w-14 text-right">{v}</span></div>; }
function ratingColor(v: number) { return v >= 80 ? "#4ade80" : v >= 60 ? "#fbbf24" : "#f87171"; }

export function EconomyEngine({ ctx, onClose, onOpenAgent }: { ctx: Ctx; onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [sec, setSec] = useState("portfolio");
  const [sel, setSel] = useState("eva");
  const [rankBy, setRankBy] = useState<"value" | "followers" | "revenue" | "growth" | "engagement">("value");
  const [view, setView] = useState({ x: 30, y: 20, k: 0.85 });

  const totalRevenue = REVENUE_STREAMS.reduce((s, r) => s + r.month, 0);
  const totalValue = ENRICHED.reduce((s, e) => s + e.value, 0);
  const topAsset = [...ENRICHED].sort((a, b) => b.value - a.value)[0];
  const topPlatform = REVENUE_STREAMS.slice().sort((a, b) => b.month - a.month)[0];
  const topSponsor = SPONSORS.slice().sort((a, b) => b.revenue - a.revenue)[0];
  const topContent = CONTENT.slice().sort((a, b) => b.revenue - a.revenue)[0];
  const topArtist = TRACKS.slice().sort((a, b) => b.royalties - a.royalties)[0];

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("economy_engine_v1", JSON.stringify({ ts, totalRevenue, totalValue, topAsset: topAsset.name }));
    localStorage.setItem("asset_portfolio_v1", JSON.stringify({ ts, assets: ENRICHED.map((e) => ({ id: e.id, name: e.name, rating: e.rating, value: e.value })) }));
    localStorage.setItem("asset_ranking_v1", JSON.stringify({ ts, ranking: [...ENRICHED].sort((a, b) => b.value - a.value).map((e) => e.name) }));
    localStorage.setItem("revenue_center_v1", JSON.stringify({ ts, streams: REVENUE_STREAMS, totalRevenue }));
    localStorage.setItem("monetization_center_v1", JSON.stringify({ ts, levels: MONET_LEVELS.map((l) => l.level) }));
    localStorage.setItem("sponsor_marketplace_v1", JSON.stringify({ ts, sponsors: SPONSORS }));
    localStorage.setItem("affiliate_hub_v1", JSON.stringify({ ts, categories: AFFILIATE }));
    localStorage.setItem("music_revenue_v1", JSON.stringify({ ts, tracks: TRACKS }));
    localStorage.setItem("radio_revenue_v1", JSON.stringify({ ts, shows: RADIO_SHOWS }));
    localStorage.setItem("content_revenue_v1", JSON.stringify({ ts, content: CONTENT }));
  } catch {} }, [totalRevenue, totalValue, topAsset]);

  const e = ENRICHED.find((x) => x.id === sel) || ENRICHED[0];

  function Portfolio() {
    return <div className="grid min-h-0 flex-1 grid-cols-[1fr_330px]">
      <main className="min-h-0 overflow-auto p-4">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat l="Total Asset Value" v={money(totalValue)} c="#4ade80" /><Stat l="Monthly Revenue" v={money(totalRevenue)} c="#fbbf24" /><Stat l="Top Asset" v={topAsset.name} /><Stat l="Assets" v={ENRICHED.length} /></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ENRICHED.map((en) => <button key={en.id} onClick={() => setSel(en.id)} className={`rounded-xl border p-3 text-left ${sel === en.id ? "border-amber-400 bg-amber-500/10" : "border-tg-line hover:border-amber-400/50"}`}><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-full text-sm" style={{ background: av(en.name) }}>{en.emoji}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{en.name}</div><div className="text-[10px] text-tg-muted">{en.platforms.join(" · ")}</div></div></div><div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]"><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Score</div><b style={{ color: ratingColor(en.rating) }}>{en.rating}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Value</div><b className="text-emerald-300">{money(en.value)}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Rev/mo</div><b>{money(en.revenue)}</b></div></div></button>)}</div>
      </main>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">AI Asset Valuation</div>
        <div className="mb-2 flex items-center gap-2"><div className="flex h-12 w-12 items-center justify-center rounded-full text-xl" style={{ background: av(e.name) }}>{e.emoji}</div><div><div className="font-black">{e.name}</div><div className="text-[11px] text-tg-muted">Asset Rating</div><div className="text-2xl font-black" style={{ color: ratingColor(e.rating) }}>{e.rating}/100</div></div></div>
        <Card t="Score breakdown"><div className="space-y-1">{([["Audience", e.audience], ["Growth", e.growthS], ["Engagement", e.engagementS], ["Trust", e.trust], ["Content", e.content], ["Revenue", e.revenueS]] as const).map(([l, v]) => <Bar key={l} l={l} v={v} max={100} />)}</div></Card>
        <div className="mt-2 grid grid-cols-2 gap-2"><Stat l="Followers" v={e.followers.toLocaleString()} /><Stat l="Views" v={(e.views / 1000).toFixed(0) + "k"} /><Stat l="Revenue" v={money(e.revenue)} /><Stat l="Estimated Value" v={money(e.value)} c="#4ade80" /></div>
        <button onClick={() => onOpenAgent?.(e.id)} className="mt-2 w-full rounded-lg bg-tg-active py-1.5 text-[12px] font-semibold text-white">Open Agent →</button>
      </aside>
    </div>;
  }

  function Revenue() {
    const max = Math.max(...REVENUE_STREAMS.map((r) => r.month));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Today", Math.round(totalRevenue / 30)], ["Week", Math.round(totalRevenue / 4)], ["Month", totalRevenue], ["Year", totalRevenue * 12]].map(([l, v]) => <Stat key={l as string} l={l as string} v={money(v as number)} c="#fbbf24" />)}</div><Card t="Revenue by stream (monthly)"><div className="space-y-1.5">{REVENUE_STREAMS.map((r) => <Bar key={r.k} l={r.k} v={r.month} max={max} />)}</div></Card></main>;
  }

  function Monetization() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Уровни монетизации AI-сущностей</div><div className="space-y-2">{ENRICHED.map((en) => { const lvlIdx = MONET_LEVELS.reduce((acc, l, i) => en.rating >= l.min ? i : acc, 0); return <Card key={en.id}><div className="mb-1 flex items-center gap-2"><span>{en.emoji}</span><b className="flex-1">{en.name}</b><span className="text-[11px]" style={{ color: ratingColor(en.rating) }}>rating {en.rating} · {MONET_LEVELS[lvlIdx].level}</span></div><div className="flex flex-wrap items-center gap-1 text-[10px]">{MONET_LEVELS.map((l, i) => <span key={l.level} className="flex items-center gap-1"><span className={`rounded px-2 py-0.5 ${i === lvlIdx ? "bg-tg-active text-white font-bold" : i < lvlIdx ? "bg-emerald-600/20 text-emerald-300" : "bg-tg-bg text-tg-muted"}`}>{l.level}</span>{i < MONET_LEVELS.length - 1 && <span className="text-tg-muted">→</span>}</span>)}</div><div className="mt-1 text-[10px] text-tg-muted">Инструменты: {MONET_LEVELS[lvlIdx].tools} · Порог следующего: {MONET_LEVELS[Math.min(lvlIdx + 1, 4)].threshold}</div></Card>; })}</div></main>;
  }

  function Sponsors() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Sponsor Marketplace"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Sponsor", "Campaign", "Platform", "Reach", "CTR", "Revenue", "Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{SPONSORS.map((s) => <tr key={s.sponsor} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{s.sponsor}</td><td className="px-2">{s.campaign}</td><td className="px-2 text-tg-muted">{s.platform}</td><td className="px-2">{(s.reach / 1000).toFixed(0)}k</td><td className="px-2">{s.ctr}%</td><td className="px-2 text-emerald-300">{money(s.revenue)}</td><td className="px-2"><span className="rounded-full bg-tg-bg px-2 py-0.5 text-[10px]">{s.status}</span></td></tr>)}</tbody></table></Card></main>;
  }

  function Affiliate() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Affiliate Hub · каталог программ</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(AFFILIATE).map(([cat, n]) => <Card key={cat}><div className="text-sm font-bold">{cat}</div><div className="text-2xl font-black text-amber-300">{n}</div><div className="text-[10px] text-tg-muted">партнёрских программ</div></Card>)}</div></main>;
  }

  function Merch() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Merch Center"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{MERCH.map((m) => <div key={m.cat} className="rounded-xl bg-tg-bg/40 p-3"><div className="text-sm font-bold">{m.cat}</div><div className="mt-1 text-[11px] text-tg-muted">{m.items} позиций</div><div className="text-lg font-black text-emerald-300">{money(m.revenue)}</div></div>)}</div></Card></main>;
  }

  function Music() {
    const topGenres = Object.entries(TRACKS.reduce((a: any, t) => { a[t.genre] = (a[t.genre] || 0) + t.streams; return a; }, {})).sort((a: any, b: any) => b[1] - a[1]);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-3 lg:grid-cols-2"><Card t="Top Tracks"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Track", "Artist", "Genre", "Streams", "Royalties"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{TRACKS.slice().sort((a, b) => b.streams - a.streams).map((t) => <tr key={t.track} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{t.track}</td><td className="px-2 text-tg-muted">{t.artist}</td><td className="px-2 text-tg-muted">{t.genre}</td><td className="px-2">{(t.streams / 1000).toFixed(0)}k</td><td className="px-2 text-emerald-300">{money(t.royalties)}</td></tr>)}</tbody></table></Card><div className="space-y-3"><Card t="Top Artists"><div className="space-y-1">{TRACKS.slice().sort((a, b) => b.royalties - a.royalties).map((t) => <div key={t.track} className="flex justify-between text-sm"><span>{t.artist}</span><b className="text-emerald-300">{money(t.royalties)}</b></div>)}</div></Card><Card t="Top Genres"><div className="space-y-1">{topGenres.map(([g, s]: any) => <div key={g} className="flex justify-between text-sm"><span>{g}</span><b>{(s / 1000).toFixed(0)}k streams</b></div>)}</div></Card></div></div></main>;
  }

  function Radio() {
    const listeners = RADIO_SHOWS.reduce((s, r) => s + r.listeners, 0); const rev = RADIO_SHOWS.reduce((s, r) => s + r.revenue, 0);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat l="Listeners" v={listeners.toLocaleString()} /><Stat l="Shows" v={RADIO_SHOWS.length} /><Stat l="Sponsors" v={SPONSORS.filter((s) => s.platform === "Radio").length} /><Stat l="Revenue" v={money(rev)} c="#4ade80" /></div><Card t="Radio Shows"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Show", "Host", "Listeners", "Air Time", "Revenue"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{RADIO_SHOWS.map((r) => <tr key={r.show} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{r.show}</td><td className="px-2 text-tg-muted">{r.host}</td><td className="px-2">{r.listeners.toLocaleString()}</td><td className="px-2">{r.airTime}</td><td className="px-2 text-emerald-300">{money(r.revenue)}</td></tr>)}</tbody></table></Card></main>;
  }

  function Content() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><Card t="Content Revenue"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Title", "Views", "Likes", "Comments", "Shares", "Revenue", "ROI"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{CONTENT.map((c) => <tr key={c.title} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{c.title}</td><td className="px-2">{(c.views / 1000).toFixed(0)}k</td><td className="px-2">{c.likes.toLocaleString()}</td><td className="px-2">{c.comments}</td><td className="px-2">{c.shares}</td><td className="px-2 text-emerald-300">{money(c.revenue)}</td><td className="px-2 font-bold" style={{ color: "#4ade80" }}>{c.roi}%</td></tr>)}</tbody></table></Card></main>;
  }

  function ROI() {
    const best = CONTENT.slice().sort((a, b) => b.roi - a.roi);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">ROI Analytics · лучшие результаты</div><div className="grid gap-2 sm:grid-cols-2">{best.map((c) => <Card key={c.title}><div className="flex items-center gap-2"><b className="flex-1">{c.title}</b><span className="text-lg font-black text-emerald-300">{c.roi}%</span></div><div className="mt-1 grid grid-cols-4 gap-1 text-center text-[10px]"><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Cost</div><b>{money(c.cost)}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Reach</div><b>{(c.views / 1000).toFixed(0)}k</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Subs+</div><b>{Math.round(c.shares / 10)}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Revenue</div><b className="text-emerald-300">{money(c.revenue)}</b></div></div></Card>)}</div></main>;
  }

  function Ranking() {
    const sorted = [...ENRICHED].sort((a, b) => rankBy === "value" ? b.value - a.value : rankBy === "followers" ? b.followers - a.followers : rankBy === "revenue" ? b.revenue - a.revenue : rankBy === "growth" ? b.growth - a.growth : b.engagement - a.engagement);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 flex items-center gap-2 text-[11px]"><span className="text-tg-muted">Сортировка:</span>{(["value", "followers", "revenue", "growth", "engagement"] as const).map((k) => <button key={k} onClick={() => setRankBy(k)} className={`rounded-full px-2.5 py-1 ${rankBy === k ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{k}</button>)}</div><div className="space-y-1.5">{sorted.map((en, i) => <div key={en.id} className="flex items-center gap-3 rounded-xl border border-tg-line bg-tg-panel/60 px-3 py-2"><div className="w-6 text-center text-lg font-black text-amber-300">{i + 1}</div><div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: av(en.name) }}>{en.emoji}</div><div className="flex-1"><div className="text-sm font-bold">{en.name}</div><div className="text-[10px] text-tg-muted">rating {en.rating} · {en.followers.toLocaleString()} followers · {money(en.revenue)}/mo</div></div><div className="text-right"><div className="text-[10px] text-tg-muted">Asset Value</div><div className="font-black text-emerald-300">{money(en.value)}</div></div></div>)}</div></main>;
  }

  function EconomyMap() {
    const cx = 480, cy = 300;
    const nodes: { id: string; label: string; x: number; y: number; root?: boolean }[] = [];
    const edges: [string, string][] = [];
    ENRICHED.slice(0, 4).forEach((en, ei) => {
      const ang = (ei / 4) * Math.PI * 2; const ex = cx + Math.cos(ang) * 300, ey = cy + Math.sin(ang) * 190;
      nodes.push({ id: en.id, label: en.name, x: ex, y: ey, root: true });
      [...en.platforms, "Revenue"].forEach((p, pi, arr) => { const a2 = ang + (pi - arr.length / 2) * 0.34; const px = ex + Math.cos(a2) * 130, py = ey + Math.sin(a2) * 95; const nid = en.id + ":" + p; nodes.push({ id: nid, label: p, x: px, y: py }); edges.push([en.id, nid]); });
    });
    const byId: Record<string, any> = {}; nodes.forEach((n) => (byId[n.id] = n));
    return <div className="relative min-h-0 flex-1 overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 960 620" onWheel={(ev) => { ev.preventDefault(); setView((v) => ({ ...v, k: Math.min(2, Math.max(0.4, v.k - ev.deltaY * 0.001)) })); }}>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {edges.map(([a, b], i) => <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke="rgba(251,191,36,.25)" strokeWidth={1.2} />)}
          {nodes.map((n) => <g key={n.id} onClick={() => { if (n.root) setSel(n.id); }} style={{ cursor: n.root ? "pointer" : "default" }}><circle cx={n.x} cy={n.y} r={n.root ? 22 : 11} fill={n.root ? av(n.label) : n.label === "Revenue" ? "#4ade80" : "#fbbf24"} opacity={0.9} stroke={n.root && sel === n.id ? "#fff" : "none"} strokeWidth={2} /><text x={n.x} y={n.y + (n.root ? 36 : 24)} fill="#cbd5e1" fontSize={n.root ? 11 : 9} textAnchor="middle">{n.label}</text></g>)}
        </g>
      </svg>
      <div className="absolute bottom-3 left-3 flex gap-1">{["+", "−", "⟳"].map((b) => <button key={b} onClick={() => setView((v) => b === "+" ? { ...v, k: Math.min(2, v.k + 0.15) } : b === "−" ? { ...v, k: Math.max(0.4, v.k - 0.15) } : { x: 30, y: 20, k: 0.85 })} className="h-7 w-7 rounded bg-[#11151f] text-white ring-1 ring-white/10">{b}</button>)}</div>
      <div className="absolute right-3 top-3 rounded-lg border border-tg-line bg-tg-panel/90 px-2 py-1 text-[10px] text-tg-muted">World Economy Map · клик по сущности</div>
    </div>;
  }

  return (
    <div className="fixed inset-0 z-[67] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">💰 ECONOMY ENGINE</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · BUSINESS</span>
        <div className="ml-auto flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-tg-bg px-2.5 py-1">Total Value: <b className="text-emerald-300">{money(totalValue)}</b></span><span className="rounded-full bg-tg-bg px-2.5 py-1">Monthly: <b className="text-amber-300">{money(totalRevenue)}</b></span><span className="rounded-full bg-tg-bg px-2.5 py-1">Top: <b>{topAsset.name}</b></span></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2">{SECTIONS.map(([id, label]) => <button key={id} onClick={() => setSec(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] ${sec === id ? "bg-tg-active text-white font-semibold" : "hover:bg-tg-hover/40"}`}>{label}</button>)}
          <div className="mt-3 rounded-lg border border-tg-line bg-tg-bg/30 p-2 text-[10px] text-tg-muted">Top Platform: <b className="text-tg-text">{topPlatform.k}</b><br />Top Sponsor: <b className="text-tg-text">{topSponsor.sponsor}</b><br />Top Content: <b className="text-tg-text">{topContent.title}</b><br />Top Artist: <b className="text-tg-text">{topArtist.artist}</b></div>
        </nav>
        <div className="flex min-h-0 flex-col">
          {sec === "portfolio" && <Portfolio />}
          {sec === "revenue" && <Revenue />}
          {sec === "monetization" && <Monetization />}
          {sec === "sponsors" && <Sponsors />}
          {sec === "affiliate" && <Affiliate />}
          {sec === "merch" && <Merch />}
          {sec === "music" && <Music />}
          {sec === "radio" && <Radio />}
          {sec === "content" && <Content />}
          {sec === "roi" && <ROI />}
          {sec === "ranking" && <Ranking />}
          {sec === "map" && <EconomyMap />}
        </div>
      </div>
    </div>
  );
}
