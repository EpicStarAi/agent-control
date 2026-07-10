import {
  BINDING_SEED, PAYMENT_SEED, AGENT_WALLET_SEED, canApprove, canReject, canCancel, newId,
  type WalletBinding, type PaymentRequest, type PaymentStatus, type AgentWallet, type RiskLevel
} from "@/lib/wallet";

// P28 Postgres adapter. Active only when DATABASE_URL + pg present; else facade falls back to fs.
// Non-destructive: CREATE TABLE IF NOT EXISTS + seed-if-empty. NO DROP/DELETE. NO keys, NO execution.
type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicPgPool?: PgPool | null; __epicWalletInit?: Promise<void> };

export function enabled(): boolean { return Boolean(process.env.DATABASE_URL); }
async function loadPg(): Promise<any | null> { try { const n = "pg"; return await import(/* webpackIgnore: true */ n); } catch { return null; } }
async function pool(): Promise<PgPool | null> {
  if (!enabled()) return null;
  if (g.__epicPgPool) return g.__epicPgPool;
  const pg = await loadPg(); const Pool = pg?.Pool ?? pg?.default?.Pool; if (!Pool) { g.__epicPgPool = null; return null; }
  g.__epicPgPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 4000 }) as PgPool;
  return g.__epicPgPool;
}
async function ensureInit(p: PgPool): Promise<void> {
  if (!g.__epicWalletInit) g.__epicWalletInit = (async () => {
    await p.query(`CREATE TABLE IF NOT EXISTS wallet_bindings (
      id text PRIMARY KEY, telegram_account_id text, wallet_address text, wallet_provider text,
      connection_status text, connected_at timestamptz DEFAULT now(), last_synced_at timestamptz DEFAULT now())`);
    await p.query(`CREATE TABLE IF NOT EXISTS payment_requests (
      id text PRIMARY KEY, type text, title text, description text, amount numeric, currency text, target text,
      source_agent text, target_module text, status text DEFAULT 'waiting_approval', payload jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), approved_by text, execution_result jsonb)`);
    await p.query(`CREATE TABLE IF NOT EXISTS agent_wallets (
      id text PRIMARY KEY, wallet_label text, daily_limit numeric, currency text, enabled boolean DEFAULT false,
      spending_today numeric DEFAULT 0, risk_level text DEFAULT 'low')`);
    if (Number((await p.query(`SELECT count(*)::int n FROM wallet_bindings`)).rows[0]?.n ?? 0) === 0)
      for (const b of BINDING_SEED) await p.query(
        `INSERT INTO wallet_bindings(id,telegram_account_id,wallet_address,wallet_provider,connection_status,connected_at,last_synced_at)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [b.id,b.telegramAccountId,b.walletAddress,b.walletProvider,b.connectionStatus,b.connectedAt,b.lastSyncedAt]);
    if (Number((await p.query(`SELECT count(*)::int n FROM payment_requests`)).rows[0]?.n ?? 0) === 0)
      for (const r of PAYMENT_SEED) await p.query(
        `INSERT INTO payment_requests(id,type,title,description,amount,currency,target,source_agent,target_module,status,payload,created_at,updated_at,approved_by,execution_result)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NULL) ON CONFLICT (id) DO NOTHING`,
        [r.id,r.type,r.title,r.description,r.amount,r.currency,r.target,r.sourceAgent,r.targetModule,r.status,JSON.stringify(r.payload),r.createdAt,r.updatedAt,r.approvedBy]);
    if (Number((await p.query(`SELECT count(*)::int n FROM agent_wallets`)).rows[0]?.n ?? 0) === 0)
      for (const a of AGENT_WALLET_SEED) await p.query(
        `INSERT INTO agent_wallets(id,wallet_label,daily_limit,currency,enabled,spending_today,risk_level)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [a.id,a.walletLabel,a.dailyLimit,a.currency,a.enabled,a.spendingToday,a.riskLevel]);
  })();
  return g.__epicWalletInit;
}
async function db(): Promise<PgPool> { const p = await pool(); if (!p) throw new Error("pg unavailable"); await ensureInit(p); return p; }

function bRow(r: any): WalletBinding { return { id:r.id, telegramAccountId:r.telegram_account_id, walletAddress:r.wallet_address,
  walletProvider:r.wallet_provider, connectionStatus:r.connection_status, connectedAt:new Date(r.connected_at).toISOString(), lastSyncedAt:new Date(r.last_synced_at).toISOString() }; }
function pRow(r: any): PaymentRequest { return { id:r.id, type:r.type, title:r.title, description:r.description, amount:Number(r.amount),
  currency:r.currency, target:r.target, sourceAgent:r.source_agent, targetModule:r.target_module, status:r.status,
  payload:(r.payload&&typeof r.payload==="object")?r.payload:{}, createdAt:new Date(r.created_at).toISOString(),
  updatedAt:new Date(r.updated_at).toISOString(), approvedBy:r.approved_by??null,
  executionResult:(r.execution_result&&typeof r.execution_result==="object")?r.execution_result:null }; }
function aRow(r: any): AgentWallet { return { id:r.id, walletLabel:r.wallet_label, dailyLimit:Number(r.daily_limit), currency:r.currency,
  enabled:Boolean(r.enabled), spendingToday:Number(r.spending_today), riskLevel:r.risk_level }; }

export async function listBindings(): Promise<WalletBinding[]> { const p=await db(); return (await p.query(`SELECT * FROM wallet_bindings ORDER BY connected_at DESC`)).rows.map(bRow); }
export async function createBinding(i: Partial<WalletBinding>): Promise<{ ok:boolean; item?:WalletBinding }> {
  const p=await db(); const now=new Date().toISOString(); const id=newId("wb");
  const r=await p.query(`INSERT INTO wallet_bindings(id,telegram_account_id,wallet_address,wallet_provider,connection_status,connected_at,last_synced_at)
    VALUES($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
    [id,String(i.telegramAccountId??"@account").slice(0,60),String(i.walletAddress??"EQC…DEMO").slice(0,80),String(i.walletProvider??"TON Connect").slice(0,60),(i.connectionStatus??"connected"),now]);
  return { ok:true, item:bRow(r.rows[0]) };
}
export async function dashboard(){ const p=await db();
  const b=(await p.query(`SELECT * FROM wallet_bindings ORDER BY connected_at DESC LIMIT 1`)).rows[0];
  const cw=Number((await p.query(`SELECT count(*)::int n FROM payment_requests WHERE status='waiting_approval'`)).rows[0]?.n ?? 0);
  const cp=Number((await p.query(`SELECT count(*)::int n FROM payment_requests`)).rows[0]?.n ?? 0);
  const ca=Number((await p.query(`SELECT count(*)::int n FROM agent_wallets`)).rows[0]?.n ?? 0);
  return { binding: b?bRow(b):null, balance:{ TON:42.5, USDT:130.0, XTR:850 }, history:[] as unknown[], counts:{ payments:cp, waiting:cw, agents:ca } };
}
export async function listPayments(status?: PaymentStatus | null): Promise<PaymentRequest[]> {
  const p=await db(); const r=status?await p.query(`SELECT * FROM payment_requests WHERE status=$1 ORDER BY created_at DESC LIMIT 200`,[status]):await p.query(`SELECT * FROM payment_requests ORDER BY created_at DESC LIMIT 200`);
  return r.rows.map(pRow);
}
export async function createPayment(i: Partial<PaymentRequest>): Promise<{ ok:boolean; item?:PaymentRequest }> {
  const p=await db(); const now=new Date().toISOString(); const id=newId("pr");
  const r=await p.query(`INSERT INTO payment_requests(id,type,title,description,amount,currency,target,source_agent,target_module,status,payload,created_at,updated_at,approved_by,execution_result)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'waiting_approval',$10,$11,$11,NULL,NULL) RETURNING *`,
    [id,String(i.type??"payment.transfer").slice(0,60),String(i.title??"Платёж").slice(0,200),String(i.description??"").slice(0,600),Number(i.amount??0),String(i.currency??"TON").slice(0,10),String(i.target??"").slice(0,120),String(i.sourceAgent??"AI-Operator").slice(0,60),String(i.targetModule??"Economy").slice(0,60),JSON.stringify(i.payload&&typeof i.payload==="object"?i.payload:{}),now]);
  return { ok:true, item:pRow(r.rows[0]) };
}
async function tx(id:string, action:"approve"|"reject"|"cancel", by?:string){
  const p=await db(); const cur=(await p.query(`SELECT status FROM payment_requests WHERE id=$1`,[id])).rows[0];
  if(!cur) return { ok:false, message:"payment not found" };
  const st=cur.status as PaymentStatus; const guard=action==="approve"?canApprove:action==="reject"?canReject:canCancel;
  if(!guard(st)) return { ok:false, message:`cannot ${action} from ${st}` };
  const next=(action==="approve"?"approved":action==="reject"?"rejected":"cancelled") as PaymentStatus;
  const by2=action==="approve"?(by?String(by).slice(0,60):"operator"):null; const now=new Date().toISOString();
  // NO execution: execution_result stays NULL. Money does not move in P28.
  const r=await p.query(`UPDATE payment_requests SET status=$2, updated_at=$3, approved_by=COALESCE($4,approved_by) WHERE id=$1 RETURNING *`,[id,next,now,by2]);
  return { ok:true, item:pRow(r.rows[0]) };
}
export const approvePayment=(id:string,by?:string)=>tx(id,"approve",by);
export const rejectPayment=(id:string,by?:string)=>tx(id,"reject",by);
export const cancelPayment=(id:string,by?:string)=>tx(id,"cancel",by);

export async function listAgents(): Promise<AgentWallet[]> { const p=await db(); return (await p.query(`SELECT * FROM agent_wallets ORDER BY id`)).rows.map(aRow); }
export async function upsertAgent(i: Partial<AgentWallet>): Promise<{ ok:boolean; item?:AgentWallet }> {
  const p=await db(); const id=String(i.id ?? newId("aw"));
  const r=await p.query(`INSERT INTO agent_wallets(id,wallet_label,daily_limit,currency,enabled,spending_today,risk_level)
    VALUES($1,$2,$3,$4,$5,0,$6)
    ON CONFLICT (id) DO UPDATE SET wallet_label=COALESCE($2,agent_wallets.wallet_label), daily_limit=COALESCE($3,agent_wallets.daily_limit),
      currency=COALESCE($4,agent_wallets.currency), enabled=COALESCE($5,agent_wallets.enabled), risk_level=COALESCE($6,agent_wallets.risk_level) RETURNING *`,
    [id, i.walletLabel??null, i.dailyLimit??null, i.currency??null, (i.enabled==null?null:i.enabled), (i.riskLevel as RiskLevel)??null]);
  return { ok:true, item:aRow(r.rows[0]) };
}
