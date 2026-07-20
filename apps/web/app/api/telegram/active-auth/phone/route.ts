import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { isForbiddenAccountId } from "@/lib/telegramBindings";

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
      headers: { "content-type": "application/json", "cache-control": "no-store" },
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

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/active-auth/phone", "POST");
  if (!auth.ok) return auth.response;

  let phoneNumber = "";
  try {
    const body = await req.json();
    phoneNumber = String(body?.phoneNumber ?? body?.phone ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, reason: "Тело запроса невалидно." }, { status: 400, headers: H });
  }

  if (!phoneNumber) {
    return NextResponse.json({ ok: false, reason: "Введите номер телефона." }, { status: 400, headers: H });
  }

  const activeAccountId = await resolveOrCreateActiveAccount();
  if (!activeAccountId) {
    return NextResponse.json({ ok: false, reason: "active_slot_unavailable" }, { status: 409, headers: H });
  }

  const result = await backend("/telegram/auth/phone", { accountId: activeAccountId, phoneNumber });
  if (!result.response.ok) {
    return NextResponse.json({ ok: false, reason: str(result.data.message) ?? "Код не отправлен." }, { status: 409, headers: H });
  }

  return NextResponse.json({
    ok: true,
    activeAccountId,
    authorizationState: str(result.data.authorizationState),
    message: str(result.data.message) ?? "Код запрошен. Проверьте Telegram.",
  }, { headers: H });
}
