# EPIC☠️GRAM Desktop

Desktop shell for the EPIC☠️GRAM web client.

## Development

1. Start the web client:

```bash
npm run dev:host
```

2. Start the desktop shell:

```bash
npm run desktop:dev
```

By default the desktop shell opens `http://127.0.0.1:3015`.
Set `EPICGRAM_WEB_URL` to point it at a deployed mirror.

## Telegram Sessions

The desktop shell must not store Telegram credentials directly. Real Telegram login and session storage belong in the official TDLib backend/runtime with explicit owner authorization, local encryption, audit logging, and visible logout/delete-session controls.
