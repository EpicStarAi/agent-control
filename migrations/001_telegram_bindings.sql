-- Migration: 001_telegram_bindings
-- Per-user Telegram account binding (P0 MVP)
-- ADDITIVE ONLY: no ALTER of existing tables, no DROP

BEGIN;

CREATE TABLE IF NOT EXISTS telegram_bindings (
  id               text        NOT NULL PRIMARY KEY,
  workspace_id     text        NOT NULL,
  user_id          text        NOT NULL,
  tdlib_account_id text        NOT NULL UNIQUE,
  display_name     text        DEFAULT 'Telegram',
  phone_masked     text,
  username         text,
  auth_state       text        NOT NULL DEFAULT 'init',
  auth_error       text,
  bound_at         timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- One binding per workspace
CREATE UNIQUE INDEX IF NOT EXISTS telegram_bindings_ws_idx
  ON telegram_bindings (workspace_id);

-- One TDLib session per binding (no duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS telegram_bindings_tdlib_idx
  ON telegram_bindings (tdlib_account_id);

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS telegram_bindings_user_idx
  ON telegram_bindings (user_id);

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS telegram_bindings;
