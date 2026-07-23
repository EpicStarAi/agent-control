/**
 * Integration test: dev-tools guard
 *
 * Verifies that /dev/session-drop and /dev/session-recover return 404
 * when DEV_TOOLS_ENABLED is absent (or any value other than "true"),
 * and 200 when DEV_TOOLS_ENABLED=true is explicitly set.
 *
 * Run:  node --test epicgram/services/api/src/dev-tools-guard.test.mjs
 * (from the repo root, or adjust the path to server.mjs accordingly)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SERVER = fileURLToPath(new URL("./server.mjs", import.meta.url));
const BASE_DELAY_MS = 150; // poll interval while waiting for server
const MAX_WAIT_MS = 8_000; // max time to wait for server to be ready

/** Pick an ephemeral port by binding briefly to 0 and releasing it. */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

/** Spawn server.mjs on `port` with the supplied extra env vars. */
function spawnServer(port, extraEnv = {}) {
  const child = spawn(
    process.execPath,
    [SERVER],
    {
      env: {
        ...process.env,
        EPICGRAM_API_HOST: "127.0.0.1",
        EPICGRAM_API_PORT: String(port),
        // Suppress TDLib so the server starts without credentials
        EPICGRAM_TDLIB_ENABLED: "false",
        ...extraEnv
      },
      stdio: "pipe"
    }
  );
  // surface unexpected crashes in test output
  child.stderr.on("data", (d) => process.stderr.write(`[server:${port}] ${d}`));
  return child;
}

/** Poll /health until the server responds or we time out. */
async function waitReady(port) {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const req = http.get(
        { hostname: "127.0.0.1", port, path: "/health", timeout: 1000 },
        (res) => { res.resume(); resolve(res.statusCode === 200); }
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, BASE_DELAY_MS));
  }
  throw new Error(`Server on port ${port} did not become ready within ${MAX_WAIT_MS}ms`);
}

/** POST to a path on localhost:port and return { status, body }. */
function post(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { method: "POST", hostname: "127.0.0.1", port, path: pathname,
        headers: { "content-type": "application/json", "content-length": "2" } },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          let body = {};
          try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
          resolve({ status: res.statusCode, body });
        });
      }
    );
    req.on("error", reject);
    req.end("{}");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 0 (static): every /dev/ route in server.mjs sits below the guard check
// ─────────────────────────────────────────────────────────────────────────────
test("all /dev/ routes are registered after the DEV_TOOLS_ENABLED guard", () => {
  const serverPath = fileURLToPath(new URL("./server.mjs", import.meta.url));
  const lines = readFileSync(serverPath, "utf8").split("\n");

  // Find the guard line — the if-check that gates all /dev/ routes.
  const guardLineIndex = lines.findIndex(
    (l) => l.includes('process.env.DEV_TOOLS_ENABLED') && l.includes('"true"')
  );
  assert.notEqual(
    guardLineIndex, -1,
    "Could not locate the DEV_TOOLS_ENABLED guard line in server.mjs"
  );

  // Find every line that registers a /dev/ path  (e.g. pathname === "/dev/foo"
  // or pathname.startsWith("/dev/")).  We look for the literal string /dev/
  // inside a url.pathname comparison or startsWith call.
  const devRoutePattern = /url\.pathname[\s\S]*?["'`]\/dev\//;
  const misplaced = [];
  lines.forEach((line, idx) => {
    if (devRoutePattern.test(line) && idx < guardLineIndex) {
      misplaced.push({ lineNumber: idx + 1, content: line.trim() });
    }
  });

  assert.deepEqual(
    misplaced, [],
    `Found /dev/ route(s) registered BEFORE the DEV_TOOLS_ENABLED guard ` +
    `(guard is on line ${guardLineIndex + 1}):\n` +
    misplaced.map((m) => `  line ${m.lineNumber}: ${m.content}`).join("\n")
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: endpoints return 404 when DEV_TOOLS_ENABLED is absent
// ─────────────────────────────────────────────────────────────────────────────
test("dev endpoints return 404 when DEV_TOOLS_ENABLED is unset", async () => {
  const port = await getFreePort();
  const child = spawnServer(port, {
    // explicitly remove the var — delete it from inherited env
    DEV_TOOLS_ENABLED: ""
  });

  try {
    await waitReady(port);

    for (const path of ["/dev/session-drop", "/dev/session-recover"]) {
      const { status } = await post(port, path);
      assert.equal(
        status, 404,
        `Expected 404 for ${path} when DEV_TOOLS_ENABLED is unset, got ${status}`
      );
    }
  } finally {
    child.kill("SIGTERM");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: endpoints return 200 when DEV_TOOLS_ENABLED=true
// ─────────────────────────────────────────────────────────────────────────────
test("dev endpoints return 200 when DEV_TOOLS_ENABLED=true", async () => {
  const port = await getFreePort();
  const child = spawnServer(port, { DEV_TOOLS_ENABLED: "true" });

  try {
    await waitReady(port);

    for (const pathname of ["/dev/session-drop", "/dev/session-recover"]) {
      const { status, body } = await post(port, pathname);
      assert.equal(
        status, 200,
        `Expected 200 for ${pathname} when DEV_TOOLS_ENABLED=true, got ${status}`
      );
      assert.equal(body?.ok, true, `Expected body.ok=true for ${pathname}`);
      assert.equal(body?.synthetic, true, `Expected body.synthetic=true for ${pathname}`);
    }
  } finally {
    child.kill("SIGTERM");
  }
});
