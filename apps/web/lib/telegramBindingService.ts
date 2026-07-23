// telegramBindingService.ts — P0 Per-User Telegram Binding Service
// Bridges the binding model to the real TDLib backend.
// All calls go to the backend at EPICGRAM_API_BASE_URL (:8788).
// accountId is ALWAYS derived from the server-side binding — never from the client.
//
// P-EPICGRAM-CLIENT-PLATFORM-2 (Blocker A fix): a per-user binding MUST own a
// registered backend slot (POST /telegram/accounts/new). Auth/data calls then
// pass that server-owned accountId into the backend's TDLib routes. Therefore:
//   1. we register a slot before creating a binding and store the backend id;
//   2. every backend auth/data call is gated by assertRegisteredSlot(), which
//      throws unless the id is a registered, non-forbidden slot.
// This makes it impossible for a binding flow to drive the legacy NOVIKOVA
// session. Per-account status is read from /telegram/accounts (NOT the legacy
// legacy singleton state.

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
import { backendRequestHeaders } from "./backendRequest";
import { stagingOwnerAccountId } from "./stagingOwner";

const API = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";
const SRC = "per-user-binding";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Hard-block (INCIDENT 20260718): /telegram/logout and /telegram/auth/reset are
// LEGACY SINGLETON ops on the shared NOVIKOVA client (logout()->logOutTdlib(),
// resetAuth()->resetTdlibAuthSession({deleteDatabase:true})). No per-user flow
// may EVER reach them, regardless of accountId.
const LEGACY_BLOCKED_ROUTES = /^\/telegram\/(logout|auth\/reset)(\/|\?|$)/;

function isExplicitStagingGateway(): boolean {
  return String(process.env.EPICGRAM_BACKEND_IS_STAGING_GATEWAY || "").trim().toLowerCase() === "true";
}

async function backendFetch(
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<Record<string, unknown>> {
  if (LEGACY_BLOCKED_ROUTES.test(path) && !isExplicitStagingGateway()) {
    throw new Error(`legacy_route_hard_blocked:${path}`);
  }
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: backendRequestHeaders(extraHeaders),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, body: data };
}

// --- Slot registration + safety gate (Blocker A) ---------------------------

// Slot registry lookup. The chain matters, because a miss here is not a soft
// failure: backendHasAccount() feeds assertRegisteredSlot(), so an empty list
// makes every bound user's chats and messages fail with slot_not_registered.
//
//   1. /v1/accounts      — the P19.2 identity facade. Only exists on backends
//                          built from this repo; older deployed snapshots 404.
//   2. /telegram/accounts — the slot registry the backend has always exposed.
//                          Both routes alias the same listAccounts(), so the
//                          payload shape is identical.
//   3. /telegram/status   — LAST and effectively a no-op for this purpose: it
//                          reports the legacy singleton and returns accounts:[]
//                          on a multi-account backend. Kept only so a very old
//                          single-session backend still resolves.
//
// Regression this fixes: the chain went 1 -> 3, skipping 2. Against the
// deployed backend (server-snapshot-2026-06-18) that is 404 -> [], so the
// registry always came back empty and no bound account could load anything.
async function listBackendAccounts(): Promise<Array<Record<string, unknown>>> {
  for (const path of ["/v1/accounts", "/telegram/accounts", "/telegram/status"]) {
    try {
      const res = await backendFetch(path);
      const body = (res?.body ?? res) as Record<string, unknown>;
      const accounts = body?.accounts;
      if (Array.isArray(accounts) && accounts.length > 0) {
        return accounts as Array<Record<string, unknown>>;
      }
    } catch {
      // Try the next route; a transport error on one alias must not strand the
      // caller on an empty registry while another alias would have answered.
    }
  }
  return [];
}

// Backend-contract robustness: a slot is keyed as `id` (live :8788 accounts.mjs)
// or `slotId` (telegram-runtime state). Match on either so registration and the
// hard-gate never falsely fail.
function slotKeyOf(a: Record<string, unknown> | null | undefined): string {
  if (!a) return "";
  const k = (a.slotId ?? a.id ?? "") as unknown;
  return typeof k === "string" ? k : String(k ?? "");
}

async function backendHasAccount(accountId: string): Promise<boolean> {
  if (!accountId || isForbiddenAccountId(accountId)) return false;
  const accounts = await listBackendAccounts();
  return accounts.some((a) => slotKeyOf(a) === accountId);
}

// Register a fresh isolated slot in the backend and return its id.
async function registerBackendSlot(label: string): Promise<string | null> {
  const res = await backendFetch(`/telegram/accounts/new`, { label });
  const body = (res?.body ?? res) as Record<string, unknown>;
  // Backend-contract robustness: live :8788 (accounts.mjs) returns { ok, id };
  // other builds return the state object keyed by activeAccountId/slotId.
  const pickId = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const id = pickId(body?.id) ?? pickId(body?.activeAccountId) ?? pickId(body?.slotId);
  if (!id || isForbiddenAccountId(id)) return null;
  return id;
}

// HARD GATE: never issue a backend auth/data call for an id that is not a
// registered, non-forbidden slot. If this throws, the caller returns a safe
// error — it never falls through to the legacy NOVIKOVA handlers.
async function assertRegisteredSlot(accountId: string): Promise<void> {
  if (!accountId || isForbiddenAccountId(accountId)) {
    throw new Error("unsafe_account_id");
  }
  if (!(await backendHasAccount(accountId))) {
    throw new Error("slot_not_registered");
  }
}

// Returns a binding whose tdlibAccountId is guaranteed to be a registered slot.
// Fresh workspace -> register slot + create binding. Existing binding with an
// unregistered/forbidden id -> refuse (require reset) rather than risk legacy
// fall-through.
async function ensureRegisteredBinding(principal: Principal): Promise<TelegramBinding> {
  const existing = await db.getByWorkspace(principal.workspaceId);
  if (existing) {
    if (
      existing.tdlibAccountId &&
      !isForbiddenAccountId(existing.tdlibAccountId) &&
      (await backendHasAccount(existing.tdlibAccountId))
    ) {
      return existing;
    }
    // Legacy/unregistered binding — do not proceed onto an unsafe path.
    throw new Error("binding_slot_unregistered");
  }
  const slotId = await registerBackendSlot("EPICGRAM user slot");
  if (!slotId) throw new Error("slot_registration_failed");
  return db.create({
    workspaceId: principal.workspaceId,
    userId: principal.userId,
    tdlibAccountId: slotId,
    displayName: "Telegram",
  });
}

async function getSlotStatus(accountId: string): Promise<Record<string, unknown>> {
  const accounts = await listBackendAccounts();
  const found = accounts.find((a) => slotKeyOf(a) === accountId) ?? null;
  return { accounts: found ? [found] : [] };
}

async function startQrTdlib(accountId: string): Promise<Record<string, unknown>> {
  await assertRegisteredSlot(accountId);
  return backendFetch(`/telegram/auth/qr`, { accountId });
}

async function startPhoneTdlib(
  phone: string,
  accountId: string
): Promise<Record<string, unknown>> {
  await assertRegisteredSlot(accountId);
  return backendFetch(`/telegram/auth/phone`, { accountId, phoneNumber: phone });
}

async function submitCodeTdlib(
  code: string,
  accountId: string
): Promise<Record<string, unknown>> {
  await assertRegisteredSlot(accountId);
  return backendFetch(`/telegram/auth/code`, { accountId, code });
}

async function submit2faTdlib(
  password: string,
  accountId: string
): Promise<Record<string, unknown>> {
  await assertRegisteredSlot(accountId);
  return backendFetch(`/telegram/auth/2fa`, { accountId, password });
}

// NOTE (INCIDENT 20260718): the backend HTTP routes /telegram/auth/reset and
// /telegram/logout are LEGACY-ONLY — they ignore accountId entirely and always
// act on the shared NOVIKOVA session (logout() calls TDLib logOut, destroying
// its authorization). There is NO per-account reset/logout HTTP route on the
// backend (accounts.removeAccount exists but is not exposed). Therefore this
// service MUST NOT call either endpoint: doing so logs out NOVIKOVA. resetFlow
// and unbind below operate on the binding record ONLY. Re-enable a backend call
// here only after the backend exposes a per-account /telegram/accounts/<id>/
// logout|reset that routes by id.

async function getChatsTdlib(
  accountId: string,
  limit = 30
): Promise<Record<string, unknown>> {
  await assertRegisteredSlot(accountId);
  return backendFetch(`/telegram/chats?accountId=${encodeURIComponent(accountId)}&limit=${limit}`);
}

async function getMessagesTdlib(
  accountId: string,
  chatId: string,
  limit = 50
): Promise<Record<string, unknown>> {
  await assertRegisteredSlot(accountId);
  return backendFetch(
    `/telegram/messages?accountId=${encodeURIComponent(accountId)}&chatId=${encodeURIComponent(chatId)}&limit=${limit}`
  );
}

// Detect if TDLib auth is ready from status response
function extractAuthState(statusBody: Record<string, unknown>): TelegramBindingAuthState {
  const accounts = statusBody?.accounts as Array<Record<string, unknown>> | undefined;
  const acc = accounts?.[0];
  // per-account auth responses put authorizationState at TOP LEVEL as { _: "..." };
  // listAccounts() puts it under accounts[0] as a string. Accept both shapes.
  const rawTop = statusBody?.authorizationState as unknown;
  const topState =
    typeof rawTop === "string"
      ? rawTop
      : rawTop && typeof rawTop === "object"
        ? ((rawTop as Record<string, unknown>)._ as string | undefined)
        : undefined;
  const authState = (acc?.authorizationState as string | undefined) ?? topState;
  const online = acc?.online === true || statusBody?.online === true || acc?.status === "ready";
  if (authState === "authorizationStateReady" || online) return "ready";
  if (authState === "authorizationStateWaitPhoneNumber") return "init";
  if (authState === "authorizationStateWaitCode") return "waiting_code";
  if (authState === "authorizationStateWaitPassword") return "waiting_password";
  if (authState === "authorizationStateWaitOtherDeviceConfirmation") return "waiting_qr";
  return "init";
}

// P-BACKFILL: pull the account identity TDLib exposes once authorized. Per-account
// auth responses carry it at top-level `account`; status/list carry accounts[0].account.
function accountIdentityFrom(body: Record<string, unknown>): { displayName: string | null; username: string | null; phoneMasked: string | null } {
  const accounts = body?.accounts as Array<Record<string, unknown>> | undefined;
  const acc = (body?.account as Record<string, unknown> | undefined)
    ?? (accounts?.[0]?.account as Record<string, unknown> | undefined);
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  return { displayName: str(acc?.displayName), username: str(acc?.username), phoneMasked: str(acc?.phoneMasked) };
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
  role?: string;
}

function syntheticStagingBinding(principal: Principal): TelegramBinding | null {
  const accountId = stagingOwnerAccountId(principal.role);
  if (!accountId) return null;
  const now = new Date().toISOString();
  return {
    id: "staging-owner-binding",
    workspaceId: principal.workspaceId,
    userId: principal.userId,
    tdlibAccountId: accountId,
    displayName: "Telegram",
    phoneMasked: null,
    username: null,
    authState: "ready",
    authError: null,
    boundAt: now,
    updatedAt: now,
  };
}

async function bindingForRead(principal: Principal): Promise<TelegramBinding | null> {
  return (await db.getByWorkspace(principal.workspaceId)) ?? syntheticStagingBinding(principal);
}

function stagingEnabledFor(principal: Principal): boolean {
  return Boolean(stagingOwnerAccountId(principal.role));
}

function accountFromStatus(body: Record<string, unknown>, accountId: string): Record<string, unknown> | null {
  const accounts = Array.isArray(body.accounts) ? body.accounts as Array<Record<string, unknown>> : [];
  return accounts.find((account) => slotKeyOf(account) === accountId) ?? null;
}

async function syncStagingBinding(principal: Principal, body: Record<string, unknown>): Promise<void> {
  const activeAccountId = typeof body.activeAccountId === "string" ? body.activeAccountId : "";
  if (!activeAccountId) {
    await db.remove(principal.workspaceId);
    return;
  }
  const account = accountFromStatus(body, activeAccountId);
  const identity = accountIdentityFrom({ accounts: account ? [account] : [] });
  await db.bindWorkspaceToAccount({
    workspaceId: principal.workspaceId,
    userId: principal.userId,
    tdlibAccountId: activeAccountId,
    displayName: identity.displayName ?? String(account?.displayName ?? account?.label ?? "Telegram"),
    phoneMasked: identity.phoneMasked,
    username: identity.username,
    authState: extractAuthState({ accounts: account ? [account] : [], authorizationState: body.authorizationState }),
    authError: null,
  });
}

export async function getStagingRuntimeStatus(principal: Principal): Promise<{ status: number; body: Record<string, unknown> } | null> {
  if (!stagingEnabledFor(principal)) return null;
  const result = await backendFetch("/telegram/status");
  const status = Number(result.status ?? 502);
  const body = (result.body ?? {}) as Record<string, unknown>;
  if (status >= 200 && status < 300) await syncStagingBinding(principal, body);
  return { status, body };
}

export async function mutateStagingRuntime(
  principal: Principal,
  route: string,
  body: Record<string, unknown> = {},
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  if (!stagingEnabledFor(principal)) return null;
  const result = await backendFetch(route, body);
  const status = Number(result.status ?? 502);
  const responseBody = (result.body ?? {}) as Record<string, unknown>;
  if (status >= 200 && status < 300) await syncStagingBinding(principal, responseBody);
  return { status, body: responseBody };
}

/**
 * Get the full binding status for a principal.
 * Resolves the binding from DB, checks live TDLib state (per-account) if needed.
 */
export async function getStatus(
  principal: Principal
): Promise<{ ok: true; status: BindingStatus } | { ok: false; reason: string }> {
  try {
    const binding = await bindingForRead(principal);

    if (!binding) {
      return { ok: true, status: buildBindingStatus(null, null) };
    }

    // If mid-flow, poll the per-account TDLib state (isolated slot only)
    if (binding.authState === "waiting_qr" || binding.authState === "waiting_code" || binding.authState === "waiting_password") {
      const body = await getSlotStatus(binding.tdlibAccountId);
      const liveAuthState = extractAuthState(body);

      if (liveAuthState === "ready") {
        const ident = accountIdentityFrom(body);
        const updated = await db.updateAuthState({
          workspaceId: principal.workspaceId,
          authState: "ready",
          displayName: ident.displayName,
          username: ident.username,
        });
        return { ok: true, status: buildBindingStatus(updated, null) };
      }

      if (liveAuthState !== binding.authState) {
        await db.updateAuthState({
          workspaceId: principal.workspaceId,
          authState: liveAuthState,
        });
        const updated = await db.getByWorkspace(principal.workspaceId);
        const flow: TelegramAuthFlow = {
          type: binding.authState === "waiting_qr" ? "qr" : "phone",
          qrLink: null,
          qrImageData: null,
          expiresAt: null,
          phoneMasked: binding.phoneMasked,
          codeLength: null,
          message: authFlowMessage(liveAuthState, binding.phoneMasked),
        };
        return { ok: true, status: buildBindingStatus(updated, flow) };
      }
    }

    if (binding.authState === "waiting_qr") {
      const flow: TelegramAuthFlow = {
        type: "qr",
        qrLink: null,
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
 * Creates a new binding (with a registered backend slot) if none exists.
 */
export async function startQr(
  principal: Principal
): Promise<{ ok: true; status: BindingStatus } | { ok: false; reason: string }> {
  try {
    const binding = await ensureRegisteredBinding(principal);

    if (binding.authState === "ready") {
      return { ok: false, reason: "Аккаунт уже подключён." };
    }

    await db.updateAuthState({
      workspaceId: principal.workspaceId,
      authState: "waiting_qr",
      authError: null,
    });

    const result = await startQrTdlib(binding.tdlibAccountId);
    const body = (result?.body ?? result) as Record<string, unknown>;
    const ok = (result as { status?: number }).status === 200 && Boolean((body as Record<string, unknown>)?.ok);

    if (!ok) {
      await db.updateAuthState({
        workspaceId: principal.workspaceId,
        authState: "error",
        authError: tdlibErrorMessage((body as Record<string, unknown>)?.message as string),
      });
      return { ok: false, reason: tdlibErrorMessage((body as Record<string, unknown>)?.message as string) };
    }

    const qrLink = (body as Record<string, unknown>)?.qrLink as string | null;
    const qrImageData = ((body as Record<string, unknown>)?.qrPng ?? (body as Record<string, unknown>)?.qrImageData) as string | null;

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
    return { ok: false, reason: "Не удалось запустить QR-код. Проверьте соединение или сбросьте привязку." };
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
    const binding = await ensureRegisteredBinding(principal);

    if (binding.authState === "ready") {
      return { ok: false, reason: "Аккаунт уже подключён." };
    }

    await db.updateAuthState({
      workspaceId: principal.workspaceId,
      authState: "waiting_code",
      phoneMasked: maskPhone(normalized),
      authError: null,
    });

    const result = await startPhoneTdlib(normalized, binding.tdlibAccountId);
    const body = (result?.body ?? result) as Record<string, unknown>;

    if ((result as { status?: number }).status !== 200) {
      await db.updateAuthState({
        workspaceId: principal.workspaceId,
        authState: "error",
        authError: tdlibErrorMessage((body as Record<string, unknown>)?.message as string),
      });
      return { ok: false, reason: tdlibErrorMessage((body as Record<string, unknown>)?.message as string) };
    }

    const authState = extractAuthState(body as Record<string, unknown>);
    if (authState === "ready") {
      const ident = accountIdentityFrom(body as Record<string, unknown>);
      await db.updateAuthState({ workspaceId: principal.workspaceId, authState: "ready", displayName: ident.displayName, username: ident.username });
    } else if (authState === "waiting_password") {
      await db.updateAuthState({ workspaceId: principal.workspaceId, authState: "waiting_password" });
    }

    const updated = await db.getByWorkspace(principal.workspaceId);
    const flow: TelegramAuthFlow = {
      type: "phone",
      qrLink: null,
      qrImageData: null,
      expiresAt: null,
      phoneMasked: maskPhone(normalized),
      codeLength: 5,
      message: authFlowMessage(updated?.authState ?? "waiting_code", maskPhone(normalized)),
    };

    return { ok: true, status: buildBindingStatus(updated, flow) };
  } catch {
    return { ok: false, reason: "Не удалось отправить номер. Проверьте соединение или сбросьте привязку." };
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
      const ident = accountIdentityFrom(body);
      await db.updateAuthState({
        workspaceId: principal.workspaceId,
        authState: "ready",
        displayName: ident.displayName,
        username: ident.username,
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

    await db.updateAuthState({
      workspaceId: principal.workspaceId,
      authState: "error",
      authError: tdlibErrorMessage((body as Record<string, unknown>)?.message as string),
    });
    return {
      ok: false,
      reason: tdlibErrorMessage((body as Record<string, unknown>)?.message as string) + " Попробуйте ещё раз.",
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
      const ident = accountIdentityFrom(body);
      await db.updateAuthState({ workspaceId: principal.workspaceId, authState: "ready", displayName: ident.displayName, username: ident.username });
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

    // Local-only reset. Do NOT call the backend /telegram/auth/reset route: it
    // is legacy-only and would reset the shared NOVIKOVA session (see INCIDENT
    // note above). The per-account TDLib client stays as-is; a fresh QR/phone
    // flow drives it forward again.
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

    // SAFE per-account unbind. /telegram/logout is hard-blocked (legacy singleton
    // that logs out shared NOVIKOVA). Instead use /telegram/accounts/remove, which
    // acts ONLY on this slot's own TDLib client (backend removeAccount() explicitly
    // guards the novikova id) and deletes the slot's isolated session dir. Best-
    // effort: a failure never blocks dropping the binding record.
    const slotId = binding.tdlibAccountId;
    if (slotId && !isForbiddenAccountId(slotId) && (await backendHasAccount(slotId))) {
      try {
        await backendFetch(`/telegram/accounts/remove`, { accountId: slotId });
      } catch {
        // slot cleanup best-effort
      }
    }
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
    const binding = await bindingForRead(principal);
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
 * Server-side ownership check for a browser-selected chatId.
 * The browser may choose a chatId, but the server must prove that chat belongs
 * to the caller's bound TDLib account before reading context or sending.
 */
export async function assertChatBelongsToBoundAccount(
  principal: Principal,
  chatId: string,
  limit = 100
): Promise<
  | { ok: true; accountId: string; chat: Record<string, unknown> }
  | { ok: false; reason: string }
> {
  if (!chatId) return { ok: false, reason: "chat_id_required" };

  const binding = await bindingForRead(principal);
  if (!binding) return { ok: false, reason: "no_binding" };
  if (binding.authState !== "ready") return { ok: false, reason: "authorization_not_ready" };

  const result = await getChatsTdlib(binding.tdlibAccountId, limit);
  const body = (result?.body ?? result) as Record<string, unknown>;
  const chats = ((body?.chats ?? []) as Array<Record<string, unknown>>) ?? [];
  const chat = chats.find((c) => String(c.id) === String(chatId));
  if (!chat) return { ok: false, reason: "chat_not_found_or_not_bound" };

  return { ok: true, accountId: binding.tdlibAccountId, chat };
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
    const owned = await assertChatBelongsToBoundAccount(principal, chatId);
    if (!owned.ok) return { ok: false, reason: owned.reason };

    const result = await getMessagesTdlib(owned.accountId, chatId, limit);
    const body = (result?.body ?? result) as Record<string, unknown>;
    const messages = ((body as Record<string, unknown>)?.messages ?? []) as unknown[];
    return { ok: true, messages, chatId };
  } catch {
    return { ok: false, reason: "Не удалось загрузить сообщения." };
  }
}

// ---------------------------------------------------------------------------
// Etap 2: server-gated per-account text send. Called ONLY from the execute route
// AFTER the approval gate has verified user+account+chat+payload_hash+TTL+single-use.
// operatorApproved is set here, server-side — never trusted from the browser.
// Sends strictly through the bound slot's own runtime; never the legacy singleton.
// ---------------------------------------------------------------------------
export async function sendTextThroughSlot(
  accountId: string,
  chatId: string,
  text: string,
  actionType: string,
): Promise<{ ok: boolean; telegramMessageId: string | null; code?: string; message?: string }> {
  await assertRegisteredSlot(accountId);
  const internalSendSecret = process.env.EPICGRAM_INTERNAL_SEND_SECRET;
  const stagingSendToken = process.env.EPICGRAM_BACKEND_SEND_TOKEN;
  const res = await backendFetch(`/telegram/send`, {
    accountId,
    chatId,
    text,
    operatorApproved: true,
    actionType: actionType === "publish_channel" ? "publish_post" : "telegram_send",
  }, {
    ...(internalSendSecret ? { "x-epicgram-internal-send-secret": internalSendSecret } : {}),
    ...(stagingSendToken ? { "x-epicgram-staging-send-token": stagingSendToken } : {}),
  });
  const body = (res?.body ?? res) as Record<string, unknown>;
  const ok = (res as { status?: number }).status === 200 && body?.sent === true;
  return {
    ok,
    telegramMessageId: (body?.sentMessage ?? body?.sentMessageId ?? null) as string | null,
    code: body?.code as string | undefined,
    message: body?.message as string | undefined,
  };
}
