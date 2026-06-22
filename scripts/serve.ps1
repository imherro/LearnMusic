param(
    [int]$Port = 8200
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root
python .\scripts\server.py --port $Port --host 127.0.0.1
