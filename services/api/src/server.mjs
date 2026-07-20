import http from "node:http";
import { loadLocalEnv } from "./env.mjs";
import { getAiStatus } from "./ai-runtime.mjs";
import { generateDraftReply } from "./ai-chat.mjs";
import { getRecentMemory } from "./memory-store.mjs";
import {
  getConfig,
  getLocalRuntimeState,
  getChats,
  getStatus,
  createAccountSlot,
  selectAccountSlot,
  removeAccountSlot,
  getMessages,
  getPhoto,
  getQrImage,
  logout,
  requestPhoneAuth,
  requestQrAuth,
  resetAuth,
  verifyCode,
  verify2fa,
  sendMessage
} from "./telegram-runtime.mjs";
import { evaluatePolicy } from "./policy.mjs";
import { appendEvent as auditAppend, sha256 as auditSha, listEvents as auditList } from "./operator-audit.mjs";
import { enqueueSchedule, tickSchedule, listSchedule } from "./schedule-queue.mjs";
import { trustedSendApprovalFromHeaders } from "./internal-approval.mjs";

await loadLocalEnv();

const host = process.env.EPICGRAM_API_HOST || "127.0.0.1";
const port = Number(process.env.EPICGRAM_API_PORT || 8788);
const webClientUrl = process.env.EPICGRAM_WEB_CLIENT_URL || "http://127.0.0.1:3015/";

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function send(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function sendBinary(response, status, body, contentType) {
  response.writeHead(status, {
    "content-type": contentType,
    "access-control-allow-origin": "*",
    "cache-control": status === 200 ? "public, max-age=86400" : "no-store"
  });
  response.end(body);
}

function trustedSendApproval(request) {
  return trustedSendApprovalFromHeaders(request.headers);
}

function redirect(response, location) {
  response.writeHead(302, {
    location,
    "cache-control": "no-store"
  });
  response.end();
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

    if (request.method === "OPTIONS") return send(response, 204, {});
    if (request.method === "GET" && url.pathname === "/") {
      const accept = request.headers.accept ?? "";
      if (accept.includes("text/html")) return redirect(response, webClientUrl);
      return send(response, 200, {
        ok: true,
        service: "epicgram-api",
        webClientUrl,
        health: "/health",
        telegramStatus: "/telegram/status"
      });
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return send(response, 200, { ok: true, service: "epicgram-api" });
    }
    // ---- Media connectors: ElevenLabs (TTS) + fal.ai (image/video). Keys from env only. ----
    if (request.method === "GET" && url.pathname === "/media/status") {
      const { mediaStatus } = await import("./media-connectors.mjs");
      return send(response, 200, mediaStatus());
    }
    if (request.method === "GET" && url.pathname === "/media/voices") {
      const { listVoicesElevenLabs } = await import("./media-connectors.mjs");
      return send(response, 200, await listVoicesElevenLabs());
    }
    if (request.method === "POST" && url.pathname === "/media/tts") {
      const { ttsElevenLabs } = await import("./media-connectors.mjs");
      const out = await ttsElevenLabs(await readJson(request));
      return send(response, out.ok ? 200 : (out.status || 500), out);
    }
    if (request.method === "POST" && url.pathname === "/media/image") {
      const { genImageFal } = await import("./media-connectors.mjs");
      const out = await genImageFal(await readJson(request));
      return send(response, out.ok ? 200 : (out.status || 500), out);
    }
    if (request.method === "POST" && url.pathname === "/media/video/submit") {
      const { submitVideoFal } = await import("./media-connectors.mjs");
      const out = await submitVideoFal(await readJson(request));
      return send(response, out.ok ? 200 : (out.status || 500), out);
    }
    if (request.method === "POST" && url.pathname === "/media/video/poll") {
      const { pollVideoFal } = await import("./media-connectors.mjs");
      const out = await pollVideoFal(await readJson(request));
      return send(response, out.ok ? 200 : (out.status || 500), out);
    }
    // ---- PHASE T: Live Infrastructure Bridge (read-only introspection + guarded local control) ----
    if (request.method === "GET" && url.pathname === "/infra/status") {
      const { infraStatus } = await import("./infra-bridge.mjs");
      return send(response, 200, await infraStatus());
    }
    if (request.method === "GET" && url.pathname === "/infra/docker") {
      const { dockerStatus } = await import("./infra-bridge.mjs");
      return send(response, 200, await dockerStatus());
    }
    if (request.method === "GET" && url.pathname === "/infra/ollama") {
      const { ollamaStatus } = await import("./infra-bridge.mjs");
      return send(response, 200, await ollamaStatus());
    }
    if (request.method === "GET" && url.pathname === "/infra/qdrant") {
      const { qdrantStatus } = await import("./infra-bridge.mjs");
      return send(response, 200, await qdrantStatus());
    }
    if (request.method === "GET" && url.pathname === "/infra/redis") {
      const { redisStatus } = await import("./infra-bridge.mjs");
      return send(response, 200, await redisStatus());
    }
    if (request.method === "GET" && url.pathname === "/infra/postgres") {
      const { postgresStatus } = await import("./infra-bridge.mjs");
      return send(response, 200, await postgresStatus());
    }
    if (request.method === "GET" && url.pathname === "/infra/minio") {
      const { minioStatus } = await import("./infra-bridge.mjs");
      return send(response, 200, await minioStatus());
    }
    if (request.method === "GET" && url.pathname === "/infra/n8n") {
      const { n8nStatus } = await import("./infra-bridge.mjs");
      return send(response, 200, await n8nStatus());
    }
    if (request.method === "GET" && url.pathname === "/infra/n8n/summary") {
      const { n8nSummary } = await import("./infra-bridge.mjs");
      return send(response, 200, await n8nSummary());
    }
    if (request.method === "GET" && url.pathname === "/infra/n8n/workflows") {
      const { n8nWorkflows } = await import("./infra-bridge.mjs");
      return send(response, 200, await n8nWorkflows());
    }
    if (request.method === "GET" && url.pathname === "/infra/n8n/executions") {
      const { n8nExecutions } = await import("./infra-bridge.mjs");
      return send(response, 200, await n8nExecutions());
    }
    if (request.method === "GET" && url.pathname.startsWith("/infra/n8n/executions/")) {
      const id = decodeURIComponent(url.pathname.slice("/infra/n8n/executions/".length));
      const { n8nExecutionDetail } = await import("./infra-bridge.mjs");
      return send(response, 200, await n8nExecutionDetail(id));
    }
    if (request.method === "GET" && url.pathname.startsWith("/infra/n8n/workflows/")) {
      let rest = url.pathname.slice("/infra/n8n/workflows/".length);
      const mod = await import("./infra-bridge.mjs");
      if (rest.endsWith("/graph")) {
        const id = decodeURIComponent(rest.slice(0, -"/graph".length));
        return send(response, 200, await mod.n8nWorkflowGraph(id));
      }
      return send(response, 200, await mod.n8nWorkflowDetail(decodeURIComponent(rest)));
    }
    if (request.method === "POST" && url.pathname.startsWith("/infra/n8n/workflows/") && url.pathname.endsWith("/executor-gate")) {
      const id = decodeURIComponent(url.pathname.slice("/infra/n8n/workflows/".length, -"/executor-gate".length));
      const { executorGate } = await import("./infra-bridge.mjs");
      return send(response, 200, await executorGate(id, await readJson(request)));
    }
    if (request.method === "POST" && url.pathname.startsWith("/infra/n8n/workflows/") && url.pathname.endsWith("/webhook-trigger-gate")) {
      const id = decodeURIComponent(url.pathname.slice("/infra/n8n/workflows/".length, -"/webhook-trigger-gate".length));
      const { webhookTriggerGate } = await import("./infra-bridge.mjs");
      return send(response, 200, await webhookTriggerGate(id, await readJson(request)));
    }
    if (request.method === "GET" && url.pathname === "/infra/host") {
      const { hostStatus } = await import("./infra-bridge.mjs");
      return send(response, 200, await hostStatus());
    }
    if (request.method === "POST" && url.pathname === "/infra/docker/action") {
      const { dockerAction } = await import("./infra-bridge.mjs");
      return send(response, 200, await dockerAction(await readJson(request)));
    }
    if (request.method === "POST" && url.pathname === "/infra/ollama/action") {
      const { ollamaAction } = await import("./infra-bridge.mjs");
      return send(response, 200, await ollamaAction(await readJson(request)));
    }
    if (request.method === "GET" && url.pathname === "/ai/status") {
      return send(response, 200, getAiStatus());
    }
    if (request.method === "POST" && url.pathname === "/ai/suggest") {
      const payload = await readJson(request);
      const tg = payload?.tgContext ?? {};
      const instruction = payload?.instruction || payload?.command || payload?.prompt || "";
      const history =
        Array.isArray(payload?.history) ? payload.history :
        Array.isArray(payload?.messages) ? payload.messages :
        Array.isArray(tg?.messages) ? tg.messages :
        [];
      const chatId = payload?.chatId || payload?.conversationId || tg?.chatId || null;
      const chatTitle = payload?.chatTitle || tg?.chatTitle || tg?.title || null;
      const result = await generateDraftReply({
        conversationId: chatId,
        chatTitle,
        history,
        instruction
      });
      let auditId = null;
      const draftText = String(result?.draft || "").trim();
      if (result?.ok && draftText) {
        try {
          const rec = auditAppend({
            status: "proposed",
            actor: "ai",
            source: "ai_suggest",
            tool: "draft_reply",
            actionType: "telegram_send",
            chatId,
            chatTitle,
            model: result?.model || null,
            messageCount: history.length,
            preview: draftText,
            textSha256: auditSha(draftText),
            safety: { executedExternalAction: false, sendBlocked: true, autoSendBlocked: true, approvalRequiredForSend: true },
            policy: evaluatePolicy({ actionType: "telegram_send", autoSend: false })
          });
          auditId = rec.auditId;
        } catch {}
      }
      return send(response, result.ok ? 200 : result.status ?? 502, {
        ...result,
        selectedChatId: chatId,
        selectedChatTitle: chatTitle,
        messagesCount: history.length,
        hasInstruction: Boolean(instruction),
        auditId
      });
    }
    if (request.method === "GET" && url.pathname === "/ai/audit") {
      const n = Number(url.searchParams.get("n")) || 50;
      return send(response, 200, { ok: true, events: auditList({ n }) });
    }
    if (request.method === "POST" && (url.pathname === "/ai/audit/reject" || url.pathname === "/operator/reject")) {
      const b = await readJson(request);
      const actionType = typeof b?.actionType === "string" ? b.actionType : "telegram_send";
      const rec = auditAppend({
        auditId: typeof b?.auditId === "string" ? b.auditId : undefined,
        status: "rejected",
        actor: "operator",
        source: "approval_card",
        tool: typeof b?.tool === "string" ? b.tool : "draft_reply",
        actionType,
        chatId: b?.chatId ?? null,
        chatTitle: b?.chatTitle ?? null,
        messageCount: 0,
        reason: typeof b?.reason === "string" ? b.reason : "operator_dismissed",
        safety: { executedExternalAction: false, sendBlocked: true, autoSendBlocked: true, approvalRequiredForSend: true },
        policy: evaluatePolicy({ actionType, autoSend: false })
      });
      return send(response, 200, { ok: true, auditId: rec.auditId, status: "rejected" });
    }
    if (request.method === "POST" && url.pathname === "/ai/route") {
      const payload = await readJson(request);
      const { routeCommand } = await import("./tool-router.mjs");
      const routed = await routeCommand(payload);
      return send(response, routed.ok ? 200 : (routed.status ?? 200), routed);
    }
    if (request.method === "POST" && url.pathname === "/ai/schedule/approve") {
      const r = enqueueSchedule(await readJson(request));
      return send(response, r.ok ? 200 : (r.http || 400), r);
    }
    if (request.method === "POST" && url.pathname === "/ai/schedule/tick") {
      const r = await tickSchedule();
      return send(response, 200, r);
    }
    if (request.method === "GET" && url.pathname === "/ai/schedule/list") {
      return send(response, 200, { ok: true, items: listSchedule() });
    }
    if (request.method === "GET" && url.pathname === "/ai/memory") {
      const conversationId = url.searchParams.get("conversationId") ?? url.searchParams.get("chatId");
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const entries = await getRecentMemory(conversationId, Number.isFinite(limit) ? limit : 20);
      return send(response, 200, { conversationId, count: entries.length, entries });
    }
    if (request.method === "POST" && url.pathname === "/telegram/send") {
      const sendBody = await readJson(request);
      const result = await sendMessage(sendBody, { operatorApproved: trustedSendApproval(request) });
      try {
        const executed = result?.status >= 200 && result?.status < 300;
        const text = String(sendBody?.text || "").trim();
        const actionType = sendBody?.actionType === "publish_post" ? "publish_post" : "telegram_send";
        auditAppend({
          auditId: typeof sendBody?.auditId === "string" ? sendBody.auditId : undefined,
          status: executed ? "executed" : (result?.status === 412 ? "blocked" : "rejected"),
          actor: "operator",
          source: "telegram_send",
          tool: actionType === "publish_post" ? "prepare_post" : "draft_reply",
          actionType,
          chatId: sendBody?.chatId ?? null,
          chatTitle: sendBody?.chatTitle ?? null,
          messageCount: 0,
          preview: text,
          textSha256: text ? auditSha(text) : null,
          safety: { executedExternalAction: executed, sendBlocked: !executed, autoSendBlocked: true, approvalRequiredForSend: true },
          policy: evaluatePolicy({ actionType, autoSend: false })
        });
      } catch {}
      return send(response, result.status, result.body);
    }
    if (request.method === "GET" && url.pathname === "/telegram/status") {
      return send(response, 200, await getStatus());
    }
    if (request.method === "GET" && url.pathname === "/telegram/config") {
      return send(response, 200, await getConfig());
    }
    if (request.method === "GET" && url.pathname === "/telegram/state") {
      const result = await getLocalRuntimeState();
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/accounts/new") {
      const result = await createAccountSlot();
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/accounts/select") {
      const result = await selectAccountSlot(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/accounts/remove") {
      const result = await removeAccountSlot(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "GET" && url.pathname === "/telegram/chats") {
      const result = await getChats({ accountId: url.searchParams.get("accountId") });
      return send(response, result.status, result.body);
    }
    if (request.method === "GET" && url.pathname === "/telegram/messages") {
      const result = await getMessages({
        accountId: url.searchParams.get("accountId"),
        chatId: url.searchParams.get("chatId")
      });
      return send(response, result.status, result.body);
    }
    if (request.method === "GET" && url.pathname === "/telegram/photo") {
      const result = await getPhoto({
        accountId: url.searchParams.get("accountId"),
        fileId: url.searchParams.get("fileId")
      });
      return sendBinary(response, result.status, result.body, result.contentType);
    }
    if (request.method === "GET" && url.pathname === "/telegram/auth/qr-image") {
      // PHASE N.1: additive read-only route. Renders the current QR login link
      // as PNG. no-store because QR login tokens rotate (do not cache).
      const result = await getQrImage({ accountId: url.searchParams.get("accountId") });
      response.writeHead(result.status, {
        "content-type": result.contentType,
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      });
      return response.end(result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/qr") {
      const result = await requestQrAuth(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/phone") {
      const result = await requestPhoneAuth(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/code") {
      const result = await verifyCode(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/2fa") {
      const result = await verify2fa(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/reset") {
      const result = await resetAuth(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/logout") {
      const result = await logout(await readJson(request));
      return send(response, result.status, result.body);
    }

    if (request.method === "GET" && url.pathname === "/operator/status") {
      const { buildOperatorStatus } = await import("./operator-core.mjs");
      return send(response, 200, await buildOperatorStatus());
    }
    if (request.method === "GET" && url.pathname === "/operator/context/status") {
      const { contextEngineStatus } = await import("./operator-core.mjs");
      return send(response, 200, contextEngineStatus());
    }
    if (request.method === "GET" && url.pathname === "/operator/simulation/status") {
      const { simulationStatus } = await import("./operator-core.mjs");
      return send(response, 200, simulationStatus());
    }
    if (request.method === "GET" && url.pathname === "/operator/brain/status") {
      const { buildBrainStatus } = await import("./operator-brain-bootstrap.mjs");
      return send(response, 200, await buildBrainStatus());
    }
    if (request.method === "POST" && url.pathname === "/operator/brain/check") {
      const b = await readJson(request);
      const { checkBrain } = await import("./operator-brain-bootstrap.mjs");
      return send(response, 200, await checkBrain(b));
    }
    if (request.method === "GET" && url.pathname === "/operator/brain/start-instructions") {
      const { startInstructions } = await import("./operator-brain-bootstrap.mjs");
      return send(response, 200, startInstructions());
    }
    if (request.method === "GET" && url.pathname === "/operator/brain/config") {
      const { brainConfig } = await import("./operator-brain-bootstrap.mjs");
      return send(response, 200, brainConfig());
    }
    if (request.method === "POST" && url.pathname === "/operator/brain/select-endpoint") {
      const b = await readJson(request);
      const { selectEndpoint } = await import("./operator-brain-bootstrap.mjs");
      return send(response, 200, selectEndpoint(b));
    }
    if (request.method === "GET" && url.pathname === "/operator/analytics/status") {
      const { analyticsStatus } = await import("./operator-analytics.mjs");
      return send(response, 200, analyticsStatus());
    }
    if (request.method === "POST" && url.pathname === "/operator/analytics/score-draft") {
      const b = await readJson(request);
      const { scoreDraft } = await import("./operator-analytics.mjs");
      return send(response, 200, scoreDraft(b.draft || b));
    }
    if (request.method === "POST" && url.pathname === "/operator/analytics/suggestions/accept") {
      const b = await readJson(request);
      const { acceptSuggestion } = await import("./operator-analytics.mjs");
      return send(response, 200, acceptSuggestion(b));
    }
    if (request.method === "GET" && url.pathname === "/operator/production/status") {
      const { productionStatus } = await import("./production-gate.mjs");
      return send(response, 200, productionStatus());
    }
    if (request.method === "POST" && url.pathname === "/operator/production/check") {
      const b = await readJson(request);
      const { runProductionCheck } = await import("./production-gate.mjs");
      return send(response, 200, await runProductionCheck(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/production/request-live") {
      const b = await readJson(request);
      const { requestLive } = await import("./production-gate.mjs");
      return send(response, 200, requestLive(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/production/enable-live") {
      const b = await readJson(request);
      const { enableLive } = await import("./production-gate.mjs");
      return send(response, 200, enableLive(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/production/disable-live") {
      const { disableLive } = await import("./production-gate.mjs");
      return send(response, 200, disableLive());
    }
    if (request.method === "POST" && url.pathname === "/operator/production/lock") {
      const b = await readJson(request);
      const { lockRuntime } = await import("./production-gate.mjs");
      return send(response, 200, lockRuntime(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/production/unlock") {
      const b = await readJson(request);
      const { unlockRuntime } = await import("./production-gate.mjs");
      return send(response, 200, unlockRuntime(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/production/validate-send-guard") {
      const b = await readJson(request);
      const { validateSendGuard } = await import("./production-gate.mjs");
      return send(response, 200, validateSendGuard(b));
    }
    if ((request.method === "GET" || request.method === "POST") && (url.pathname === "/operator/ops/status" || url.pathname === "/operator/ops/refresh")) {
      if (request.method === "POST") await readJson(request);
      const { getLiveOpsStatus } = await import("./live-ops-monitor.mjs");
      return send(response, 200, await getLiveOpsStatus());
    }
    if (request.method === "GET" && url.pathname === "/operator/ops/incidents") {
      const { getLiveOpsStatus } = await import("./live-ops-monitor.mjs");
      const s = await getLiveOpsStatus();
      return send(response, 200, { ok: true, incidents: s.ops.incidents });
    }
    if (request.method === "POST" && url.pathname === "/operator/ops/recovery-action") {
      const b = await readJson(request);
      const { recoveryAction } = await import("./live-ops-monitor.mjs");
      return send(response, 200, await recoveryAction(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/ops/emergency-lock") {
      const b = await readJson(request);
      const { emergencyLock } = await import("./live-ops-monitor.mjs");
      return send(response, 200, await emergencyLock(b));
    }
    if (request.method === "GET" && url.pathname === "/operator/live-pilot/status") {
      const { livePilotStatus } = await import("./live-pilot.mjs");
      return send(response, 200, livePilotStatus());
    }
    if (request.method === "GET" && url.pathname.indexOf("/operator/live-pilot/report/") === 0) {
      const { pilotReport } = await import("./live-pilot.mjs");
      return send(response, 200, pilotReport(decodeURIComponent(url.pathname.split("/operator/live-pilot/report/")[1] || "")));
    }
    if (request.method === "POST" && url.pathname === "/operator/live-pilot/preflight") {
      const b = await readJson(request);
      const { preflight } = await import("./live-pilot.mjs");
      return send(response, 200, await preflight(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/live-pilot/create") {
      const b = await readJson(request);
      const { createPilot } = await import("./live-pilot.mjs");
      return send(response, 200, await createPilot(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/live-pilot/create-draft") {
      const b = await readJson(request);
      const { createDraft } = await import("./live-pilot.mjs");
      return send(response, 200, await createDraft(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/live-pilot/approve-draft") {
      const b = await readJson(request);
      const { approveDraft } = await import("./live-pilot.mjs");
      return send(response, 200, approveDraft(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/live-pilot/confirm-send") {
      const b = await readJson(request);
      const { confirmSend } = await import("./live-pilot.mjs");
      return send(response, 200, await confirmSend(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/live-pilot/cancel") {
      const b = await readJson(request);
      const { cancelPilot } = await import("./live-pilot.mjs");
      return send(response, 200, cancelPilot(b));
    }
    if (request.method === "GET" && url.pathname === "/operator/live-wizard/status") {
      const { wizardStatusSummary } = await import("./live-wizard.mjs");
      return send(response, 200, wizardStatusSummary());
    }
    if (request.method === "GET" && url.pathname.indexOf("/operator/live-wizard/report/") === 0) {
      const { wizardReport } = await import("./live-wizard.mjs");
      return send(response, 200, wizardReport(decodeURIComponent(url.pathname.split("/operator/live-wizard/report/")[1] || "")));
    }
    if (request.method === "POST" && url.pathname.indexOf("/operator/live-wizard/") === 0) {
      const b = await readJson(request);
      const op = url.pathname.split("/operator/live-wizard/")[1] || "";
      const w = await import("./live-wizard.mjs");
      const map = {
        "start": () => w.startWizard(),
        "preflight": () => w.wizardPreflight(b),
        "select-account": () => w.selectAccount(b),
        "select-target": () => w.selectTarget(b),
        "select-agent": () => w.selectAgent(b),
        "lock-target": () => w.lockTarget(b),
        "create-pilot": () => w.wizardCreatePilot(b),
        "create-draft": () => w.wizardCreateDraft(b),
        "score-draft": () => w.wizardScoreDraft(b),
        "update-draft": () => w.wizardUpdateDraft(b),
        "approve-draft": () => w.wizardApprove(b),
        "confirm-send": () => w.wizardConfirmSend(b),
        "cancel": () => w.wizardCancel(b)
      };
      if (map[op]) return send(response, 200, await map[op]());
      return send(response, 404, { ok: false, message: "Unknown live-wizard action" });
    }
    if (request.method === "GET" && url.pathname === "/operator/targets/status") {
      const { registryStatus } = await import("./owned-target-registry.mjs");
      return send(response, 200, registryStatus());
    }
    if (request.method === "GET" && (url.pathname === "/operator/targets" || url.pathname === "/operator/targets/list")) {
      const { listTargets } = await import("./owned-target-registry.mjs");
      return send(response, 200, listTargets({ accountId: url.searchParams.get("accountId"), status: url.searchParams.get("status"), type: url.searchParams.get("type"), agentId: url.searchParams.get("agentId") }));
    }
    if (request.method === "POST" && url.pathname.indexOf("/operator/targets/") === 0) {
      const b = await readJson(request);
      const op = url.pathname.split("/operator/targets/")[1] || "";
      const t = await import("./owned-target-registry.mjs");
      const map = {
        "create": () => t.createTarget(b), "verify": () => t.verifyTarget(b), "whitelist": () => t.whitelistTarget(b),
        "allow-agent": () => t.allowAgent(b), "link-agent": () => t.allowAgent({ ...b, allowed: true }), "unlink-agent": () => t.allowAgent({ ...b, allowed: false }),
        "disable": () => t.disableTarget(b), "block": () => t.blockTarget(b), "health": () => t.targetHealth(b),
        "validate-for-pilot": () => t.validateForPilotFlex(b), "validate-for-send": () => t.validateForSend(b)
      };
      if (map[op]) return send(response, 200, map[op]());
      return send(response, 404, { ok: false, message: "Unknown targets action" });
    }
    if (request.method === "GET" && url.pathname === "/operator/accounts/status") {
      const { registryStatus } = await import("./owned-account-registry.mjs");
      return send(response, 200, registryStatus());
    }
    if (request.method === "GET" && url.pathname === "/operator/accounts") {
      const { listAccounts } = await import("./owned-account-registry.mjs");
      return send(response, 200, listAccounts({ status: url.searchParams.get("status"), type: url.searchParams.get("type"), agentId: url.searchParams.get("agentId") }));
    }
    if (request.method === "POST" && url.pathname.indexOf("/operator/accounts/") === 0) {
      const b = await readJson(request);
      const op = url.pathname.split("/operator/accounts/")[1] || "";
      const m = await import("./owned-account-registry.mjs");
      const map = {
        "create": () => m.createAccount(b), "verify": () => m.verifyAccount(b), "whitelist": () => m.whitelistAccount(b),
        "allow-agent": () => m.allowAgent(b), "disable": () => m.disableAccount(b), "block": () => m.blockAccount(b),
        "session-health": () => m.sessionHealth(b), "validate-for-pilot": () => m.validateForPilot(b), "validate-for-send": () => m.validateForSend(b)
      };
      if (map[op]) return send(response, 200, await map[op]());
      return send(response, 404, { ok: false, message: "Unknown accounts action" });
    }
    if (request.method === "GET" && url.pathname === "/operator/live-runbook/status") {
      const { runbookStatusSummary } = await import("./live-pilot-runbook.mjs");
      return send(response, 200, runbookStatusSummary());
    }
    if (request.method === "GET" && url.pathname.indexOf("/operator/live-runbook/report/") === 0) {
      const { runbookReport } = await import("./live-pilot-runbook.mjs");
      return send(response, 200, runbookReport(decodeURIComponent(url.pathname.split("/operator/live-runbook/report/")[1] || "")));
    }
    if (request.method === "POST" && url.pathname.indexOf("/operator/live-runbook/") === 0) {
      const b = await readJson(request);
      const op = url.pathname.split("/operator/live-runbook/")[1] || "";
      const m = await import("./live-pilot-runbook.mjs");
      const map = {
        "create": () => m.createRunbook(b), "preflight": () => m.runbookPreflight(b),
        "execute-dry-run": () => m.executeDryRun(b), "execute-live": () => m.executeLive(b),
        "verify-post-send": () => m.verifyPostSend(b), "verify-second-send-blocked": () => m.verifySecondSendBlocked(b),
        "cancel": () => m.cancelRunbook(b)
      };
      if (map[op]) return send(response, 200, await map[op]());
      return send(response, 404, { ok: false, message: "Unknown live-runbook action" });
    }
    if (request.method === "GET" && url.pathname === "/operator/post-live/status") {
      const { postLiveStatus } = await import("./post-live.mjs");
      return send(response, 200, postLiveStatus());
    }
    if (request.method === "GET" && url.pathname.indexOf("/operator/post-live/report/") === 0) {
      const { postLiveReport } = await import("./post-live.mjs");
      return send(response, 200, postLiveReport(decodeURIComponent(url.pathname.split("/operator/post-live/report/")[1] || "")));
    }
    if (request.method === "POST" && url.pathname.indexOf("/operator/post-live/") === 0) {
      const b = await readJson(request);
      const op = url.pathname.split("/operator/post-live/")[1] || "";
      const m = await import("./post-live.mjs");
      const map = {
        "create": () => m.createPostLive(b), "freeze": () => m.freezePostLive(b), "verify": () => m.verifyPostLive(b),
        "evidence": () => m.buildEvidence(b), "debrief": () => m.saveDebrief(b), "decision": () => m.saveDecision(b), "block-test": () => m.blockTest(b)
      };
      if (map[op]) return send(response, 200, await map[op]());
      return send(response, 404, { ok: false, message: "Unknown post-live action" });
    }
    if (request.method === "POST" && url.pathname === "/operator/context/persona") {
      const b = await readJson(request);
      const { getPersona } = await import("./operator-core.mjs");
      return send(response, 200, { ok: true, persona: getPersona(b.agentId) });
    }
    if (request.method === "POST" && url.pathname === "/operator/context/intent") {
      const b = await readJson(request);
      const { detectIntent } = await import("./operator-core.mjs");
      const intent = detectIntent(b.command, b.text);
      return send(response, 200, { ok: !intent.blocked, intent });
    }
    if (request.method === "POST" && url.pathname === "/operator/context/build") {
      const b = await readJson(request);
      const { buildContextSnapshot } = await import("./operator-core.mjs");
      return send(response, 200, await buildContextSnapshot(b));
    }
    if (request.method === "POST" && url.pathname === "/operator/command") {
      const b = await readJson(request);
      if (b && b.command) {
        const { runCoreCommand } = await import("./operator-core.mjs");
        return send(response, 200, await runCoreCommand(b));
      }
      const { runOperator } = await import("./operator-agent.mjs");
      const out = await runOperator({ text: String(b.text || ""), history: Array.isArray(b.history) ? b.history : [], accountId: b.accountId });
      return send(response, 200, { ok: true, ...out });
    }
    if (request.method === "POST" && url.pathname === "/operator/confirm") {
      const b = await readJson(request);
      const { confirmAction } = await import("./operator-agent.mjs");
      const out = await confirmAction({ action: b.action, accountId: b.accountId });
      return send(response, 200, out);
    }

    // P17.2/P17.4: versioned read-only account API. One shared contract for the
    // web client today and future Android / iOS / cloud / WebApp clients.
    // /v1/telegram/account -> info | storage | devices | statistics
    // P19: runtime namespace. Telegram is one runtime among future browser /
    // discord / whatsapp / ai runtimes. Canonical path: /v1/runtime/telegram/*.
    // /v1/telegram/* is kept as a pre-freeze alias so no client breaks.
    if (request.method === "GET" && (url.pathname.startsWith("/v1/telegram/account") || url.pathname.startsWith("/v1/runtime/telegram/account"))) {
      const base = url.pathname.startsWith("/v1/runtime/telegram/account") ? "/v1/runtime/telegram/account" : "/v1/telegram/account";
      const slice = url.pathname.slice(base.length).replace(/^\/+/, "") || "info";
      const { getAccountDetail } = await import("./telegram-runtime.mjs");
      const result = await getAccountDetail({ accountId: url.searchParams.get("accountId"), slice });
      return send(response, result.status, result.body);
    }
    // P22A: versioned read-only Telegram data (dialogs real via TDLib; saved/drafts
    // honest empty until backed). Canonical + runtime-namespace alias.
    if (request.method === "GET" && (url.pathname === "/v1/telegram/dialogs" || url.pathname === "/v1/runtime/telegram/dialogs")) {
      const { getDialogs } = await import("./telegram-runtime.mjs");
      const r = await getDialogs({ accountId: url.searchParams.get("accountId") });
      return send(response, r.status, r.body);
    }
    if (request.method === "GET" && (url.pathname === "/v1/telegram/saved" || url.pathname === "/v1/runtime/telegram/saved")) {
      const { getSaved } = await import("./telegram-runtime.mjs");
      const r = await getSaved({ accountId: url.searchParams.get("accountId") });
      return send(response, r.status, r.body);
    }
    if (request.method === "GET" && (url.pathname === "/v1/telegram/drafts" || url.pathname === "/v1/runtime/telegram/drafts")) {
      const { getDrafts } = await import("./telegram-runtime.mjs");
      const r = await getDrafts({ accountId: url.searchParams.get("accountId") });
      return send(response, r.status, r.body);
    }

    // P18: versioned system + API docs (OpenAPI 3.1 is the source of truth for
    // every client). Additive, read-only.
    if (request.method === "GET" && url.pathname === "/v1/system/health") {
      return send(response, 200, { ok: true, service: "epicgram-api", version: "v1", time: new Date().toISOString() });
    }
    // P19: Capability API. Clients adapt the UI by declared capability, not by
    // device type (no `if (android)` / `if (desktop)`). Additive, read-only.
    if (request.method === "GET" && url.pathname === "/v1/system/capabilities") {
      let aiReady = false;
      try { aiReady = getAiStatus()?.runtime === "ready"; } catch { aiReady = false; }
      return send(response, 200, {
        platform: "epic-gram",
        apiVersion: "v1",
        runtimes: { telegram: true, browser: false, discord: false, whatsapp: false, signal: false, localAi: aiReady, cloudAi: aiReady },
        capabilities: {
          accounts: true,
          multiAccount: true,
          instantSwitch: true,
          auth: { qr: true, phone: true, twoFa: true },
          telegram: { dialogs: true, messages: true, send: true, devices: true, storageStats: true, folders: false, voiceCalls: false, stories: false },
          ai: { operator: true, suggest: true, memory: true, publisher: true, workflows: false },
          events: { sse: true, websocket: false },
          plugins: false
        }
      });
    }
    // P19.1: SSE Event Bus. READ-ONLY push transport — no commands flow over
    // SSE (commands stay on REST). Streams runtime events to every client.
    if (request.method === "GET" && url.pathname === "/v1/runtime/events") {
      const { subscribe, publish, ensureHeartbeat } = await import("./event-bus.mjs");
      response.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        "connection": "keep-alive",
        "access-control-allow-origin": "*",
        "x-accel-buffering": "no"
      });
      response.write("retry: 5000\n\n");
      subscribe(response);
      ensureHeartbeat();
      publish({ type: "runtime.health", runtime: "telegram", data: { ok: true, hello: true } });
      return;
    }
    // P19.2: Identity/Accounts facade — one account model for every client.
    // Thin aliases to the slot registry; commands over REST, events over SSE.
    if (request.method === "GET" && url.pathname === "/v1/accounts") {
      const { listAccounts } = await import("./telegram-runtime.mjs");
      const r = await listAccounts();
      return send(response, r.status, r.body);
    }
    if (request.method === "GET" && url.pathname === "/v1/accounts/current") {
      const { getCurrentAccount } = await import("./telegram-runtime.mjs");
      const r = await getCurrentAccount();
      return send(response, r.status, r.body);
    }
    if (request.method === "POST" && /^\/v1\/accounts\/[^/]+\/(switch|logout|lock|unlock)$/.test(url.pathname)) {
      await readJson(request).catch(() => ({}));
      const parts = url.pathname.split("/");
      const accountId = decodeURIComponent(parts[3]);
      const action = parts[4];
      const rt = await import("./telegram-runtime.mjs");
      let r;
      if (action === "switch") r = await rt.selectAccountSlot({ accountId });
      else if (action === "logout") r = await rt.logout({ accountId });
      else r = await rt.lockAccountSlot({ accountId, locked: action === "lock" });
      return send(response, r.status, r.body);
    }
    if (request.method === "GET" && (url.pathname === "/v1/openapi.yaml" || url.pathname === "/v1/openapi")) {
      const { readFile } = await import("node:fs/promises");
      const spec = await readFile(new URL("../openapi.yaml", import.meta.url), "utf8");
      response.writeHead(200, {
        "content-type": "application/yaml; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      });
      return response.end(spec);
    }
    if (request.method === "GET" && url.pathname === "/v1/docs") {
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>`
        + `<meta name="viewport" content="width=device-width, initial-scale=1"/>`
        + `<title>EPIC GRAM Platform API — v1</title>`
        + `<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>`
        + `<style>body{margin:0;background:#0b0b12}</style></head><body><div id="swagger"></div>`
        + `<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>`
        + `<script>window.onload=function(){window.ui=SwaggerUIBundle({url:"/v1/openapi.yaml",dom_id:"#swagger"});};</script>`
        + `</body></html>`;
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      });
      return response.end(html);
    }

    return send(response, 404, { message: "Not found" });
  } catch (error) {
    return send(response, 500, {
      message: error instanceof Error ? error.message : "Unexpected backend error"
    });
  }
});

server.listen(port, host, () => {
  console.log(`EPICGRAM API listening on http://${host}:${port}`);
});
