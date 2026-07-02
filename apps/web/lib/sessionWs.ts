import { cookies } from "next/headers";
import { getSession } from "@/lib/authData";
import { SESSION_COOKIE } from "@/lib/auth";

// Shared helper: resolve the caller's workspace_id from the session cookie only.
// Never trust a workspace id from the request body. Returns null if unauthenticated.
export async function currentWorkspaceId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value || "";
  const s = await getSession(token);
  return s.authenticated ? (s.workspace?.id || null) : null;
}
