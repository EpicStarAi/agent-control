import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// P0 — owner isolation invariants for the canonical Telegram surface.
//
// resolveBoundAccount() is the single place that decides which TDLib account a
// caller may reach. In some branches it degenerated into a stub; in others the
// browser-supplied accountId crept back in. These assertions pin the four
// properties that make the surface owner-scoped, and pin the choice of ONE
// canonical route family.
//
// The guard module imports next/headers, so it cannot be instantiated under
// node:test without a Next request scope — these are source-level invariants.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, "..", "apps", "web");
const guardSrc = fs.readFileSync(path.join(WEB, "lib", "telegramGuard.ts"), "utf8");

function resolveBoundAccountBody() {
  const start = guardSrc.indexOf("export async function resolveBoundAccount");
  assert.ok(start > -1, "resolveBoundAccount must exist in lib/telegramGuard.ts");
  const end = guardSrc.indexOf("\nexport ", start + 1);
  return guardSrc.slice(start, end === -1 ? undefined : end);
}

test("owner isolation: resolveBoundAccount is a real implementation, not a stub", () => {
  const body = resolveBoundAccountBody();
  // A stub returns a constant. The real one must consult the bindings table.
  assert.match(body, /bindingsDb\.getByWorkspace\(/, "must look the binding up by workspace");
  assert.ok(body.split("\n").length > 15, "suspiciously short — has this been stubbed out?");
});

test("owner isolation: the account is keyed by the principal's workspace", () => {
  const body = resolveBoundAccountBody();
  assert.match(body, /principal\.workspaceId/);
  assert.match(body, /binding\.workspaceId !== principal\.workspaceId/, "cross-tenant rows must be a hard mismatch");
});

test("owner isolation: only a ready binding resolves, forbidden ids never do", () => {
  const body = resolveBoundAccountBody();
  assert.match(body, /authState !== "ready"/, "half-authorised bindings must not resolve");
  assert.match(body, /isForbiddenAccountId\(/, "the shared legacy slot must never resolve");
});

test("owner isolation: a database error denies instead of falling through", () => {
  const body = resolveBoundAccountBody();
  // Deliberately the opposite of the referral path: here a DB failure must be a
  // safe empty state, never an open one.
  assert.match(body, /catch\s*\{[\s\S]*?return \{ kind: "none" \}/, "DB failure must deny by default");
});

test("owner isolation: no route reads accountId from the browser for the bound account", () => {
  // The canonical family must never take an account id off the request. Any
  // reintroduction of `body.accountId` / `searchParams.get("accountId")` inside
  // binding/* is the exact bug this surface was built to prevent.
  const bindingDir = path.join(WEB, "app", "api", "telegram", "binding");
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        const src = fs.readFileSync(full, "utf8");
        if (/body\??\.\s*accountId|searchParams\.get\(\s*["']accountId["']\s*\)/.test(src)) {
          offenders.push(path.relative(bindingDir, full));
        }
      }
    }
  };
  walk(bindingDir);
  assert.deepEqual(offenders, [], `binding routes must not read accountId from the request: ${offenders.join(", ")}`);
});

test("owner isolation: safeEmptyState is authenticated-but-empty, never connected", () => {
  const start = guardSrc.indexOf("export function safeEmptyState");
  assert.ok(start > -1);
  const body = guardSrc.slice(start, guardSrc.indexOf("\n}", start));
  assert.match(body, /authenticated: true/);
  assert.match(body, /connected: false/);
  assert.match(body, /ownerMatched: false/);
  assert.match(body, /mutationsEnabled: false/);
  assert.match(body, /accounts: \[\]/);
  assert.match(body, /chats: \[\]/);
});

test("consolidation: legacy families share one gate and the UI drives binding/* only", () => {
  assert.match(
    guardSrc,
    /export async function requireLegacyOwnerSurface/,
    "the legacy owner+mutation gate must live in one place"
  );

  for (const family of ["auth", "active-auth"]) {
    const dir = path.join(WEB, "app", "api", "telegram", family);
    for (const entry of fs.readdirSync(dir)) {
      const file = path.join(dir, entry, "route.ts");
      if (!fs.existsSync(file)) continue;
      const src = fs.readFileSync(file, "utf8");
      // qr-image is a read-only image proxy and uses getPrincipal directly.
      if (entry === "qr-image") continue;
      assert.match(
        src,
        /requireLegacyOwnerSurface\(/,
        `${family}/${entry} must go through the shared legacy gate`
      );
    }
  }

  // The code-entry screen previously straddled both families. Match on actual
  // request targets — a quoted path passed to fetch() — so that documenting the
  // old behaviour in a comment does not trip this.
  const entry = fs.readFileSync(path.join(WEB, "components", "TelegramCodeEntry.tsx"), "utf8");
  const requested = [...entry.matchAll(/fetch\(\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(requested.length > 0, "expected TelegramCodeEntry to make requests");
  const stray = requested.filter((url) => !url.startsWith("/api/telegram/binding/"));
  assert.deepEqual(
    stray,
    [],
    `TelegramCodeEntry must call the canonical binding/* family only; found: ${stray.join(", ")}`
  );
  assert.ok(requested.includes("/api/telegram/binding/status"));
});
