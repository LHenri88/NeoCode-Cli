# NeoCode Requirements

Complete documentation of system requirements, dependencies, and compatibility.

---

## Table of Contents

- [System Requirements](#system-requirements)
- [Runtime Dependencies](#runtime-dependencies)
- [Optional Dependencies](#optional-dependencies)
- [Development Dependencies](#development-dependencies)
- [Platform Compatibility](#platform-compatibility)
- [Provider Requirements](#provider-requirements)
- [Hardware Recommendations](#hardware-recommendations)

---

## System Requirements

### Minimum Requirements

| Component | Requirement | Notes |
|-----------|-------------|-------|
| **Operating System** | Windows 10+, macOS 11+, Linux (kernel 4.15+) | See [Platform Compatibility](#platform-compatibility) |
| **Node.js** | ≥ 20.0.0 | LTS recommended |
| **npm** | ≥ 9.0.0 | Or equivalent (yarn, pnpm, bun) |
| **Disk Space** | 500 MB free | + model storage for Ollama |
| **RAM** | 2 GB | 4 GB recommended, 8 GB+ for local models |
| **Internet** | Required for cloud providers | Optional for local Ollama |

### Recommended Requirements

| Component | Recommendation | Benefit |
|-----------|----------------|---------|
| **RAM** | 8 GB+ | Better performance with local models |
| **CPU** | 4+ cores | Faster multi-agent operations |
| **SSD** | Yes | Improved I/O performance |
| **GPU** | NVIDIA CUDA or Apple Silicon | Accelerated local model inference |
| **Terminal** | Modern with 256-color support | Better visual experience |

---

## Runtime Dependencies

### Required

These dependencies are **required** for NeoCode to function:

#### 1. Node.js (≥ 20.0.0)

**Why:** JavaScript runtime for NeoCode

**Installation:**

- **Windows:** [nodejs.org](https://nodejs.org/) or `winget install OpenJS.NodeJS`
- **macOS:** `brew install node`
- **Linux:** `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install nodejs`

**Verify:**
```bash
node --version
```

#### 2. npm (≥ 9.0.0)

**Why:** Package manager (included with Node.js)

**Verify:**
```bash
npm --version
```

### Recommended

These dependencies are **recommended** for full functionality:

#### 3. ripgrep

**Why:** Fast file search (required for Grep tool)

**Installation:**

- **Windows:** `winget install BurntSushi.ripgrep.MSVC`
- **macOS:** `brew install ripgrep`
- **Linux:** `sudo apt install ripgrep` (Ubuntu/Debian) or `sudo dnf install ripgrep` (Fedora)

**Verify:**
```bash
rg --version
```

**Fallback:** NeoCode works without ripgrep but Grep tool will be disabled

---

## Optional Dependencies

These dependencies enable specific features but are not required:

### 1. Ollama (Local AI)

**Why:** Run AI models locally without API keys

**Installation:**

- **Windows:** `winget install Ollama.Ollama`
- **macOS:** `brew install ollama`
- **Linux:** `curl -fsSL https://ollama.com/install.sh | sh`

**Verify:**
```bash
ollama --version
ollama serve
```

**Recommended Models:**
```bash
ollama pull llama3.2:3b           # Fast (1.5 GB)
ollama pull qwen2.5-coder:7b      # Coding (4.7 GB)
ollama pull llama3.1:8b           # General (4.7 GB)
ollama pull qwen2.5-coder:14b     # Advanced (8.2 GB)
```

**Disk Space:** Models range from 1.5 GB to 8+ GB

---

### 2. Git

**Why:** Version control integration, diff/status commands

**Installation:**

- **Windows:** `winget install Git.Git`
- **macOS:** `brew install git` (or use Xcode Command Line Tools)
- **Linux:** `sudo apt install git`

**Verify:**
```bash
git --version
```

**Fallback:** NeoCode works without git but git-related commands disabled

---

### 3. Docker (For Sandboxing)

**Why:** Isolate bash commands in containers

**Installation:**

- **Windows:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **macOS:** `brew install --cask docker`
- **Linux:** `sudo apt install docker.io`

**Verify:**
```bash
docker --version
docker ps
```

**Platform Support:**
- ✅ macOS, Linux, WSL2
- ❌ Windows native, WSL1

**Fallback:** Sandboxing disabled without Docker

---

### 4. SoX (Voice Input - Linux)

**Why:** Audio recording for voice input on Linux

**Installation:**

- **Linux:** `sudo apt install sox libsox-fmt-all`

**Verify:**
```bash
sox --version
```

**Platform Notes:**
- **Windows:** Uses built-in System.Speech
- **macOS:** Uses native recording tools
- **Linux:** Requires SoX

---

### 5. Firecrawl API (Enhanced Web)

**Why:** Better web search and JavaScript-rendered page scraping

**Setup:**
```bash
export FIRECRAWL_API_KEY=your-key-here
```

**Get Key:** [firecrawl.dev](https://firecrawl.dev) (free tier: 500 credits)

**Fallback:** DuckDuckGo scraping (rate-limited)

---

## Development Dependencies

Required only for building from source or contributing:

| Dependency | Version | Purpose |
|------------|---------|---------|
| **Bun** | ≥ 1.2 | Build system & test runner |
| **TypeScript** | 5.9.3 | Type checking |
| **tsx** | Latest | TypeScript execution |

**Installation:**
```bash
npm install -g bun
```

**Verify:**
```bash
bun --version
```

---

## Platform Compatibility

### Windows

| Version | Status | Notes |
|---------|--------|-------|
| **Windows 11** | ✅ Fully Supported | Recommended |
| **Windows 10** | ✅ Fully Supported | Build 19041+ |
| **Windows 8.1** | ⚠️ Limited | Not tested |
| **WSL2** | ✅ Fully Supported | Linux tools available |
| **WSL1** | ⚠️ Limited | No sandboxing |

**Recommended Terminal:**
- Windows Terminal (recommended)
- PowerShell 7+
- Git Bash

**Not Recommended:**
- cmd.exe (limited ANSI color support)

---

### macOS

| Version | Status | Notes |
|---------|--------|-------|
| **macOS 14 (Sonoma)** | ✅ Fully Supported | Recommended |
| **macOS 13 (Ventura)** | ✅ Fully Supported | |
| **macOS 12 (Monterey)** | ✅ Fully Supported | |
| **macOS 11 (Big Sur)** | ✅ Supported | Minimum |
| **macOS 10.15** | ⚠️ Limited | Not tested |

**Apple Silicon:**
- ✅ Native ARM64 support
- ✅ Accelerated Ollama inference
- ✅ Atomic Chat integration

**Intel Mac:**
- ✅ Fully supported
- Ollama runs on CPU (slower)

---

### Linux

| Distribution | Version | Status | Notes |
|--------------|---------|--------|-------|
| **Ubuntu** | 20.04+ | ✅ Fully Supported | Recommended |
| **Debian** | 11+ | ✅ Fully Supported | |
| **Fedora** | 35+ | ✅ Supported | |
| **Arch Linux** | Rolling | ✅ Supported | |
| **CentOS/RHEL** | 8+ | ✅ Supported | |
| **Pop!_OS** | 20.04+ | ✅ Supported | |
| **Linux Mint** | 20+ | ✅ Supported | |

**Kernel Requirements:**
- Kernel 4.15+ (for full Docker support)
- Kernel 5.0+ recommended

**Desktop Environments:**
- All major DEs supported (GNOME, KDE, XFCE, etc.)
- Headless/server environments supported

---

### Android (Termux)

| Device | Status | Notes |
|--------|--------|-------|
| **Android 10+** | ✅ Supported | Via Termux |
| **Android 7-9** | ⚠️ Limited | May have issues |

**Requirements:**
- Termux app
- Node.js in Termux
- 2 GB free storage

See [ANDROID_INSTALL.md](../ANDROID_INSTALL.md) for setup.

---

## Provider Requirements

### Cloud Providers

#### OpenAI

| Requirement | Details |
|-------------|---------|
| **API Key** | Required |
| **Internet** | Required |
| **Minimum Plan** | Pay-as-you-go |
| **Models** | gpt-4o, gpt-4o-mini, gpt-3.5-turbo, etc. |

**Environment Variables:**
```bash
CLAUDE_CODE_USE_OPENAI=1
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o
```

---

#### Gemini

| Requirement | Details |
|-------------|---------|
| **API Key** | Required (or access token/ADC) |
| **Internet** | Required |
| **Google Account** | Required |
| **Models** | gemini-2.0-flash-exp, gemini-1.5-pro, etc. |

**Environment Variables:**
```bash
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.0-flash-exp
```

---

#### OpenRouter / DeepSeek / Groq

| Requirement | Details |
|-------------|---------|
| **API Key** | Required |
| **Internet** | Required |
| **Base URL** | Provider-specific |

**Environment Variables:**
```bash
CLAUDE_CODE_USE_OPENAI=1
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=model-name
```

---

### Local Providers

#### Ollama

| Requirement | Details |
|-------------|---------|
| **API Key** | Not required |
| **Internet** | Only for model downloads |
| **Disk Space** | 1.5 GB - 20 GB per model |
| **RAM** | 4 GB minimum, 8 GB+ recommended |
| **GPU** | Optional (NVIDIA CUDA or Apple Silicon) |

**Minimum Hardware:**
- **3B models:** 4 GB RAM, any CPU
- **7B models:** 8 GB RAM, multi-core CPU
- **14B+ models:** 16 GB RAM, GPU recommended

**Environment Variables:**
```bash
CLAUDE_CODE_USE_OPENAI=1
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=qwen2.5-coder:7b
```

---

#### LM Studio / Jan / Other Local

| Requirement | Details |
|-------------|---------|
| **API Key** | Usually not required |
| **Internet** | Only for model downloads |
| **Disk Space** | Varies by model |
| **Compatible API** | OpenAI `/v1` format |

---

## Hardware Recommendations

### For Cloud Providers (OpenAI, Gemini, etc.)

| Use Case | RAM | CPU | Disk | Internet |
|----------|-----|-----|------|----------|
| **Light Use** | 2 GB | 2 cores | 500 MB | 5 Mbps |
| **Regular Use** | 4 GB | 2 cores | 1 GB | 10 Mbps |
| **Heavy Use** | 8 GB | 4 cores | 2 GB | 25 Mbps |

---

### For Local Ollama

| Model Size | RAM | CPU | GPU | Disk | Inference Speed |
|------------|-----|-----|-----|------|-----------------|
| **3B (llama3.2:3b)** | 4 GB | 2 cores | Optional | 1.5 GB | Fast |
| **7B (qwen2.5-coder:7b)** | 8 GB | 4 cores | Recommended | 4.7 GB | Medium |
| **14B (qwen2.5-coder:14b)** | 16 GB | 8 cores | Recommended | 8.2 GB | Slower |
| **70B+** | 32 GB+ | 16 cores | Required | 40+ GB | Slow (GPU required) |

**GPU Acceleration:**
- **NVIDIA:** CUDA 11.8+ with 6 GB+ VRAM
- **Apple Silicon:** Metal (built-in)
- **AMD:** ROCm (limited support)

---

## Dependency Summary

### Minimum Setup (Cloud Provider)

```
✅ Node.js ≥ 20.0.0
✅ npm ≥ 9.0.0
✅ API key (OpenAI/Gemini/etc.)
✅ Internet connection
✅ 500 MB disk space
✅ 2 GB RAM
```

---

### Recommended Setup (Full Features)

```
✅ Node.js ≥ 20.0.0
✅ npm ≥ 9.0.0
✅ ripgrep
✅ Git
✅ Ollama with models
✅ Docker (for sandboxing)
✅ 8 GB RAM
✅ 20 GB disk space (with models)
```

---

### Development Setup

```
✅ Node.js ≥ 20.0.0
✅ Bun ≥ 1.2
✅ TypeScript 5.9.3
✅ Git
✅ ripgrep
✅ All dependencies from package.json
✅ 4 GB RAM
✅ 5 GB disk space
```

---

## Checking Requirements

### Run System Diagnostics

```bash
neocode
```

Then inside NeoCode:
```
/doctor
```

This checks:
- ✅ Node.js version
- ✅ npm version
- ✅ ripgrep installation
- ✅ Git installation
- ✅ Provider configuration
- ✅ Network connectivity
- ✅ Disk space
- ✅ Memory usage

---

### Manual Checks

```bash
# Node.js
node --version    # Should be ≥ 20.0.0

# npm
npm --version     # Should be ≥ 9.0.0

# ripgrep
rg --version      # Should show version

# Git
git --version     # Should show version

# Ollama (if using)
ollama --version  # Should show version
ollama list       # Show installed models

# Docker (if using sandboxing)
docker --version  # Should show version
docker ps         # Should connect
```

---

## Troubleshooting Requirements

### Node.js Version Too Old

**Error:** `Node version 18.x.x is not supported. Please use 20.0.0 or higher.`

**Solution:**
```bash
# Install Node 20 LTS
# macOS
brew install node@20

# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Windows
winget install OpenJS.NodeJS.LTS
```

---

### Missing ripgrep

**Error:** `ripgrep not found`

**Solution:** See [Installation Guide - ripgrep](INSTALLATION.md#installing-ripgrep)

---

### Insufficient Disk Space

**Error:** `ENOSPC: no space left on device`

**Solution:**
- Free up disk space (at least 500 MB)
- For Ollama: 5-20 GB needed for models
- Clear npm cache: `npm cache clean --force`

---

### Insufficient RAM

**Symptoms:** Slow performance, crashes, "Out of memory" errors

**Solution:**
- Use smaller models (llama3.2:3b instead of 7B+)
- Close other applications
- Use cloud providers instead of local Ollama
- Increase swap space (Linux)

---

## Next Steps

After verifying requirements:

1. **Install NeoCode** - See [Installation Guide](INSTALLATION.md)
2. **Configure Provider** - See [User Guide - Provider Setup](USER_GUIDE.md#provider-management)
3. **Run Diagnostics** - Run `/doctor` inside NeoCode
4. **Start Coding** - See [User Guide](USER_GUIDE.md)

---

**Questions?** Check [Troubleshooting](USER_GUIDE.md#troubleshooting) or open a [GitHub Discussion](https://github.com/LHenri88/NeoCode/discussions)
