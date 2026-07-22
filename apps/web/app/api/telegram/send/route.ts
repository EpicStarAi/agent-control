import crypto from "node:crypto";
import { NextRequest } from "next/server";
import {
  denyMutation,
  guardedJson,
  requirePrincipal,
  resolveBoundAccount,
  telegramMutationsEnabled,
} from "@/lib/telegramGuard";
import { assertChatBelongsToBoundAccount, sendTextThroughSlot } from "@/lib/telegramBindingService";
import { getRuntimeFlags } from "@/lib/runtimeFlags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HUMAN_ACTION_HEADER = "send-button-v1";
const SEND_CONFIRMATION = "human_send_button_v1";
const PUBLISH_CONFIRMATION = "human_publish_confirm_v1";

function audit(input: {
  principalId: string;
  accountId: string;
  chatId: string;
  actionType: string;
  text: string;
  outcome: "ok" | "failed" | "denied";
  code: string;
}) {
  console.info(`[telegram-send-audit] ${JSON.stringify({
    event: "telegram_human_send",
    actor: `user:${input.principalId}`,
    account: `${input.accountId.slice(0, 4)}***${input.accountId.slice(-2)}`,
    chatId: input.chatId,
    actionType: input.actionType,
    payloadHash: crypto.createHash("sha256").update(input.text).digest("hex"),
    outcome: input.outcome,
    code: input.code,
    at: new Date().toISOString(),
  })}`);
}

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/send", "POST");
  if (!auth.ok) return auth.response;
  const principal = auth.principal;

  if (principal.role !== "owner") return denyMutation("/api/telegram/send", "POST", principal, "owner_role_required");
  if (!telegramMutationsEnabled() || !getRuntimeFlags().telegramSendEnabled) {
    return denyMutation("/api/telegram/send", "POST", principal, "send_disabled");
  }
  if (request.headers.get("x-epicgram-human-action") !== HUMAN_ACTION_HEADER) {
    return denyMutation("/api/telegram/send", "POST", principal, "human_action_required");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return guardedJson({ sent: false, code: "BAD_JSON", message: "Некорректный запрос." }, 400);
  }

  const chatId = String(body.chatId ?? "").trim();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const actionType = String(body.actionType ?? "send_text").trim();
  const confirmation = String(body.confirmation ?? "");
  if (!/^-?\d+$/.test(chatId)) return guardedJson({ sent: false, code: "CHAT_ID_REQUIRED", message: "Выберите чат." }, 400);
  if (!text || text.length > 4096) return guardedJson({ sent: false, code: "TEXT_INVALID", message: "Текст должен содержать от 1 до 4096 символов." }, 400);
  if (!new Set(["send_text", "publish_channel"]).has(actionType)) {
    return guardedJson({ sent: false, code: "ACTION_NOT_ALLOWED", message: "Этот тип отправки не разрешён." }, 400);
  }

  const bound = await resolveBoundAccount(principal);
  if (bound.kind !== "ok") return guardedJson({ sent: false, code: bound.kind === "mismatch" ? "OWNER_MISMATCH" : "NO_BINDING" }, bound.kind === "mismatch" ? 403 : 409);

  const owned = await assertChatBelongsToBoundAccount(principal, chatId);
  if (!owned.ok || owned.accountId !== bound.accountId) {
    audit({ principalId: principal.userId, accountId: bound.accountId, chatId, actionType, text, outcome: "denied", code: owned.ok ? "ACCOUNT_MISMATCH" : owned.reason });
    return guardedJson({ sent: false, code: owned.ok ? "ACCOUNT_MISMATCH" : owned.reason, message: "Чат не принадлежит выбранному аккаунту." }, 403);
  }

  const category = String(owned.chat.category ?? owned.chat.type ?? "chat").toLowerCase();
  const isChannel = owned.chat.isChannel === true || category === "channel";
  const expectedAction = isChannel ? "publish_channel" : "send_text";
  const expectedConfirmation = isChannel ? PUBLISH_CONFIRMATION : SEND_CONFIRMATION;
  if (actionType !== expectedAction || confirmation !== expectedConfirmation) {
    audit({ principalId: principal.userId, accountId: bound.accountId, chatId, actionType, text, outcome: "denied", code: "CONFIRMATION_MISMATCH" });
    return guardedJson({ sent: false, code: "CONFIRMATION_MISMATCH", message: "Требуется явное подтверждение отправки." }, 409);
  }

  const result = await sendTextThroughSlot(bound.accountId, chatId, text, actionType);
  audit({
    principalId: principal.userId,
    accountId: bound.accountId,
    chatId,
    actionType,
    text,
    outcome: result.ok ? "ok" : "failed",
    code: result.ok ? "SENT" : (result.code ?? "SEND_FAILED"),
  });
  return guardedJson({
    sent: result.ok,
    code: result.ok ? "SENT" : (result.code ?? "SEND_FAILED"),
    message: result.message ?? (result.ok ? "Сообщение отправлено." : "Telegram не принял сообщение."),
    telegramMessageId: result.telegramMessageId,
  }, result.ok ? 200 : 409);
}
