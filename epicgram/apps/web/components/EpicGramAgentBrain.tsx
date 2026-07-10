"use client";

// EPIC GRAM AGENT BRAIN — PHASE R.5 (Agent Memory) + R.6 (Content Brain) + R.4 ext (Registry)
// + Channel Assignment + Publication History + Analytics ext + Autonomy Readiness.
// ADDITIVE overlay module. Reads existing epicgram.drafts.v1 / epicgram.publishlog.v1 READ-ONLY
// for derived timelines/history. Persists its own keys. NO backend, NO network, NO timers,
// NO cron, NO automation, NO auto-publish. Approval gate stays mandatory; human is operator.

import { useEffect, useMemo, useState } from "react";

// ---------- shared keys ----------
const DRAFTS_LS = "epicgram.drafts.v1";        // read-only (owned by Publisher)
const LOG_LS = "epicgram.publishlog.v1";       // read-only (owned by Publisher)
const BRAIN_LS = "epicgram.agentBrain.v1";
const MEM_LS = "epicgram.agentMemory.v1";
const IDEAS_LS = "epicgram.contentIdeas.v1";
const CAMP_LS = "epicgram.campaigns.v1";
const ASSIGN_LS = "epicgram.channelAssignments.v1";
const PUBHIST_LS = "epicgram.publicationHistory.v1"; // derived snapshot cache

const AGENTS = ["NOVIKOVA", "AI MUSIC PUBLIC", "EVA", "AI NEWSCASTER"];

// ---------- types ----------
type Prio = "LOW" | "NORMAL" | "HIGH";
type Topic = { name: string; weight: number; priority: Prio; activity: number; usageCount: number };
type Brain = {
  name: string;
  identity: string; role: string; mission: string; personality: string; tone: string;
  goals: string[]; interests: string[]; targetAudience: string; contentTopics: string[];
  knowledgeBase: string[]; favoriteFormats: string[];
  contentMission: string; contentStrategy: string; weeklyThemes: string[]; monthlyThemes: string[];
  contentCategories: string[]; postingFrequency: string; contentGoals: string[];
  topics: Topic[];
  longTerm: string[];
  updatedAt: string;
};
type Idea = { id: string; idea: string; topic: string; channel: string; status: "NEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED"; priority: Prio; authorAgent: string; createdAt: string; approved: boolean; published: boolean };
type Campaign = { id: string; name: string; agent: string; channel: string; goalPosts: number; days: number; status: "DRAFT" | "ACTIVE" | "COMPLETED" | "PAUSED"; createdAt: string };
type Assignment = { id: string; agent: string; account: string; channel: string; campaign?: string };
type DraftLite = { id: string; authorAgent?: string; channelTitle?: string; channelId?: string; status?: string; title?: string; createdAt?: string; updatedAt?: string; scheduledAt?: string };
type LogLite = { id: string; draftId?: string; channelTitle?: string; channelId?: string; status?: string; createdAt?: string; publishedAt?: string };

// ---------- io helpers ----------
const rid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
function load<T>(k: string, def: T): T { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch { return def; } }
function save(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const fmtDT = (iso?: string) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; } };
const csv = (a?: string[]) => (a || []).join(", ");
const fromCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
function groupCount<T>(arr: T[], key: (t: T) => string) { const m: Record<string, number> = {}; arr.forEach((x) => { const k = key(x) || "—"; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }
const PRIO_DOT: Record<string, string> = { LOW: "#64748b", NORMAL: "#a78bfa", HIGH: "#f472b6" };

// ---------- seed brains ----------
const EMPTY: Brain = {
  name: "", identity: "", role: "", mission: "", personality: "", tone: "",
  goals: [], interests: [], targetAudience: "", contentTopics: [], knowledgeBase: [], favoriteFormats: [],
  contentMission: "", contentStrategy: "", weeklyThemes: [], monthlyThemes: [], contentCategories: [],
  postingFrequency: "", contentGoals: [], topics: [], longTerm: [], updatedAt: ""
};
function seed(): Record<string, Brain> {
  const b: Record<string, Brain> = {};
  AGENTS.forEach((n) => { b[n] = { ...EMPTY, name: n, updatedAt: now() }; });
  b["NOVIKOVA"] = {
    ...EMPTY, name: "NOVIKOVA",
    identity: "Цифровой человек NOVIKOVA — ведущая виртуального радио и новостей DEEPINSIDE.",
    role: "AI Publisher Agent · ведущая канала NOVIKOVA NEWS",
    mission: "Рассказывать о будущем — AI, цифровых людях и виртуальном радио — живо и по-человечески.",
    personality: "тёплая, любопытная, ироничная, технооптимист",
    tone: "дружелюбно-экспертный, без канцелярита",
    goals: ["Запустить NOVIKOVA NEWS", "Ежедневный контент-ритм", "Вырастить аудиторию", "Готовность к монетизации"],
    interests: ["AI", "Digital Human", "Virtual Radio", "Future Tech", "Lifestyle"],
    targetAudience: "20–40 лет, интересуются AI, технологиями, цифровой культурой",
    contentTopics: ["AI", "Digital Human", "Virtual Radio", "Future Tech", "Lifestyle", "Content Creation", "Media", "Startups", "Telegram", "Automation"],
    knowledgeBase: ["DEEPINSIDE ecosystem", "EPIC GRAM Publisher", "TDLib runtime", "канал NOVIKOVA NEWS"],
    favoriteFormats: ["News", "Stories", "Posts", "Announcements"],
    contentMission: "Делать сложное про AI понятным и вдохновляющим.",
    contentStrategy: "Микс новостей, историй и анонсов; 1 главная тема недели + ежедневные короткие посты.",
    weeklyThemes: ["AI-новости недели", "История цифрового человека", "За кулисами виртуального радио"],
    monthlyThemes: ["Запуск NOVIKOVA NEWS", "Будущее медиа", "AI в повседневности"],
    contentCategories: ["News", "Story", "Announcement", "Explainer", "Behind the scenes"],
    postingFrequency: "1–2 поста в день",
    contentGoals: ["Узнаваемость персоны", "Регулярность", "Вовлечённость аудитории"],
    topics: [
      { name: "AI", weight: 10, priority: "HIGH", activity: 0, usageCount: 0 },
      { name: "Digital Human", weight: 9, priority: "HIGH", activity: 0, usageCount: 0 },
      { name: "Virtual Radio", weight: 8, priority: "HIGH", activity: 0, usageCount: 0 },
      { name: "Future Tech", weight: 7, priority: "NORMAL", activity: 0, usageCount: 0 },
      { name: "Lifestyle", weight: 6, priority: "NORMAL", activity: 0, usageCount: 0 },
      { name: "Content Creation", weight: 6, priority: "NORMAL", activity: 0, usageCount: 0 },
      { name: "Media", weight: 5, priority: "NORMAL", activity: 0, usageCount: 0 },
      { name: "Startups", weight: 4, priority: "LOW", activity: 0, usageCount: 0 },
      { name: "Telegram", weight: 4, priority: "LOW", activity: 0, usageCount: 0 },
      { name: "Automation", weight: 4, priority: "LOW", activity: 0, usageCount: 0 }
    ],
    longTerm: ["Канал: NOVIKOVA NEWS", "Первая публикация через EPIC GRAM выполнена", "Тематика: AI / Lifestyle / Digital Human / Virtual Radio"],
    updatedAt: now()
  };
  b["AI MUSIC PUBLIC"] = {
    ...EMPTY, name: "AI MUSIC PUBLIC",
    identity: "AI MUSIC — куратор музыки и звуковой культуры DEEPINSIDE.",
    role: "AI Publisher Agent · канал AI MUSIC NEWS",
    mission: "Открывать музыку, созданную и вдохновлённую AI.",
    tone: "энергичный, ритмичный",
    interests: ["AI Music", "Sound", "Producers", "Tech"],
    contentTopics: ["AI Music", "Producers", "Releases", "Sound Design", "Culture"],
    favoriteFormats: ["Releases", "Playlists", "News"],
    contentCategories: ["Release", "News", "Playlist"],
    postingFrequency: "ежедневно",
    topics: [
      { name: "AI Music", weight: 10, priority: "HIGH", activity: 0, usageCount: 0 },
      { name: "Producers", weight: 7, priority: "NORMAL", activity: 0, usageCount: 0 },
      { name: "Releases", weight: 8, priority: "HIGH", activity: 0, usageCount: 0 }
    ],
    longTerm: ["Канал: AI MUSIC NEWS", "Кампания: MUSIC DAILY"],
    updatedAt: now()
  };
  return b;
}

const SECTIONS: [string, string][] = [
  ["registry", "🗂 Agent Registry"], ["memory", "🧠 Memory"], ["brain", "📚 Content Brain"], ["ideas", "💡 Content Ideas"],
  ["campaigns", "📋 Campaigns"], ["assign", "📡 Channel Assignment"], ["history", "📜 Publication History"],
  ["analytics", "📈 Analytics+"], ["autonomy", "🤖 Autonomy Readiness"]
];

export function EpicGramAgentBrain({ onClose }: { onClose: () => void }) {
  const [sec, setSec] = useState("registry");
  const [agent, setAgent] = useState(AGENTS[0]);
  const [brains, setBrains] = useState<Record<string, Brain>>({});
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [camps, setCamps] = useState<Campaign[]>([]);
  const [assigns, setAssigns] = useState<Assignment[]>([]);
  const [drafts, setDrafts] = useState<DraftLite[]>([]);
  const [log, setLog] = useState<LogLite[]>([]);

  useEffect(() => {
    const stored = load<Record<string, Brain>>(BRAIN_LS, {});
    const base = seed();
    // merge: seed defaults, stored overrides per agent (backward-safe, never wipes)
    const merged: Record<string, Brain> = { ...base };
    Object.keys(stored).forEach((k) => { merged[k] = { ...base[k], ...stored[k] }; });
    setBrains(merged);
    setIdeas(load<Idea[]>(IDEAS_LS, []));
    setCamps(load<Campaign[]>(CAMP_LS, []));
    setAssigns(load<Assignment[]>(ASSIGN_LS, []));
    setDrafts(load<DraftLite[]>(DRAFTS_LS, []));
    setLog(load<LogLite[]>(LOG_LS, []));
  }, []);

  const writeBrains = (b: Record<string, Brain>) => { setBrains(b); save(BRAIN_LS, b); };
  const writeIdeas = (v: Idea[]) => { setIdeas(v); save(IDEAS_LS, v); };
  const writeCamps = (v: Campaign[]) => { setCamps(v); save(CAMP_LS, v); };
  const writeAssigns = (v: Assignment[]) => { setAssigns(v); save(ASSIGN_LS, v); };
  const patchBrain = (p: Partial<Brain>) => { const b = { ...brains, [agent]: { ...brains[agent], ...p, updatedAt: now() } }; writeBrains(b); };

  const B = brains[agent];

  // ---------- derived ----------
  const draftsByAgent = (a: string) => drafts.filter((d) => d.authorAgent === a);
  const success = log.filter((e) => e.status === "SUCCESS");
  const failed = log.filter((e) => e.status === "FAILED");
  const draftById = useMemo(() => { const m: Record<string, DraftLite> = {}; drafts.forEach((d) => { m[d.id] = d; }); return m; }, [drafts]);
  const agentOfLog = (e: LogLite) => (e.draftId && draftById[e.draftId]?.authorAgent) || "—";

  function scores(a: string) {
    const b = brains[a] || EMPTY;
    const memFields = [b.identity, b.role, b.mission, b.tone, b.personality, b.targetAudience];
    const memList = [b.goals.length, b.interests.length, b.contentTopics.length].filter((n) => n > 0).length;
    const memoryScore = Math.round(((memFields.filter(Boolean).length + memList) / (memFields.length + 3)) * 100);
    const brainFields = [b.contentMission, b.contentStrategy, b.postingFrequency];
    const brainList = [b.weeklyThemes.length, b.contentCategories.length, b.contentGoals.length].filter((n) => n > 0).length + (b.topics.length >= 3 ? 1 : 0);
    const brainScore = Math.round(((brainFields.filter(Boolean).length + brainList) / (brainFields.length + 4)) * 100);
    const mine = draftsByAgent(a);
    const pub = mine.filter((d) => d.status === "PUBLISHED").length;
    const appr = mine.filter((d) => d.status === "APPROVED" || d.status === "PUBLISHED").length;
    const rej = mine.filter((d) => d.status === "REJECTED").length;
    const approvalRate = appr + rej > 0 ? Math.round((appr / (appr + rej)) * 100) : 0;
    const channels = assigns.filter((x) => x.agent === a).map((x) => x.channel);
    const activeCampaigns = camps.filter((c) => c.agent === a && c.status === "ACTIVE").length;
    const last = mine.map((d) => d.updatedAt || d.createdAt || "").sort().slice(-1)[0] || "";
    return { memoryScore, brainScore, pub, approvalRate, channels, activeCampaigns, last };
  }

  // timeline from drafts + log (read-only derive)
  function timeline(a: string) {
    const ev: { t: string; label: string }[] = [];
    draftsByAgent(a).forEach((d) => {
      if (d.createdAt) ev.push({ t: d.createdAt, label: "📝 Черновик создан: " + (d.title || "—") });
      if (d.status === "PUBLISHED" && d.updatedAt) ev.push({ t: d.updatedAt, label: "📤 Опубликовано: " + (d.title || "—") + " → " + (d.channelTitle || d.channelId || "") });
      if (d.status === "APPROVED" && d.updatedAt) ev.push({ t: d.updatedAt, label: "✓ Одобрено оператором: " + (d.title || "—") });
      if (d.status === "REJECTED" && d.updatedAt) ev.push({ t: d.updatedAt, label: "✕ Отклонено: " + (d.title || "—") });
      if (d.status === "SCHEDULED" && d.scheduledAt) ev.push({ t: d.scheduledAt, label: "🗓 Запланировано: " + (d.title || "—") });
    });
    success.filter((e) => agentOfLog(e) === a).forEach((e) => ev.push({ t: e.publishedAt || e.createdAt || "", label: "✅ Доставлено в Telegram → " + (e.channelTitle || e.channelId || "") }));
    return ev.filter((x) => x.t).sort((p, q) => (p.t < q.t ? 1 : -1)).slice(0, 40);
  }

  // ---------- small UI atoms ----------
  const Field = ({ label, value, onSave, area }: { label: string; value: string; onSave: (v: string) => void; area?: boolean }) =>
    <label className="block text-[11px] text-tg-muted">{label}
      {area
        ? <textarea defaultValue={value} onBlur={(e) => onSave(e.target.value)} rows={2} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text" />
        : <input defaultValue={value} onBlur={(e) => onSave(e.target.value)} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text" />}
    </label>;
  const ListField = ({ label, value, onSave }: { label: string; value: string[]; onSave: (v: string[]) => void }) =>
    <label className="block text-[11px] text-tg-muted">{label} <span className="opacity-50">(через запятую)</span>
      <input defaultValue={csv(value)} onBlur={(e) => onSave(fromCsv(e.target.value))} className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text" />
    </label>;
  const Tag = ({ children, color }: { children: any; color?: string }) => <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: (color || "#a78bfa") + "22", color: color || "#c4b5fd" }}>{children}</span>;

  // ================= SECTIONS =================
  function Registry() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">Agent Registry · память + мозг + публикации</div>
      <div className="grid gap-2 lg:grid-cols-2">{AGENTS.map((a) => { const s = scores(a); return <div key={a} className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between"><b className="text-[13px] text-fuchsia-200">🤖 {a}</b><button onClick={() => { setAgent(a); setSec("memory"); }} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">открыть мозг →</button></div>
        <div className="mt-1 grid grid-cols-4 gap-1 text-center text-[10px]">
          <div className="rounded bg-black/30 p-1"><div className="text-base font-black text-indigo-300">{s.memoryScore}%</div>Memory</div>
          <div className="rounded bg-black/30 p-1"><div className="text-base font-black text-emerald-300">{s.brainScore}%</div>Brain</div>
          <div className="rounded bg-black/30 p-1"><div className="text-base font-black text-sky-300">{s.pub}</div>Posts</div>
          <div className="rounded bg-black/30 p-1"><div className="text-base font-black text-fuchsia-300">{s.approvalRate}%</div>Approval</div>
        </div>
        <div className="mt-1 text-[10px] text-tg-muted">Каналы: {s.channels.length ? s.channels.join(", ") : "—"} · Кампаний активно: {s.activeCampaigns}</div>
        <div className="text-[10px] text-tg-muted">Последняя активность: {s.last ? fmtDT(s.last) : "—"}</div>
      </div>; })}</div>
    </div></main>;
  }

  function Memory() {
    if (!B) return null;
    const st = timeline(agent).slice(0, 20);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">🧠 Memory · {agent}</span></div>
      <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2">
        <Field label="Identity" value={B.identity} onSave={(v) => patchBrain({ identity: v })} area />
        <Field label="Role" value={B.role} onSave={(v) => patchBrain({ role: v })} area />
        <Field label="Mission" value={B.mission} onSave={(v) => patchBrain({ mission: v })} area />
        <Field label="Personality" value={B.personality} onSave={(v) => patchBrain({ personality: v })} />
        <Field label="Tone" value={B.tone} onSave={(v) => patchBrain({ tone: v })} />
        <Field label="Target Audience" value={B.targetAudience} onSave={(v) => patchBrain({ targetAudience: v })} />
        <ListField label="Goals" value={B.goals} onSave={(v) => patchBrain({ goals: v })} />
        <ListField label="Interests" value={B.interests} onSave={(v) => patchBrain({ interests: v })} />
        <ListField label="Content Topics" value={B.contentTopics} onSave={(v) => patchBrain({ contentTopics: v })} />
        <ListField label="Knowledge Base" value={B.knowledgeBase} onSave={(v) => patchBrain({ knowledgeBase: v })} />
        <ListField label="Favorite Formats" value={B.favoriteFormats} onSave={(v) => patchBrain({ favoriteFormats: v })} />
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Long Term Memory · ключевые факты</div>
          <ListField label="Факты" value={B.longTerm} onSave={(v) => patchBrain({ longTerm: v })} />
          <div className="mt-1 space-y-0.5">{B.longTerm.map((f, i) => <div key={i} className="rounded bg-black/30 px-2 py-1 text-[11px]">• {f}</div>)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Short Term Memory · последние {st.length}</div>
          <div className="space-y-0.5">{st.length === 0 ? <div className="text-[11px] text-tg-muted">Действий пока нет.</div> : st.map((e, i) => <div key={i} className="text-[11px] text-tg-muted">{fmtDT(e.t).slice(0, 17)} · {e.label}</div>)}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Memory Timeline · авто из Drafts / Approvals / Publishes / Logs</div>
        <div className="space-y-1">{timeline(agent).length === 0 ? <div className="text-[11px] text-tg-muted">Лента пуста — создай и опубликуй пост в Publisher.</div> : timeline(agent).map((e, i) => <div key={i} className="flex gap-2 text-[11px]"><span className="w-32 shrink-0 text-tg-muted">{fmtDT(e.t).slice(0, 17)}</span><span>{e.label}</span></div>)}</div>
      </div>
    </div></main>;
  }

  function ContentBrain() {
    if (!B) return null;
    const usage = (name: string) => draftsByAgent(agent).filter((d) => (d.title || "").toLowerCase().includes(name.toLowerCase())).length;
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-3">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">📚 Content Brain · {agent}</div>
      <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2">
        <Field label="Content Mission" value={B.contentMission} onSave={(v) => patchBrain({ contentMission: v })} area />
        <Field label="Content Strategy" value={B.contentStrategy} onSave={(v) => patchBrain({ contentStrategy: v })} area />
        <Field label="Posting Frequency" value={B.postingFrequency} onSave={(v) => patchBrain({ postingFrequency: v })} />
        <ListField label="Weekly Themes" value={B.weeklyThemes} onSave={(v) => patchBrain({ weeklyThemes: v })} />
        <ListField label="Monthly Themes" value={B.monthlyThemes} onSave={(v) => patchBrain({ monthlyThemes: v })} />
        <ListField label="Content Categories" value={B.contentCategories} onSave={(v) => patchBrain({ contentCategories: v })} />
        <ListField label="Content Goals" value={B.contentGoals} onSave={(v) => patchBrain({ contentGoals: v })} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-1 flex items-center justify-between"><span className="text-[10px] uppercase text-fuchsia-300/70">Topic Registry</span>
          <button onClick={() => { const name = prompt("Новая тема:"); if (!name) return; patchBrain({ topics: [...B.topics, { name, weight: 5, priority: "NORMAL", activity: 0, usageCount: 0 }] }); }} className="rounded bg-fuchsia-600/30 px-2 py-0.5 text-[10px] hover:bg-fuchsia-600/50">＋ тема</button>
        </div>
        <table className="w-full text-[11px]"><thead className="text-fuchsia-300/60"><tr>{["Тема", "Weight", "Priority", "Usage", ""].map((h) => <th key={h} className="px-1 py-0.5 text-left">{h}</th>)}</tr></thead>
          <tbody>{B.topics.map((t, i) => <tr key={i} className="border-t border-white/5">
            <td className="px-1 py-0.5"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: PRIO_DOT[t.priority] }} />{t.name}</td>
            <td className="px-1 py-0.5">{t.weight}</td>
            <td className="px-1 py-0.5"><Tag color={PRIO_DOT[t.priority]}>{t.priority}</Tag></td>
            <td className="px-1 py-0.5">{usage(t.name) || t.usageCount}</td>
            <td className="px-1 py-0.5 text-right"><button onClick={() => patchBrain({ topics: B.topics.filter((_, j) => j !== i) })} className="text-rose-300/70 hover:text-rose-300">✕</button></td>
          </tr>)}</tbody></table>
        {B.topics.length === 0 && <div className="text-[11px] text-tg-muted">Тем нет — добавь первую.</div>}
      </div>
    </div></main>;
  }

  function Ideas() {
    const [t, setT] = useState(""); const [tp, setTp] = useState(""); const [ch, setCh] = useState(""); const [pr, setPr] = useState<Prio>("NORMAL");
    const add = () => { if (!t.trim()) return; writeIdeas([{ id: rid(), idea: t.trim(), topic: tp.trim(), channel: ch.trim(), status: "NEW", priority: pr, authorAgent: agent, createdAt: now(), approved: false, published: false }, ...ideas]); setT(""); setTp(""); setCh(""); };
    const set = (id: string, p: Partial<Idea>) => writeIdeas(ideas.map((x) => x.id === id ? { ...x, ...p } : x));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">💡 Content Ideas · {agent} · хранилище (без AI-вызовов)</div>
      <div className="grid gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2">
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Идея поста…" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] sm:col-span-2" />
        <input value={tp} onChange={(e) => setTp(e.target.value)} placeholder="Тема" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
        <input value={ch} onChange={(e) => setCh(e.target.value)} placeholder="Канал" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
        <select value={pr} onChange={(e) => setPr(e.target.value as Prio)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-tg-text"><option value="LOW" className="bg-black">Low</option><option value="NORMAL" className="bg-black">Normal</option><option value="HIGH" className="bg-black">High</option></select>
        <button onClick={add} disabled={!t.trim()} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40">＋ Add Idea</button>
      </div>
      <div className="space-y-1">{ideas.filter((x) => x.authorAgent === agent).map((x) => <div key={x.id} className="rounded-xl border border-white/10 bg-white/5 p-2">
        <div className="flex items-center justify-between"><span className="text-[12px]"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: PRIO_DOT[x.priority] }} />{x.idea}</span><Tag>{x.status}</Tag></div>
        <div className="text-[10px] text-tg-muted">{x.topic || "—"} · {x.channel || "—"} · {fmtDT(x.createdAt).slice(0, 17)}</div>
        <div className="mt-1 flex gap-1">
          <button onClick={() => set(x.id, { status: "APPROVED", approved: true })} className="rounded bg-emerald-600/25 px-2 py-0.5 text-[10px] hover:bg-emerald-600/40">approve</button>
          <button onClick={() => set(x.id, { status: "PUBLISHED", published: true })} className="rounded bg-sky-600/25 px-2 py-0.5 text-[10px] hover:bg-sky-600/40">mark published</button>
          <button onClick={() => set(x.id, { status: "ARCHIVED" })} className="rounded bg-zinc-600/25 px-2 py-0.5 text-[10px] hover:bg-zinc-600/40">archive</button>
          <button onClick={() => writeIdeas(ideas.filter((y) => y.id !== x.id))} className="ml-auto text-[10px] text-rose-300/70 hover:text-rose-300">✕</button>
        </div>
      </div>)}{ideas.filter((x) => x.authorAgent === agent).length === 0 && <div className="text-[11px] text-tg-muted">Идей нет — добавь первую.</div>}</div>
    </div></main>;
  }

  function pubForCampaign(c: Campaign) { return draftsByAgent(c.agent).filter((d) => d.status === "PUBLISHED" && (d.channelTitle === c.channel || d.channelId === c.channel) && (d.updatedAt || "") >= c.createdAt).length; }

  function Campaigns() {
    const [n, setN] = useState(""); const [ch, setCh] = useState(""); const [goal, setGoal] = useState(100); const [days, setDays] = useState(30);
    const add = () => { if (!n.trim()) return; writeCamps([{ id: rid(), name: n.trim(), agent, channel: ch.trim(), goalPosts: goal || 0, days: days || 0, status: "DRAFT", createdAt: now() }, ...camps]); setN(""); setCh(""); };
    const set = (id: string, s: Campaign["status"]) => writeCamps(camps.map((c) => c.id === id ? { ...c, status: s } : c));
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">📋 Campaigns · {agent}</div>
      <div className="grid gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-4">
        <input value={n} onChange={(e) => setN(e.target.value)} placeholder="Название (NOVIKOVA LAUNCH)" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] sm:col-span-2" />
        <input value={ch} onChange={(e) => setCh(e.target.value)} placeholder="Канал" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
        <div className="flex gap-1"><input type="number" value={goal} onChange={(e) => setGoal(+e.target.value)} placeholder="постов" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" /><input type="number" value={days} onChange={(e) => setDays(+e.target.value)} placeholder="дней" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" /></div>
        <button onClick={add} disabled={!n.trim()} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40 sm:col-span-4">＋ Add Campaign</button>
      </div>
      <div className="space-y-1">{camps.map((c) => { const done = pubForCampaign(c); const pct = c.goalPosts > 0 ? Math.min(100, Math.round((done / c.goalPosts) * 100)) : 0; return <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between"><b className="text-[12px]">{c.name}</b><Tag color={c.status === "ACTIVE" ? "#4ade80" : c.status === "COMPLETED" ? "#38bdf8" : c.status === "PAUSED" ? "#fbbf24" : "#94a3b8"}>{c.status}</Tag></div>
        <div className="text-[10px] text-tg-muted">{c.agent} → {c.channel || "—"} · цель {c.goalPosts} постов / {c.days} дней</div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full rounded bg-fuchsia-500/60" style={{ width: pct + "%" }} /></div>
        <div className="mt-0.5 text-[10px] text-tg-muted">Progress: {done}/{c.goalPosts} · score {pct}%</div>
        <div className="mt-1 flex gap-1">{(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] as Campaign["status"][]).map((s) => <button key={s} onClick={() => set(c.id, s)} className={"rounded px-2 py-0.5 text-[10px] " + (c.status === s ? "bg-fuchsia-600/40" : "bg-white/10 hover:bg-white/20")}>{s}</button>)}<button onClick={() => writeCamps(camps.filter((y) => y.id !== c.id))} className="ml-auto text-[10px] text-rose-300/70 hover:text-rose-300">✕</button></div>
      </div>; })}{camps.length === 0 && <div className="text-[11px] text-tg-muted">Кампаний нет.</div>}</div>
    </div></main>;
  }

  function Assign() {
    const [ac, setAc] = useState(""); const [ch, setCh] = useState(""); const [cp, setCp] = useState("");
    const add = () => { if (!ch.trim()) return; writeAssigns([{ id: rid(), agent, account: ac.trim(), channel: ch.trim(), campaign: cp.trim() || undefined }, ...assigns]); setAc(""); setCh(""); setCp(""); };
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300/80">📡 Channel Assignment · Agent → Account → Channel → Campaign</div>
      <div className="grid gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-fuchsia-200">{agent}</div>
        <input value={ac} onChange={(e) => setAc(e.target.value)} placeholder="Account (slotId/имя)" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
        <input value={ch} onChange={(e) => setCh(e.target.value)} placeholder="Channel" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
        <div className="flex gap-1"><input value={cp} onChange={(e) => setCp(e.target.value)} placeholder="Campaign (опц.)" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" /><button onClick={add} disabled={!ch.trim()} className="rounded-lg bg-fuchsia-600/30 px-3 py-1.5 text-[12px] font-semibold hover:bg-fuchsia-600/50 disabled:opacity-40">＋</button></div>
      </div>
      <div className="space-y-1">{assigns.map((x) => <div key={x.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px]">
        <span><b className="text-fuchsia-200">{x.agent}</b> → {x.account || "—"} → 📢 {x.channel}{x.campaign ? " → 🎯 " + x.campaign : ""}</span>
        <button onClick={() => writeAssigns(assigns.filter((y) => y.id !== x.id))} className="text-[11px] text-rose-300/70 hover:text-rose-300">✕</button>
      </div>)}{assigns.length === 0 && <div className="text-[11px] text-tg-muted">Привязок нет — свяжи агента с каналом.</div>}</div>
    </div></main>;
  }

  function History() {
    const total = success.length;
    const byChannel = groupCount(success, (e) => e.channelTitle || e.channelId || "—");
    const byAgent = groupCount(success, (e) => agentOfLog(e));
    const wk = (iso?: string) => { if (!iso) return "—"; const d = new Date(iso); const onejan = new Date(d.getFullYear(), 0, 1); const w = Math.ceil((((d.getTime() - onejan.getTime()) / 864e5) + onejan.getDay() + 1) / 7); return d.getFullYear() + "-W" + w; };
    const byWeek = groupCount(success, (e) => wk(e.publishedAt || e.createdAt));
    const byMonth = groupCount(success, (e) => (e.publishedAt || e.createdAt || "—").slice(0, 7));
    const rate = total + failed.length > 0 ? Math.round((total / (total + failed.length)) * 100) : 0;
    save(PUBHIST_LS, { total, rate, byChannel, byAgent, byWeek, byMonth, snapshotAt: now() });
    const block = (title: string, rows: [string, number][]) => <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">{title}</div>{rows.length === 0 ? <div className="text-[11px] text-tg-muted">—</div> : rows.map(([k, v]) => <div key={k} className="flex justify-between text-[11px]"><span className="truncate text-tg-muted">{k}</span><b>{v}</b></div>)}</div>;
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center"><div className="text-xl font-black text-sky-300">{total}</div><div className="text-[9px] text-tg-muted">Всего публикаций</div></div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center"><div className="text-xl font-black text-rose-300">{failed.length}</div><div className="text-[9px] text-tg-muted">Ошибок</div></div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center"><div className="text-xl font-black text-emerald-300">{rate}%</div><div className="text-[9px] text-tg-muted">Success Rate</div></div>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">{block("По каналам", byChannel as [string, number][])}{block("По агентам", byAgent as [string, number][])}{block("По неделям", byWeek as [string, number][])}{block("По месяцам", byMonth as [string, number][])}</div>
    </div></main>;
  }

  function Analytics() {
    const agentPerf = AGENTS.map((a) => ({ a, ...scores(a) }));
    const chanPerf = groupCount(success, (e) => e.channelTitle || e.channelId || "—");
    const campPerf = camps.map((c) => ({ c, done: pubForCampaign(c) }));
    const cats = groupCount(drafts, (d) => (brains[d.authorAgent || ""]?.contentCategories || [])[0] || "—");
    // heatmap weekday x hour-bucket (4 buckets)
    const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]; const buckets = ["00-06", "06-12", "12-18", "18-24"];
    const grid: number[][] = days.map(() => [0, 0, 0, 0]); let max = 0;
    success.forEach((e) => { const t = e.publishedAt || e.createdAt; if (!t) return; const d = new Date(t); const wd = (d.getDay() + 6) % 7; const b = Math.min(3, Math.floor(d.getHours() / 6)); grid[wd][b]++; if (grid[wd][b] > max) max = grid[wd][b]; });
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-3xl space-y-2">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Agent Performance</div>{agentPerf.map((p) => <div key={p.a} className="flex items-center justify-between text-[11px]"><span className="text-tg-muted">{p.a}</span><span className="flex gap-2"><Tag color="#818cf8">mem {p.memoryScore}%</Tag><Tag color="#4ade80">brain {p.brainScore}%</Tag><Tag color="#38bdf8">{p.pub} posts</Tag></span></div>)}</div>
      <div className="grid gap-2 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Channel Performance</div>{chanPerf.length === 0 ? <div className="text-[11px] text-tg-muted">—</div> : chanPerf.map(([k, v]) => <div key={k} className="flex justify-between text-[11px]"><span className="truncate text-tg-muted">{k}</span><b>{v}</b></div>)}</div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Campaign Performance</div>{campPerf.length === 0 ? <div className="text-[11px] text-tg-muted">—</div> : campPerf.map(({ c, done }) => <div key={c.id} className="flex justify-between text-[11px]"><span className="truncate text-tg-muted">{c.name}</span><b>{done}/{c.goalPosts}</b></div>)}</div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Content Categories</div>{cats.map(([k, v]) => <div key={k} className="flex justify-between text-[11px]"><span className="truncate text-tg-muted">{k}</span><b>{v}</b></div>)}</div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">Publishing Heatmap (день × время)</div>
        <div className="space-y-0.5">{days.map((dn, wi) => <div key={dn} className="flex items-center gap-1"><span className="w-6 text-[9px] text-tg-muted">{dn}</span>{grid[wi].map((v, bi) => <div key={bi} className="h-4 flex-1 rounded" title={buckets[bi] + ": " + v} style={{ background: v === 0 ? "rgba(255,255,255,.05)" : "rgba(232,121,249," + (0.2 + 0.8 * (max ? v / max : 0)).toFixed(2) + ")" }} />)}</div>)}<div className="flex gap-1 pl-7 text-[8px] text-tg-muted">{buckets.map((b) => <span key={b} className="flex-1 text-center">{b}</span>)}</div></div>
      </div>
    </div></main>;
  }

  function Autonomy() {
    const s = scores(agent);
    const memoryReady = s.memoryScore >= 70;
    const brainReady = s.brainScore >= 70;
    const channelsAssigned = s.channels.length > 0;
    const campaignReady = camps.some((c) => c.agent === agent);
    const approvalReady = true; // gate exists by design
    const publishingReady = success.some((e) => agentOfLog(e) === agent);
    const checks: [string, boolean][] = [["Memory Ready", memoryReady], ["Brain Ready", brainReady], ["Channels Assigned", channelsAssigned], ["Campaign Ready", campaignReady], ["Approval Ready", approvalReady], ["Publishing Ready", publishingReady]];
    const overall = Math.round((checks.filter((c) => c[1]).length / checks.length) * 100);
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mx-auto max-w-2xl space-y-3">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-center">
        <div className="text-lg font-black text-amber-200">🤖 Autonomy Readiness · {agent}</div>
        <div className="mt-1 text-3xl font-black" style={{ color: overall >= 80 ? "#4ade80" : overall >= 50 ? "#fbbf24" : "#f87171" }}>{overall}%</div>
        <div className="text-[12px] text-amber-300/90">Это оценка готовности, НЕ включение автономии. Автопубликации нет.</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{checks.map(([k, v]) => <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2 text-[12px]"><span>{k}</span><Tag color={v ? "#4ade80" : "#f87171"}>{v ? "READY" : "PENDING"}</Tag></div>)}</div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-tg-muted">
        <b className="text-fuchsia-200">Safety lock:</b> automation=false · auto_publish=false · approval_required=true · background_execution=false · cron_jobs=false · network_calls=false · agent_autonomy=false · human_operator_required=true
      </div>
    </div></main>;
  }

  return (
    <div className="fixed inset-0 z-[91] flex flex-col text-tg-text" style={{ background: "linear-gradient(160deg,#0a0712,#0d0a18 55%,#080810)" }}>
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2"><span className="text-sm font-black text-fuchsia-200">🧠 EPIC GRAM · Agent Brain</span>
          <select value={agent} onChange={(e) => setAgent(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text">{AGENTS.map((a) => <option key={a} value={a} className="bg-black">{a}</option>)}</select>
        </div>
        <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-[12px] hover:bg-white/20">✕ Закрыть</button>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-44 shrink-0 space-y-0.5 overflow-auto border-r border-white/10 p-2">
          {SECTIONS.map(([k, label]) => <button key={k} onClick={() => setSec(k)} className={"block w-full rounded-lg px-2 py-1.5 text-left text-[12px] " + (sec === k ? "bg-fuchsia-600/30 font-semibold text-fuchsia-100" : "text-tg-muted hover:bg-white/10")}>{label}</button>)}
          <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[9px] text-amber-200">approval-gate ON · no automation · human operator</div>
        </nav>
        {sec === "registry" && <Registry />}
        {sec === "memory" && <Memory />}
        {sec === "brain" && <ContentBrain />}
        {sec === "ideas" && <Ideas />}
        {sec === "campaigns" && <Campaigns />}
        {sec === "assign" && <Assign />}
        {sec === "history" && <History />}
        {sec === "analytics" && <Analytics />}
        {sec === "autonomy" && <Autonomy />}
      </div>
    </div>
  );
}
