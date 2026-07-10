import crypto from "node:crypto";

// In-memory session store for the operator/admin terminal. A session is a
// short-lived token proving the caller supplied the terminal password once.
// This is deliberately NOT tied to any Telegram/operator account — it is a
// separate technical/admin gate in front of a real shell.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

interface TerminalSession {
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, TerminalSession>();

export const TERMINAL_SESSION_COOKIE = "epicgram_terminal_session";

export function createSession(): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { createdAt: Date.now(), expiresAt });
  return { token, expiresAt };
}

export function isValidSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function destroySession(token: string | undefined | null): void {
  if (token) sessions.delete(token);
}

// Periodically sweep expired sessions so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(token);
  }
}, 10 * 60 * 1000).unref?.();
