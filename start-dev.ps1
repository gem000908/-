$ErrorActionPreference = "Stop"

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$node = $null
if ($nodeCommand) {
  $node = $nodeCommand.Source
}
if (-not $node) {
  $bundled = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path $bundled) {
    $node = $bundled
  }
}

if (-not $node) {
  throw "Node.js was not found. Install Node.js or run inside the Codex desktop environment."
}

& $node scripts/dev-server.mjs
