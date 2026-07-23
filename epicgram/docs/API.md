# Platform API

Single versioned contract for every client (Web, Desktop, Android, iOS, WebApp, AI operator, external agents).

## Source of truth
- OpenAPI 3.1: `services/api/openapi.yaml`
- Live docs: `GET /v1/docs` (Swagger UI) · spec: `GET /v1/openapi.yaml`
- Backend base (local): `http://127.0.0.1:8788` · Web proxy: `/api/*` → backend

## Versioning & freeze
- All stable endpoints live under `/api/v1/*` and are described in `openapi.yaml`.
- **Freeze rule:** after P18 completes, `/api/v1/*` is stable. Allowed: additive changes (new endpoints, new fields, new optional params). Forbidden under v1: rename/remove a field, change a type, change semantics — those ship under `/api/v2`.
- Clients may rely on v1 without fear of breakage.

## Namespaces (target)
```
/v1/system        health · capabilities · openapi · docs
/v1/auth          qr · phone · code · 2fa · reset · logout
/v1/accounts      list · {slot} · switch · logout · backup · export · delete
/v1/runtime/<r>   telegram · browser · discord · whatsapp · local-ai · cloud-ai
/v1/ai            memory · knowledge · operator · agents · prompt · workflow · router
/v1/media         tts · image · video · voices · status
/v1/files         download · upload · thumb
/v1/settings      folders · privacy · notifications · appearance · proxy · language · advanced
/v1/plugins/<id>  plugin-provided routes
```

## Live today
```
GET /v1/system/health
GET /v1/system/capabilities
GET /v1/openapi.yaml · GET /v1/docs
GET /v1/telegram/account/{info,storage,devices,statistics}      (+ /v1/runtime/telegram/account/* alias)
```

## Migration (additive facade, no big-bang)
Unversioned internal routes (`/telegram/*`, `/operator/*`, `/ai/*`, `/media/*`, `/infra/*`) stay working. `/v1/*` domains are added as thin aliases to the same handlers, domain by domain, each shipped green. The web client migrates to `/v1/*` gradually. Nothing breaks mid-migration.

## Conventions
- JSON, `content-type: application/json`. Read endpoints are GET and never mutate.
- Errors: `{ message }` + HTTP status. `503` when a runtime/TDLib isn't configured/reachable.
- Query `accountId` selects a slot; defaults to the active slot.
