import { NextRequest, NextResponse } from "next/server";
import { requireLegacyOwnerSurface } from "@/lib/telegramGuard";
import * as bindingsDb from "@/lib/telegramBindingsDb";
import type { TelegramBindingAuthState } from "@/lib/telegramBindings";
import { isForbiddenAccountId } from "@/lib/telegramBindings";
import { backendRequestHeaders } from "@/lib/backendRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";
const H = { "cache-control": "private, no-store, must-revalidate", pragma: "no-cache" };

function rawAuthState(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { _?: unknown })._ === "string") return String((value as { _: string })._);
  return "";
}

function apiAuthState(raw: string): TelegramBindingAuthState {
  if (raw === "authorizationStateReady") return "ready";
  if (raw === "authorizationStateWaitPassword") return "waiting_password";
  if (raw === "authorizationStateWaitCode") return "waiting_code";
  if (raw === "authorizationStateWaitOtherDeviceConfirmation") return "waiting_qr";
  return "error";
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function backend(path: string, body?: unknown) {
  const response = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: backendRequestHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return { response, data: data as Record<string, unknown> };
}

export async function POST(req: NextRequest) {
  const auth = await requireLegacyOwnerSurface("/api/telegram/active-auth/code", "POST", "active_auth_code");
  if (!auth.ok) return auth.response;

  let code = "";
  try {
    const body = await req.json();
    code = String(body?.code ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, reason: "Тело запроса невалидно." }, { status: 400, headers: H });
  }
  if (!/^\d{3,8}$/.test(code)) {
    return NextResponse.json({ ok: false, reason: "Код должен состоять из 3-8 цифр." }, { status: 400, headers: H });
  }

  const status = await backend("/telegram/status");
  const activeAccountId = str(status.data.activeAccountId);
  const accounts = Array.isArray(status.data.accounts) ? status.data.accounts as Array<Record<string, unknown>> : [];
  const active = accounts.find((account) => str(account.slotId) === activeAccountId) ?? null;
  const activeState = rawAuthState(active?.authorizationState ?? status.data.authorizationState);

  if (!activeAccountId || isForbiddenAccountId(activeAccountId)) {
    return NextResponse.json({ ok: false, reason: "active_slot_unavailable" }, { status: 409, headers: H });
  }
  if (activeState !== "authorizationStateWaitCode") {
    return NextResponse.json({ ok: false, reason: "active_slot_not_waiting_code", authorizationState: activeState }, { status: 409, headers: H });
  }

  const result = await backend("/telegram/auth/code", { accountId: activeAccountId, code });
  if (!result.response.ok) {
    return NextResponse.json({ ok: false, reason: str(result.data.message) ?? "Код не принят Telegram." }, { status: 409, headers: H });
  }

  const nextRaw = rawAuthState(result.data.authorizationState);
  const nextState = apiAuthState(nextRaw);
  const account = (result.data.account && typeof result.data.account === "object" ? result.data.account : active) as Record<string, unknown> | null;
  const conflict = await bindingsDb.getByTdlibAccount(activeAccountId);
  if (conflict && conflict.workspaceId !== auth.principal.workspaceId) {
    if (conflict.authState === "ready") {
      return NextResponse.json({ ok: false, reason: "active_slot_bound_to_ready_workspace" }, { status: 409, headers: H });
    }
    await bindingsDb.remove(conflict.workspaceId);
  }

  const binding = await bindingsDb.bindWorkspaceToAccount({
    workspaceId: auth.principal.workspaceId,
    userId: auth.principal.userId,
    tdlibAccountId: activeAccountId,
    displayName: str(account?.displayName) ?? str(account?.label) ?? "Telegram",
    phoneMasked: str(account?.phoneMasked) ?? str(status.data.phoneMasked),
    username: str(account?.username),
    authState: nextState,
    authError: nextState === "error" ? str(result.data.message) ?? "Telegram auth error" : null,
  });

  return NextResponse.json({ ok: nextState !== "error", binding, authorizationState: nextRaw, message: str(result.data.message) }, { headers: H });
}
