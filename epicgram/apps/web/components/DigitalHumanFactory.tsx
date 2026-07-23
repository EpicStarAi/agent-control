"use client";

// DIGITAL HUMAN FACTORY v1 — preview/planning factory for designing AI personas as digital humans.
// PREVIEW_ONLY · LOCAL_STORAGE_ONLY. No runtime, network, API, face/voice generation, voice clone, deepfake,
// account creation, publishing, impersonation. UI + localStorage + mock + preview/export ONLY. Additive.

import { useEffect, useMemo, useState } from "react";

const LS = "deepinside.digitalHuman.factory.v1";
const SAFETY = {
  mode: "PREVIEW_ONLY", execution_allowed: false, network_calls: false, automation: false, runtime_enabled: false,
  external_platform_actions: false, credentials_required: false, account_creation_allowed: false, publishing_allowed: false,
  biometric_generation_allowed: false, voice_clone_allowed: false, real_identity_impersonation_allowed: false,
};

const MODES: [string, string][] = [
  ["persona_builder", "🧬 Persona Builder"], ["avatar_studio", "🎭 Avatar Studio"], ["voice_studio", "🎙 Voice Studio"],
  ["personality_engine", "🧠 Personality Engine"], ["memory_designer", "💾 Memory Designer"], ["skill_matrix", "📊 Skill Matrix"],
  ["role_designer", "🎯 Role Designer"], ["human_lifecycle", "📈 Human Lifecycle"], ["persona_templates", "📚 Persona Templates"], ["digital_passport", "👤 Digital Passport"],
];
const LIFECYCLE_STAGES = ["Concept", "Identity Draft", "Persona Draft", "Avatar Draft", "Voice Draft", "Memory Draft", "Skill Draft", "Review", "Ready Preview Only", "Runtime Gate Required", "Live Locked"];
const SKILL_NAMES = ["Hosting", "Interviewing", "News Reading", "Script Writing", "Music Curation", "Community Replies", "Short Video Performance", "Radio Segment", "Product Presentation", "Multilingual Speaking", "Brand Safety", "Manual Review Awareness"];
const MEMORY_TYPES = ["Core Memory", "Episodic Memory", "Brand Memory", "Relationship Memory", "Content Memory", "Platform Memory", "Safety Memory"];
const ROLE_NAMES = ["Founder Persona", "AI Radio Host", "AI News Anchor", "AI Reporter", "Media Character", "Community Host", "Campaign Narrator", "Brand Ambassador Preview", "Stream Companion"];

function nowISO() { return new Date().toISOString(); }
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

function buildDemo() {
  const idLayer = readLS("world_identity_layer_v1");
  const linkedIdentityLayer = idLayer?.entities || ["buch", "buchiha", "eva", "nova", "reporter", "newscaster"];
  const mf: string[] = [];
  if (readLS("deepinside.mediaFactory.canvas.v1")) mf.push("canvas");
  if (readLS("deepinside.mediaFactory.orchestration.v1")) mf.push("orchestration");
  if (readLS("deepinside.contentRelease.control.v1")) mf.push("release");

  const P = [
    { personaId: "p_eva", identityId: "eva", displayName: "EVA NOVIKOVA", codename: "Nova-E", archetype: "Sage", role: "AI Radio Host", ageRange: "24-29", languageProfile: "RU/EN", toneProfile: "warm · confident", behaviorStyle: "host-driven", contentDomains: ["radio", "shorts", "news"], publicBio: "AI host & model для DEEP INSIDE.", boundaries: "no medical/legal advice", safetyClass: "A", status: "READY_PREVIEW_ONLY" },
    { personaId: "p_buch", identityId: "buch", displayName: "BUCH", codename: "Skull", archetype: "Rebel", role: "Founder Persona", ageRange: "26-32", languageProfile: "RU/EN", toneProfile: "edgy · direct", behaviorStyle: "operator", contentDomains: ["talk", "music"], publicBio: "Founder/operator persona.", boundaries: "no harassment", safetyClass: "A", status: "REVIEW" },
    { personaId: "p_buchiha", identityId: "buchiha", displayName: "BUCHIHA", codename: "Angel", archetype: "Creator", role: "Media Character", ageRange: "22-28", languageProfile: "RU/EN", toneProfile: "playful · soft", behaviorStyle: "sketch", contentDomains: ["sketch", "vlog"], publicBio: "Neon media character.", boundaries: "age-appropriate", safetyClass: "A", status: "READY_PREVIEW_ONLY" },
    { personaId: "p_reporter", identityId: "reporter", displayName: "AI REPORTER", codename: "Rep", archetype: "Sage", role: "AI Reporter", ageRange: "30-40", languageProfile: "RU/EN", toneProfile: "neutral · factual", behaviorStyle: "report", contentDomains: ["news"], publicBio: "News persona.", boundaries: "verified sources only", safetyClass: "A", status: "DRAFT" },
    { personaId: "p_newscaster", identityId: "newscaster", displayName: "AI NEWSCASTER", codename: "Cast", archetype: "Ruler", role: "AI News Anchor", ageRange: "30-45", languageProfile: "RU/EN", toneProfile: "authoritative", behaviorStyle: "broadcast", contentDomains: ["broadcast"], publicBio: "Broadcast persona.", boundaries: "no speculation", safetyClass: "A", status: "DRAFT" },
    { personaId: "p_nova", identityId: "nova", displayName: "NOVA", codename: "DJ-N", archetype: "Explorer", role: "Media Character", ageRange: "21-27", languageProfile: "RU/EN", toneProfile: "energetic", behaviorStyle: "dj", contentDomains: ["music"], publicBio: "Experimental DJ persona.", boundaries: "original/licensed music", safetyClass: "B", status: "BLOCKED" },
  ];
  const avatars = P.map((p) => ({ avatarId: "av_" + p.personaId, personaId: p.personaId, visualStyle: "neon-cyber", faceReferenceStatus: "MOCK_ONLY", bodyStyle: "stylized", outfitStyle: "streetwear-neon", colorPalette: "magenta/cyan", cameraStyle: "portrait 50mm", renderTargets: ["shorts", "thumbnail"], linkedToolsPreview: ["ComfyUI", "FaceFusion", "LivePortrait", "Runway", "Kling", "Veo"], consentStatus: "CONSENT_REQUIRED", safetyStatus: "PREVIEW_ONLY", runtimeStatus: "NOT_CONNECTED" }));
  const voices = P.map((p) => ({ voiceId: "vo_" + p.personaId, personaId: p.personaId, voiceType: "synthetic", language: "RU/EN", accent: "neutral-neon", emotionRange: "warm→energetic", speakingStyle: "host", voiceSourceStatus: "MOCK_ONLY", linkedToolsPreview: ["ElevenLabs", "OpenVoice", "RVC", "XTTS"], consentStatus: "CONSENT_REQUIRED", copyrightStatus: "REVIEW_REQUIRED", runtimeStatus: "NOT_CONNECTED", cloneStatus: "BLOCKED_BY_DEFAULT" }));
  const personalities = P.map((p, i) => ({ personalityId: "pe_" + p.personaId, personaId: p.personaId, traits: { Extroversion: 60 + i * 5, Humor: 70, Empathy: 65, Confidence: 80, Creativity: 78, Discipline: 62, Risk: 55, Leadership: 64, Curiosity: 75 }, motivations: ["рост аудитории", "качество контента"], fears: ["потеря доверия"], humorStyle: "dry/playful", conflictStyle: "de-escalate", emotionalRange: "balanced", tabooTopics: ["politics-extreme", "medical advice"], allowedTopics: p.contentDomains, responseRules: ["no PII", "cite sources"], platformBehaviorRules: ["platform policy first"], safetyBoundaries: ["consent for face/voice"] }));
  const memories: any[] = [];
  P.slice(0, 6).forEach((p, i) => { [MEMORY_TYPES[i % 7], MEMORY_TYPES[(i + 3) % 7]].forEach((mt, j) => memories.push({ memoryId: "m_" + p.personaId + "_" + j, personaId: p.personaId, memoryType: mt, title: mt + " · " + p.codename, description: "Mock " + mt.toLowerCase() + " (preview).", retentionPolicyPreview: "session+project", sensitivityLevel: mt === "Safety Memory" ? "high" : "low", allowedUse: "content/persona", prohibitedUse: "real PII", linkedContent: [], status: "DRAFT" })); });
  const levels = ["LOCKED", "BASIC", "TRAINING_PREVIEW", "READY_PREVIEW_ONLY"];
  const skills = SKILL_NAMES.map((s, i) => ({ skillId: "sk_" + i, personaId: "p_eva", skillName: s, level: levels[Math.min(3, Math.floor(i / 3))], requiredTools: i % 2 ? ["ComfyUI"] : ["ElevenLabs"], requiredApprovals: ["manual review"], blockers: s === "Music Curation" ? ["copyright review"] : [], futureActivationChecklist: ["consent", "runtime gate"] }));
  const roles = ROLE_NAMES.slice(0, 8).map((r, i) => ({ roleId: "r_" + i, personaId: P[i % P.length].personaId, roleName: r, mission: "mock mission", allowedPlatforms: ["Telegram", "YouTube"], prohibitedPlatforms: ["—"], contentResponsibilities: ["host/segment"], approvalRequirements: ["manual"], linkedReleaseFlows: mf.includes("release") ? ["release"] : [], status: "DRAFT" }));
  const lifecycles = P.map((p, i) => { const stage = ["Review", "Persona Draft", "Ready Preview Only", "Avatar Draft", "Identity Draft", "Concept"][i]; const idx = LIFECYCLE_STAGES.indexOf(stage); return { lifecycleId: "lc_" + p.personaId, personaId: p.personaId, currentStage: stage, completedStages: LIFECYCLE_STAGES.slice(0, idx), blockedStages: p.status === "BLOCKED" ? ["Ready Preview Only"] : [], requiredApprovals: ["manual review", "consent"], nextManualSteps: ["finish " + LIFECYCLE_STAGES[Math.min(idx + 1, 10)]], activationStatus: "LOCKED_UNTIL_RUNTIME_GATE" }; });
  const TPL = ["AI Radio Host", "AI News Reporter", "Luxury Lifestyle Host", "Tech Explainer", "Music Curator", "Virtual Streamer", "Community Manager", "Brand Presenter", "Cyber Analyst Preview", "Founder Digital Twin Preview"];
  const templates = TPL.map((t, i) => ({ templateId: "t_" + i, title: t, archetype: ["Sage", "Ruler", "Creator", "Sage", "Explorer", "Jester", "Caregiver", "Ruler", "Sage", "Rebel"][i], defaultRole: t.includes("News") ? "AI News Anchor" : t.includes("Radio") ? "AI Radio Host" : t.includes("Streamer") ? "Stream Companion" : "Media Character", defaultSkills: SKILL_NAMES.slice(0, 4), defaultSafetyRules: ["consent for face/voice", "copyright for music"], recommendedPlatforms: ["YouTube", "TikTok", "Telegram"], monetizationPotentialPreview: ["High", "Medium", "High", "Medium", "Medium", "High", "Low", "Medium", "Medium", "High"][i], risks: ["policy", "copyright"], requiredApprovals: ["manual review"] }));
  const passports = P.map((p) => { const av = avatars.find((a) => a.personaId === p.personaId)!; const vo = voices.find((v) => v.personaId === p.personaId)!; const score = p.status === "READY_PREVIEW_ONLY" ? 72 : p.status === "REVIEW" ? 58 : p.status === "BLOCKED" ? 30 : 44; return { passportId: "pp_" + p.personaId, personaId: p.personaId, identityId: p.identityId, displayName: p.displayName, role: p.role, avatarStatus: av.faceReferenceStatus, voiceStatus: vo.voiceSourceStatus, memoryStatus: "DRAFT", skillStatus: "TRAINING_PREVIEW", consentStatus: "CONSENT_REQUIRED", copyrightStatus: "REVIEW_REQUIRED", platformReadiness: score, releaseReadiness: Math.max(0, score - 10), monetizationReadiness: Math.max(0, score - 20), runtimeGateStatus: "NOT_REQUESTED", finalStatus: p.status === "BLOCKED" ? "BLOCKED" : p.status === "READY_PREVIEW_ONLY" ? "READY_PREVIEW_ONLY" : "REVIEW_REQUIRED", readinessScore: score }; });

  return { ...SAFETY, personas: P, avatars, voices, personalities, memories, skills, roles, lifecycles, templates, passports, linkedIdentityLayer, linkedMediaFactory: mf, selectedItemId: "p_eva", selectedMode: "persona_builder", updatedAt: nowISO() };
}
function loadState(): any { try { const s = JSON.parse(localStorage.getItem(LS) || "null"); if (s?.personas?.length) return s; } catch {} return buildDemo(); }

const SC: Record<string, string> = { READY_PREVIEW_ONLY: "#4ade80", READY: "#4ade80", BASIC: "#38bdf8", TRAINING_PREVIEW: "#fbbf24", DRAFT: "#9ca3af", REVIEW: "#fbbf24", REVIEW_REQUIRED: "#fbbf24", CONSENT_REQUIRED: "#fbbf24", REVIEW_REQUIRED2: "#fbbf24", LOCKED: "#9ca3af", BLOCKED: "#f87171", BLOCKED_BY_DEFAULT: "#f87171", MOCK_ONLY: "#9ca3af", NOT_CONNECTED: "#9ca3af", NOT_REQUESTED: "#9ca3af", LOCKED_UNTIL_RUNTIME_GATE: "#fb923c" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (SC[s] || "#6b7280") + "22", color: SC[s] || "#9ca3af" }}>{s}</span>; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");

export function DigitalHumanFactory({ onClose, onOpenAgent }: { onClose: () => void; onOpenAgent?: (id: string) => void }) {
  const [st, setSt] = useState<any>(loadState);
  const [mode, setMode] = useState<string>(st.selectedMode || "persona_builder");
  const [sel, setSel] = useState<string>(st.personas[0]?.personaId || "");
  const [draft, setDraft] = useState({ displayName: "", codename: "", role: "AI Radio Host", archetype: "Creator" });
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1700); };

  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ ...st, ...SAFETY, selectedMode: mode, selectedItemId: sel, updatedAt: nowISO() })); } catch {} }, [st, mode, sel]);

  const persona = st.personas.find((p: any) => p.personaId === sel) || st.personas[0];
  const avatar = st.avatars.find((a: any) => a.personaId === sel);
  const voice = st.voices.find((v: any) => v.personaId === sel);
  const personality = st.personalities.find((p: any) => p.personaId === sel);
  const lifecycle = st.lifecycles.find((l: any) => l.personaId === sel);
  const passport = st.passports.find((p: any) => p.personaId === sel);
  const myMemories = st.memories.filter((m: any) => m.personaId === sel);

  function resetDemo() { setSt(buildDemo()); flash("Демо сброшено"); }
  function createMock(fromTemplate?: any) {
    const id = "p_custom_" + Date.now();
    const name = fromTemplate ? fromTemplate.title + " Persona" : (draft.displayName || "NEW PERSONA");
    const np = { personaId: id, identityId: "", displayName: name, codename: fromTemplate ? fromTemplate.title.slice(0, 6) : (draft.codename || name.slice(0, 4)), archetype: fromTemplate?.archetype || draft.archetype, role: fromTemplate?.defaultRole || draft.role, ageRange: "—", languageProfile: "RU/EN", toneProfile: "neutral", behaviorStyle: "preview", contentDomains: fromTemplate?.defaultSkills?.slice(0, 2) || [], publicBio: "Mock persona (preview).", boundaries: "consent for face/voice", safetyClass: "A", status: "DRAFT" };
    setSt((s: any) => ({ ...s, personas: [...s.personas, np] }));
    setSel(id); setMode("persona_builder"); flash("Создана mock-персона: " + name);
  }

  function passportMD(pp: any) {
    return ["# Digital Passport — " + pp.displayName, "", "**Persona:** " + pp.personaId + " · **Identity:** " + (pp.identityId || "—") + " · **Role:** " + pp.role, "", "## Statuses", "- Avatar: " + pp.avatarStatus, "- Voice: " + pp.voiceStatus, "- Memory: " + pp.memoryStatus, "- Skill: " + pp.skillStatus, "- Consent: " + pp.consentStatus, "- Copyright: " + pp.copyrightStatus, "", "## Readiness", "- Platform: " + pp.platformReadiness + "%", "- Release: " + pp.releaseReadiness + "%", "- Monetization: " + pp.monetizationReadiness + "%", "- Runtime Gate: " + pp.runtimeGateStatus, "- Final: " + pp.finalStatus, "", "## Safety", "PREVIEW_ONLY · consent required for face/voice · runtime gate required for activation."].join("\n");
  }
  function toMarkdown() {
    const L: string[] = ["# DIGITAL HUMAN FACTORY v1", "", "**Mode:** PREVIEW_ONLY · LOCAL_STORAGE_ONLY", ""];
    L.push("## Personas"); st.personas.forEach((p: any) => L.push(`- ${p.displayName} (${p.codename}) · ${p.role} · ${p.archetype} · ${p.status}`)); L.push("");
    L.push("## Avatars"); st.avatars.forEach((a: any) => L.push(`- ${a.personaId}: ${a.visualStyle} · face ${a.faceReferenceStatus} · runtime ${a.runtimeStatus}`)); L.push("");
    L.push("## Voices"); st.voices.forEach((v: any) => L.push(`- ${v.personaId}: ${v.voiceType} · source ${v.voiceSourceStatus} · clone ${v.cloneStatus}`)); L.push("");
    L.push("## Personality Profiles"); st.personalities.forEach((p: any) => L.push(`- ${p.personaId}: humor ${p.humorStyle}, conflict ${p.conflictStyle}`)); L.push("");
    L.push("## Memory Design (" + st.memories.length + ")"); st.memories.forEach((m: any) => L.push(`- [${m.memoryType}] ${m.title} · sensitivity ${m.sensitivityLevel}`)); L.push("");
    L.push("## Skill Matrix"); st.skills.forEach((s: any) => L.push(`- ${s.skillName}: ${s.level}`)); L.push("");
    L.push("## Roles"); st.roles.forEach((r: any) => L.push(`- ${r.roleName} → ${r.personaId} · ${r.status}`)); L.push("");
    L.push("## Lifecycle"); st.lifecycles.forEach((l: any) => L.push(`- ${l.personaId}: ${l.currentStage} · ${l.activationStatus}`)); L.push("");
    L.push("## Digital Passports"); st.passports.forEach((p: any) => L.push(`- ${p.displayName}: ${p.finalStatus} · readiness ${p.readinessScore}%`)); L.push("");
    L.push("## Linked Identity Layer", (st.linkedIdentityLayer || []).join(", ") || "—", "", "## Linked Media Factory", (st.linkedMediaFactory || []).join(", ") || "—", "");
    L.push("## Safety Confirmation", ...Object.entries(SAFETY).map(([k, v]) => `- ${k}: ${v}`), "- consent_required_for_face_voice: true", "- runtime_gate_required_for_activation: true", "");
    L.push("## Future Activation Checklist (NOT active)", "- [ ] Confirm consent for face/voice", "- [ ] Confirm music/voice licenses", "- [ ] Manual review per persona", "- [ ] Request Runtime Gate (separate)", "- [ ] No publishing/account-creation in preview mode");
    return L.join("\n");
  }
  function exportJSON() { return JSON.stringify({ name: "DIGITAL_HUMAN_FACTORY_V1", ...st, ...SAFETY, updatedAt: nowISO() }, null, 2); }
  function download(name: string, content: string, type: string) { const b = new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); flash("Экспорт: " + name); }

  const safetyBar = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-tg-muted sm:grid-cols-3 lg:grid-cols-4">
      {[["Mode", "PREVIEW_ONLY"], ["Execution Allowed", "false"], ["Network Calls", "false"], ["Runtime Enabled", "false"], ["Automation", "false"], ["External Platform Actions", "false"], ["Credentials Required", "false"], ["Account Creation", "false"], ["Publishing", "false"], ["Biometric Generation", "false"], ["Voice Clone", "false"], ["Identity Impersonation", "false"], ["Consent (Face/Voice)", "REQUIRED"], ["Runtime Gate (Activation)", "REQUIRED"]].map(([l, v]) => <div key={l}><span>{l}: </span><b className={v === "REQUIRED" ? "text-amber-300" : v === "false" ? "text-emerald-300" : "text-cyan-300"}>{v}</b></div>)}
    </div>
  );

  const personaList = <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Personas</div>{st.personas.map((p: any) => <button key={p.personaId} onClick={() => setSel(p.personaId)} className={`mb-1 w-full rounded-xl border px-2.5 py-2 text-left ${sel === p.personaId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><div className="truncate text-sm font-semibold">{p.displayName}</div><div className="mt-0.5 flex items-center gap-1 text-[10px] text-tg-muted">{p.role} · <Chip s={p.status} /></div></button>)}</nav>;

  function PersonaBuilder() {
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_300px]">{personaList}
      <main className="min-h-0 overflow-auto p-3">
        <Card t="Create Mock Persona"><div className="grid gap-2 sm:grid-cols-2"><input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} placeholder="Display Name" className="rounded-lg border border-tg-line bg-tg-bg px-2 py-1.5 text-[12px] outline-none" /><input value={draft.codename} onChange={(e) => setDraft({ ...draft, codename: e.target.value })} placeholder="Codename" className="rounded-lg border border-tg-line bg-tg-bg px-2 py-1.5 text-[12px] outline-none" /><select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className="rounded-lg border border-tg-line bg-tg-bg px-2 py-1.5 text-[12px]">{ROLE_NAMES.map((r) => <option key={r}>{r}</option>)}</select><select value={draft.archetype} onChange={(e) => setDraft({ ...draft, archetype: e.target.value })} className="rounded-lg border border-tg-line bg-tg-bg px-2 py-1.5 text-[12px]">{["Hero", "Rebel", "Sage", "Creator", "Jester", "Explorer", "Caregiver", "Ruler"].map((r) => <option key={r}>{r}</option>)}</select></div><button onClick={() => createMock()} className="mt-2 rounded-lg bg-tg-active px-3 py-1.5 text-[12px] font-semibold text-white">🧬 Создать (mock localStorage)</button></Card>
        <div className="mt-3"><Card t={"Persona · " + persona.displayName}><div className="grid gap-1 text-[12px] sm:grid-cols-2">{([["personaId", persona.personaId], ["identityId", persona.identityId || "—"], ["codename", persona.codename], ["archetype", persona.archetype], ["role", persona.role], ["ageRange", persona.ageRange], ["languageProfile", persona.languageProfile], ["toneProfile", persona.toneProfile], ["behaviorStyle", persona.behaviorStyle], ["contentDomains", (persona.contentDomains || []).join(", ")], ["boundaries", persona.boundaries], ["safetyClass", persona.safetyClass]] as const).map(([l, v]) => <div key={l}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div><div className="mt-1 flex items-center gap-2"><Chip s={persona.status} /><span className="text-[11px] text-tg-muted">{persona.publicBio}</span></div><div className="mt-1 text-[10px] text-tg-muted">privateNotesPreview: redacted (mock)</div></Card></div>
      </main>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔗 Linked</div><div className="space-y-1.5 text-[11px]"><div className="rounded bg-tg-bg/40 p-2"><b className="text-tg-accent">Linked Identity:</b> {persona.identityId || "—"} {(st.linkedIdentityLayer || []).includes(persona.identityId) ? "· Identity Layer ✓" : ""}</div><div className="rounded bg-tg-bg/40 p-2"><b className="text-tg-accent">Identity Layer:</b> {(st.linkedIdentityLayer || []).length} сущностей {readLS("world_identity_layer_v1") ? "(подключён)" : "(demo)"}</div><div className="rounded bg-tg-bg/40 p-2"><b className="text-tg-accent">Media Factory:</b> {(st.linkedMediaFactory || []).join(", ") || "нет ключей (demo)"}</div></div><button onClick={() => persona.identityId && onOpenAgent?.(persona.identityId)} className="mt-2 w-full rounded-lg bg-tg-active py-1.5 text-[12px] font-semibold text-white">Open Agent →</button></aside>
    </div>;
  }
  function AvatarStudio() {
    if (!avatar) return <Card><div className="text-tg-muted">—</div></Card>;
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">{personaList}<main className="min-h-0 overflow-auto p-3"><Card t={"Avatar Studio · " + persona.displayName + " (no real face / no generation)"}><div className="grid gap-1.5 sm:grid-cols-2">{([["visualStyle", avatar.visualStyle], ["bodyStyle", avatar.bodyStyle], ["outfitStyle", avatar.outfitStyle], ["colorPalette", avatar.colorPalette], ["cameraStyle", avatar.cameraStyle], ["renderTargets", avatar.renderTargets.join(", ")]] as const).map(([l, v]) => <div key={l} className="rounded bg-tg-bg/40 p-2 text-[12px]"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div><div className="mt-2 flex flex-wrap gap-1.5"><Chip s={avatar.faceReferenceStatus} /><Chip s={avatar.consentStatus} /><Chip s={avatar.runtimeStatus} /></div><div className="mt-2 text-[11px]"><b className="text-tg-accent">Linked tools (preview):</b> {avatar.linkedToolsPreview.join(", ")} <span className="text-tg-muted">— NOT_CONNECTED</span></div><div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300">Никаких реальных лиц и генераций. Только описание, mock references и safety status.</div></Card></main></div>;
  }
  function VoiceStudio() {
    if (!voice) return <Card><div className="text-tg-muted">—</div></Card>;
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">{personaList}<main className="min-h-0 overflow-auto p-3"><Card t={"Voice Studio · " + persona.displayName}><div className="grid gap-1.5 sm:grid-cols-2">{([["voiceType", voice.voiceType], ["language", voice.language], ["accent", voice.accent], ["emotionRange", voice.emotionRange], ["speakingStyle", voice.speakingStyle]] as const).map(([l, v]) => <div key={l} className="rounded bg-tg-bg/40 p-2 text-[12px]"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div><div className="mt-2 flex flex-wrap gap-1.5"><Chip s={voice.voiceSourceStatus} /><Chip s={voice.consentStatus} /><Chip s={voice.runtimeStatus} /><Chip s={voice.cloneStatus} /></div><div className="mt-2 text-[11px]"><b className="text-tg-accent">Linked tools (preview):</b> {voice.linkedToolsPreview.join(", ")} <span className="text-tg-muted">— NOT_CONNECTED</span></div><div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300">Voice clone / RVC / чужой голос — BLOCKED_BY_DEFAULT без confirmed consent/license.</div></Card></main></div>;
  }
  function PersonalityEngine() {
    if (!personality) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">{personaList}<main className="min-h-0 overflow-auto p-3"><div className="grid gap-3 lg:grid-cols-2"><Card t={"Traits · " + persona.displayName}><div className="space-y-1.5">{Object.entries(personality.traits).map(([k, v]) => <div key={k} className="flex items-center gap-2 text-[12px]"><span className="w-28 text-tg-muted">{k}</span><div className="h-2.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: v + "%" }} /></div><b className="w-8 text-right">{v as any}</b></div>)}</div></Card><div className="space-y-2"><Card t="Rules & Boundaries"><div className="space-y-1 text-[12px]">{[["Humor", personality.humorStyle], ["Conflict", personality.conflictStyle], ["Motivations", personality.motivations.join(", ")], ["Fears", personality.fears.join(", ")], ["Taboo", personality.tabooTopics.join(", ")], ["Allowed", personality.allowedTopics.join(", ")], ["Safety", personality.safetyBoundaries.join(", ")]].map(([l, v]) => <div key={l as string}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div></Card><Card t="JSON preview (deterministic)"><pre className="max-h-40 overflow-auto rounded bg-black/50 p-2 text-[10px] text-emerald-200">{JSON.stringify(personality, null, 2)}</pre></Card></div></div></main></div>;
  }
  function MemoryDesigner() {
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">{personaList}<main className="min-h-0 overflow-auto p-3"><div className="mb-2 flex flex-wrap gap-1 text-[10px]">{MEMORY_TYPES.map((m) => <span key={m} className="rounded-full bg-tg-bg px-2 py-0.5 text-tg-muted">{m}</span>)}</div><div className="grid gap-2 sm:grid-cols-2">{(myMemories.length ? myMemories : st.memories.slice(0, 6)).map((m: any) => <Card key={m.memoryId}><div className="flex items-center gap-2"><b className="flex-1 text-[13px]">{m.title}</b><Chip s={m.status} /></div><div className="mt-0.5 text-[10px] text-tg-muted">{m.memoryType} · sensitivity {m.sensitivityLevel}</div><div className="mt-1 text-[12px]">{m.description}</div><div className="mt-1 text-[10px] text-tg-muted">retention: {m.retentionPolicyPreview} · allowed: {m.allowedUse} · prohibited: {m.prohibitedUse}</div></Card>)}</div><div className="mt-2 text-[10px] text-tg-muted">Без реальных чувствительных данных. Все записи mock/preview. Всего memory items: {st.memories.length}.</div></main></div>;
  }
  function SkillMatrix() {
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">{personaList}<main className="min-h-0 overflow-auto p-3"><Card t="Skill Matrix"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Skill", "Level", "Required Tools", "Approvals", "Blockers"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{st.skills.map((s: any) => <tr key={s.skillId} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{s.skillName}</td><td className="px-2"><Chip s={s.level} /></td><td className="px-2 text-tg-muted">{s.requiredTools.join(", ")}</td><td className="px-2 text-tg-muted">{s.requiredApprovals.join(", ")}</td><td className="px-2 text-red-300">{s.blockers.join(", ") || "—"}</td></tr>)}</tbody></table><div className="mt-2 text-[10px] text-tg-muted">Levels: LOCKED · BASIC · TRAINING_PREVIEW · READY_PREVIEW_ONLY. Активация — только через Runtime Gate.</div></Card></main></div>;
  }
  function RoleDesigner() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{st.roles.map((r: any) => <Card key={r.roleId} t={r.roleName}><div className="space-y-0.5 text-[11px]">{[["persona", r.personaId], ["mission", r.mission], ["allowed", r.allowedPlatforms.join(", ")], ["prohibited", r.prohibitedPlatforms.join(", ")], ["approvals", r.approvalRequirements.join(", ")]].map(([l, v]) => <div key={l as string}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div><div className="mt-1"><Chip s={r.status} /></div></Card>)}</div></main>;
  }
  function HumanLifecycle() {
    if (!lifecycle) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">{personaList}<main className="min-h-0 overflow-auto p-3"><Card t={"Human Lifecycle · " + persona.displayName}><div className="flex flex-wrap items-center gap-1 text-[10px]">{LIFECYCLE_STAGES.map((s, i) => { const ci = LIFECYCLE_STAGES.indexOf(lifecycle.currentStage); const blocked = lifecycle.blockedStages.includes(s); return <span key={s} className="flex items-center gap-1"><span className={`rounded px-2 py-0.5 ${i === ci ? "bg-tg-active text-white font-bold" : blocked ? "bg-red-500/20 text-red-300" : i < ci ? "bg-emerald-600/20 text-emerald-300" : "bg-tg-bg text-tg-muted"}`}>{s}</span>{i < LIFECYCLE_STAGES.length - 1 && <span className="text-tg-muted">→</span>}</span>; })}</div><div className="mt-2 grid gap-1 text-[12px] sm:grid-cols-2"><div><span className="text-tg-muted">Current: </span><b>{lifecycle.currentStage}</b></div><div><span className="text-tg-muted">Activation: </span><Chip s={lifecycle.activationStatus} /></div><div className="sm:col-span-2"><span className="text-tg-muted">Required approvals: </span><b>{lifecycle.requiredApprovals.join(", ")}</b></div><div className="sm:col-span-2"><span className="text-tg-muted">Next manual steps: </span><b>{lifecycle.nextManualSteps.join(", ")}</b></div></div><div className="mt-2 rounded border border-orange-500/30 bg-orange-500/5 p-2 text-[10px] text-orange-300">Activation LOCKED_UNTIL_RUNTIME_GATE — переход к Live только через отдельный Runtime Gate approval.</div></Card></main></div>;
  }
  function PersonaTemplates() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{st.templates.map((t: any) => <Card key={t.templateId} t={t.title}><div className="space-y-0.5 text-[11px]">{[["archetype", t.archetype], ["defaultRole", t.defaultRole], ["defaultSkills", t.defaultSkills.join(", ")], ["platforms", t.recommendedPlatforms.join(", ")], ["monetization", t.monetizationPotentialPreview], ["risks", t.risks.join(", ")]].map(([l, v]) => <div key={l as string}><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div><button onClick={() => createMock(t)} className="mt-2 w-full rounded-lg bg-tg-active py-1.5 text-[11px] font-semibold text-white">Create Mock Persona From Template</button></Card>)}</div></main>;
  }
  function DigitalPassport() {
    if (!passport) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">{personaList}<main className="min-h-0 overflow-auto p-3"><div className="mb-2 flex items-center gap-2"><div className="text-lg font-black">{passport.displayName}</div><Chip s={passport.finalStatus} /><div className="ml-auto flex gap-1.5"><button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(passport, null, 2)); flash("Passport JSON скопирован"); }} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Copy</button><button onClick={() => download(passport.passportId + ".json", JSON.stringify(passport, null, 2), "application/json")} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Export JSON</button><button onClick={() => download(passport.passportId + ".md", passportMD(passport), "text/markdown")} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Export MD</button></div></div>
      <div className="grid gap-3 lg:grid-cols-2"><Card t="Digital Passport"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full text-xl" style={{ background: av(passport.displayName) }}>👤</div><div><div className="font-bold">{passport.displayName}</div><div className="text-[11px] text-tg-muted">{passport.role} · identity {passport.identityId || "—"}</div></div><div className="ml-auto text-right"><div className="text-[10px] uppercase text-tg-muted">Readiness</div><div className="text-2xl font-black" style={{ color: passport.readinessScore >= 70 ? "#4ade80" : passport.readinessScore >= 50 ? "#fbbf24" : "#f87171" }}>{passport.readinessScore}%</div></div></div><div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">{[["Avatar", passport.avatarStatus], ["Voice", passport.voiceStatus], ["Memory", passport.memoryStatus], ["Skill", passport.skillStatus], ["Consent", passport.consentStatus], ["Copyright", passport.copyrightStatus], ["Platform", passport.platformReadiness + "%"], ["Release", passport.releaseReadiness + "%"], ["Monetization", passport.monetizationReadiness + "%"], ["Runtime Gate", passport.runtimeGateStatus]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div></Card>
        <div className="space-y-2"><Card t="Safety summary"><div className="text-[11px] text-tg-muted">PREVIEW_ONLY · consent required for face/voice · runtime gate required for activation · no impersonation/clone/generation.</div></Card><Card t="Linked modules"><div className="text-[11px] text-tg-muted">Identity Layer: {(st.linkedIdentityLayer || []).length} · Media Factory: {(st.linkedMediaFactory || []).join(", ") || "—"}</div></Card><Card t="JSON preview"><pre className="max-h-40 overflow-auto rounded bg-black/50 p-2 text-[10px] text-emerald-200">{JSON.stringify(passport, null, 2)}</pre></Card></div></div>
    </main></div>;
  }

  return (
    <div className="fixed inset-0 z-[77] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🧬 DIGITAL HUMAN FACTORY v1</div>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">PREVIEW_ONLY</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">LOCAL_STORAGE_ONLY</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={() => { navigator.clipboard?.writeText(exportJSON()); flash("JSON скопирован"); }} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Copy JSON</button>
          <button onClick={() => download("digital-human-factory-v1.json", exportJSON(), "application/json")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export JSON</button>
          <button onClick={() => download("digital-human-factory-v1.md", toMarkdown(), "text/markdown")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export Markdown</button>
          <button onClick={resetDemo} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Reset Demo</button>
        </div>
      </header>
      <div className="border-b border-tg-line bg-tg-panel/60 px-4 py-2">{safetyBar}</div>
      <div className="flex flex-wrap gap-1 border-b border-tg-line bg-tg-panel px-3 py-1.5">{MODES.map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{label}</button>)}</div>
      {mode === "persona_builder" && <PersonaBuilder />}
      {mode === "avatar_studio" && <AvatarStudio />}
      {mode === "voice_studio" && <VoiceStudio />}
      {mode === "personality_engine" && <PersonalityEngine />}
      {mode === "memory_designer" && <MemoryDesigner />}
      {mode === "skill_matrix" && <SkillMatrix />}
      {mode === "role_designer" && <RoleDesigner />}
      {mode === "human_lifecycle" && <HumanLifecycle />}
      {mode === "persona_templates" && <PersonaTemplates />}
      {mode === "digital_passport" && <DigitalPassport />}
      <footer className="border-t border-tg-line bg-tg-panel px-4 py-1.5"><div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="font-black uppercase tracking-wider text-tg-accent">Summary:</span>{[["Personas", st.personas.length], ["Avatars", st.avatars.length], ["Voices", st.voices.length], ["Personalities", st.personalities.length], ["Memories", st.memories.length], ["Skills", st.skills.length], ["Roles", st.roles.length], ["Lifecycles", st.lifecycles.length], ["Templates", st.templates.length], ["Passports", st.passports.length]].map(([l, v]) => <span key={l as string} className="rounded-full bg-tg-bg px-2.5 py-1">{l}: <b>{v}</b></span>)}<span className="rounded-full bg-red-500/15 px-2.5 py-1 font-bold text-red-300">Runtime: 0 · Generation: off · Mode: PREVIEW_ONLY</span></div></footer>
      {toast && <div className="fixed bottom-6 left-1/2 z-[78] -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}
