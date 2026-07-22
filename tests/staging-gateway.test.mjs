import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

import { createGatewayServer } from "../services/staging-gateway/server.mjs";

const TOKEN = "test-token-that-is-at-least-thirty-two-characters";
const REAL_ACCOUNT = "private-real-slot";

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
  });
  const gatewayPort = await listen(gateway);
  t.after(async () => { await close(gateway); await close(upstream); });

  const accounts = await fetch(`http://127.0.0.1:${gatewayPort}/v1/accounts`, { headers: { authorization: `Bearer ${TOKEN}` } }).then((response) => response.json());
  assert.equal(accounts.accounts.length, 1);
  assert.equal(accounts.accounts[0].id, "owner");
  assert.equal(JSON.stringify(accounts).includes(REAL_ACCOUNT), false);

  const chats = await fetch(`http://127.0.0.1:${gatewayPort}/telegram/chats?accountId=other&limit=999`, { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(chats.status, 200);
  assert.ok(seen.includes(`/telegram/chats?accountId=${REAL_ACCOUNT}&limit=100`));
});

test("staging gateway rejects missing auth and all mutations", async (t) => {
  const upstream = http.createServer();
  const upstreamPort = await listen(upstream);
  const gateway = createGatewayServer({
    EPICGRAM_STAGING_GATEWAY_TOKEN: TOKEN,
    EPICGRAM_STAGING_ACCOUNT_ID: REAL_ACCOUNT,
    EPICGRAM_STAGING_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
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
  assert.equal((await mutation.json()).code, "READ_ONLY_GATEWAY");
});
