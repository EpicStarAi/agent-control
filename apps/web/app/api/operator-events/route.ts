import { NextResponse } from "next/server";
import type { OperatorEvent } from "@/lib/missions";
import { getPrincipal } from "@/lib/telegramGuard";

// Production Telegram client path: operator events are read from Postgres only.
// No local missionStore fallback here, because that fallback is seeded demo data.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PgPool = { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

async function loadPool(): Promise<PgPool | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const name = "pg";
    const pg = await import(/* webpackIgnore: true */ name);
    const Pool = pg?.Pool ?? pg?.default?.Pool;
    if (!Pool) return null;
    return new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 4000 }) as PgPool;
  } catch {
    return null;
  }
}

function rowToEvent(r: Record<string, unknown>): OperatorEvent {
  return {
    id: String(r.id ?? ""),
    missionId: r.mission_id ? String(r.mission_id) : null,
    sourceOperator: String(r.source_operator ?? "Operator"),
    eventType: String(r.event_type ?? "logged") as OperatorEvent["eventType"],
    message: String(r.message ?? ""),
    riskLevel: String(r.risk_level ?? "none") as OperatorEvent["riskLevel"],
    approvalState: String(r.approval_state ?? "not_required") as OperatorEvent["approvalState"],
    timestamp: new Date(String(r.timestamp ?? Date.now())).toISOString(),
  };
}

export async function GET(req: Request) {
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  const missionId = new URL(req.url).searchParams.get("missionId");
  const pool = await loadPool();
  if (!pool) {
    return NextResponse.json(
      { events: [], source: "postgres_unavailable" },
      { headers: { "cache-control": "private, no-store, must-revalidate" } },
    );
  }

  try {
    const table = await pool.query(`SELECT to_regclass('public.operator_events') AS table_name`);
    if (!table.rows[0]?.table_name) {
      return NextResponse.json(
        { events: [], source: "postgres_no_operator_events_table" },
        { headers: { "cache-control": "private, no-store, must-revalidate" } },
      );
    }
    const result = missionId
      ? await pool.query(`SELECT * FROM operator_events WHERE mission_id=$1 ORDER BY timestamp DESC LIMIT 200`, [missionId])
      : await pool.query(`SELECT * FROM operator_events ORDER BY timestamp DESC LIMIT 200`);
    return NextResponse.json(
      { events: result.rows.map(rowToEvent), source: "postgres" },
      { headers: { "cache-control": "private, no-store, must-revalidate" } },
    );
  } catch {
    return NextResponse.json(
      { events: [], source: "postgres_error" },
      { status: 502, headers: { "cache-control": "private, no-store, must-revalidate" } },
    );
  }
}

export async function POST(req: Request) {
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  await req.json().catch(() => ({}));
  return NextResponse.json(
    {
      ok: false,
      blocked: true,
      message: "Запись operator events через этот endpoint отключена в production-пути EPICGRAM.",
    },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}
