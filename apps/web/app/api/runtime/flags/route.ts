import { requirePrincipal, guardedJson } from "@/lib/telegramGuard";
import { getRuntimeFlags } from "@/lib/runtimeFlags";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePrincipal("/api/runtime/flags", "GET");
  if (!auth.ok) return auth.response;
  return guardedJson({ ok: true, flags: getRuntimeFlags() }, 200);
}
