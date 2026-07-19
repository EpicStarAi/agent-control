-- Migration 003: operator agent loop (P-CLAW-AGENT-CORE stage 1). ADDITIVE ONLY.
-- No DROP, no destructive change. Mirrors the CREATE TABLE IF NOT EXISTS run by
-- agentRunsDb.ts ensureInit(), so applying this by hand or letting the adapter
-- self-init are equivalent.
BEGIN;

CREATE TABLE IF NOT EXISTS agent_runs (
  id               text        NOT NULL PRIMARY KEY,
  user_id          text        NOT NULL,
  workspace_id     text        NOT NULL,
  account_id       text,
  goal             text        NOT NULL,
  context          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  plan             jsonb       NOT NULL DEFAULT '[]'::jsonb,
  status           text        NOT NULL DEFAULT 'planning',
  max_steps        integer     NOT NULL DEFAULT 12,
  timeout_ms       integer     NOT NULL DEFAULT 90000,
  cancel_requested boolean     NOT NULL DEFAULT false,
  reason           text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  started_at       timestamptz,
  finished_at      timestamptz
);
CREATE INDEX IF NOT EXISTS agent_runs_ws_idx ON agent_runs (workspace_id);
CREATE INDEX IF NOT EXISTS agent_runs_user_idx ON agent_runs (user_id);

-- One row per executed step. Written BEFORE execution (status='running') and
-- updated AFTER with claimed/verified/status — verification is a first-class,
-- separately-stored fact, never inferred from "the call didn't throw".
CREATE TABLE IF NOT EXISTS agent_run_steps (
  id          text        NOT NULL PRIMARY KEY,
  run_id      text        NOT NULL,
  step_id     text        NOT NULL,
  idx         integer     NOT NULL,
  tool        text        NOT NULL,
  intent      text        NOT NULL DEFAULT '',
  risk        text        NOT NULL,
  args        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  attempt     integer     NOT NULL DEFAULT 1,
  started_at  timestamptz,
  finished_at timestamptz,
  claimed     text        NOT NULL DEFAULT '',
  verified    jsonb,
  status      text        NOT NULL,
  error       text
);
CREATE INDEX IF NOT EXISTS agent_run_steps_run_idx ON agent_run_steps (run_id);

COMMIT;
