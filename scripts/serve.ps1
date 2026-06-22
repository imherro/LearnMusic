param(
    [int]$Port = 8200
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root
python -m http.server $Port --bind 127.0.0.1
