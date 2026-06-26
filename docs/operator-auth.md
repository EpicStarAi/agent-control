# EPIC☠️GRAM Operator Authorization

The MVP contains a local authorized-client seed for the project owner:

- Email: `buchmanchik@gmail.com`
- Role: `owner`
- Status: `authorized`

Passwords must not be committed to the repository or stored as plaintext.

For local development, store only a password hash in the **workspace-root**
`.env.local` (next to `.env.example`). `apps/web/next.config.mjs` loads it from
there explicitly via `dotenv` and `import.meta.url`, so it works under any
`process.cwd()` (`npm run dev`, `npm run build`, IDE runners, …). Do not
create `apps/web/.env.local` — it is not the source of truth.

```bash
EPICGRAM_OPERATOR_EMAIL=buchmanchik@gmail.com
EPICGRAM_OPERATOR_PASSWORD_SCRYPT=replace-with-local-scrypt-hash
```

### Generating the hash

Preferred (Windows, no shell history exposure):

```powershell
.\ops\set-operator-hash.ps1
```

The helper reads the password via `Read-Host -AsSecureString`, runs
`scripts/create-operator-hash.mjs` with the password in a child-process env
var only, writes `EPICGRAM_OPERATOR_PASSWORD_SCRYPT=scrypt:…` to root
`.env.local`, then clears the env var and in-memory plaintext in `finally`.
The plaintext password is never echoed and the hash is not printed.

Manual (cross-platform, leaves password in shell history — avoid):

```bash
EPICGRAM_OPERATOR_PASSWORD='your-local-password' npm run operator:hash
```

After rotating the hash, restart `npm run dev` so Next picks up the new
value. Health check: `POST /api/admin/login {"password":"wrong"}` must
return **401**, not 503.

The current frontend exposes the seed through `/api/operators/status`. Real sign-in, rate limiting, session cookies, password verification, and account lockout belong in the backend authentication layer.

Telegram authorization remains separate from operator authorization. Telegram accounts must still be connected through the official TDLib flow with explicit owner approval and encrypted session storage.
