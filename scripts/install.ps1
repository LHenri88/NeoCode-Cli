# NeoCode Universal Installer for Windows (E5.1)
# Usage: irm https://get.neocode.dev/install.ps1 | iex
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Version = if ($env:NEOCODE_VERSION) { $env:NEOCODE_VERSION } else { 'latest' }

function Write-Ok($msg)   { Write-Host "  " -NoNewline; Write-Host "[OK]" -ForegroundColor Green -NoNewline; Write-Host " $msg" }
function Write-Info($msg) { Write-Host "  " -NoNewline; Write-Host " -> " -ForegroundColor Cyan -NoNewline; Write-Host " $msg" }
function Write-Warn($msg) { Write-Host "  " -NoNewline; Write-Host " !  " -ForegroundColor Yellow -NoNewline; Write-Host " $msg" }
function Write-Fail($msg) { Write-Host "  " -NoNewline; Write-Host "[X]" -ForegroundColor Red -NoNewline; Write-Host " $msg"; exit 1 }

Write-Host ""
Write-Host "NeoCode Installer ($Version)" -ForegroundColor White
Write-Host ("─" * 40)

# Allow running this script
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# ── Node.js ──────────────────────────────────────────────────────────────────
$nodeOk = $false
try {
    $nodeVer = (node --version 2>$null)
    $major = [int]($nodeVer -replace 'v(\d+)\..*', '$1')
    if ($major -ge 18) { $nodeOk = $true }
} catch {}

if (-not $nodeOk) {
    Write-Info "Installing Node.js 20 via winget..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -h
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nodejs-lts -y
    } else {
        Write-Fail "Neither winget nor chocolatey found. Install Node 20+ from https://nodejs.org"
    }
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                [System.Environment]::GetEnvironmentVariable('Path','User')
}
Write-Ok "Node.js $(node --version)"

# ── Ollama (optional) ─────────────────────────────────────────────────────────
$ollamaInstalled = $null -ne (Get-Command ollama -ErrorAction SilentlyContinue)
if (-not $ollamaInstalled) {
    $ans = Read-Host "  Install Ollama (local AI, free)? [Y/n]"
    if ($ans -eq '' -or $ans -match '^[Yy]') {
        Write-Info "Installing Ollama via winget..."
        winget install Ollama.Ollama --accept-source-agreements --accept-package-agreements -h
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                    [System.Environment]::GetEnvironmentVariable('Path','User')
        Write-Info "Pulling qwen2.5-coder:7b (~4 GB)..."
        try { ollama pull qwen2.5-coder:7b } catch { Write-Warn "Model pull failed — run 'ollama pull qwen2.5-coder:7b' later" }
    }
} else {
    Write-Ok "Ollama found"
}

# ── NeoCode ───────────────────────────────────────────────────────────────────
Write-Info "Installing NeoCode..."
$pkg = if ($Version -eq 'latest') { 'git+https://github.com/LHenri88/NeoCode-Cli.git' } else { "git+https://github.com/LHenri88/NeoCode-Cli.git#$Version" }
npm install -g $pkg
Write-Ok "NeoCode $(neocode --version)"

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "  Run: neocode"
Write-Host "  Docs: https://github.com/neocode-dev/neocode#readme"
Write-Host ""
