"use client";
import { useEffect, useState, useCallback } from "react";
import { socialAccountsForCharacter } from "@/lib/avatarStudio";

// P27.1 AI Avatar Studio — base UI (mock-safe). Requires a referral session.
type Avatar = { id: string; name: string; status: string; sourceImageUrl: string; consentConfirmed: boolean };
type Pack = { id: string; name: string; description: string; scenes: string[]; engine: string };
type Job = { id: string; avatarId: string; packId: string; engine: string; status: string; sceneKey: string; prompt: string; resultUrl: string; batchId?: string; attempts?: number; maxAttempts?: number; providerId?: string; selectedBy?: string };
type Prov = { id: string; name: string; mode: string; capabilities: string[]; enabled: boolean; status?: string };
type Asset = { id: string; jobId: string; avatarId: string; imageUrl: string; status: string; qualityStatus: string; qualityScore: number | null; identityScore: number | null; sceneKey: string; candidateIndex: number; qualityNotes: string; createdAt?: string };
type IdSource = { id: string; avatarId: string; type: string; label: string; fileUrl: string; status: string; consentStatus: string };
type Template = { id: string; category: string; value: string; label: string; fragment: string };
type Project = { id: string; name: string; type: string; status: string; description?: string };
type Character = { id: string; projectId: string; avatarId: string; name: string; role: string; archetype: string; status: string };
type Relationship = { id: string; projectId: string; sourceCharacterId: string; targetCharacterId: string; relationType: string; description: string; strength: number };
type Season = { id: string; projectId: string; name: string; orderIndex: number };
type Episode = { id: string; projectId: string; seasonId: string; name: string; synopsis: string; orderIndex: number };
type Scene = { id: string; projectId: string; episodeId: string; name: string; characterIds: string[]; summary: string; goal: string; output: string; status: string; orderIndex: number };

const CHAR_ROLES = ["main", "side", "enemy", "friend", "narrator", "npc", "manager", "sponsor", "client", "fan"];
const REL_TYPES = ["friend", "family", "enemy", "rival", "manager", "sponsor", "client", "creator", "romantic", "unknown"];

const box = "rounded-xl border border-white/10 bg-white/5 p-4";
const btn = "rounded-lg px-3 py-1.5 text-[13px] font-semibold";
const inp = "w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none";

export default function AvatarStudioPage() {
  const [authed, setAuthed] = useState(true);
  const [source, setSource] = useState<string>("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [providers, setProviders] = useState<Prov[]>([]);
  const [providerId, setProviderId] = useState<string>("");
  const [candCount, setCandCount] = useState<number>(1);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [grokStatus, setGrokStatus] = useState<string>("");
  const [sel, setSel] = useState<string>("");
  const [packId, setPackId] = useState<string>("profile");
  const [name, setName] = useState(""); const [url, setUrl] = useState(""); const [consent, setConsent] = useState(false);
  const [idNotes, setIdNotes] = useState(""); const [styleNotes, setStyleNotes] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [idSources, setIdSources] = useState<IdSource[]>([]);
  const [idType, setIdType] = useState<string>("photo");
  const [idLabel, setIdLabel] = useState(""); const [idUrl, setIdUrl] = useState(""); const [idConsent, setIdConsent] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [activeProject, setActiveProject] = useState<string>("");
  const [projName, setProjName] = useState(""); const [projType, setProjType] = useState("universe");
  const [charName, setCharName] = useState(""); const [charRole, setCharRole] = useState("main"); const [charArch, setCharArch] = useState("");
  const [relSrc, setRelSrc] = useState(""); const [relTgt, setRelTgt] = useState(""); const [relType, setRelType] = useState("friend");
  const [selChar, setSelChar] = useState("");
  const [prof, setProf] = useState<Record<string, string>>({ goals: "", profession: "", interests: "", speechStyle: "", memory: "", skills: "", constraints: "", toneOfVoice: "" });
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSeason, setActiveSeason] = useState(""); const [activeEpisode, setActiveEpisode] = useState(""); const [selScene, setSelScene] = useState("");
  const [seasName, setSeasName] = useState(""); const [epName, setEpName] = useState(""); const [scName, setScName] = useState("");
  const [scEdit, setScEdit] = useState<{ cast: string[]; goal: string; summary: string; output: string; status: string }>({ cast: [], goal: "", summary: "", output: "", status: "draft" });
  const [runInfo, setRunInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/avatar-studio/avatars");
    if (r.status === 401) { setAuthed(false); return; }
    const d = await r.json(); setAvatars(d.avatars || []); setSource(d.source || "");
    const p = await fetch("/api/avatar-studio/packs").then(x => x.json()).catch(() => ({ packs: [] })); setPacks(p.packs || []);
    const pr = await fetch("/api/avatar-studio/providers").then(x => x.json()).catch(() => ({ providers: [] })); setProviders(pr.providers || []);
    const j = await fetch("/api/avatar-studio/render-jobs").then(x => x.json()).catch(() => ({ jobs: [] })); setJobs(j.jobs || []);
    const as = await fetch("/api/avatar-studio/assets").then(x => x.json()).catch(() => ({ assets: [] })); setAssets(as.assets || []);
    const tp = await fetch("/api/avatar-studio/templates").then(x => x.json()).catch(() => ({ templates: [] })); setTemplates(tp.templates || []);
    const pj = await fetch("/api/avatar-studio/projects").then(x => x.json()).catch(() => ({ projects: [] })); setProjects(pj.projects || []);
    const ch = await fetch("/api/avatar-studio/characters").then(x => x.json()).catch(() => ({ characters: [] })); setCharacters(ch.characters || []);
    const rl = await fetch("/api/avatar-studio/relationships").then(x => x.json()).catch(() => ({ relationships: [] })); setRelationships(rl.relationships || []);
    const ss = await fetch("/api/avatar-studio/seasons").then(x => x.json()).catch(() => ({ seasons: [] })); setSeasons(ss.seasons || []);
    const ee = await fetch("/api/avatar-studio/episodes").then(x => x.json()).catch(() => ({ episodes: [] })); setEpisodes(ee.episodes || []);
    const scn = await fetch("/api/avatar-studio/scenes").then(x => x.json()).catch(() => ({ scenes: [] })); setScenes(scn.scenes || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadIdentity = useCallback(async (aid: string) => {
    if (!aid) { setIdSources([]); return; }
    const r = await fetch(`/api/avatar-studio/avatars/${aid}/identity-sources`).then(x => x.json()).catch(() => ({ sources: [] }));
    setIdSources(r.sources || []);
  }, []);
  useEffect(() => { loadIdentity(sel); }, [sel, loadIdentity]);

  async function createAvatar() {
    if (!name.trim()) return; setBusy(true);
    await fetch("/api/avatar-studio/avatars", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sourceImageUrl: url, consentConfirmed: consent }) });
    setName(""); setUrl(""); setConsent(false); setBusy(false); load();
  }
  async function savePassport() {
    if (!sel) return; setBusy(true);
    await fetch(`/api/avatar-studio/avatars/${sel}/passport`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityNotes: idNotes, styleNotes }) });
    setBusy(false);
  }
  async function createJobs() {
    if (!sel) return; setBusy(true);
    await fetch("/api/avatar-studio/render-jobs", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarId: sel, packId, providerId: providerId || undefined, candidateCount: candCount }) });
    setBusy(false); load();
  }
  async function act(id: string, kind: "approve" | "reject" | "regenerate" | "cancel") {
    const r = await fetch(`/api/avatar-studio/render-jobs/${id}/${kind}`, { method: "POST" });
    if (kind === "approve" && r.status === 409) {
      const reason = window.prompt("Контроль качества: ассет не прошёл. Причина ручного одобрения (или Отмена):");
      if (reason) await fetch(`/api/avatar-studio/render-jobs/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ override: true, reason }) });
    }
    load();
  }
  async function qAct(assetId: string, status: "passed" | "failed" | "needs_review") {
    await fetch(`/api/avatar-studio/assets/${assetId}/quality`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); load();
  }
  async function qNotes(assetId: string) {
    const notes = window.prompt("Заметки по качеству:"); if (notes == null) return;
    await fetch(`/api/avatar-studio/assets/${assetId}/quality`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "needs_review", notes }) }); load();
  }
  async function regenGroup(jobId: string) {
    setBusy(true);
    const r = await fetch("/api/avatar-studio/candidates/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, candidateCount: candCount }) }).then(x => x.json()).catch(() => ({}));
    setBusy(false);
    if (r && r.reason) window.alert("Перегенерация недоступна: " + r.reason); else load();
  }
  async function addSource() {
    if (!sel || !idLabel.trim()) return; setBusy(true);
    await fetch(`/api/avatar-studio/avatars/${sel}/identity-sources`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: idType, label: idLabel, fileUrl: idUrl, consentConfirmed: idConsent }) });
    setIdLabel(""); setIdUrl(""); setIdConsent(false); setBusy(false); loadIdentity(sel);
  }
  async function renderTemplate(templateId: string) {
    if (!sel) return; setBusy(true);
    const r = await fetch("/api/avatar-studio/templates/render", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarId: sel, templateId, candidateCount: 3, providerId: providerId || undefined }) }).then(x => x.json()).catch(() => ({}));
    setBusy(false);
    if (r && r.reason) window.alert("Рендер шаблона недоступен: " + r.reason); else load();
  }
  async function createProject() {
    if (!projName.trim()) return; setBusy(true);
    await fetch("/api/avatar-studio/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: projName, type: projType }) });
    setProjName(""); setBusy(false); load();
  }
  async function createCharacter() {
    if (!charName.trim()) return; setBusy(true);
    await fetch("/api/avatar-studio/characters", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: charName, role: charRole, archetype: charArch, projectId: activeProject || undefined, avatarId: sel || undefined }) });
    setCharName(""); setCharArch(""); setBusy(false); load();
  }
  async function patchCharacter(id: string, patch: Record<string, string>) {
    await fetch(`/api/avatar-studio/characters/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); load();
  }
  async function delCharacter(id: string) {
    if (!window.confirm("Удалить персонажа? (аватар остаётся)")) return;
    await fetch(`/api/avatar-studio/characters/${id}`, { method: "DELETE" }); load();
  }
  async function addRelationship() {
    if (!relSrc || !relTgt) return; setBusy(true);
    const r = await fetch("/api/avatar-studio/relationships", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceCharacterId: relSrc, targetCharacterId: relTgt, relationType: relType }) }).then(x => x.json()).catch(() => ({}));
    setBusy(false);
    if (r && r.reason) window.alert("Связь недоступна: " + r.reason); else load();
  }
  async function delRelationship(id: string) {
    await fetch(`/api/avatar-studio/relationships?id=${encodeURIComponent(id)}`, { method: "DELETE" }); load();
  }
  async function selectChar(id: string) {
    setSelChar(id);
    const r = await fetch(`/api/avatar-studio/characters/${id}/profile`).then(x => x.json()).catch(() => ({}));
    const p = r.profile || {};
    setProf({ goals: p.goals || "", profession: p.profession || "", interests: p.interests || "", speechStyle: p.speechStyle || "", memory: p.memory || "", skills: p.skills || "", constraints: p.constraints || "", toneOfVoice: p.toneOfVoice || "" });
  }
  async function saveProfile() {
    if (!selChar) return; setBusy(true);
    await fetch(`/api/avatar-studio/characters/${selChar}/profile`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prof) });
    setBusy(false);
  }
  async function createSeason() {
    if (!seasName.trim()) return; setBusy(true);
    await fetch("/api/avatar-studio/seasons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: seasName, projectId: activeProject || undefined }) });
    setSeasName(""); setBusy(false); load();
  }
  async function createEpisode() {
    if (!epName.trim() || !activeSeason) return; setBusy(true);
    await fetch("/api/avatar-studio/episodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: epName, seasonId: activeSeason, projectId: activeProject || undefined }) });
    setEpName(""); setBusy(false); load();
  }
  async function createScene() {
    if (!scName.trim() || !activeEpisode) return; setBusy(true);
    await fetch("/api/avatar-studio/scenes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: scName, episodeId: activeEpisode, projectId: activeProject || undefined }) });
    setScName(""); setBusy(false); load();
  }
  function selectScene(s: Scene) {
    setSelScene(s.id);
    setScEdit({ cast: s.characterIds || [], goal: s.goal || "", summary: s.summary || "", output: s.output || "", status: s.status || "draft" });
  }
  function toggleSceneChar(id: string) {
    setScEdit(e => ({ ...e, cast: e.cast.includes(id) ? e.cast.filter(x => x !== id) : [...e.cast, id] }));
  }
  async function saveScene() {
    if (!selScene) return; setBusy(true);
    await fetch(`/api/avatar-studio/scenes/${selScene}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterIds: scEdit.cast, goal: scEdit.goal, summary: scEdit.summary, output: scEdit.output, status: scEdit.status }) });
    setBusy(false); load();
  }
  async function delScene(id: string) {
    if (!window.confirm("Удалить сцену?")) return;
    await fetch(`/api/avatar-studio/scenes/${id}`, { method: "DELETE" }); if (selScene === id) setSelScene(""); load();
  }
  async function runScene(runProvider: string) {
    if (!selScene) return; setBusy(true); setRunInfo("");
    const r = await fetch(`/api/avatar-studio/scenes/${selScene}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId: runProvider }) }).then(x => x.json()).catch(() => ({}));
    setBusy(false);
    if (r && r.reason) { setRunInfo("Прогон недоступен: " + r.reason); }
    else if (r && r.mode === "real_browser_queued") { setRunInfo(`🦊 ${r.imageJobs} реальных Grok-job(ов) в очереди. Жми «Запустить один реальный Grok-job» ниже (EPIC_GROK_BROWSER=1 + ручной логин). Авто-рендера нет.`); }
    else if (r && r.ok) { setRunInfo(`▶ ${r.imageJobs} задач(и) на картинку → Группы кандидатов (pending_review). Видео/Озвучка/Подпись/Публикация — заглушка.`); }
    load();
  }
  async function runQueue() { setBusy(true); await fetch("/api/avatar-studio/render-jobs/run-once", { method: "POST" }); setBusy(false); load(); }
  async function checkGrok() { setGrokStatus("…"); const r = await fetch("/api/avatar-studio/grok/check", { method: "POST" }).then(x => x.json()).catch(() => ({ status: "error" })); setGrokStatus((r.status || "?") + (r.detail ? " · " + r.detail : "")); }
  async function runGrok() { setBusy(true); const r = await fetch("/api/avatar-studio/render-jobs/run-grok-once", { method: "POST" }).then(x => x.json()).catch(() => ({})); setBusy(false); if (r.error) setGrokStatus(r.status + " · " + r.error); load(); }

  if (!authed) return (
    <div className="min-h-screen bg-[#05070f] text-slate-100 grid place-items-center p-6">
      <div className={box + " max-w-md text-center"}>
        <div className="text-lg font-bold mb-2">AI Avatar Studio</div>
        <div className="text-sm text-slate-400 mb-4">Нужен вход по referral-коду.</div>
        <a href="/gate" className={btn + " bg-sky-500 text-black inline-block"}>→ Вход по коду</a>
      </div>
    </div>
  );

  const jobsById: Record<string, Job> = {}; jobs.forEach(j => { jobsById[j.id] = j; });
  const groupsMap: Record<string, Asset[]> = {};
  assets.forEach(a => { const k = a.avatarId + "::" + a.sceneKey; (groupsMap[k] = groupsMap[k] || []).push(a); });
  const groupList = Object.keys(groupsMap).map(k => ({ key: k, scene: groupsMap[k][0]?.sceneKey || "—", list: groupsMap[k].slice().sort((x, y) => x.candidateIndex - y.candidateIndex) }));
  const tByCat: Record<string, Template[]> = {}; templates.forEach(t => { (tByCat[t.category] = tByCat[t.category] || []).push(t); });
  const idLock = idSources.some(s => s.status === "approved") ? "закреплено · референс одобрен" : idSources.length ? "референс на проверке" : "референса пока нет";
  const idReady = idSources.length > 0;
  const mockProv = providers.find(p => p.id === "mock_grok_imagine");
  const grokProv = providers.find(p => p.id === "grok_imagine_browser");
  const charById: Record<string, Character> = {}; characters.forEach(c => { charById[c.id] = c; });
  const avById: Record<string, Avatar> = {}; avatars.forEach(a => { avById[a.id] = a; });
  const castChars = activeProject ? characters.filter(c => c.projectId === activeProject) : characters;
  const roleColor = (r: string) => r === "main" ? "bg-fuchsia-500/20 text-fuchsia-300" : r === "enemy" || r === "rival" ? "bg-rose-500/20 text-rose-300" : r === "narrator" ? "bg-amber-500/20 text-amber-300" : "bg-sky-500/20 text-sky-300";
  const seasonsForProject = activeProject ? seasons.filter(s => s.projectId === activeProject) : seasons;
  const episodesForSeason = activeSeason ? episodes.filter(e => e.seasonId === activeSeason) : [];
  const scenesForEpisode = activeEpisode ? scenes.filter(s => s.episodeId === activeEpisode) : [];
  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100 p-5">
      <div className="mb-3 flex items-center gap-3">
        <a href="/media-studio" className="text-sm text-sky-300">← Медиа-студия</a>
        <span className="text-[11px] text-slate-500">источник: {source || "—"} · P27.1 mock-safe</span>
      </div>
      <h1 className="text-2xl font-black mb-1">🧬 AI Avatar Studio</h1>
      <div className="text-sm text-slate-400 mb-4">Один референс → Аватар → Паспорт → Промпт-паки → Задачи рендера → Библиотека ассетов. Рендер — заглушка (без Grok/Playwright).</div>

      <div className={box + " mb-4"}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="font-bold">🎬 Каст · Вселенная истории</div>
          <span className="text-[11px] text-slate-500">P29.1 · Проект → Каст → Персонаж(обёртка над аватаром) → Граф связей</span>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-[12px] text-slate-400 mb-1">Проект (Вселенная)</div>
            <div className="flex gap-1.5 mb-2">
              <input className="flex-1 rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" placeholder="имя проекта" value={projName} onChange={e => setProjName(e.target.value)} />
              <select className="rounded-lg bg-black/40 border border-white/10 px-1 py-1 text-[11px] text-white" value={projType} onChange={e => setProjType(e.target.value)}>
                {["universe", "campaign", "brand", "media"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className={btn + " bg-cyan-600 text-white"} disabled={busy || !projName.trim()} onClick={createProject}>＋</button>
            </div>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setActiveProject("")} className={"rounded px-2 py-0.5 text-[11px] border " + (!activeProject ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5")}>Все ({characters.length})</button>
              {projects.map(p => (
                <button key={p.id} onClick={() => setActiveProject(p.id)} className={"rounded px-2 py-0.5 text-[11px] border " + (activeProject === p.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5")}>{p.name} <span className="text-slate-500">{p.type}</span></button>
              ))}
              {!projects.length && <span className="text-[11px] text-slate-500">Проектов нет.</span>}
            </div>
          </div>
          <div>
            <div className="text-[12px] text-slate-400 mb-1">Новый персонаж {sel ? "· аватар привязан ✓" : "(без аватара)"}</div>
            <input className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white mb-1.5" placeholder="имя персонажа" value={charName} onChange={e => setCharName(e.target.value)} />
            <div className="flex gap-1.5 mb-1.5">
              <select className="rounded-lg bg-black/40 border border-white/10 px-1 py-1 text-[11px] text-white" value={charRole} onChange={e => setCharRole(e.target.value)}>
                {CHAR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="flex-1 rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[11px] text-white" placeholder="архетип" value={charArch} onChange={e => setCharArch(e.target.value)} />
            </div>
            <button className={btn + " bg-fuchsia-600 text-white"} disabled={busy || !charName.trim()} onClick={createCharacter}>＋ Создать персонажа</button>
            <div className="text-[10px] text-slate-500 mt-1">В проект: {projects.find(p => p.id === activeProject)?.name || "— (выбери проект-чип)"} · аватар: {avById[sel]?.name || "—"}</div>
          </div>
          <div>
            <div className="text-[12px] text-slate-400 mb-1">Граф связей</div>
            <div className="flex gap-1 mb-1.5 flex-wrap">
              <select className="rounded bg-black/40 border border-white/10 px-1 py-1 text-[11px] text-white max-w-[92px]" value={relSrc} onChange={e => setRelSrc(e.target.value)}>
                <option value="">источник…</option>{characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="rounded bg-black/40 border border-white/10 px-1 py-1 text-[11px] text-white" value={relType} onChange={e => setRelType(e.target.value)}>
                {REL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="rounded bg-black/40 border border-white/10 px-1 py-1 text-[11px] text-white max-w-[92px]" value={relTgt} onChange={e => setRelTgt(e.target.value)}>
                <option value="">цель…</option>{characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className={btn + " bg-emerald-600 text-white"} disabled={busy || !relSrc || !relTgt} onClick={addRelationship}>＋</button>
            </div>
            <div className="space-y-1 max-h-24 overflow-auto">
              {relationships.map(r => (
                <div key={r.id} className="rounded bg-white/5 px-2 py-1 text-[11px] flex items-center gap-1">
                  <span className="text-sky-300">{charById[r.sourceCharacterId]?.name || "?"}</span>
                  <span className="text-slate-500">—{r.relationType}→</span>
                  <span className="text-fuchsia-300">{charById[r.targetCharacterId]?.name || "?"}</span>
                  <button className="ml-auto text-rose-400" onClick={() => delRelationship(r.id)}>✕</button>
                </div>
              ))}
              {!relationships.length && <div className="text-[11px] text-slate-500">Связей нет.</div>}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-[12px] text-slate-400 mb-1">Каст{activeProject ? " (проект)" : ""} — {castChars.length}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {castChars.map(c => (
              <div key={c.id} className={"rounded-lg border p-2 text-[11px] " + (selChar === c.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5")}>
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-semibold truncate flex-1 cursor-pointer" onClick={() => selectChar(c.id)} title="открыть паспорт">{c.name}</span>
                  <button className="text-rose-400" onClick={() => delCharacter(c.id)}>✕</button>
                </div>
                <select className={"rounded px-1 py-0.5 text-[10px] " + roleColor(c.role)} value={c.role} onChange={e => patchCharacter(c.id, { role: e.target.value })}>
                  {CHAR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="text-slate-500 truncate mt-1">{c.archetype || "—"}</div>
                <div className="text-slate-600 truncate">аватар: {avById[c.avatarId]?.name || "—"} · {c.status}</div>
              </div>
            ))}
            {!castChars.length && <div className="text-[11px] text-slate-500">Персонажей нет — создай персонажа (можно связать с текущим выбранным аватаром).</div>}
          </div>
        </div>
        {selChar && (
          <div className="mt-3 rounded-lg border border-cyan-400/30 bg-black/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-bold text-[13px]">🪪 Профиль персонажа · {charById[selChar]?.name || ""}</div>
              <span className="text-[11px] text-slate-500">паспорт персонажа — чтобы AI понимал героя</span>
              <button className="ml-auto text-[11px] text-slate-400" onClick={() => setSelChar("")}>закрыть</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {([["goals", "Цели"], ["profession", "Профессия"], ["interests", "Интересы"], ["toneOfVoice", "Тон голоса"], ["speechStyle", "Стиль речи"], ["skills", "Навыки"], ["constraints", "Ограничения"], ["memory", "Память / бэкграунд"]] as [string, string][]).map(([k, label]) => (
                <div key={k}>
                  <div className="text-[11px] text-slate-400 mb-0.5">{label}</div>
                  <textarea className={inp} rows={2} value={prof[k]} onChange={e => setProf({ ...prof, [k]: e.target.value })} />
                </div>
              ))}
            </div>
            <button className={btn + " bg-sky-500 text-black mt-2"} disabled={busy} onClick={saveProfile}>Сохранить паспорт</button>
            {(() => {
              const socials = socialAccountsForCharacter(charById[selChar]?.name || "");
              if (!socials.length) return null;
              const sc = (s: string) => s === "verified" ? "bg-emerald-500/20 text-emerald-300" : s === "reserved_candidate" ? "bg-slate-500/20 text-slate-300" : s === "not_found" || s === "blocked_by_platform" ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/20 text-amber-300";
              return (
                <div className="mt-3 border-t border-white/10 pt-2">
                  <div className="text-[12px] text-slate-400 mb-1">🔗 Соцсети (канон · {socials.length}) — <span className="text-slate-500">статусы честные, verified только после ручной проверки</span></div>
                  <div className="space-y-1">
                    {socials.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] rounded bg-white/5 px-2 py-1">
                        <span className="w-20 shrink-0 text-slate-300">{s.label}</span>
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-300 truncate flex-1 hover:underline" title={s.url}>@{s.handle}</a>
                        <span className={"px-2 py-0.5 rounded " + sc(s.status)}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-amber-300/80 mt-1">⚠ Перед пометкой «официальный» нужна ручная проверка (см. docs/NOVIKOVA_SOCIAL_VERIFICATION_CHECKLIST.md).</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Канон: no_vikovaforever (YouTube: NOVIKOVAFOREVER). Только отображение — авто-подключения соцсетей нет.</div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className={box + " mb-4"}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="font-bold">🎞 Планировщик истории</div>
          <span className="text-[11px] text-slate-500">P29.3 · Проект → Сезон → Эпизод → Сцена · Сцена = каст·описание·цель·output·статус</span>
          {!activeProject && <span className="text-[11px] text-amber-300">выбери проект в Касте выше</span>}
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-[12px] text-slate-400 mb-1">Сезоны</div>
            <div className="flex gap-1.5 mb-1.5">
              <input className="flex-1 rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" placeholder="сезон" value={seasName} onChange={e => setSeasName(e.target.value)} />
              <button className={btn + " bg-cyan-600 text-white"} disabled={busy || !seasName.trim()} onClick={createSeason}>＋</button>
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {seasonsForProject.map(s => (
                <button key={s.id} onClick={() => { setActiveSeason(s.id); setActiveEpisode(""); setSelScene(""); }} className={"w-full text-left rounded px-2 py-1 text-[12px] border " + (activeSeason === s.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5")}>{s.name}</button>
              ))}
              {!seasonsForProject.length && <div className="text-[11px] text-slate-500">Сезонов нет.</div>}
            </div>
          </div>
          <div>
            <div className="text-[12px] text-slate-400 mb-1">Эпизоды {activeSeason ? "" : "(выбери сезон)"}</div>
            <div className="flex gap-1.5 mb-1.5">
              <input className="flex-1 rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" placeholder="эпизод" value={epName} onChange={e => setEpName(e.target.value)} disabled={!activeSeason} />
              <button className={btn + " bg-cyan-600 text-white"} disabled={busy || !activeSeason || !epName.trim()} onClick={createEpisode}>＋</button>
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {episodesForSeason.map(e => (
                <button key={e.id} onClick={() => { setActiveEpisode(e.id); setSelScene(""); }} className={"w-full text-left rounded px-2 py-1 text-[12px] border " + (activeEpisode === e.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5")}>{e.name}</button>
              ))}
              {activeSeason && !episodesForSeason.length && <div className="text-[11px] text-slate-500">Эпизодов нет.</div>}
            </div>
          </div>
          <div>
            <div className="text-[12px] text-slate-400 mb-1">Сцены {activeEpisode ? "" : "(выбери эпизод)"}</div>
            <div className="flex gap-1.5 mb-1.5">
              <input className="flex-1 rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" placeholder="сцена" value={scName} onChange={e => setScName(e.target.value)} disabled={!activeEpisode} />
              <button className={btn + " bg-cyan-600 text-white"} disabled={busy || !activeEpisode || !scName.trim()} onClick={createScene}>＋</button>
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {scenesForEpisode.map(s => (
                <div key={s.id} className={"flex items-center gap-1 rounded px-2 py-1 text-[12px] border " + (selScene === s.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5")}>
                  <span className="flex-1 truncate cursor-pointer" onClick={() => selectScene(s)}>{s.name}</span>
                  <span className="text-[10px] text-slate-500">{s.status}</span>
                  <button className="text-rose-400" onClick={() => delScene(s.id)}>✕</button>
                </div>
              ))}
              {activeEpisode && !scenesForEpisode.length && <div className="text-[11px] text-slate-500">Сцен нет.</div>}
            </div>
          </div>
        </div>
        {selScene && (
          <div className="mt-3 rounded-lg border border-cyan-400/30 bg-black/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-bold text-[13px]">🎬 Сцена · {scenesForEpisode.find(s => s.id === selScene)?.name || ""}</div>
              <span className="text-[11px] text-slate-500">кто · что · цель · output · статус (исполнит P29.4)</span>
              <button className="ml-auto text-[11px] text-slate-400" onClick={() => setSelScene("")}>закрыть</button>
            </div>
            <div className="text-[11px] text-slate-400 mb-1">Каст (кто в сцене)</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {characters.map(c => (
                <button key={c.id} onClick={() => toggleSceneChar(c.id)} className={"rounded px-2 py-0.5 text-[11px] border " + (scEdit.cast.includes(c.id) ? "border-fuchsia-400 bg-fuchsia-400/10 text-fuchsia-200" : "border-white/10 bg-white/5 text-slate-300")}>{c.name}</button>
              ))}
              {!characters.length && <span className="text-[11px] text-slate-500">Нет персонажей — создай в Касте.</span>}
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <div><div className="text-[11px] text-slate-400 mb-0.5">🎯 Цель</div><textarea className={inp} rows={2} value={scEdit.goal} onChange={e => setScEdit({ ...scEdit, goal: e.target.value })} /></div>
              <div><div className="text-[11px] text-slate-400 mb-0.5">📝 Описание (что происходит)</div><textarea className={inp} rows={2} value={scEdit.summary} onChange={e => setScEdit({ ...scEdit, summary: e.target.value })} /></div>
              <div><div className="text-[11px] text-slate-400 mb-0.5">📦 Output (что сгенерить)</div><textarea className={inp} rows={2} placeholder="напр. 2 картинки, 1 видео, 1 диалог, 1 пост" value={scEdit.output} onChange={e => setScEdit({ ...scEdit, output: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] text-slate-400">Статус</span>
              <select className="rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" value={scEdit.status} onChange={e => setScEdit({ ...scEdit, status: e.target.value })}>
                {["draft", "ready", "generating", "done"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className={btn + " bg-sky-500 text-black"} disabled={busy} onClick={saveScene}>Сохранить</button>
              <button className={btn + " bg-emerald-500 text-black ml-auto"} disabled={busy || !scEdit.cast.length} title={scEdit.cast.length ? "" : "добавь персонажей в каст"} onClick={() => runScene("mock_grok_imagine")}>▶ Прогнать сцену (мок)</button>
              <button className={btn + " bg-violet-600/60 text-white"} disabled={busy || !scEdit.cast.length} title="ставит реальные Grok-job(ы) в очередь; исполняется по одному через «Запустить один реальный Grok-job»" onClick={() => runScene("grok_imagine_browser")}>🦊 Прогнать сцену (реальный Grok)</button>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Пайплайн: Сцена → Контекст персонажа → Промпт → Картинка (Контроль качества) → Видео/Озвучка/Подпись/Публикация (заглушка). Мок — сразу в Группы кандидатов. Реальный Grok — в очередь, затем «Запустить один реальный Grok-job» (на стороне оператора).</div>
            {runInfo && <div className="text-[11px] text-emerald-300 mt-1">{runInfo}</div>}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className={box}>
          <div className="font-bold mb-2">Создать аватар</div>
          <input className={inp} placeholder="Имя аватара" value={name} onChange={e => setName(e.target.value)} />
          <input className={inp + " mt-2"} placeholder="URL референс-изображения" value={url} onChange={e => setUrl(e.target.value)} />
          <label className="flex items-center gap-2 mt-2 text-[13px] text-slate-300"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> согласие подтверждено</label>
          <button className={btn + " bg-fuchsia-600 text-white mt-3"} disabled={busy || !name.trim()} onClick={createAvatar}>Добавить</button>
        </div>

        <div className={box}>
          <div className="font-bold mb-2">Аватары ({avatars.length})</div>
          <div className="space-y-1 max-h-56 overflow-auto">
            {avatars.map(a => (
              <div key={a.id} onClick={() => setSel(a.id)} className={"cursor-pointer rounded-lg px-3 py-2 text-sm " + (sel === a.id ? "bg-sky-500/20 border border-sky-400/40" : "bg-white/5")}>
                <div className="font-semibold">{a.name}</div>
                <div className="text-[11px] text-slate-400">{a.status} · согласие {a.consentConfirmed ? "✓" : "—"}</div>
              </div>
            ))}
            {!avatars.length && <div className="text-[12px] text-slate-500">Пока нет аватаров.</div>}
          </div>
        </div>

        <div className={box}>
          <div className="font-bold mb-2">Паспорт аватара {sel ? "" : "(выбери аватар)"}</div>
          <textarea className={inp} rows={2} placeholder="заметки об идентичности (лицо, возраст, причёска…)" value={idNotes} onChange={e => setIdNotes(e.target.value)} />
          <textarea className={inp + " mt-2"} rows={2} placeholder="заметки о стиле" value={styleNotes} onChange={e => setStyleNotes(e.target.value)} />
          <button className={btn + " bg-sky-500 text-black mt-3"} disabled={!sel || busy} onClick={savePassport}>Сохранить паспорт</button>
        </div>
      </div>

      <div className={box + " mt-4"}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="font-bold">🪪 Загрузка идентичности аватара {sel ? "" : "(выбери аватар)"}</div>
          <span className="text-[11px] text-slate-500">P27.8 · не распознавание лиц — только референс-метаданные + согласие оператора</span>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="flex gap-2 flex-wrap items-center mb-2 text-[12px]">
              <span className="text-slate-400">Фиксация идентичности:</span>
              <span className={"px-2 py-0.5 rounded " + (idSources.some(s => s.status === "approved") ? "bg-emerald-500/20 text-emerald-300" : idReady ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-400")}>{idLock}</span>
              <span className="text-slate-500">· референсов: {idSources.length}</span>
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              <select className="rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" value={idType} onChange={e => setIdType(e.target.value)}>
                <option value="photo">photo</option><option value="prompt">prompt</option><option value="manual">manual</option>
              </select>
              <input className="flex-1 min-w-[120px] rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" placeholder="подпись (напр. фото анфас)" value={idLabel} onChange={e => setIdLabel(e.target.value)} />
            </div>
            <input className={inp} placeholder="URL референса (опц. — mock-safe, без загрузки в облако)" value={idUrl} onChange={e => setIdUrl(e.target.value)} />
            <label className="flex items-center gap-2 mt-2 text-[12px] text-slate-300"><input type="checkbox" checked={idConsent} onChange={e => setIdConsent(e.target.checked)} /> согласие оператора подтверждено</label>
            <button className={btn + " bg-fuchsia-600 text-white mt-2"} disabled={!sel || busy || !idLabel.trim()} onClick={addSource}>＋ Добавить референс</button>
          </div>
          <div>
            <div className="text-[12px] text-slate-400 mb-1">Готовность провайдеров</div>
            <div className="space-y-1 text-[12px]">
              <div>· mock_grok_imagine — <span className={mockProv?.enabled ? "text-emerald-300" : "text-slate-500"}>{mockProv ? (mockProv.status || (mockProv.enabled ? "готов" : "не настроен")) : "—"}</span></div>
              <div>· grok_imagine_browser — <span className="text-violet-300">{grokProv ? (grokProv.status || (grokProv.enabled ? "опционально" : "опционально · не настроен")) : "опционально"}</span></div>
              <div>· провайдер идентичности изображений (InstantID/PuLID) — <span className="text-slate-500">не настроен (P27.9)</span></div>
            </div>
            <div className="mt-2 space-y-1 max-h-28 overflow-auto">
              {idSources.map(s => (
                <div key={s.id} className="rounded bg-white/5 px-2 py-1 text-[11px] flex items-center gap-2">
                  <span className="text-slate-300">{s.type}</span>
                  <span className="text-slate-400 truncate flex-1" title={s.fileUrl}>{s.label}</span>
                  <span className="text-slate-500">{s.status}</span>
                  <span className={s.consentStatus === "operator_confirmed" ? "text-emerald-300" : "text-amber-300"}>{s.consentStatus === "operator_confirmed" ? "согласие✓" : "согласие?"}</span>
                </div>
              ))}
              {sel && !idSources.length && <div className="text-[11px] text-slate-500">Нет референсов — добавь хотя бы один для рендера по шаблону.</div>}
            </div>
          </div>
        </div>
      </div>

      <div className={box + " mt-4"}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="font-bold">🃏 Шаблон-карты · Примерочная</div>
          <span className="text-[11px] text-slate-500">клик = 3 кандидата в очередь (идентичность зафиксирована) → Контроль качества</span>
          {!idReady && sel && <span className="text-[11px] text-amber-300">нужен ≥1 референс идентичности</span>}
        </div>
        <div className="space-y-2">
          {Object.keys(tByCat).map(cat => (
            <div key={cat} className="flex items-start gap-2 flex-wrap">
              <span className="w-24 shrink-0 text-[12px] text-slate-400 pt-1 capitalize">{cat}</span>
              <div className="flex flex-wrap gap-1.5">
                {tByCat[cat].map(t => (
                  <button key={t.id} disabled={!sel || !idReady || busy} title={t.fragment}
                    onClick={() => renderTemplate(t.id)}
                    className={"rounded-lg px-2.5 py-1 text-[12px] border " + (!sel || !idReady ? "border-white/5 bg-white/5 text-slate-600 cursor-not-allowed" : "border-white/10 bg-white/5 hover:border-cyan-400 hover:bg-cyan-400/10")}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!templates.length && <div className="text-[12px] text-slate-500">Шаблоны не загрузились.</div>}
        </div>
      </div>

      <div className={box + " mt-4"}>
        <div className="font-bold mb-2">Пакеты рендера</div>
        <div className="flex flex-wrap gap-2">
          {packs.map(p => (
            <button key={p.id} onClick={() => setPackId(p.id)} className={"rounded-lg px-3 py-1.5 text-[12px] border " + (packId === p.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5")}>
              {p.name} <span className="text-slate-500">· {p.scenes.length}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-slate-400">Провайдер (Роутер рендера):</span>
          <select className="rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" value={providerId} onChange={e => setProviderId(e.target.value)}>
            <option value="">Авто (Роутер)</option>
            {providers.map(p => <option key={p.id} value={p.id} disabled={!p.enabled}>{p.name} · {p.mode} · {p.status || (p.enabled ? "готов" : "не настроен")}</option>)}
          </select>
          {providerId && <span className="text-[11px] text-violet-300">{(providers.find(p => p.id === providerId)?.status) || ""}</span>}
          <span className="text-[12px] text-slate-400 ml-2">Кандидатов/сцена:</span>
          <select className="rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" value={candCount} onChange={e => setCandCount(Number(e.target.value))}>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button className={btn + " bg-emerald-500 text-black mt-3"} disabled={!sel || busy} onClick={createJobs}>⚡ Создать задачи рендера</button>
        {!sel && <span className="ml-2 text-[12px] text-slate-500">выбери аватар</span>}
      </div>

      <div className={box + " mt-4"}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <div className="font-bold">Задачи рендера ({jobs.length})</div>
          <button className={btn + " bg-cyan-500 text-black"} disabled={busy} onClick={runQueue}>▶ Прогнать очередь один раз</button>
          <button className={btn + " bg-white/10 text-white"} disabled={busy} onClick={checkGrok}>🔎 Проверить Grok-браузер</button>
          <button className={btn + " bg-violet-600/50 text-white"} disabled={busy} onClick={runGrok}>🦊 Запустить один реальный Grok-job</button>
          {grokStatus && <span className="text-[11px] text-violet-300">{grokStatus}</span>}
          <span className="text-[11px] text-amber-300 w-full">Мок — по кнопке очереди. Реальный Grok — только с EPIC_GROK_BROWSER=1 и ручным логином.</span>
        </div>
        <div className="space-y-1 max-h-72 overflow-auto">
          {jobs.map(j => {
            const canApprove = j.status === "done"; const canReject = j.status === "done";
            const canCancel = j.status === "queued" || j.status === "running" || j.status === "regenerate_requested";
            const canRegen = j.status === "done" || j.status === "rejected" || j.status === "failed";
            const c = j.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : j.status === "rejected" || j.status === "failed" || j.status === "cancelled" ? "bg-rose-500/20 text-rose-300" : j.status === "done" ? "bg-sky-500/20 text-sky-300" : "bg-white/10 text-slate-300";
            return (
              <div key={j.id} className="rounded-lg bg-white/5 px-3 py-2 text-[12px] flex items-center gap-2">
                <span className="w-36 truncate font-mono text-slate-300">{j.sceneKey}</span>
                <span className={"px-2 py-0.5 rounded " + c}>{j.status}</span>
                <span className="text-slate-500">попытка {j.attempts ?? 0}/{j.maxAttempts ?? 3}</span>
                <span className="text-[10px] text-violet-300 truncate w-28" title={(j.providerId || "") + " · " + (j.selectedBy || "")}>{j.providerId}</span>
                <span className="text-slate-600 truncate w-20" title={j.batchId}>{(j.batchId || "").slice(-6)}</span>
                <span className="flex-1 truncate text-slate-500">{j.resultUrl}</span>
                {canApprove && <button className={btn + " bg-emerald-600/40 text-white"} onClick={() => act(j.id, "approve")}>одобрить</button>}
                {canReject && <button className={btn + " bg-rose-600/40 text-white"} onClick={() => act(j.id, "reject")}>отклонить</button>}
                {canRegen && <button className={btn + " bg-white/10 text-white"} onClick={() => act(j.id, "regenerate")}>перегенерировать</button>}
                {canCancel && <button className={btn + " bg-amber-600/40 text-white"} onClick={() => act(j.id, "cancel")}>отменить</button>}
              </div>
            );
          })}
          {!jobs.length && <div className="text-[12px] text-slate-500">Задач нет — создай из пака, затем «Прогнать очередь один раз».</div>}
        </div>
      </div>

      <div className={box + " mt-4"}>
        <div className="font-bold mb-1">Группы кандидатов · Контроль качества ({groupList.length} сцен)</div>
        <div className="text-[11px] text-slate-500 mb-2">1 сцена → кандидаты → сравни → выбери лучший (passed) → одобри. Группировка: аватар + сцена.</div>
        <div className="space-y-3">
          {groupList.map(g => (
            <div key={g.key} className="rounded-lg border border-white/10 bg-black/20 p-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[12px] text-slate-300">{g.scene}</span>
                <span className="text-[11px] text-slate-500">{g.list.length} кандидат(ов)</span>
                <button className={btn + " bg-white/10 text-white ml-auto"} disabled={busy} onClick={() => regenGroup(g.list[0].jobId)}>♻ Перегенерировать кандидатов</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {g.list.map(x => {
                  const jb = jobsById[x.jobId]; const approvable = x.status === "pending_review" && x.qualityStatus === "passed";
                  const qc = x.qualityStatus === "passed" ? "bg-emerald-500/20 text-emerald-300" : x.qualityStatus === "failed" ? "bg-rose-500/20 text-rose-300" : x.qualityStatus === "needs_review" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-400";
                  return (
                    <div key={x.id} className={"rounded-lg border p-2 text-[11px] " + (x.qualityStatus === "passed" ? "border-emerald-400/50 bg-emerald-400/5" : "border-white/10 bg-white/5")}>
                      <div className="aspect-square rounded bg-black/30 grid place-items-center text-center mb-1"><span className="text-[10px] text-slate-500">#{x.candidateIndex}<br />{x.imageUrl ? "мок" : "—"}</span></div>
                      <div className="text-slate-400 truncate" title={x.id}>{x.id.slice(-6)} · {jb?.providerId || "?"}</div>
                      <div className="text-slate-500 truncate">{jb?.packId || ""} · {x.status}</div>
                      <div className="mt-1"><span className={"px-2 py-0.5 rounded " + qc}>{x.qualityStatus}{x.qualityScore != null ? " " + x.qualityScore : ""}</span></div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <button className="rounded bg-cyan-600/50 px-2 py-0.5" onClick={() => qAct(x.id, "passed")}>★ выбрать лучший</button>
                        <button className="rounded bg-rose-600/40 px-2 py-0.5" onClick={() => qAct(x.id, "failed")}>брак</button>
                        <button className="rounded bg-white/10 px-2 py-0.5" onClick={() => qNotes(x.id)}>заметки</button>
                        <button className={"rounded px-2 py-0.5 " + (approvable ? "bg-emerald-600/60" : "bg-white/5 text-slate-600 cursor-not-allowed")} disabled={!approvable} title={approvable ? "" : "нужно качество passed + pending_review"} onClick={() => approvable && act(x.jobId, "approve")}>одобрить</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {!groupList.length && <div className="text-[12px] text-slate-500">Групп нет — создай пак, «Прогнать очередь один раз».</div>}
        </div>
      </div>

      <div className={box + " mt-4"}>
        <div className="font-bold mb-2">Библиотека ассетов · Контроль качества ({assets.length})</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {assets.map(x => {
            const qc = x.qualityStatus === "passed" ? "text-emerald-300" : x.qualityStatus === "failed" ? "text-rose-300" : x.qualityStatus === "needs_review" ? "text-amber-300" : "text-slate-400";
            return (
              <div key={x.id} className="rounded-lg bg-white/5 border border-white/10 p-2 text-[11px]">
                <div className="aspect-square rounded bg-black/30 grid place-items-center text-center mb-1"><span className="text-[10px] text-slate-500">{x.sceneKey}<br />#{x.candidateIndex}<br />мок</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400">{x.status}</span><span className={qc}>{x.qualityStatus}{x.qualityScore != null ? " " + x.qualityScore : ""}</span></div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <button className="rounded bg-emerald-600/40 px-2 py-0.5" onClick={() => qAct(x.id, "passed")}>годен</button>
                  <button className="rounded bg-rose-600/40 px-2 py-0.5" onClick={() => qAct(x.id, "failed")}>брак</button>
                  <button className="rounded bg-white/10 px-2 py-0.5" onClick={() => act(x.jobId, "regenerate")}>перегенер.</button>
                  <button className="rounded bg-white/10 px-2 py-0.5" onClick={() => qNotes(x.id)}>заметки</button>
                </div>
              </div>
            );
          })}
          {!assets.length && <div className="text-[12px] text-slate-500">Пусто — создай пак и «Прогнать очередь один раз».</div>}
        </div>
      </div>
    </div>
  );
}
