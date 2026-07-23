#!/usr/bin/env bash
# P25.1b verification — run ON THE VPS after activation. Read-only + one simulated
# status change (no external actions). Usage: bash ops/p251b-verify.sh [BASE_URL]
set -u
BASE="${1:-http://127.0.0.1:3015}"
jqsrc() { grep -o '"source":"[^"]*"' | head -1; }

echo "== 1. DB source =="
curl -s "$BASE/api/missions"        | jqsrc | sed 's/^/missions /'
curl -s "$BASE/api/operator-events" | jqsrc | sed 's/^/events   /'

echo "== 2. Route health (expect 200) =="
for p in /client /platform /agents /council /missions /api/missions /api/operator-events; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")
  echo "$code  $p"
done

echo "== 3. SSE first event =="
curl -s --max-time 4 "$BASE/api/operator-events/stream" | head -c 120; echo

echo "== 4. Simulated status change (persisted, no external action) =="
TAG="P251B-$(date +%H%M%S)"
curl -s -X POST "$BASE/api/missions/m-client-launch/status" \
  -H 'Content-Type: application/json' \
  -d "{\"status\":\"waiting_approval\",\"note\":\"$TAG\"}" | grep -o '"source":"[^"]*"\|"status":"[^"]*"'
echo ">> now run:  pm2 restart epicgram-web --update-env   then re-check status below"

echo "== 5. Status after (should be waiting_approval if you restarted) =="
curl -s "$BASE/api/missions" | grep -o '"id":"m-client-launch","[^}]*"status":"[^"]*"' | head -1

echo "== 6. Fallback probe (DB unreachable) — OPTIONAL, uses port 3016 =="
echo "   DATABASE_URL='postgresql://x:x@127.0.0.1:5999/none' PORT=3016 npx next start apps/web -p 3016 &"
echo "   curl -s http://127.0.0.1:3016/api/missions | grep source   # expect source=fallback"
echo "   (kill the 3016 probe afterwards; do not disturb the :3015 prod process)"
