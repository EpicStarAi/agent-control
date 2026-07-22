import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createGatewayServer } from "../services/staging-gateway/server.mjs";

const TOKEN = "test-token-that-is-at-least-thirty-two-characters";
const SEND_TOKEN = "test-send-token-that-is-at-least-thirty-two-characters";
const REAL_ACCOUNT = "private-real-slot";

function stateFile(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "epicgram-gateway-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, "accounts.json");
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server.address().port;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test("staging gateway exposes one alias and overwrites accountId", async (t) => {
  const seen = [];
  const upstream = http.createServer((request, response) => {
    seen.push(request.url);
    response.setHeader("content-type", "application/json");
    if (request.url === "/telegram/accounts") {
      response.end(JSON.stringify({ accounts: [{ id: REAL_ACCOUNT, online: true, authorizationState: "authorizationStateReady", account: { displayName: "Owner", username: "owner" } }, { id: "other", online: true }] }));
      return;
    }
    if (request.url.startsWith("/telegram/chats?")) {
      response.end(JSON.stringify({ chats: [{ id: "1", title: "Private" }] }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ ok: false }));
  });
  const upstreamPort = await listen(upstream);
  const gateway = createGatewayServer({
    EPICGRAM_STAGING_GATEWAY_TOKEN: TOKEN,
    EPICGRAM_STAGING_ACCOUNT_ID: REAL_ACCOUNT,
    EPICGRAM_STAGING_ACCOUNT_ALIAS: "owner",
    EPICGRAM_STAGING_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
    EPICGRAM_STAGING_STATE_FILE: stateFile(t),
  });
  const gatewayPort = await listen(gateway);
  t.after(async () => { await close(gateway); await close(upstream); });

  const accounts = await fetch(`http://127.0.0.1:${gatewayPort}/v1/accounts`, { headers: { authorization: `Bearer ${TOKEN}` } }).then((response) => response.json());
  assert.equal(accounts.accounts.length, 1);
  assert.equal(accounts.accounts[0].id, "owner");
  assert.equal(JSON.stringify(accounts).includes(REAL_ACCOUNT), false);

  const denied = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/chats?accountId=other&limit=999`, { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(denied.status, 404);
  const chats = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/chats?accountId=owner&limit=999`, { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(chats.status, 200);
  assert.ok(seen.includes(`/telegram/chats?accountId=${REAL_ACCOUNT}&limit=100`));
});

test("staging gateway rejects missing auth and send without a capability", async (t) => {
  const upstream = http.createServer();
  const upstreamPort = await listen(upstream);
  const gateway = createGatewayServer({
    EPICGRAM_STAGING_GATEWAY_TOKEN: TOKEN,
    EPICGRAM_STAGING_ACCOUNT_ID: REAL_ACCOUNT,
    EPICGRAM_STAGING_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
    EPICGRAM_STAGING_STATE_FILE: stateFile(t),
  });
  const gatewayPort = await listen(gateway);
  t.after(async () => { await close(gateway); await close(upstream); });

  const anonymous = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/chats`);
  assert.equal(anonymous.status, 401);

  const mutation = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ text: "blocked" }),
  });
  assert.equal(mutation.status, 403);
  assert.equal((await mutation.json()).code, "SEND_CAPABILITY_REQUIRED");
});

test("legacy upstream approval requires an explicit gateway compatibility flag", async (t) => {
  const upstream = http.createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.method === "GET" && request.url === "/telegram/accounts") {
      return response.end(JSON.stringify({ accounts: [{ id: REAL_ACCOUNT, online: true, authorizationState: "authorizationStateReady" }] }));
    }
    if (request.method === "POST" && request.url === "/telegram/send") {
      return response.end(JSON.stringify({ sent: true }));
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ ok: false }));
  });
  const upstreamPort = await listen(upstream);
  const common = {
    EPICGRAM_STAGING_GATEWAY_TOKEN: TOKEN,
    EPICGRAM_STAGING_SEND_TOKEN: SEND_TOKEN,
    EPICGRAM_STAGING_ACCOUNT_ID: REAL_ACCOUNT,
    EPICGRAM_STAGING_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
  };
  const blocked = createGatewayServer({ ...common, EPICGRAM_STAGING_STATE_FILE: stateFile(t) });
  const blockedPort = await listen(blocked);
  const enabledState = stateFile(t);
  const enabled = createGatewayServer({
    ...common,
    EPICGRAM_STAGING_ALLOW_LEGACY_APPROVAL: "true",
    EPICGRAM_STAGING_STATE_FILE: enabledState,
    EPICGRAM_STAGING_AUDIT_FILE: `${enabledState}.audit`,
  });
  const enabledPort = await listen(enabled);
  t.after(async () => { await close(blocked); await close(enabled); await close(upstream); });
  const options = {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "x-epicgram-staging-send-token": SEND_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ accountId: "owner", chatId: "1", text: "test" }),
  };
  assert.equal((await fetch(`http://127.0.0.1:${blockedPort}/telegram/send`, options)).status, 503);
  assert.equal((await fetch(`http://127.0.0.1:${enabledPort}/telegram/send`, options)).status, 200);
});

test("staging gateway maps account lifecycle, auth and protected send", async (t) => {
  const gatewayStateFile = stateFile(t);
  const gatewayAuditFile = `${gatewayStateFile}.audit.jsonl`;
  const accounts = [{ id: REAL_ACCOUNT, online: true, authorizationState: "authorizationStateReady", account: { displayName: "Owner" } }];
  const seen = [];
  const upstream = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
    seen.push({ url: request.url, method: request.method, body, sendSecret: request.headers["x-epicgram-internal-send-secret"] || null });
    response.setHeader("content-type", "application/json");
    if (request.method === "GET" && request.url === "/telegram/accounts") return response.end(JSON.stringify({ accounts }));
    if (request.method === "POST" && request.url === "/telegram/accounts/new") {
      accounts.push({ id: "new-private-slot", online: false, authorizationState: "authorizationStateWaitPhoneNumber" });
      return response.end(JSON.stringify({ ok: true, id: "new-private-slot" }));
    }
    if (request.method === "POST" && request.url === "/telegram/auth/phone") return response.end(JSON.stringify({ ok: true, authorizationState: "authorizationStateWaitCode" }));
    if (request.method === "POST" && request.url === "/telegram/send") return response.end(JSON.stringify({ sent: true }));
    if (request.method === "POST" && request.url === "/telegram/accounts/remove") {
      const index = accounts.findIndex((item) => item.id === body.id);
      if (index >= 0) accounts.splice(index, 1);
      return response.end(JSON.stringify({ ok: true }));
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ ok: false }));
  });
  const upstreamPort = await listen(upstream);
  const gateway = createGatewayServer({
    EPICGRAM_STAGING_GATEWAY_TOKEN: TOKEN,
    EPICGRAM_STAGING_SEND_TOKEN: SEND_TOKEN,
    EPICGRAM_STAGING_INTERNAL_SEND_SECRET: "internal-send-secret-that-is-at-least-thirty-two-characters",
    EPICGRAM_STAGING_ACCOUNT_ID: REAL_ACCOUNT,
    EPICGRAM_STAGING_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
    EPICGRAM_STAGING_STATE_FILE: gatewayStateFile,
    EPICGRAM_STAGING_AUDIT_FILE: gatewayAuditFile,
  });
  const gatewayPort = await listen(gateway);
  t.after(async () => { await close(gateway); await close(upstream); });
  const headers = { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" };

  const createdResponse = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/accounts/new`, { method: "POST", headers, body: "{}" });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.match(created.createdAccountId, /^account-/);
  assert.equal(JSON.stringify(created).includes("new-private-slot"), false);

  const phone = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/auth/phone`, {
    method: "POST", headers, body: JSON.stringify({ accountId: created.createdAccountId, phoneNumber: "+10000000000" }),
  });
  assert.equal(phone.status, 200);
  const authCall = seen.find((item) => item.url === "/telegram/auth/phone");
  assert.equal(authCall.body.accountId, "new-private-slot");

  const blockedSend = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/send`, { method: "POST", headers, body: JSON.stringify({ accountId: "owner", chatId: "1", text: "test" }) });
  assert.equal(blockedSend.status, 403);
  assert.equal((await blockedSend.json()).code, "SEND_CAPABILITY_REQUIRED");

  const sent = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/send`, {
    method: "POST",
    headers: { ...headers, "x-epicgram-staging-send-token": SEND_TOKEN },
    body: JSON.stringify({ accountId: "owner", chatId: "1", text: "test" }),
  });
  assert.equal(sent.status, 200);
  assert.equal((await sent.json()).sent, true);
  const sendCall = seen.find((item) => item.url === "/telegram/send");
  assert.equal(sendCall.body.accountId, REAL_ACCOUNT);
  assert.equal(sendCall.body.operatorApproved, true);
  assert.ok(sendCall.sendSecret);
  const audit = fs.readFileSync(gatewayAuditFile, "utf8");
  assert.match(audit, /"event":"telegram_send"/);
  assert.equal(audit.includes('"text":"test"'), false);
  assert.match(audit, /"payloadHash":"[a-f0-9]{64}"/);

  const missingConfirm = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/accounts/remove`, { method: "POST", headers, body: JSON.stringify({ accountId: created.createdAccountId }) });
  assert.equal(missingConfirm.status, 409);
  const removed = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/accounts/remove`, { method: "POST", headers, body: JSON.stringify({ accountId: created.createdAccountId, confirmAlias: created.createdAccountId }) });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).accounts.length, 1);
});
