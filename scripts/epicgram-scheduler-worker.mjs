#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = "true";
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function readCookieJar(file) {
  const raw = fs.readFileSync(file, "utf8");
  const pairs = [];
  for (let line of raw.split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith("#HttpOnly_")) line = line.slice("#HttpOnly_".length);
    else if (line.startsWith("#")) continue;
    const cols = line.split(/\t/);
    if (cols.length < 7) continue;
    const name = cols[5];
    const value = cols[6];
    if (name && value) pairs.push(`${name}=${value}`);
  }
  return pairs.join("; ");
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = args.baseUrl || process.env.EPICGRAM_LIVE_BASE_URL || "http://127.0.0.1:3015";
const cookieJar = args.cookieJar || process.env.EPICGRAM_E2E_COOKIE_JAR || ".runtime/e2e/cookies.txt";
const intervalMs = Math.max(1000, Number(args.intervalMs || process.env.EPICGRAM_SCHEDULER_INTERVAL_MS || 5000));
const once = args.once === "true" || process.env.EPICGRAM_SCHEDULER_ONCE === "true";
const maxTicks = Number(args.maxTicks || process.env.EPICGRAM_SCHEDULER_MAX_TICKS || (once ? 1 : 0));
const workerId = args.workerId || process.env.EPICGRAM_SCHEDULER_WORKER_ID || `worker_${process.pid}_${Date.now().toString(36)}`;
const output = args.output || "";

const cookie = readCookieJar(path.resolve(cookieJar));
if (!cookie) {
  console.error(JSON.stringify({ ok: false, workerId, reason: "empty_cookie_jar" }));
  process.exit(2);
}

let ticks = 0;
let claimedTotal = 0;
const results = [];

async function tick() {
  const response = await fetch(`${baseUrl}/api/operator/schedule/tick`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cookie": cookie,
      "x-epicgram-worker-id": workerId,
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  const row = { at: new Date().toISOString(), status: response.status, body };
  ticks += 1;
  claimedTotal += Number(body?.claimed || 0);
  results.push(row);
  console.log(JSON.stringify(row));
  if (!response.ok && response.status >= 500) process.exitCode = 1;
  if (output) fs.writeFileSync(output, JSON.stringify({ workerId, ticks, claimedTotal, results }, null, 2));
}

while (true) {
  await tick();
  if (once || (maxTicks > 0 && ticks >= maxTicks)) break;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
