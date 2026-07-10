$ErrorActionPreference = "Stop"

# Resolve workspace root from this script's location (ops/ lives at the workspace
# root). Works on any machine without depending on caller cwd.
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $root ".env.local"

Set-Location $root

$secure = Read-Host -Prompt "TYPE OPERATOR PASSWORD NOW" -AsSecureString
$plain = (New-Object System.Net.NetworkCredential("", $secure)).Password

if ([string]::IsNullOrWhiteSpace($plain)) {
  throw "Operator password is empty. Run again and type a real password when prompted."
}

try {
  $env:EPICGRAM_OPERATOR_PASSWORD = $plain

  $hash = (& node ".\scripts\create-operator-hash.mjs").Trim()

  if (-not ($hash -like "scrypt:*")) {
    throw "Hash generation failed or returned unexpected output."
  }

  $line = "EPICGRAM_OPERATOR_PASSWORD_SCRYPT=$hash"

  if (Test-Path $envPath) {
    $lines = Get-Content $envPath
  } else {
    $lines = @()
  }

  $found = $false
  $newLines = foreach ($l in $lines) {
    if ($l -match "^EPICGRAM_OPERATOR_PASSWORD_SCRYPT=") {
      $found = $true
      $line
    } else {
      $l
    }
  }

  if (-not $found) {
    $newLines = @($newLines) + $line
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllLines($envPath, [string[]]$newLines, $utf8NoBom)

  "env path                  : $envPath"
  "hash line written          : " + [bool]((Get-Content $envPath) -match "^EPICGRAM_OPERATOR_PASSWORD_SCRYPT=scrypt:")
  "env file last write time   : " + (Get-Item $envPath).LastWriteTime
}
finally {
  Remove-Item Env:EPICGRAM_OPERATOR_PASSWORD -ErrorAction SilentlyContinue
  $plain = $null
  $secure = $null
  $hash = $null
}
