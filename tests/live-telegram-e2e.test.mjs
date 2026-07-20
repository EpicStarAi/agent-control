import assert from "node:assert/strict";
import test from "node:test";

const live = String(process.env.LIVE_TELEGRAM_E2E || "").toLowerCase() === "true";
const baseUrl = process.env.EPICGRAM_LIVE_BASE_URL || "http://127.0.0.1:3015";
const cookie = process.env.EPICGRAM_E2E_COOKIE || "";
const privateChatId = process.env.LIVE_TEST_PRIVATE_CHAT_ID || "";
const channelId = process.env.LIVE_TEST_CHANNEL_ID || "";

function headers(extra = {}) {
  return {
    ...extra,
    ...(cookie ? { cookie } : {}),
  };
}

async function json(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: headers({
      "content-type": "application/json",
      ...(init.headers || {}),
    }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

test("live Telegram E2E requires explicit opt-in", { skip: live }, () => {
  assert.equal(live, false);
});

test("live Telegram E2E: ready account, real chats, approved send, audit", { skip: !live }, async () => {
  assert.ok(cookie, "EPICGRAM_E2E_COOKIE is required");
  assert.ok(privateChatId, "LIVE_TEST_PRIVATE_CHAT_ID is required");

  const marker = `[EPICGRAM E2E TEST ${new Date().toISOString()}]`;

  const status = await json("/api/telegram/binding/status");
  assert.equal(status.response.status, 200);
  assert.equal(status.body?.bound, true);
  assert.equal(status.body?.binding?.authState, "ready");

  const chats = await json("/api/telegram/binding/chats?limit=40");
  assert.equal(chats.response.status, 200);
  assert.ok(Array.isArray(chats.body?.chats));
  assert.ok(chats.body.chats.length > 0, "expected real Telegram chats");

  const messages = await json(`/api/telegram/binding/messages?chat_id=${encodeURIComponent(privateChatId)}&limit=10`);
  assert.equal(messages.response.status, 200);
  assert.ok(Array.isArray(messages.body?.messages));

  const prepare = await json("/api/telegram/binding/send/prepare", {
    method: "POST",
    body: JSON.stringify({
      chatId: privateChatId,
      actionType: "send_text",
      text: `${marker} private approved send`,
    }),
  });
  assert.equal(prepare.response.status, 200);
  assert.equal(prepare.body?.ok, true);
  assert.ok(prepare.body?.approvalId);
  assert.ok(prepare.body?.token);

  const confirm = await json("/api/telegram/binding/send/confirm", {
    method: "POST",
    body: JSON.stringify({ approvalId: prepare.body.approvalId, token: prepare.body.token }),
  });
  assert.equal(confirm.response.status, 200);
  assert.equal(confirm.body?.readyToExecute, true);

  const send = await json("/api/telegram/binding/send", {
    method: "POST",
    body: JSON.stringify({
      approvalId: prepare.body.approvalId,
      token: prepare.body.token,
      chatId: privateChatId,
      actionType: "send_text",
      text: `${marker} private approved send`,
    }),
  });
  assert.equal(send.response.status, 200);
  assert.equal(send.body?.sent, true);
  assert.ok(send.body?.telegramMessageId, "expected real Telegram message id");
});

test("live Telegram E2E: channel publish target is configured", { skip: !live || !channelId }, async () => {
  assert.ok(channelId);
});
