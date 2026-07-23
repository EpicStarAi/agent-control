// POST /api/telegram/binding/migrate — runs the telegram_bindings migration
// For setup use only. DELETE THIS ROUTE once the migration has been applied to
// every environment.
//
// P0 consolidation: this used to be reachable anonymously — an unauthenticated
// caller could POST a password guess at a DDL endpoint, with no session, no
// rate limit and no audit trail. It is now gated exactly like the rest of the
// canonical binding/* family: an authenticated owner principal FIRST, then the
// operator password as a second factor.
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal, recordDenial } from "@/lib/telegramGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS telegram_bindings (
  id               text        NOT NULL PRIMARY KEY,
  workspace_id     text        NOT NULL,
  user_id          text        NOT NULL,
  tdlib_account_id text        NOT NULL UNIQUE,
  display_name     text        DEFAULT 'Telegram',
  phone_masked     text,
  username         text,
  auth_state       text        NOT NULL DEFAULT 'init',
  auth_error       text,
  bound_at         timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_bindings_ws_idx ON telegram_bindings (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_bindings_tdlib_idx ON telegram_bindings (tdlib_account_id);
CREATE INDEX IF NOT EXISTS telegram_bindings_user_idx ON telegram_bindings (user_id);
`;

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/migrate", "POST");
  if (!auth.ok) return auth.response;
  if (auth.principal.role !== "owner") {
    recordDenial({
      reason: "migrate_requires_owner",
      route: "/api/telegram/binding/migrate",
      method: "POST",
      principal: auth.principal,
    });
    return NextResponse.json({ ok: false, reason: "owner_required" }, { status: 403 });
  }

  // Second factor: operator password (EPICGRAM_OPERATOR_PASSWORD_SCRYPT).
  const stored = process.env.EPICGRAM_OPERATOR_PASSWORD_SCRYPT ?? "";
  if (!stored || stored.startsWith("replace-with")) {
    return NextResponse.json({ ok: false, reason: "migration not configured" }, { status: 503 });
  }

  let provided = "";
  try {
    const body = await req.json();
    provided = String(body?.password ?? "");
  } catch {}

  if (!provided) {
    return NextResponse.json({ ok: false, reason: "password required" }, { status: 401 });
  }

  // Verify operator password
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return NextResponse.json({ ok: false, reason: "bad hash format" }, { status: 500 });
  }
  const [, salt, hashHex] = parts;
  const { scryptSync, timingSafeEqual } = await import("node:crypto");
  try {
    const derived = scryptSync(provided, salt, 64);
    const expected = Buffer.from(hashHex, "hex");
    if (derived.length !== expected.length || !timingSafeEqual(derived, expected)) {
      return NextResponse.json({ ok: false, reason: "invalid password" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "auth error" }, { status: 500 });
  }

  // Run migration
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ ok: false, reason: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, max: 1, connectionTimeoutMillis: 15000 });
    await pool.query(MIGRATION_SQL);
    await pool.end();
    return NextResponse.json({ ok: true, message: "telegram_bindings table created" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, reason: msg }, { status: 500 });
  }
}
