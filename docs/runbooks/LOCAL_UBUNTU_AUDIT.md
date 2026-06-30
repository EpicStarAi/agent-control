# Local Ubuntu Virtual Server Audit Runbook

Purpose: inspect the local Ubuntu virtual server before EPIC GRAM AI Operator debugging or deployment.

Rule: do not install, delete, restart, or overwrite anything during this audit. Read-only first.

## 1. From Windows: find and enter the Ubuntu server

If you already know the IP:

```powershell
ssh USER@LOCAL_UBUNTU_IP
```

If you do not know the IP, check your router/Deco client list or run from Windows:

```powershell
arp -a
```

Then test likely hosts:

```powershell
ping LOCAL_UBUNTU_IP
ssh USER@LOCAL_UBUNTU_IP
```

## 2. Create an audit folder on Ubuntu

```bash
mkdir -p ~/epic-audit
cd ~/epic-audit
```

## 3. System snapshot

```bash
{
  echo '### DATE'; date -Is
  echo '### HOSTNAME'; hostnamectl || hostname
  echo '### USER'; whoami
  echo '### OS'; lsb_release -a 2>/dev/null || cat /etc/os-release
  echo '### IP'; ip -br a
  echo '### UPTIME'; uptime
  echo '### DISK'; df -h
  echo '### RAM'; free -h
} | tee 01-system.txt
```

## 4. Open ports and running services

```bash
{
  echo '### PORTS'; sudo ss -tulpn
  echo '### SERVICES'; systemctl --type=service --state=running --no-pager
  echo '### UFW'; sudo ufw status verbose || true
} | tee 02-runtime.txt
```

## 5. Developer tools

```bash
{
  echo '### GIT'; git --version || true
  echo '### NODE'; node -v || true
  echo '### NPM'; npm -v || true
  echo '### PYTHON'; python3 --version || true
  echo '### DOCKER'; docker --version || true
  echo '### DOCKER COMPOSE'; docker compose version || docker-compose --version || true
  echo '### PM2'; pm2 -v || true
  echo '### NGINX'; nginx -v || true
  echo '### POSTGRES'; psql --version || true
  echo '### OLLAMA'; ollama --version || true
} | tee 03-tools.txt
```

## 6. Project folders

```bash
{
  echo '### HOME'; ls -lah ~
  echo '### OPT'; ls -lah /opt 2>/dev/null || true
  echo '### SRV'; ls -lah /srv 2>/dev/null || true
  echo '### WWW'; ls -lah /var/www 2>/dev/null || true
  echo '### NGINX SITES'; ls -lah /etc/nginx/sites-enabled 2>/dev/null || true
  echo '### SYSTEMD CUSTOM'; ls -lah /etc/systemd/system | grep -Ei 'epic|deep|vpn|bot|n8n|ollama|gram|telegram' || true
} | tee 04-folders.txt
```

## 7. Docker and PM2 state

```bash
{
  echo '### DOCKER PS'; docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}' || true
  echo '### DOCKER COMPOSE FILES'; find /opt /srv ~ -maxdepth 4 \( -name 'docker-compose.yml' -o -name 'compose.yml' \) 2>/dev/null || true
  echo '### PM2 LIST'; pm2 list || true
  echo '### PM2 SAVE'; pm2 save --force 2>/dev/null || true
} | tee 05-process-managers.txt
```

## 8. Search for EPIC-related code without exposing secrets

```bash
{
  echo '### PROJECT DIRECTORIES'; find /opt /srv /var/www ~ -maxdepth 5 -type d 2>/dev/null | grep -Ei 'epic|deep|vpn|gram|telegram|agent|operator|n8n|ollama' || true
  echo '### ENV FILE LOCATIONS ONLY'; find /opt /srv /var/www ~ -maxdepth 5 -type f -name '.env*' 2>/dev/null || true
  echo '### PACKAGE FILES'; find /opt /srv /var/www ~ -maxdepth 5 -type f \( -name 'package.json' -o -name 'pnpm-lock.yaml' -o -name 'requirements.txt' -o -name 'pyproject.toml' \) 2>/dev/null || true
} | tee 06-project-search.txt
```

## 9. Pack audit output

```bash
cd ~
tar -czf epic-local-ubuntu-audit-$(date +%Y%m%d-%H%M%S).tar.gz epic-audit
ls -lh epic-local-ubuntu-audit-*.tar.gz
```

## 10. What to report back

Paste or upload:

- `01-system.txt`
- `02-runtime.txt`
- `03-tools.txt`
- `04-folders.txt`
- `05-process-managers.txt`
- `06-project-search.txt`

Do not paste secrets from `.env` files.
