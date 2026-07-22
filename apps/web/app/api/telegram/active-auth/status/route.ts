import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { isForbiddenAccountId } from "@/lib/telegramBindings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";
const H = { "cache-control": "private, no-store, must-revalidate", pragma: "no-cache" };
const BACKEND_TIMEOUT_MS = 5000;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rawAuthState(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { _?: unknown })._ === "string") return String((value as { _: string })._);
  return "";
}

export async function GET() {
  const auth = await requirePrincipal("/api/telegram/active-auth/status", "GET");
  if (!auth.ok) return auth.response;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  let data: Record<string, unknown> = {};
  try {
    const response = await fetch(`${API}/telegram/state`, {
      headers: { "cache-control": "no-store" },
      cache: "no-store",
      signal: controller.signal,
    });
    data = await response.json().catch(() => ({})) as Record<string, unknown>;
  } catch {
    return NextResponse.json({
      ok: true,
      activeAccountId: null,
      authorizationState: "backend_timeout",
      waitingForCode: false,
      waitingForPassword: false,
      waitingForQr: false,
      phoneMasked: null,
      account: null,
    }, { headers: H });
  } finally {
    clearTimeout(timer);
  }

  const activeAccountId = str(data.activeAccountId);
  const activeAllowed = Boolean(activeAccountId && !isForbiddenAccountId(activeAccountId));
  const accounts = Array.isArray(data.accounts) ? data.accounts as Array<Record<string, unknown>> : [];
  const active = accounts.find((account) => str(account.slotId) === activeAccountId) ?? null;
  const authorizationState = rawAuthState(active?.authorizationState ?? data.authorizationState);
  const waitingForCode = activeAllowed && authorizationState === "authorizationStateWaitCode";
  const waitingForPassword = activeAllowed && authorizationState === "authorizationStateWaitPassword";
  const waitingForQr = activeAllowed && authorizationState === "authorizationStateWaitOtherDeviceConfirmation";

  return NextResponse.json({
    ok: true,
    activeAccountId: activeAllowed ? activeAccountId : null,
    authorizationState,
    waitingForCode,
    waitingForPassword,
    waitingForQr,
    phoneMasked: str(active?.phoneMasked) ?? str(data.phoneMasked),
    account: activeAllowed && active
      ? {
          slotId: str(active.slotId),
          status: str(active.status),
          displayName: str(active.displayName),
          phoneMasked: str(active.phoneMasked),
        }
      : null,
  }, { headers: H });
}
