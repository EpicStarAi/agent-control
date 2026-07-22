import { NextResponse } from "next/server";
import { referralLogin } from "@/lib/authData";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";
import * as bindingsDb from "@/lib/telegramBindingsDb";
import { isForbiddenAccountId } from "@/lib/telegramBindings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LOCAL_DEV_CODE = "EPICGRAM-LOCAL-OWNER-2026";
const API = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

function isLocalDev(req: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return /^(127\.0\.0\.1|localhost|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/i.test(host);
}

function safeNext(req: Request): URL {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/client";
  const path = next.startsWith("/") && !next.startsWith("//") ? next : "/client";
  const target = new URL(path, req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto");
  if (host) target.host = host;
  if (target.hostname === "0.0.0.0") target.hostname = "127.0.0.1";
  if (proto === "http" || proto === "https") target.protocol = `${proto}:`;
  return target;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function bindReadyLocalTelegramSlot(login: NonNullable<Awaited<ReturnType<typeof referralLogin>>>) {
  if (!login.user?.id || !login.workspace?.id) return;
  const response = await fetch(`${API}/telegram/status`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return;

  const status = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const activeAccountId = str(status.activeAccountId);
  const accounts = Array.isArray(status.accounts) ? (status.accounts as Array<Record<string, unknown>>) : [];
  const active = accounts.find((account) => str(account.slotId) === activeAccountId) ?? null;
  const ready = active && (active.status === "ready" || active.authorizationState === "authorizationStateReady");
  if (!activeAccountId || !ready || isForbiddenAccountId(activeAccountId)) return;

  const conflict = await bindingsDb.getByTdlibAccount(activeAccountId);
  if (conflict && conflict.workspaceId !== login.workspace.id) {
    await bindingsDb.remove(conflict.workspaceId);
  }

  await bindingsDb.bindWorkspaceToAccount({
    workspaceId: login.workspace.id,
    userId: login.user.id,
    tdlibAccountId: activeAccountId,
    displayName: str(active.displayName) ?? str(active.label) ?? "Telegram",
    phoneMasked: str(active.phoneMasked) ?? str(status.phoneMasked),
    username: str(active.username),
    authState: "ready",
  });
}

export async function GET(req: Request) {
  if (!isLocalDev(req)) {
    return NextResponse.json({ ok: false, reason: "local_dev_only" }, { status: 404 });
  }

  const login = await referralLogin(LOCAL_DEV_CODE);
  if (!login.ok || !login.token) {
    return NextResponse.json({ ok: false, reason: login.reason || "login_failed" }, { status: 401 });
  }

  await bindReadyLocalTelegramSlot(login).catch(() => undefined);

  const res = NextResponse.redirect(safeNext(req), { status: 303 });
  res.cookies.set(SESSION_COOKIE, login.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000)
  });
  res.headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
  return res;
}
