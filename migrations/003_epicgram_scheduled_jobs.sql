-- Migration 003: persistent Telegram scheduler. ADDITIVE ONLY.
BEGIN;
CREATE TABLE IF NOT EXISTS epicgram_scheduled_jobs (
  id uuid PRIMARY KEY,
  principal_id text NOT NULL,
  workspace_id text NOT NULL,
  telegram_account_id text NOT NULL,
  account_slot text NOT NULL,
  chat_id text NOT NULL,
  action_type text NOT NULL,
  payload_json jsonb NOT NULL,
  payload_hash text NOT NULL,
  approval_id text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  telegram_message_id text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS esj_workspace_idx ON epicgram_scheduled_jobs(workspace_id, principal_id);
CREATE INDEX IF NOT EXISTS esj_due_idx ON epicgram_scheduled_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS esj_approval_idx ON epicgram_scheduled_jobs(approval_id);
COMMIT;
