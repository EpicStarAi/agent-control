export type Section = "dashboard" | "chats" | "agents" | "accounts" | "logs" | "settings";

export type Account = {
  id: string;
  label: string;
  handle: string;
  type: "TDLib" | "Bot API" | "Mini App";
  status: "online" | "syncing" | "locked";
  consent: string;
  unread: number;
};

export type Chat = {
  id: string;
  name: string;
  kind: "private" | "group" | "channel" | "bot";
  accountId: string;
  lastMessage: string;
  time: string;
  unread: number;
  risk: "clear" | "approval" | "audit";
  messages: Array<{ id: string; from: "operator" | "contact" | "agent"; text: string; time: string; pending?: boolean }>;
};

export type Agent = {
  id: string;
  name: string;
  accountId: string;
  role: string;
  status: "ACTIVE" | "IDLE" | "REVIEW" | "PAUSED";
  skills: string[];
  memory: number;
  queue: number;
};

export type LogEvent = {
  id: string;
  time: string;
  level: "INFO" | "AUDIT" | "WARN" | "REVIEW";
  source: string;
  message: string;
};

export const accounts: Account[] = [];
export const chats: Chat[] = [];
export const agents: Agent[] = [];
export const logs: LogEvent[] = [];
export const memoryItems: string[] = [];
