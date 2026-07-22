import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("scheduler tick accepts a bounded worker id header", async () => {
  const source = await readFile(new URL("../apps/web/app/api/operator/schedule/tick/route.ts", import.meta.url), "utf8");
  assert.ok(source.includes("x-epicgram-worker-id"));
  assert.ok(source.includes("replace(/[^a-zA-Z0-9_.:-]/g"));
  assert.ok(source.includes("slice(0, 96)"));
});

test("scheduler worker calls the protected tick endpoint as a process loop", async () => {
  const source = await readFile(new URL("../scripts/epicgram-scheduler-worker.mjs", import.meta.url), "utf8");
  assert.ok(source.includes("/api/operator/schedule/tick"));
  assert.ok(source.includes("x-epicgram-worker-id"));
  assert.ok(source.includes("EPICGRAM_SCHEDULER_INTERVAL_MS"));
});
