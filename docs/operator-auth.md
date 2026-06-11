# EPIC☠️GRAM Operator Authorization

The MVP contains a local authorized-client seed for the project owner:

- Email: `buchmanchik@gmail.com`
- Role: `owner`
- Status: `authorized`

Passwords must not be committed to the repository or stored as plaintext.

For local development, store only a password hash in `.env.local`:

```bash
EPICGRAM_OPERATOR_EMAIL=buchmanchik@gmail.com
EPICGRAM_OPERATOR_PASSWORD_SCRYPT=replace-with-local-scrypt-hash
```

Generate a local hash without committing the plaintext password:

```bash
EPICGRAM_OPERATOR_PASSWORD='your-local-password' npm run operator:hash
```

The current frontend exposes the seed through `/api/operators/status`. Real sign-in, rate limiting, session cookies, password verification, and account lockout belong in the backend authentication layer.

Telegram authorization remains separate from operator authorization. Telegram accounts must still be connected through the official TDLib flow with explicit owner approval and encrypted session storage.
