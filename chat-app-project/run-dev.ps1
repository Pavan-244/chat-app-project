<#
Run both backend and frontend dev servers in separate PowerShell windows.

Usage:
  .\run-dev.ps1           # starts both servers (assumes dependencies already installed)
  .\run-dev.ps1 -Install # runs `npm install` in each folder before `npm start`

This script opens two new `pwsh` windows so logs remain visible and servers keep running.
#>
param(
  [switch]$Install
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'

function Start-Window($path, $name) {
  if ($Install) {
    $cmd = "Set-Location -LiteralPath '$path'; npm install; npm start"
  } else {
    $cmd = "Set-Location -LiteralPath '$path'; npm start"
  }
  Write-Host "Starting $name in new pwsh window: $path"
  Start-Process -FilePath pwsh -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Normal
}

Start-Window $backendPath 'backend'
Start-Sleep -Milliseconds 500
Start-Window $frontendPath 'frontend'

Write-Host "Launched backend and frontend. Close the opened pwsh windows to stop the servers." 
