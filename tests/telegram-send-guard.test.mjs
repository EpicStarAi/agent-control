import test from "node:test";
import assert from "node:assert/strict";

// INCIDENT hotfix/client-auth-guard — backend mutation kill switch.
//
// These tests exercise the real sendMessage() from the backend runtime. They
// are safe to run against a machine holding a live TDLib session: the mutation
// switch is evaluated BEFORE any state read or TDLib client creation, so no
// session directory is opened and no network call to Telegram is made.

const ORIGINAL = process.env.TELEGRAM_MUTATION;

async function loadSendMessage() {
  const mod = await import("../services/api/src/telegram-runtime.mjs");
  return mod.sendMessage;
}

test("forged operatorApproved=true from the client is rejected server-side", async () => {
  delete process.env.TELEGRAM_MUTATION;
  const sendMessage = await loadSendMessage();

  // This is the exact payload the web client used to send, and the exact shape
  // an anonymous attacker would forge.
  const result = await sendMessage({
    accountId: "main",
    chatId: "123456789",
    text: "forged approval probe",
    operatorApproved: true
  });

  assert.equal(result.status, 403, "forged operatorApproved must not authorise a send");
  assert.equal(result.body.sent, false);
  assert.equal(result.body.mutationsEnabled, false);
});

test("mutations are disabled by default when TELEGRAM_MUTATION is unset", async () => {
  delete process.env.TELEGRAM_MUTATION;
  const sendMessage = await loadSendMessage();
  const result = await sendMessage({ chatId: "1", text: "x" });
  assert.equal(result.status, 403);
  assert.equal(result.body.mutationsEnabled, false);
});

test("TELEGRAM_MUTATION=false explicitly blocks sends", async () => {
  process.env.TELEGRAM_MUTATION = "false";
  const sendMessage = await loadSendMessage();
  const result = await sendMessage({ chatId: "1", text: "x", operatorApproved: true });
  assert.equal(result.status, 403);
});

test("the kill switch runs before argument validation (no body can reach the send path)", async () => {
  delete process.env.TELEGRAM_MUTATION;
  const sendMessage = await loadSendMessage();
  // Missing chatId/text would previously produce a 400 from the validation
  // block; a 403 proves the switch short-circuits before anything is parsed.
  const result = await sendMessage({ operatorApproved: true });
  assert.equal(result.status, 403, "switch must precede validation");
});

test("truthy-looking approval values do not bypass the switch", async () => {
  delete process.env.TELEGRAM_MUTATION;
  const sendMessage = await loadSendMessage();
  for (const forged of ["true", 1, {}, [], "TRUE"]) {
    const result = await sendMessage({ chatId: "1", text: "x", operatorApproved: forged });
    assert.equal(result.status, 403, `operatorApproved=${JSON.stringify(forged)} must be ignored`);
  }
});

test.after(() => {
  if (ORIGINAL === undefined) delete process.env.TELEGRAM_MUTATION;
  else process.env.TELEGRAM_MUTATION = ORIGINAL;
});
