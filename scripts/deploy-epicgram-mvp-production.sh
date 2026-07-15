#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/EpicStarAi/agent-control.git}"
REF="${DEPLOY_REF:-feature/epic-ai-os-v4-pa}"
RELEASE_ROOT="${RELEASE_ROOT:-/opt/epicgram-releases}"
PORT="${PORT:-3015}"
PM2_NAME="${PM2_NAME:-epicgram-web}"
API_BASE_URL="${EPICGRAM_API_BASE_URL:-http://127.0.0.1:8788}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/epic-gram.com}"
STAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="${RELEASE_ROOT}/mvp-${STAMP}"
BACKUP_DIR="/root/epicgram-deploy-backup/${STAMP}"
OLD_CWD=""
SWITCHED=0

log() { printf '\n[%s] %s\n' "$(date -Is)" "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

rollback() {
  rc=$?
  if [[ "$rc" -eq 0 ]]; then return; fi
  log "Deployment failed; starting rollback"
  if [[ -f "${BACKUP_DIR}/epic-gram.com.nginx" ]]; then
    cp "${BACKUP_DIR}/epic-gram.com.nginx" "${NGINX_SITE}" || true
    nginx -t && systemctl reload nginx || true
  fi
  if [[ "$SWITCHED" == "1" && -n "$OLD_CWD" && -d "$OLD_CWD" ]]; then
    pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
    EPICGRAM_API_BASE_URL="$API_BASE_URL" PORT="$PORT" \
      pm2 start npm --name "$PM2_NAME" --cwd "$OLD_CWD" --update-env -- start -- -p "$PORT" || true
    pm2 save || true
  fi
  log "Rollback attempted; inspect PM2 and nginx logs"
  exit "$rc"
}
trap rollback ERR

for cmd in git node npm curl pm2 nginx; do
  command -v "$cmd" >/dev/null || fail "$cmd is required"
done
[[ -f "$NGINX_SITE" ]] || fail "nginx site not found: $NGINX_SITE"

mkdir -p "$RELEASE_ROOT" "$BACKUP_DIR"
cp "$NGINX_SITE" "${BACKUP_DIR}/epic-gram.com.nginx"
pm2 jlist > "${BACKUP_DIR}/pm2-jlist.json"
OLD_CWD="$(node -e 'const fs=require("fs");const a=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const p=a.find(x=>x.name===process.argv[2]);process.stdout.write(p?.pm2_env?.pm_cwd||"")' "${BACKUP_DIR}/pm2-jlist.json" "$PM2_NAME")"
printf '%s\n' "$OLD_CWD" > "${BACKUP_DIR}/old-web-cwd.txt"

log "Cloning ${REF} into ${RELEASE_DIR}"
git clone --branch "$REF" --single-branch "$REPO_URL" "$RELEASE_DIR"
cd "$RELEASE_DIR"
DEPLOY_SHA="$(git rev-parse HEAD)"
printf '%s\n' "$DEPLOY_SHA" > "${BACKUP_DIR}/deploy-sha.txt"

log "Installing dependencies and building production MVP"
npm ci
npm run lint --if-present
NEXT_TELEMETRY_DISABLED=1 npm run build

log "Verifying required MVP routes in build"
find apps/web/.next/server -type f | grep -E '/login/(page|route)\.(js|html)$' >/dev/null || fail "/login missing"
find apps/web/.next/server -type f | grep -E '/client/(page|route)\.(js|html)$' >/dev/null || fail "/client missing"

log "Switching PM2 web process to the new release"
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
for _ in $(seq 1 20); do
  if ! ss -ltn "sport = :${PORT}" | grep -q LISTEN; then break; fi
  sleep 1
done
if ss -ltn "sport = :${PORT}" | grep -q LISTEN; then
  fail "port ${PORT} is still occupied"
fi
EPICGRAM_API_BASE_URL="$API_BASE_URL" PORT="$PORT" \
  pm2 start npm --name "$PM2_NAME" --cwd "$RELEASE_DIR" --update-env -- start -- -p "$PORT"
SWITCHED=1
pm2 save

log "Waiting for local production web"
ready=0
for _ in $(seq 1 60); do
  login_code="$(curl -sS -o /tmp/epicgram-login.html -w '%{http_code}' "http://127.0.0.1:${PORT}/login" || true)"
  client_code="$(curl -sS -o /tmp/epicgram-client.html -w '%{http_code}' "http://127.0.0.1:${PORT}/client" || true)"
  if [[ "$login_code" == "200" && "$client_code" == "200" ]]; then ready=1; break; fi
  sleep 2
done
[[ "$ready" == "1" ]] || fail "local /login or /client did not become ready"

log "Removing external Basic Auth from epic-gram.com"
sed -i -E '/^[[:space:]]*auth_basic[[:space:]]+/d; /^[[:space:]]*auth_basic_user_file[[:space:]]+/d' "$NGINX_SITE"
nginx -t
systemctl reload nginx

log "Public smoke test"
for path in /login /client; do
  code="$(curl -ksS -o /tmp/epicgram-public.html -w '%{http_code}' "https://epic-gram.com${path}")"
  [[ "$code" == "200" ]] || fail "public ${path} returned ${code}"
done
status_code="$(curl -ksS -o /tmp/epicgram-status.json -w '%{http_code}' https://epic-gram.com/api/telegram/status || true)"
[[ "$status_code" == "200" ]] || fail "Telegram status endpoint returned ${status_code}"

log "Production MVP deployment completed"
printf 'URL: https://epic-gram.com/login\n'
printf 'Client: https://epic-gram.com/client\n'
printf 'Commit: %s\n' "$DEPLOY_SHA"
printf 'Release: %s\n' "$RELEASE_DIR"
printf 'Backup: %s\n' "$BACKUP_DIR"
printf 'Authentication: Telegram QR / phone code / Telegram 2FA only\n'
