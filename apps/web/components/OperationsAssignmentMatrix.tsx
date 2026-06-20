"use client";

// OPERATIONS ASSIGNMENT MATRIX v1 — dispatcher linking personas ↔ devices ↔ apps ↔ content ↔ blockers ↔ approvals.
// PREVIEW_ONLY · LOCAL_STORAGE_ONLY. No runtime/ADB/RPA/clicks/install/login/secrets/publishing/account-creation/spoofing/anti-fraud.
// UI + localStorage + mock + preview/export ONLY. Additive. Reads other modules read-only.

import { useEffect, useState } from "react";

const LS = "deepinside.operations.assignmentMatrix.v1";
const SAFETY = {
  mode: "PREVIEW_ONLY", execution_allowed: false, network_calls: false, automation: false, rpa_allowed: false, adb_allowed: false,
  runtime_enabled: false, external_platform_actions: false, credentials_required: false, credentials_stored: false, account_creation_allowed: false,
  publishing_allowed: false, app_install_allowed: false, proxy_secret_storage_allowed: false, vpn_secret_storage_allowed: false,
  fingerprint_spoofing_allowed: false, anti_fraud_bypass_allowed: false, real_android_control_connected: false,
};
const MODES: [string, string][] = [
  ["assignment_dashboard", "🧭 Assignment Dashboard"], ["matrix", "📊 Persona → Device Matrix"], ["bundles", "📦 App Bundle Planner"],
  ["workload", "⚙ Workload Planner"], ["board", "🗂 Manual Operations Board"], ["blockers", "🛡 Blocker Aggregator"], ["readiness", "🚀 Activation Readiness"],
];
const BOARD_COLS = ["To Prepare", "Needs Review", "Blocked", "Ready Preview", "Approved Preview Only"];

function nowISO() { return new Date().toISOString(); }
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

function buildDemo() {
  const al = readLS("deepinside.androidCloud.lab.v1");
  const dh = readLS("deepinside.digitalHuman.factory.v1");
  const idl = readLS("world_identity_layer_v1");
  const linkedSources = [
    { key: "world_identity_layer_v1", present: !!idl, refs: (idl?.entities || []).length + " identities" },
    { key: "deepinside.digitalHuman.factory.v1", present: !!dh, refs: (dh?.personas || []).length + " personas" },
    { key: "deepinside.androidCloud.lab.v1", present: !!al, refs: (al?.devices || []).length + " devices" },
    { key: "deepinside.geelark.cloudPhoneCenter.v1", present: !!readLS("deepinside.geelark.cloudPhoneCenter.v1"), refs: "cloud phones" },
    { key: "deepinside.mediaFactory.canvas.v1", present: !!readLS("deepinside.mediaFactory.canvas.v1"), refs: "media canvas" },
    { key: "deepinside.mediaFactory.orchestration.v1", present: !!readLS("deepinside.mediaFactory.orchestration.v1"), refs: "release packages" },
    { key: "deepinside.contentRelease.control.v1", present: !!readLS("deepinside.contentRelease.control.v1"), refs: "release control" },
  ];

  const A = [
    { persona: "EVA NOVIKOVA", identityId: "eva", deviceId: "dev_1", deviceName: "EVA-CLOUD-ANDROID-01", deviceType: "CLOUD_PHONE", appBundle: ["Telegram", "YouTube", "TikTok", "EPIC GRAM"], title: "EVA Radio Intro", content: ["pkg-001"], status: "READY_PREVIEW_ONLY", score: 72 },
    { persona: "BUCH", identityId: "buch", deviceId: "dev_2", deviceName: "BUCH-OPERATOR-ANDROID-01", deviceType: "VPS_ANDROID", appBundle: ["Telegram", "GitHub", "Deepinside PWA"], title: "Operator Control", content: ["pkg-002"], status: "NEEDS_REVIEW", score: 58 },
    { persona: "BUCHIHA", identityId: "buchiha", deviceId: "dev_3", deviceName: "BUCHIHA-MEDIA-ANDROID-01", deviceType: "CLOUD_PHONE", appBundle: ["TikTok", "Instagram", "CapCut"], title: "Short Video Package", content: ["pkg-003"], status: "READY_PREVIEW_ONLY", score: 70 },
    { persona: "AI REPORTER", identityId: "reporter", deviceId: "dev_4", deviceName: "AI-REPORTER-ANDROID-01", deviceType: "EMULATOR", appBundle: ["Telegram", "YouTube", "Deepinside PWA"], title: "News Preview", content: ["pkg-004"], status: "DRAFT", score: 46 },
    { persona: "AI NEWSCASTER", identityId: "newscaster", deviceId: "dev_5", deviceName: "AI-NEWSCASTER-ANDROID-01", deviceType: "EMULATOR", appBundle: ["YouTube", "Radio", "OBS Preview"], title: "Broadcast Preview", content: ["pkg-005"], status: "NEEDS_REVIEW", score: 50 },
    { persona: "NOVA", identityId: "nova", deviceId: "dev_6", deviceName: "NOVA-TEST-ANDROID-01", deviceType: "TEST_DEVICE", appBundle: ["Test App Stack"], title: "Sandbox Test", content: [], status: "BLOCKED", score: 28 },
  ];
  const assignments = A.map((a, i) => ({ assignmentId: "asg_" + (i + 1), title: a.title, persona: a.persona, identityId: a.identityId, deviceId: a.deviceId, deviceName: a.deviceName, deviceType: a.deviceType, appBundle: a.appBundle, contentPackageIds: a.content, releaseDossierIds: a.content.length ? ["dossier-" + (i + 1)] : [], activationDossierId: "dos_" + (i + 1), readinessScore: a.score, assignmentStatus: a.status, blockers: a.status === "BLOCKED" ? ["device blocked", "no content package"] : a.status === "NEEDS_REVIEW" ? ["manual review pending"] : [], requiredManualSteps: ["manual setup", "manual login", "compliance review"], safetyMode: "PREVIEW_ONLY", createdAt: "2026-06-18", updatedAt: nowISO() }));
  const personaDeviceMatrix = A.map((a, i) => ({ persona: a.persona, identityStatus: idl?.entities?.includes(a.identityId) ? "READY_PREVIEW_ONLY" : "NEEDS_REVIEW", device: a.deviceName, deviceStatus: a.status === "BLOCKED" ? "BLOCKED" : a.status === "DRAFT" ? "NEEDS_REVIEW" : "READY_PREVIEW_ONLY", appStackStatus: i < 3 ? "READY_PREVIEW_ONLY" : "NEEDS_REVIEW", networkStatus: a.status === "BLOCKED" ? "BLOCKED" : "NEEDS_REVIEW", manualSetup: i < 2 ? "READY_PREVIEW_ONLY" : "NEEDS_REVIEW", compliance: a.status === "BLOCKED" ? "BLOCKED" : "NEEDS_REVIEW", runtimeGate: "NOT_REQUESTED", finalStatus: a.status }));
  const BUNDLES = [
    { title: "Social Publishing Preview Bundle", purpose: "соц-публикации (preview)", apps: ["Telegram", "TikTok", "Instagram", "YouTube"], personas: ["EVA NOVIKOVA", "BUCHIHA"], devices: ["dev_1", "dev_3"] },
    { title: "Radio Host Bundle", purpose: "радио-эфир", apps: ["EPIC GRAM", "Radio", "OBS Preview"], personas: ["EVA NOVIKOVA", "BUCH"], devices: ["dev_1"] },
    { title: "Newsroom Bundle", purpose: "новости", apps: ["Telegram", "YouTube", "Deepinside PWA"], personas: ["AI REPORTER", "AI NEWSCASTER"], devices: ["dev_4", "dev_5"] },
    { title: "Operator Bundle", purpose: "оператор/админ", apps: ["Telegram", "GitHub", "Deepinside PWA"], personas: ["BUCH"], devices: ["dev_2"] },
    { title: "Media Editing Bundle", purpose: "монтаж", apps: ["CapCut", "Canva"], personas: ["BUCHIHA"], devices: ["dev_3"] },
    { title: "Test Lab Bundle", purpose: "эксперименты", apps: ["Test App Stack"], personas: ["NOVA"], devices: ["dev_6"] },
  ];
  const appBundles = BUNDLES.map((b, i) => ({ bundleId: "bun_" + (i + 1), title: b.title, purpose: b.purpose, apps: b.apps, requiredForPersonas: b.personas, requiredForDevices: b.devices, installMode: "MANUAL_ONLY", loginMode: "MANUAL_ONLY", automationAllowed: false, publishingAllowed: false, blockers: ["manual install only", "no auto-login"], futureActivationChecklist: ["manual install", "manual login", "compliance", "runtime gate"] }));
  const workloadPlans = Array.from({ length: 8 }).map((_, i) => { const a = assignments[i % assignments.length]; const risk = ["LOW", "MEDIUM", "HIGH", "CRITICAL"][i % 4]; return { workloadId: "wl_" + (i + 1), assignmentId: a.assignmentId, title: a.title + " · workload " + (i + 1), contentType: ["radio_intro", "short_video", "news", "broadcast", "operator", "test"][i % 6], expectedManualTasks: ["install", "login", "review", "approve"], estimatedManualTime: (10 + i * 5) + "-" + (25 + i * 5) + " min", priority: ["NORMAL", "HIGH", "LOW"][i % 3], riskLevel: risk, status: a.assignmentStatus === "BLOCKED" ? "BLOCKED" : i < 3 ? "READY_PREVIEW_ONLY" : "NEEDS_REVIEW", notes: "preview plan only · no scheduler" }; });
  const TASK_TYPES = ["APP_INSTALL", "MANUAL_LOGIN", "COMPLIANCE_REVIEW", "CONSENT_REVIEW", "CONTENT_REVIEW", "DEVICE_CHECK", "RUNTIME_GATE_REQUEST"];
  const colFor = (i: number) => BOARD_COLS[i % BOARD_COLS.length];
  const manualOperationsBoard = Array.from({ length: 10 }).map((_, i) => { const a = assignments[i % assignments.length]; const status = colFor(i); return { taskId: "task_" + (i + 1), title: TASK_TYPES[i % TASK_TYPES.length].replace(/_/g, " ") + " · " + a.persona, linkedAssignmentId: a.assignmentId, persona: a.persona, device: a.deviceName, taskType: TASK_TYPES[i % TASK_TYPES.length], status, reviewerNotes: "", requiredManualAction: "human action required", automationAllowed: false, finalStatus: status === "Approved Preview Only" ? "APPROVED_PREVIEW_ONLY" : status === "Blocked" ? "BLOCKED" : "REVIEW_REQUIRED" }; });
  const BLK = [
    ["ADB execution is disabled.", "Device", "CRITICAL"], ["App install is manual-only.", "App", "WARNING"], ["Publishing is disabled in PREVIEW_ONLY mode.", "Publishing", "WARNING"],
    ["Runtime Gate not requested.", "Runtime", "INFO"], ["Credentials must not be stored.", "Credentials", "CRITICAL"], ["Voice/face consent review required.", "Consent", "WARNING"],
    ["Platform compliance review required.", "Platform", "WARNING"], ["Account creation cannot be automated.", "Automation", "CRITICAL"], ["Fingerprint spoofing is disabled.", "Device", "CRITICAL"],
    ["Anti-fraud bypass is prohibited.", "Platform", "CRITICAL"], ["Network secrets must not be stored.", "Network", "CRITICAL"], ["Identity linkage needs manual confirmation.", "Identity", "INFO"],
  ];
  const blockers = BLK.map(([title, domain, sev], i) => { const a = assignments[i % assignments.length]; return { blockerId: "blk_" + (i + 1), title, sourceModule: ["Android Cloud Lab", "Android Cloud Lab", "Release Control", "Operations", "Identity Layer", "Digital Human Factory", "Media Orchestration", "Operations", "Android Cloud Lab", "Operations", "Android Cloud Lab", "Identity Layer"][i], domain, severity: sev, linkedAssignmentId: a.assignmentId, linkedPersona: a.persona, linkedDevice: a.deviceName, reason: "PREVIEW_ONLY safety constraint", requiredManualAction: "manual review / human action", canProceedInPreview: sev !== "CRITICAL", blocksRuntimeActivation: sev === "CRITICAL" }; });
  const activationReadiness = assignments.map((a, i) => ({ readinessId: "rdy_" + (i + 1), assignmentId: a.assignmentId, persona: a.persona, device: a.deviceName, readyItems: ["persona profile", "device profile", "app bundle (manual)", "network profile (no secrets)"], blockedItems: ["credentials", "automation", "ADB", "publishing"], requiredApprovals: ["manual setup", "compliance", "consent"], runtimeGateStatus: "NOT_REQUESTED", activationStatus: "LOCKED_UNTIL_RUNTIME_GATE", finalDecision: a.assignmentStatus === "BLOCKED" ? "BLOCKED" : a.assignmentStatus === "READY_PREVIEW_ONLY" ? "READY_FOR_MANUAL_REVIEW" : "NOT_READY", readinessScore: a.readinessScore }));

  return { ...SAFETY, assignments, personaDeviceMatrix, appBundles, workloadPlans, manualOperationsBoard, blockers, activationReadiness, linkedSources, selectedItemId: "asg_1", selectedMode: "assignment_dashboard", updatedAt: nowISO() };
}
function loadState(): any { try { const s = JSON.parse(localStorage.getItem(LS) || "null"); if (s?.assignments?.length) return s; } catch {} return buildDemo(); }

const SC: Record<string, string> = { READY_PREVIEW_ONLY: "#4ade80", "Ready Preview": "#4ade80", READY_FOR_MANUAL_REVIEW: "#38bdf8", APPROVED_PREVIEW_ONLY: "#22c55e", "Approved Preview Only": "#22c55e", NEEDS_REVIEW: "#fbbf24", "Needs Review": "#fbbf24", "To Prepare": "#9ca3af", DRAFT: "#9ca3af", NOT_REQUESTED: "#9ca3af", DISABLED: "#9ca3af", NOT_READY: "#fb923c", BLOCKED: "#f87171", Blocked: "#f87171", CRITICAL: "#f87171", WARNING: "#fbbf24", INFO: "#38bdf8", LOW: "#4ade80", NORMAL: "#38bdf8", MEDIUM: "#fbbf24", HIGH: "#fb923c", LOCKED_UNTIL_RUNTIME_GATE: "#fb923c", REVIEW_REQUIRED: "#fbbf24" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (SC[s] || "#6b7280") + "22", color: SC[s] || "#9ca3af" }}>{s}</span>; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");

export function OperationsAssignmentMatrix({ onClose }: { onClose: () => void }) {
  const [st, setSt] = useState<any>(loadState);
  const [mode, setMode] = useState<string>(st.selectedMode || "assignment_dashboard");
  const [sel, setSel] = useState<string>(st.assignments[0]?.assignmentId || "");
  const [selKind, setSelKind] = useState<string>("Assignment");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1700); };

  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ ...st, ...SAFETY, selectedMode: mode, selectedItemId: sel, updatedAt: nowISO() })); } catch {} }, [st, mode, sel]);

  const asg = st.assignments.find((a: any) => a.assignmentId === sel) || st.assignments[0];
  const readyCount = st.assignments.filter((a: any) => a.assignmentStatus === "READY_PREVIEW_ONLY").length;
  const blockedCount = st.assignments.filter((a: any) => a.assignmentStatus === "BLOCKED").length;
  const approvalsNeeded = st.manualOperationsBoard.filter((t: any) => t.status === "Needs Review" || t.status === "To Prepare").length;

  function resetDemo() { setSt(buildDemo()); flash("Демо сброшено"); }
  function moveTask(taskId: string, col: string) { setSt((s: any) => ({ ...s, manualOperationsBoard: s.manualOperationsBoard.map((t: any) => t.taskId === taskId ? { ...t, status: col, finalStatus: col === "Approved Preview Only" ? "APPROVED_PREVIEW_ONLY" : col === "Blocked" ? "BLOCKED" : "REVIEW_REQUIRED" } : t) })); }
  function setNote(taskId: string, note: string) { setSt((s: any) => ({ ...s, manualOperationsBoard: s.manualOperationsBoard.map((t: any) => t.taskId === taskId ? { ...t, reviewerNotes: note } : t) })); }

  function asgMD(a: any) { return ["# Assignment — " + a.title, "", "**Persona:** " + a.persona + " · **Identity:** " + a.identityId + " · **Device:** " + a.deviceName + " (" + a.deviceType + ")", "", "## Apps", a.appBundle.join(", "), "", "## Content / Release", "Packages: " + (a.contentPackageIds.join(", ") || "—") + " · Release: " + (a.releaseDossierIds.join(", ") || "—"), "", "## Status", "- Assignment: " + a.assignmentStatus, "- Readiness: " + a.readinessScore + "%", "- Blockers: " + (a.blockers.join("; ") || "—"), "- Required manual: " + a.requiredManualSteps.join(", "), "", "## Safety", "PREVIEW_ONLY · automation/ADB/publishing disabled · runtime gate required."].join("\n"); }
  function readinessMD() { const L: string[] = ["# Activation Readiness Map", ""]; st.activationReadiness.forEach((r: any) => { L.push("## " + r.persona + " → " + r.device); L.push("- Readiness: " + r.readinessScore + "% · Final: " + r.finalDecision); L.push("- Ready: " + r.readyItems.join(", ")); L.push("- Blocked: " + r.blockedItems.join(", ")); L.push("- Approvals: " + r.requiredApprovals.join(", ")); L.push("- Runtime Gate: " + r.runtimeGateStatus + " · " + r.activationStatus); L.push(""); }); return L.join("\n"); }
  function toMarkdown() {
    const L: string[] = ["# OPERATIONS ASSIGNMENT MATRIX v1", "", "**Mode:** PREVIEW_ONLY · LOCAL_STORAGE_ONLY", ""];
    L.push("## Assignment Dashboard"); st.assignments.forEach((a: any) => L.push(`- ${a.title}: ${a.persona} → ${a.deviceName} [${a.appBundle.join("/")}] · ${a.assignmentStatus} · ${a.readinessScore}%`)); L.push("");
    L.push("## Persona → Device Matrix"); st.personaDeviceMatrix.forEach((m: any) => L.push(`- ${m.persona} → ${m.device}: app ${m.appStackStatus}, net ${m.networkStatus}, compliance ${m.compliance}, final ${m.finalStatus}`)); L.push("");
    L.push("## App Bundle Planner"); st.appBundles.forEach((b: any) => L.push(`- ${b.title}: ${b.apps.join(", ")} · install ${b.installMode} · login ${b.loginMode}`)); L.push("");
    L.push("## Workload Planner"); st.workloadPlans.forEach((w: any) => L.push(`- ${w.title}: ${w.priority}/${w.riskLevel} · ${w.estimatedManualTime} · ${w.status}`)); L.push("");
    L.push("## Manual Operations Board"); st.manualOperationsBoard.forEach((t: any) => L.push(`- [${t.status}] ${t.title} (${t.taskType})`)); L.push("");
    L.push("## Blockers"); st.blockers.forEach((b: any) => L.push(`- [${b.severity}/${b.domain}] ${b.title} (${b.sourceModule})`)); L.push("");
    L.push("## Activation Readiness Map"); st.activationReadiness.forEach((r: any) => L.push(`- ${r.persona} → ${r.device}: ${r.finalDecision} · ${r.readinessScore}%`)); L.push("");
    L.push("## Linked Sources"); st.linkedSources.forEach((s: any) => L.push(`- ${s.key}: ${s.present ? "linked (" + s.refs + ")" : "not present (demo)"}`)); L.push("");
    L.push("## Safety Confirmation", ...Object.entries(SAFETY).map(([k, v]) => `- ${k}: ${v}`), "- manual_review_required: true", "- runtime_gate_required_for_activation: true", "");
    L.push("## Future Activation Checklist (NOT active)", "- [ ] Manual setup & app install", "- [ ] Manual login (no stored credentials)", "- [ ] Compliance & consent review", "- [ ] Confirm no automation/ADB/RPA", "- [ ] Request Runtime Gate (separate)");
    return L.join("\n");
  }
  function exportJSON() { return JSON.stringify({ name: "OPERATIONS_ASSIGNMENT_MATRIX_V1", ...st, ...SAFETY, updatedAt: nowISO() }, null, 2); }
  function download(name: string, content: string, type: string) { const b = new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); flash("Экспорт: " + name); }

  const safetyBar = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-tg-muted sm:grid-cols-3 lg:grid-cols-5">
      {[["Mode", "PREVIEW_ONLY"], ["Execution", "false"], ["Network Calls", "false"], ["Runtime", "false"], ["ADB", "false"], ["RPA", "false"], ["Automation", "false"], ["Publishing", "false"], ["Account Creation", "false"], ["App Install", "false"], ["Credentials Stored", "false"], ["External Platform Actions", "false"], ["Fingerprint Spoofing", "false"], ["Anti-Fraud Bypass", "false"], ["Real Android Control", "false"], ["Manual Review", "REQUIRED"], ["Runtime Gate (Activation)", "REQUIRED"]].map(([l, v]) => <div key={l}><span>{l}: </span><b className={v === "REQUIRED" ? "text-amber-300" : v === "false" ? "text-emerald-300" : "text-cyan-300"}>{v}</b></div>)}
    </div>
  );

  function Inspector() {
    return <aside className="min-h-0 w-80 shrink-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Operations Inspector</div><div className="text-[11px] text-tg-muted">{selKind}</div><div className="mt-1 text-sm font-bold">{asg.title}</div><div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">{[["Persona", asg.persona], ["Identity", asg.identityId], ["Device", asg.deviceName], ["Type", asg.deviceType], ["Readiness", asg.readinessScore + "%"], ["Status", asg.assignmentStatus]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div><div className="mt-2 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Apps:</b> {asg.appBundle.join(", ")}</div><div className="mt-1 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Content:</b> {asg.contentPackageIds.join(", ") || "—"} · <b className="text-tg-accent">Release:</b> {asg.releaseDossierIds.join(", ") || "—"}</div>{asg.blockers.length ? <div className="mt-1 rounded border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-300"><b>Blockers:</b> {asg.blockers.join("; ")}</div> : null}<div className="mt-1 rounded bg-tg-bg/40 p-2 text-[11px]"><b className="text-tg-accent">Required manual:</b> {asg.requiredManualSteps.join(", ")}</div><div className="mt-2 flex gap-1.5"><button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(asg, null, 2)); flash("Assignment JSON скопирован"); }} className="rounded bg-tg-bg px-2 py-1 text-[10px]">Copy</button><button onClick={() => download(asg.assignmentId + ".json", JSON.stringify(asg, null, 2), "application/json")} className="rounded bg-tg-bg px-2 py-1 text-[10px]">JSON</button><button onClick={() => download(asg.assignmentId + ".md", asgMD(asg), "text/markdown")} className="rounded bg-tg-bg px-2 py-1 text-[10px]">MD</button></div><div className="mt-2"><div className="mb-1 text-[10px] uppercase text-tg-muted">JSON preview</div><pre className="max-h-40 overflow-auto rounded bg-black/50 p-2 text-[10px] text-emerald-200">{JSON.stringify(asg, null, 2)}</pre></div></aside>;
  }

  function Dashboard() {
    return <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]"><main className="min-h-0 overflow-auto p-3">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{[["Personas", new Set(st.assignments.map((a: any) => a.persona)).size], ["Devices", new Set(st.assignments.map((a: any) => a.deviceId)).size], ["Assignments", st.assignments.length], ["Ready Preview", readyCount, "#4ade80"], ["Blocked", blockedCount, "#f87171"], ["Manual Approvals", approvalsNeeded, "#fbbf24"], ["Runtime Connected", 0, "#9ca3af"], ["Publishing", "false", "#4ade80"], ["Automation", "false", "#4ade80"]].map(([l, v, c]) => <div key={l as string} className="rounded-xl bg-tg-bg/40 px-3 py-2"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-lg font-black" style={{ color: c as string }}>{v}</div></div>)}</div>
      <div className="grid gap-2 sm:grid-cols-2">{st.assignments.map((a: any) => <button key={a.assignmentId} onClick={() => { setSel(a.assignmentId); setSelKind("Assignment"); }} className={`rounded-xl border p-3 text-left ${sel === a.assignmentId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full text-sm" style={{ background: av(a.persona) }}>🧭</div><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold">{a.title}</div><div className="text-[10px] text-tg-muted">{a.persona} → {a.deviceName}</div></div><Chip s={a.assignmentStatus} /></div><div className="mt-1 flex flex-wrap gap-1 text-[9px]">{a.appBundle.map((ap: string) => <span key={ap} className="rounded bg-tg-bg px-1.5 py-0.5 text-tg-muted">{ap}</span>)}</div><div className="mt-1 flex items-center gap-2 text-[10px]"><div className="h-1.5 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: a.readinessScore + "%" }} /></div><b>{a.readinessScore}%</b></div></button>)}</div>
    </main>{Inspector()}</div>;
  }
  function Matrix() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><Card t="Persona → Device Matrix"><div className="overflow-auto"><table className="w-full text-left text-[11px]"><thead className="text-tg-muted"><tr>{["Persona", "Identity", "Device", "Device", "App Stack", "Network", "Manual Setup", "Compliance", "Runtime Gate", "Final"].map((h, i) => <th key={i} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{st.personaDeviceMatrix.map((m: any, i: number) => <tr key={i} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{m.persona}</td><td className="px-2"><Chip s={m.identityStatus} /></td><td className="px-2 text-tg-muted">{m.device}</td><td className="px-2"><Chip s={m.deviceStatus} /></td><td className="px-2"><Chip s={m.appStackStatus} /></td><td className="px-2"><Chip s={m.networkStatus} /></td><td className="px-2"><Chip s={m.manualSetup} /></td><td className="px-2"><Chip s={m.compliance} /></td><td className="px-2"><Chip s={m.runtimeGate} /></td><td className="px-2"><Chip s={m.finalStatus} /></td></tr>)}</tbody></table></div></Card></main>;
  }
  function Bundles() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{st.appBundles.map((b: any) => <Card key={b.bundleId} t={b.title}><div className="text-[11px] text-tg-muted">{b.purpose}</div><div className="mt-1 flex flex-wrap gap-1 text-[10px]">{b.apps.map((a: string) => <span key={a} className="rounded bg-tg-bg px-1.5 py-0.5 text-tg-muted">{a}</span>)}</div><div className="mt-1 text-[10px] text-tg-muted">Personas: {b.requiredForPersonas.join(", ")}</div><div className="mt-1 flex gap-1.5 text-[10px]"><span className="rounded bg-emerald-600/15 px-1.5 py-0.5 text-emerald-300">install {b.installMode}</span><span className="rounded bg-emerald-600/15 px-1.5 py-0.5 text-emerald-300">login {b.loginMode}</span></div><div className="mt-1 text-[10px] text-red-300">automation {String(b.automationAllowed)} · publishing {String(b.publishingAllowed)}</div></Card>)}</div></main>;
  }
  function Workload() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><Card t="Workload Planner (preview · no scheduler)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Title", "Content", "Manual Tasks", "Est. Time", "Priority", "Risk", "Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{st.workloadPlans.map((w: any) => <tr key={w.workloadId} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{w.title}</td><td className="px-2 text-tg-muted">{w.contentType}</td><td className="px-2 text-tg-muted">{w.expectedManualTasks.join(", ")}</td><td className="px-2">{w.estimatedManualTime}</td><td className="px-2"><Chip s={w.priority} /></td><td className="px-2"><Chip s={w.riskLevel} /></td><td className="px-2"><Chip s={w.status} /></td></tr>)}</tbody></table><div className="mt-2 text-[10px] text-tg-muted">Это не scheduler. Без cron/setInterval/worker. Только preview-план ручных задач.</div></Card></main>;
  }
  function Board() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{BOARD_COLS.map((col) => <div key={col} className="rounded-xl border border-tg-line bg-tg-panel/60 p-2"><div className="mb-1 text-[10px] font-black uppercase tracking-wider" style={{ color: SC[col] }}>{col}</div><div className="space-y-1.5">{st.manualOperationsBoard.filter((t: any) => t.status === col).map((t: any) => <div key={t.taskId} className="rounded-lg bg-tg-bg/50 p-2"><div className="text-[11px] font-semibold">{t.title}</div><div className="mt-0.5 text-[9px] text-tg-muted">{t.taskType} · {t.device}</div><input defaultValue={t.reviewerNotes} onBlur={(e) => setNote(t.taskId, e.target.value)} placeholder="reviewer note (local)" className="mt-1 w-full rounded bg-tg-bg px-1.5 py-0.5 text-[10px] outline-none" /><div className="mt-1 flex flex-wrap gap-0.5">{BOARD_COLS.filter((c) => c !== col).map((c) => <button key={c} onClick={() => moveTask(t.taskId, c)} className="rounded bg-tg-bg px-1 py-0.5 text-[8px] text-tg-muted hover:bg-tg-active hover:text-white" title={"→ " + c}>{c.split(" ")[0]}</button>)}</div></div>)}{!st.manualOperationsBoard.some((t: any) => t.status === col) && <div className="text-[9px] text-tg-muted">—</div>}</div></div>)}</div><div className="mt-2 text-[10px] text-tg-muted">APPROVED_PREVIEW_ONLY ≠ реальный запуск. Reviewer notes — только локально.</div></main>;
  }
  function Blockers() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2">{st.blockers.map((b: any) => <Card key={b.blockerId}><div className="flex items-center gap-2"><Chip s={b.severity} /><span className="text-[10px] uppercase text-tg-muted">{b.domain}</span><span className="ml-auto text-[9px] text-tg-muted">{b.sourceModule}</span></div><div className="mt-1 text-[13px] font-semibold">{b.title}</div><div className="mt-0.5 text-[10px] text-tg-muted">{b.linkedPersona} · {b.linkedDevice} · {b.reason}</div><div className="mt-1 text-[10px]">{b.blocksRuntimeActivation ? <span className="text-red-300">blocks runtime activation</span> : <span className="text-emerald-300">can proceed in preview</span>} · действие: {b.requiredManualAction}</div></Card>)}</div></main>;
  }
  function Readiness() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="mb-2 flex justify-end"><button onClick={() => download("activation-readiness.md", readinessMD(), "text/markdown")} className="rounded bg-tg-bg px-2.5 py-1 text-[11px] hover:text-white">Export Readiness MD</button></div><div className="grid gap-2 lg:grid-cols-2">{st.activationReadiness.map((r: any) => <Card key={r.readinessId} t={r.persona + " → " + r.device}><div className="flex items-center gap-2"><Chip s={r.finalDecision} /><span className="ml-auto text-sm font-black" style={{ color: r.readinessScore >= 65 ? "#4ade80" : "#fbbf24" }}>{r.readinessScore}%</span></div><div className="mt-1 text-[11px]"><b className="text-emerald-300">Ready:</b> {r.readyItems.join(", ")}</div><div className="text-[11px]"><b className="text-red-300">Blocked:</b> {r.blockedItems.join(", ")}</div><div className="text-[11px] text-tg-muted">Approvals: {r.requiredApprovals.join(", ")}</div><div className="mt-1 text-[10px] text-orange-300">{r.activationStatus} · Runtime Gate: {r.runtimeGateStatus}</div></Card>)}</div></main>;
  }

  return (
    <div className="fixed inset-0 z-[79] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🧭 OPERATIONS ASSIGNMENT MATRIX v1</div>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">PREVIEW_ONLY</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">LOCAL_STORAGE_ONLY</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={() => { navigator.clipboard?.writeText(exportJSON()); flash("JSON скопирован"); }} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Copy JSON</button>
          <button onClick={() => download("operations-assignment-matrix-v1.json", exportJSON(), "application/json")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export JSON</button>
          <button onClick={() => download("operations-assignment-matrix-v1.md", toMarkdown(), "text/markdown")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export Markdown</button>
          <button onClick={resetDemo} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Reset Demo</button>
        </div>
      </header>
      <div className="border-b border-tg-line bg-tg-panel/60 px-4 py-2">{safetyBar}</div>
      <div className="flex flex-wrap gap-1 border-b border-tg-line bg-tg-panel px-3 py-1.5">{MODES.map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{label}</button>)}</div>
      {mode === "assignment_dashboard" && <Dashboard />}
      {mode === "matrix" && <Matrix />}
      {mode === "bundles" && <Bundles />}
      {mode === "workload" && <Workload />}
      {mode === "board" && <Board />}
      {mode === "blockers" && <Blockers />}
      {mode === "readiness" && <Readiness />}
      <footer className="border-t border-tg-line bg-tg-panel px-4 py-1.5"><div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="font-black uppercase tracking-wider text-tg-accent">Summary:</span>{[["Assignments", st.assignments.length], ["Matrix Rows", st.personaDeviceMatrix.length], ["Bundles", st.appBundles.length], ["Workloads", st.workloadPlans.length], ["Manual Tasks", st.manualOperationsBoard.length], ["Blockers", st.blockers.length], ["Readiness", st.activationReadiness.length], ["Linked Sources", st.linkedSources.length]].map(([l, v]) => <span key={l as string} className="rounded-full bg-tg-bg px-2.5 py-1">{l}: <b>{v}</b></span>)}<span className="rounded-full bg-red-500/15 px-2.5 py-1 font-bold text-red-300">Runtime: 0 · Automation off · ADB off</span></div></footer>
      {toast && <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}
