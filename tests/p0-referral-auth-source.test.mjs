import assert from "node:assert/strict";
import test from "node:test";

// P0 — referral/session auth must read Postgres in production.
//
// The regression these guard against: lib/authData.ts used to swallow every
// Postgres error and silently continue against .auth-data.json on local disk.
// A database outage therefore became an authentication substitution rather than
// a visible failure.

const { isFsAuthFallbackAllowed } = await import("../apps/web/lib/authFallbackPolicy.js");

test("referral auth: production never falls back to the filesystem store", () => {
  assert.equal(isFsAuthFallbackAllowed({ NODE_ENV: "production" }), false);
  // Even if someone sets the opt-in flag on a production host.
  assert.equal(
    isFsAuthFallbackAllowed({ NODE_ENV: "production", EPICGRAM_ALLOW_FS_AUTH_FALLBACK: "true" }),
    false,
    "the flag must not be able to re-open the hole in production"
  );
  // EPICGRAM_RUNTIME_MODE=production closes it too, whatever NODE_ENV says.
  assert.equal(
    isFsAuthFallbackAllowed({
      NODE_ENV: "development",
      EPICGRAM_RUNTIME_MODE: "production",
      EPICGRAM_ALLOW_FS_AUTH_FALLBACK: "true",
    }),
    false
  );
});

test("referral auth: local dev needs an explicit opt-in, not a silent default", () => {
  assert.equal(isFsAuthFallbackAllowed({ NODE_ENV: "development" }), false);
  assert.equal(isFsAuthFallbackAllowed({ NODE_ENV: "test" }), false);
  assert.equal(isFsAuthFallbackAllowed({}), false);
});

test("referral auth: explicit local-dev opt-in is honoured", () => {
  assert.equal(
    isFsAuthFallbackAllowed({ NODE_ENV: "development", EPICGRAM_ALLOW_FS_AUTH_FALLBACK: "true" }),
    true
  );
});

test("referral auth: only the exact string 'true' opts in", () => {
  for (const value of ["1", "yes", "TRUE ", "", "false", "no"]) {
    const expected = value.trim().toLowerCase() === "true";
    assert.equal(
      isFsAuthFallbackAllowed({ NODE_ENV: "development", EPICGRAM_ALLOW_FS_AUTH_FALLBACK: value }),
      expected,
      `value ${JSON.stringify(value)} must not silently enable the fallback`
    );
  }
});

test("referral auth: the production release env does not set the opt-in flag", () => {
  // Documents the deployment contract: EPICGRAM_ALLOW_FS_AUTH_FALLBACK is a
  // local-dev switch and must never appear in a production env file.
  assert.equal(process.env.EPICGRAM_ALLOW_FS_AUTH_FALLBACK ?? "", "");
});
