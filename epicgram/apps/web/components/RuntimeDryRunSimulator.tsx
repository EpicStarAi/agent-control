"use client";

// RUNTIME DRY-RUN SIMULATOR v1 — simulation layer over Runtime Gate Request Builder. Simulation executes NOTHING.
// PREVIEW_ONLY · DRY_RUN_ONLY · LOCAL_STORAGE_ONLY. No runtime/API/ADB/RPA/install/login/publish/device control/secrets.
// UI + localStorage + mock + preview/export ONLY. Additive. Reads other modules read-only.

import { useEffect, useState } from "react";

const LS = "deepinside.runtimeDryRun.simulator.v1";
const SAFETY = {
  mode: "PREVIEW_ONLY", dry_run_only: true, execution_allowed: false, network_calls: false, automation: false, rpa_allowed: false, adb_allowed: false,
  runtime_enabled: false, external_platform_actions: false, credentials_required: false, credentials_stored: false, account_creation_allowed: false,
  publishing_allowed: false, app_install_allowed: false, device_control_allowed: false, screen_control_allowed: false, proxy_secret_storage_allowed: false,
  vpn_secret_storage_allowed: false, fingerprint_spoofing_allowed: false, anti_fraud_bypass_allowed: false, real_android_control_connected: false,
};
const MODES: [string, string][] = [
  ["simulation_dashboard", "🧪 Simulations"], ["steps", "🪜 Step-by-Step"], ["adapters", "🔌 Adapter Map"], ["contracts", "📑 IO Contracts"],
  ["failures", "💥 Failure Lab"], ["rollback", "↩ Rollback Plan"], ["handoff", "🧑‍🔧 Operator Handoff"], ["report", "📊 Simulation Report"],
];
const STEP_DEFS: [string, string][] = [
  ["Load persona context", "Persona"], ["Check identity link", "Identity"], ["Check device passport", "Device"], ["Check app bundle readiness", "App"],
  ["Check content package", "Content"], ["Check release dossier", "Content"], ["Check approval checklist", "Approval"], ["Validate runtime policy matrix", "Runtime"],
  ["Build execution plan preview", "Runtime"], ["Build rollback plan", "Safety"], ["Build operator handoff", "Approval"], ["Generate simulation report", "Safety"],
];
const ADAPTERS = ["Android Device Adapter", "Geelark Adapter", "Media Factory Adapter", "Content Release Adapter", "AI Model Router Adapter", "Storage Adapter", "Notification Adapter", "Human Approval Adapter", "Audit Log Adapter", "Runtime Supervisor Adapter"];
const PERSONAS = [
  { sim: "EVA NOVIKOVA Radio Intro Dry Run", persona: "EVA NOVIKOVA", id: "eva", device: "EVA-CLOUD-ANDROID-01", deviceId: "dev_1", gr: "gr_1", risk: "MEDIUM", score: 72, status: "READY_PREVIEW_ONLY" },
  { sim: "BUCH Operator Control Dry Run", persona: "BUCH", id: "buch", device: "BUCH-OPERATOR-ANDROID-01", deviceId: "dev_2", gr: "gr_2", risk: "MEDIUM", score: 58, status: "NEEDS_REVIEW" },
  { sim: "BUCHIHA Short Video Dry Run", persona: "BUCHIHA", id: "buchiha", device: "BUCHIHA-MEDIA-ANDROID-01", deviceId: "dev_3", gr: "gr_3", risk: "MEDIUM", score: 70, status: "READY_PREVIEW_ONLY" },
  { sim: "AI REPORTER Newsroom Dry Run", persona: "AI REPORTER", id: "reporter", device: "AI-REPORTER-ANDROID-01", deviceId: "dev_4", gr: "gr_4", risk: "LOW", score: 46, status: "DRAFT" },
  { sim: "AI NEWSCASTER Broadcast Dry Run", persona: "AI NEWSCASTER", id: "newscaster", device: "AI-NEWSCASTER-ANDROID-01", deviceId: "dev_5", gr: "gr_5", risk: "LOW", score: 50, status: "DRAFT" },
  { sim: "NOVA Sandbox Dry Run", persona: "NOVA", id: "nova", device: "NOVA-TEST-ANDROID-01", deviceId: "dev_6", gr: "gr_6", risk: "CRITICAL", score: 28, status: "BLOCKED" },
];

function nowISO() { return new Date().toISOString(); }
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

function buildDemo() {
  const SOURCES = ["deepinside.runtimeGate.requestBuilder.v1", "deepinside.operations.assignmentMatrix.v1", "deepinside.androidCloud.lab.v1", "deepinside.mediaFactory.orchestration.v1", "deepinside.contentRelease.control.v1", "world_identity_layer_v1", "deepinside.digitalHuman.factory.v1"];
  const linkedSources = SOURCES.map((k) => ({ key: k, present: !!readLS(k), refs: readLS(k) ? "linked" : "demo" }));

  const simulations = PERSONAS.map((p, i) => ({ simulationId: "sim_" + (i + 1), title: p.sim, sourceGateRequestId: p.gr, persona: p.persona, deviceId: p.deviceId, deviceName: p.device, contentPackageIds: ["pkg-" + (i + 1)], requestedScope: "future activation review", simulationStatus: p.status, readinessScore: p.score, riskLevel: p.risk, blockers: p.status === "BLOCKED" ? ["device blocked", "policy blocks scope"] : p.status === "NEEDS_REVIEW" ? ["manual review pending"] : [], linkedGateRequest: p.gr, safetyMode: "PREVIEW_ONLY", createdAt: "2026-06-18", updatedAt: nowISO() }));

  const dryRunSteps: any[] = [];
  simulations.forEach((s, si) => { STEP_DEFS.forEach(([title, domain], j) => { const blocked = s.simulationStatus === "BLOCKED" && j >= 7; dryRunSteps.push({ stepId: "step_" + (si + 1) + "_" + (j + 1), simulationId: s.simulationId, order: j + 1, title, domain, description: "Simulated check: " + title.toLowerCase() + " (no real action).", expectedInput: domain.toLowerCase() + " context", expectedOutput: domain.toLowerCase() + " validation result", simulatedActionOnly: true, realActionAllowed: false, adapterRequired: ADAPTERS[j % ADAPTERS.length], status: blocked ? "BLOCKED" : j === 6 && s.simulationStatus !== "READY_PREVIEW_ONLY" ? "NEEDS_REVIEW" : "SIMULATED", blockers: blocked ? ["runtime policy blocks scope"] : [], notes: "simulation only" }); }); });

  const adapterCapabilityMap = ADAPTERS.map((title, i) => ({ adapterId: "ad_" + (i + 1), title, domain: ["Device", "Device", "Media", "Content", "AI", "Storage", "Notification", "Approval", "Audit", "Runtime"][i], requiredForSimulations: ["sim_" + ((i % 6) + 1)], currentStatus: i === 9 ? "BLOCKED" : i < 4 ? "MOCK_ONLY" : "PLANNED", networkCallsAllowed: false, credentialsRequired: false, runtimeEnabled: false, capabilitiesPreview: ["read-only preview", "simulated validation"], prohibitedCapabilities: ["real execution", "credential access", "external actions"], requiredGate: "Separate Runtime Gate", riskNotes: "no network, no credentials, no runtime" }));

  const ioContracts: any[] = [];
  simulations.slice(0, 6).forEach((s, si) => { [0, 8].forEach((stepIdx, k) => { ioContracts.push({ contractId: "ct_" + (si * 2 + k + 1), simulationId: s.simulationId, stepId: "step_" + (si + 1) + "_" + (stepIdx + 1), inputSchemaPreview: { persona: "string", device: "string", scope: "string" }, outputSchemaPreview: { status: "enum", readiness: "number" }, requiredFields: ["persona", "device"], optionalFields: ["notes"], validationRulesPreview: ["no secrets", "no PII", "preview only"], sensitiveFieldsAllowed: false, credentialsAllowed: false, status: "PREVIEW" }); }); });

  const FAIL = [
    ["Device not connected.", "Device", "CRITICAL"], ["App not manually installed.", "App", "WARNING"], ["Manual login not confirmed.", "Approval", "WARNING"],
    ["Consent review incomplete.", "Content", "WARNING"], ["Copyright review incomplete.", "Content", "WARNING"], ["Runtime policy blocks requested scope.", "Policy", "CRITICAL"],
    ["Credentials are missing by design.", "Credentials", "INFO"], ["External platform actions disabled.", "Platform", "WARNING"], ["Publishing disabled.", "Platform", "WARNING"],
    ["ADB/RPA disabled.", "Runtime", "CRITICAL"], ["Anti-fraud bypass prohibited.", "Platform", "CRITICAL"], ["Network call attempted (blocked).", "Network", "CRITICAL"],
  ];
  const failureScenarios = FAIL.map(([title, domain, sev], i) => ({ failureId: "fl_" + (i + 1), simulationId: "sim_" + ((i % 6) + 1), title, domain, severity: sev, triggerCondition: "if real activation attempted in preview", expectedImpact: sev === "CRITICAL" ? "activation blocked" : "review required", detectionPreview: "policy + checklist", mitigationPreview: "manual review + separate runtime gate", blocksActivation: sev === "CRITICAL", canProceedInPreview: sev !== "CRITICAL" }));

  const rollbackPlans = simulations.map((s, i) => ({ rollbackId: "rb_" + (i + 1), simulationId: s.simulationId, title: "Rollback · " + s.persona, rollbackSteps: ["revert preview state", "clear simulated artifacts (local)", "notify operator", "keep runtime disabled"], affectedModules: ["operations matrix", "gate builder"], manualOwner: "EPIC☠STAR", rollbackType: s.simulationStatus === "BLOCKED" ? "POLICY_BLOCK" : "MANUAL_ONLY", automatedRollbackAllowed: false, status: i < 2 ? "READY_PREVIEW_ONLY" : i === 5 ? "BLOCKED" : "NEEDS_REVIEW" }));

  const HAND = ["Review identity/persona.", "Confirm no credentials stored.", "Confirm app install manually.", "Confirm login manually outside system.", "Confirm content package.", "Confirm platform policy.", "Confirm runtime remains disabled.", "Confirm no publishing occurs."];
  const operatorHandoffs = simulations.map((s, i) => ({ handoffId: "ho_" + (i + 1), simulationId: s.simulationId, title: "Operator Handoff · " + s.persona, operatorRole: "Owner / Reviewer", manualSteps: HAND.map((h, j) => ({ step: h, done: j < (i % 4) })), requiredApprovals: ["identity", "compliance", "consent"], prohibitedActions: ["enable runtime", "auto-publish", "store credentials", "fingerprint spoofing"], checklist: HAND, notes: "all actions manual & external to system", finalStatus: s.simulationStatus === "BLOCKED" ? "BLOCKED" : i < 2 ? "READY_PREVIEW_ONLY" : "NEEDS_REVIEW" }));

  const simulationReports = simulations.map((s, i) => { const crit = failureScenarios.filter((f) => f.simulationId === s.simulationId && f.severity === "CRITICAL").length; const rec = s.simulationStatus === "BLOCKED" ? "DO_NOT_RUN" : s.simulationStatus === "READY_PREVIEW_ONLY" ? "READY_FOR_GATE_REVIEW_PREVIEW_ONLY" : "NEEDS_REVIEW"; return { reportId: "rep_" + (i + 1), simulationId: s.simulationId, title: "Simulation Report · " + s.persona, readinessScore: s.readinessScore, summary: "Dry-run completed in preview; no real action executed.", readyItems: ["persona", "device profile", "app bundle (manual)", "rollback plan"], blockedItems: ["runtime", "automation", "publishing", "credentials"], criticalRisks: crit, requiredManualApprovals: ["identity", "compliance", "consent", "runtime gate"], adapterReadiness: "mock/planned only", failureSummary: crit + " critical / " + failureScenarios.filter((f) => f.simulationId === s.simulationId).length + " total", rollbackSummary: "MANUAL_ONLY, automated rollback disabled", operatorHandoffSummary: HAND.length + " manual steps", finalRecommendation: rec, executionEnabledAfterReport: false, automationEnabledAfterReport: false, publishingEnabledAfterReport: false }; });

  return { ...SAFETY, simulations, dryRunSteps, adapterCapabilityMap, ioContracts, failureScenarios, rollbackPlans, operatorHandoffs, simulationReports, linkedSources, selectedItemId: "sim_1", selectedMode: "simulation_dashboard", updatedAt: nowISO() };
}
function loadState(): any { try { const s = JSON.parse(localStorage.getItem(LS) || "null"); if (s?.simulations?.length) return s; } catch {} return buildDemo(); }

const SC: Record<string, string> = { READY_PREVIEW_ONLY: "#4ade80", READY_FOR_GATE_REVIEW_PREVIEW_ONLY: "#22c55e", SIMULATED: "#4ade80", MOCK_ONLY: "#38bdf8", PREVIEW: "#38bdf8", NEEDS_REVIEW: "#fbbf24", PLANNED: "#fbbf24", DRAFT: "#9ca3af", SKIPPED: "#9ca3af", NOT_CONNECTED: "#9ca3af", BLOCKED: "#f87171", POLICY_BLOCK: "#f87171", DO_NOT_RUN: "#f87171", CRITICAL: "#f87171", WARNING: "#fbbf24", INFO: "#38bdf8", LOW: "#4ade80", MEDIUM: "#fbbf24", HIGH: "#fb923c", MANUAL_ONLY: "#38bdf8", RUNTIME_DISABLED: "#fb923c", APPROVAL_REQUIRED: "#fbbf24" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (SC[s] || "#6b7280") + "22", color: SC[s] || "#9ca3af" }}>{s}</span>; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");

export function RuntimeDryRunSimulator({ onClose }: { onClose: () => void }) {
  const [st, setSt] = useState<any>(loadState);
  const [mode, setMode] = useState<string>(st.selectedMode || "simulation_dashboard");
  const [sel, setSel] = useState<string>(st.simulations[0]?.simulationId || "");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1700); };

  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ ...st, ...SAFETY, selectedMode: mode, selectedItemId: sel, updatedAt: nowISO() })); } catch {} }, [st, mode, sel]);

  const sim = st.simulations.find((s: any) => s.simulationId === sel) || st.simulations[0];
  const mySteps = st.dryRunSteps.filter((s: any) => s.simulationId === sel);
  const myReport = st.simulationReports.find((r: any) => r.simulationId === sel);
  const myRollback = st.rollbackPlans.find((r: any) => r.simulationId === sel);
  const myHandoff = st.operatorHandoffs.find((h: any) => h.simulationId === sel);
  const ready = st.simulations.filter((s: any) => s.simulationStatus === "READY_PREVIEW_ONLY").length;
  const blocked = st.simulations.filter((s: any) => s.simulationStatus === "BLOCKED").length;
  const draftCnt = st.simulations.filter((s: any) => s.simulationStatus === "DRAFT").length;
  const critRisks = st.failureScenarios.filter((f: any) => f.severity === "CRITICAL").length;

  function resetDemo() { setSt(buildDemo()); flash("Демо сброшено"); }
  function reportMD(r: any) { return ["# Simulation Report — " + r.title, "", "**Readiness:** " + r.readinessScore + "% · **Recommendation:** " + r.finalRecommendation, "", r.summary, "", "## Ready", ...r.readyItems.map((x: string) => "- " + x), "## Blocked", ...r.blockedItems.map((x: string) => "- " + x), "", "Critical risks: " + r.criticalRisks + " · Failures: " + r.failureSummary, "Rollback: " + r.rollbackSummary, "Handoff: " + r.operatorHandoffSummary, "", "## Post-report flags", "- executionEnabledAfterReport: " + r.executionEnabledAfterReport, "- automationEnabledAfterReport: " + r.automationEnabledAfterReport, "- publishingEnabledAfterReport: " + r.publishingEnabledAfterReport, "", "## Safety", "Simulation executes NOTHING. Separate Runtime Gate required for any real activation."].join("\n"); }
  function rollbackMD(r: any) { return ["# Rollback Plan — " + r.title, "", "Type: " + r.rollbackType + " · automatedRollbackAllowed: " + r.automatedRollbackAllowed + " · status: " + r.status, "", "## Steps", ...r.rollbackSteps.map((x: string) => "- " + x), "", "Affected: " + r.affectedModules.join(", ") + " · Owner: " + r.manualOwner, "", "Preview-only. No real action."].join("\n"); }
  function handoffMD(h: any) { return ["# Operator Handoff — " + h.title, "", "Role: " + h.operatorRole + " · Final: " + h.finalStatus, "", "## Manual Steps", ...h.checklist.map((x: string) => "- [ ] " + x), "", "## Prohibited", ...h.prohibitedActions.map((x: string) => "- " + x), "", "All actions manual & external to system."].join("\n"); }
  function simMD(s: any) { return ["# Simulation — " + s.title, "", "**Persona:** " + s.persona + " · **Device:** " + s.deviceName + " · **Gate:** " + s.linkedGateRequest, "", "Status: " + s.simulationStatus + " · Risk: " + s.riskLevel + " · Readiness: " + s.readinessScore + "%", "Blockers: " + (s.blockers.join("; ") || "—"), "", "Simulation executes NOTHING. PREVIEW_ONLY · DRY_RUN_ONLY."].join("\n"); }
  function toMarkdown() {
    const L: string[] = ["# RUNTIME DRY-RUN SIMULATOR v1", "", "**Mode:** PREVIEW_ONLY · DRY_RUN_ONLY · Simulation executes NOTHING.", ""];
    L.push("## Simulation Dashboard"); st.simulations.forEach((s: any) => L.push(`- ${s.title}: ${s.persona} → ${s.deviceName} · ${s.simulationStatus} · risk ${s.riskLevel} · ${s.readinessScore}%`)); L.push("");
    L.push("## Step-by-Step Dry Run (" + st.dryRunSteps.length + " steps)"); st.simulations.forEach((s: any) => { L.push("### " + s.persona); st.dryRunSteps.filter((x: any) => x.simulationId === s.simulationId).forEach((x: any) => L.push(`  ${x.order}. ${x.title} [${x.domain}] · ${x.status}`)); }); L.push("");
    L.push("## Adapter Capability Map"); st.adapterCapabilityMap.forEach((a: any) => L.push(`- ${a.title}: ${a.currentStatus} · network ${a.networkCallsAllowed} · runtime ${a.runtimeEnabled}`)); L.push("");
    L.push("## IO Contracts"); st.ioContracts.forEach((c: any) => L.push(`- ${c.contractId} (${c.stepId}): secrets ${c.sensitiveFieldsAllowed} · creds ${c.credentialsAllowed}`)); L.push("");
    L.push("## Failure Scenarios"); st.failureScenarios.forEach((f: any) => L.push(`- [${f.severity}/${f.domain}] ${f.title}`)); L.push("");
    L.push("## Rollback Plans"); st.rollbackPlans.forEach((r: any) => L.push(`- ${r.title}: ${r.rollbackType} · automated ${r.automatedRollbackAllowed} · ${r.status}`)); L.push("");
    L.push("## Operator Handoff"); st.operatorHandoffs.forEach((h: any) => L.push(`- ${h.title}: ${h.finalStatus} (${h.checklist.length} manual steps)`)); L.push("");
    L.push("## Simulation Reports"); st.simulationReports.forEach((r: any) => L.push(`- ${r.title}: ${r.finalRecommendation} · ${r.readinessScore}% · execAfter ${r.executionEnabledAfterReport}`)); L.push("");
    L.push("## Linked Sources"); st.linkedSources.forEach((s: any) => L.push(`- ${s.key}: ${s.present ? "linked" : "demo"}`)); L.push("");
    L.push("## Safety Confirmation", ...Object.entries(SAFETY).map(([k, v]) => `- ${k}: ${v}`), "- simulation_executes_nothing: true", "- manual_review_required: true", "- separate_runtime_gate_required: true", "");
    L.push("## Future Activation Checklist (NOT active)", "- [ ] Complete all manual approvals", "- [ ] Confirm runtime remains disabled", "- [ ] Confirm no secrets/credentials", "- [ ] Submit SEPARATE Runtime Gate", "- [ ] Human sign-off before any real action");
    return L.join("\n");
  }
  function exportJSON() { return JSON.stringify({ name: "RUNTIME_DRY_RUN_SIMULATOR_V1", ...st, ...SAFETY, updatedAt: nowISO() }, null, 2); }
  function download(name: string, content: string, type: string) { const b = new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); flash("Экспорт: " + name); }

  const safetyBar = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-tg-muted sm:grid-cols-3 lg:grid-cols-5">
      {[["Mode", "PREVIEW_ONLY"], ["Dry Run Only", "true"], ["Execution", "false"], ["Runtime", "false"], ["ADB", "false"], ["RPA", "false"], ["Automation", "false"], ["Publishing", "false"], ["Account Creation", "false"], ["App Install", "false"], ["Device Control", "false"], ["Screen Control", "false"], ["Credentials Stored", "false"], ["External Actions", "false"], ["Fingerprint Spoofing", "false"], ["Anti-Fraud Bypass", "false"], ["Simulation Executes Nothing", "true"], ["Manual Review", "REQUIRED"], ["Separate Runtime Gate", "REQUIRED"]].map(([l, v]) => <div key={l}><span>{l}: </span><b className={v === "REQUIRED" || v === "true" ? "text-amber-300" : "text-emerald-300"}>{v}</b></div>)}
    </div>
  );
  const simList = <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Simulations</div>{st.simulations.map((s: any) => <button key={s.simulationId} onClick={() => setSel(s.simulationId)} className={`mb-1 w-full rounded-xl border px-2.5 py-2 text-left ${sel === s.simulationId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><div className="truncate text-[12px] font-semibold">{s.persona}</div><div className="mt-0.5 flex items-center gap-1 text-[10px] text-tg-muted">{s.readinessScore}% · <Chip s={s.simulationStatus} /></div></button>)}</nav>;

  function Inspector() {
    return <aside className="min-h-0 w-80 shrink-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Dry Run Inspector</div><div className="text-sm font-bold">{sim.title}</div><div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">{[["Persona", sim.persona], ["Device", sim.deviceName], ["Gate", sim.linkedGateRequest], ["Readiness", sim.readinessScore + "%"], ["Risk", sim.riskLevel], ["Status", sim.simulationStatus]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div>{sim.blockers.length ? <div className="mt-1 rounded border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-300"><b>Blockers:</b> {sim.blockers.join("; ")}</div> : null}<div className="mt-2 flex gap-1.5"><button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(sim, null, 2)); flash("Simulation JSON скопирован"); }} className="rounded bg-tg-bg px-2 py-1 text-[10px]">Copy</button><button onClick={() => download(sim.simulationId + ".json", JSON.stringify(sim, null, 2), "application/json")} className="rounded bg-tg-bg px-2 py-1 text-[10px]">JSON</button><button onClick={() => download(sim.simulationId + ".md", simMD(sim), "text/markdown")} className="rounded bg-tg-bg px-2 py-1 text-[10px]">MD</button></div><pre className="mt-2 max-h-40 overflow-auto rounded bg-black/50 p-2 text-[10px] text-emerald-200">{JSON.stringify(sim, null, 2)}</pre></aside>;
  }

  function Dashboard() {
    return <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]"><main className="min-h-0 overflow-auto p-3">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{[["Simulations", st.simulations.length], ["Draft", draftCnt], ["Ready Preview", ready, "#4ade80"], ["Blocked", blocked, "#f87171"], ["Critical Risks", critRisks, "#f87171"], ["Runtime", "false", "#4ade80"], ["Automation", "false", "#4ade80"], ["External Actions", "false", "#4ade80"], ["Dry Run Only", "true", "#fbbf24"]].map(([l, v, c]) => <div key={l as string} className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-lg font-black" style={{ color: c as string }}>{v}</div></div>)}</div>
      <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] font-bold text-amber-300">Simulation executes nothing. Это только dry-run: план, риски, rollback, handoff и отчёт — без реальных действий.</div>
      <div className="grid gap-2 sm:grid-cols-2">{st.simulations.map((s: any) => <button key={s.simulationId} onClick={() => setSel(s.simulationId)} className={`rounded-xl border p-3 text-left ${sel === s.simulationId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full text-sm" style={{ background: av(s.persona) }}>🧪</div><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold">{s.title}</div><div className="text-[10px] text-tg-muted">{s.deviceName}</div></div><Chip s={s.simulationStatus} /></div><div className="mt-1 flex items-center gap-2 text-[10px]"><Chip s={s.riskLevel} /><div className="h-1.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: s.readinessScore + "%" }} /></div><b>{s.readinessScore}%</b></div></button>)}</div>
    </main>{Inspector()}</div>;
  }
  function Steps() {
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">{simList}<main className="min-h-0 overflow-auto p-3"><Card t={"Step-by-Step Dry Run · " + sim.persona + " (12 steps)"}><div className="space-y-1.5">{mySteps.map((x: any) => <div key={x.stepId} className="flex items-start gap-2 rounded-lg bg-tg-bg/40 px-3 py-2"><span className="mt-0.5 text-[10px] text-tg-muted">{x.order}</span><div className="flex-1"><div className="flex items-center gap-2"><span className="text-[13px] font-semibold">{x.title}</span><span className="rounded bg-tg-bg px-1.5 py-0.5 text-[9px] text-tg-accent">{x.domain}</span><Chip s={x.status} /></div><div className="mt-0.5 text-[10px] text-tg-muted">{x.description} · adapter: {x.adapterRequired} · realAction: <b className="text-emerald-300">false</b></div>{x.blockers.length ? <div className="text-[10px] text-red-300">⚠ {x.blockers.join("; ")}</div> : null}</div></div>)}</div><div className="mt-2 text-[10px] text-tg-muted">Ни один шаг не выполняет реальное действие (simulatedActionOnly=true). Всего шагов: {st.dryRunSteps.length}.</div></Card></main></div>;
  }
  function Adapters() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{st.adapterCapabilityMap.map((a: any) => <Card key={a.adapterId} t={a.title}><div className="flex items-center gap-2 text-[11px]"><span className="text-tg-muted">{a.domain}</span><Chip s={a.currentStatus} /></div><div className="mt-1 grid grid-cols-3 gap-1 text-center text-[9px]"><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">network</div><b className="text-emerald-300">{String(a.networkCallsAllowed)}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">creds</div><b className="text-emerald-300">{String(a.credentialsRequired)}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">runtime</div><b className="text-emerald-300">{String(a.runtimeEnabled)}</b></div></div><div className="mt-1 text-[10px] text-tg-muted">Gate: {a.requiredGate}</div></Card>)}</div></main>;
  }
  function Contracts() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><Card t="Input / Output Contract Preview"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Contract", "Step", "Required", "Optional", "Secrets", "Credentials", "Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{st.ioContracts.map((c: any) => <tr key={c.contractId} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{c.contractId}</td><td className="px-2 text-tg-muted">{c.stepId}</td><td className="px-2">{c.requiredFields.join(", ")}</td><td className="px-2 text-tg-muted">{c.optionalFields.join(", ")}</td><td className="px-2 text-emerald-300">{String(c.sensitiveFieldsAllowed)}</td><td className="px-2 text-emerald-300">{String(c.credentialsAllowed)}</td><td className="px-2"><Chip s={c.status} /></td></tr>)}</tbody></table><div className="mt-2 text-[10px] text-tg-muted">Без реальных секретов и персональных данных. validationRulesPreview: no secrets · no PII · preview only.</div></Card></main>;
  }
  function Failures() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2">{st.failureScenarios.map((f: any) => <Card key={f.failureId}><div className="flex items-center gap-2"><Chip s={f.severity} /><span className="text-[10px] uppercase text-tg-muted">{f.domain}</span></div><div className="mt-1 text-[13px] font-semibold">{f.title}</div><div className="mt-0.5 text-[10px] text-tg-muted">Trigger: {f.triggerCondition} · Impact: {f.expectedImpact}</div><div className="text-[10px] text-tg-muted">Detection: {f.detectionPreview} · Mitigation: {f.mitigationPreview}</div><div className="mt-1 text-[10px]">{f.blocksActivation ? <span className="text-red-300">blocks activation</span> : <span className="text-emerald-300">can proceed in preview</span>}</div></Card>)}</div></main>;
  }
  function Rollback() {
    if (!myRollback) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">{simList}<main className="min-h-0 overflow-auto p-3"><div className="mb-2 flex justify-end"><button onClick={() => download(myRollback.rollbackId + ".md", rollbackMD(myRollback), "text/markdown")} className="rounded bg-tg-bg px-2.5 py-1 text-[11px] hover:text-white">Export Rollback MD</button></div><Card t={myRollback.title}><div className="flex items-center gap-2"><Chip s={myRollback.rollbackType} /><Chip s={myRollback.status} /><span className="ml-auto text-[10px] text-red-300">automatedRollbackAllowed: false</span></div><div className="mt-2 space-y-1 text-[12px]">{myRollback.rollbackSteps.map((s: string, i: number) => <div key={i}>↩ {s}</div>)}</div><div className="mt-2 text-[10px] text-tg-muted">Affected: {myRollback.affectedModules.join(", ")} · Owner: {myRollback.manualOwner}. Rollback тоже preview-only, без реальных действий.</div></Card></main></div>;
  }
  function Handoff() {
    if (!myHandoff) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">{simList}<main className="min-h-0 overflow-auto p-3"><div className="mb-2 flex justify-end"><button onClick={() => download(myHandoff.handoffId + ".md", handoffMD(myHandoff), "text/markdown")} className="rounded bg-tg-bg px-2.5 py-1 text-[11px] hover:text-white">Export Handoff MD</button></div><Card t={myHandoff.title}><div className="flex items-center gap-2"><span className="text-[11px] text-tg-muted">{myHandoff.operatorRole}</span><Chip s={myHandoff.finalStatus} /></div><div className="mt-2 space-y-1 text-[12px]">{myHandoff.manualSteps.map((m: any, i: number) => <div key={i} className="flex items-center gap-2"><span>{m.done ? "☑" : "☐"}</span><span className={m.done ? "text-emerald-300" : ""}>{m.step}</span></div>)}</div><div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300"><b>Prohibited:</b> {myHandoff.prohibitedActions.join(", ")}. Все действия — вручную и вне системы.</div></Card></main></div>;
  }
  function Report() {
    if (!myReport) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">{simList}<main className="min-h-0 overflow-auto p-3"><div className="mb-2 flex items-center gap-2"><div className="text-lg font-black">{myReport.title}</div><Chip s={myReport.finalRecommendation} /><div className="ml-auto flex gap-1.5"><button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(myReport, null, 2)); flash("Report JSON скопирован"); }} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Copy</button><button onClick={() => download(myReport.reportId + ".json", JSON.stringify(myReport, null, 2), "application/json")} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Export JSON</button><button onClick={() => download(myReport.reportId + ".md", reportMD(myReport), "text/markdown")} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Export MD</button></div></div>
      <div className="grid gap-3 lg:grid-cols-2"><Card t="Simulation Report"><div className="flex items-center gap-3"><div className="text-3xl font-black" style={{ color: myReport.readinessScore >= 65 ? "#4ade80" : "#fbbf24" }}>{myReport.readinessScore}%</div><div className="text-[12px] text-tg-muted">{myReport.summary}</div></div><div className="mt-2 grid grid-cols-2 gap-2 text-[11px]"><div className="rounded bg-emerald-500/10 p-2"><b className="text-emerald-300">Ready:</b> {myReport.readyItems.join(", ")}</div><div className="rounded bg-red-500/10 p-2"><b className="text-red-300">Blocked:</b> {myReport.blockedItems.join(", ")}</div></div><div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">{[["Critical Risks", myReport.criticalRisks], ["Failures", myReport.failureSummary], ["Adapters", myReport.adapterReadiness]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div></Card>
        <div className="space-y-2"><Card t="Final Recommendation"><div className="text-lg font-black" style={{ color: SC[myReport.finalRecommendation] }}>{myReport.finalRecommendation}</div><div className="mt-1 text-[11px] text-tg-muted">Approvals: {myReport.requiredManualApprovals.join(", ")}</div></Card><Card t="Post-report flags (all false)"><div className="grid grid-cols-1 gap-1 text-[11px]">{[["executionEnabledAfterReport", myReport.executionEnabledAfterReport], ["automationEnabledAfterReport", myReport.automationEnabledAfterReport], ["publishingEnabledAfterReport", myReport.publishingEnabledAfterReport]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><span className="text-tg-muted">{l}: </span><b className="text-emerald-300">{String(v)}</b></div>)}</div></Card></div></div>
    </main></div>;
  }

  return (
    <div className="fixed inset-0 z-[81] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🧪 RUNTIME DRY-RUN SIMULATOR v1</div>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">PREVIEW_ONLY</span>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">SIMULATION EXECUTES NOTHING</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={() => { navigator.clipboard?.writeText(exportJSON()); flash("JSON скопирован"); }} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Copy JSON</button>
          <button onClick={() => download("runtime-dry-run-simulator-v1.json", exportJSON(), "application/json")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export JSON</button>
          <button onClick={() => download("runtime-dry-run-simulator-v1.md", toMarkdown(), "text/markdown")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export Markdown</button>
          <button onClick={resetDemo} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Reset Demo</button>
        </div>
      </header>
      <div className="border-b border-tg-line bg-tg-panel/60 px-4 py-2">{safetyBar}</div>
      <div className="flex flex-wrap gap-1 border-b border-tg-line bg-tg-panel px-3 py-1.5">{MODES.map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{label}</button>)}</div>
      {mode === "simulation_dashboard" && <Dashboard />}
      {mode === "steps" && <Steps />}
      {mode === "adapters" && <Adapters />}
      {mode === "contracts" && <Contracts />}
      {mode === "failures" && <Failures />}
      {mode === "rollback" && <Rollback />}
      {mode === "handoff" && <Handoff />}
      {mode === "report" && <Report />}
      <footer className="border-t border-tg-line bg-tg-panel px-4 py-1.5"><div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="font-black uppercase tracking-wider text-tg-accent">Summary:</span>{[["Simulations", st.simulations.length], ["Steps", st.dryRunSteps.length], ["Adapters", st.adapterCapabilityMap.length], ["Contracts", st.ioContracts.length], ["Failures", st.failureScenarios.length], ["Rollbacks", st.rollbackPlans.length], ["Handoffs", st.operatorHandoffs.length], ["Reports", st.simulationReports.length], ["Linked", st.linkedSources.length]].map(([l, v]) => <span key={l as string} className="rounded-full bg-tg-bg px-2.5 py-1">{l}: <b>{v}</b></span>)}<span className="rounded-full bg-red-500/15 px-2.5 py-1 font-bold text-red-300">Dry-run only · executes nothing</span></div></footer>
      {toast && <div className="fixed bottom-6 left-1/2 z-[82] -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}
