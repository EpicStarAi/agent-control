import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { createSession, destroySession, isValidSession, TERMINAL_SESSION_COOKIE } from "../lib/terminal-sessions";

const router: IRouter = Router();

// Simple in-memory rate limit for login attempts: 5 failures per 5 minutes
// per IP. This is not distributed-safe, but the terminal runs single-process
// in this environment, so it's an effective brake against password guessing.
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const failedAttempts = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const attempts = (failedAttempts.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  failedAttempts.set(key, attempts);
  return attempts.length >= RATE_LIMIT_MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const attempts = failedAttempts.get(key) ?? [];
  attempts.push(Date.now());
  failedAttempts.set(key, attempts);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal length to avoid leaking length via timing.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

router.post("/terminal/login", (req: Request, res: Response) => {
  const rateLimitKey = req.ip ?? "unknown";
  if (isRateLimited(rateLimitKey)) {
    res.status(429).json({ error: "too_many_attempts", message: "Too many failed attempts. Try again later." });
    return;
  }

  const expected = process.env["EPICGRAM_TERMINAL_PASSWORD"];
  if (!expected) {
    res.status(503).json({ error: "terminal_not_configured", message: "EPICGRAM_TERMINAL_PASSWORD is not set." });
    return;
  }

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password || !timingSafeEqual(password, expected)) {
    recordFailure(rateLimitKey);
    res.status(401).json({ error: "invalid_password" });
    return;
  }

  const { token, expiresAt } = createSession();
  res.cookie(TERMINAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Always secure: this artifact is only ever served through Replit's
    // HTTPS-terminated proxy, even in dev — never plain HTTP.
    secure: true,
    expires: new Date(expiresAt),
    path: "/",
  });
  res.json({ ok: true });
});

router.get("/terminal/session", (req: Request, res: Response) => {
  const token = req.cookies?.[TERMINAL_SESSION_COOKIE];
  res.json({ authenticated: isValidSession(token) });
});

router.post("/terminal/logout", (req: Request, res: Response) => {
  const token = req.cookies?.[TERMINAL_SESSION_COOKIE];
  destroySession(token);
  res.clearCookie(TERMINAL_SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

export default router;
