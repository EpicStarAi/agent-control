import { NextResponse } from "next/server";
import { listBindings, createBinding } from "@/lib/walletData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import type { WalletBinding } from "@/lib/wallet";

// P28 — wallet bindings. Stores PUBLIC address + provider only. No seed / no private keys.
export const dynamic = "force-dynamic";

export async function GET() {
  const { bindings, source } = await listBindings();
  return NextResponse.json({ bindings, source });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<WalletBinding>;
  const result = await createBinding(body ?? {});
  if (result.ok && result.item) {
    broadcast("audit.logged", { event: "wallet.binding.created", id: result.item.id });
    await appendOperatorEvent({ missionId: null, sourceOperator: "Account-Manager", eventType: "logged",
      message: `Кошелёк привязан: ${result.item.walletProvider} → ${result.item.telegramAccountId} (публичный адрес, без ключей)`,
      riskLevel: "none", approvalState: "not_required" }).catch(() => {});
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
