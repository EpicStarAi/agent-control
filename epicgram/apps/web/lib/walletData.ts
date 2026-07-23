import * as db from "@/lib/walletDb";
import * as store from "@/lib/walletStore";
import type { WalletBinding, PaymentRequest, PaymentStatus, AgentWallet } from "@/lib/wallet";

// P28 facade: Postgres when available, else fs. Every result carries source: "db"|"fallback".
type Src = "db" | "fallback";

export async function listBindings(): Promise<{ bindings: WalletBinding[]; source: Src }> {
  if (db.enabled()) { try { return { bindings: await db.listBindings(), source: "db" }; } catch {} }
  return { bindings: store.listBindings(), source: "fallback" };
}
export async function createBinding(i: Partial<WalletBinding>): Promise<{ ok: boolean; item?: WalletBinding; source: Src }> {
  if (db.enabled()) { try { return { ...(await db.createBinding(i)), source: "db" }; } catch {} }
  return { ...store.createBinding(i), source: "fallback" };
}
export async function dashboard(): Promise<{ dashboard: any; source: Src }> {
  if (db.enabled()) { try { return { dashboard: await db.dashboard(), source: "db" }; } catch {} }
  return { dashboard: store.dashboard(), source: "fallback" };
}
export async function listPayments(s?: PaymentStatus | null): Promise<{ payments: PaymentRequest[]; source: Src }> {
  if (db.enabled()) { try { return { payments: await db.listPayments(s ?? null), source: "db" }; } catch {} }
  return { payments: store.listPayments(s ?? null), source: "fallback" };
}
export async function createPayment(i: Partial<PaymentRequest>): Promise<{ ok: boolean; item?: PaymentRequest; message?: string; source: Src }> {
  if (db.enabled()) { try { return { ...(await db.createPayment(i)), source: "db" }; } catch {} }
  return { ...store.createPayment(i), source: "fallback" };
}
async function tx(kind: "approve"|"reject"|"cancel", id: string, by?: string) {
  if (db.enabled()) { try {
    const r = kind==="approve"?await db.approvePayment(id,by):kind==="reject"?await db.rejectPayment(id,by):await db.cancelPayment(id,by);
    return { ...r, source: "db" as Src };
  } catch {} }
  const r = kind==="approve"?store.approvePayment(id,by):kind==="reject"?store.rejectPayment(id,by):store.cancelPayment(id,by);
  return { ...r, source: "fallback" as Src };
}
export const approvePayment = (id: string, by?: string) => tx("approve", id, by);
export const rejectPayment = (id: string, by?: string) => tx("reject", id, by);
export const cancelPayment = (id: string, by?: string) => tx("cancel", id, by);

export async function listAgents(): Promise<{ agents: AgentWallet[]; source: Src }> {
  if (db.enabled()) { try { return { agents: await db.listAgents(), source: "db" }; } catch {} }
  return { agents: store.listAgents(), source: "fallback" };
}
export async function upsertAgent(i: Partial<AgentWallet>): Promise<{ ok: boolean; item?: AgentWallet; source: Src }> {
  if (db.enabled()) { try { return { ...(await db.upsertAgent(i)), source: "db" }; } catch {} }
  return { ...store.upsertAgent(i), source: "fallback" };
}
