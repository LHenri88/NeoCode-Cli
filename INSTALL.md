# 📦 NeoCode Installation Guide

## ⚡ Quick Install (Recommended)

The fastest way to install NeoCode is using our **standalone binaries** - no Node.js required!

### Windows

```powershell
irm https://raw.githubusercontent.com/LHenri88/NeoCode/main/install-standalone.ps1 | iex
```

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/LHenri88/NeoCode/main/install-standalone.sh | bash
```

### ✅ What This Does:

1. Auto-detects your platform (Windows/Linux/macOS, x64/ARM64)
2. Downloads the latest release from GitHub
3. Installs to a system directory
4. Adds to your PATH automatically
5. Tests the installation

After installation, simply run:
```bash
neocode
```

---

## 📥 Manual Download

If you prefer to download manually:

1. Go to [Latest Release](https://github.com/LHenri88/NeoCode-Cli/releases/latest)
2. Download the binary for your platform:
   - **Windows:** `neocode-windows-x64.exe`
   - **Linux:** `neocode-linux-x64`
   - **macOS Intel:** `neocode-macos-x64`
   - **macOS Apple Silicon:** `neocode-macos-arm64`

3. Make executable (Linux/macOS):
   ```bash
   chmod +x neocode-*
   ```

4. Move to a directory in PATH:
   ```bash
   # Linux/macOS
   sudo mv neocode-* /usr/local/bin/neocode

   # Windows - copy to a folder in PATH, e.g.:
   move neocode-windows-x64.exe C:\Windows\System32\neocode.exe
   ```

5. Run:
   ```bash
   neocode --version
   ```

---

## 🛠️ Build from Source (Developers)

For developers who want to build from source:

### Prerequisites

- [Bun](https://bun.sh/) v1.0.0 or later
- [Git](https://git-scm.com/)
- [ripgrep](https://github.com/BurntSushi/ripgrep) (runtime dependency)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/LHenri88/NeoCode-Cli.git
cd NeoCode-Cli

# 2. Install dependencies
bun install

# 3. Build the distribution
bun run build

# 4. Run locally
node dist/cli.mjs

# Or create an alias
alias neocode='node /path/to/NeoCode-Cli/dist/cli.mjs'
```

### Build Standalone Binaries

```bash
# Build for all platforms
bun run build:standalone:all

# Build for specific platform
bun run build:standalone:windows
bun run build:standalone:linux
bun run build:standalone:macos

# Binaries will be in: ./bin-standalone/
```

See [STANDALONE_BUILD.md](STANDALONE_BUILD.md) for detailed build instructions.

---

## 🔧 Install ripgrep (Required Dependency)

NeoCode requires `ripgrep` for fast code searching. Install it:

### Windows
```powershell
winget install BurntSushi.ripgrep.MSVC
```

Or download from: https://github.com/BurntSushi/ripgrep/releases

### macOS
```bash
brew install ripgrep
```

### Linux (Ubuntu/Debian)
```bash
sudo apt install ripgrep
```

### Linux (Fedora/RHEL)
```bash
sudo dnf install ripgrep
```

### Linux (Arch)
```bash
sudo pacman -S ripgrep
```

---

## ✅ Verify Installation

After installing, verify it works:

```bash
# Check version
neocode --version

# Should output something like:
# 0.1.9 (NeoCode)

# Run help
neocode --help

# Start NeoCode
neocode
```

---

## 🚀 First Run Setup

When you first run NeoCode, you'll need to configure an AI provider:

```bash
neocode
```

Inside NeoCode:
- Run `/provider` for guided setup
- Run `/help` to see all commands
- Run `/onboard-github` for GitHub Models setup

### Quick OpenAI Setup

**Linux/macOS:**
```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o
neocode
```

**Windows PowerShell:**
```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_API_KEY="sk-your-key-here"
$env:OPENAI_MODEL="gpt-4o"
neocode
```

### Quick Ollama Setup (Local)

**Linux/macOS:**
```bash
export CLAUDE_CODE_USE_OLLAMA=1
export OLLAMA_MODEL=llama3.1:latest
neocode
```

**Windows PowerShell:**
```powershell
$env:CLAUDE_CODE_USE_OLLAMA="1"
$env:OLLAMA_MODEL="llama3.1:latest"
neocode
```

---

## 🐛 Troubleshooting

### "ripgrep not found"
Install ripgrep (see [Install ripgrep](#-install-ripgrep-required-dependency) above)

### "Permission denied" (Linux/macOS)
```bash
chmod +x /usr/local/bin/neocode
```

### "Command not found: neocode"
Make sure the install directory is in your PATH:

**Linux/macOS:**
```bash
# Check PATH
echo $PATH

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$HOME/.local/bin"
```

**Windows:**
- The PowerShell installer should add to PATH automatically
- If not, manually add the install directory to your PATH in System Settings

### Binary won't run on macOS (Security Warning)
```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine /usr/local/bin/neocode
```

### Installer fails to download
Check your internet connection and try manual download from:
https://github.com/LHenri88/NeoCode-Cli/releases/latest

---

## 🆘 Getting Help

- **Documentation:** [README.md](README.md)
- **Build Guide:** [STANDALONE_BUILD.md](STANDALONE_BUILD.md)
- **Issues:** [GitHub Issues](https://github.com/LHenri88/NeoCode-Cli/issues)
- **Discussions:** [GitHub Discussions](https://github.com/LHenri88/NeoCode-Cli/discussions)

---

## 🔄 Updating NeoCode

To update to the latest version:

**Using Installer (Recommended):**
```bash
# Just run the installer again - it will overwrite with latest version
curl -fsSL https://raw.githubusercontent.com/LHenri88/NeoCode/main/install-standalone.sh | bash
```

**Manual Update:**
1. Download latest release
2. Replace existing binary
3. Done!

---

**Happy Coding with NeoCode!** 🚀
