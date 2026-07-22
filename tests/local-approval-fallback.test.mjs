import assert from "node:assert/strict";
import test from "node:test";

const mod = await import("../apps/web/lib/localApprovalFallback.js");

test("local approval fallback: development + explicit flag is allowed", () => {
  assert.equal(mod.isLocalApprovalFallbackAllowed({
    NODE_ENV: "development",
    LOCAL_APPROVAL_FALLBACK_ENABLED: "true",
  }), true);
});

test("local approval fallback: development without flag is denied", () => {
  assert.equal(mod.isLocalApprovalFallbackAllowed({
    NODE_ENV: "development",
  }), false);
});

test("local approval fallback: candidate + explicit flag is allowed", () => {
  assert.equal(mod.isLocalApprovalFallbackAllowed({
    NODE_ENV: "test",
    EPICGRAM_RUNTIME_MODE: "candidate",
    LOCAL_APPROVAL_FALLBACK_ENABLED: "true",
  }), true);
});

test("local approval fallback: production + flag is denied", () => {
  assert.equal(mod.isLocalApprovalFallbackAllowed({
    NODE_ENV: "production",
    EPICGRAM_RUNTIME_MODE: "candidate",
    LOCAL_APPROVAL_FALLBACK_ENABLED: "true",
  }), false);
  assert.equal(mod.isLocalApprovalFallbackAllowed({
    NODE_ENV: "development",
    EPICGRAM_RUNTIME_MODE: "production",
    LOCAL_APPROVAL_FALLBACK_ENABLED: "true",
  }), false);
});

test("local approval fallback: test env needs integration opt-in", () => {
  assert.equal(mod.isLocalApprovalFallbackAllowed({
    NODE_ENV: "test",
    LOCAL_APPROVAL_FALLBACK_ENABLED: "true",
  }), false);
  assert.equal(mod.isLocalApprovalFallbackAllowed({
    NODE_ENV: "test",
    LOCAL_APPROVAL_FALLBACK_ENABLED: "true",
    EPICGRAM_ALLOW_TEST_LOCAL_APPROVAL_FALLBACK: "true",
  }), true);
});
