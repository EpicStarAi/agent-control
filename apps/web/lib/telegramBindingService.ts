// telegramBindingService.ts — P0 Per-User Telegram Binding Service
// Bridges the binding model to the real TDLib backend.
// All calls go to the backend at EPICGRAM_API_BASE_URL (:8788).
// accountId is ALWAYS derived from the server-side binding — never from the client.

import {
  type TelegramBinding,
  type TelegramBindingAuthState,
  type TelegramAuthFlow,
  type BindingStatus,
  newTdlibAccountId,
  maskPhone,
  authStateLabel,
  authFlowMessage,
  safeTdlibAccountId,
  isValidPhone,
  isValidCode,
  isForbiddenAccountId,
} from "./telegramBindings";
import * as db from "./telegramBindingsDb";

const API = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";
const SRC = "per-user-binding";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function backendFetch(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "cache-control": "no-store" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, body: data };
}

async function getTdlibStatus(accountId: string): Promise<Record<string, unknown>> {
  return backendFetch(`/telegram/status?accountId=${encodeURIComponent(accountId)}`);
}

async function startQrTdlib(accountId: string): Promise<Record<string, unknown>> {
  return backendFetch(`/telegram/auth/qr`, { accountId });
}

async function startPhoneTdlib(
  phone: string,
  accountId: string
): Promise<Record<string, unknown>> {
  return backendFetch(`/telegram/auth/phone`, { phoneNumber: phone, accountId });
}

async function submitCodeTdlib(
  code: string,
  accountId: string
): Promise<Record<string, unknown>> {
  return backendFetch(`/telegram/auth/code`, { code, accountId });
}

async function submit2faTdlib(
  password: string,
  accountId: string
): Promise<Record<string, unknown>> {
  return backendFetch(`/telegram/auth/2fa`, { password, accountId });
}

async function resetTdlib(accountId: string): Promise<Record<string, unknown>> {
  return backendFetch(`/telegram/auth/reset`, { accountId });
}

async function logoutTdlib(accountId: string): Promise<Record<string, unknown>> {
  return backendFetch(`/telegram/logout`, { accountId });
}

async function getChatsTdlib(
  accountId: string,
  limit = 30
): Promise<Record<string, unknown>> {
  return backendFetch(`/telegram/chats?accountId=${encodeURIComponent(accountId)}&limit=${limit}`);
}

async function getMessagesTdlib(
  accountId: string,
  chatId: string,
  limit = 50
): Promise<Record<string, unknown>> {
  return backendFetch(
    `/telegram/messages?accountId=${encodeURIComponent(accountId)}&chatId=${encodeURIComponent(chatId)}&limit=${limit}`
  );
}

// Detect if TDLib auth is ready from status response
function extractAuthState(statusBody: Record<string, unknown>): TelegramBindingAuthState {
  const accounts = statusBody?.accounts as Array<Record<string, unknown>> | undefined;
  const acc = accounts?.[0];
  const authState = acc?.authorizationState as string | undefined;
  if (authState === "authorizationStateReady" || acc?.status === "ready") return "ready";
  if (authState === "authorizationStateWaitPhoneNumber") return "init";
  if (authState === "authorizationStateWaitCode") return "waiting_code";
  if (authState === "authorizationStateWaitPassword") return "waiting_password";
  if (authState === "authorizationStateWaitOtherDeviceConfirmation") return "waiting_qr";
  return "init";
}

// Build a BindingStatus response (safe — no secrets)
function buildBindingStatus(
  binding: TelegramBinding | null,
  authFlow: TelegramAuthFlow | null
): BindingStatus {
  return {
    bound: binding !== null && binding.authState === "ready",
    binding: binding
      ? {
          id: binding.id,
          workspaceId: binding.workspaceId,
          userId: binding.userId,
          tdlibAccountId: binding.tdlibAccountId,
          displayName: binding.displayName,
          phoneMasked: binding.phoneMasked,
          username: binding.username,
          authState: binding.authState,
          authError: binding.authError,
          boundAt: binding.boundAt,
          updatedAt: binding.updatedAt,
        }
      : null,
    authFlow,
    canSend: false,
  };
}

// Map TDLib error to Russian user message
function tdlibErrorMessage(raw: string | undefined): string {
  if (!raw) return "Неизвестная ошибка. Попробуйте позже.";
  const msg = raw.toLowerCase();
  if (msg.includes("phone_number_invalid")) return "Некорректный номер телефона.";
  if (msg.includes("phone_code_invalid")) return "Неверный код. Попробуйте ещё раз.";
  if (msg.includes("phone_code_expired")) return "Код устарел. Запросите новый код.";
  if (msg.includes("password_invalid")) return "Неверный пароль 2FA.";
  if (msg.includes("session_expired")) return "Сессия устарела. Начните сначала.";
  if (msg.includes("flood_wait")) return "Слишком много попыток. Подождите и попробуйте снова.";
  if (msg.includes("network")) return "Нет соединения с Telegram. Проверьте интернет.";
  return "Произошла ошибка. Попробуйте снова.";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface Principal {
  userId: string;
  workspaceId: string;
}

/**
 * Get the full binding status for a principal.
 * Resolves the binding from DB, checks live TDLib state if needed.
 */
export async function getStatus(
  principal: Principal
): Promise<{ ok: true; status: BindingStatus } | { ok: false; reason: string }> {
  try {
    const binding = await db.getByWorkspace(principal.workspaceId);

    if (!binding) {
      return { ok: true, status: buildBindingStatus(null, null) };
    }

    // If waiting_qr, poll TDLib live state
    if (binding.authState === "waiting_qr" || binding.authState === "waiting_code" || binding.authState === "waiting_password") {
      const tdlibStatus = await getTdlibStatus(binding.tdlibAccountId);
      const body = (tdlibStatus?.body ?? tdlibStatus) as Record<string, unknown>;
      const liveAuthState = extractAuthState(body as Record<string, unknown>);

      if (liveAuthState === "ready") {
        // Auth completed — update DB
        const updated = await db.updateAuthState({
          workspaceId: principal.workspaceId,
          authState: "ready",
          username: (body?.account as Record<string, unknown>)?.username as string | null ?? null,
          phoneMasked: (body?.account as Record<string, unknown>)?.phoneMasked as string | null ?? binding.phoneMasked,
        });
        return { ok: true, status: buildBindingStatus(updated, null) };
      }

      if (liveAuthState !== binding.authState) {
        // Sync state from TDLib (e.g., error or reset)
        await db.updateAuthState({
          workspaceId: principal.workspaceId,
          authState: liveAuthState,
        });
        const updated = await db.getByWorkspace(principal.workspaceId);
        const flow: TelegramAuthFlow = {
          type: binding.authState === "waiting_qr" ? "qr" : "phone",
          qrLink: (tdlibStatus?.body as Record<string, unknown>)?.qrLink as string | null ?? null,
          qrImageData: null,
          expiresAt: null,
          phoneMasked: binding.phoneMasked,
          codeLength: null,
          message: authFlowMessage(liveAuthState, binding.phoneMasked),
        };
        return { ok: true, status: buildBindingStatus(updated, flow) };
      }
    }

    // Build authFlow for pending states
    if (binding.authState === "waiting_qr") {
      const tdlibStatus = await getTdlibStatus(binding.tdlibAccountId);
      const body = (tdlibStatus?.body ?? tdlibStatus) as Record<string, unknown>;
      const flow: TelegramAuthFlow = {
        type: "qr",
        qrLink: (body as Record<string, unknown>)?.qrLink as string | null ?? null,
        qrImageData: null,
        expiresAt: null,
        phoneMasked: null,
        codeLength: null,
        message: authFlowMessage("waiting_qr", null),
      };
      return { ok: true, status: buildBindingStatus(binding, flow) };
    }

    if (binding.authState === "waiting_code") {
      const flow: TelegramAuthFlow = {
        type: "phone",
        qrLink: null,
        qrImageData: null,
        expiresAt: null,
        phoneMasked: binding.phoneMasked,
        codeLength: 5,
        message: authFlowMessage("waiting_code", binding.phoneMasked),
      };
      return { ok: true, status: buildBindingStatus(binding, flow) };
    }

    if (binding.authState === "waiting_password") {
      const flow: TelegramAuthFlow = {
        type: "phone",
        qrLink: null,
        qrImageData: null,
        expiresAt: null,
        phoneMasked: binding.phoneMasked,
        codeLength: null,
        message: authFlowMessage("waiting_password", binding.phoneMasked),
      };
      return { ok: true, status: buildBindingStatus(binding, flow) };
    }

    return { ok: true, status: buildBindingStatus(binding, null) };
  } catch (err) {
    return { ok: false, reason: "Ошибка при проверке статуса. Попробуйте обновить страницу." };
  }
}

/**
 * Start QR code auth flow.
 * Creates a new binding if none exists.
 */
export async function startQr(
  principal: Principal
): Promise<{ ok: true; status: BindingStatus } | { ok: false; reason: string }> {
  try {
    let binding = await db.getByWorkspace(principal.workspaceId);

    if (!binding) {
      const accountId = newTdlibAccountId();
      binding = await db.create({
        workspaceId: principal.workspaceId,
        userId: principal.userId,
        tdlibAccountId: accountId,
        displayName: "Telegram",
      });
    }

    if (binding.authState === "ready") {
      return { ok: false, reason: "Аккаунт уже подключён." };
    }

    // Reset any existing in-progress flow
    await db.updateAuthState({
      workspaceId: principal.workspaceId,
      authState: "waiting_qr",
      authError: null,
    });

    // Start QR in TDLib
    const result = await startQrTdlib(binding.tdlibAccountId);
    const body = (result?.body ?? result) as Record<string, unknown>;
    const ok = (result as { status?: number }).status === 200;

    if (!ok || !(body as Record<string, unknown>)?.ok) {
      await db.updateAuthState({
        workspaceId: principal.workspaceId,
        authState: "error",
        authError: tdlibErrorMessage((body as Record<string, unknown>)?.message as string),
      });
      return { ok: false, reason: tdlibErrorMessage((body as Record<string, unknown>)?.message as string) };
    }

    const qrLink = (body as Record<string, unknown>)?.qrLink as string | null;
    const qrImageData = (body as Record<string, unknown>)?.qrImageData as string | null;

    const flow: TelegramAuthFlow = {
      type: "qr",
      qrLink: qrLink ?? null,
      qrImageData: qrImageData ?? null,
      expiresAt: null,
      phoneMasked: null,
      codeLength: null,
      message: authFlowMessage("waiting_qr", null),
    };

    const updated = await db.getByWorkspace(principal.workspaceId);
    return { ok: true, status: buildBindingStatus(updated, flow) };
  } catch {
    return { ok: false, reason: "Не удалось запустить QR-код. Проверьте соединение." };
  }
}

/**
 * Submit phone number to start phone auth flow.
 */
export async function submitPhone(
  principal: Principal,
  phone: string
): Promise<{ ok: true; status: BindingStatus } | { ok: false; reason: string; code?: string }> {
  const normalized = phone.startsWith("+") ? phone : `+${phone}`;
  if (!isValidPhone(normalized)) {
    return { ok: false, reason: "Введите номер в формате +380...", code: "INVALID_PHONE" };
  }

  try {
    let binding = await db.getByWorkspace(principal.workspaceId);

    if (!binding) {
      binding = await db.create({
        workspaceId: principal.workspaceId,
        userId: principal.userId,
        tdlibAccountId: newTdlibAccountId(),
        displayName: "Telegram",
      });
    }

    if (binding.authState === "ready") {
      return { ok: false, reason: "Аккаунт уже подключён." };
    }

    // Reset any in-progress flow
    await db.updateAuthState({
      workspaceId: principal.workspaceId,
      authState: "waiting_code",
      phoneMasked: maskPhone(normalized),
      authError: null,
    });

    const result = await startPhoneTdlib(normalized, binding.tdlibAccountId);
    const body = (result?.body ?? result) as Record<string, unknown>;

    // phone auth itself returns 200 even if it sent the code
    // We accept any 200 as success and move to waiting_code state
    if ((result as { status?: number }).status !== 200) {
      await db.updateAuthState({
        workspaceId: principal.workspaceId,
        authState: "error",
        authError: tdlibErrorMessage((body as Record<string, unknown>)?.message as string),
      });
      return { ok: false, reason: tdlibErrorMessage((body as Record<string, unknown>)?.message as string) };
    }

    // If TDLib says already ready (e.g., returning user), mark ready
    const authState = extractAuthState(body as Record<string, unknown>);
    if (authState === "ready") {
      await db.updateAuthState({ workspaceId: principal.workspaceId, authState: "ready" });
    }

    const updated = await db.getByWorkspace(principal.workspaceId);
    const flow: TelegramAuthFlow = {
      type: "phone",
      qrLink: null,
      qrImageData: null,
      expiresAt: null,
      phoneMasked: maskPhone(normalized),
      codeLength: 5,
      message: authFlowMessage("waiting_code", maskPhone(normalized)),
    };

    return { ok: true, status: buildBindingStatus(updated, flow) };
  } catch {
    return { ok: false, reason: "Не удалось отправить номер. Проверьте соединение." };
  }
}

/**
 * Submit verification code (SMS or Telegram code).
 */
export async function submitCode(
  principal: Principal,
  code: string
): Promise<{ ok: true; status: BindingStatus } | { ok: false; reason: string }> {
  if (!isValidCode(code)) {
    return { ok: false, reason: "Код должен состоять из 3–8 цифр." };
  }

  try {
    const binding = await db.getByWorkspace(principal.workspaceId);
    if (!binding) {
      return { ok: false, reason: "Привязка не найдена. Начните сначала." };
    }

    const result = await submitCodeTdlib(code.trim(), binding.tdlibAccountId);
    const body = (result?.body ?? result) as Record<string, unknown>;
    const authState = extractAuthState(body);

    if (authState === "ready") {
      await db.updateAuthState({
        workspaceId: principal.workspaceId,
        authState: "ready",
        username: (body as Record<string, unknown>)?.account && typeof body.account === "object"
          ? (body.account as Record<string, unknown>).username as string | null
          : binding.username,
      });
      const updated = await db.getByWorkspace(principal.workspaceId);
      return { ok: true, status: buildBindingStatus(updated, null) };
    }

    if (authState === "waiting_password") {
      await db.updateAuthState({
        workspaceId: principal.workspaceId,
        authState: "waiting_password",
      });
      const updated = await db.getByWorkspace(principal.workspaceId);
      const flow: TelegramAuthFlow = {
        type: "phone",
        qrLink: null,
        qrImageData: null,
        expiresAt: null,
        phoneMasked: binding.phoneMasked,
        codeLength: null,
        message: authFlowMessage("waiting_password", binding.phoneMasked),
      };
      return { ok: true, status: buildBindingStatus(updated, flow) };
    }

    // Wrong code or error
    await db.updateAuthState({
      workspaceId: principal.workspaceId,
      authState: "error",
      authError: tdlibErrorMessage((body as Record<string, unknown>)?.message as string),
    });
    const updated = await db.getByWorkspace(principal.workspaceId);
    return {
      ok: false,
      reason: tdlibErrorMessage((body as Record<string, unknown>)?.message as string) +
        " Попробуйте ещё раз.",
    };
  } catch {
    return { ok: false, reason: "Не удалось проверить код. Проверьте соединение." };
  }
}

/**
 * Submit 2FA password.
 */
export async function submit2fa(
  principal: Principal,
  password: string
): Promise<{ ok: true; status: BindingStatus } | { ok: false; reason: string }> {
  if (!password || password.length < 1) {
    return { ok: false, reason: "Введите пароль 2FA." };
  }

  try {
    const binding = await db.getByWorkspace(principal.workspaceId);
    if (!binding) {
      return { ok: false, reason: "Привязка не найдена." };
    }

    const result = await submit2faTdlib(password, binding.tdlibAccountId);
    const body = (result?.body ?? result) as Record<string, unknown>;
    const authState = extractAuthState(body);

    if (authState === "ready") {
      await db.updateAuthState({ workspaceId: principal.workspaceId, authState: "ready" });
      const updated = await db.getByWorkspace(principal.workspaceId);
      return { ok: true, status: buildBindingStatus(updated, null) };
    }

    await db.updateAuthState({
      workspaceId: principal.workspaceId,
      authState: "error",
      authError: tdlibErrorMessage((body as Record<string, unknown>)?.message as string),
    });
    return {
      ok: false,
      reason: tdlibErrorMessage((body as Record<string, unknown>)?.message as string),
    };
  } catch {
    return { ok: false, reason: "Не удалось проверить пароль. Проверьте соединение." };
  }
}

/**
 * Reset auth flow to init state.
 */
export async function resetFlow(
  principal: Principal
): Promise<{ ok: true; status: BindingStatus } | { ok: false; reason: string }> {
  try {
    const binding = await db.getByWorkspace(principal.workspaceId);
    if (!binding) {
      return { ok: true, status: buildBindingStatus(null, null) };
    }

    await resetTdlib(binding.tdlibAccountId).catch(() => null);
    await db.updateAuthState({
      workspaceId: principal.workspaceId,
      authState: "init",
      authError: null,
    });

    const updated = await db.getByWorkspace(principal.workspaceId);
    return { ok: true, status: buildBindingStatus(updated, null) };
  } catch {
    return { ok: false, reason: "Не удалось сбросить. Попробуйте обновить страницу." };
  }
}

/**
 * Unbind: logout TDLib session + delete DB record.
 */
export async function unbind(
  principal: Principal
): Promise<{ ok: true; status: BindingStatus } | { ok: false; reason: string }> {
  try {
    const binding = await db.getByWorkspace(principal.workspaceId);
    if (!binding) {
      return { ok: true, status: buildBindingStatus(null, null) };
    }

    // Logout TDLib (ignore errors — session might not exist)
    await logoutTdlib(binding.tdlibAccountId).catch(() => null);

    // Delete binding record
    await db.remove(principal.workspaceId);

    return { ok: true, status: buildBindingStatus(null, null) };
  } catch {
    return { ok: false, reason: "Не удалось отключить аккаунт. Попробуйте позже." };
  }
}

/**
 * Get chats for the bound TDLib account.
 * accountId comes ONLY from the server-side binding.
 */
export async function getChats(
  principal: Principal,
  limit = 30
): Promise<{ ok: true; chats: unknown[]; source: string } | { ok: false; reason: string }> {
  try {
    const binding = await db.getByWorkspace(principal.workspaceId);
    if (!binding) {
      return { ok: true, chats: [], source: "no_binding" };
    }
    if (binding.authState !== "ready") {
      return { ok: true, chats: [], source: "auth_not_ready" };
    }

    const result = await getChatsTdlib(binding.tdlibAccountId, limit);
    const body = (result?.body ?? result) as Record<string, unknown>;
    const chats = ((body as Record<string, unknown>)?.chats ?? []) as unknown[];
    return { ok: true, chats, source: `tdlib:${binding.tdlibAccountId}` };
  } catch {
    return { ok: false, reason: "Не удалось загрузить чаты. Проверьте соединение." };
  }
}

/**
 * Get messages for a specific chat.
 */
export async function getMessages(
  principal: Principal,
  chatId: string,
  limit = 50
): Promise<{ ok: true; messages: unknown[]; chatId: string } | { ok: false; reason: string }> {
  if (!chatId) {
    return { ok: false, reason: "chatId обязателен." };
  }

  try {
    const binding = await db.getByWorkspace(principal.workspaceId);
    if (!binding) {
      return { ok: true, messages: [], chatId };
    }
    if (binding.authState !== "ready") {
      return { ok: true, messages: [], chatId };
    }

    const result = await getMessagesTdlib(binding.tdlibAccountId, chatId, limit);
    const body = (result?.body ?? result) as Record<string, unknown>;
    const messages = ((body as Record<string, unknown>)?.messages ?? []) as unknown[];
    return { ok: true, messages, chatId };
  } catch {
    return { ok: false, reason: "Не удалось загрузить сообщения." };
  }
}