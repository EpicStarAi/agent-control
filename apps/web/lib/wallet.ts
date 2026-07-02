// P28 Wallet Economy Layer — model. SAFE by design:
// - NO seed phrases / private keys stored (only public address + provider).
// - NO real payment execution. Payments are request → approval → status → audit only.
// - MANUAL_APPROVAL_ONLY: approving a payment request does NOT move money;
//   executionResult stays null (simulation only). Agent wallets carry daily limits.

export type PaymentStatus =
  | "waiting_approval" | "approved" | "rejected" | "cancelled" | "executed" | "failed";
export const PAYMENT_STATUSES: PaymentStatus[] = [
  "waiting_approval", "approved", "rejected", "cancelled", "executed", "failed"
];
export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";

export interface WalletBinding {
  id: string;
  telegramAccountId: string;
  walletAddress: string;      // PUBLIC address only
  walletProvider: string;     // e.g. "TON Connect · Tonkeeper"
  connectionStatus: "connected" | "disconnected" | "pending";
  connectedAt: string;
  lastSyncedAt: string;
}

export interface PaymentRequest {
  id: string;
  type: string;               // e.g. "payment.transfer" | "payment.subscription"
  title: string;
  description: string;
  amount: number;
  currency: string;           // TON | USDT | XTR
  target: string;             // recipient label / address (public)
  sourceAgent: string;
  targetModule: string;
  status: PaymentStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  executionResult: Record<string, unknown> | null; // stays null — no execution in P28
}

export interface AgentWallet {
  id: string;                 // agentId
  walletLabel: string;
  dailyLimit: number;
  currency: string;
  enabled: boolean;
  spendingToday: number;
  riskLevel: RiskLevel;
}

export function canApprove(s: PaymentStatus){ return s === "waiting_approval"; }
export function canReject(s: PaymentStatus){ return s === "waiting_approval"; }
export function canCancel(s: PaymentStatus){ return s === "waiting_approval" || s === "approved"; }
export function newId(p: string){ return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`; }

export const BINDING_SEED: WalletBinding[] = [
  { id: "wb-main", telegramAccountId: "@buch_main", walletAddress: "EQC…mainDEMO", walletProvider: "TON Connect · Tonkeeper",
    connectionStatus: "connected", connectedAt: "2026-06-28T10:00:00.000Z", lastSyncedAt: "2026-07-02T06:00:00.000Z" },
];

export const PAYMENT_SEED: PaymentRequest[] = [
  { id: "pr-ads", type: "payment.ads", title: "Оплата Telegram Ads кампании", description: "AI Growth предлагает пополнить рекламный бюджет.",
    amount: 25, currency: "TON", target: "Telegram Ads", sourceAgent: "AI-Growth", targetModule: "AI Growth",
    status: "waiting_approval", payload: { note: "предложение, без списания" }, createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-01T09:00:00.000Z", approvedBy: null, executionResult: null },
  { id: "pr-sub", type: "payment.subscription", title: "Продление Premium x3", description: "Продление Telegram Premium на 3 аккаунта.",
    amount: 12, currency: "USDT", target: "Fragment", sourceAgent: "Account-Manager", targetModule: "Account Center",
    status: "waiting_approval", payload: { accounts: 3 }, createdAt: "2026-07-01T11:00:00.000Z",
    updatedAt: "2026-07-01T11:00:00.000Z", approvedBy: null, executionResult: null },
];

export const AGENT_WALLET_SEED: AgentWallet[] = [
  { id: "AI-Growth", walletLabel: "Growth agent wallet", dailyLimit: 5, currency: "USDT", enabled: true, spendingToday: 1.2, riskLevel: "medium" },
  { id: "AI-Publisher", walletLabel: "Publisher agent wallet", dailyLimit: 2, currency: "USDT", enabled: true, spendingToday: 0, riskLevel: "low" },
  { id: "AI-Operator", walletLabel: "Operator agent wallet", dailyLimit: 0, currency: "USDT", enabled: false, spendingToday: 0, riskLevel: "none" },
];
