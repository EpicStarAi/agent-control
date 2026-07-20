import { NextResponse } from "next/server";
import { requirePrincipal, PRIVATE_NO_STORE } from "@/lib/telegramGuard";
import { getStatus, getChats } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

type Row = Record<string, unknown>;
type PgPool = { query: (text: string, params?: unknown[]) => Promise<{ rows: Row[] }> };

async function loadPg(): Promise<any | null> {
  try {
    return await import(/* webpackIgnore: true */ "pg");
  } catch {
    return null;
  }
}

async function pgPool(): Promise<PgPool | null> {
  if (!process.env.DATABASE_URL) return null;
  const pg = await loadPg();
  const Pool = pg?.Pool ?? pg?.default?.Pool;
  if (!Pool) return null;
  return new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 3500 }) as PgPool;
}

async function queryRows(sql: string, params: unknown[]): Promise<Row[]> {
  const pool = await pgPool();
  if (!pool) return [];
  try {
    const res = await pool.query(sql, params);
    return res.rows;
  } catch {
    return [];
  }
}

function chatCategory(chat: Row): string {
  const type = String(chat.category ?? chat.type ?? "").toLowerCase();
  if (type.includes("channel") || chat.isChannel === true) return "channels";
  if (type.includes("bot") || chat.isBot === true) return "bots";
  if (type.includes("group") || type.includes("supergroup")) return "groups";
  if (type.includes("private")) return "private";
  return "other";
}

function summarizeChats(chats: unknown[]) {
  const rows = chats.filter((chat): chat is Row => Boolean(chat) && typeof chat === "object") as Row[];
  const counts = { total: rows.length, private: 0, groups: 0, channels: 0, bots: 0, unread: 0, other: 0 };
  for (const chat of rows) {
    const category = chatCategory(chat) as keyof typeof counts;
    if (category in counts && category !== "total" && category !== "unread") counts[category] += 1;
    if (Number(chat.unreadCount ?? 0) > 0 || chat.isMarkedAsUnread === true) counts.unread += 1;
  }
  return {
    counts,
    sample: rows.slice(0, 25).map((chat) => ({
      id: String(chat.id ?? ""),
      title: String(chat.title ?? "Без названия"),
      category: chatCategory(chat),
      unreadCount: Number(chat.unreadCount ?? 0),
      list: String(chat.list ?? "main"),
      username: typeof chat.username === "string" ? chat.username : null,
    })),
  };
}

async function backendTelegramState() {
  try {
    const response = await fetch(`${API_BASE_URL}/telegram/state`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) return { runtime: "unavailable", accounts: [], activeAccountId: null, authorizationState: null };
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    return {
      runtime: String(data.runtime ?? "unknown"),
      activeAccountId: data.activeAccountId ? String(data.activeAccountId) : null,
      authorizationState: data.authorizationState ? String(data.authorizationState) : null,
      accounts: accounts.map((account: Row) => ({
        slotId: String(account.slotId ?? account.id ?? ""),
        telegramUserId: account.id && String(account.id).match(/^\d+$/) ? String(account.id) : null,
        label: account.label ? String(account.label) : null,
        displayName: account.displayName ? String(account.displayName) : null,
        username: account.username ? String(account.username) : null,
        phoneMasked: account.phoneMasked ? String(account.phoneMasked) : null,
        status: account.status ? String(account.status) : null,
        authorizationState: account.authorizationState ? String(account.authorizationState) : null,
        active: Boolean(account.active),
      })),
    };
  } catch {
    return { runtime: "backend_offline", accounts: [], activeAccountId: null, authorizationState: null };
  }
}

export async function GET() {
  const auth = await requirePrincipal("/api/epic-crm/telegram-ledger", "GET");
  if (!auth.ok) return auth.response;

  const { principal } = auth;
  const statusResult = await getStatus(principal);
  const binding = statusResult.ok ? statusResult.status.binding : null;
  const chatsResult = await getChats(principal, 100);
  const chats = chatsResult.ok ? chatsResult.chats : [];
  const chatSummary = summarizeChats(chats);
  const runtimeState = await backendTelegramState();
  const activeRuntimeAccount = runtimeState.accounts.find((account: Row) => account.active) ?? null;

  const [allowlist, approvals, audit] = await Promise.all([
    queryRows(
      `SELECT id, workspace_id, principal_id, telegram_account_id, account_slot, chat_id, action_type, chat_title, added_at, revoked_at
         FROM epicgram_chat_allowlist
        WHERE workspace_id=$1
        ORDER BY added_at DESC
        LIMIT 100`,
      [principal.workspaceId],
    ),
    queryRows(
      `SELECT id, workspace_id, principal_id, telegram_account_id, account_slot, chat_id, action_type, status, confirm_stage, created_at, expires_at, used_at
         FROM epicgram_action_approvals
        WHERE workspace_id=$1
        ORDER BY created_at DESC
        LIMIT 100`,
      [principal.workspaceId],
    ),
    queryRows(
      `SELECT id, at, workspace_id, principal_id, telegram_account_id, telegram_user_id, chat_id, action_type, stage, outcome, error_code, telegram_message_id
         FROM epicgram_action_audit
        WHERE workspace_id=$1
        ORDER BY at DESC
        LIMIT 150`,
      [principal.workspaceId],
    ),
  ]);

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      principal,
      binding,
      telegram: {
        connected: Boolean(binding && binding.authState === "ready"),
        source: chatsResult.ok ? chatsResult.source : "unavailable",
        chats: chatSummary,
        runtime: runtimeState,
      },
      crmRows: [
        {
          workspace_id: principal.workspaceId,
          telegram_account_slot: binding?.tdlibAccountId ?? activeRuntimeAccount?.slotId ?? null,
          telegram_user_id: activeRuntimeAccount?.telegramUserId ?? null,
          display_name: binding?.displayName ?? activeRuntimeAccount?.displayName ?? null,
          username: binding?.username ?? activeRuntimeAccount?.username ?? null,
          masked_phone: binding?.phoneMasked ?? activeRuntimeAccount?.phoneMasked ?? null,
          status: binding?.authState ?? "no_binding",
          active_account: binding?.authState === "ready",
          rights_settings: "manual_approval_required; mutation_guard; owner_matched_binding",
          allowlist_count: allowlist.filter((row) => !row.revoked_at).length,
          audit_count: audit.length,
        },
      ],
      allowlist,
      approvals,
      audit,
      notes: [
        "TDLib database stores Telegram session and local Telegram cache; EPIC CRM stores only safe metadata and control records.",
        "If Backend TDLib runtime is ready but status is no_binding, the account exists in TDLib but is not bound to the current EPICGRAM workspace.",
        "telegram_user_id is not backfilled in current binding table yet; next migration should persist it after TDLib authorization.",
        "Current telegram_bindings schema is one account per workspace. Multi-account CRM needs a follow-up migration to one row per account slot.",
      ],
    },
    { headers: PRIVATE_NO_STORE },
  );
}
