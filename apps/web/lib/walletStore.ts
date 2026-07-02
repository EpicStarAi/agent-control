import fs from "node:fs";
import path from "node:path";
import {
  BINDING_SEED, PAYMENT_SEED, AGENT_WALLET_SEED, canApprove, canReject, canCancel, newId,
  type WalletBinding, type PaymentRequest, type PaymentStatus, type AgentWallet, type RiskLevel
} from "@/lib/wallet";

// P28 fs fallback store. No keys. No execution. Approve only flips status.
const FILE = path.join(process.cwd(), ".wallet-data.json");
type DB = { bindings: WalletBinding[]; payments: PaymentRequest[]; agents: AgentWallet[] };

function load(): DB {
  try { if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* reseed */ }
  const seed: DB = { bindings: BINDING_SEED.map(x=>({...x})), payments: PAYMENT_SEED.map(x=>({...x})), agents: AGENT_WALLET_SEED.map(x=>({...x})) };
  save(seed); return seed;
}
function save(db: DB){ try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch { /* best effort */ } }

export function listBindings(): WalletBinding[] { return load().bindings; }
export function createBinding(i: Partial<WalletBinding>): { ok: boolean; item?: WalletBinding } {
  const db = load(); const now = new Date().toISOString();
  const item: WalletBinding = { id: newId("wb"), telegramAccountId: String(i.telegramAccountId ?? "@account").slice(0,60),
    walletAddress: String(i.walletAddress ?? "EQC…DEMO").slice(0,80), walletProvider: String(i.walletProvider ?? "TON Connect").slice(0,60),
    connectionStatus: (i.connectionStatus as WalletBinding["connectionStatus"]) ?? "connected", connectedAt: now, lastSyncedAt: now };
  db.bindings.unshift(item); save(db); return { ok: true, item };
}
export function dashboard(){ const db = load();
  const binding = db.bindings[0] ?? null;
  return { binding, balance: { TON: 42.5, USDT: 130.0, XTR: 850 }, history: [] as unknown[],
    counts: { payments: db.payments.length, waiting: db.payments.filter(p=>p.status==="waiting_approval").length, agents: db.agents.length } };
}
export function listPayments(status?: PaymentStatus | null): PaymentRequest[] {
  const all = load().payments.slice().sort((a,b)=> a.createdAt<b.createdAt?1:-1);
  return status ? all.filter(p=>p.status===status) : all;
}
export function createPayment(i: Partial<PaymentRequest>): { ok: boolean; item?: PaymentRequest } {
  const db = load(); const now = new Date().toISOString();
  const item: PaymentRequest = { id: newId("pr"), type: String(i.type ?? "payment.transfer").slice(0,60),
    title: String(i.title ?? "Платёж").slice(0,200), description: String(i.description ?? "").slice(0,600),
    amount: Number(i.amount ?? 0), currency: String(i.currency ?? "TON").slice(0,10), target: String(i.target ?? "").slice(0,120),
    sourceAgent: String(i.sourceAgent ?? "AI-Operator").slice(0,60), targetModule: String(i.targetModule ?? "Economy").slice(0,60),
    status: "waiting_approval", payload: (i.payload && typeof i.payload==="object") ? i.payload : {}, createdAt: now, updatedAt: now,
    approvedBy: null, executionResult: null };
  db.payments.unshift(item); save(db); return { ok: true, item };
}
function tx(id: string, action: "approve"|"reject"|"cancel", by?: string){
  const db = load(); const p = db.payments.find(x=>x.id===id);
  if(!p) return { ok:false, message:"payment not found" };
  const g = action==="approve"?canApprove:action==="reject"?canReject:canCancel;
  if(!g(p.status)) return { ok:false, message:`cannot ${action} from ${p.status}` };
  p.status = (action==="approve"?"approved":action==="reject"?"rejected":"cancelled") as PaymentStatus;
  p.updatedAt = new Date().toISOString();
  if(action==="approve") p.approvedBy = by ? String(by).slice(0,60) : "operator";
  // NO execution: executionResult stays null. Money does not move in P28.
  save(db); return { ok:true, item:p };
}
export const approvePayment = (id:string,by?:string)=>tx(id,"approve",by);
export const rejectPayment = (id:string,by?:string)=>tx(id,"reject",by);
export const cancelPayment = (id:string,by?:string)=>tx(id,"cancel",by);

export function listAgents(): AgentWallet[] { return load().agents; }
export function upsertAgent(i: Partial<AgentWallet>): { ok: boolean; item?: AgentWallet } {
  const db = load(); const id = String(i.id ?? newId("aw"));
  let a = db.agents.find(x=>x.id===id);
  if(a){ if(i.dailyLimit!=null)a.dailyLimit=Number(i.dailyLimit); if(i.enabled!=null)a.enabled=Boolean(i.enabled);
    if(i.walletLabel)a.walletLabel=String(i.walletLabel).slice(0,80); if(i.currency)a.currency=String(i.currency).slice(0,10);
    if(i.riskLevel)a.riskLevel=i.riskLevel as RiskLevel; }
  else { a = { id, walletLabel: String(i.walletLabel ?? id).slice(0,80), dailyLimit: Number(i.dailyLimit ?? 0),
    currency: String(i.currency ?? "USDT").slice(0,10), enabled: Boolean(i.enabled ?? false), spendingToday: 0,
    riskLevel: (i.riskLevel as RiskLevel) ?? "low" }; db.agents.push(a); }
  save(db); return { ok: true, item: a };
}
