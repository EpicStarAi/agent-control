"use client";

// MEDIA FACTORY ORCHESTRATION v1 — planning/preview layer over Media Factory Canvas v1.
// PREVIEW_ONLY · LOCAL_STORAGE_ONLY. No runtime, network, API, webhook, cron, worker, automation, publishing, accounts.
// UI + localStorage + preview/export ONLY. Additive. Does NOT modify MediaFactoryCanvas.tsx.

import { useEffect, useMemo, useState } from "react";

const LS = "deepinside.mediaFactory.orchestration.v1";
const CANVAS_LS = "deepinside.mediaFactory.canvas.v1";

const SAFETY = {
  mode: "PREVIEW_ONLY", execution_allowed: false, network_calls: false, automation: false, runtime_enabled: false,
  external_platform_actions: false, credentials_required: false, publishing_allowed: false, account_creation_allowed: false, tools_connected: false,
};

const MODES: [string, string][] = [
  ["production_planner", "🗂 Production Planner"], ["asset_vault", "🗄 Asset Vault"], ["consent_gate", "🛡 Consent & Copyright"],
  ["cost_render", "🧮 Cost & Render"], ["package_builder", "📦 Content Package"], ["release_dossier", "📋 Release Dossier"], ["ai_officer", "🧠 AI Officer"],
];
const CHARS = ["EVA NOVIKOVA", "BUCH", "BUCHIHA"];
const PIPELINE_TEMPLATE = [
  ["s1", "Idea Brief", "Сформулировать идею и цель ролика", ["brief"], ["concept"]],
  ["s2", "Script Draft", "Черновик сценария/текста", ["concept"], ["script"]],
  ["s3", "Visual Asset Selection", "Подбор визуальных ассетов", ["script", "face_ref"], ["visual_set"]],
  ["s4", "Voice Profile Selection", "Выбор голосового профиля", ["voice_profile"], ["voice_plan"]],
  ["s5", "Music/Jingle Plan", "План музыки/джингла (original/licensed)", ["music_prompt"], ["music_plan"]],
  ["s6", "Video Assembly Plan", "План сборки видео", ["visual_set", "voice_plan", "music_plan"], ["assembly_plan"]],
  ["s7", "Consent Review", "Проверка consent на identity/voice", ["assembly_plan"], ["consent_ok"]],
  ["s8", "Copyright Review", "Проверка прав на музыку/каверы", ["music_plan"], ["copyright_ok"]],
  ["s9", "Platform Policy Review", "Соответствие правилам платформ", ["assembly_plan"], ["policy_ok"]],
  ["s10", "Manual Approval", "Ручное финальное одобрение", ["consent_ok", "copyright_ok", "policy_ok"], ["approved_preview"]],
  ["s11", "Release Dossier", "Финальный паспорт выпуска", ["approved_preview"], ["dossier"]],
] as const;

function genId(p: string, i: number) { return p + "-" + String(i + 1).padStart(3, "0"); }
function nowISO() { return new Date().toISOString(); }
function readCanvas(): any { try { return JSON.parse(localStorage.getItem(CANVAS_LS) || "null"); } catch { return null; } }

function buildDemo() {
  const canvas = readCanvas();
  const canvasNodes: any[] = canvas?.nodes || [];
  const nodeIdsFor = (kw: string) => canvasNodes.filter((n) => (n.title || "").toUpperCase().includes(kw.toUpperCase()) || (n.fields?.characterId || "").toUpperCase().includes(kw.toUpperCase())).map((n) => n.id);

  const mkPipeline = (briefId: string, biasBlock = false) => PIPELINE_TEMPLATE.map(([stepId, title, description, requiredInputs, expectedOutputs], i) => {
    let status = "DRAFT", safetyFlags: string[] = [], blockingReasons: string[] = [];
    if (stepId === "s4") { safetyFlags = ["VOICE_CONSENT_REQUIRED"]; status = "NEEDS_REVIEW"; blockingReasons = ["Voice consent not confirmed"]; }
    if (stepId === "s5" || stepId === "s8") { safetyFlags = ["COPYRIGHT_REVIEW_REQUIRED"]; status = "BLOCKED"; blockingReasons = ["License/originality not confirmed"]; }
    if (stepId === "s7") { safetyFlags = ["IDENTITY_CONSENT_REQUIRED"]; status = "NEEDS_REVIEW"; }
    if (stepId === "s9") status = "DRAFT";
    if (stepId === "s10") status = "NEEDS_REVIEW";
    if (i <= 2) status = "READY";
    if (biasBlock && stepId === "s9") { status = "BLOCKED"; blockingReasons = ["Sensitive content policy review pending"]; }
    return { briefId, stepId, title, description, requiredInputs, expectedOutputs, status, safetyFlags, blockingReasons, previewJson: { stepId, status } };
  });

  const productionBriefs = [
    { id: "brief-001", title: "EVA NOVIKOVA — Night Radio Intro", character: "EVA NOVIKOVA", targetPlatforms: ["Deepinside Radio", "Telegram Preview", "YouTube Shorts Preview"], contentType: "radio_intro_video", status: "DRAFT", safetyMode: "PREVIEW_ONLY", linkedNodes: nodeIdsFor("EVA") },
    { id: "brief-002", title: "BUCH — Cyber Radio Segment", character: "BUCH", targetPlatforms: ["Deepinside Radio", "Telegram Preview"], contentType: "radio_segment", status: "DRAFT", safetyMode: "PREVIEW_ONLY", linkedNodes: nodeIdsFor("BUCH") },
    { id: "brief-003", title: "BUCHIHA — Neon Sketch Scene", character: "BUCHIHA", targetPlatforms: ["TikTok Preview", "Instagram Reels Preview", "YouTube Shorts Preview"], contentType: "video_sketch", status: "DRAFT", safetyMode: "PREVIEW_ONLY", linkedNodes: nodeIdsFor("BUCHIHA") },
  ];
  const pipelineSteps = [...mkPipeline("brief-001"), ...mkPipeline("brief-002"), ...mkPipeline("brief-003", true)];

  const ASSET_TYPES = ["Character Identity", "Face Reference", "Voice Profile", "Outfit", "Location", "Music Prompt", "Jingle Prompt", "Video Prompt", "Thumbnail Prompt", "Platform Caption", "Brand Rule", "Safety Note"];
  const assets = ASSET_TYPES.map((assetType, i) => {
    const owner = CHARS[i % 3];
    const consentStatus = ["Face Reference", "Voice Profile"].includes(assetType) ? "REQUIRED" : "NOT_REQUIRED";
    const copyrightStatus = ["Music Prompt", "Jingle Prompt"].includes(assetType) ? "REVIEW_REQUIRED" : "CLEAR";
    return { assetId: genId("asset", i), assetType, title: assetType + " · " + owner, ownerCharacter: owner, description: "Mock " + assetType.toLowerCase() + " (preview-only)", sourceStatus: "MOCK_ONLY", consentStatus, copyrightStatus, linkedNodes: nodeIdsFor(owner.split(" ")[0]), tags: [assetType.split(" ")[0].toLowerCase(), owner.split(" ")[0].toLowerCase()], createdAt: nowISO(), updatedAt: nowISO() };
  });

  const gates = [
    { gateId: "gate-001", name: "Identity / Face Consent", domain: "Consent", required: true, status: "PENDING", reason: "FaceFusion/DeepFace require confirmed consent", requiredAction: "Confirm identity consent", linkedAssets: ["asset-002"], linkedProductionBriefs: ["brief-001", "brief-003"] },
    { gateId: "gate-002", name: "Voice Consent", domain: "Consent", required: true, status: "PENDING", reason: "Voice clone (RVC/ElevenLabs) requires consent", requiredAction: "Confirm voice consent", linkedAssets: ["asset-003"], linkedProductionBriefs: ["brief-001", "brief-002"] },
    { gateId: "gate-003", name: "Music Originality", domain: "Copyright", required: true, status: "BLOCKED", reason: "Originality not confirmed", requiredAction: "Provide original or licensed track", linkedAssets: ["asset-006"], linkedProductionBriefs: ["brief-002"] },
    { gateId: "gate-004", name: "Cover / Remix License", domain: "Copyright", required: true, status: "BLOCKED", reason: "License required for covers/remixes", requiredAction: "Attach license", linkedAssets: ["asset-007"], linkedProductionBriefs: [] },
    { gateId: "gate-005", name: "Platform Policy", domain: "Platform", required: true, status: "PENDING", reason: "Platform rules not reviewed", requiredAction: "Run policy review", linkedAssets: [], linkedProductionBriefs: ["brief-001", "brief-002", "brief-003"] },
    { gateId: "gate-006", name: "Brand Safety", domain: "Platform", required: true, status: "PASSED", reason: "Brand rules ok", requiredAction: "—", linkedAssets: ["asset-011"], linkedProductionBriefs: ["brief-001"] },
    { gateId: "gate-007", name: "Age / Sensitive Content", domain: "Platform", required: true, status: "PENDING", reason: "Sensitive content scan pending", requiredAction: "Manual sensitivity review", linkedAssets: [], linkedProductionBriefs: ["brief-003"] },
    { gateId: "gate-008", name: "Manual Approval", domain: "Consent", required: true, status: "PENDING", reason: "Final human approval required", requiredAction: "Owner sign-off", linkedAssets: [], linkedProductionBriefs: ["brief-001", "brief-002", "brief-003"] },
  ];

  const renderPlans = [
    { renderPlanId: "rp-001", title: "EVA short intro", productionBriefId: "brief-001", estimatedComputeTier: "MEDIUM", estimatedRenderTime: "10-25 min", estimatedCostRange: "$0.50-$3.00", toolsInvolved: ["ComfyUI", "FaceFusion", "FFmpeg"], queuePriority: "NORMAL", blockers: ["Voice consent pending"], manualApprovalRequired: true },
    { renderPlanId: "rp-002", title: "BUCH radio segment", productionBriefId: "brief-002", estimatedComputeTier: "LOW", estimatedRenderTime: "3-8 min", estimatedCostRange: "$0.10-$1.00", toolsInvolved: ["Voice Lab", "Music Lab"], queuePriority: "LOW", blockers: ["Music license blocked"], manualApprovalRequired: true },
    { renderPlanId: "rp-003", title: "BUCHIHA video scene", productionBriefId: "brief-003", estimatedComputeTier: "GPU_REQUIRED", estimatedRenderTime: "20-60 min", estimatedCostRange: "$2.00-$12.00", toolsInvolved: ["Video Lab", "Render Queue"], queuePriority: "HIGH", blockers: ["Sensitive content review", "Identity consent"], manualApprovalRequired: true },
  ];

  const PLATFORMS = ["Telegram Preview", "YouTube Shorts Preview", "TikTok Preview", "Instagram Reels Preview", "Deepinside Radio Preview"];
  const contentPackages = PLATFORMS.map((targetPlatform, i) => ({
    packageId: genId("pkg", i), title: CHARS[i % 3] + " · " + targetPlatform, character: CHARS[i % 3], targetPlatform,
    scriptDraft: "Черновик сценария (preview).", voicePlan: "Voice profile (consent pending).", visualPlan: "Visual set from canvas nodes.", musicPlan: "Original/licensed only.",
    captionDraft: "Подпись-черновик для " + targetPlatform + ".", hashtags: ["#deepinside", "#ai", "#" + CHARS[i % 3].split(" ")[0].toLowerCase()], thumbnailPrompt: "neon cyber thumbnail",
    safetyStatus: "PREVIEW_ONLY", releaseStatus: i === 0 ? "READY_FOR_REVIEW" : i === 2 ? "BLOCKED" : "DRAFT",
  }));

  const mkDossier = (i: number, packageId: string, title: string, score: number, ready: string[], blocked: string[], final: string) => ({
    dossierId: genId("dossier", i), packageId, title, releaseReadinessScore: score, readyItems: ready, blockedItems: blocked,
    requiredManualApprovals: ["Owner sign-off", "Consent confirmation"], consentSummary: "Identity/Voice consent: PENDING", copyrightSummary: "Music/Cover: REVIEW/BLOCKED",
    platformPolicySummary: "Policy review: PENDING", costSummary: "Preview cost estimate only",
    futureActivationChecklist: ["Confirm consent", "Confirm licenses", "Pass policy review", "Manual approval", "Runtime Gate (separate)"], finalStatus: final,
  });
  const releaseDossiers = [
    mkDossier(0, "pkg-001", "EVA Night Radio Intro — Dossier", 62, ["Idea", "Script", "Visual set", "Brand safety"], ["Voice consent", "Manual approval"], "READY_FOR_MANUAL_REVIEW"),
    mkDossier(1, "pkg-002", "BUCH Radio Segment — Dossier", 40, ["Idea", "Script"], ["Music license", "Voice consent", "Manual approval"], "NOT_READY"),
    mkDossier(2, "pkg-003", "BUCHIHA Neon Sketch — Dossier", 35, ["Idea"], ["Sensitive review", "Identity consent", "Policy", "Manual approval"], "NOT_READY"),
  ];

  const aiOfficerRecommendations = [
    { id: "rec-001", severity: "CRITICAL", domain: "Consent", text: "Voice consent is required before any voice clone workflow can be activated.", linked: "gate-002" },
    { id: "rec-002", severity: "CRITICAL", domain: "Copyright", text: "Music cover/remix workflow must remain blocked until license status is confirmed.", linked: "gate-004" },
    { id: "rec-003", severity: "INFO", domain: "Content", text: "EVA radio intro can proceed to manual review as preview-only package.", linked: "brief-001" },
    { id: "rec-004", severity: "WARNING", domain: "Platform", text: "No external publishing is allowed in current safety mode.", linked: "policy" },
    { id: "rec-005", severity: "WARNING", domain: "Runtime", text: "Runtime activation requires separate Runtime Gate approval.", linked: "runtime" },
    { id: "rec-006", severity: "CRITICAL", domain: "Consent", text: "FaceFusion/DeepFace remain BLOCKED_BY_DEFAULT without confirmed identity consent.", linked: "gate-001" },
    { id: "rec-007", severity: "WARNING", domain: "Platform", text: "BUCHIHA sketch needs age/sensitive content review before policy pass.", linked: "gate-007" },
    { id: "rec-008", severity: "INFO", domain: "Cost", text: "GPU-required render (BUCHIHA) should be queued at HIGH priority with manual approval.", linked: "rp-003" },
    { id: "rec-009", severity: "INFO", domain: "Content", text: "Reuse approved brand-safety asset across all EVA packages.", linked: "asset-011" },
    { id: "rec-010", severity: "WARNING", domain: "Copyright", text: "All music prompts must stay ORIGINAL_OR_LICENSED_ONLY.", linked: "asset-006" },
  ];

  return { ...SAFETY, productionBriefs, pipelineSteps, assets, gates, renderPlans, contentPackages, releaseDossiers, aiOfficerRecommendations, selectedItemId: "brief-001", selectedMode: "production_planner", updatedAt: nowISO() };
}

function loadState(): any { try { const s = JSON.parse(localStorage.getItem(LS) || "null"); if (s?.productionBriefs?.length) return s; } catch {} return buildDemo(); }

const SC: Record<string, string> = { READY: "#4ade80", PASSED: "#4ade80", CLEAR: "#4ade80", APPROVED_PREVIEW_ONLY: "#4ade80", READY_FOR_REVIEW: "#38bdf8", READY_FOR_MANUAL_REVIEW: "#38bdf8", DRAFT: "#9ca3af", NEEDS_REVIEW: "#fbbf24", PENDING: "#fbbf24", REVIEW_REQUIRED: "#fbbf24", REQUIRED: "#fbbf24", BLOCKED: "#f87171", NOT_READY: "#f87171", LICENSE_REQUIRED: "#f87171", CRITICAL: "#f87171", WARNING: "#fbbf24", INFO: "#38bdf8" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (SC[s] || "#6b7280") + "22", color: SC[s] || "#9ca3af" }}>{s}</span>; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }

export function MediaFactoryOrchestration({ onClose }: { onClose: () => void }) {
  const [st, setSt] = useState<any>(loadState);
  const [mode, setMode] = useState<string>(st.selectedMode || "production_planner");
  const [selBrief, setSelBrief] = useState<string>(st.productionBriefs[0]?.id || "");
  const [selStep, setSelStep] = useState<string>("");
  const [selAsset, setSelAsset] = useState<string>(st.assets[0]?.assetId || "");
  const [assetTypeF, setAssetTypeF] = useState("All");
  const [assetCharF, setAssetCharF] = useState("All");
  const [assetSafeF, setAssetSafeF] = useState("All");
  const [selPkg, setSelPkg] = useState<string>(st.contentPackages[0]?.packageId || "");
  const [selDossier, setSelDossier] = useState<string>(st.releaseDossiers[0]?.dossierId || "");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1700); };

  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ ...st, ...SAFETY, selectedMode: mode, selectedItemId: selBrief, updatedAt: nowISO() })); } catch {} }, [st, mode, selBrief]);

  const briefSteps = useMemo(() => st.pipelineSteps.filter((s: any) => s.briefId === selBrief), [st, selBrief]);
  const step = briefSteps.find((s: any) => s.stepId === selStep) || briefSteps[0];
  const asset = st.assets.find((a: any) => a.assetId === selAsset);
  const pkg = st.contentPackages.find((p: any) => p.packageId === selPkg);
  const dossier = st.releaseDossiers.find((d: any) => d.dossierId === selDossier);

  function resetDemo() { const d = buildDemo(); setSt(d); flash("Демо-данные сброшены"); }
  function addMockAsset() { setSt((s: any) => { const i = s.assets.length; const a = { assetId: genId("asset", i), assetType: "Safety Note", title: "Safety Note · NEW", ownerCharacter: CHARS[i % 3], description: "Mock note (preview-only)", sourceStatus: "MOCK_ONLY", consentStatus: "NOT_REQUIRED", copyrightStatus: "CLEAR", linkedNodes: [], tags: ["note"], createdAt: nowISO(), updatedAt: nowISO() }; flash("Добавлен mock-ассет"); return { ...s, assets: [...s.assets, a] }; }); }

  function toMarkdown() {
    const L: string[] = ["# MEDIA FACTORY ORCHESTRATION v1", "", "**Mode:** PREVIEW_ONLY · LOCAL_STORAGE_ONLY", ""];
    L.push("## Production Briefs"); st.productionBriefs.forEach((b: any) => L.push(`- ${b.title} (${b.character}) → ${b.targetPlatforms.join(", ")} · ${b.status}`)); L.push("");
    L.push("## Asset Vault Summary"); L.push(`Всего: ${st.assets.length}`); const byT: Record<string, number> = {}; st.assets.forEach((a: any) => (byT[a.assetType] = (byT[a.assetType] || 0) + 1)); Object.entries(byT).forEach(([k, v]) => L.push(`- ${k}: ${v}`)); L.push("");
    L.push("## Gate Statuses"); st.gates.forEach((g: any) => L.push(`- [${g.domain}] ${g.name}: ${g.status} — ${g.reason}`)); L.push("");
    L.push("## Render / Cost Plans"); st.renderPlans.forEach((r: any) => L.push(`- ${r.title}: ${r.estimatedComputeTier}, ${r.estimatedRenderTime}, ${r.estimatedCostRange} (blockers: ${r.blockers.join("; ") || "—"})`)); L.push("");
    L.push("## Content Packages"); st.contentPackages.forEach((p: any) => L.push(`- ${p.title} → ${p.targetPlatform}: ${p.releaseStatus}`)); L.push("");
    L.push("## Release Dossiers"); st.releaseDossiers.forEach((d: any) => L.push(`- ${d.title}: score ${d.releaseReadinessScore}%, status ${d.finalStatus}; blocked: ${d.blockedItems.join(", ")}`)); L.push("");
    L.push("## AI Officer Recommendations"); st.aiOfficerRecommendations.forEach((r: any) => L.push(`- [${r.severity}/${r.domain}] ${r.text}`)); L.push("");
    L.push("## Safety Confirmation", "- Execution Allowed: false", "- Network Calls: false", "- Runtime Enabled: false", "- Automation: false", "- Publishing Allowed: false", "- Account Creation Allowed: false", "- Credentials Required: false", "- External Platform Actions: false", "- Identity/Voice Consent Gate: REQUIRED", "- Music/Cover/Remix Copyright Gate: REQUIRED", "");
    L.push("## Future Activation Checklist (NOT active)", "- [ ] Confirm identity/voice consent", "- [ ] Confirm music licenses / originality", "- [ ] Pass platform policy review", "- [ ] Manual approval (human)", "- [ ] Separate Runtime Gate approval before any execution");
    return L.join("\n");
  }
  function exportJSON() { return JSON.stringify({ name: "MEDIA_FACTORY_ORCHESTRATION_V1", ...st, ...SAFETY, updatedAt: nowISO() }, null, 2); }
  function download(name: string, content: string, type: string) { const b = new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); flash("Экспорт: " + name); }

  const filteredAssets = st.assets.filter((a: any) => (assetTypeF === "All" || a.assetType === assetTypeF) && (assetCharF === "All" || a.ownerCharacter === assetCharF) && (assetSafeF === "All" || a.consentStatus === assetSafeF || a.copyrightStatus === assetSafeF));

  const safetyBar = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-tg-muted sm:grid-cols-3 lg:grid-cols-4">
      {[["Mode", "PREVIEW_ONLY"], ["Execution Allowed", "false"], ["Network Calls", "false"], ["Runtime Enabled", "false"], ["Automation", "false"], ["Publishing Allowed", "false"], ["Account Creation", "false"], ["Credentials Required", "false"], ["External Platform Actions", "false"], ["Identity/Voice Consent Gate", "REQUIRED"], ["Music/Cover/Remix Gate", "REQUIRED"]].map(([l, v]) => <div key={l}><span>{l}: </span><b className={v === "REQUIRED" ? "text-amber-300" : v === "false" ? "text-emerald-300" : "text-cyan-300"}>{v}</b></div>)}
    </div>
  );

  // ---------- mode renderers ----------
  function ProductionPlanner() {
    return <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_320px]">
      <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Production Briefs</div>{st.productionBriefs.map((b: any) => <button key={b.id} onClick={() => { setSelBrief(b.id); setSelStep(""); }} className={`mb-1 w-full rounded-xl border px-2.5 py-2 text-left ${selBrief === b.id ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><div className="truncate text-sm font-semibold">{b.title}</div><div className="mt-0.5 flex items-center gap-1 text-[10px] text-tg-muted">{b.character} · <Chip s={b.status} /></div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-3"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Pipeline Preview · 11 шагов</div><div className="space-y-1.5">{briefSteps.map((s: any, i: number) => <button key={s.stepId} onClick={() => setSelStep(s.stepId)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left ${(step?.stepId === s.stepId) ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/40"}`}><span className="text-[10px] text-tg-muted">{i + 1}</span><span className="flex-1 text-sm font-semibold">{s.title}</span>{s.safetyFlags?.length ? <span className="text-[9px] text-amber-300">⚠ {s.safetyFlags.length}</span> : null}<Chip s={s.status} /></button>)}</div></main>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Step Inspector</div>{!step ? <div className="text-sm text-tg-muted">Выберите шаг.</div> : <div className="space-y-2 text-[12px]"><div className="font-bold text-sm">{step.title}</div><Chip s={step.status} /><div className="rounded bg-tg-bg/40 p-2"><b className="text-tg-accent">Описание:</b> {step.description}</div><div className="grid grid-cols-2 gap-1.5"><div className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">Inputs</div><b>{step.requiredInputs.join(", ")}</b></div><div className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">Outputs</div><b>{step.expectedOutputs.join(", ")}</b></div></div>{step.safetyFlags?.length ? <div className="rounded border border-red-500/30 bg-red-500/5 p-2"><b className="text-red-300">Safety flags:</b> {step.safetyFlags.join(", ")}</div> : null}{step.blockingReasons?.length ? <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2"><b className="text-amber-300">Blocking:</b> {step.blockingReasons.join("; ")}</div> : null}<div><div className="mb-1 text-[10px] uppercase text-tg-muted">JSON preview</div><pre className="max-h-40 overflow-auto rounded bg-black/50 p-2 text-[10px] text-emerald-200">{JSON.stringify(step, null, 2)}</pre></div></div>}</aside>
    </div>;
  }

  function AssetVault() {
    const types = ["All", ...Array.from(new Set(st.assets.map((a: any) => a.assetType)))];
    return <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]">
      <main className="min-h-0 overflow-auto p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          <select value={assetTypeF} onChange={(e) => setAssetTypeF(e.target.value)} className="rounded bg-tg-bg px-2 py-1">{types.map((t) => <option key={t as string}>{t as string}</option>)}</select>
          <select value={assetCharF} onChange={(e) => setAssetCharF(e.target.value)} className="rounded bg-tg-bg px-2 py-1">{["All", ...CHARS].map((c) => <option key={c}>{c}</option>)}</select>
          <select value={assetSafeF} onChange={(e) => setAssetSafeF(e.target.value)} className="rounded bg-tg-bg px-2 py-1">{["All", "REQUIRED", "REVIEW_REQUIRED", "CLEAR", "BLOCKED"].map((c) => <option key={c}>{c}</option>)}</select>
          <button onClick={addMockAsset} className="rounded bg-tg-active px-2 py-1 font-semibold text-white">+ Add Mock Asset</button>
          <button onClick={resetDemo} className="rounded bg-tg-bg px-2 py-1">Reset Demo Assets</button>
          <span className="ml-auto text-tg-muted">{filteredAssets.length}/{st.assets.length}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{filteredAssets.map((a: any) => <button key={a.assetId} onClick={() => setSelAsset(a.assetId)} className={`rounded-xl border px-3 py-2 text-left ${selAsset === a.assetId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/40"}`}><div className="truncate text-sm font-semibold">{a.title}</div><div className="mt-0.5 text-[10px] text-tg-muted">{a.assetType} · {a.ownerCharacter}</div><div className="mt-1 flex flex-wrap gap-1"><Chip s={a.consentStatus} /><Chip s={a.copyrightStatus} /></div></button>)}</div>
      </main>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Asset Inspector</div>{!asset ? <div className="text-sm text-tg-muted">Выберите ассет.</div> : <div className="space-y-2 text-[12px]"><div className="text-sm font-bold">{asset.title}</div><div className="flex flex-wrap gap-1"><Chip s={asset.sourceStatus} /><Chip s={asset.consentStatus} /><Chip s={asset.copyrightStatus} /></div><div className="rounded bg-tg-bg/40 p-2">{asset.description}</div><div className="rounded bg-tg-bg/40 p-2"><b className="text-tg-accent">Linked nodes:</b> {asset.linkedNodes?.join(", ") || "—"}</div><div><div className="mb-1 text-[10px] uppercase text-tg-muted">JSON preview</div><pre className="max-h-44 overflow-auto rounded bg-black/50 p-2 text-[10px] text-emerald-200">{JSON.stringify(asset, null, 2)}</pre></div></div>}</aside>
    </div>;
  }

  function ConsentGate() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Consent & Copyright Gate · {st.gates.length} проверок</div><div className="grid gap-2 md:grid-cols-2">{st.gates.map((g: any) => <Card key={g.gateId}><div className="flex items-center gap-2"><span className="flex-1 font-bold">{g.name}</span><Chip s={g.status} /></div><div className="mt-1 text-[11px] text-tg-muted">{g.domain} · required: {String(g.required)}</div><div className="mt-1 text-[12px]"><b className="text-tg-accent">Причина:</b> {g.reason}</div><div className="text-[12px]"><b className="text-tg-accent">Действие:</b> {g.requiredAction}</div><div className="mt-1 text-[10px] text-tg-muted">Briefs: {g.linkedProductionBriefs.join(", ") || "—"} · Assets: {g.linkedAssets.join(", ") || "—"}</div></Card>)}</div><div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-300">FaceFusion / DeepFace / Voice clone / RVC / covers / remixes → PENDING или BLOCKED_BY_DEFAULT без подтверждённого consent/license.</div></main>;
  }

  function CostRender() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Cost & Render Planner (preview estimate)</div><div className="grid gap-2 lg:grid-cols-3">{st.renderPlans.map((r: any) => <Card key={r.renderPlanId} t={r.title}><div className="grid grid-cols-2 gap-1.5 text-[12px]"><div className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">Compute</div><b style={{ color: r.estimatedComputeTier.includes("GPU") || r.estimatedComputeTier === "HIGH" ? "#f87171" : "#4ade80" }}>{r.estimatedComputeTier}</b></div><div className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">Time</div><b>{r.estimatedRenderTime}</b></div><div className="col-span-2 rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">Cost range</div><b>{r.estimatedCostRange}</b></div></div><div className="mt-1 text-[11px]"><b className="text-tg-accent">Tools:</b> {r.toolsInvolved.join(", ")}</div><div className="mt-0.5 flex items-center gap-1 text-[11px]"><span className="text-tg-muted">Priority:</span> <Chip s={r.queuePriority} /></div>{r.blockers?.length ? <div className="mt-1 rounded border border-amber-500/30 bg-amber-500/5 p-1.5 text-[11px] text-amber-300">Blockers: {r.blockers.join("; ")}</div> : null}<div className="mt-1 text-[10px] text-red-300">Manual approval required · preview-only, без реальных расчётов API.</div></Card>)}</div></main>;
  }

  function PackageBuilder() {
    return <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr]">
      <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 flex items-center justify-between px-2"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Packages</span><button onClick={resetDemo} className="rounded bg-tg-bg px-1.5 py-0.5 text-[9px]">Build Demo</button></div>{st.contentPackages.map((p: any) => <button key={p.packageId} onClick={() => setSelPkg(p.packageId)} className={`mb-1 w-full rounded-xl border px-2.5 py-2 text-left ${selPkg === p.packageId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/40"}`}><div className="truncate text-sm font-semibold">{p.title}</div><div className="mt-0.5"><Chip s={p.releaseStatus} /></div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-3">{!pkg ? <div className="text-tg-muted">Выберите пакет.</div> : <div className="space-y-2"><div className="flex items-center gap-2"><div className="text-lg font-black">{pkg.title}</div><Chip s={pkg.releaseStatus} /><div className="ml-auto flex gap-1.5"><button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(pkg, null, 2)); flash("JSON скопирован"); }} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Copy JSON</button><button onClick={() => download(pkg.packageId + ".json", JSON.stringify(pkg, null, 2), "application/json")} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Export JSON</button><button onClick={() => download(pkg.packageId + ".md", ["# " + pkg.title, "", "Platform: " + pkg.targetPlatform, "Status: " + pkg.releaseStatus, "", "## Script", pkg.scriptDraft, "## Voice", pkg.voicePlan, "## Visual", pkg.visualPlan, "## Music", pkg.musicPlan, "## Caption", pkg.captionDraft, "Hashtags: " + pkg.hashtags.join(" "), "Thumbnail: " + pkg.thumbnailPrompt, "", "Safety: PREVIEW_ONLY — no publishing."].join("\n"), "text/markdown")} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Export MD</button></div></div><div className="grid gap-2 md:grid-cols-2">{[["Target Platform", pkg.targetPlatform], ["Character", pkg.character], ["Script Draft", pkg.scriptDraft], ["Voice Plan", pkg.voicePlan], ["Visual Plan", pkg.visualPlan], ["Music Plan", pkg.musicPlan], ["Caption", pkg.captionDraft], ["Hashtags", pkg.hashtags.join(" ")], ["Thumbnail", pkg.thumbnailPrompt], ["Safety", pkg.safetyStatus]].map(([l, v]) => <Card key={l as string}><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-sm">{v}</div></Card>)}</div></div>}</main>
    </div>;
  }

  function ReleaseDossier() {
    return <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr]">
      <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Release Dossiers</div>{st.releaseDossiers.map((d: any) => <button key={d.dossierId} onClick={() => setSelDossier(d.dossierId)} className={`mb-1 w-full rounded-xl border px-2.5 py-2 text-left ${selDossier === d.dossierId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/40"}`}><div className="truncate text-sm font-semibold">{d.title}</div><div className="mt-0.5 flex items-center gap-1 text-[10px]"><span style={{ color: SC[d.finalStatus] }}>{d.releaseReadinessScore}%</span> · <Chip s={d.finalStatus} /></div></button>)}</nav>
      <main className="min-h-0 overflow-auto p-3">{!dossier ? <div className="text-tg-muted">Выберите досье.</div> : <div className="space-y-2"><div className="flex items-center gap-2"><div className="text-lg font-black">{dossier.title}</div><div className="ml-auto"><button onClick={() => download(dossier.dossierId + ".md", ["# " + dossier.title, "Readiness: " + dossier.releaseReadinessScore + "%", "Status: " + dossier.finalStatus, "", "## Ready", ...dossier.readyItems.map((x: string) => "- " + x), "## Blocked", ...dossier.blockedItems.map((x: string) => "- " + x), "## Required Approvals", ...dossier.requiredManualApprovals.map((x: string) => "- " + x), "", dossier.consentSummary, dossier.copyrightSummary, dossier.platformPolicySummary, dossier.costSummary, "", "## Future Activation", ...dossier.futureActivationChecklist.map((x: string) => "- [ ] " + x)].join("\n"), "text/markdown")} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Export MD</button></div></div>
        <div className="flex items-center gap-3"><div className="text-4xl font-black" style={{ color: SC[dossier.finalStatus] }}>{dossier.releaseReadinessScore}%</div><Chip s={dossier.finalStatus} /></div>
        <div className="grid gap-2 md:grid-cols-2"><Card t="Ready Items"><div className="space-y-0.5 text-[12px]">{dossier.readyItems.map((x: string) => <div key={x} className="text-emerald-300">✓ {x}</div>)}</div></Card><Card t="Blocked Items"><div className="space-y-0.5 text-[12px]">{dossier.blockedItems.map((x: string) => <div key={x} className="text-red-300">✗ {x}</div>)}</div></Card><Card t="Required Manual Approvals"><div className="space-y-0.5 text-[12px]">{dossier.requiredManualApprovals.map((x: string) => <div key={x}>• {x}</div>)}</div></Card><Card t="Summaries"><div className="space-y-0.5 text-[11px] text-tg-muted"><div>{dossier.consentSummary}</div><div>{dossier.copyrightSummary}</div><div>{dossier.platformPolicySummary}</div><div>{dossier.costSummary}</div></div></Card></div>
        <Card t="Future Activation Checklist (NOT active)"><div className="space-y-0.5 text-[12px]">{dossier.futureActivationChecklist.map((x: string) => <div key={x}>☐ {x}</div>)}</div></Card>
        <div><div className="mb-1 text-[10px] uppercase text-tg-muted">JSON preview</div><pre className="max-h-44 overflow-auto rounded bg-black/50 p-2 text-[10px] text-emerald-200">{JSON.stringify(dossier, null, 2)}</pre></div>
      </div>}</main>
    </div>;
  }

  function AIOfficer() {
    return <main className="min-h-0 flex-1 overflow-auto p-4"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🧠 AI Officer Recommendations · deterministic (no LLM/API)</div><div className="grid gap-2 md:grid-cols-2">{st.aiOfficerRecommendations.map((r: any) => <div key={r.id} className="rounded-xl border border-tg-line bg-tg-panel/60 p-3"><div className="flex items-center gap-2"><Chip s={r.severity} /><span className="text-[10px] uppercase text-tg-muted">{r.domain}</span><span className="ml-auto text-[9px] text-tg-muted">→ {r.linked}</span></div><div className="mt-1 text-[13px]">{r.text}</div></div>)}</div></main>;
  }

  return (
    <div className="fixed inset-0 z-[69] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🎬 MEDIA FACTORY ORCHESTRATION v1</div>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">PREVIEW_ONLY</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">LOCAL_STORAGE_ONLY</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={() => { navigator.clipboard?.writeText(exportJSON()); flash("JSON скопирован"); }} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Copy JSON</button>
          <button onClick={() => download("media-orchestration-v1.json", exportJSON(), "application/json")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export JSON</button>
          <button onClick={() => download("media-orchestration-v1.md", toMarkdown(), "text/markdown")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export Markdown</button>
          <button onClick={resetDemo} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Reset Demo</button>
        </div>
      </header>

      <div className="border-b border-tg-line bg-tg-panel/60 px-4 py-2">{safetyBar}</div>

      <div className="flex flex-wrap gap-1 border-b border-tg-line bg-tg-panel px-3 py-1.5">{MODES.map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{label}</button>)}</div>

      {mode === "production_planner" && <ProductionPlanner />}
      {mode === "asset_vault" && <AssetVault />}
      {mode === "consent_gate" && <ConsentGate />}
      {mode === "cost_render" && <CostRender />}
      {mode === "package_builder" && <PackageBuilder />}
      {mode === "release_dossier" && <ReleaseDossier />}
      {mode === "ai_officer" && <AIOfficer />}

      <footer className="border-t border-tg-line bg-tg-panel px-4 py-1.5">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-black uppercase tracking-wider text-tg-accent">Summary:</span>
          {[["Briefs", st.productionBriefs.length], ["Assets", st.assets.length], ["Gates", st.gates.length], ["Render Plans", st.renderPlans.length], ["Packages", st.contentPackages.length], ["Dossiers", st.releaseDossiers.length], ["Recommendations", st.aiOfficerRecommendations.length]].map(([l, v]) => <span key={l as string} className="rounded-full bg-tg-bg px-2.5 py-1">{l}: <b>{v}</b></span>)}
          <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-bold text-red-300">Runtime Connected: 0 · External Calls: 0 · Automation: false</span>
        </div>
      </footer>

      {toast && <div className="fixed bottom-6 left-1/2 z-[71] -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}
