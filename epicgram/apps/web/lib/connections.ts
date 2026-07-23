// P36 — Universal Connect Layer. Every external service is an adapter behind one
// abstraction. The Router/Operator only ever sees a Provider (class + id), never
// "Telegram". Telegram is simply the first implemented adapter. Scoped to the
// caller's workspace_id (from the session cookie). No tokens/keys stored here —
// only an opaque session_ref pointing at secure storage handled elsewhere.

export type ProviderClass = "communication" | "media" | "service";
export type ConnStatus = "connected" | "available" | "error";

export interface Provider { id: string; name: string; klass: ProviderClass; adapter: string; }

// Static catalog of known adapters. Telegram is the only one demo-connectable now.
export const CATALOG: Provider[] = [
  // Communication Providers
  { id: "telegram", name: "Telegram", klass: "communication", adapter: "TDLib" },
  { id: "whatsapp", name: "WhatsApp", klass: "communication", adapter: "cloud-api" },
  { id: "discord", name: "Discord", klass: "communication", adapter: "bot" },
  { id: "email", name: "Email", klass: "communication", adapter: "imap-smtp" },
  { id: "slack", name: "Slack", klass: "communication", adapter: "app" },
  { id: "teams", name: "Teams", klass: "communication", adapter: "graph" },
  // Media Providers
  { id: "youtube", name: "YouTube", klass: "media", adapter: "data-api" },
  { id: "tiktok", name: "TikTok", klass: "media", adapter: "content-api" },
  { id: "instagram", name: "Instagram", klass: "media", adapter: "graph" },
  { id: "facebook", name: "Facebook", klass: "media", adapter: "graph" },
  { id: "x", name: "X", klass: "media", adapter: "v2" },
  { id: "threads", name: "Threads", klass: "media", adapter: "graph" },
  { id: "twitch", name: "Twitch", klass: "media", adapter: "helix" },
  { id: "linkedin", name: "LinkedIn", klass: "media", adapter: "rest" },
  { id: "pinterest", name: "Pinterest", klass: "media", adapter: "api" },
  { id: "reddit", name: "Reddit", klass: "media", adapter: "api" },
  // Service Providers
  { id: "github", name: "GitHub", klass: "service", adapter: "rest" },
  { id: "notion", name: "Notion", klass: "service", adapter: "api" },
  { id: "gdrive", name: "Google Drive", klass: "service", adapter: "api" },
  { id: "gcal", name: "Google Calendar", klass: "service", adapter: "api" },
  { id: "crm", name: "CRM", klass: "service", adapter: "generic" },
  { id: "ton", name: "TON Wallet", klass: "service", adapter: "ton-connect" },
  { id: "vpn", name: "VPN", klass: "service", adapter: "hidemyname" },
  { id: "rss", name: "RSS", klass: "service", adapter: "feed" },
  { id: "vk", name: "VK", klass: "service", adapter: "api" },
];

export interface Connection {
  id: string;
  workspaceId: string;
  provider: string;   // Provider.id
  status: ConnStatus;
  sessionRef: string; // opaque pointer to secure session storage — NOT a token
  updatedAt: string;
}

const KNOWN = new Set(CATALOG.map(p => p.id));
export function isKnownProvider(id: unknown): boolean { return KNOWN.has(String(id)); }
export function providerClass(id: string): ProviderClass { return CATALOG.find(p => p.id === id)?.klass ?? "service"; }
export function normalizeStatus(s: unknown): ConnStatus {
  return s === "connected" || s === "error" ? s : "available";
}
export function newConnId(): string { return `con_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`; }

export function normalizeConnection(workspaceId: string, i: Partial<Connection>): Connection {
  return {
    id: i.id || newConnId(),
    workspaceId,
    provider: String(i.provider ?? "").slice(0, 40),
    status: normalizeStatus(i.status ?? "connected"),
    sessionRef: String(i.sessionRef ?? "").slice(0, 120),
    updatedAt: new Date().toISOString(),
  };
}
