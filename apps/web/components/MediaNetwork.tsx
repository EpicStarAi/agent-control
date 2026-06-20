"use client";

// DEEP INSIDE MEDIA NETWORK — 24/7 AI media network: radio, music factory, live studio, newsroom,
// player, podcasts, analytics. Category: MEDIA · ACTIVE. UI + localStorage + mock/derived only.
// No real streaming, no external APIs, no OAuth, no secrets. Additive.

import { useEffect, useMemo, useRef, useState } from "react";

type Ctx = { agents: any[] };
const NAV = [
  ["radio", "🎙 Radio"], ["music", "🎵 Music Factory"], ["studio", "📺 Live Studio"], ["newsroom", "📰 Newsroom"],
  ["assets", "🎬 Media Assets"], ["broadcast", "📻 Broadcast Center"], ["player", "🎧 Music Player"], ["podcasts", "🎤 Podcasts"], ["analytics", "📈 Media Analytics"],
] as const;
const STATIONS = ["DEEP INSIDE FM", "DEEP INSIDE POP", "DEEP INSIDE ROCK", "DEEP INSIDE PHONK", "DEEP INSIDE TECHNO", "DEEP INSIDE LOFI", "DEEP INSIDE NIGHT DRIVE", "DEEP INSIDE RETRO", "DEEP INSIDE CYBERPUNK"];
const GENRES = ["Phonk", "Techno", "LoFi", "Pop", "Rock", "Synthwave", "Cyberpunk", "Retrowave"];
const HOSTS = [["BUCH ☠️", "Основатель · ведущий · исполнитель"], ["BUCHIHA 😇", "Соведущая · исполнительница · шоу"], ["EVA NOVIKOVA", "Новости · лайфстайл · интервью"], ["AI DJ NOVA", "Ночной эфир · DJ-сеты"], ["AI REPORTER", "Репортажи"], ["AI NEWSCASTER", "Новости"]];
const TRACKS = [["Neon Pulse", "AI DJ NOVA", "Phonk", "2:48"], ["Night Drive", "BUCH ☠️", "Synthwave", "3:12"], ["Cyber Kyiv", "BUCHIHA 😇", "Cyberpunk", "2:55"], ["Retro Heart", "EVA", "Retrowave", "3:30"], ["Deep Techno", "AI DJ NOVA", "Techno", "4:10"]];
const NEWS = [["AI стартап привлёк раунд", "WORLD", "ready"], ["Украина: новости дня", "UKRAINE", "ready"], ["Новая модель генерации видео", "AI", "queue"], ["Прорыв в чипах", "TECH", "draft"], ["Открытие в физике", "SCIENCE", "queue"], ["Рынки сегодня", "BUSINESS", "ready"], ["Премьера сериала", "ENTERTAINMENT", "draft"], ["Финал лиги", "SPORT", "queue"]];
const PODCASTS = ["BUCH SHOW", "BUCHIHA LIVE", "DEEP INSIDE NEWS", "DEEP INSIDE NIGHT", "AI TALKS", "CYBER KYIV"];
const ASSETS: Record<string, number> = { TRACKS: 142, VIDEOS: 64, THUMBNAILS: 88, POSTERS: 31, VOICES: 12, JINGLES: 24, COVERS: 40, LOGOS: 9 };

const SCLR: Record<string, string> = { LIVE: "#f43f5e", ready: "#4ade80", ON: "#4ade80", online: "#4ade80", queue: "#fbbf24", draft: "#9ca3af", off: "#9ca3af" };
function Dot({ s }: { s: string }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCLR[s] || "#9ca3af" }} />; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");

export function MediaNetwork({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const [tab, setTab] = useState("radio");
  const [station, setStation] = useState("DEEP INSIDE FM");
  const [trackIdx, setTrackIdx] = useState(0);
  const [view, setView] = useState({ tx: 30, ty: 20, s: 0.85 });
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number }>({ mode: null, sx: 0, sy: 0, ox: 0, oy: 0 });

  const nowTrack = TRACKS[trackIdx % TRACKS.length];
  const nextTrack = TRACKS[(trackIdx + 1) % TRACKS.length];
  useEffect(() => { const i = setInterval(() => setTrackIdx((x) => x + 1), 8000); return () => clearInterval(i); }, []);

  useEffect(() => { try {
    const ts = new Date().toISOString();
    localStorage.setItem("epic_media_network_v1", JSON.stringify({ ts, stations: STATIONS, nowPlaying: { station, track: nowTrack[0], artist: nowTrack[1] } }));
    localStorage.setItem("epic_radio_v1", JSON.stringify({ ts, station, onAir: "BUCH SHOW", host: HOSTS[0][0], track: nowTrack[0] }));
    localStorage.setItem("epic_music_factory_v1", JSON.stringify({ ts, tracks: TRACKS.length, artists: 6, genres: GENRES }));
    localStorage.setItem("epic_newsroom_v1", JSON.stringify({ ts, queue: NEWS.filter((n) => n[2] !== "draft").length, items: NEWS }));
    localStorage.setItem("epic_podcasts_v1", JSON.stringify({ ts, shows: PODCASTS }));
    localStorage.setItem("epic_media_assets_v1", JSON.stringify({ ts, assets: ASSETS }));
  } catch {} }, [station, trackIdx]);

  // studio canvas
  const studio = useMemo(() => {
    const nodes = ["CAMERA", "AI DIRECTOR", "AI HOST", "TTS", "OBS", "STREAM", "WEBSITE"].map((n, i) => ({ id: n, label: n, x: 40 + i * 180, y: 120 }));
    const edges = nodes.slice(1).map((n, i) => [nodes[i].id, n.id] as [string, string]);
    return { nodes, edges };
  }, []);
  const SP = (n: any) => pos[n.id] || { x: n.x, y: n.y };
  useEffect(() => {
    function mv(e: MouseEvent) { const d = drag.current; if (!d.mode) return; if (d.mode === "node" && d.id) { const dx = (e.clientX - d.sx) / view.s, dy = (e.clientY - d.sy) / view.s; setPos((p) => ({ ...p, [d.id as string]: { x: d.ox + dx, y: d.oy + dy } })); } else if (d.mode === "pan") setView((v) => ({ ...v, tx: d.ox + (e.clientX - d.sx), ty: d.oy + (e.clientY - d.sy) })); }
    function up() { drag.current.mode = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up); return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [view.s]);
  function sdown(e: React.MouseEvent, id?: string) { const d = drag.current; d.sx = e.clientX; d.sy = e.clientY; if (id) { const n = studio.nodes.find((x) => x.id === id)!; d.mode = "node"; d.id = id; const p = SP(n); d.ox = p.x; d.oy = p.y; } else { d.mode = "pan"; d.ox = view.tx; d.oy = view.ty; } e.stopPropagation(); }

  function Body() {
    if (tab === "radio") return <div className="space-y-3">
      <Card t="LIVE NOW · ON AIR"><div className="flex flex-wrap items-center gap-4"><div className="flex items-center gap-2"><Dot s="LIVE" /><b className="text-rose-300">LIVE</b></div><div>Станция: <b>{station}</b></div><div>Ведущий: <b>{HOSTS[0][0]}</b></div><div>Сейчас играет: <b className="text-cyan-300">{nowTrack[0]} — {nowTrack[1]}</b></div></div>
        <div className="mt-1 text-[12px] text-tg-muted">Следующий блок: «DEEP INSIDE NIGHT» через 14 мин · Следующий трек: {nextTrack[0]} — {nextTrack[1]}</div></Card>
      <Card t="DEEP INSIDE Stations"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{STATIONS.map((s, i) => <button key={s} onClick={() => setStation(s)} className={`flex items-center gap-2 rounded-xl border p-2.5 text-left ${station === s ? "border-tg-accent bg-tg-active/20" : "border-tg-line bg-tg-bg/40 hover:border-tg-accent/60"}`}><div className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ background: av(s) }}>FM</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{s}</div><div className="text-[10px] text-tg-muted">{GENRES[i % GENRES.length]} · {(1200 + i * 340).toLocaleString()} слушателей</div></div><Dot s={i === 0 ? "LIVE" : "ON"} /></button>)}</div></Card>
      <div className="grid gap-3 lg:grid-cols-2"><Card t="AI Hosts">{HOSTS.map(([n, r]) => <div key={n} className="flex items-center gap-2 py-0.5 text-sm"><div className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: av(n) }}>{n.slice(0, 2)}</div><span className="flex-1">{n}</span><span className="text-[11px] text-tg-muted">{r}</span></div>)}</Card>
      <Card t="Program Grid"><div className="space-y-0.5 text-[12px]">{[["06:00", "Morning Drive · EVA"], ["12:00", "Midday Phonk · NOVA"], ["18:00", "BUCH SHOW"], ["21:00", "BUCHIHA LIVE"], ["00:00", "DEEP INSIDE NIGHT · NOVA"]].map(([t, s]) => <div key={t} className="flex gap-2"><span className="w-12 text-tg-muted">{t}</span><span>{s}</span></div>)}</div></Card></div></div>;
    if (tab === "music") return <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{([["Tracks", TRACKS.length * 28], ["Albums", 14], ["Artists", 6], ["Voices", 12], ["Genres", GENRES.length], ["Playlists", 22], ["Lyrics", 96], ["Remixes", 31], ["Covers", 40], ["Releases", 18]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-black text-cyan-300">{v}</div></Card>)}</div>
      <Card t="Tracks"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Track", "Artist", "Genre", "Duration"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{TRACKS.map((t) => <tr key={t[0]} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{t[0]}</td><td className="px-2 text-tg-accent">{t[1]}</td><td className="px-2 text-tg-muted">{t[2]}</td><td className="px-2">{t[3]}</td></tr>)}</tbody></table></Card></div>;
    if (tab === "studio") return <div className="flex h-full flex-col"><div className="mb-2 text-[11px] text-tg-muted">Live Studio · Infinite Canvas: CAMERA → AI DIRECTOR → AI HOST → TTS → OBS → STREAM → WEBSITE (drag/zoom, узлы кликабельны).</div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-[#0a0712]" style={{ backgroundImage: "linear-gradient(rgba(255,45,107,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,45,107,.05) 1px,transparent 1px)", backgroundSize: "28px 28px" }}>
        <div className="absolute left-3 top-3 z-10 flex gap-1"><button onClick={() => setView((v) => ({ ...v, s: Math.min(2, +(v.s + 0.15).toFixed(2)) }))} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">+</button><button onClick={() => setView((v) => ({ ...v, s: Math.max(0.4, +(v.s - 0.15).toFixed(2)) }))} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">−</button><button onClick={() => { setView({ tx: 30, ty: 20, s: 0.85 }); setPos({}); }} className="rounded-lg bg-tg-panel px-2 text-xs ring-1 ring-tg-line">reset</button></div>
        <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={(e) => sdown(e)}>
          <div style={{ transform: `translate(${view.tx}px,${view.ty}px) scale(${view.s})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
            <svg className="pointer-events-none absolute" style={{ overflow: "visible", left: 0, top: 0 }} width="1" height="1">{studio.edges.map(([a, b], i) => { const na = studio.nodes.find((n) => n.id === a)!, nb = studio.nodes.find((n) => n.id === b)!; const pa = SP(na), pb = SP(nb); return <line key={i} x1={pa.x + 70} y1={pa.y + 18} x2={pb.x + 70} y2={pb.y + 18} stroke="rgba(255,45,107,.35)" strokeWidth={1.6} />; })}</svg>
            {studio.nodes.map((n) => { const p = SP(n); return <div key={n.id} onMouseDown={(e) => sdown(e, n.id)} className="absolute w-[140px] cursor-grab rounded-xl border border-rose-500/50 bg-[rgba(20,14,22,.85)] px-3 py-2 text-center text-sm font-bold text-rose-200 backdrop-blur" style={{ left: p.x, top: p.y }}>{n.label}</div>; })}
          </div>
        </div>
      </div></div>;
    if (tab === "newsroom") return <div className="space-y-3"><div className="flex flex-wrap gap-1 text-[11px]">{["WORLD", "UKRAINE", "AI", "TECH", "SCIENCE", "BUSINESS", "ENTERTAINMENT", "SPORT"].map((c) => <span key={c} className="rounded-full bg-tg-bg px-2.5 py-1 text-tg-muted">{c}</span>)}</div>
      <Card t="News Queue"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Title", "Category", "Status", "Ready for Air"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{NEWS.map((n) => <tr key={n[0]} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{n[0]}</td><td className="px-2 text-tg-muted">{n[1]}</td><td className="px-2"><Dot s={n[2]} /> {n[2]}</td><td className="px-2">{n[2] === "ready" ? "✓" : "—"}</td></tr>)}</tbody></table></Card></div>;
    if (tab === "assets") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(ASSETS).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-black text-cyan-300">{v}</div></Card>)}</div>;
    if (tab === "broadcast") return <Card t="Broadcast Center"><div className="grid gap-1 text-sm sm:grid-cols-2">{([["Current Show", "BUCH SHOW"], ["Current Track", nowTrack[0]], ["Next Track", nextTrack[0]], ["Next Show", "BUCHIHA LIVE"], ["Queue", "12 items"], ["Ads", "3 native"], ["Jingles", "24"], ["Breaks", "2"]] as const).map(([l, v]) => <div key={l} className="flex gap-2"><span className="w-28 text-tg-muted">{l}</span><b className="text-tg-text">{v}</b></div>)}</div></Card>;
    if (tab === "player") return <div className="space-y-3">
      <Card t="Now Playing"><div className="flex items-center gap-3"><div className="flex h-16 w-16 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ background: av(nowTrack[0]) }}>♪</div><div className="flex-1"><div className="text-lg font-black">{nowTrack[0]}</div><div className="text-sm text-tg-muted">{nowTrack[1]} · {nowTrack[2]} · {nowTrack[3]}</div><div className="mt-1 h-1 overflow-hidden rounded bg-tg-bg"><div className="h-full w-1/2 bg-gradient-to-r from-rose-500 to-cyan-400" /></div></div><div className="text-2xl">⏯</div></div><div className="mt-1 text-[11px] text-tg-muted">Далее: {nextTrack[0]} — {nextTrack[1]}</div></Card>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{["Live Radio", "Tracks", "Playlists", "Genres", "Albums", "Artists", "Favorites", "History"].map((s) => <Card key={s}><div className="text-sm font-semibold">{s}</div></Card>)}</div>
      <Card t="Request Track"><div className="flex flex-wrap gap-2"><select className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm"><option>— жанр —</option>{GENRES.map((g) => <option key={g}>{g}</option>)}</select><select className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm"><option>— трек —</option>{TRACKS.map((t) => <option key={t[0]}>{t[0]}</option>)}</select><button className="rounded-lg bg-tg-active px-3 py-1.5 text-xs font-semibold text-white">В очередь эфира</button></div><div className="mt-1 text-[10px] text-tg-muted">Запрос добавляется в очередь (mock).</div></Card></div>;
    if (tab === "podcasts") return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{PODCASTS.map((p) => <Card key={p}><div className="font-bold">{p}</div><div className="text-[11px] text-tg-muted">эпизодов: {6 + (p.length % 9)} · архив</div></Card>)}</div>;
    return <Card t="Media Analytics"><div className="space-y-1.5">{([["Listeners", 78, "#3ea6ff"], ["Views", 64, "#a78bfa"], ["Streams", 52, "#34d399"], ["Top Genres", 70, "#fbbf24"], ["Top Artists", 61, "#ff2d6b"], ["Top Shows", 44, "#22c55e"], ["Top Tracks", 58, "#06b6d4"]] as const).map(([l, v, c]) => <div key={l} className="flex items-center gap-2 text-[12px]"><span className="w-28 text-tg-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: v + "%", background: c }} /></div><span className="w-8 text-right">{v}</span></div>)}</div></Card>;
  }

  return (
    <div className="fixed inset-0 z-[64] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🎙 DEEP INSIDE MEDIA NETWORK</div>
        <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">● LIVE 24/7</span>
        <div className="ml-2 text-[11px] text-tg-muted">ON AIR: <b className="text-cyan-300">{nowTrack[0]} — {nowTrack[1]}</b> · {station}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[190px_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-rose-300">DEEP INSIDE MEDIA</div>{NAV.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${tab === id ? "bg-tg-active/30 text-white ring-1 ring-tg-accent" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}</nav>
        <main className="min-h-0 overflow-auto p-4"><Body /></main>
      </div>
    </div>
  );
}
