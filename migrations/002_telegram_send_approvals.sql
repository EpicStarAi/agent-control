-- Migration 002: per-account send approval gate (Etap 2). ADDITIVE ONLY.
BEGIN;
CREATE TABLE IF NOT EXISTS telegram_send_allowlist (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  user_id text NOT NULL,
  tdlib_account_id text NOT NULL,
  chat_id text NOT NULL,
  action_type text NOT NULL,
  label text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tdlib_account_id, chat_id, action_type)
);
CREATE TABLE IF NOT EXISTS telegram_send_approvals (
  id text PRIMARY KEY,
  token_hash text NOT NULL,
  workspace_id text NOT NULL,
  user_id text NOT NULL,
  tdlib_account_id text NOT NULL,
  chat_id text NOT NULL,
  action_type text NOT NULL,
  payload_hash text NOT NULL,
  preview text,
  requires_second_confirm boolean NOT NULL DEFAULT false,
  confirm_stage text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE TABLE IF NOT EXISTS telegram_send_audit (
  id text PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  approval_id text,
  workspace_id text,
  user_id text,
  tdlib_account_id text,
  telegram_user_id text,
  chat_id text,
  action_type text,
  payload_hash text,
  confirm_stage text,
  stage text,
  outcome text,
  error_code text,
  telegram_message_id text
);
CREATE INDEX IF NOT EXISTS tsa_appr_ws_idx ON telegram_send_approvals(workspace_id);
CREATE INDEX IF NOT EXISTS tsa_appr_status_idx ON telegram_send_approvals(status);
COMMIT;
