// P34 — Workspace Memory. The AI Operator's persistent memory, scoped to the
// caller's workspace_id (resolved from the session cookie, never from the body).
// Three scopes: owner (AI Memory of the Identity), project, organization.
// Modules attach to Identity + Workspace, not to a "user". No secrets stored.

export type MemoryScope = "owner" | "project" | "organization";
export const SCOPES: MemoryScope[] = ["owner", "project", "organization"];

export interface MemoryEntry {
  id: string;
  workspaceId: string;
  scope: MemoryScope;
  key: string;    // short label, e.g. "интересы", "стек", "roadmap"
  value: string;  // the remembered fact
  updatedAt: string;
}

function clip(s: unknown, n: number): string { return String(s ?? "").slice(0, n); }
export function normalizeScope(s: unknown): MemoryScope {
  return (SCOPES as string[]).includes(String(s)) ? (String(s) as MemoryScope) : "owner";
}
export function newEntryId(): string {
  return `mem_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}
export function normalizeEntry(workspaceId: string, i: Partial<MemoryEntry>): MemoryEntry {
  return {
    id: i.id || newEntryId(),
    workspaceId,
    scope: normalizeScope(i.scope),
    key: clip(i.key, 80),
    value: clip(i.value, 600),
    updatedAt: new Date().toISOString(),
  };
}
