// P31 Multi-Tenant Core — workspace profile (Profile Wizard data).
// Scoped to a workspace_id resolved from the session cookie. This is the
// concrete demonstration of multi-tenant scoping: every profile read/write is
// filtered by the caller's own workspace. No secrets, no external calls.

export interface WorkspaceProfile {
  workspaceId: string;
  displayName: string;
  language: string;      // ru | en | ...
  country: string;
  goals: string[];       // e.g. ["контент","рост","монетизация"]
  aiNeeds: string[];     // ["Publisher","Growth","Analytics",...]
  socials: string[];     // ["Telegram","YouTube","TikTok",...]
  models: string[];      // ["openrouter","ollama","HF",...]
  budget: string;        // free text / range
  roles: string[];       // ["owner","operator",...]
  completed: boolean;
  updatedAt: string;
}

export function emptyProfile(workspaceId: string): WorkspaceProfile {
  return { workspaceId, displayName: "", language: "ru", country: "", goals: [], aiNeeds: [],
    socials: ["Telegram"], models: [], budget: "", roles: ["owner"], completed: false, updatedAt: new Date().toISOString() };
}
function arr(v: unknown): string[] { return Array.isArray(v) ? v.map(x => String(x).slice(0, 60)).slice(0, 20) : []; }

export function normalizeProfile(workspaceId: string, i: Partial<WorkspaceProfile>): WorkspaceProfile {
  return {
    workspaceId,
    displayName: String(i.displayName ?? "").slice(0, 80),
    language: String(i.language ?? "ru").slice(0, 8),
    country: String(i.country ?? "").slice(0, 60),
    goals: arr(i.goals), aiNeeds: arr(i.aiNeeds), socials: arr(i.socials), models: arr(i.models),
    budget: String(i.budget ?? "").slice(0, 60), roles: arr(i.roles).length ? arr(i.roles) : ["owner"],
    completed: Boolean(i.completed),
    updatedAt: new Date().toISOString(),
  };
}
