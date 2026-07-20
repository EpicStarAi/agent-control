-- Migration 004: production approval + chat allowlist storage.
-- ADDITIVE ONLY: no DROP / destructive data changes.

BEGIN;

CREATE TABLE IF NOT EXISTS epicgram_chat_allowlist (
  id uuid PRIMARY KEY,
  principal_id text NOT NULL,
  workspace_id text NOT NULL,
  telegram_account_id text NOT NULL,
  account_slot text NOT NULL,
  chat_id text NOT NULL,
  action_type text NOT NULL DEFAULT 'send_text',
  chat_title text,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by text NOT NULL,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS eg_chat_allowlist_active_idx
  ON epicgram_chat_allowlist(principal_id, workspace_id, telegram_account_id, account_slot, chat_id, action_type)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS eg_chat_allowlist_owner_idx
  ON epicgram_chat_allowlist(workspace_id, principal_id, telegram_account_id);

CREATE TABLE IF NOT EXISTS epicgram_action_approvals (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL,
  principal_id text NOT NULL,
  workspace_id text NOT NULL,
  telegram_account_id text NOT NULL,
  account_slot text NOT NULL,
  chat_id text NOT NULL,
  action_type text NOT NULL,
  payload_hash text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview text,
  requires_second_confirm boolean NOT NULL DEFAULT false,
  confirm_stage text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  used_at timestamptz,
  telegram_message_id text,
  audit_id text
);

CREATE INDEX IF NOT EXISTS eg_action_approvals_owner_idx
  ON epicgram_action_approvals(workspace_id, principal_id, telegram_account_id);

CREATE INDEX IF NOT EXISTS eg_action_approvals_status_idx
  ON epicgram_action_approvals(status, expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS eg_action_approvals_used_once_idx
  ON epicgram_action_approvals(id)
  WHERE status = 'USED';

COMMIT;
