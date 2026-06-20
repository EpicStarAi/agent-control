"use client";

// RUNTIME GATE REQUEST BUILDER v1 — governance builder for FUTURE activation requests.
// PREVIEW_ONLY · LOCAL_STORAGE_ONLY. Preview approval executes NOTHING: no runtime/ADB/RPA/install/login/publish/device control.
// UI + localStorage + mock + preview/export ONLY. Additive. Reads other modules read-only.

import { useEffect, useState } from "react";

const LS = "deepinside.runtimeGate.requestBuilder.v1";
const SAFETY = {
  mode: "PREVIEW_ONLY", execution_allowed: false, network_calls: false, automation: false, rpa_allowed: false, adb_allowed: false,
  runtime_enabled: false, external_platform_actions: false, credentials_required: false, credentials_stored: false, account_creation_allowed: false,
  publishing_allowed: false, app_install_allowed: false, device_control_allowed: false, screen_control_allowed: false, proxy_secret_storage_allowed: false,
  vpn_secret_storage_allowed: false, fingerprint_spoofing_allowed: false, anti_fraud_bypass_allowed: false, real_android_control_connected: false,
};
const MODES: [string, string][] = [
  ["gate_request_dashboard", "🛂 Gate Requests"], ["scope", "🎯 Activation Scope"], ["evidence", "📎 Evidence Packet"],
  ["approval", "📋 Approval Checklist"], ["risk", "⚠ Risk Assessment"], ["decision", "🗂 Decision Board"], ["policy", "🔒 Runtime Policy Matrix"],
];
const DEC_COLS = ["Draft", "Needs Review", "Blocked", "Approved Preview Only", "Rejected"];

function nowISO() { return new Date().toISOString(); }
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

const PERSONAS = [
  { persona: "EVA NOVIKOVA", id: "eva", device: "EVA-CLOUD-ANDROID-01", deviceId: "dev_1", asg: "asg_1", apps: ["Telegram", "YouTube", "TikTok"], score: 72, status: "NEEDS_REVIEW" },
  { persona: "BUCH", id: "buch", device: "BUCH-OPERATOR-ANDROID-01", deviceId: "dev_2", asg: "asg_2", apps: ["Telegram", "GitHub"], score: 58, status: "NEEDS_REVIEW" },
  { persona: "BUCHIHA", id: "buchiha", device: "BUCHIHA-MEDIA-ANDROID-01", deviceId: "dev_3", asg: "asg_3", apps: ["TikTok", "Instagram", "CapCut"], score: 70, status: "NEEDS_REVIEW" },
  { persona: "AI REPORTER", id: "reporter", device: "AI-REPORTER-ANDROID-01", deviceId: "dev_4", asg: "asg_4", apps: ["Telegram", "YouTube"], score: 46, status: "DRAFT" },
  { persona: "AI NEWSCASTER", id: "newscaster", device: "AI-NEWSCASTER-ANDROID-01", deviceId: "dev_5", asg: "asg_5", apps: ["YouTube", "Radio"], score: 50, status: "DRAFT" },
  { persona: "NOVA", id: "nova", device: "NOVA-TEST-ANDROID-01", deviceId: "dev_6", asg: "asg_6", apps: ["Test App Stack"], score: 28, status: "BLOCKED" },
];
const PROHIBITED = ["real ADB control", "real RPA execution", "automatic publishing", "account creation", "credential storage", "proxy/vpn secret storage", "fingerprint spoofing", "anti-fraud bypass", "unattended login", "external platform actions"];
const POLICY_ROWS = ["ADB Control", "RPA Execution", "App Install", "Manual Login Tracking", "Credential Storage", "Proxy/VPN Secret Storage", "Publishing", "Account Creation", "Content Generation Runtime", "Media Rendering Runtime", "External Platform Actions", "Device Screen Control", "Fingerprint Spoofing", "Anti-Fraud Bypass"];

function buildDemo() {
  const SOURCES = ["world_identity_layer_v1", "deepinside.digitalHuman.factory.v1", "deepinside.androidCloud.lab.v1", "deepinside.operations.assignmentMatrix.v1", "deepinside.geelark.cloudPhoneCenter.v1", "deepinside.mediaFactory.canvas.v1", "deepinside.mediaFactory.orchestration.v1", "deepinside.contentRelease.control.v1"];
  const linkedSources = SOURCES.map((k) => ({ key: k, present: !!readLS(k), refs: readLS(k) ? "linked" : "demo" }));

  const gateRequests = PERSONAS.map((p, i) => ({ requestId: "gr_" + (i + 1), title: p.persona + " Runtime Gate Request", sourceAssignmentId: p.asg, persona: p.persona, identityId: p.id, deviceId: p.deviceId, deviceName: p.device, appBundle: p.apps, contentPackageIds: ["pkg-" + (i + 1)], releaseDossierIds: ["dossier-" + (i + 1)], activationReadinessId: "rdy_" + (i + 1), requestedScope: "preview-activation review", requestedCapabilities: ["manual setup", "content preview"], readinessScore: p.score, requestStatus: p.status === "BLOCKED" ? "BLOCKED" : p.status, blockers: p.status === "BLOCKED" ? ["device blocked", "no readiness"] : ["manual review pending"], requiredManualApprovals: ["identity", "device", "compliance", "consent"], safetyMode: "PREVIEW_ONLY", createdAt: "2026-06-18", updatedAt: nowISO() }));

  const activationScopes = PERSONAS.map((p, i) => ({ scopeId: "sc_" + (i + 1), requestId: "gr_" + (i + 1), scopeTitle: p.persona + " activation scope", allowedPreviewCapabilities: ["preview content", "manual review", "read-only inspection"], prohibitedCapabilities: PROHIBITED, requestedFutureCapabilities: ["manual-supervised radio segment"], externalPlatformActionsRequested: false, automationRequested: false, publishingRequested: false, deviceControlRequested: false, credentialAccessRequested: false, riskLevel: ["MEDIUM", "MEDIUM", "MEDIUM", "LOW", "LOW", "CRITICAL"][i], status: p.status === "BLOCKED" ? "BLOCKED" : "NEEDS_REVIEW" }));

  const EV_TYPES = ["IDENTITY", "PERSONA", "DEVICE", "APP_STACK", "CONTENT", "RELEASE", "APPROVAL", "BLOCKER", "SAFETY"];
  const EV_SRC: Record<string, string> = { IDENTITY: "world_identity_layer_v1", PERSONA: "deepinside.digitalHuman.factory.v1", DEVICE: "deepinside.androidCloud.lab.v1", APP_STACK: "deepinside.androidCloud.lab.v1", CONTENT: "deepinside.mediaFactory.canvas.v1", RELEASE: "deepinside.contentRelease.control.v1", APPROVAL: "deepinside.operations.assignmentMatrix.v1", BLOCKER: "deepinside.operations.assignmentMatrix.v1", SAFETY: "runtime_gate_builder" };
  const evidencePackets: any[] = [];
  PERSONAS.slice(0, 3).forEach((p, pi) => { EV_TYPES.slice(0, 6).forEach((et, j) => { const present = readLS(EV_SRC[et]); evidencePackets.push({ evidenceId: "ev_" + (pi * 6 + j + 1), requestId: "gr_" + (pi + 1), sourceModule: EV_SRC[et].split(".").pop(), sourceKey: EV_SRC[et], linkedItemId: p.id, evidenceType: et, title: et + " · " + p.persona, summary: "Evidence from " + EV_SRC[et].split(".").pop() + " (preview).", status: present ? "PRESENT" : j === 4 ? "NEEDS_REVIEW" : "PRESENT", previewJson: { type: et, persona: p.persona } }); }); });

  const CHECKS = [["Identity ownership confirmed", "Identity"], ["Persona review completed", "Persona"], ["Device passport reviewed", "Device"], ["App stack manual setup confirmed", "Device"], ["No credentials stored", "Security"], ["Consent review completed", "Consent"], ["Copyright review completed", "Copyright"], ["Platform policy review completed", "Platform"], ["Manual content review completed", "Content"], ["Runtime scope reviewed", "Runtime"], ["External actions blocked", "Compliance"], ["Publishing disabled", "Compliance"], ["Automation disabled", "Runtime"]];
  const approvalChecks = CHECKS.slice(0, 12).map(([title, domain], i) => ({ checkId: "chk_" + (i + 1), requestId: "gr_" + ((i % 6) + 1), title, domain, required: true, status: i < 3 ? "PASSED_PREVIEW" : i === 11 ? "BLOCKED" : "PENDING", reviewerNotes: "", requiredManualAction: "human review required" }));

  const RISKS = [
    ["Runtime is disabled in current mode.", "Runtime", "CRITICAL"], ["Publishing is disabled.", "Publishing", "WARNING"], ["ADB/RPA are disabled.", "Automation", "CRITICAL"],
    ["Credentials must not be stored.", "Credentials", "CRITICAL"], ["Fingerprint spoofing is prohibited.", "Fingerprint", "CRITICAL"], ["Anti-fraud bypass is prohibited.", "AntiFraud", "CRITICAL"],
    ["Platform compliance review required.", "Platform", "WARNING"], ["Consent and copyright gates required.", "Consent", "WARNING"], ["Manual approval required before any activation.", "Runtime", "INFO"],
    ["Device screen control is disabled.", "Device", "CRITICAL"], ["Copyright review required for media.", "Copyright", "WARNING"], ["Legal review for impersonation safeguards.", "Legal", "WARNING"],
  ];
  const riskAssessments = RISKS.map(([title, domain, sev], i) => ({ riskId: "risk_" + (i + 1), requestId: "gr_" + ((i % 6) + 1), domain, severity: sev, title, description: "PREVIEW_ONLY governance constraint.", mitigationPreview: "manual review + separate runtime gate", blocksActivation: sev === "CRITICAL", canProceedInPreview: sev !== "CRITICAL" }));

  const decisionBoard = PERSONAS.map((p, i) => { const col = p.status === "BLOCKED" ? "Blocked" : i < 1 ? "Approved Preview Only" : i < 3 ? "Needs Review" : "Draft"; return { decisionId: "dec_" + (i + 1), requestId: "gr_" + (i + 1), title: p.persona + " decision", persona: p.persona, device: p.device, decisionStatus: col === "Approved Preview Only" ? "APPROVED_PREVIEW_ONLY" : col === "Blocked" ? "BLOCKED" : col === "Needs Review" ? "NEEDS_REVIEW" : "DRAFT", decisionReason: "preview governance", reviewerNotes: "", finalDecision: col === "Approved Preview Only" ? "APPROVED_PREVIEW_ONLY" : col === "Blocked" ? "BLOCKED" : "NOT_DECIDED", runtimeEnabledAfterDecision: false, automationEnabledAfterDecision: false, publishingEnabledAfterDecision: false, column: col }; });

  const runtimePolicyMatrix = POLICY_ROWS.map((row, i) => ({ rowId: "pol_" + (i + 1), capability: row, currentMode: "PREVIEW_ONLY", requested: false, allowedNow: false, requiredGate: "Separate Runtime Gate", finalStatus: ["App Install", "Manual Login Tracking", "Media Rendering Runtime", "Content Generation Runtime"].includes(row) ? "REQUIRES_SEPARATE_GATE" : "BLOCKED_IN_PREVIEW" }));

  return { ...SAFETY, gateRequests, activationScopes, evidencePackets, approvalChecks, riskAssessments, decisionBoard, runtimePolicyMatrix, linkedSources, selectedItemId: "gr_1", selectedMode: "gate_request_dashboard", updatedAt: nowISO() };
}
function loadState(): any { try { const s = JSON.parse(localStorage.getItem(LS) || "null"); if (s?.gateRequests?.length) return s; } catch {} return buildDemo(); }

const SC: Record<string, string> = { APPROVED_PREVIEW_ONLY: "#22c55e", "Approved Preview Only": "#22c55e", PASSED_PREVIEW: "#4ade80", PRESENT: "#4ade80", NEEDS_REVIEW: "#fbbf24", "Needs Review": "#fbbf24", PENDING: "#fbbf24", DRAFT: "#9ca3af", Draft: "#9ca3af", NOT_DECIDED: "#9ca3af", NOT_APPLICABLE: "#6b7280", MISSING: "#fb923c", BLOCKED: "#f87171", Blocked: "#f87171", BLOCKED_IN_PREVIEW: "#f87171", REJECTED: "#f87171", Rejected: "#f87171", REQUIRES_SEPARATE_GATE: "#fb923c", CRITICAL: "#f87171", WARNING: "#fbbf24", INFO: "#38bdf8", LOW: "#4ade80", MEDIUM: "#fbbf24", HIGH: "#fb923c" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (SC[s] || "#6b7280") + "22", color: SC[s] || "#9ca3af" }}>{s}</span>; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");

export function RuntimeGateRequestBuilder({ onClose }: { onClose: () => void }) {
  const [st, setSt] = useState<any>(loadState);
  const [mode, setMode] = useState<string>(st.selectedMode || "gate_request_dashboard");
  const [sel, setSel] = useState<string>(st.gateRequests[0]?.requestId || "");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1700); };

  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ ...st, ...SAFETY, selectedMode: mode, selectedItemId: sel, updatedAt: nowISO() })); } catch {} }, [st, mode, sel]);

  const gr = st.gateRequests.find((g: any) => g.requestId === sel) || st.gateRequests[0];
  const scope = st.activationScopes.find((s: any) => s.requestId === sel);
  const draft = st.gateRequests.filter((g: any) => g.requestStatus === "DRAFT").length;
  const review = st.gateRequests.filter((g: any) => g.requestStatus === "NEEDS_REVIEW").length;
  const blocked = st.gateRequests.filter((g: any) => g.requestStatus === "BLOCKED").length;
  const approved = st.decisionBoard.filter((d: any) => d.finalDecision === "APPROVED_PREVIEW_ONLY").length;

  function resetDemo() { setSt(buildDemo()); flash("Демо сброшено"); }
  function moveDecision(id: string, col: string) { setSt((s: any) => ({ ...s, decisionBoard: s.decisionBoard.map((d: any) => d.decisionId === id ? { ...d, column: col, decisionStatus: col === "Approved Preview Only" ? "APPROVED_PREVIEW_ONLY" : col === "Blocked" ? "BLOCKED" : col === "Rejected" ? "REJECTED" : col === "Needs Review" ? "NEEDS_REVIEW" : "DRAFT", finalDecision: col === "Approved Preview Only" ? "APPROVED_PREVIEW_ONLY" : col === "Blocked" ? "BLOCKED" : col === "Rejected" ? "REJECTED" : "NOT_DECIDED", runtimeEnabledAfterDecision: false, automationEnabledAfterDecision: false, publishingEnabledAfterDecision: false } : d) })); }
  function setCheck(id: string, status: string) { setSt((s: any) => ({ ...s, approvalChecks: s.approvalChecks.map((c: any) => c.checkId === id ? { ...c, status } : c) })); }

  function grMD(g: any) { return ["# Runtime Gate Request — " + g.title, "", "**Persona:** " + g.persona + " · **Identity:** " + g.identityId + " · **Device:** " + g.deviceName, "", "## Scope", "Requested: " + g.requestedScope + " · Capabilities: " + g.requestedCapabilities.join(", "), "", "## Status", "- Request: " + g.requestStatus, "- Readiness: " + g.readinessScore + "%", "- Blockers: " + (g.blockers.join("; ") || "—"), "- Required approvals: " + g.requiredManualApprovals.join(", "), "", "## Safety", "PREVIEW_ONLY · runtime/automation/publishing disabled · approval executes nothing · separate runtime gate required."].join("\n"); }
  function checklistMD() { const L = ["# Approval Checklist", ""]; st.approvalChecks.forEach((c: any) => L.push(`- [${c.status}] (${c.domain}) ${c.title}`)); return L.join("\n"); }
  function policyMD() { const L = ["# Runtime Policy Matrix", "", "| Capability | Current | Requested | Allowed Now | Required Gate | Final |", "|---|---|---|---|---|---|"]; st.runtimePolicyMatrix.forEach((p: any) => L.push(`| ${p.capability} | ${p.currentMode} | ${p.requested} | ${p.allowedNow} | ${p.requiredGate} | ${p.finalStatus} |`)); return L.join("\n"); }
  function toMarkdown() {
    const L: string[] = ["# RUNTIME GATE REQUEST BUILDER v1", "", "**Mode:** PREVIEW_ONLY · Preview approval executes NOTHING.", ""];
    L.push("## Gate Request Dashboard"); st.gateRequests.forEach((g: any) => L.push(`- ${g.title}: ${g.persona} → ${g.deviceName} · ${g.requestStatus} · ${g.readinessScore}%`)); L.push("");
    L.push("## Activation Scopes"); st.activationScopes.forEach((s: any) => L.push(`- ${s.scopeTitle}: risk ${s.riskLevel} · ${s.status} · prohibited: ${s.prohibitedCapabilities.length}`)); L.push("");
    L.push("## Evidence Packet (" + st.evidencePackets.length + ")"); st.evidencePackets.forEach((e: any) => L.push(`- [${e.evidenceType}] ${e.title} · ${e.status} (${e.sourceModule})`)); L.push("");
    L.push("## Approval Checklist"); st.approvalChecks.forEach((c: any) => L.push(`- [${c.status}] ${c.title}`)); L.push("");
    L.push("## Risk Assessment"); st.riskAssessments.forEach((r: any) => L.push(`- [${r.severity}/${r.domain}] ${r.title}`)); L.push("");
    L.push("## Decision Board"); st.decisionBoard.forEach((d: any) => L.push(`- ${d.title}: ${d.finalDecision} (runtime after: ${d.runtimeEnabledAfterDecision})`)); L.push("");
    L.push("## Runtime Policy Matrix"); st.runtimePolicyMatrix.forEach((p: any) => L.push(`- ${p.capability}: allowed ${p.allowedNow} · ${p.finalStatus}`)); L.push("");
    L.push("## Linked Sources"); st.linkedSources.forEach((s: any) => L.push(`- ${s.key}: ${s.present ? "linked" : "demo"}`)); L.push("");
    L.push("## Safety Confirmation", ...Object.entries(SAFETY).map(([k, v]) => `- ${k}: ${v}`), "- preview_approval_executes_nothing: true", "- manual_review_required: true", "- separate_runtime_gate_required: true", "");
    L.push("## Future Activation Checklist (NOT active)", "- [ ] Complete all manual approvals", "- [ ] Pass platform compliance & consent/copyright gates", "- [ ] Confirm no credentials/secrets stored", "- [ ] Submit SEPARATE Runtime Gate (out of preview)", "- [ ] Human sign-off before any real action");
    return L.join("\n");
  }
  function exportJSON() { return JSON.stringify({ name: "RUNTIME_GATE_REQUEST_BUILDER_V1", ...st, ...SAFETY, updatedAt: nowISO() }, null, 2); }
  function download(name: string, content: string, type: string) { const b = new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); flash("Экспорт: " + name); }

  const safetyBar = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-tg-muted sm:grid-cols-3 lg:grid-cols-5">
      {[["Mode", "PREVIEW_ONLY"], ["Execution", "false"], ["Runtime", "false"], ["ADB", "false"], ["RPA", "false"], ["Automation", "false"], ["Publishing", "false"], ["Account Creation", "false"], ["App Install", "false"], ["Device Control", "false"], ["Screen Control", "false"], ["Credentials Stored", "false"], ["External Actions", "false"], ["Fingerprint Spoofing", "false"], ["Anti-Fraud Bypass", "false"], ["Preview Approval Executes Nothing", "true"], ["Manual Review", "REQUIRED"], ["Separate Runtime Gate", "REQUIRED"]].map(([l, v]) => <div key={l}><span>{l}: </span><b className={v === "REQUIRED" || v === "true" ? "text-amber-300" : "text-emerald-300"}>{v}</b></div>)}
    </div>
  );
  const reqList = <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Gate Requests</div>{st.gateRequests.map((g: any) => <button key={g.requestId} onClick={() => setSel(g.requestId)} className={`mb-1 w-full rounded-xl border px-2.5 py-2 text-left ${sel === g.requestId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><div className="truncate text-[12px] font-semibold">{g.persona}</div><div className="mt-0.5 flex items-center gap-1 text-[10px] text-tg-muted">{g.readinessScore}% · <Chip s={g.requestStatus} /></div></button>)}</nav>;

  function Inspector() {
    return <aside className="min-h-0 w-80 shrink-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Gate Request Inspector</div><div className="text-sm font-bold">{gr.title}</div><div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">{[["Persona", gr.persona], ["Identity", gr.identityId], ["Device", gr.deviceName], ["Readiness", gr.readinessScore + "%"], ["Status", gr.requestStatus], ["Scope", gr.requestedScope]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div><div className="mt-1 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Apps:</b> {gr.appBundle.join(", ")}</div>{gr.blockers.length ? <div className="mt-1 rounded border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-300"><b>Blockers:</b> {gr.blockers.join("; ")}</div> : null}<div className="mt-1 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Required approvals:</b> {gr.requiredManualApprovals.join(", ")}</div><div className="mt-2 flex gap-1.5"><button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(gr, null, 2)); flash("Gate Request JSON скопирован"); }} className="rounded bg-tg-bg px-2 py-1 text-[10px]">Copy</button><button onClick={() => download(gr.requestId + ".json", JSON.stringify(gr, null, 2), "application/json")} className="rounded bg-tg-bg px-2 py-1 text-[10px]">JSON</button><button onClick={() => download(gr.requestId + ".md", grMD(gr), "text/markdown")} className="rounded bg-tg-bg px-2 py-1 text-[10px]">MD</button></div><pre className="mt-2 max-h-40 overflow-auto rounded bg-black/50 p-2 text-[10px] text-emerald-200">{JSON.stringify(gr, null, 2)}</pre></aside>;
  }

  function Dashboard() {
    return <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]"><main className="min-h-0 overflow-auto p-3">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{[["Requests", st.gateRequests.length], ["Draft", draft], ["Needs Review", review, "#fbbf24"], ["Blocked", blocked, "#f87171"], ["Approved Preview", approved, "#22c55e"], ["Runtime Enabled", "false", "#4ade80"], ["Automation", "false", "#4ade80"], ["Publishing", "false", "#4ade80"], ["External Actions", "false", "#4ade80"]].map(([l, v, c]) => <div key={l as string} className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-lg font-black" style={{ color: c as string }}>{v}</div></div>)}</div>
      <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] font-bold text-amber-300">Preview approval does not execute, publish, login, install apps, or control devices.</div>
      <div className="grid gap-2 sm:grid-cols-2">{st.gateRequests.map((g: any) => <button key={g.requestId} onClick={() => setSel(g.requestId)} className={`rounded-xl border p-3 text-left ${sel === g.requestId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full text-sm" style={{ background: av(g.persona) }}>🛂</div><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold">{g.title}</div><div className="text-[10px] text-tg-muted">{g.deviceName}</div></div><Chip s={g.requestStatus} /></div><div className="mt-1 flex items-center gap-2 text-[10px]"><div className="h-1.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: g.readinessScore + "%" }} /></div><b>{g.readinessScore}%</b></div></button>)}</div>
    </main>{Inspector()}</div>;
  }
  function Scope() {
    if (!scope) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">{reqList}<main className="min-h-0 overflow-auto p-3"><Card t={"Activation Scope · " + gr.persona}><div className="grid gap-2 lg:grid-cols-2"><div className="rounded-lg bg-emerald-500/10 p-2 text-[12px]"><b className="text-emerald-300">Allowed (preview):</b><div className="mt-1 flex flex-wrap gap-1">{scope.allowedPreviewCapabilities.map((c: string) => <span key={c} className="rounded bg-tg-bg px-1.5 py-0.5 text-tg-muted">{c}</span>)}</div></div><div className="rounded-lg bg-red-500/10 p-2 text-[12px]"><b className="text-red-300">Prohibited:</b><div className="mt-1 flex flex-wrap gap-1">{scope.prohibitedCapabilities.map((c: string) => <span key={c} className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-300">{c}</span>)}</div></div></div><div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-3">{[["External Actions", scope.externalPlatformActionsRequested], ["Automation", scope.automationRequested], ["Publishing", scope.publishingRequested], ["Device Control", scope.deviceControlRequested], ["Credential Access", scope.credentialAccessRequested]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l} requested</div><b className="text-emerald-300">{String(v)}</b></div>)}<div className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">Risk</div><Chip s={scope.riskLevel} /></div></div><div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300">Все реальные capabilities BLOCKED / NOT_ALLOWED в preview. Запрашиваются только будущие, под manual + Runtime Gate.</div></Card></main></div>;
  }
  function Evidence() {
    const mine = st.evidencePackets.filter((e: any) => e.requestId === sel);
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">{reqList}<main className="min-h-0 overflow-auto p-3"><Card t={"Evidence Packet · " + gr.persona + " (" + mine.length + ")"}><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Type", "Title", "Source", "Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{(mine.length ? mine : st.evidencePackets.slice(0, 6)).map((e: any) => <tr key={e.evidenceId} className="border-t border-tg-line"><td className="px-2 py-1.5"><span className="rounded bg-tg-bg px-1.5 py-0.5 text-[9px] text-tg-accent">{e.evidenceType}</span></td><td className="px-2 font-semibold">{e.title}</td><td className="px-2 text-tg-muted">{e.sourceModule}</td><td className="px-2"><Chip s={e.status} /></td></tr>)}</tbody></table><div className="mt-2 text-[10px] text-tg-muted">Доказательства собираются read-only из предыдущих слоёв. Всего evidence: {st.evidencePackets.length}.</div></Card></main></div>;
  }
  function Approval() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="mb-2 flex justify-end"><button onClick={() => download("approval-checklist.md", checklistMD(), "text/markdown")} className="rounded bg-tg-bg px-2.5 py-1 text-[11px] hover:text-white">Export Checklist MD</button></div><Card t="Approval Checklist"><div className="space-y-1">{st.approvalChecks.map((c: any) => <div key={c.checkId} className="flex items-center gap-2 rounded-lg bg-tg-bg/40 px-3 py-1.5 text-[12px]"><span className="flex-1">{c.title}</span><span className="text-[10px] text-tg-muted">{c.domain}</span><Chip s={c.status} /><div className="flex gap-0.5">{["PENDING", "PASSED_PREVIEW", "BLOCKED"].map((s) => <button key={s} onClick={() => setCheck(c.checkId, s)} className="rounded bg-tg-bg px-1 py-0.5 text-[8px] text-tg-muted hover:bg-tg-active hover:text-white" title={s}>{s.split("_")[0].slice(0, 4)}</button>)}</div></div>)}</div><div className="mt-2 text-[10px] text-tg-muted">PASSED_PREVIEW = пройдено в preview-режиме, не реальная активация.</div></Card></main>;
  }
  function Risk() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2">{st.riskAssessments.map((r: any) => <Card key={r.riskId}><div className="flex items-center gap-2"><Chip s={r.severity} /><span className="text-[10px] uppercase text-tg-muted">{r.domain}</span></div><div className="mt-1 text-[13px] font-semibold">{r.title}</div><div className="mt-0.5 text-[11px] text-tg-muted">{r.description} · Mitigation: {r.mitigationPreview}</div><div className="mt-1 text-[10px]">{r.blocksActivation ? <span className="text-red-300">blocks activation</span> : <span className="text-emerald-300">can proceed in preview</span>}</div></Card>)}</div></main>;
  }
  function Decision() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] font-bold text-amber-300">APPROVED_PREVIEW_ONLY не включает runtime. Preview approval does not execute, publish, login, install apps, or control devices.</div><div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{DEC_COLS.map((col) => <div key={col} className="rounded-xl border border-tg-line bg-tg-panel/60 p-2"><div className="mb-1 text-[10px] font-black uppercase tracking-wider" style={{ color: SC[col] }}>{col}</div><div className="space-y-1.5">{st.decisionBoard.filter((d: any) => d.column === col).map((d: any) => <div key={d.decisionId} className="rounded-lg bg-tg-bg/50 p-2"><div className="text-[11px] font-semibold">{d.persona}</div><div className="mt-0.5 text-[9px] text-tg-muted">{d.device}</div><div className="mt-0.5 text-[8px] text-red-300">runtime {String(d.runtimeEnabledAfterDecision)} · auto {String(d.automationEnabledAfterDecision)}</div><div className="mt-1 flex flex-wrap gap-0.5">{DEC_COLS.filter((c) => c !== col).map((c) => <button key={c} onClick={() => moveDecision(d.decisionId, c)} className="rounded bg-tg-bg px-1 py-0.5 text-[8px] text-tg-muted hover:bg-tg-active hover:text-white" title={"→ " + c}>{c.split(" ")[0]}</button>)}</div></div>)}{!st.decisionBoard.some((d: any) => d.column === col) && <div className="text-[9px] text-tg-muted">—</div>}</div></div>)}</div></main>;
  }
  function Policy() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="mb-2 flex justify-end"><button onClick={() => download("runtime-policy-matrix.md", policyMD(), "text/markdown")} className="rounded bg-tg-bg px-2.5 py-1 text-[11px] hover:text-white">Export Policy MD</button></div><Card t="Runtime Policy Matrix"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Capability", "Current Mode", "Requested", "Allowed Now", "Required Gate", "Final Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{st.runtimePolicyMatrix.map((p: any) => <tr key={p.rowId} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{p.capability}</td><td className="px-2 text-tg-muted">{p.currentMode}</td><td className="px-2 text-tg-muted">{String(p.requested)}</td><td className="px-2 text-emerald-300">{String(p.allowedNow)}</td><td className="px-2 text-tg-muted">{p.requiredGate}</td><td className="px-2"><Chip s={p.finalStatus} /></td></tr>)}</tbody></table><div className="mt-2 text-[10px] text-tg-muted">Все опасные действия: Allowed Now = false · Final = BLOCKED_IN_PREVIEW / REQUIRES_SEPARATE_GATE.</div></Card></main>;
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🛂 RUNTIME GATE REQUEST BUILDER v1</div>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">PREVIEW_ONLY</span>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">APPROVAL EXECUTES NOTHING</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={() => { navigator.clipboard?.writeText(exportJSON()); flash("JSON скопирован"); }} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Copy JSON</button>
          <button onClick={() => download("runtime-gate-request-builder-v1.json", exportJSON(), "application/json")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export JSON</button>
          <button onClick={() => download("runtime-gate-request-builder-v1.md", toMarkdown(), "text/markdown")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export Markdown</button>
          <button onClick={resetDemo} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Reset Demo</button>
        </div>
      </header>
      <div className="border-b border-tg-line bg-tg-panel/60 px-4 py-2">{safetyBar}</div>
      <div className="flex flex-wrap gap-1 border-b border-tg-line bg-tg-panel px-3 py-1.5">{MODES.map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{label}</button>)}</div>
      {mode === "gate_request_dashboard" && <Dashboard />}
      {mode === "scope" && <Scope />}
      {mode === "evidence" && <Evidence />}
      {mode === "approval" && <Approval />}
      {mode === "risk" && <Risk />}
      {mode === "decision" && <Decision />}
      {mode === "policy" && <Policy />}
      <footer className="border-t border-tg-line bg-tg-panel px-4 py-1.5"><div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="font-black uppercase tracking-wider text-tg-accent">Summary:</span>{[["Requests", st.gateRequests.length], ["Scopes", st.activationScopes.length], ["Evidence", st.evidencePackets.length], ["Approvals", st.approvalChecks.length], ["Risks", st.riskAssessments.length], ["Decisions", st.decisionBoard.length], ["Policy Rows", st.runtimePolicyMatrix.length], ["Linked", st.linkedSources.length]].map(([l, v]) => <span key={l as string} className="rounded-full bg-tg-bg px-2.5 py-1">{l}: <b>{v}</b></span>)}<span className="rounded-full bg-red-500/15 px-2.5 py-1 font-bold text-red-300">Runtime: 0 · Approval executes nothing</span></div></footer>
      {toast && <div className="fixed bottom-6 left-1/2 z-[81] -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}
