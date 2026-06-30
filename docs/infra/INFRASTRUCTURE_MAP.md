# EPIC GRAM Infrastructure Map

Status: bootstrap inventory. Secrets, passwords, private keys, API tokens, and session strings must never be committed.

## 1. Known repositories

| Repo | Purpose | Status |
|---|---|---|
| `EpicStarAi/agent-control` | EPIC GRAM Telegram-style client shell, AI operator workspace, desktop shell, frontend-first prototype | active |

## 2. Known domains and entry points

| Domain / URL | Purpose | Expected owner/system | Notes |
|---|---|---|---|
| `epic-gram.com` | Planned main EPIC GRAM domain | EPIC GRAM | DNS/deploy mapping must be verified |
| `epicstar.space` | EPICSTAR space/domain plan | EPICSTAR | Verify Caddy/DNS state |
| `deepinside.life` | DEEP INSIDE site / console | DEEP INSIDE VPS | Cloudflare + SSL used previously |
| `vpn.deepinside.life` | HideMyName VPN Mini App legacy entry | EPIC VPN | historical working entry |
| `hide-my-name.online` | HideMyName VPN current domain/admin | EPIC VPN | admin route needs frontend/API debugging |

## 3. Known servers / machines

| ID | Type | Address / access hint | Purpose | Must verify |
|---|---|---|---|---|
| LOCAL-WIN | Local Windows workstation | local PC | development, VS Code, Codex, Replit coordination | repo path, Node/npm, git, env files |
| LOCAL-UBUNTU | local Ubuntu virtual server / laptop VPS | local LAN IP unknown | local services, staging, runtime experiments | SSH IP, services, ports, docker, n8n, ollama |
| VPS-TGBOT | Ubuntu VPS | `194.233.101.84` | Telegram bot / VPN bot stack | nginx, backend, postgres, redis, bot polling, domains |
| VPS-EPIC | Ubuntu/Contabo VPS | `194.163.140.26` | deepinside/epic-gram/vpn node plan | nginx/caddy, pm2, Cloudflare, WireGuard if active |
| VPS-WIN | Windows Server 2022 / Contabo | IP TBD | heavy Windows tools, RDP workflows | RDP, Docker Desktop, Postgres, ngrok, app paths |
| VPS-VPN-LXC | Ubuntu/Proxmox LXC | IP TBD | VPN bot node / no Docker environment | nginx/postgres/redis/uvicorn, systemd services |

## 4. Service inventory checklist

Run on every Linux server:

```bash
hostnamectl
ip -br a
whoami
pwd
lsb_release -a || cat /etc/os-release
uptime
free -h
df -h
sudo ufw status verbose || true
sudo ss -tulpn
systemctl --type=service --state=running --no-pager
pm2 list || true
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}' || true
ls -la /opt || true
ls -la /var/www || true
ls -la /etc/nginx/sites-enabled || true
sudo nginx -t || true
```

Run on Windows server/workstation:

```powershell
hostname
whoami
Get-ComputerInfo | Select-Object WindowsProductName,WindowsVersion,OsHardwareAbstractionLayer
node -v
npm -v
git --version
Get-Process node,nginx,postgres,docker,ngrok -ErrorAction SilentlyContinue
Get-NetTCPConnection -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

## 5. Port plan

| Port | Purpose | Notes |
|---:|---|---|
| 22 | SSH | restrict by key when possible |
| 80 | HTTP | nginx/caddy reverse proxy |
| 443 | HTTPS | SSL via Cloudflare / Certbot / Caddy |
| 3015 | EPIC GRAM Next.js dev host | local/dev only unless proxied |
| 5173 | Vite dev server / VPN WebApp historical | dev only unless proxied |
| 5678 | n8n | protect with auth / tunnel / firewall |
| 8788 | EPIC API historical port | verify current state |
| 11434 | Ollama | never expose publicly without firewall |

## 6. Environment files to locate, not commit

- `.env`
- `.env.local`
- `.env.production`
- Telegram API credentials
- bot tokens
- OpenAI/OpenRouter/Claude/Gemini keys
- database URLs
- SSH private keys
- admin password hashes

## 7. Immediate audit target

First target: `LOCAL-UBUNTU`.

Goal: understand what is running there before changing anything.

Required outputs:

1. LAN IP and SSH user.
2. Folder map under `/opt`, `/srv`, `/var/www`, and home directory.
3. Running services.
4. Open ports.
5. Docker/PM2/n8n/Ollama/Postgres state.
6. Any EPIC/DEEPINSIDE/VPN project paths.
7. What should be backed up before deploy.
