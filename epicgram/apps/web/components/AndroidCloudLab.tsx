"use client";

// ANDROID CLOUD LAB v1 — preview/architecture layer for a cloud-Android / device-lab control center.
// PREVIEW_ONLY · LOCAL_STORAGE_ONLY. NO ADB, RPA, clicks, app install, login, real proxy/vpn secrets,
// cookies/sessions/tokens/passwords, publishing, account creation, fingerprint spoofing, anti-fraud bypass.
// UI + localStorage + mock + preview/export ONLY. Additive.

import { useEffect, useState } from "react";

const LS = "deepinside.androidCloud.lab.v1";
const SAFETY = {
  mode: "PREVIEW_ONLY", execution_allowed: false, network_calls: false, automation: false, rpa_allowed: false,
  adb_allowed: false, runtime_enabled: false, external_platform_actions: false, credentials_required: false,
  credentials_stored: false, account_creation_allowed: false, publishing_allowed: false, app_install_allowed: false,
  proxy_secret_storage_allowed: false, vpn_secret_storage_allowed: false, fingerprint_spoofing_allowed: false,
  anti_fraud_bypass_allowed: false, real_android_control_connected: false,
};

const MODES: [string, string][] = [
  ["device_fleet", "📱 Device Fleet"], ["infra", "🏗 Infrastructure Planner"], ["appstack", "📦 App Stack Planner"],
  ["network", "🌐 Network Profile"], ["fingerprint", "🔬 Fingerprint Integrity"], ["checklist", "📋 Manual Setup"],
  ["screen", "🖥 Screen Control Preview"], ["passport", "🪪 Device Passport"], ["compliance", "🛡 Compliance Gate"], ["dossier", "📑 Activation Dossier"],
];
const PERSONAS = [
  { d: "EVA-CLOUD-ANDROID-01", persona: "EVA NOVIKOVA", identity: "eva", type: "CLOUD_PHONE", provider: "SELF_HOSTED", purpose: "radio/shorts host", status: "READY_PREVIEW_ONLY" },
  { d: "BUCH-OPERATOR-ANDROID-01", persona: "BUCH", identity: "buch", type: "VPS_ANDROID", provider: "SELF_HOSTED", purpose: "operator console", status: "REVIEW" },
  { d: "BUCHIHA-MEDIA-ANDROID-01", persona: "BUCHIHA", identity: "buchiha", type: "CLOUD_PHONE", provider: "GEELARK", purpose: "media character", status: "READY_PREVIEW_ONLY" },
  { d: "AI-REPORTER-ANDROID-01", persona: "AI REPORTER", identity: "reporter", type: "EMULATOR", provider: "SELF_HOSTED", purpose: "news capture", status: "PLANNED" },
  { d: "AI-NEWSCASTER-ANDROID-01", persona: "AI NEWSCASTER", identity: "newscaster", type: "EMULATOR", provider: "MANUAL", purpose: "broadcast", status: "PLANNED" },
  { d: "NOVA-TEST-ANDROID-01", persona: "NOVA", identity: "nova", type: "TEST_DEVICE", provider: "PLANNED", purpose: "experiments", status: "BLOCKED" },
];
const APP_LIST = ["Telegram", "EPIC GRAM", "Google", "YouTube", "TikTok", "Instagram", "Facebook", "GitHub", "CapCut", "Canva", "ElevenLabs", "ChatGPT", "Claude", "Grok", "Perplexity", "Deepinside PWA"];

function nowISO() { return new Date().toISOString(); }
function readLS(k: string): any { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }

function buildDemo() {
  const idLayer = readLS("world_identity_layer_v1");
  const dh = readLS("deepinside.digitalHuman.factory.v1");
  const linkedRefs = { identityLayer: idLayer?.entities || PERSONAS.map((p) => p.identity), digitalHuman: (dh?.personas || []).map((p: any) => p.displayName), geelark: readLS("deepinside.geelark.cloudPhoneCenter.v1") ? "linked" : "none", media: [readLS("deepinside.mediaFactory.canvas.v1") && "canvas", readLS("deepinside.mediaFactory.orchestration.v1") && "orchestration", readLS("deepinside.contentRelease.control.v1") && "release"].filter(Boolean) };

  const devices = PERSONAS.map((p, i) => ({
    deviceId: "dev_" + (i + 1), displayName: p.d, deviceType: p.type, provider: p.provider, assignedPersona: p.persona, assignedIdentityId: p.identity,
    purpose: p.purpose, androidVersionPreview: ["14", "13", "14", "13", "12", "14"][i], screenProfile: "1080x2400", localeProfile: "ru-RU/en-US", regionPreview: "EU (preview)",
    deviceStatus: p.status === "REVIEW" ? "READY_PREVIEW_ONLY" : p.status, connectionStatus: "NOT_CONNECTED", adbStatus: "DISABLED", runtimeStatus: "NOT_CONNECTED", lastManualCheck: "2026-06-18", notes: "Mock device (preview).",
  }));
  const INFRA_TYPES = ["Windows VPS", "Ubuntu VPS", "Android Emulator Host", "Physical Device Hub", "MDM Server Preview", "VPN Gateway Preview", "Storage Node", "OBS/Screen Capture Node"];
  const infrastructurePlans = INFRA_TYPES.map((nt, i) => ({ infraId: "inf_" + (i + 1), title: nt + " #1", nodeType: nt, purpose: "host/support cloud Android", requiredResources: ["CPU 4", "RAM 8GB", "Disk 100GB"], estimatedCostRange: ["$8-15", "$6-12", "$20-40", "$0 (own)", "$10-20", "$5-10", "$4-8", "$0 (own)"][i] + "/mo", status: i < 3 ? "READY_PREVIEW_ONLY" : i < 6 ? "PLANNED" : "PLANNED", blockers: nt.includes("VPN") ? ["secrets must not be stored"] : [], futureActivationChecklist: ["provision manually", "no secrets in preview", "runtime gate"] }));
  const appStack = APP_LIST.map((a, i) => ({ appId: "app_" + (i + 1), appName: a, category: ["Messaging", "Messaging", "Account", "Video", "Video", "Social", "Social", "Dev", "Editing", "Design", "Voice", "AI", "AI", "AI", "AI", "App"][i] || "App", requiredForPersonas: i % 2 ? ["EVA NOVIKOVA"] : ["BUCH", "BUCHIHA"], installStatus: i < 4 ? "MANUAL_INSTALLED" : i < 10 ? "PLANNED" : "NOT_INSTALLED_PREVIEW", loginStatus: "NOT_CONNECTED", automationAllowed: false, publishingAllowed: false, notes: "manual install only" }));
  const networkProfiles = devices.map((d, i) => ({ networkProfileId: "net_" + (i + 1), deviceId: d.deviceId, region: "EU", country: ["DE", "NL", "PL", "DE", "FR", "—"][i], timezone: "Europe/Berlin", vpnStatus: ["NOT_CONNECTED", "PLANNED", "NEEDS_REVIEW", "PLANNED", "NOT_CONNECTED", "BLOCKED"][i], proxyStatus: ["NOT_CONNECTED", "NEEDS_REVIEW", "PLANNED", "NOT_CONNECTED", "PLANNED", "BLOCKED"][i], credentialsStored: false, secretMaterialStored: false, complianceNotes: "no secrets stored; compliance preview only", riskNotes: "no anti-fraud bypass; no fingerprint spoofing" }));
  const fingerprintInventory = devices.map((d, i) => ({ fingerprintId: "fp_" + (i + 1), deviceId: d.deviceId, androidVersion: d.androidVersionPreview, screenSize: "1080x2400", locale: "ru-RU", timezone: "Europe/Berlin", appVersionProfile: "stable channel", integrityStatus: i === 5 ? "BLOCKED" : i === 2 ? "NEEDS_REVIEW" : "INVENTORY_ONLY", spoofingAllowed: false, antiFraudBypassAllowed: false, notes: "inventory-only; spoofing & anti-fraud bypass disabled" }));
  const CHECK_ITEMS = ["Create device manually", "Install apps manually", "Login manually", "Confirm platform compliance", "Confirm account ownership", "Confirm consent", "Confirm network profile", "Confirm no credentials stored", "Confirm no automation enabled", "Confirm Runtime Gate not requested"];
  const manualSetupChecklists = devices.map((d, i) => ({ checklistId: "chk_" + (i + 1), deviceId: d.deviceId, title: "Manual Setup · " + d.displayName, items: CHECK_ITEMS.map((it, j) => ({ item: it, done: j < (i % 5) })), status: i < 2 ? "READY_PREVIEW_ONLY" : i === 5 ? "BLOCKED" : "REVIEW_REQUIRED", reviewerNotes: "manual review required" }));
  const screenControlPreview = devices.map((d, i) => ({ screenControlId: "sc_" + (i + 1), deviceId: d.deviceId, methodPreview: ["Manual Only", "Geelark Window", "scrcpy", "VNC", "Browser Stream", "Manual Only"][i], realControlAllowed: false, clickAutomationAllowed: false, recordingAllowedPreview: false, status: i === 5 ? "BLOCKED" : i < 2 ? "READY_PREVIEW_ONLY" : "PLANNED", blockers: ["real control disabled", "no click automation"] }));
  const devicePassports = devices.map((d, i) => { const score = d.deviceStatus === "READY_PREVIEW_ONLY" ? 70 : d.deviceStatus === "PLANNED" ? 48 : d.deviceStatus === "BLOCKED" ? 28 : 58; return { passportId: "pp_" + (i + 1), deviceId: d.deviceId, assignedPersona: d.assignedPersona, assignedIdentity: d.assignedIdentityId, appStackStatus: i < 2 ? "PARTIAL_MANUAL" : "PLANNED", networkStatus: networkProfiles[i].vpnStatus, fingerprintIntegrityStatus: fingerprintInventory[i].integrityStatus, securityStatus: "no secrets stored", complianceStatus: i === 5 ? "BLOCKED" : "REVIEW_REQUIRED", automationStatus: "DISABLED", publishingStatus: "DISABLED", adbStatus: "DISABLED", runtimeGateStatus: "NOT_REQUESTED", finalStatus: d.deviceStatus === "BLOCKED" ? "BLOCKED" : d.deviceStatus === "READY_PREVIEW_ONLY" ? "READY_PREVIEW_ONLY" : "REVIEW_REQUIRED", readinessScore: score }; });
  const BLOCKERS = [
    ["Credentials are not allowed in preview.", "Credentials", "CRITICAL"], ["Publishing is disabled.", "Publishing", "WARNING"], ["Runtime automation is disabled.", "Automation", "CRITICAL"],
    ["ADB execution is disabled.", "ADB", "CRITICAL"], ["RPA execution is disabled.", "Automation", "CRITICAL"], ["Platform compliance review required.", "Platform", "WARNING"],
    ["Manual login/setup required.", "Account", "INFO"], ["Proxy/VPN secrets must not be stored.", "Proxy", "CRITICAL"], ["Account creation cannot be automated.", "Account", "CRITICAL"],
    ["Fingerprint spoofing is disabled.", "Fingerprint", "CRITICAL"], ["Anti-fraud bypass is prohibited.", "Compliance", "CRITICAL"], ["External platform actions are disabled.", "Platform", "WARNING"],
  ];
  const complianceGates = BLOCKERS.map(([title, domain, sev], i) => ({ blockerId: "blk_" + (i + 1), title, domain, severity: sev, linkedDevice: devices[i % devices.length].deviceId, reason: "preview-mode safety constraint", requiredManualAction: "manual review / human action", blocksRuntimeActivation: sev === "CRITICAL", canProceedInPreview: sev !== "CRITICAL" }));
  const activationDossiers = devices.map((d, i) => ({ dossierId: "dos_" + (i + 1), title: "Activation Dossier · " + d.displayName, deviceId: d.deviceId, persona: d.assignedPersona, readinessScore: devicePassports[i].readinessScore, readyItems: ["device profile", "app list", "network profile (no secrets)"], blockedItems: ["credentials", "automation", "ADB", "publishing"], requiredManualApprovals: ["manual setup review", "platform compliance", "consent"], platformComplianceSummary: "review pending", securitySummary: "no secrets / no credentials stored", runtimeGateStatus: "NOT_REQUESTED", finalStatus: d.deviceStatus === "BLOCKED" ? "BLOCKED" : d.deviceStatus === "READY_PREVIEW_ONLY" ? "READY_FOR_MANUAL_REVIEW" : "NOT_READY" }));

  return { ...SAFETY, devices, infrastructurePlans, appStack, networkProfiles, fingerprintInventory, manualSetupChecklists, screenControlPreview, devicePassports, complianceGates, activationDossiers, linkedRefs, selectedItemId: "dev_1", selectedMode: "device_fleet", updatedAt: nowISO() };
}
function loadState(): any { try { const s = JSON.parse(localStorage.getItem(LS) || "null"); if (s?.devices?.length) return s; } catch {} return buildDemo(); }

const SC: Record<string, string> = { READY_PREVIEW_ONLY: "#4ade80", READY_FOR_MANUAL_REVIEW: "#38bdf8", MANUAL_INSTALLED: "#4ade80", INVENTORY_ONLY: "#38bdf8", PLANNED: "#fbbf24", REVIEW: "#fbbf24", REVIEW_REQUIRED: "#fbbf24", NEEDS_REVIEW: "#fbbf24", NOT_INSTALLED_PREVIEW: "#9ca3af", NOT_CONNECTED: "#9ca3af", NOT_REQUESTED: "#9ca3af", MOCK_ONLY: "#9ca3af", DISABLED: "#9ca3af", DRAFT: "#9ca3af", NOT_READY: "#fb923c", BLOCKED: "#f87171", CRITICAL: "#f87171", WARNING: "#fbbf24", INFO: "#38bdf8", PARTIAL_MANUAL: "#fbbf24" };
function Chip({ s }: { s: string }) { return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (SC[s] || "#6b7280") + "22", color: SC[s] || "#9ca3af" }}>{s}</span>; }
function Card({ children, t }: { children: any; t?: string }) { return <div className="rounded-2xl border border-tg-line bg-tg-panel/60 p-4 backdrop-blur">{t && <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">{t}</div>}{children}</div>; }
const av = (s: string) => "#" + (((s.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");

export function AndroidCloudLab({ onClose }: { onClose: () => void }) {
  const [st, setSt] = useState<any>(loadState);
  const [mode, setMode] = useState<string>(st.selectedMode || "device_fleet");
  const [sel, setSel] = useState<string>(st.devices[0]?.deviceId || "");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1700); };

  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ ...st, ...SAFETY, selectedMode: mode, selectedItemId: sel, updatedAt: nowISO() })); } catch {} }, [st, mode, sel]);

  const dev = st.devices.find((d: any) => d.deviceId === sel) || st.devices[0];
  const net = st.networkProfiles.find((n: any) => n.deviceId === sel);
  const fp = st.fingerprintInventory.find((f: any) => f.deviceId === sel);
  const chk = st.manualSetupChecklists.find((c: any) => c.deviceId === sel);
  const scr = st.screenControlPreview.find((s: any) => s.deviceId === sel);
  const pp = st.devicePassports.find((p: any) => p.deviceId === sel);

  function resetDemo() { setSt(buildDemo()); flash("Демо сброшено"); }
  function passportMD(p: any) {
    return ["# Device Passport — " + p.deviceId, "", "**Persona:** " + p.assignedPersona + " · **Identity:** " + (p.assignedIdentity || "—"), "", "## Statuses", "- App Stack: " + p.appStackStatus, "- Network: " + p.networkStatus, "- Fingerprint Integrity: " + p.fingerprintIntegrityStatus, "- Security: " + p.securityStatus, "- Compliance: " + p.complianceStatus, "- Automation: " + p.automationStatus, "- Publishing: " + p.publishingStatus, "- ADB: " + p.adbStatus, "- Runtime Gate: " + p.runtimeGateStatus, "- Final: " + p.finalStatus, "- Readiness: " + p.readinessScore + "%", "", "## Safety", "PREVIEW_ONLY · ADB/RPA/automation disabled · no secrets stored · no spoofing · runtime gate required."].join("\n");
  }
  function toMarkdown() {
    const L: string[] = ["# ANDROID CLOUD LAB v1", "", "**Mode:** PREVIEW_ONLY · LOCAL_STORAGE_ONLY", ""];
    L.push("## Device Fleet"); st.devices.forEach((d: any) => L.push(`- ${d.displayName} (${d.deviceType}/${d.provider}) · ${d.assignedPersona} · ${d.deviceStatus} · ADB ${d.adbStatus}`)); L.push("");
    L.push("## Infrastructure Planner"); st.infrastructurePlans.forEach((p: any) => L.push(`- ${p.title} (${p.nodeType}) · ${p.estimatedCostRange} · ${p.status}`)); L.push("");
    L.push("## App Stack Planner"); st.appStack.forEach((a: any) => L.push(`- ${a.appName} (${a.category}) · ${a.installStatus} · automation ${a.automationAllowed}`)); L.push("");
    L.push("## Network Profile Preview"); st.networkProfiles.forEach((n: any) => L.push(`- ${n.deviceId}: ${n.country} · VPN ${n.vpnStatus} · Proxy ${n.proxyStatus} · secrets ${n.secretMaterialStored}`)); L.push("");
    L.push("## Fingerprint Inventory (integrity-only)"); st.fingerprintInventory.forEach((f: any) => L.push(`- ${f.deviceId}: Android ${f.androidVersion} · ${f.integrityStatus} · spoofing ${f.spoofingAllowed}`)); L.push("");
    L.push("## Manual Setup Checklists"); st.manualSetupChecklists.forEach((c: any) => L.push(`- ${c.title}: ${c.status} (${c.items.filter((x: any) => x.done).length}/${c.items.length})`)); L.push("");
    L.push("## Screen Control Preview"); st.screenControlPreview.forEach((s: any) => L.push(`- ${s.deviceId}: ${s.methodPreview} · realControl ${s.realControlAllowed} · ${s.status}`)); L.push("");
    L.push("## Device Passports"); st.devicePassports.forEach((p: any) => L.push(`- ${p.deviceId}: ${p.finalStatus} · readiness ${p.readinessScore}%`)); L.push("");
    L.push("## Compliance Gates"); st.complianceGates.forEach((b: any) => L.push(`- [${b.severity}/${b.domain}] ${b.title}`)); L.push("");
    L.push("## Activation Dossiers"); st.activationDossiers.forEach((d: any) => L.push(`- ${d.title}: ${d.finalStatus} · readiness ${d.readinessScore}%`)); L.push("");
    L.push("## Linked References", "- Identity Layer: " + (st.linkedRefs?.identityLayer || []).join(", "), "- Digital Human: " + (st.linkedRefs?.digitalHuman || []).join(", "), "- GeeLark: " + st.linkedRefs?.geelark, "- Media: " + (st.linkedRefs?.media || []).join(", "), "");
    L.push("## Safety Confirmation", ...Object.entries(SAFETY).map(([k, v]) => `- ${k}: ${v}`), "- manual_review_required: true", "- runtime_gate_required_for_activation: true", "");
    L.push("## Future Activation Checklist (NOT active)", "- [ ] Manual device creation & app install", "- [ ] Manual login (no stored credentials)", "- [ ] Platform compliance review", "- [ ] Confirm no automation/ADB/RPA", "- [ ] Request Runtime Gate (separate)");
    return L.join("\n");
  }
  function exportJSON() { return JSON.stringify({ name: "ANDROID_CLOUD_LAB_V1", ...st, ...SAFETY, updatedAt: nowISO() }, null, 2); }
  function download(name: string, content: string, type: string) { const b = new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); flash("Экспорт: " + name); }

  const safetyBar = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-tg-muted sm:grid-cols-3 lg:grid-cols-5">
      {[["Mode", "PREVIEW_ONLY"], ["Execution", "false"], ["Network Calls", "false"], ["Runtime", "false"], ["ADB", "false"], ["RPA", "false"], ["Automation", "false"], ["Publishing", "false"], ["Account Creation", "false"], ["App Install", "false"], ["Credentials Stored", "false"], ["Proxy Secret Storage", "false"], ["VPN Secret Storage", "false"], ["Fingerprint Spoofing", "false"], ["Anti-Fraud Bypass", "false"], ["Real Android Control", "false"], ["Manual Review", "REQUIRED"], ["Runtime Gate (Activation)", "REQUIRED"]].map(([l, v]) => <div key={l}><span>{l}: </span><b className={v === "REQUIRED" ? "text-amber-300" : v === "false" ? "text-emerald-300" : "text-cyan-300"}>{v}</b></div>)}
    </div>
  );
  const deviceList = <nav className="min-h-0 overflow-auto border-r border-tg-line bg-tg-panel p-2"><div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Devices</div>{st.devices.map((d: any) => <button key={d.deviceId} onClick={() => setSel(d.deviceId)} className={`mb-1 w-full rounded-xl border px-2.5 py-2 text-left ${sel === d.deviceId ? "border-tg-accent bg-tg-active/15" : "border-tg-line hover:border-tg-accent/50"}`}><div className="truncate text-[12px] font-semibold">{d.displayName}</div><div className="mt-0.5 flex items-center gap-1 text-[10px] text-tg-muted">{d.deviceType} · <Chip s={d.deviceStatus} /></div></button>)}</nav>;

  function Fleet() {
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr_300px]">{deviceList}
      <main className="min-h-0 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2">{st.devices.map((d: any) => <Card key={d.deviceId}><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm" style={{ background: av(d.displayName) }}>📱</div><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold">{d.displayName}</div><div className="text-[10px] text-tg-muted">{d.deviceType} · {d.provider}</div></div><Chip s={d.deviceStatus} /></div><div className="mt-1 grid grid-cols-3 gap-1 text-center text-[9px]"><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">ADB</div><b className="text-red-300">{d.adbStatus}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Conn</div><b className="text-tg-muted">{d.connectionStatus}</b></div><div className="rounded bg-tg-bg/40 py-1"><div className="text-tg-muted">Runtime</div><b className="text-tg-muted">{d.runtimeStatus}</b></div></div></Card>)}</div></main>
      <aside className="min-h-0 overflow-auto border-l border-tg-line bg-tg-panel p-3"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">🔍 Device Inspector</div><div className="space-y-1 text-[11px]">{([["deviceId", dev.deviceId], ["persona", dev.assignedPersona], ["identity", dev.assignedIdentityId], ["type", dev.deviceType], ["provider", dev.provider], ["purpose", dev.purpose], ["android", dev.androidVersionPreview], ["screen", dev.screenProfile], ["locale", dev.localeProfile], ["region", dev.regionPreview], ["last check", dev.lastManualCheck]] as const).map(([l, v]) => <div key={l} className="rounded bg-tg-bg/40 p-1.5"><span className="text-tg-muted">{l}: </span><b>{v}</b></div>)}</div><div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300">ADB DISABLED · NOT_CONNECTED · реального управления нет.</div></aside>
    </div>;
  }
  function Infra() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{st.infrastructurePlans.map((p: any) => <Card key={p.infraId} t={p.nodeType}><div className="text-[12px] font-semibold">{p.title}</div><div className="mt-0.5 text-[10px] text-tg-muted">{p.purpose}</div><div className="mt-1 text-[11px]"><b className="text-emerald-300">{p.estimatedCostRange}</b> · {p.requiredResources.join(" / ")}</div><div className="mt-1 flex items-center gap-1"><Chip s={p.status} />{p.blockers.length ? <span className="text-[9px] text-red-300">⚠ {p.blockers[0]}</span> : null}</div></Card>)}</div></main>;
  }
  function AppStack() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><Card t="App Stack Planner (manual install only)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["App", "Category", "For", "Install", "Login", "Automation", "Publishing"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{st.appStack.map((a: any) => <tr key={a.appId} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{a.appName}</td><td className="px-2 text-tg-muted">{a.category}</td><td className="px-2 text-tg-muted">{a.requiredForPersonas.join(", ")}</td><td className="px-2"><Chip s={a.installStatus} /></td><td className="px-2 text-tg-muted">{a.loginStatus}</td><td className="px-2 text-red-300">{String(a.automationAllowed)}</td><td className="px-2 text-red-300">{String(a.publishingAllowed)}</td></tr>)}</tbody></table><div className="mt-2 text-[10px] text-tg-muted">Установка/логин только вручную. Automation и publishing отключены.</div></Card></main>;
  }
  function Network() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><Card t="Network Profile Preview (no secrets stored)"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Device", "Region", "Country", "TZ", "VPN", "Proxy", "Secrets", "Compliance"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{st.networkProfiles.map((n: any) => <tr key={n.networkProfileId} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{n.deviceId}</td><td className="px-2">{n.region}</td><td className="px-2">{n.country}</td><td className="px-2 text-tg-muted">{n.timezone}</td><td className="px-2"><Chip s={n.vpnStatus} /></td><td className="px-2"><Chip s={n.proxyStatus} /></td><td className="px-2 text-emerald-300">{String(n.secretMaterialStored)}</td><td className="px-2 text-tg-muted">{n.complianceNotes}</td></tr>)}</tbody></table><div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300">Реальные proxy/vpn host/login/password не хранятся. Без инструкций обхода антифрода и fingerprint spoofing.</div></Card></main>;
  }
  function Fingerprint() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] font-bold text-amber-300">Fingerprint section is inventory-only. Spoofing and anti-fraud bypass are disabled.</div><Card t="Device Fingerprint Integrity Inventory"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["Device", "Android", "Screen", "Locale", "TZ", "App Profile", "Integrity", "Spoofing", "AF Bypass"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead><tbody>{st.fingerprintInventory.map((f: any) => <tr key={f.fingerprintId} className="border-t border-tg-line"><td className="px-2 py-1.5 font-semibold">{f.deviceId}</td><td className="px-2">{f.androidVersion}</td><td className="px-2 text-tg-muted">{f.screenSize}</td><td className="px-2">{f.locale}</td><td className="px-2 text-tg-muted">{f.timezone}</td><td className="px-2 text-tg-muted">{f.appVersionProfile}</td><td className="px-2"><Chip s={f.integrityStatus} /></td><td className="px-2 text-emerald-300">{String(f.spoofingAllowed)}</td><td className="px-2 text-emerald-300">{String(f.antiFraudBypassAllowed)}</td></tr>)}</tbody></table></Card></main>;
  }
  function Checklist() {
    if (!chk) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">{deviceList}<main className="min-h-0 overflow-auto p-3"><Card t={chk.title}><div className="space-y-1">{chk.items.map((it: any, i: number) => <div key={i} className="flex items-center gap-2 text-[12px]"><span>{it.done ? "☑" : "☐"}</span><span className={it.done ? "text-emerald-300" : ""}>{it.item}</span></div>)}</div><div className="mt-2 flex items-center gap-2"><Chip s={chk.status} /><span className="text-[11px] text-tg-muted">{chk.reviewerNotes}</span></div></Card></main></div>;
  }
  function Screen() {
    if (!scr) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">{deviceList}<main className="min-h-0 overflow-auto p-3"><Card t={"Screen Control Preview · " + dev.displayName}><div className="grid gap-1.5 sm:grid-cols-2">{([["methodPreview", scr.methodPreview], ["realControlAllowed", String(scr.realControlAllowed)], ["clickAutomationAllowed", String(scr.clickAutomationAllowed)], ["recordingAllowedPreview", String(scr.recordingAllowedPreview)]] as const).map(([l, v]) => <div key={l} className="rounded bg-tg-bg/40 p-2 text-[12px]"><div className="text-tg-muted">{l}</div><b style={{ color: v === "false" ? "#4ade80" : undefined }}>{v}</b></div>)}</div><div className="mt-1"><Chip s={scr.status} /></div><div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300">Не запускать VNC/scrcpy/ADB. Только карточки архитектуры. Blockers: {scr.blockers.join("; ")}.</div></Card></main></div>;
  }
  function Passport() {
    if (!pp) return null;
    return <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">{deviceList}<main className="min-h-0 overflow-auto p-3"><div className="mb-2 flex items-center gap-2"><div className="text-lg font-black">{pp.deviceId}</div><Chip s={pp.finalStatus} /><div className="ml-auto flex gap-1.5"><button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(pp, null, 2)); flash("Passport JSON скопирован"); }} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Copy</button><button onClick={() => download(pp.passportId + ".json", JSON.stringify(pp, null, 2), "application/json")} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Export JSON</button><button onClick={() => download(pp.passportId + ".md", passportMD(pp), "text/markdown")} className="rounded bg-tg-bg px-2 py-1 text-[11px]">Export MD</button></div></div>
      <Card t="Device Passport"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-lg text-xl" style={{ background: av(pp.deviceId) }}>📱</div><div><div className="font-bold">{pp.assignedPersona}</div><div className="text-[11px] text-tg-muted">identity {pp.assignedIdentity || "—"}</div></div><div className="ml-auto text-right"><div className="text-[10px] uppercase text-tg-muted">Readiness</div><div className="text-2xl font-black" style={{ color: pp.readinessScore >= 70 ? "#4ade80" : pp.readinessScore >= 45 ? "#fbbf24" : "#f87171" }}>{pp.readinessScore}%</div></div></div><div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-3">{[["App Stack", pp.appStackStatus], ["Network", pp.networkStatus], ["Fingerprint", pp.fingerprintIntegrityStatus], ["Security", pp.securityStatus], ["Compliance", pp.complianceStatus], ["Automation", pp.automationStatus], ["Publishing", pp.publishingStatus], ["ADB", pp.adbStatus], ["Runtime Gate", pp.runtimeGateStatus]].map(([l, v]) => <div key={l as string} className="rounded bg-tg-bg/40 p-1.5"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div></Card></main></div>;
  }
  function Compliance() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 sm:grid-cols-2">{st.complianceGates.map((b: any) => <Card key={b.blockerId}><div className="flex items-center gap-2"><Chip s={b.severity} /><span className="text-[10px] uppercase text-tg-muted">{b.domain}</span><span className="ml-auto text-[9px] text-tg-muted">{b.linkedDevice}</span></div><div className="mt-1 text-[13px] font-semibold">{b.title}</div><div className="mt-0.5 text-[11px] text-tg-muted">{b.reason} · действие: {b.requiredManualAction}</div><div className="mt-1 text-[10px]">{b.blocksRuntimeActivation ? <span className="text-red-300">blocks runtime activation</span> : <span className="text-emerald-300">can proceed in preview</span>}</div></Card>)}</div></main>;
  }
  function Dossier() {
    return <main className="min-h-0 flex-1 overflow-auto p-3"><div className="grid gap-2 lg:grid-cols-2">{st.activationDossiers.map((d: any) => <Card key={d.dossierId} t={d.title}><div className="flex items-center gap-2"><Chip s={d.finalStatus} /><span className="ml-auto text-sm font-black" style={{ color: d.readinessScore >= 65 ? "#4ade80" : "#fbbf24" }}>{d.readinessScore}%</span></div><div className="mt-1 text-[11px]"><b className="text-emerald-300">Ready:</b> {d.readyItems.join(", ")}</div><div className="text-[11px]"><b className="text-red-300">Blocked:</b> {d.blockedItems.join(", ")}</div><div className="text-[11px] text-tg-muted">Approvals: {d.requiredManualApprovals.join(", ")}</div><div className="mt-1 text-[10px] text-tg-muted">Runtime Gate: {d.runtimeGateStatus} · {d.securitySummary}</div></Card>)}</div></main>;
  }

  return (
    <div className="fixed inset-0 z-[78] flex flex-col bg-tg-bg text-tg-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-tg-line bg-tg-panel px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">🤖 ANDROID CLOUD LAB v1</div>
        <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">PREVIEW_ONLY</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">LOCAL_STORAGE_ONLY</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={() => { navigator.clipboard?.writeText(exportJSON()); flash("JSON скопирован"); }} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Copy JSON</button>
          <button onClick={() => download("android-cloud-lab-v1.json", exportJSON(), "application/json")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export JSON</button>
          <button onClick={() => download("android-cloud-lab-v1.md", toMarkdown(), "text/markdown")} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Export Markdown</button>
          <button onClick={resetDemo} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs hover:text-white">Reset Demo</button>
        </div>
      </header>
      <div className="border-b border-tg-line bg-tg-panel/60 px-4 py-2">{safetyBar}</div>
      <div className="flex flex-wrap gap-1 border-b border-tg-line bg-tg-panel px-3 py-1.5">{MODES.map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{label}</button>)}</div>
      {mode === "device_fleet" && <Fleet />}
      {mode === "infra" && <Infra />}
      {mode === "appstack" && <AppStack />}
      {mode === "network" && <Network />}
      {mode === "fingerprint" && <Fingerprint />}
      {mode === "checklist" && <Checklist />}
      {mode === "screen" && <Screen />}
      {mode === "passport" && <Passport />}
      {mode === "compliance" && <Compliance />}
      {mode === "dossier" && <Dossier />}
      <footer className="border-t border-tg-line bg-tg-panel px-4 py-1.5"><div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="font-black uppercase tracking-wider text-tg-accent">Summary:</span>{[["Devices", st.devices.length], ["Infra", st.infrastructurePlans.length], ["Apps", st.appStack.length], ["Network", st.networkProfiles.length], ["Fingerprint", st.fingerprintInventory.length], ["Checklists", st.manualSetupChecklists.length], ["Screen", st.screenControlPreview.length], ["Passports", st.devicePassports.length], ["Blockers", st.complianceGates.length], ["Dossiers", st.activationDossiers.length]].map(([l, v]) => <span key={l as string} className="rounded-full bg-tg-bg px-2.5 py-1">{l}: <b>{v}</b></span>)}<span className="rounded-full bg-red-500/15 px-2.5 py-1 font-bold text-red-300">ADB off · RPA off · Real control: 0</span></div></footer>
      {toast && <div className="fixed bottom-6 left-1/2 z-[79] -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}
