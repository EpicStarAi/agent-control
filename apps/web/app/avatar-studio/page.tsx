"use client";
import { useEffect, useState, useCallback } from "react";

// P27.1 AI Avatar Studio — base UI (mock-safe). Requires a referral session.
type Avatar = { id: string; name: string; status: string; sourceImageUrl: string; consentConfirmed: boolean };
type Pack = { id: string; name: string; description: string; scenes: string[]; engine: string };
type Job = { id: string; avatarId: string; packId: string; engine: string; status: string; sceneKey: string; prompt: string; resultUrl: string; batchId?: string; attempts?: number; maxAttempts?: number; providerId?: string; selectedBy?: string };
type Prov = { id: string; name: string; mode: string; capabilities: string[]; enabled: boolean; status?: string };
type Asset = { id: string; jobId: string; avatarId: string; imageUrl: string; status: string; qualityStatus: string; qualityScore: number | null; identityScore: number | null; sceneKey: string; candidateIndex: number; qualityNotes: string; createdAt?: string };

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
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/avatar-studio/avatars");
    if (r.status === 401) { setAuthed(false); return; }
    const d = await r.json(); setAvatars(d.avatars || []); setSource(d.source || "");
    const p = await fetch("/api/avatar-studio/packs").then(x => x.json()).catch(() => ({ packs: [] })); setPacks(p.packs || []);
    const pr = await fetch("/api/avatar-studio/providers").then(x => x.json()).catch(() => ({ providers: [] })); setProviders(pr.providers || []);
    const j = await fetch("/api/avatar-studio/render-jobs").then(x => x.json()).catch(() => ({ jobs: [] })); setJobs(j.jobs || []);
    const as = await fetch("/api/avatar-studio/assets").then(x => x.json()).catch(() => ({ assets: [] })); setAssets(as.assets || []);
  }, []);
  useEffect(() => { load(); }, [load]);

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
      const reason = window.prompt("Quality gate: ассет не прошёл. Причина override для approve (или Cancel):");
      if (reason) await fetch(`/api/avatar-studio/render-jobs/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ override: true, reason }) });
    }
    load();
  }
  async function qAct(assetId: string, status: "passed" | "failed" | "needs_review") {
    await fetch(`/api/avatar-studio/assets/${assetId}/quality`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); load();
  }
  async function qNotes(assetId: string) {
    const notes = window.prompt("Quality notes:"); if (notes == null) return;
    await fetch(`/api/avatar-studio/assets/${assetId}/quality`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "needs_review", notes }) }); load();
  }
  async function regenGroup(jobId: string) {
    setBusy(true);
    const r = await fetch("/api/avatar-studio/candidates/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, candidateCount: candCount }) }).then(x => x.json()).catch(() => ({}));
    setBusy(false);
    if (r && r.reason) window.alert("Regenerate недоступен: " + r.reason); else load();
  }
  async function runQueue() { setBusy(true); await fetch("/api/avatar-studio/render-jobs/run-once", { method: "POST" }); setBusy(false); load(); }
  async function checkGrok() { setGrokStatus("…"); const r = await fetch("/api/avatar-studio/grok/check", { method: "POST" }).then(x => x.json()).catch(() => ({ status: "error" })); setGrokStatus((r.status || "?") + (r.detail ? " · " + r.detail : "")); }
  async function runGrok() { setBusy(true); const r = await fetch("/api/avatar-studio/render-jobs/run-grok-once", { method: "POST" }).then(x => x.json()).catch(() => ({})); setBusy(false); if (r.error) setGrokStatus(r.status + " · " + r.error); load(); }

  if (!authed) return (
    <div className="min-h-screen bg-[#05070f] text-slate-100 grid place-items-center p-6">
      <div className={box + " max-w-md text-center"}>
        <div className="text-lg font-bold mb-2">AI Avatar Studio</div>
        <div className="text-sm text-slate-400 mb-4">Нужен вход по referral-коду.</div>
        <a href="/gate" className={btn + " bg-sky-500 text-black inline-block"}>→ Access Gate</a>
      </div>
    </div>
  );

  const jobsById: Record<string, Job> = {}; jobs.forEach(j => { jobsById[j.id] = j; });
  const groupsMap: Record<string, Asset[]> = {};
  assets.forEach(a => { const k = a.avatarId + "::" + a.sceneKey; (groupsMap[k] = groupsMap[k] || []).push(a); });
  const groupList = Object.keys(groupsMap).map(k => ({ key: k, scene: groupsMap[k][0]?.sceneKey || "—", list: groupsMap[k].slice().sort((x, y) => x.candidateIndex - y.candidateIndex) }));
  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100 p-5">
      <div className="mb-3 flex items-center gap-3">
        <a href="/media-studio" className="text-sm text-sky-300">← Media Studio</a>
        <span className="text-[11px] text-slate-500">source: {source || "—"} · P27.1 mock-safe</span>
      </div>
      <h1 className="text-2xl font-black mb-1">🧬 AI Avatar Studio</h1>
      <div className="text-sm text-slate-400 mb-4">Один референс → Avatar → Passport → Prompt Packs → Render Jobs → Asset Library. Рендер — заглушка (без Grok/Playwright).</div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className={box}>
          <div className="font-bold mb-2">Создать аватар</div>
          <input className={inp} placeholder="Имя аватара" value={name} onChange={e => setName(e.target.value)} />
          <input className={inp + " mt-2"} placeholder="URL референс-изображения" value={url} onChange={e => setUrl(e.target.value)} />
          <label className="flex items-center gap-2 mt-2 text-[13px] text-slate-300"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> consent confirmed</label>
          <button className={btn + " bg-fuchsia-600 text-white mt-3"} disabled={busy || !name.trim()} onClick={createAvatar}>Добавить</button>
        </div>

        <div className={box}>
          <div className="font-bold mb-2">Аватары ({avatars.length})</div>
          <div className="space-y-1 max-h-56 overflow-auto">
            {avatars.map(a => (
              <div key={a.id} onClick={() => setSel(a.id)} className={"cursor-pointer rounded-lg px-3 py-2 text-sm " + (sel === a.id ? "bg-sky-500/20 border border-sky-400/40" : "bg-white/5")}>
                <div className="font-semibold">{a.name}</div>
                <div className="text-[11px] text-slate-400">{a.status} · consent {a.consentConfirmed ? "✓" : "—"}</div>
              </div>
            ))}
            {!avatars.length && <div className="text-[12px] text-slate-500">Пока нет аватаров.</div>}
          </div>
        </div>

        <div className={box}>
          <div className="font-bold mb-2">Avatar Passport {sel ? "" : "(выбери аватар)"}</div>
          <textarea className={inp} rows={2} placeholder="identity notes (лицо, возраст, причёска…)" value={idNotes} onChange={e => setIdNotes(e.target.value)} />
          <textarea className={inp + " mt-2"} rows={2} placeholder="style notes" value={styleNotes} onChange={e => setStyleNotes(e.target.value)} />
          <button className={btn + " bg-sky-500 text-black mt-3"} disabled={!sel || busy} onClick={savePassport}>Сохранить паспорт</button>
        </div>
      </div>

      <div className={box + " mt-4"}>
        <div className="font-bold mb-2">Render Packs</div>
        <div className="flex flex-wrap gap-2">
          {packs.map(p => (
            <button key={p.id} onClick={() => setPackId(p.id)} className={"rounded-lg px-3 py-1.5 text-[12px] border " + (packId === p.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5")}>
              {p.name} <span className="text-slate-500">· {p.scenes.length}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-slate-400">Провайдер (Render Router):</span>
          <select className="rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" value={providerId} onChange={e => setProviderId(e.target.value)}>
            <option value="">Auto (Router)</option>
            {providers.map(p => <option key={p.id} value={p.id} disabled={!p.enabled}>{p.name} · {p.mode} · {p.status || (p.enabled ? "ready" : "not configured")}</option>)}
          </select>
          {providerId && <span className="text-[11px] text-violet-300">{(providers.find(p => p.id === providerId)?.status) || ""}</span>}
          <span className="text-[12px] text-slate-400 ml-2">Кандидатов/сцена:</span>
          <select className="rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-[12px] text-white" value={candCount} onChange={e => setCandCount(Number(e.target.value))}>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button className={btn + " bg-emerald-500 text-black mt-3"} disabled={!sel || busy} onClick={createJobs}>⚡ Создать Render Jobs</button>
        {!sel && <span className="ml-2 text-[12px] text-slate-500">выбери аватар</span>}
      </div>

      <div className={box + " mt-4"}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <div className="font-bold">Render Jobs ({jobs.length})</div>
          <button className={btn + " bg-cyan-500 text-black"} disabled={busy} onClick={runQueue}>▶ Run Queue Once</button>
          <button className={btn + " bg-white/10 text-white"} disabled={busy} onClick={checkGrok}>🔎 Check Grok Browser</button>
          <button className={btn + " bg-violet-600/50 text-white"} disabled={busy} onClick={runGrok}>🦊 Run One Real Grok Job</button>
          {grokStatus && <span className="text-[11px] text-violet-300">{grokStatus}</span>}
          <span className="text-[11px] text-amber-300 w-full">Mock — по кнопке очереди. Реальный Grok — только с EPIC_GROK_BROWSER=1 и ручным логином.</span>
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
                <span className="text-slate-500">try {j.attempts ?? 0}/{j.maxAttempts ?? 3}</span>
                <span className="text-[10px] text-violet-300 truncate w-28" title={(j.providerId || "") + " · " + (j.selectedBy || "")}>{j.providerId}</span>
                <span className="text-slate-600 truncate w-20" title={j.batchId}>{(j.batchId || "").slice(-6)}</span>
                <span className="flex-1 truncate text-slate-500">{j.resultUrl}</span>
                {canApprove && <button className={btn + " bg-emerald-600/40 text-white"} onClick={() => act(j.id, "approve")}>approve</button>}
                {canReject && <button className={btn + " bg-rose-600/40 text-white"} onClick={() => act(j.id, "reject")}>reject</button>}
                {canRegen && <button className={btn + " bg-white/10 text-white"} onClick={() => act(j.id, "regenerate")}>regen</button>}
                {canCancel && <button className={btn + " bg-amber-600/40 text-white"} onClick={() => act(j.id, "cancel")}>cancel</button>}
              </div>
            );
          })}
          {!jobs.length && <div className="text-[12px] text-slate-500">Джобов нет — создай из пака, затем Run Queue Once.</div>}
        </div>
      </div>

      <div className={box + " mt-4"}>
        <div className="font-bold mb-1">Candidate Groups · Quality Gate ({groupList.length} сцен)</div>
        <div className="text-[11px] text-slate-500 mb-2">1 сцена → кандидаты → сравни → выбери лучший (passed) → approve. Группировка: avatar + scene.</div>
        <div className="space-y-3">
          {groupList.map(g => (
            <div key={g.key} className="rounded-lg border border-white/10 bg-black/20 p-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[12px] text-slate-300">{g.scene}</span>
                <span className="text-[11px] text-slate-500">{g.list.length} кандидат(ов)</span>
                <button className={btn + " bg-white/10 text-white ml-auto"} disabled={busy} onClick={() => regenGroup(g.list[0].jobId)}>♻ Regenerate candidates</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {g.list.map(x => {
                  const jb = jobsById[x.jobId]; const approvable = x.status === "pending_review" && x.qualityStatus === "passed";
                  const qc = x.qualityStatus === "passed" ? "bg-emerald-500/20 text-emerald-300" : x.qualityStatus === "failed" ? "bg-rose-500/20 text-rose-300" : x.qualityStatus === "needs_review" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-400";
                  return (
                    <div key={x.id} className={"rounded-lg border p-2 text-[11px] " + (x.qualityStatus === "passed" ? "border-emerald-400/50 bg-emerald-400/5" : "border-white/10 bg-white/5")}>
                      <div className="aspect-square rounded bg-black/30 grid place-items-center text-center mb-1"><span className="text-[10px] text-slate-500">#{x.candidateIndex}<br />{x.imageUrl ? "mock" : "—"}</span></div>
                      <div className="text-slate-400 truncate" title={x.id}>{x.id.slice(-6)} · {jb?.providerId || "?"}</div>
                      <div className="text-slate-500 truncate">{jb?.packId || ""} · {x.status}</div>
                      <div className="mt-1"><span className={"px-2 py-0.5 rounded " + qc}>{x.qualityStatus}{x.qualityScore != null ? " " + x.qualityScore : ""}</span></div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <button className="rounded bg-cyan-600/50 px-2 py-0.5" onClick={() => qAct(x.id, "passed")}>★ pick best</button>
                        <button className="rounded bg-rose-600/40 px-2 py-0.5" onClick={() => qAct(x.id, "failed")}>fail</button>
                        <button className="rounded bg-white/10 px-2 py-0.5" onClick={() => qNotes(x.id)}>notes</button>
                        <button className={"rounded px-2 py-0.5 " + (approvable ? "bg-emerald-600/60" : "bg-white/5 text-slate-600 cursor-not-allowed")} disabled={!approvable} title={approvable ? "" : "нужно quality passed + pending_review"} onClick={() => approvable && act(x.jobId, "approve")}>approve</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {!groupList.length && <div className="text-[12px] text-slate-500">Групп нет — создай пак, Run Queue Once.</div>}
        </div>
      </div>

      <div className={box + " mt-4"}>
        <div className="font-bold mb-2">Asset Library · Quality Gate ({assets.length})</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {assets.map(x => {
            const qc = x.qualityStatus === "passed" ? "text-emerald-300" : x.qualityStatus === "failed" ? "text-rose-300" : x.qualityStatus === "needs_review" ? "text-amber-300" : "text-slate-400";
            return (
              <div key={x.id} className="rounded-lg bg-white/5 border border-white/10 p-2 text-[11px]">
                <div className="aspect-square rounded bg-black/30 grid place-items-center text-center mb-1"><span className="text-[10px] text-slate-500">{x.sceneKey}<br />#{x.candidateIndex}<br />mock</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400">{x.status}</span><span className={qc}>{x.qualityStatus}{x.qualityScore != null ? " " + x.qualityScore : ""}</span></div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <button className="rounded bg-emerald-600/40 px-2 py-0.5" onClick={() => qAct(x.id, "passed")}>pass</button>
                  <button className="rounded bg-rose-600/40 px-2 py-0.5" onClick={() => qAct(x.id, "failed")}>fail</button>
                  <button className="rounded bg-white/10 px-2 py-0.5" onClick={() => act(x.jobId, "regenerate")}>regen</button>
                  <button className="rounded bg-white/10 px-2 py-0.5" onClick={() => qNotes(x.id)}>notes</button>
                </div>
              </div>
            );
          })}
          {!assets.length && <div className="text-[12px] text-slate-500">Пусто — создай пак и Run Queue Once.</div>}
        </div>
      </div>
    </div>
  );
}
