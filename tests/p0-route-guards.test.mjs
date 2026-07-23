import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// P0 — no protected route may ship without a server-side session gate.
//
// Middleware alone does not close these: it runs at the edge, only checks that
// a cookie is PRESENT, and does not cover every runtime path. `curl` against a
// handler that forgot its guard is fully open regardless of what the matcher
// says. So the handler is the authoritative gate, and this test asserts every
// handler in the protected families actually has one.
//
// This is a source-level check on purpose: it fails when someone ADDS a new
// route without a guard, which is how the /api/ai/* and /api/operators/status
// holes appeared in the first place.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(HERE, "..", "apps", "web", "app", "api");

// Families that must never answer an unauthenticated caller.
const PROTECTED_FAMILIES = ["telegram", "ai", "operators", "operator-events", "operator"];

const GUARDS = ["requirePrincipal", "requireLegacyOwnerSurface", "getPrincipal"];
const HANDLER = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;

function routeFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...routeFiles(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

const files = PROTECTED_FAMILIES.flatMap((family) => {
  const dir = path.join(API_DIR, family);
  assert.ok(fs.existsSync(dir), `protected family /api/${family} not found — did it move?`);
  return routeFiles(dir);
});

test("route guards: the protected surface is non-empty and discovered", () => {
  assert.ok(files.length >= 40, `expected the protected families to hold 40+ routes, found ${files.length}`);
});

test("route guards: every protected route handler calls a session gate", () => {
  const unguarded = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const handlers = [...src.matchAll(HANDLER)].map((m) => m[1]);
    if (handlers.length === 0) continue;
    if (!GUARDS.some((g) => src.includes(`${g}(`))) {
      unguarded.push(`${path.relative(API_DIR, file)} [${handlers.join(",")}]`);
    }
  }
  assert.deepEqual(unguarded, [], `unguarded protected routes:\n${unguarded.join("\n")}`);
});

test("route guards: /api/ai/* is gated (regression — was anonymous)", () => {
  for (const name of ["status", "suggest", "memory"]) {
    const src = fs.readFileSync(path.join(API_DIR, "ai", name, "route.ts"), "utf8");
    assert.match(src, /requirePrincipal\("\/api\/ai\//, `/api/ai/${name} must call requirePrincipal`);
  }
});

test("route guards: /api/operators/status is gated and leaks no PII", () => {
  const src = fs.readFileSync(path.join(API_DIR, "operators", "status", "route.ts"), "utf8");
  assert.match(src, /requirePrincipal\("\/api\/operators\/status"/);
  // The seed carries email + displayName; neither may be echoed to a caller.
  assert.ok(!/client\.email/.test(src), "operator email must not be returned");
  assert.ok(!/client\.displayName/.test(src), "operator displayName must not be returned");
  assert.ok(!/primaryClient,/.test(src), "the raw seed object must not be spread into the response");
});

test("route guards: the binding migration DDL route requires an owner principal", () => {
  const src = fs.readFileSync(path.join(API_DIR, "telegram", "binding", "migrate", "route.ts"), "utf8");
  assert.match(src, /requirePrincipal\("\/api\/telegram\/binding\/migrate"/);
  assert.match(src, /role !== "owner"/, "the migration route must be owner-only");
  // The operator password stays as a second factor, not the only one.
  assert.match(src, /EPICGRAM_OPERATOR_PASSWORD_SCRYPT/);
});

test("route guards: middleware covers every protected family at the edge too", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "apps", "web", "middleware.ts"), "utf8");
  for (const matcher of [
    "/api/telegram/:path*",
    "/api/operator/:path*",
    "/api/operator-events/:path*",
    "/api/ai/:path*",
    "/api/operators/:path*",
  ]) {
    assert.ok(src.includes(matcher), `middleware matcher is missing ${matcher}`);
  }
});
