-- Migration: 003_workspace_onboarding
-- Per-workspace first-run onboarding progress (forced onboarding + shell).
-- ADDITIVE ONLY: no ALTER of existing tables, no DROP.
--
-- The app also creates this table idempotently at runtime (lib/onboardingDb.ts,
-- CREATE TABLE IF NOT EXISTS) exactly like workspace_profiles, so applying this
-- migration is optional. It is provided for parity with the telegram tables and
-- so the schema is documented in one place.

BEGIN;

CREATE TABLE IF NOT EXISTS workspace_onboarding (
  workspace_id text        NOT NULL PRIMARY KEY,
  step         integer     NOT NULL DEFAULT 0,
  completed    boolean     NOT NULL DEFAULT false,
  skipped      boolean     NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMIT;
