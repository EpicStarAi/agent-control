"use client";

// MEDIA OPERATIONS CENTER — central AI content studio. Category: MEDIA · Status: ACTIVE
// Additive, UI + localStorage only. No publishing, no real API, nothing removed. Writes a media
// registry to localStorage (epic_media_ops_v1) so WORLD can render media nodes.

import { useEffect, useMemo, useState } from "react";

const LS = "epic_media_ops_v1";
const TABS = [
  ["overview", "🎬 Overview"], ["characters", "🎭 Characters"], ["voices", "🎙 Voices"], ["projects", "📁 Projects"],
  ["plans", "🗓 Content Plans"], ["scripts", "📝 Scripts"], ["prompts", "💬 Prompts"], ["assets", "🗂 Assets"],
  ["images", "🖼 Images"], ["videos", "🎞 Videos"], ["audio", "🎵 Audio"], ["queue", "📦 Render Queue"],
  ["publishing", "🚀 Publishing"], ["analytics", "📊 Analytics"], ["archive", "🗄 Archive"],
] as const;
const PLATFORMS = ["TikTok", "Instagram", "YouTube", "Telegram", "Facebook", "X"];
const PUB_STATES = ["Draft", "Ready", "Review", "Published", "Archived"];

const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
const ini = (s: string) => (s || "•").replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function MediaOps({ ctx, onClose, onAction }: { ctx: { agents: any[]; missions: any[] }; onClose: () => void; onAction?: (t: string) => void }) {
  const [tab, setTab] = useState("overview");

  const characters = useMemo(() => {
    const base = (ctx.agents || []).filter((a) => /content|host|creator|star|music|eva|buch/i.test((a.role || "") + a.id)).slice(0, 6);
    const list = (base.length ? base : (ctx.agents || []).slice(0, 4)).map((a, i) => ({
      id: a.id, name: a.name, role: a.role, voice: a.voice || ["EVA Voice", "BUCH Voice", "Soft TTS"][i % 3],
      platforms: PLATFORMS.slice(0, 2 + (i % 4)), status: a.state === "ACTIVE" ? "ACTIVE" : "IDLE",
      content: 4 + i * 3, last: ["12:40", "вчера", "пн", "10:05"][i % 4],
    }));
    return list;
  }, [ctx]);

  const projects = useMemo(() => [
    { id: "p1", name: "EVA Shorts — июль", character: "EVA NOVIKOVA", status: "ACTIVE", progress: 62, platform: "TikTok" },
    { id: "p2", name: "BUCH Stream Teasers", character: "BUCH ☠️", status: "PLANNING", progress: 25, platform: "YouTube" },
    { id: "p3", name: "BUCHIHA Reels", character: "BUCHIHA 😇", status: "ACTIVE", progress: 48, platform: "Instagram" },
    { id: "p4", name: "AI Music Drops", character: "AI MUSIC", status: "REVIEW", progress: 90, platform: "Telegram" },
  ], []);
  const scripts = ["short_3-15.md", "stream_teaser.md", "reel_hook.md", "drop_announce.md"];
  const prompts = ["neon_studio_3-15.txt", "char_eva_v3.txt", "cinematic_lowlight.txt"];
  const images = ["char_eva.png", "bg_studio.png", "thumb_drop.png", "poster_stream.png"];
  const videos = ["clip_eva_01.mp4", "teaser_buch.mp4", "reel_buchiha.mp4"];
  const audio = ["eva_voice.wav", "synthwave_01.mp3", "drop_track.mp3"];
  const voices = [{ n: "EVA Voice", eng: "ElevenLabs", used: 12 }, { n: "BUCH Voice", eng: "ElevenLabs", used: 7 }, { n: "BUCHIHA Voice", eng: "OpenVoice", used: 5 }];
  const queue = [
    { job: "EVA Short Render", char: "EVA NOVIKOVA", status: "RUNNING", progress: 60, fmt: "mp4" },
    { job: "Drop Cover", char: "AI MUSIC", status: "DONE", progress: 100, fmt: "png" },
    { job: "Reel Export", char: "BUCHIHA 😇", status: "IDLE", progress: 0, fmt: "mp4" },
    { job: "Face Validation", char: "BUCH ☠️", status: "FAILED", progress: 0, fmt: "json" },
  ];
  const plan = useMemo(() => {
    const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    return days.map((d, i) => ({ day: d, items: i % 2 === 0 ? [{ char: characters[i % characters.length]?.name || "EVA", platform: PLATFORMS[i % PLATFORMS.length], status: PUB_STATES[i % PUB_STATES.length] }] : [] }));
  }, [characters]);
  const timeline = [
    { t: "12:40", text: "Published: EVA Short → TikTok (mock)" },
    { t: "12:10", text: "Reviewed: AI Music Drop cover" },
    { t: "11:30", text: "Rendered: clip_eva_01.mp4" },
    { t: "10:05", text: "Created: BUCHIHA Reel project" },
  ];
  const kpi = {
    characters: characters.length, projects: projects.length, scripts: scripts.length, prompts: prompts.length,
    assets: images.length + videos.length + audio.length, images: images.length, videos: videos.length, audio: audio.length,
    queued: queue.filter((q) => q.status !== "DONE").length, published: 8, pending: 5, failed: queue.filter((q) => q.status === "FAILED").length,
    views: "42.1k", engagement: "6.3%",
  };

  // write media registry for WORLD
  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify({
        schema: LS, timestamp: new Date().toISOString(),
        characters: characters.map((c) => ({ id: c.id, name: c.name })),
        projects: projects.map((p) => ({ id: p.id, name: p.name, character: p.character })),
        videos: videos, publishing: PLATFORMS.map((p) => ({ platform: p, status: "Review" })),
        kpi: { characters: kpi.characters, projects: kpi.projects, videos: kpi.videos, published: kpi.published },
      }));
    } catch {}
  }, [characters, projects]);

  const SCLR: Record<string, string> = { ACTIVE: "#4ade80", RUNNING: "#fbbf24", DONE: "#4ade80", IDLE: "#9ca3af", FAILED: "#f87171", PLANNING: "#38bdf8", REVIEW: "#fb7185", Published: "#4ade80", Draft: "#9ca3af", Ready: "#38bdf8", Review: "#fb7185", Archived: "#6b7280" };
  const Dot = ({ s }: { s: string }) => <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCLR[s] || "#9ca3af" }} />;
  const Card = ({ children, className = "" }: any) => <div className={`rounded-2xl border border-[rgba(232,121,249,.18)] bg-[rgba(20,14,26,.6)] p-4 backdrop-blur ${className}`}>{children}</div>;
  const Lib = ({ title, items }: { title: string; items: string[] }) => <Card><div className="mb-1 text-[10px] font-black uppercase tracking-wide text-tg-accent">{title} ({items.length})</div><div className="space-y-1 text-[12px]">{items.map((x) => <div key={x} className="rounded bg-tg-bg/50 px-2 py-1">{x}</div>)}</div></Card>;

  function Body() {
    if (tab === "overview") return (
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">{([["Characters", kpi.characters], ["Projects", kpi.projects], ["Scripts", kpi.scripts], ["Prompts", kpi.prompts], ["Assets", kpi.assets], ["Images", kpi.images], ["Videos", kpi.videos], ["Audio", kpi.audio], ["Queued", kpi.queued], ["Published", kpi.published], ["Failed", kpi.failed], ["Views", kpi.views]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-black text-fuchsia-300">{v}</div></Card>)}</div>
    );
    if (tab === "characters") return (
      <div className="grid gap-3 lg:grid-cols-2">{characters.map((c) => (
        <Card key={c.id}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full font-bold text-white" style={{ background: av(c.name) }}>{ini(c.name)}</div>
          <div className="flex-1"><div className="flex items-center gap-1.5 font-bold">{c.name}<Dot s={c.status} /></div><div className="text-[11px] text-tg-muted">{c.role} · voice {c.voice} · {c.content} content · last {c.last}</div></div></div>
          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">{c.platforms.map((p) => <span key={p} className="rounded-full bg-tg-bg px-2 py-0.5 text-tg-muted">{p}</span>)}</div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-tg-muted">{["Identity", "Visual Profile", "Voice Profile", "Prompt Profile", "Content History", "Mission"].map((x) => <span key={x} className="rounded bg-tg-bg/40 px-1.5 py-1 text-center">{x}</span>)}</div>
          <button onClick={() => onAction?.("agent:" + c.id)} className="mt-2 rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open Character</button></Card>))}</div>
    );
    if (tab === "voices") return <div className="grid gap-3 lg:grid-cols-3">{voices.map((v) => <Card key={v.n}><div className="font-bold">{v.n}</div><div className="text-[12px] text-tg-muted">engine: {v.eng} · used in {v.used} clips</div><div className="mt-1 text-[11px] text-tg-muted">🎙 preview (mock)</div></Card>)}</div>;
    if (tab === "projects") return (
      <div className="space-y-2">{projects.map((p) => (
        <Card key={p.id}><div className="flex items-center gap-2"><Dot s={p.status} /><span className="flex-1 font-semibold">{p.name}</span><span className="text-[11px] text-tg-muted">{p.character} · {p.platform}</span></div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px]"><div className="h-1.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: p.progress + "%" }} /></div><span>{p.progress}%</span><span className="text-tg-muted">{p.status}</span></div></Card>))}</div>
    );
    if (tab === "plans") return (
      <div className="space-y-3"><Card><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-tg-accent">Content Calendar · Неделя</div>
        <div className="grid grid-cols-7 gap-1.5">{plan.map((d) => <div key={d.day} className="rounded-xl border border-tg-line bg-tg-bg/30 p-2"><div className="mb-1 text-[11px] font-bold text-tg-muted">{d.day}</div>{d.items.length ? d.items.map((it, i) => <div key={i} className="mb-1 rounded bg-tg-bg/60 p-1 text-[9px]"><Dot s={it.status} /> {it.char}<div className="text-tg-muted">{it.platform} · {it.status}</div></div>) : <div className="text-[9px] text-tg-muted">—</div>}</div>)}</div></Card>
        <Card><div className="text-[11px] text-tg-muted">Views: День / Неделя / Месяц · фильтр по платформе/персонажу/статусу (mock).</div></Card></div>
    );
    if (tab === "scripts") return <Lib title="Scripts" items={scripts} />;
    if (tab === "prompts") return <Lib title="Prompts" items={prompts} />;
    if (tab === "assets") return <div className="grid gap-3 lg:grid-cols-3"><Lib title="Images" items={images} /><Lib title="Videos" items={videos} /><Lib title="Audio" items={audio} /></div>;
    if (tab === "images") return <Lib title="Images" items={images} />;
    if (tab === "videos") return <Lib title="Videos" items={videos} />;
    if (tab === "audio") return <Lib title="Audio" items={audio} />;
    if (tab === "queue") return (
      <Card><table className="w-full text-left text-sm"><thead className="text-tg-muted text-xs"><tr>{["", "Job", "Character", "Status", "Progress", "Format"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>{queue.map((q, i) => <tr key={i} className="border-t border-tg-line"><td className="px-2 py-1.5"><Dot s={q.status} /></td><td className="px-2 font-semibold">{q.job}</td><td className="px-2 text-tg-muted">{q.char}</td><td className="px-2">{q.status}</td><td className="px-2 w-32"><div className="h-1.5 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: q.progress + "%" }} /></div></td><td className="px-2 text-tg-muted">{q.fmt}</td></tr>)}</tbody></table></Card>
    );
    if (tab === "publishing") return (
      <div className="space-y-3"><Card><div className="mb-2 text-[10px] font-black uppercase tracking-wide text-tg-accent">Publishing Center</div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{PLATFORMS.map((p) => <div key={p} className="rounded-xl bg-tg-bg/40 p-3 text-center"><div className="font-semibold">{p}</div><div className="text-[11px] text-tg-muted">Review</div></div>)}</div></Card>
        <Card><div className="flex flex-wrap gap-2 text-[11px]">{PUB_STATES.map((s) => <span key={s} className="flex items-center gap-1 rounded-full bg-tg-bg px-2 py-1"><Dot s={s} />{s}</span>)}</div><div className="mt-2 text-[11px] text-tg-muted">Публикация отключена (UI-only). Контент проходит Review перед публикацией.</div></Card></div>
    );
    if (tab === "analytics") return (
      <div className="space-y-3"><div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{([["Posts", kpi.published + kpi.pending], ["Published", kpi.published], ["Pending", kpi.pending], ["Failed", kpi.failed], ["Views", kpi.views], ["Engagement", kpi.engagement], ["Videos", kpi.videos], ["Images", kpi.images]] as const).map(([l, v]) => <Card key={l}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-black text-fuchsia-300">{v}</div></Card>)}</div>
        <Card><div className="mb-1 text-[10px] font-black uppercase tracking-wide text-tg-accent">Media Timeline</div><div className="space-y-0.5 text-[12px]">{timeline.map((e, i) => <div key={i} className="flex gap-2"><span className="text-tg-muted">{e.t}</span><span>{e.text}</span></div>)}</div></Card></div>
    );
    // archive
    return <Lib title="Archive" items={["short_june_01.mp4", "old_reel.mp4", "promo_v1.png"]} />;
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0b0710] text-tg-text">
      <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(232,121,249,.25)] bg-[#160e1a] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🎬 MEDIA OPERATIONS CENTER</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · MEDIA</span>
        <div className="ml-auto flex flex-wrap gap-1 text-[10px]">{([["Chars", kpi.characters], ["Projects", kpi.projects], ["Videos", kpi.videos], ["Published", kpi.published], ["Failed", kpi.failed]] as const).map(([l, v]) => <span key={l} className="rounded-full border border-tg-line bg-tg-bg px-2 py-1"><span className="text-tg-muted">{l} </span><b>{v}</b></span>)}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[190px_1fr_260px]">
        <nav className="min-h-0 overflow-auto border-r border-[rgba(232,121,249,.15)] bg-[#160e1a] p-2">
          <div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">MEDIA OPS</div>
          {TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${tab === id ? "bg-fuchsia-600/25 text-white ring-1 ring-fuchsia-500/40" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{label}</button>)}
        </nav>
        <main className="min-h-0 overflow-auto p-4"><Body /></main>
        {/* AI MEDIA DIRECTOR */}
        <aside className="min-h-0 overflow-auto border-l border-[rgba(232,121,249,.15)] bg-[#160e1a] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">AI Media Director</div>
          <div className="mt-2 space-y-2 text-xs">
            <Card className="!p-2.5"><div className="text-[10px] uppercase text-tg-muted">Active Projects</div><div className="text-lg font-black">{projects.filter((p) => p.status === "ACTIVE").length}</div></Card>
            <Card className="!p-2.5"><div className="text-[10px] uppercase text-tg-muted">Render Queue</div><div className="text-lg font-black">{kpi.queued}</div></Card>
            <Card className="!p-2.5"><div className="text-[10px] uppercase text-tg-muted">Publishing Queue</div><div className="text-lg font-black">{kpi.pending}</div></Card>
            <Card className="!p-2.5"><div className="mb-1 text-[10px] uppercase text-tg-muted">Recommendations</div>
              <div className="space-y-1 text-[11px] text-tg-muted"><div>• {characters[0]?.name || "EVA"}: запланировать 2 шортса на выходные.</div><div>• AI Music Drop ждёт Review — закрыть до публикации.</div><div>• BUCH Stream Teasers: добавить превью-кадры.</div></div></Card>
            <Card className="!p-2.5"><div className="mb-1 text-[10px] uppercase text-tg-muted">Content Gaps</div><div className="space-y-1 text-[11px] text-tg-muted"><div>• Нет контента на Facebook / X.</div><div>• Мало аудио-дропов на неделе.</div></div></Card>
            <Card className="!p-2.5"><div className="mb-1 text-[10px] uppercase text-tg-muted">Character Activity</div><div className="space-y-1 text-[11px]">{characters.slice(0, 4).map((c) => <div key={c.id} className="flex items-center gap-1.5"><Dot s={c.status} /><span className="flex-1">{c.name}</span><span className="text-tg-muted">{c.content}</span></div>)}</div></Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
