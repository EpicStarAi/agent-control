// DEEPINSIDE PHASE T — LIVE INFRASTRUCTURE BRIDGE (read-only introspection + guarded local control).
// ADDITIVE backend. Reads local self-hosted services (Docker / n8n / Ollama / PostgreSQL / Qdrant /
// Redis / MinIO) and host metrics. Secrets are read ONLY from process.env and NEVER returned.
// No Telegram actions, no auto-publish, no external API keys. All calls are time-boxed and fail soft
// (return { online:false, reason } instead of throwing). Control actions require operatorConfirmed.

import { exec } from "node:child_process";
import os from "node:os";

const TIMEOUT = 3500;
const now = () => new Date().toISOString();

function run(cmd, timeout = TIMEOUT) {
  return new Promise((resolve) => {
    try {
      exec(cmd, { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
        resolve({ ok: !err, out: (stdout || "").trim(), err: (stderr || "").trim() || (err && err.message) || "" });
      });
    } catch (e) { resolve({ ok: false, out: "", err: String((e && e.message) || e) }); }
  });
}

async function jget(url, timeout = TIMEOUT) {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeout);
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(id);
    if (!r.ok) return { ok: false, status: r.status };
    const ct = r.headers.get("content-type") || "";
    return { ok: true, status: r.status, json: ct.indexOf("json") >= 0 ? await r.json().catch(() => null) : null, text: ct.indexOf("json") >= 0 ? null : await r.text().catch(() => "") };
  } catch (e) { return { ok: false, status: 0, reason: String((e && e.name) || e) }; }
}

const PG_CONTAINER = process.env.PG_CONTAINER || "deepinside-postgres";
const REDIS_CONTAINER = process.env.REDIS_CONTAINER || "deepinside-redis";
function resolveOllamaUrl() {
  const explicit = String(process.env.OLLAMA_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const provider = String(process.env.EPICGRAM_AI_PROVIDER || "").toLowerCase();
  const aiBaseUrl = String(process.env.EPICGRAM_AI_BASE_URL || "").trim();
  if (provider === "ollama" && aiBaseUrl) {
    try { return new URL(aiBaseUrl).origin; } catch {}
  }

  return "http://127.0.0.1:11434";
}

const OLLAMA_URL = resolveOllamaUrl();
const QDRANT_URL = process.env.QDRANT_URL || "http://127.0.0.1:6333";
const MINIO_URL = process.env.MINIO_URL || "http://127.0.0.1:9000";
const N8N_URL = process.env.N8N_URL || "http://127.0.0.1:5678";

// ---------------- DOCKER ----------------
export async function dockerStatus() {
  const ps = await run("docker ps -a --format \"{{json .}}\"");
  if (!ps.ok) return { online: false, reason: "docker_unavailable", detail: ps.err.slice(0, 160) };
  const containers = ps.out.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).map((c) => ({ name: c.Names, image: c.Image, state: c.State, status: c.Status, ports: c.Ports || "" }));
  const running = containers.filter((c) => c.state === "running").length;
  const imgs = await run("docker images -q");
  const vols = await run("docker volume ls -q");
  const nets = await run("docker network ls -q");
  return { online: true, at: now(), counts: { containers: containers.length, running, stopped: containers.length - running, images: imgs.ok ? imgs.out.split("\n").filter(Boolean).length : 0, volumes: vols.ok ? vols.out.split("\n").filter(Boolean).length : 0, networks: nets.ok ? nets.out.split("\n").filter(Boolean).length : 0 }, containers };
}

const SAFE_CONTAINER = /^[a-zA-Z0-9_.-]+$/;
export async function dockerAction(b) {
  b = b || {};
  if (b.operatorConfirmed !== true) return { ok: false, blocked: true, reason: "OPERATOR_CONFIRMATION_REQUIRED" };
  const action = String(b.action || "");
  const name = String(b.container || "");
  if (["start", "stop", "restart"].indexOf(action) < 0) return { ok: false, reason: "ACTION_NOT_ALLOWED" };
  if (!SAFE_CONTAINER.test(name)) return { ok: false, reason: "INVALID_CONTAINER_NAME" };
  const r = await run("docker " + action + " " + name, 15000);
  return { ok: r.ok, action, container: name, message: r.ok ? (r.out || "ok") : r.err.slice(0, 200) };
}

// ---------------- OLLAMA ----------------
export async function ollamaStatus() {
  const tags = await jget(OLLAMA_URL + "/api/tags");
  if (!tags.ok) return { online: false, reason: "ollama_unreachable" };
  const ps = await jget(OLLAMA_URL + "/api/ps");
  const installed = ((tags.json && tags.json.models) || []).map((m) => ({ name: m.name, size: m.size, family: (m.details && m.details.family) || "", param: (m.details && m.details.parameter_size) || "" }));
  const running = ((ps.ok && ps.json && ps.json.models) || []).map((m) => ({ name: m.name, size_vram: m.size_vram, expires: m.expires_at }));
  return { online: true, at: now(), installed, running, counts: { installed: installed.length, running: running.length } };
}

export async function ollamaAction(b) {
  b = b || {};
  if (b.operatorConfirmed !== true) return { ok: false, blocked: true, reason: "OPERATOR_CONFIRMATION_REQUIRED" };
  const action = String(b.action || "");
  const model = String(b.model || "");
  if (!/^[a-zA-Z0-9_.:\/-]+$/.test(model)) return { ok: false, reason: "INVALID_MODEL_NAME" };
  if (action === "pull") { const r = await jget(OLLAMA_URL + "/api/tags"); if (!r.ok) return { ok: false, reason: "ollama_unreachable" }; const rr = await postJson(OLLAMA_URL + "/api/pull", { name: model, stream: false }, 60000); return { ok: rr.ok, action, model, message: rr.ok ? "pull started/completed" : (rr.reason || "failed") }; }
  if (action === "unload") { const rr = await postJson(OLLAMA_URL + "/api/generate", { model, keep_alive: 0, prompt: "" }, 8000); return { ok: rr.ok, action, model, message: rr.ok ? "unloaded" : (rr.reason || "failed") }; }
  if (action === "delete") { const rr = await delJson(OLLAMA_URL + "/api/delete", { name: model }, 8000); return { ok: rr.ok, action, model, message: rr.ok ? "deleted" : (rr.reason || "failed") }; }
  return { ok: false, reason: "ACTION_NOT_ALLOWED" };
}

async function postJson(url, body, timeout = TIMEOUT) { try { const c = new AbortController(); const id = setTimeout(() => c.abort(), timeout); const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: c.signal }); clearTimeout(id); return { ok: r.ok, status: r.status }; } catch (e) { return { ok: false, reason: String((e && e.name) || e) }; } }
async function delJson(url, body, timeout = TIMEOUT) { try { const c = new AbortController(); const id = setTimeout(() => c.abort(), timeout); const r = await fetch(url, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: c.signal }); clearTimeout(id); return { ok: r.ok, status: r.status }; } catch (e) { return { ok: false, reason: String((e && e.name) || e) }; } }

// ---------------- QDRANT ----------------
export async function qdrantStatus() {
  const cols = await jget(QDRANT_URL + "/collections");
  if (!cols.ok) return { online: false, reason: "qdrant_unreachable" };
  const names = ((cols.json && cols.json.result && cols.json.result.collections) || []).map((c) => c.name);
  const detail = [];
  for (const n of names.slice(0, 12)) { const d = await jget(QDRANT_URL + "/collections/" + encodeURIComponent(n)); const r = d.ok && d.json && d.json.result; detail.push({ name: n, vectors: r ? (r.vectors_count || r.points_count || 0) : 0, points: r ? (r.points_count || 0) : 0, status: r ? r.status : "?" }); }
  return { online: true, at: now(), counts: { collections: names.length }, collections: detail };
}

// ---------------- REDIS (via docker exec) ----------------
export async function redisStatus() {
  const info = await run("docker exec " + REDIS_CONTAINER + " redis-cli INFO");
  if (!info.ok) return { online: false, reason: "redis_unreachable" };
  const m = {};
  info.out.split("\n").forEach((l) => { const i = l.indexOf(":"); if (i > 0 && l[0] !== "#") m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  const dbsize = await run("docker exec " + REDIS_CONTAINER + " redis-cli DBSIZE");
  return { online: true, at: now(), keys: dbsize.ok ? parseInt((dbsize.out.match(/\d+/) || ["0"])[0], 10) : 0, memory: m.used_memory_human || "?", connections: m.connected_clients || "?", uptime: m.uptime_in_seconds || "?", ops: m.instantaneous_ops_per_sec || "?", pubsub: m.pubsub_channels || "0" };
}

// ---------------- POSTGRES (via docker exec psql) ----------------
export async function postgresStatus() {
  const user = process.env.POSTGRES_USER || "deepinside";
  const db = process.env.POSTGRES_DB || "deepinside_ai";
  const q = (sql) => "docker exec " + PG_CONTAINER + " psql -U " + user + " -d " + db + " -tAc \"" + sql.replace(/"/g, "") + "\"";
  const ping = await run(q("select 1"));
  if (!ping.ok) return { online: false, reason: "postgres_unreachable" };
  const dbs = await run(q("select count(*) from pg_database where datistemplate=false"));
  const tables = await run(q("select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')"));
  const conns = await run(q("select count(*) from pg_stat_activity"));
  const size = await run("docker exec " + PG_CONTAINER + " psql -U " + user + " -d " + db + " -tAc \"select pg_size_pretty(pg_database_size('" + db + "'))\"");
  return { online: true, at: now(), databases: num(dbs.out), tables: num(tables.out), connections: num(conns.out), size: size.ok ? size.out.trim() : "?" };
}
const num = (s) => { const m = String(s || "").match(/\d+/); return m ? parseInt(m[0], 10) : 0; };

// ---------------- MINIO ----------------
export async function minioStatus() {
  const live = await jget(MINIO_URL + "/minio/health/live", 2500);
  if (!live.ok && live.status !== 200) return { online: false, reason: "minio_unreachable" };
  return { online: true, at: now(), health: "live", note: "object/bucket detail requires S3 credentials (read via env only, not exposed)" };
}

// ---------------- N8N ----------------
export async function n8nStatus() {
  const health = await jget(N8N_URL + "/healthz", 2500);
  if (!health.ok) return { online: false, reason: "n8n_unreachable" };
  const out = { online: true, at: now(), health: "ok" };
  const key = process.env.N8N_API_KEY;
  if (key) {
    try {
      const c = new AbortController(); const id = setTimeout(() => c.abort(), TIMEOUT);
      const wf = await fetch(N8N_URL + "/api/v1/workflows?limit=50", { headers: { "X-N8N-API-KEY": key }, signal: c.signal }); clearTimeout(id);
      if (wf.ok) { const j = await wf.json().catch(() => null); out.workflows = (j && j.data ? j.data.length : 0); }
      const c2 = new AbortController(); const id2 = setTimeout(() => c2.abort(), TIMEOUT);
      const ex = await fetch(N8N_URL + "/api/v1/executions?limit=20", { headers: { "X-N8N-API-KEY": key }, signal: c2.signal }); clearTimeout(id2);
      if (ex.ok) { const j = await ex.json().catch(() => null); const d = (j && j.data) || []; out.executions = d.length; out.success = d.filter((e) => e.finished && !e.stoppedAt === false && e.status !== "error").length; out.failed = d.filter((e) => e.status === "error" || e.status === "failed").length; }
    } catch {}
  } else { out.apiKeyConfigured = false; out.note = "set N8N_API_KEY in env for workflow/execution detail"; }
  return out;
}

// ---------------- N8N OBSERVABILITY (read-only, secrets stripped) ----------------
export const N8N_SAFETY = { mode: "READ_ONLY_OBSERVABILITY", n8nExecutionAllowed: false, workflowMutationAllowed: false, credentialsVisible: false, secretsVisible: false, tokensVisible: false, webhookSecretsVisible: false, autoSendAllowed: false, massSendAllowed: false, backgroundActionsAllowed: false };
export const GRAPH_SAFETY = { mode: "READ_ONLY_OBSERVABILITY", graphOnly: true, workflowExecutionAllowed: false, workflowMutationAllowed: false, credentialsVisible: false, secretsVisible: false, tokensVisible: false, payloadVisible: false, autoSendAllowed: false, massSendAllowed: false, backgroundActionsAllowed: false };

async function n8nApi(path, timeout = TIMEOUT) {
  const key = process.env.N8N_API_KEY;
  if (!key) return { ok: false, reason: "N8N_API_KEY_REQUIRED" };
  try {
    const c = new AbortController(); const id = setTimeout(() => c.abort(), timeout);
    const r = await fetch(N8N_URL + path, { headers: { "X-N8N-API-KEY": key }, signal: c.signal, cache: "no-store" });
    clearTimeout(id);
    if (!r.ok) return { ok: false, status: r.status, reason: r.status === 401 ? "N8N_API_KEY_INVALID" : "n8n_http_" + r.status };
    return { ok: true, json: await r.json().catch(() => null) };
  } catch (e) { return { ok: false, reason: "n8n_unreachable" }; }
}

const shortType = (t) => String(t || "").replace("n8n-nodes-base.", "").replace("@n8n/n8n-nodes-langchain.", "lc.");
const nodeKind = (t) => { const x = String(t || "").toLowerCase(); if (/trigger|webhook|cron|schedule|start|poll|interval/.test(x)) return "trigger"; if (/set|function|code|\.if|switch|merge|filter|itemlist|aggregate|split|sort|rename|datetime|html|xml|json|markdown|noop/.test(x)) return "transform"; return "action"; };
const nodeRisky = (t) => /telegram|http|webhook|emailsend|sendemail|gmail|executecommand|ssh|ftp|sftp|code|function|mqtt|amqp|rabbitmq|kafka|graphql|respondtowebhook|twilio|slack|discord|send/i.test(String(t || ""));
const maskId = (id) => { const s = String(id == null ? "" : id); return s.length > 6 ? s.slice(0, 2) + "***" + s.slice(-3) : "***" + s.slice(-2); };
// strip everything except non-secret structural fields
function safeNode(n) { const creds = n && n.credentials && typeof n.credentials === "object" ? Object.keys(n.credentials) : []; return { name: n && n.name, type: shortType(n && n.type), kind: nodeKind(n && n.type), credentialsUsed: creds.length > 0, riskyNode: nodeRisky(n && n.type), notes: (n && n.notes) ? String(n.notes).slice(0, 120) : "" }; }
function safeWorkflow(wf) { const nodes = (wf && wf.nodes) || []; const triggers = nodes.filter((n) => nodeKind(n.type) === "trigger"); return { id: wf && wf.id, name: wf && wf.name, active: !!(wf && wf.active), nodesCount: nodes.length, triggerType: triggers.map((n) => shortType(n.type)).join(", ") || "manual", updatedAt: wf && wf.updatedAt, createdAt: wf && wf.createdAt }; }

export async function n8nWorkflows() {
  const health = await jget(N8N_URL + "/healthz", 2500);
  const r = await n8nApi("/api/v1/workflows?limit=100");
  if (!r.ok) return { online: health.ok, reason: r.reason, apiKeyConfigured: !!process.env.N8N_API_KEY, workflows: [], safety: N8N_SAFETY };
  const list = ((r.json && r.json.data) || []).map(safeWorkflow);
  return { online: true, at: now(), counts: { total: list.length, active: list.filter((w) => w.active).length }, workflows: list, safety: N8N_SAFETY };
}

export async function n8nWorkflowDetail(id) {
  const r = await n8nApi("/api/v1/workflows/" + encodeURIComponent(id));
  if (!r.ok) return { online: false, reason: r.reason, safety: N8N_SAFETY };
  const wf = r.json || {};
  const nodes = (wf.nodes || []).map(safeNode);
  return { online: true, at: now(), workflow: safeWorkflow(wf), nodes, riskyCount: nodes.filter((n) => n.riskyNode).length, credentialNodes: nodes.filter((n) => n.credentialsUsed).length, safety: N8N_SAFETY };
}

export async function n8nWorkflowGraph(id) {
  const r = await n8nApi("/api/v1/workflows/" + encodeURIComponent(id));
  if (!r.ok) return { online: false, reason: r.reason, safety: GRAPH_SAFETY };
  const wf = r.json || {};
  const rawNodes = wf.nodes || [];
  const nodes = rawNodes.map((n) => { const s = safeNode(n); return { id: n && n.name, name: n && n.name, type: s.type, kind: s.kind, position: { x: (n && n.position && n.position[0]) || 0, y: (n && n.position && n.position[1]) || 0 }, credentialsUsed: s.credentialsUsed, riskyNode: s.riskyNode, notes: s.notes }; });
  const edges = [];
  const conns = wf.connections || {};
  for (const src of Object.keys(conns)) {
    const outsByType = conns[src] || {};
    for (const outType of Object.keys(outsByType)) {
      const groups = outsByType[outType] || [];
      groups.forEach((grp, gi) => { (grp || []).forEach((c) => { if (c && c.node) edges.push({ source: src, target: c.node, sourceOutput: gi, targetInput: (c.index != null ? c.index : 0), label: outType + (groups.length > 1 ? ("#" + gi) : ""), kind: outType === "error" ? "error" : (outType === "main" ? "main" : "unknown") }); }); });
    }
  }
  const deg = {}; edges.forEach((e) => { deg[e.source] = (deg[e.source] || 0) + 1; deg[e.target] = (deg[e.target] || 0) + 1; });
  const graphNodes = nodes.map((n) => ({ ...n, connectionCount: deg[n.id] || 0 }));
  return { online: true, at: now(), workflowIdMasked: maskId(wf.id), workflowName: wf.name, active: !!wf.active, nodes: graphNodes, edges, counts: { nodes: graphNodes.length, edges: edges.length, triggers: graphNodes.filter((n) => n.kind === "trigger").length, risky: graphNodes.filter((n) => n.riskyNode).length, credentialsUsed: graphNodes.filter((n) => n.credentialsUsed).length }, safety: GRAPH_SAFETY };
}

export async function n8nExecutions() {
  const r = await n8nApi("/api/v1/executions?limit=25");
  if (!r.ok) return { online: false, reason: r.reason, executions: [], safety: N8N_SAFETY };
  const list = ((r.json && r.json.data) || []).map((e) => { const st = e.startedAt ? new Date(e.startedAt).getTime() : 0; const sp = e.stoppedAt ? new Date(e.stoppedAt).getTime() : 0; const status = e.status || (e.finished ? "success" : "running"); return { id: maskId(e.id), workflowId: e.workflowId, status, startedAt: e.startedAt, stoppedAt: e.stoppedAt, durationMs: st && sp ? (sp - st) : null, mode: e.mode, finished: !!e.finished, retryOf: e.retryOf ? maskId(e.retryOf) : null, errorSummary: status === "error" || status === "failed" ? "execution error — детали в n8n UI" : "" }; });
  return { online: true, at: now(), counts: { total: list.length, success: list.filter((e) => e.status === "success").length, failed: list.filter((e) => e.status === "error" || e.status === "failed").length, running: list.filter((e) => e.status === "running").length }, executions: list, safety: N8N_SAFETY };
}

export async function n8nExecutionDetail(id) {
  const r = await n8nApi("/api/v1/executions/" + encodeURIComponent(id) + "?includeData=false");
  if (!r.ok) return { online: false, reason: r.reason, safety: N8N_SAFETY };
  const e = r.json || {};
  const status = e.status || (e.finished ? "success" : "running");
  // NEVER return e.data (may contain item payloads / secrets). Structural fields only.
  return { online: true, at: now(), execution: { id: maskId(e.id), workflowId: e.workflowId, status, mode: e.mode, startedAt: e.startedAt, stoppedAt: e.stoppedAt, finished: !!e.finished, retryOf: e.retryOf ? maskId(e.retryOf) : null, errorPreview: (status === "error" || status === "failed") ? "ошибка выполнения — открой n8n UI для деталей (payload скрыт)" : "" }, safety: N8N_SAFETY };
}

export async function n8nSummary() {
  const wf = await n8nWorkflows();
  const ex = await n8nExecutions();
  return { ok: true, at: now(), online: wf.online || ex.online, apiKeyConfigured: !!process.env.N8N_API_KEY, reason: wf.online ? undefined : wf.reason, workflows: wf.counts || { total: 0, active: 0 }, executions: ex.counts || { total: 0, success: 0, failed: 0, running: 0 }, lastRun: (ex.executions && ex.executions[0]) ? ex.executions[0].startedAt : null, safety: N8N_SAFETY };
}

// ---------------- N8N CONTROLLED EXECUTOR GATE (T8 — dry-arm only by default) ----------------
export const EXECUTOR_SAFETY = { mode: "MANUAL_ONLY_EXECUTOR_GATE", oneWorkflowOnly: true, executorDryArmOnly: true, workflowExecutionAllowed: false, workflowMutationAllowed: false, retryAllowed: false, massExecutionAllowed: false, backgroundExecutionAllowed: false, scheduleExecutionAllowed: false, telegramSendAllowed: false, socialPublishAllowed: false, credentialsVisible: false, secretsVisible: false, tokensVisible: false, payloadVisible: false, autonomousActionsAllowed: false };
export const EXECUTION_SAFETY = { mode: "CONTROLLED_ONE_WORKFLOW_EXECUTION", oneWorkflowOnly: true, operatorConfirmedRequired: true, confirmationPhraseRequired: true, executorEnvRequired: true, retryAllowed: false, massExecutionAllowed: false, backgroundExecutionAllowed: false, scheduleExecutionAllowed: false, telegramSendAllowed: false, socialPublishAllowed: false, credentialsVisible: false, secretsVisible: false, tokensVisible: false, payloadVisible: false, autonomousActionsAllowed: false };
const EXECUTOR_PHRASE = "EXECUTE ONE WHITELISTED WORKFLOW";
function nodeForbidden(type) { const t = String(type || "").toLowerCase(); return /telegram|emailsend|sendemail|gmail|executecommand|\bssh\b|respondtowebhook|twitter|facebook|instagram|linkedin|tiktok|mastodon|social|publish|deletefile|removefile/.test(t) || /delete|drop|truncate/.test(t); }
// SAFE_WEBHOOK_TRIGGER profile: explicitly allow ONLY the safe webhook node set (webhook trigger,
// set/editFields transform, respondToWebhook final). Everything else still defers to nodeForbidden,
// so Telegram/email/social/shell/delete/DB-destructive stay forbidden. Not a global relaxation.
function nodeForbiddenWebhookProfile(type) {
  const t = String(type || "").toLowerCase();
  if (/(^|\.)webhook$/.test(t) || /respondtowebhook/.test(t) || /(^|\.)set$/.test(t) || /editfields/.test(t) || /(^|\.)noop$/.test(t) || /(^|\.)filter$/.test(t) || /(^|\.)if$/.test(t) || /(^|\.)switch$/.test(t) || /(^|\.)merge$/.test(t)) return false;
  return nodeForbidden(type);
}

export async function executorGate(id, b) {
  b = b || {};
  const enabled = process.env.N8N_EXECUTOR_ENABLED === "true";
  const g = await n8nWorkflowGraph(id);
  if (!g.online) return { ok: false, mode: "EXECUTOR_DRY_ARM_ONLY", executionPerformed: false, executionAllowed: false, reason: "graph_unavailable:" + (g.reason || "—"), safety: EXECUTOR_SAFETY };
  const forbiddenNodes = (g.nodes || []).filter((n) => nodeForbidden(n.type)).map((n) => ({ name: n.name, type: n.type }));
  const riskyCount = (g.counts && g.counts.risky) || 0;
  const credUsed = (g.counts && g.counts.credentialsUsed) || 0;
  const phraseOk = b.confirmPhrase === EXECUTOR_PHRASE;
  const checks = {
    n8nKeyConfigured: !!process.env.N8N_API_KEY,
    workflowExists: true,
    workflowWhitelisted: b.whitelisted === true,
    graphInspected: b.graphInspected === true,
    executionsInspected: b.executionsInspected === true,
    riskyAcknowledged: riskyCount === 0 || b.riskyAcknowledged === true,
    credentialsAcknowledged: credUsed === 0 || b.credentialsAcknowledged === true,
    noForbiddenNodes: forbiddenNodes.length === 0,
    confirmationPhrase: phraseOk,
    manualGateArmed: b.armed === true,
    executorEnvEnabled: enabled
  };
  const blockers = Object.keys(checks).filter((k) => !checks[k]);
  const gatesPassed = blockers.length === 0;
  const wantExecute = b.execute === true && b.operatorConfirmed === true;
  const executionAllowed = enabled && gatesPassed && forbiddenNodes.length === 0;

  // ---- DRY / BLOCKED path (default; env off, or not executing, or gate not fully passed) ----
  if (!wantExecute || !executionAllowed) {
    const blockedReasons = forbiddenNodes.length > 0 ? ["FORBIDDEN_NODE_PRESENT"] : blockers;
    return {
      ok: true,
      mode: enabled ? "EXECUTOR_DRY_ARM_ONLY" : "EXECUTOR_DRY_ARM_ONLY",
      executionPerformed: false,
      executionAllowed,
      enabled,
      gatesPassed,
      blockers,
      blockedReasons,
      forbiddenNodes,
      riskyNodes: riskyCount,
      credentialsUsed: credUsed,
      reason: forbiddenNodes.length > 0 ? "FORBIDDEN_NODE_PRESENT" : (!enabled ? "Execution disabled on server. Set N8N_EXECUTOR_ENABLED=true for controlled execution (gates still enforced)." : !gatesPassed ? "Gate not fully passed." : !wantExecute ? "Armed (dry). Press Execute with operatorConfirmed to run one workflow." : "Blocked."),
      safety: enabled ? EXECUTION_SAFETY : EXECUTOR_SAFETY
    };
  }

  // ---- CONTROLLED LIVE: execute exactly ONE workflow, timeout-guarded, payload-free summary ----
  const startedAt = now();
  let exId = null, status = "unknown", httpStatus = 0;
  try {
    const key = process.env.N8N_API_KEY;
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 20000);
    const r = await fetch(N8N_URL + "/api/v1/workflows/" + encodeURIComponent(id) + "/run", { method: "POST", headers: { "X-N8N-API-KEY": key, "content-type": "application/json" }, body: "{}", signal: c.signal });
    clearTimeout(t); httpStatus = r.status;
    if (r.ok) { const j = await r.json().catch(() => null); exId = j && (j.executionId || (j.data && (j.data.executionId || j.data.id)) || j.id) || null; status = "started"; }
    else { status = "run_endpoint_http_" + r.status; }
  } catch (e) { status = "run_error:" + String((e && e.name) || e); }
  const stoppedAt = now();
  const executionPerformed = status === "started";
  const evidenceId = "ev_" + Math.random().toString(36).slice(2, 10);
  const summarySafe = { status, startedAt, stoppedAt, httpStatusClass: httpStatus ? (Math.floor(httpStatus / 100) + "xx") : "none" };
  const evidence = { evidenceId, type: "N8N_ONE_WORKFLOW_EXECUTION", timestamp: now(), workflowIdMasked: maskId(id), workflowName: g.workflowName, executionIdMasked: exId ? maskId(exId) : null, operatorDecision: "manual_execute_one", preflightSnapshot: { gatesPassed, blockers, riskyNodes: riskyCount, credentialsUsed: credUsed }, graphSnapshotSafe: { nodes: (g.counts && g.counts.nodes) || 0, edges: (g.counts && g.counts.edges) || 0, risky: riskyCount, triggers: (g.counts && g.counts.triggers) || 0 }, executionSummarySafe: summarySafe, safety: EXECUTION_SAFETY };
  return {
    ok: true,
    mode: "CONTROLLED_ONE_WORKFLOW_EXECUTION",
    executionPerformed,
    executionAllowed: true,
    workflowIdMasked: maskId(id),
    workflowName: g.workflowName,
    executionIdMasked: exId ? maskId(exId) : null,
    status,
    startedAt,
    stoppedAt,
    durationMs: new Date(stoppedAt).getTime() - new Date(startedAt).getTime(),
    evidenceId,
    evidence,
    blockedReasons: [],
    reason: executionPerformed ? "One workflow execution triggered (no retry, no loop, payload hidden)." : ("Execution attempt finished without confirmed start: " + status + ". Возможно, версия n8n не поддерживает /run через public API — используй ручной webhook-триггер."),
    safety: EXECUTION_SAFETY
  };
}

// ---------------- N8N SAFE WEBHOOK TRIGGER (T8.6 — one test-only run, env-gated) ----------------
export const WEBHOOK_SAFETY = { mode: "SAFE_WEBHOOK_TRIGGER", oneWorkflowOnly: true, testPayloadOnly: true, operatorConfirmedRequired: true, confirmationPhraseRequired: true, executorEnvRequired: true, retryAllowed: false, massExecutionAllowed: false, backgroundExecutionAllowed: false, scheduleExecutionAllowed: false, telegramSendAllowed: false, socialPublishAllowed: false, credentialsVisible: false, secretsVisible: false, tokensVisible: false, rawPayloadVisible: false, rawResponseVisible: false, autonomousActionsAllowed: false };
const WEBHOOK_PHRASE = "TRIGGER ONE SAFE WEBHOOK WORKFLOW";
const PAYLOAD_FORBIDDEN = ["token", "session", "phone", "api_id", "api_hash", "credential", "password", "secret", "webhooksecret", "rawuserdata", "telegramtarget", "socialtarget", "masstarget", "privatemessage", "filecontent"];
function sanitizePayload(p) { const out = {}; for (const k of Object.keys(p || {})) { if (PAYLOAD_FORBIDDEN.indexOf(String(k).toLowerCase()) < 0) out[k] = p[k]; } return out; }

export async function webhookTriggerGate(id, b) {
  b = b || {};
  const enabled = process.env.N8N_WEBHOOK_EXECUTOR_ENABLED === "true";
  const detail = await n8nApi("/api/v1/workflows/" + encodeURIComponent(id));
  if (!detail.ok) return { ok: false, mode: "SAFE_WEBHOOK_TRIGGER", executionPerformed: false, reason: detail.reason || "workflow_unavailable", safety: WEBHOOK_SAFETY };
  const wf = detail.json || {};
  const g = await n8nWorkflowGraph(id);
  const forbiddenList = g.online ? (g.nodes || []).filter((n) => nodeForbiddenWebhookProfile(n.type)).map((n) => n.type) : [];
  const forbiddenCount = forbiddenList.length;
  const riskyCount = (g.counts && g.counts.risky) || 0;
  const credUsed = (g.counts && g.counts.credentialsUsed) || 0;
  // locate webhook trigger node from RAW nodes (params used internally only, never returned)
  const whNode = (wf.nodes || []).find((n) => /webhook/i.test(String(n.type)) && !/respond/i.test(String(n.type)));
  const path = whNode && whNode.parameters ? (whNode.parameters.path || whNode.webhookId || "") : "";
  const method = whNode && whNode.parameters && whNode.parameters.httpMethod ? String(whNode.parameters.httpMethod).toUpperCase() : "POST";
  const webhookUrl = path ? (N8N_URL + "/webhook/" + path) : "";
  const webhookUrlMasked = path ? (N8N_URL + "/webhook/" + maskId(path)) : "—";
  const phraseOk = b.confirmationPhrase === WEBHOOK_PHRASE;
  const checks = {
    executorEnvEnabled: enabled,
    hasWebhookNode: !!path,
    webhookPostMethod: method === "POST",
    operatorConfirmed: b.operatorConfirmed === true,
    confirmationPhrase: phraseOk,
    oneWorkflowOnly: b.oneWorkflowOnly === true,
    webhookWhitelisted: b.webhookWhitelisted === true,
    graphInspected: b.graphInspected === true,
    executionsInspected: b.executionsInspected === true,
    riskyAcknowledged: riskyCount === 0 || b.riskyNodesAcknowledged === true,
    credentialsAcknowledged: credUsed === 0 || b.credentialsUsedAcknowledged === true,
    noForbiddenNodes: forbiddenCount === 0,
    preflightReady: b.preflightStatus === "READY",
    testPayloadOnly: b.testPayloadOnly === true
  };
  const blockedReasons = Object.keys(checks).filter((k) => !checks[k]);
  const payloadPreviewSafe = sanitizePayload({ mode: "TEST_ONLY", source: "DEEPINSIDE_EXECUTOR_GATE", timestamp: now(), operator: "manual", runType: "one_webhook_workflow", message: "safe test payload" });

  // ---- DRY / BLOCKED ----
  if (!enabled || blockedReasons.length > 0) {
    return { ok: true, mode: "SAFE_WEBHOOK_TRIGGER", executionPerformed: false, executionAllowed: enabled && blockedReasons.length === 0, enabled, workflowIdMasked: maskId(id), workflowName: wf.name, webhookUrlMasked, webhookMethod: method, forbiddenNodesCount: forbiddenCount, riskyNodes: riskyCount, credentialsUsed: credUsed, testPayloadPreviewSafe: payloadPreviewSafe, blockedReasons, reason: forbiddenCount > 0 ? "FORBIDDEN_NODE_PRESENT" : (!enabled ? "Webhook execution disabled on server. Set N8N_WEBHOOK_EXECUTOR_ENABLED=true (gates still enforced)." : !path ? "NO_WEBHOOK_NODE" : "Gate not fully passed."), safety: WEBHOOK_SAFETY };
  }

  // ---- LIVE: ONE POST of the static, sanitized TEST payload. No retry. ----
  const t0 = Date.now();
  let statusCode = 0, status = "unknown";
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
    const r = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payloadPreviewSafe), signal: c.signal });
    clearTimeout(t); statusCode = r.status; status = r.ok ? "delivered" : ("http_" + r.status);
  } catch (e) { status = "error:" + String((e && e.name) || e); }
  const durationMs = Date.now() - t0;
  const executionPerformed = status === "delivered";
  const responseSummarySafe = { statusCode, statusClass: statusCode ? (Math.floor(statusCode / 100) + "xx") : "none", delivered: executionPerformed };
  const evidenceId = "whev_" + Math.random().toString(36).slice(2, 10);
  const evidence = { evidenceId, type: "N8N_SAFE_WEBHOOK_TRIGGER", timestamp: now(), workflowIdMasked: maskId(id), workflowName: wf.name, webhookUrlMasked, operatorDecision: "manual_trigger_one_webhook", preflightSnapshot: { blockedReasons: [], riskyNodes: riskyCount, credentialsUsed: credUsed, forbiddenNodesCount: forbiddenCount }, graphSnapshotSafe: { nodes: (g.counts && g.counts.nodes) || 0, edges: (g.counts && g.counts.edges) || 0, triggers: (g.counts && g.counts.triggers) || 0 }, testPayloadPreviewSafe: payloadPreviewSafe, responseSummarySafe, safety: WEBHOOK_SAFETY };
  return { ok: true, mode: "SAFE_WEBHOOK_TRIGGER", executionPerformed, executionAllowed: true, workflowIdMasked: maskId(id), workflowName: wf.name, webhookUrlMasked, webhookMethod: "POST", status, statusCode, durationMs, evidenceId, evidence, blockedReasons: [], responseSummarySafe, testPayloadPreviewSafe: payloadPreviewSafe, reason: executionPerformed ? "Test payload delivered to webhook (one POST, no retry, body hidden)." : ("Webhook POST finished without delivery: " + status + " (no retry)."), safety: WEBHOOK_SAFETY };
}

// ---------------- HOST METRICS ----------------
export async function hostStatus() {
  const total = os.totalmem(), free = os.freemem();
  const load = os.loadavg();
  const cpus = os.cpus() || [];
  let gpu = null;
  const g = await run("nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits", 2500);
  if (g.ok && g.out) { const p = g.out.split(",").map((x) => x.trim()); gpu = { util: p[0] + "%", memUsed: p[1] + "MB", memTotal: p[2] + "MB" }; }
  return { online: true, at: now(), cpuCount: cpus.length, cpuModel: (cpus[0] && cpus[0].model) || "?", load1: load[0].toFixed(2), memUsedPct: Math.round((1 - free / total) * 100), memUsedGB: ((total - free) / 1e9).toFixed(1), memTotalGB: (total / 1e9).toFixed(1), gpu, uptimeH: (os.uptime() / 3600).toFixed(1) };
}

// ---------------- AGGREGATE + SYSTEM MAP ----------------
export async function infraStatus() {
  const [docker, ollama, qdrant, redis, postgres, minio, n8n, host] = await Promise.all([
    dockerStatus().catch(() => ({ online: false, reason: "error" })),
    ollamaStatus().catch(() => ({ online: false, reason: "error" })),
    qdrantStatus().catch(() => ({ online: false, reason: "error" })),
    redisStatus().catch(() => ({ online: false, reason: "error" })),
    postgresStatus().catch(() => ({ online: false, reason: "error" })),
    minioStatus().catch(() => ({ online: false, reason: "error" })),
    n8nStatus().catch(() => ({ online: false, reason: "error" })),
    hostStatus().catch(() => ({ online: false, reason: "error" }))
  ]);
  const node = (name, on) => ({ name, status: on ? "Connected" : "Disconnected", health: on ? "ok" : "down" });
  const systemMap = [node("Docker", docker.online), node("n8n", n8n.online), node("PostgreSQL", postgres.online), node("Qdrant", qdrant.online), node("Redis", redis.online), node("MinIO", minio.online), node("Ollama", ollama.online), node("Host", host.online)];
  const onlineCount = systemMap.filter((n) => n.status === "Connected").length;
  return { ok: true, at: now(), services: { docker, ollama, qdrant, redis, postgres, minio, n8n, host }, systemMap, healthScore: Math.round((onlineCount / systemMap.length) * 100), safety: { readOnlyByDefault: true, secretsExposed: false, autoPublish: false, realTelegramActions: false, controlRequiresConfirmation: true } };
}
