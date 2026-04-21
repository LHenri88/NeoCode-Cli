#!/usr/bin/env bash
# NeoCode Universal Installer (E5.1)
# Usage: curl -fsSL https://get.neocode.dev/install.sh | bash
set -euo pipefail

NEOCODE_VERSION="${NEOCODE_VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

bold() { printf '\033[1m%s\033[0m' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
info() { printf '  \033[36m→\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

echo ""
bold "NeoCode Installer"; echo " (${NEOCODE_VERSION})"
echo "────────────────────────────────────"

# ── OS Detection ─────────────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"
info "Detected: ${OS} / ${ARCH}"

# ── Node.js ──────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || ! node -e "process.exit(parseInt(process.versions.node)>=18?0:1)" 2>/dev/null; then
  info "Installing Node.js 20..."
  case "$OS" in
    Darwin)
      if command -v brew &>/dev/null; then
        brew install node@20 && brew link node@20 --force
      else
        fail "Homebrew not found. Install from https://brew.sh then rerun."
      fi
      ;;
    Linux)
      if command -v apt-get &>/dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
      elif command -v dnf &>/dev/null; then
        sudo dnf install -y nodejs
      elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm nodejs npm
      else
        fail "Unsupported package manager. Install Node 20+ manually."
      fi
      ;;
    *) fail "Unsupported OS: ${OS}" ;;
  esac
fi
NODE_VER="$(node --version)"
ok "Node.js ${NODE_VER}"

# ── Bun (optional, used by NeoCode for fast startup) ─────────────────────────
if ! command -v bun &>/dev/null; then
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
if command -v bun &>/dev/null; then
  ok "Bun $(bun --version)"
fi

# ── Ollama (optional) ─────────────────────────────────────────────────────────
install_ollama() {
  info "Installing Ollama..."
  case "$OS" in
    Darwin) brew install ollama ;;
    Linux)  curl -fsSL https://ollama.com/install.sh | sh ;;
    *)      warn "Auto-install not supported on ${OS}. See https://ollama.com" ;;
  esac
}

if ! command -v ollama &>/dev/null; then
  read -rp "  Install Ollama (local AI, free)? [Y/n] " ans
  if [[ "${ans:-Y}" =~ ^[Yy]$ ]]; then
    install_ollama
    # Pull default coding model
    info "Pulling qwen2.5-coder:7b (≈4 GB)..."
    ollama pull qwen2.5-coder:7b || warn "Model pull failed — run 'ollama pull qwen2.5-coder:7b' later"
  fi
else
  ok "Ollama $(ollama --version 2>/dev/null || echo 'found')"
fi

# ── NeoCode ───────────────────────────────────────────────────────────────────
info "Installing NeoCode..."
if [ "$NEOCODE_VERSION" = "latest" ]; then
  npm install -g git+https://github.com/LHenri88/NeoCode-Cli.git
else
  npm install -g "git+https://github.com/LHenri88/NeoCode-Cli.git#${NEOCODE_VERSION}"
fi
ok "NeoCode $(neocode --version)"

echo ""
bold "Installation complete!"; echo ""
echo "  Run: $(bold 'neocode')"
echo "  Docs: https://github.com/neocode-dev/neocode#readme"
echo ""
