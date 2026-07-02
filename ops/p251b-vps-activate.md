# P25.1b — REAL VPS POSTGRES ACTIVATION (runbook)

Prereq: commit `38f00e2` (or newer) is on `origin/main` (pushed).
Run these ON THE VPS (host `mangol-vps` / 185.155.90.135, user root).
Constraints: do NOT touch nginx, Cloudflare, petapp/, services/api. No secrets echoed.
No DROP, no DELETE, no destructive migration. Approval Gate stays MANUAL_APPROVAL_ONLY.
The app self-creates tables at first DB boot via `CREATE TABLE IF NOT EXISTS` (missionDb.ensureInit).

## 0. Locate project + confirm commit
```bash
cd /path/to/agent-control        # the dir where pm2 runs `next start apps/web`
pm2 describe epicgram-web | grep -E 'cwd|script'   # confirm the exact cwd
git fetch origin && git log --oneline -1 origin/main   # expect 38f00e2 or newer
git status --porcelain            # expect clean (stash local edits if any)
git pull --ff-only origin main
```

## 1. Install deps (pg + @types/pg already in package.json @ 38f00e2)
```bash
npm ci        # or: npm install --omit=dev  (pg is a runtime dep)
node -e "require('pg'); console.log('pg OK', require('pg/package.json').version)"
```

## 2. Ensure a UTF8 database (idempotent, non-destructive)
IMPORTANT: the DB MUST be UTF8 — a WIN1251/latin1 cluster will fail on emoji seed data
(this exact failure was caught during P25.1a local proof).
```bash
# adjust DBUSER/DBNAME/PORT to your VPS convention; run as a role that can CREATE DATABASE
DBNAME=epicgram
psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DBNAME'" | grep -q 1 \
  && echo "db exists" \
  || psql -c "CREATE DATABASE $DBNAME ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C';"
# verify encoding is UTF8
psql -d "$DBNAME" -tAc "SHOW server_encoding"     # must print UTF8
```
If the existing DB is NOT UTF8, do NOT drop it — create a new UTF8 db (e.g. epicgram_u8)
and point DATABASE_URL there.

## 3. Set DATABASE_URL in the VPS env (never echo the value)
Use your existing env convention (the pm2 ecosystem file or the app's `.env`/`.env.local`
in the project cwd). Format:
```
DATABASE_URL=postgresql://<user>:<pass>@127.0.0.1:<port>/epicgram
```
Confirm presence only (not value):
```bash
grep -q '^DATABASE_URL=' .env.local && echo "DATABASE_URL present=yes" || echo "present=no"
```

## 4. Restart ONLY the web process with fresh env
```bash
pm2 restart epicgram-web --update-env
pm2 describe epicgram-web | grep status
```
Do NOT restart nginx / Cloudflare / services-api / hidemyname / unrelated procs.

## 5. Verify (see ops/p251b-verify.sh)
```bash
bash ops/p251b-verify.sh http://127.0.0.1:3015
```
Expected:
- /api/missions  -> source = db (or database)
- /api/operator-events -> source = db
- /missions UI shows "источник: /api/missions · DB"
- SSE /api/operator-events/stream -> event: system.connected
- POST a simulated status change -> stored; `pm2 restart epicgram-web --update-env`
  -> status SURVIVES restart (fs-fallback would reset to seed)
- Remove/blank DATABASE_URL on a throwaway probe -> source = fallback (graceful)

## Rollback (non-destructive)
- Remove/blank DATABASE_URL, `pm2 restart epicgram-web --update-env` -> app returns to fs-fallback.
- No data is dropped; tables persist in Postgres for the next activation.
