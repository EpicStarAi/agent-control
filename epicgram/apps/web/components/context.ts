"use client";

// CONTEXT ENGINE — shared real-time system context for AI Operator. UI/localStorage only.
export const CK = "epic_context_engine_v1", CT = "epic_context_timeline_v1";
export type SysContext = {
  screen: string; workspace: string; project: string; agent: string; session: string;
  device: string; mission: string; mediaProject: string; viewMode: string; user: string; ts: string;
};
const DEF: SysContext = { screen: "EPIC OS HOME", workspace: "Control Shell", project: "DEEPINSIDE.LIFE", agent: "EVA", session: "AI MUSIC 🎧 PUBLIC", device: "PHONE-01", mission: "TikTok Growth", mediaProject: "EVA Shorts", viewMode: "operator", user: "Owner", ts: "" };

export function getCtx(): SysContext { try { return { ...DEF, ...(JSON.parse(localStorage.getItem(CK) || "{}")) }; } catch { return { ...DEF }; } }
export function setCtx(p: Partial<SysContext>, action?: string) {
  const next = { ...getCtx(), ...p, ts: new Date().toISOString() };
  try { localStorage.setItem(CK, JSON.stringify(next)); } catch {}
  if (action) pushTimeline(action);
  return next;
}
export function pushTimeline(action: string) {
  try { const tl = JSON.parse(localStorage.getItem(CT) || "[]"); const next = [{ t: new Date().toISOString().slice(11, 19), action }, ...(Array.isArray(tl) ? tl : [])].slice(0, 20); localStorage.setItem(CT, JSON.stringify(next)); } catch {}
}
export function getTimeline(): { t: string; action: string }[] { try { const tl = JSON.parse(localStorage.getItem(CT) || "[]"); return Array.isArray(tl) ? tl : []; } catch { return []; } }
