$ErrorActionPreference = "Stop"
$proj = "C:\Users\Admin\Documents\Codex\2026-05-21\prior-conversation-with-codex-conversation-role\agent-control"
Set-Location $proj

# API service (port 8788) - detached, survives session reset
Start-Process -FilePath "node" -ArgumentList "services/api/src/server.mjs" `
  -WorkingDirectory $proj -WindowStyle Hidden `
  -RedirectStandardOutput "$proj\epicgram-api.out.log" `
  -RedirectStandardError  "$proj\epicgram-api.err.log"

Start-Sleep -Seconds 3

# Web client (port 3015) - detached
Start-Process -FilePath "cmd.exe" -ArgumentList "/c","npm run dev:host" `
  -WorkingDirectory $proj -WindowStyle Hidden `
  -RedirectStandardOutput "$proj\epicgram-web.out.log" `
  -RedirectStandardError  "$proj\epicgram-web.err.log"

Write-Output "launched"
