import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import router from "./epicgram-proxy";

// The proxy's safety boundary: only GET/HEAD, plus a reviewed allowlist of
// mutating routes, may ever reach the real EPICGRAM backend. Everything else
// mutating must be blocked with 403 *before* any fetch to the backend happens.

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

describe("epicgram-proxy allowlist", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const notAllowlisted = [
    ["/api/telegram/production/enable", "POST"],
    ["/api/telegram/live-send/enable", "POST"],
    ["/api/operator/docker/restart", "POST"],
    ["/api/operator/ollama/restart", "PUT"],
    ["/api/ai/schedule/reject", "POST"], // not the same as ai/schedule/approve
    ["/api/telegram/accounts/new/extra", "POST"], // not an exact allowlist match
    ["/api/operator-events/subscribe", "DELETE"], // prefix is allowed for reads, not mutations
  ] as const;

  it.each(notAllowlisted)(
    "blocks %s %s with 403 and never calls the backend",
    async (path, method) => {
      const app = buildApp();
      const res = await request(app)[method.toLowerCase() as "post"](path).send({});

      expect(res.status).toBe(403);
      expect(res.body.runtime).toBe("mutating_action_blocked");
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  const allowlisted = [
    ["/api/telegram/send", "POST"],
    ["/api/telegram/forward", "POST"],
    ["/api/telegram/react", "POST"],
    ["/api/telegram/pin", "POST"],
    ["/api/telegram/edit", "POST"],
    ["/api/telegram/delete", "POST"],
    ["/api/telegram/create-chat", "POST"],
    ["/api/telegram/register-bot", "POST"],
    ["/api/telegram/auth/code", "POST"],
    ["/api/telegram/auth/qr", "POST"],
    ["/api/telegram/auth/phone", "POST"],
    ["/api/telegram/auth/2fa", "POST"],
    ["/api/telegram/auth/reset", "POST"],
    ["/api/telegram/accounts/new", "POST"],
    ["/api/telegram/accounts/select", "POST"],
    ["/api/telegram/accounts/remove", "POST"],
    ["/api/telegram/logout", "POST"],
    ["/api/ai/audit/reject", "POST"],
    ["/api/operator/reject", "POST"],
    ["/api/ai/schedule/approve", "POST"],
  ] as const;

  it.each(allowlisted)(
    "forwards allowed mutating route %s %s to the backend",
    async (path, method) => {
      const app = buildApp();
      const res = await request(app)[method.toLowerCase() as "post"](path).send({});

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
    },
  );

  it("always allows GET requests through without checking the allowlist", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/telegram/production/enable");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it("blocks a real Telegram send that is not on the allowlist path (defense in depth)", async () => {
    // Guards against a future refactor accidentally renaming the send route
    // and losing allowlist protection.
    const app = buildApp();
    const res = await request(app).post("/api/telegram/send/now").send({});

    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
