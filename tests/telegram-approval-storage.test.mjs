import assert from "node:assert/strict";
import test from "node:test";

const ORIGINAL = {
  NODE_ENV: process.env.NODE_ENV,
  EPICGRAM_RUNTIME_MODE: process.env.EPICGRAM_RUNTIME_MODE,
  LOCAL_APPROVAL_FALLBACK_ENABLED: process.env.LOCAL_APPROVAL_FALLBACK_ENABLED,
  EPICGRAM_ALLOW_TEST_LOCAL_APPROVAL_FALLBACK: process.env.EPICGRAM_ALLOW_TEST_LOCAL_APPROVAL_FALLBACK,
  DATABASE_URL: process.env.DATABASE_URL,
};

const ap = await import("../apps/web/lib/telegramSendApprovals.ts");

function setEnv(values) {
  for (const key of Object.keys(ORIGINAL)) delete process.env[key];
  Object.assign(process.env, values);
}

test("approval storage: production without DB fails closed", async () => {
  setEnv({ NODE_ENV: "production", LOCAL_APPROVAL_FALLBACK_ENABLED: "true" });
  await assert.rejects(
    () => ap.isAllowed({ userId: "u", accountId: "a", chatId: "c", actionType: "send_text" }),
    /approval_db_required/,
  );
});

test("approval storage: development without explicit fallback fails closed", async () => {
  setEnv({ NODE_ENV: "development" });
  await assert.rejects(
    () => ap.createApproval({
      workspaceId: "ws",
      userId: "u",
      accountId: "a",
      chatId: "c",
      actionType: "send_text",
      payloadHash: "hash",
      preview: "preview",
      requiresSecondConfirm: false,
    }),
    /approval_storage_unavailable/,
  );
});

test("approval storage: test fallback needs explicit integration opt-in", async () => {
  setEnv({
    NODE_ENV: "test",
    LOCAL_APPROVAL_FALLBACK_ENABLED: "true",
    EPICGRAM_ALLOW_TEST_LOCAL_APPROVAL_FALLBACK: "true",
  });
  await ap.addAllowlist({
    workspaceId: "ws-test",
    userId: "u-test",
    accountId: "a-test",
    chatId: "c-test",
    actionType: "send_text",
    label: "test",
  });
  assert.equal(await ap.isAllowed({
    userId: "u-test",
    accountId: "a-test",
    chatId: "c-test",
    actionType: "send_text",
  }), true);
});

test.after(() => {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
