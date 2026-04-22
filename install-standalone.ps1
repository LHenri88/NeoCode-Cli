#
# NeoCode Standalone Binary Installer for Windows
# Quick install script for Windows PowerShell
#
# Usage:
#   irm https://raw.githubusercontent.com/Gitlawb/NeoCode/main/install-standalone.ps1 | iex
#   or
#   iwr -useb https://raw.githubusercontent.com/Gitlawb/NeoCode/main/install-standalone.ps1 | iex
#

$ErrorActionPreference = 'Stop'

# Configuration
$Repo = "Gitlawb/NeoCode"
$InstallDir = "$env:LOCALAPPDATA\NeoCode"
$BinaryName = "neocode.exe"
$BinaryFile = "neocode-windows-x64.exe"

# Colors
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Header
function Show-Header {
    Write-ColorOutput "╔═══════════════════════════════════════════════╗" "Green"
    Write-ColorOutput "║  NeoCode Standalone Binary Installer         ║" "Green"
    Write-ColorOutput "╚═══════════════════════════════════════════════╝" "Green"
    Write-Host ""
}

# Get latest release version
function Get-LatestVersion {
    Write-ColorOutput "Fetching latest release..." "Blue"

    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
        $version = $response.tag_name

        if ([string]::IsNullOrEmpty($version)) {
            throw "Could not fetch latest version"
        }

        Write-ColorOutput "Latest version: $version" "Green"
        return $version
    }
    catch {
        Write-ColorOutput "Error: Could not fetch latest version" "Red"
        Write-ColorOutput $_.Exception.Message "Red"
        exit 1
    }
}

# Download binary
function Download-Binary {
    param([string]$Version)

    $downloadUrl = "https://github.com/$Repo/releases/download/$Version/$BinaryFile"
    $tempFile = "$env:TEMP\$BinaryFile"

    Write-ColorOutput "Download URL: $downloadUrl" "Blue"
    Write-ColorOutput "Downloading NeoCode standalone binary..." "Blue"

    try {
        # Use WebClient for better progress display
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($downloadUrl, $tempFile)

        if (-not (Test-Path $tempFile)) {
            throw "Download failed"
        }

        Write-ColorOutput "Download complete!" "Green"
        return $tempFile
    }
    catch {
        Write-ColorOutput "Error: Download failed" "Red"
        Write-ColorOutput $_.Exception.Message "Red"
        exit 1
    }
}

# Install binary
function Install-Binary {
    param([string]$TempFile)

    Write-ColorOutput "Installing to $InstallDir\$BinaryName..." "Blue"

    # Create install directory if it doesn't exist
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    # Copy binary to install location
    $destination = Join-Path $InstallDir $BinaryName
    Copy-Item -Path $TempFile -Destination $destination -Force

    # Clean up temp file
    Remove-Item $TempFile -Force

    Write-ColorOutput "Installation complete!" "Green"
}

# Add to PATH
function Add-ToPath {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

    if ($currentPath -notlike "*$InstallDir*") {
        Write-ColorOutput "Adding $InstallDir to PATH..." "Yellow"

        $newPath = "$currentPath;$InstallDir"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")

        # Update PATH for current session
        $env:Path = "$env:Path;$InstallDir"

        Write-ColorOutput "✓ Added to PATH" "Green"
        Write-ColorOutput "Note: You may need to restart your terminal for PATH changes to take effect" "Yellow"
    }
    else {
        Write-ColorOutput "$InstallDir is already in PATH" "Green"
    }
}

# Test installation
function Test-Installation {
    Write-ColorOutput "Testing installation..." "Blue"

    $binaryPath = Join-Path $InstallDir $BinaryName

    try {
        $version = & $binaryPath --version 2>&1

        Write-ColorOutput "✓ NeoCode installed successfully!" "Green"
        Write-ColorOutput "Version: $version" "Green"
    }
    catch {
        Write-ColorOutput "Error: Installation test failed" "Red"
        Write-ColorOutput $_.Exception.Message "Red"
        exit 1
    }
}

# Show completion message
function Show-Completion {
    Write-Host ""
    Write-ColorOutput "╔═══════════════════════════════════════════════╗" "Green"
    Write-ColorOutput "║  Installation Complete!                      ║" "Green"
    Write-ColorOutput "╚═══════════════════════════════════════════════╝" "Green"
    Write-Host ""
    Write-ColorOutput "Run NeoCode with:" "Blue"
    Write-ColorOutput "  neocode" "Green"
    Write-Host ""
    Write-ColorOutput "For help:" "Blue"
    Write-ColorOutput "  neocode --help" "Green"
    Write-Host ""
    Write-ColorOutput "Documentation:" "Blue"
    Write-ColorOutput "  https://github.com/$Repo" "Green"
    Write-Host ""
    Write-ColorOutput "Note: If 'neocode' is not found, restart your terminal" "Yellow"
}

# Main installation flow
function Main {
    Show-Header

    Write-ColorOutput "Detected platform: Windows x64" "Blue"

    $version = Get-LatestVersion
    $tempFile = Download-Binary -Version $version
    Install-Binary -TempFile $tempFile

    Write-Host ""
    Add-ToPath

    Write-Host ""
    Test-Installation

    Show-Completion
}

# Run installer
try {
    Main
}
catch {
    Write-ColorOutput "Installation failed!" "Red"
    Write-ColorOutput $_.Exception.Message "Red"
    exit 1
}
