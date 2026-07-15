#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/EpicStarAi/agent-control.git}"
REF="${DEPLOY_REF:-main}"
RELEASE_ROOT="${RELEASE_ROOT:-/opt/epicgram-releases}"
PORT="${PORT:-3015}"
PM2_NAME="${PM2_NAME:-epicgram-web}"
API_BASE_URL="${EPICGRAM_API_BASE_URL:-http://127.0.0.1:8788}"
STAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="${RELEASE_ROOT}/mvp-${STAMP}"
BACKUP_DIR="/root/epicgram-deploy-backup/${STAMP}"
OLD_CWD=""
SWITCHED=0

log() { printf '\n[%s] %s\n' "$(date -Is)" "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

rollback() {
  rc=$?
  [[ "$rc" -eq 0 ]] && return
  log "Deployment failed; starting rollback"
  if [[ "$SWITCHED" == "1" && -n "$OLD_CWD" && -d "$OLD_CWD" ]]; then
    pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
    EPICGRAM_API_BASE_URL="$API_BASE_URL" PORT="$PORT" pm2 start npm --name "$PM2_NAME" --cwd "$OLD_CWD" --update-env -- start -- -p "$PORT" || true
    pm2 save || true
  fi
  exit "$rc"
}
trap rollback ERR

for cmd in git node npm curl pm2; do command -v "$cmd" >/dev/null || fail "$cmd is required"; done
mkdir -p "$RELEASE_ROOT" "$BACKUP_DIR"
pm2 jlist > "${BACKUP_DIR}/pm2-jlist.json"
OLD_CWD="$(node -e 'const fs=require("fs");const a=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const p=a.find(x=>x.name===process.argv[2]);process.stdout.write(p?.pm2_env?.pm_cwd||"")' "${BACKUP_DIR}/pm2-jlist.json" "$PM2_NAME")"
printf '%s\n' "$OLD_CWD" > "${BACKUP_DIR}/old-web-cwd.txt"

log "Cloning ${REF} into ${RELEASE_DIR}"
git clone --branch "$REF" --single-branch "$REPO_URL" "$RELEASE_DIR"
cd "$RELEASE_DIR"
DEPLOY_SHA="$(git rev-parse HEAD)"
printf '%s\n' "$DEPLOY_SHA" > "${BACKUP_DIR}/deploy-sha.txt"

npm ci
npm run lint --if-present
NEXT_TELEMETRY_DISABLED=1 npm run build

find apps/web/.next/server -type f | grep -E '/login/(page|route)\.(js|html)$' >/dev/null || fail "/login missing"
find apps/web/.next/server -type f | grep -E '/client/(page|route)\.(js|html)$' >/dev/null || fail "/client missing"
find apps/web/.next/server -type f | grep -E '/tma/profile/(page|route)\.(js|html)$' >/dev/null || fail "/tma/profile missing"

pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
for _ in $(seq 1 20); do
  if ! ss -ltn "sport = :${PORT}" | grep -q LISTEN; then break; fi
  sleep 1
done
ss -ltn "sport = :${PORT}" | grep -q LISTEN && fail "port ${PORT} is still occupied"
EPICGRAM_API_BASE_URL="$API_BASE_URL" PORT="$PORT" pm2 start npm --name "$PM2_NAME" --cwd "$RELEASE_DIR" --update-env -- start -- -p "$PORT"
SWITCHED=1
pm2 save

ready=0
for _ in $(seq 1 60); do
  login_code="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/login" || true)"
  client_code="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/client" || true)"
  tma_code="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/tma/profile" || true)"
  if [[ "$login_code" == "200" && "$client_code" == "200" && "$tma_code" == "200" ]]; then ready=1; break; fi
  sleep 2
done
[[ "$ready" == "1" ]] || fail "required routes did not become ready"

for path in /login /client /tma/profile; do
  code="$(curl -ksS -o /dev/null -w '%{http_code}' "https://epic-gram.com${path}")"
  [[ "$code" == "200" ]] || fail "public ${path} returned ${code}"
done
status_code="$(curl -ksS -o /dev/null -w '%{http_code}' https://epic-gram.com/api/telegram/status || true)"
[[ "$status_code" == "200" ]] || fail "Telegram status endpoint returned ${status_code}"

printf 'Commit: %s\nRelease: %s\nTMA: https://epic-gram.com/tma/profile\n' "$DEPLOY_SHA" "$RELEASE_DIR"
