$ErrorActionPreference = "SilentlyContinue"
$proj = "C:\Users\Admin\Documents\Codex\2026-05-21\prior-conversation-with-codex-conversation-role\agent-control"
$lines = (netstat -ano -p tcp | Select-String "LISTENING" | Select-String ":8788 ")
foreach ($line in $lines) {
  $parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
  $procId = $parts[-1]
  if ($procId -and $procId -ne "0") { taskkill /PID $procId /T /F | Out-Null }
}
Start-Sleep -Seconds 2
Start-Process -FilePath "node" -ArgumentList "services/api/src/server.mjs" `
  -WorkingDirectory $proj -WindowStyle Hidden `
  -RedirectStandardOutput "$proj\epicgram-api.out.log" `
  -RedirectStandardError  "$proj\epicgram-api.err.log"
Write-Output "api-restarted"
