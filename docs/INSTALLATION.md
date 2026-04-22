# Installation Guide

Complete installation guide for NeoCode on all supported platforms.

---

## Table of Contents

- [System Requirements](#system-requirements)
- [Quick Installation](#quick-installation)
- [Platform-Specific Instructions](#platform-specific-instructions)
  - [Windows](#windows)
  - [macOS](#macos)
  - [Linux](#linux)
  - [Android](#android)
- [Provider Setup](#provider-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Node.js** | ≥ 20.0.0 |
| **npm** | ≥ 9.0.0 (or yarn/pnpm equivalent) |
| **Disk Space** | 500 MB free |
| **RAM** | 2 GB minimum, 4 GB recommended |
| **OS** | Windows 10+, macOS 11+, Linux (Ubuntu 20.04+, Debian 11+, Fedora 35+) |

### Optional Dependencies

| Tool | Purpose | Installation |
|------|---------|--------------|
| **ripgrep** | Fast file search (required for Grep tool) | See [ripgrep installation](#installing-ripgrep) |
| **Bun** | Fast build system and test runner | `npm install -g bun` |
| **Ollama** | Local AI model hosting | See [Ollama installation](#installing-ollama) |
| **Git** | Version control integration | See [Git installation](#installing-git) |

---

## Quick Installation

### Global Installation (Recommended)

```bash
npm install -g @neocode/cli
```

### Verify Installation

```bash
neocode --version
```

### First Run

```bash
neocode
```

On first run, NeoCode will:
1. Create configuration directories (`~/.claude/`)
2. Check for required dependencies
3. Prompt for provider setup (or skip with Ctrl+C)

---

## Platform-Specific Instructions

### Windows

#### Prerequisites

1. **Install Node.js**
   - Download from [nodejs.org](https://nodejs.org/)
   - Or use `winget install OpenJS.NodeJS`
   - Verify: `node --version` (should be ≥ 20.0.0)

2. **Install ripgrep**
   ```powershell
   winget install BurntSushi.ripgrep.MSVC
   ```

3. **Install NeoCode**
   ```powershell
   npm install -g @neocode/cli
   ```

#### Windows-Specific Notes

- Use PowerShell or Windows Terminal (not cmd.exe)
- Some ANSI colors may not render in older terminals
- Git Bash is supported but PowerShell is recommended

#### Installing Ollama (Optional)

```powershell
winget install Ollama.Ollama
```

Verify Ollama is running:
```powershell
ollama --version
ollama serve
```

---

### macOS

#### Prerequisites

1. **Install Homebrew** (if not installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js**
   ```bash
   brew install node
   ```

3. **Install ripgrep**
   ```bash
   brew install ripgrep
   ```

4. **Install NeoCode**
   ```bash
   npm install -g @neocode/cli
   ```

#### Installing Ollama (Optional)

```bash
brew install ollama
ollama serve
```

In a new terminal:
```bash
ollama pull llama3.1:8b
ollama pull qwen2.5-coder:7b
```

---

### Linux

#### Ubuntu / Debian

1. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install ripgrep**
   ```bash
   sudo apt install ripgrep
   ```

3. **Install NeoCode**
   ```bash
   sudo npm install -g @neocode/cli
   ```

#### Fedora / RHEL / CentOS

1. **Install Node.js**
   ```bash
   sudo dnf install nodejs
   ```

2. **Install ripgrep**
   ```bash
   sudo dnf install ripgrep
   ```

3. **Install NeoCode**
   ```bash
   sudo npm install -g @neocode/cli
   ```

#### Arch Linux

1. **Install Node.js**
   ```bash
   sudo pacman -S nodejs npm
   ```

2. **Install ripgrep**
   ```bash
   sudo pacman -S ripgrep
   ```

3. **Install NeoCode**
   ```bash
   sudo npm install -g @neocode/cli
   ```

#### Installing Ollama (Optional)

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
```

---

### Android

See [ANDROID_INSTALL.md](../ANDROID_INSTALL.md) for detailed Android installation instructions using Termux.

---

## Provider Setup

After installation, configure your AI provider.

### Option 1: Interactive Setup (Recommended)

```bash
neocode
```

Inside NeoCode, run:
```
/provider
```

Follow the interactive prompts to:
- Select provider (OpenAI, Gemini, Ollama, etc.)
- Enter API key (if required)
- Choose model
- Save profile to `.neocode-profile.json`

### Option 2: Environment Variables

#### OpenAI

**macOS / Linux:**
```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o
```

**Windows PowerShell:**
```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_API_KEY="sk-your-key-here"
$env:OPENAI_MODEL="gpt-4o"
```

#### Ollama (Local)

**macOS / Linux:**
```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=qwen2.5-coder:7b
```

**Windows PowerShell:**
```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_BASE_URL="http://localhost:11434/v1"
$env:OPENAI_MODEL="qwen2.5-coder:7b"
```

#### Gemini

**macOS / Linux:**
```bash
export GEMINI_API_KEY=your-key-here
export GEMINI_MODEL=gemini-2.0-flash-exp
```

**Windows PowerShell:**
```powershell
$env:GEMINI_API_KEY="your-key-here"
$env:GEMINI_MODEL="gemini-2.0-flash-exp"
```

### Option 3: Profile Files

Create `.neocode-profile.json` in your project directory:

```json
{
  "provider": "ollama",
  "baseURL": "http://localhost:11434/v1",
  "model": "qwen2.5-coder:7b",
  "apiKey": ""
}
```

Or for OpenAI:

```json
{
  "provider": "openai",
  "baseURL": "https://api.openai.com/v1",
  "model": "gpt-4o",
  "apiKey": "sk-your-key-here"
}
```

---

## Installing ripgrep

ripgrep is required for the Grep tool functionality.

### Windows

```powershell
winget install BurntSushi.ripgrep.MSVC
```

Or download from [GitHub Releases](https://github.com/BurntSushi/ripgrep/releases)

### macOS

```bash
brew install ripgrep
```

### Linux

**Ubuntu/Debian:**
```bash
sudo apt install ripgrep
```

**Fedora:**
```bash
sudo dnf install ripgrep
```

**Arch:**
```bash
sudo pacman -S ripgrep
```

### Verification

```bash
rg --version
```

---

## Installing Ollama

Ollama enables local AI model hosting.

### Windows

```powershell
winget install Ollama.Ollama
```

### macOS

```bash
brew install ollama
```

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Starting Ollama

```bash
ollama serve
```

### Recommended Models

```bash
# Fast, general-purpose (3B parameters)
ollama pull llama3.2:3b

# Better coding quality (7B parameters)
ollama pull qwen2.5-coder:7b

# Advanced coding (14B parameters, requires more RAM)
ollama pull qwen2.5-coder:14b

# General-purpose (8B parameters)
ollama pull llama3.1:8b
```

---

## Installing Git

Git is required for version control integration.

### Windows

```powershell
winget install Git.Git
```

### macOS

```bash
brew install git
```

### Linux

**Ubuntu/Debian:**
```bash
sudo apt install git
```

**Fedora:**
```bash
sudo dnf install git
```

---

## Verification

### Check Installation

```bash
neocode --version
neocode --help
```

### Run Diagnostics

```bash
neocode
```

Inside NeoCode:
```
/doctor
```

This checks:
- Node.js version
- Required dependencies (ripgrep)
- Provider configuration
- Network connectivity (for cloud providers)
- File system permissions

### Run Test Query

```
Tell me about NeoCode's features
```

If you see a streaming response, your installation is working correctly.

---

## Troubleshooting

### "neocode: command not found"

**Cause:** npm global bin directory not in PATH

**Fix (macOS/Linux):**
```bash
echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> ~/.bashrc
source ~/.bashrc
```

**Fix (Windows PowerShell):**
```powershell
$env:PATH += ";$(npm config get prefix)"
```

### "ripgrep not found"

**Cause:** ripgrep not installed or not in PATH

**Fix:** Install ripgrep using platform-specific instructions above, then restart terminal

### "OPENAI_API_KEY is required"

**Cause:** No provider configured

**Fix:** Run `/provider` inside NeoCode or set environment variables (see [Provider Setup](#provider-setup))

### "Failed to connect to Ollama"

**Cause:** Ollama service not running

**Fix:**
```bash
ollama serve
```

In a new terminal:
```bash
neocode
```

### "Permission denied" on macOS/Linux

**Cause:** Missing execute permissions

**Fix:**
```bash
sudo npm install -g @neocode/cli
```

Or use a version manager like `nvm` to avoid sudo:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
npm install -g @neocode/cli
```

### Windows Antivirus Blocking

Some antivirus software may block NeoCode's file operations.

**Fix:** Add NeoCode to your antivirus exceptions:
- Location: `%APPDATA%\npm\node_modules\@neocode`

### Terminal Colors Not Working

**Windows:** Use Windows Terminal or PowerShell 7+

**macOS/Linux:** Use a modern terminal emulator with 256-color support

---

## Uninstallation

### Remove NeoCode

```bash
npm uninstall -g @neocode/cli
```

### Remove Configuration Files

**macOS/Linux:**
```bash
rm -rf ~/.claude
rm -rf ~/.neocode
```

**Windows:**
```powershell
Remove-Item -Recurse -Force $env:USERPROFILE\.claude
Remove-Item -Recurse -Force $env:USERPROFILE\.neocode
```

### Remove Project Profiles

Delete `.neocode-profile.json` from project directories:

```bash
find . -name ".neocode-profile.json" -delete
```

---

## Next Steps

After installation:

1. **Read the [User Guide](USER_GUIDE.md)** - Learn how to use NeoCode effectively
2. **Explore [Commands](COMMANDS.md)** - Discover all slash commands
3. **Configure Providers** - Set up multiple providers for different use cases
4. **Join the [Community](https://github.com/LHenri88/NeoCode/discussions)** - Get help and share feedback

---

**Need Help?** Open an issue on [GitHub](https://github.com/LHenri88/NeoCode/issues) or join our [Discussions](https://github.com/LHenri88/NeoCode/discussions)
