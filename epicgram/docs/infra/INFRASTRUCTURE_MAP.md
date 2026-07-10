# Infrastructure Map — Local Ubuntu (WSL2)

Snapshot date: 2026-06-30. Source: read-only audit of `Ubuntu-24.04` WSL distro on host `DESKTOP-ERE9S4D` (Windows 11 Pro).

This file is local-only documentation inside the `agent-control` repo. It is not synced to any GitHub repo and contains no secrets.

## Host

| Field | Value |
|---|---|
| WSL distro | `Ubuntu-24.04` (Ubuntu 24.04.4 LTS "Noble Numbat") |
| Kernel | 6.6.114.1-microsoft-standard-WSL2 |
| WSL hostname | `DESKTOP-ERE9S4D` |
| Default user | `buch` (uid 1001) |
| systemd | enabled (PID 1 = systemd 255.4) |
| RAM / CPU / disk | 30 GiB / 32 vCPU / 1 TB root (5 GiB used) |
| WSL `eth0` | `172.23.41.201/20` |
| Loopback IPs | `127.0.0.1`, `127.0.0.53` (resolved), `127.0.0.54`, `10.255.255.254` |

## Roots

There are **two** top-level OPENCLAW directories at `/`. They are not nested:

| Path | Owner | Purpose |
|---|---|---|
| `/OPENCLAW-AI-PROJECTS/` | `buch` | Project tree managed by panel + EVA. 20+ subdirs (panel, eva-run-agent, eva-telegram-agent, eva-v05-*, multiple `*-test` and `*backup*`). |
| `/OPENCLAW-AI-LOCAL-MCP-SERVER-UBUNTU/` | `buch` | MCP agent server (Express on :8787) for project control. |

`/opt` and `/srv` are empty. `/var/lib/docker-desktop` present (Docker Desktop integration on Windows side; Docker CLI inside WSL is the Windows shim, no daemon in the distro).

## Installed runtimes & tools

| Class | Present | Absent |
|---|---|---|
| Runtimes | `node 24.15.0`, `npm 11.12.1`, `pnpm 11.5.2` (from Windows path), `python3 3.12.3` | go, rust, java, ruby, php, dotnet, bun, deno |
| Containers | (no native Docker in distro) | podman, kubectl, helm, k3s, kind, minikube |
| Ops/dev | git 2.43, curl, wget, jq, tmux, rsync, openssl | pm2, nginx, caddy, redis-cli, psql, sqlite3, ufw, fail2ban, tailscale, wireguard |

## systemd services (active, enabled)

All three units live in `/etc/systemd/system/` and ran 14 s after WSL boot at audit time. Logs go to journald.

### `openclaw-agent.service` — MCP Agent Server
- WorkingDirectory: `/OPENCLAW-AI-LOCAL-MCP-SERVER-UBUNTU/mcp-server`
- ExecStart: `/usr/bin/node openclaw-agent-server.js`
- Env: `PORT=8787`
- User: (root, no `User=` directive)
- Listen: **`127.0.0.1:8787`** (loopback only)
- Restart: always, RestartSec=5

### `openclaw-panel.service` — Web Panel V4.2
- WorkingDirectory: `/OPENCLAW-AI-PROJECTS/openclaw-panel`
- ExecStart: `/usr/bin/npm start` (→ `node server.js`)
- Env: `PORT=3004`, `OPENCLAW_ROOT=/OPENCLAW-AI-PROJECTS`
- User: `buch`
- Listen: **`0.0.0.0:3004`** (all interfaces inside WSL — exposed to Windows host)
- Restart: always, RestartSec=3

### `eva-run-agent.service` — EVA Telegram Console
- WorkingDirectory: `/OPENCLAW-AI-PROJECTS/eva-run-agent`
- ExecStart: `/usr/bin/node index.js`
- Env: `OPENCLAW_API=http://127.0.0.1:8787`
- After: `network.target openclaw-agent.service`
- No HTTP listener (long-polling Telegram Bot API → outbound only)
- Restart: always, RestartSec=5

## Listening ports (TCP)

| Port | Bind | Process | Component |
|---|---|---|---|
| 8787 | 127.0.0.1 | `node openclaw-agent-server.js` | MCP Agent Server |
| 3004 | 0.0.0.0 | `node server.js` (child of `npm start`) | Web Panel V4.2 |
| 53 | 127.0.0.53 / 127.0.0.54 / 10.255.255.254 | systemd-resolved | DNS |

No other listeners. UDP: only chrony (323) + resolved (53).

## Component data flow

```text
Telegram user / chat
       │
       │ (Bot API long-polling)
       ▼
eva-run-agent.service        ──── HTTP fetch ──▶  openclaw-agent.service (127.0.0.1:8787)
(node-telegram-bot-api,                              │
 dotenv, ALLOWED_USERS allowlist)                    │
                                                     ▼
                                              child_process.exec /bin/bash
                                                     │
                                                     ▼
                                         /OPENCLAW-AI-PROJECTS/<project>/*
                                              (OPENCLAW_RUN.pid/.log)
                                                     ▲
                                                     │  also read/spawn
                                                     │
openclaw-panel.service (0.0.0.0:3004)  ──── child_process.spawn / execSync ─┘
(Express only, no auth, modular UI)
```

`eva-run-agent` and `openclaw-panel` operate over the **same project tree** and both write `OPENCLAW_RUN.pid` / `OPENCLAW_RUN.log` files. No coordination between them — race-condition surface on concurrent run/stop.

## openclaw-panel (V4.2 Project Runtime Manager)

- Single file `server.js`, **1250 lines**, only dep is `express ^4.22.2`.
- Has UI modules in `public/`: Adapter Activation D1–D11, Agent Coordination N1–N8, Approval Flow D3, Capability Registry R3, Blueprint Marketplace R4, Control Plane E1–E8, Desktop Environment D1–D8, Creator Ecosystem S1–S8, EpicStar Content Engine V5, World OS / Platform Intelligence K1–K8, Agent Galaxy A5, Architecture Canvas A61, Matrix Space A2, Mission Control A7.
- Backend HTTP API (current):

| Method | Path | Note |
|---|---|---|
| GET | `/health` | health (duplicated 3× in file at 213/414/724) |
| GET | `/projects` | list projects |
| GET | `/ps` | list node/npm processes |
| GET | `/project/log` | tail log |
| GET | `/project/readme` | read README |
| GET | `/agent-missions-preview` | UI F19 |
| GET | `/platform-intelligence`, `/platform-intelligence-k1` | UI K1–K8 |
| POST | `/project/create` | duplicated at 552/687 |
| POST | `/project/run` | `spawn` npm start |
| POST | `/project/stop` | kill |
| POST | `/project/check` | sanity |
| POST | `/project/install` | `npm install` |
| GET | `/registry` (E1) | agent metadata registry |
| POST | `/registry/sync` (E1) | sync metadata |
| static | `/public/*` | all UI assets |

Data files:
- `projects.registry.json` — V4.2 PROJECT RUNTIME MANAGER. Tracks 4 test projects (v42-test-agent, v421a-autotest, v421a-clean-test, v421b-full-test) on ports 3010–3013.
- `runtime-state/agent-registry.json` — agent metadata (E1 module).
- `data/agent-template-catalog.json` — agent templates (DevOps Release Watcher, Data KPI Analyst, Content Brief Writer, Telegram Community Draft, …) — all `status=TEMPLATE_ONLY`.

Git: branch `main`, latest commits `f1338a8 World OS extensions: flow theme registry architect`, `ddac020 World OS K1-K4 platform intelligence modules`, `8de0c53 V5.3.0-K2-STABLE`. Working tree dirty (many `M` files in `backups/`, `checkpoint/`).

## openclaw-agent-server (MCP)

- Single file, **567 lines**. Express only.
- Binds **`127.0.0.1:8787`** explicitly (`app.listen(PORT, "127.0.0.1", ...)`).
- Endpoints:

| Method | Path |
|---|---|
| GET | `/health` |
| GET | `/projects` |
| GET / POST | `/ps`, `/project/ps` |
| POST | `/project/read` (path-traversal guard via `startsWith(projectPath)`) |
| POST | `/project/run` (`PORT=N npm start > OPENCLAW_RUN.log 2>&1 & echo $! > OPENCLAW_RUN.pid`) |
| POST | `/project/stop` (kill by PID file) |
| POST | `/project/stop-port` (`lsof -ti tcp:N` then kill) |
| POST | `/project/health` (`curl http://127.0.0.1:N/health`) |
| POST | `/project/log` (tail `OPENCLAW_RUN.log`) |
| POST | `/project/scaffold` (creates skeleton project) |

- Project name sanitized via `/[^a-zA-Z0-9._-]/g` → `_`. No auth.

## eva-run-agent (Telegram bot)

- Single file `index.js`, **483 lines**.
- Deps: `dotenv 16.6.1`, `node-telegram-bot-api 0.67.0`, `telegraf 4.16.3` (unused).
- Transport: **Telegram Bot API** (long-polling). Not a userbot — cannot see arbitrary chats; only receives messages directed to the bot.
- Env (read at startup):
  - `TELEGRAM_BOT_TOKEN` → `BOT_TOKEN` → `TOKEN` — bot credential (process exits if missing).
  - `OPENCLAW_API` — defaults to `http://127.0.0.1:8787`.
  - `ALLOWED_USERS` — comma-separated Telegram user IDs. **Empty list = open to anyone**. Audit recommends populating this.
- Commands implemented: `/start`, `/help`, `/projects`, `/read <project> [file]`, `/scaffold <project>`, `/run <project> <port>`, `/health <project> <port>`, `/log <project> [lines]`, `/ps`, `/stop <project> <port>`.

## /home/buch (other projects)

| Path | Repo | Stack | State |
|---|---|---|---|
| `~/avatar-messenger` | git `master`, MVP commit `dcadbb6` | Fastify + `node:sqlite` + WebSocket | runs locally, has `cloudflared.log` + `tunnel-url.txt` (CF Tunnel) |
| `~/deepinside-site` | git `master`, MVP commit `f9bbf3c` | Express landing + Telegram login + agent catalog, ships `Caddyfile` + `DNS-plan.md` for Caddy+systemd deploy | dirty: `M Caddyfile` |
| `~/ibex` | not a repo | empty dir | — |
| `~/Library/Developer` | — | macOS-style folder (stray) | — |

`~/.codex` exists (Codex CLI state).

## Risks / asymmetries to flag

1. **`openclaw-panel` on `0.0.0.0:3004` with zero auth and `spawn`/`execSync` everywhere** — effectively RCE-as-a-service for anyone reaching the WSL eth0 IP (and, depending on WSL networking mode, possibly the Windows LAN). Fix: bind to `127.0.0.1` or add token auth before any exposure.
2. **MCP server runs as root** (no `User=` in unit) while it spawns `/bin/bash`. Combined with the fact that it is loopback-only this is currently contained, but a future remote exposure would be severe. Add `User=buch` and `ProtectSystem=` hardening.
3. **`eva-run-agent` ALLOWED_USERS not verified.** If `.env` leaves the list empty, anyone who finds the bot username can run `/run`, `/scaffold`, `/stop` on the panel's tree. Verify and populate.
4. **Bot API ≠ userbot.** Any plan to classify *all* incoming Telegram traffic (PERSONAL / BOTS / CHANNELS / GROUPS) cannot be served by this stack. Requires MTProto (Telethon / Pyrogram / GramJS) — not installed.
5. **Two writers to the same `OPENCLAW_RUN.pid/.log`** (panel and MCP). No locking, no exclusivity. Concurrent /run /stop can corrupt state.
6. **Two roots, not one.** `OPENCLAW_ROOT=/OPENCLAW-AI-PROJECTS` is set on the panel, but the MCP server lives outside it at `/OPENCLAW-AI-LOCAL-MCP-SERVER-UBUNTU/`. Any "single root" assumption is wrong.
7. **Panel server.js has duplicated routes** (`/health` 3×, `/project/create` 2×). Earlier definitions are dead code from file accretion.
8. **Working tree of `openclaw-panel` is dirty.** Many `M` files in `backups/` and `checkpoint/` directories — these versioned backups inflate `git status` and obscure real changes.

## Useful one-off commands

```bash
# Status of all three units
systemctl status openclaw-agent openclaw-panel eva-run-agent --no-pager

# Last 200 log lines
journalctl -u openclaw-agent -u openclaw-panel -u eva-run-agent -n 200 --no-pager

# Confirm what is bound where
ss -tulnp | grep -E ':(3004|8787)'

# Probe panel and MCP
curl -s http://127.0.0.1:3004/health
curl -s http://127.0.0.1:8787/health
curl -s http://127.0.0.1:8787/projects | jq

# Inspect Bot allowlist (without printing token)
grep -E '^ALLOWED_USERS=' /OPENCLAW-AI-PROJECTS/eva-run-agent/.env
```
