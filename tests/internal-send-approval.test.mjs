import assert from "node:assert/strict";
import test from "node:test";
import { trustedSendApprovalFromHeaders } from "../services/api/src/internal-approval.mjs";

test("internal send approval: missing secret is rejected", () => {
  assert.equal(trustedSendApprovalFromHeaders(
    { "x-epicgram-internal-send-secret": "anything" },
    {},
  ), false);
});

test("internal send approval: short server secret is rejected", () => {
  assert.equal(trustedSendApprovalFromHeaders(
    { "x-epicgram-internal-send-secret": "short" },
    { EPICGRAM_INTERNAL_SEND_SECRET: "short" },
  ), false);
});

test("internal send approval: wrong secret is rejected", () => {
  assert.equal(trustedSendApprovalFromHeaders(
    { "x-epicgram-internal-send-secret": "wrong-secret-value" },
    { EPICGRAM_INTERNAL_SEND_SECRET: "correct-secret-value-123" },
  ), false);
});

test("internal send approval: exact long server secret is accepted", () => {
  assert.equal(trustedSendApprovalFromHeaders(
    { "x-epicgram-internal-send-secret": "correct-secret-value-123" },
    { EPICGRAM_INTERNAL_SEND_SECRET: "correct-secret-value-123" },
  ), true);
});
