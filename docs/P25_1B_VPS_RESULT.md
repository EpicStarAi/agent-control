# P25.1b — VPS POSTGRES ACTIVATION · CLOSED ✅

Production persistence is live on the VPS.

| field | value |
|---|---|
| VPS | 194.163.140.26 |
| Path | /opt/epicgram-releases/main-29c094e |
| Process | epicgram-web (pm2) |
| Port | 127.0.0.1:3015 |
| Database | epicgram_u8 |
| Encoding | UTF8 |
| source | db |
| SSE | system.connected |
| Persistence after `pm2 restart` | confirmed |

Verified:
- `GET /api/missions` → 200, `source=db`
- `GET /api/operator-events` → 200, `source=db`
- `/api/operator-events/stream` → `event: system.connected`
- status change persisted; survived `pm2 restart epicgram-web --update-env`
- fs fallback preserved when `DATABASE_URL` is absent

Constraints held: nginx / Cloudflare / petapp/ / services/api untouched; no secrets printed;
`CREATE TABLE IF NOT EXISTS` only (no DROP/DELETE); Approval Gate stays MANUAL_APPROVAL_ONLY;
all execution simulated.

Lineage: P25.1 (DB contract) → P25.1a (local Postgres proof) → **P25.1b (VPS activation) CLOSED** → P26 (Approval Gate).
Next: P26.1 Approval Gate DB/API.
