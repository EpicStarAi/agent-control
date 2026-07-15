#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/EpicStarAi/agent-control.git}"
REF="${REF:-feature/epic-ai-os-v4-pa}"
CANDIDATE_DIR="${CANDIDATE_DIR:-/opt/epicgram-candidate-v4-pa}"
PORT="${PORT:-3016}"
PM2_NAME="${PM2_NAME:-epicgram-v4-pa-candidate}"
API_BASE_URL="${EPICGRAM_API_BASE_URL:-http://127.0.0.1:8788}"

log() { printf '\n[%s] %s\n' "$(date -Is)" "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null || fail "git is required"
command -v node >/dev/null || fail "node is required"
command -v npm >/dev/null || fail "npm is required"
command -v curl >/dev/null || fail "curl is required"
command -v pm2 >/dev/null || fail "pm2 is required"

log "Preparing isolated candidate at ${CANDIDATE_DIR}"
if [[ -d "${CANDIDATE_DIR}/.git" ]]; then
  git -C "${CANDIDATE_DIR}" fetch --prune origin
  git -C "${CANDIDATE_DIR}" checkout -B "${REF}" "origin/${REF}"
  git -C "${CANDIDATE_DIR}" reset --hard "origin/${REF}"
  git -C "${CANDIDATE_DIR}" clean -fdx
else
  rm -rf "${CANDIDATE_DIR}"
  git clone --branch "${REF}" --single-branch "${REPO_URL}" "${CANDIDATE_DIR}"
fi

cd "${CANDIDATE_DIR}"

log "Installing dependencies"
npm ci

log "Linting"
npm run lint --if-present

log "Building"
NEXT_TELEMETRY_DISABLED=1 npm run build

log "Starting candidate on port ${PORT}; production is not touched"
pm2 delete "${PM2_NAME}" >/dev/null 2>&1 || true
EPICGRAM_API_BASE_URL="${API_BASE_URL}" PORT="${PORT}" pm2 start npm --name "${PM2_NAME}" -- start -- -p "${PORT}"
pm2 save

log "Waiting for candidate"
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/operator/v4/manifest" >/dev/null; then
    break
  fi
  sleep 2
done

log "Smoke testing"
curl -fsS "http://127.0.0.1:${PORT}/api/operator/v4/manifest" | grep -q 'EPIC AI OS v4'
curl -fsS "http://127.0.0.1:${PORT}/operator-v4" >/dev/null
curl -fsS -X POST "http://127.0.0.1:${PORT}/api/operator/v4/plan" \
  -H 'content-type: application/json' \
  --data '{"message":"Покажи последние Telegram-чаты NOVIKOVA","agentId":"director","requestedBy":"operator","autonomyMode":"copilot","accountId":"novikova"}' \
  | grep -q 'executionRequestId'

log "Candidate deployment passed"
printf 'Candidate URL: http://127.0.0.1:%s/operator-v4\n' "${PORT}"
printf 'PM2 process: %s\n' "${PM2_NAME}"
printf 'Production remains unchanged.\n'
