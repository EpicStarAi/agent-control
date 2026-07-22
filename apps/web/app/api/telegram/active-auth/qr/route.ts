import { NextResponse } from "next/server";
import { denyMutation, requirePrincipal, telegramMutationsEnabled } from "@/lib/telegramGuard";
import { isForbiddenAccountId } from "@/lib/telegramBindings";
import { backendRequestHeaders } from "@/lib/backendRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";
const H = { "cache-control": "private, no-store, must-revalidate", pragma: "no-cache" };
const BACKEND_TIMEOUT_MS = 8000;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function backend(path: string, body?: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(`${API}${path}`, {
      method: body ? "POST" : "GET",
      headers: backendRequestHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return { response, data: data as Record<string, unknown> };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveOrCreateActiveAccount() {
  try {
    const status = await backend("/telegram/state");
    const activeAccountId = str(status.data.activeAccountId);
    if (activeAccountId && !isForbiddenAccountId(activeAccountId)) return activeAccountId;
  } catch {
    // Fall through to creating a clean per-user auth slot.
  }

  const created = await backend("/telegram/accounts/new", {});
  const accountId = str(created.data.activeAccountId);
  if (!created.response.ok || !accountId || isForbiddenAccountId(accountId)) return null;
  return accountId;
}

export async function POST() {
  const auth = await requirePrincipal("/api/telegram/active-auth/qr", "POST");
  if (!auth.ok) return auth.response;
  if (!telegramMutationsEnabled() || auth.principal.role !== "owner") {
    return denyMutation("/api/telegram/active-auth/qr", "POST", auth.principal, "active_auth_qr");
  }

  const activeAccountId = await resolveOrCreateActiveAccount();
  if (!activeAccountId) {
    return NextResponse.json({ ok: false, reason: "active_slot_unavailable" }, { status: 409, headers: H });
  }

  const result = await backend("/telegram/auth/qr", { accountId: activeAccountId });
  if (!result.response.ok) {
    return NextResponse.json({ ok: false, reason: str(result.data.message) ?? "QR не запустился." }, { status: 409, headers: H });
  }

  return NextResponse.json({
    ok: true,
    activeAccountId,
    qrLink: str(result.data.qrLink),
    authorizationState: str(result.data.authorizationState),
    message: str(result.data.message) ?? "QR авторизация запрошена.",
  }, { headers: H });
}
