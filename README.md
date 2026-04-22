# NeoCode

**The Next-Generation Agentic CLI for Multi-Provider AI Development**

NeoCode is an open-source, privacy-first coding agent CLI that works with cloud and local AI model providers. Use OpenAI, Gemini, Ollama, Codex, and other backends while keeping one powerful terminal-first workflow with tools, agents, MCP protocol, slash commands, and streaming output.

[![PR Checks](https://github.com/LHenri88/NeoCode/actions/workflows/pr-checks.yml/badge.svg?branch=main)](https://github.com/LHenri88/NeoCode/actions/workflows/pr-checks.yml)
[![Release](https://img.shields.io/github/v/tag/LHenri88/NeoCode?label=release&color=0ea5e9)](https://github.com/LHenri88/NeoCode/tags)
[![Discussions](https://img.shields.io/badge/discussions-open-7c3aed)](https://github.com/LHenri88/NeoCode/discussions)
[![Security Policy](https://img.shields.io/badge/security-policy-0f766e)](SECURITY.md)
[![License](https://img.shields.io/badge/license-MIT-2563eb)](LICENSE)

[Quick Start](#-quick-start) | [Installation](#-installation) | [Features](#-features) | [Documentation](#-documentation) | [Providers](#-supported-providers) | [Community](#-community)

---

## 🎯 Why NeoCode?

- **Multi-Provider Support** - Use one CLI across OpenAI, Gemini, Ollama, GitHub Models, Codex, and other compatible providers
- **Privacy-First** - Zero telemetry by default, local-first AI support, verifiable with `bun run verify:privacy`
- **Powerful Tooling** - 48+ built-in tools (bash, file operations, grep, glob, agents, web search, and more)
- **Memory System** - Persistent project memory with Memory Palace and Knowledge Graph
- **Extensible** - MCP protocol support, custom slash commands, plugins, and skills
- **Developer-Focused** - Terminal-first workflow with streaming output, syntax highlighting, and VS Code integration
- **Autonomous Agents** - Multi-agent orchestration with swarm intelligence and hierarchical task delegation
- **Background Tasks** - KAIROS daemon for async operations, auto-dream consolidation, and notifications

---

## 🚀 Quick Start

### Installation

**Universal Installer (Recommended)**

macOS / Linux:
```bash
curl -fsSL https://get.neocode.dev/install.sh | bash
```

Windows PowerShell:
```powershell
irm https://get.neocode.dev/install.ps1 | iex
```

**NPM**
```bash
npm install -g @neocode/cli
```

**Standalone Binaries (No Node.js Required)** ⚡ **Recommended for End Users**

One-line installer (auto-downloads latest release):

macOS / Linux:
```bash
curl -fsSL https://raw.githubusercontent.com/LHenri88/NeoCode/main/install-standalone.sh | bash
```

Windows PowerShell:
```powershell
irm https://raw.githubusercontent.com/LHenri88/NeoCode/main/install-standalone.ps1 | iex
```

Or download manually:
- [Windows x64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-windows-x64.exe)
- [Linux x64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-linux-x64)
- [macOS x64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-macos-x64)
- [macOS ARM64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-macos-arm64)

Build from source: see [STANDALONE_BUILD.md](STANDALONE_BUILD.md)

If the install reports `ripgrep not found`, install ripgrep system-wide:

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt install ripgrep

# Windows
winget install BurntSushi.ripgrep.MSVC
```

### First Run

```bash
neocode
```

Inside NeoCode:

- Run `/provider` for guided provider setup with saved profiles
- Run `/help` to see all available commands
- Run `/onboard-github` for GitHub Models onboarding

### Fastest OpenAI Setup

**macOS / Linux:**

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

### Fastest Local Ollama Setup

**macOS / Linux:**

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=qwen2.5-coder:7b

neocode
```

**Windows PowerShell:**

```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_BASE_URL="http://localhost:11434/v1"
$env:OPENAI_MODEL="qwen2.5-coder:7b"

neocode
```

---

## ✨ Features

### Core Capabilities

- **48+ Built-in Tools** - File operations, bash execution, grep/glob search, web fetch/search, agent delegation, and more
- **93+ Slash Commands** - Quick access to features via `/command` syntax
- **Streaming Responses** - Real-time token output and tool progress
- **Multi-Step Tool Loops** - Complex workflows with model calls, tool execution, and follow-up responses
- **Vision Support** - URL and base64 image inputs for providers that support vision
- **Syntax Highlighting** - Code syntax highlighting in terminal output

### Memory & Intelligence

- **Memory Palace** - Hierarchical memory organization with Wings and Rooms
- **Knowledge Graph** - SQLite + ChromaDB for semantic search and relationships
- **Session Memory** - Persistent context across conversations
- **Auto-Dream** - Background memory consolidation and insight extraction
- **Guidance Agent** - Context-aware task routing and optimization

### Developer Experience

- **Provider Profiles** - Saved configurations in `.neocode-profile.json`
- **Agent Routing** - Route different agents to different models for cost optimization
- **Permission System** - Granular control over tool execution (block/ask/auto/yolo)
- **Sandbox Mode** - Safe execution environment for untrusted operations
- **Audit Log** - Persistent log of all tool executions

### Integrations

- **MCP Protocol** - Model Context Protocol for external tool integration
- **VS Code Extension** - Launch integration, theme support, and provider-aware UI
- **gRPC Server** - Headless mode for integration with other applications
- **Voice Input** - Voice-to-text for hands-free coding
- **Notification Channels** - Telegram, Discord, WhatsApp via plugins

### Automation

- **KAIROS Daemon** - Background task scheduling and execution
- **BTW (By The Way)** - Async background tasks with terminal overlay notifications
- **Auto-Fix** - Automatic linting and test execution after file edits
- **CI/CD Hooks** - Pre-commit, post-commit, and PR integration

---

## 📖 Documentation

### Setup Guides

- **[Installation Guide](docs/INSTALLATION.md)** - Detailed installation instructions for all platforms
- **[Non-Technical Setup](docs/non-technical-setup.md)** - Beginner-friendly guide
- **[Windows Quick Start](docs/quick-start-windows.md)** - Windows-specific instructions
- **[macOS / Linux Quick Start](docs/quick-start-mac-linux.md)** - Unix-based setup
- **[Advanced Setup](docs/advanced-setup.md)** - Advanced configuration options
- **[Android Install](ANDROID_INSTALL.md)** - Mobile setup guide

### User Guides

- **[User Guide](docs/USER_GUIDE.md)** - Complete feature walkthrough
- **[Commands Reference](docs/COMMANDS.md)** - All slash commands and usage
- **[Playbook](PLAYBOOK.md)** - Practical guide for daily workflows
- **[Features Overview](docs/FEATURES.md)** - Detailed feature documentation

### Developer Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System design and component overview
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to NeoCode
- **[API Reference](docs/API.md)** - Integration and plugin development
- **[Requirements](docs/REQUIREMENTS.md)** - Dependencies and system requirements
- **[Security Policy](SECURITY.md)** - Vulnerability reporting and security practices

### Provider Documentation

- **[Providers Overview](docs/providers.md)** - Supported providers and setup
- **[LiteLLM Setup](docs/litellm-setup.md)** - Using NeoCode with LiteLLM proxy

---

## 🔌 Supported Providers

| Provider | Setup Path | Notes |
|----------|------------|-------|
| **OpenAI-compatible** | `/provider` or env vars | Works with OpenAI, OpenRouter, DeepSeek, Groq, Mistral, LM Studio, and other `/v1` servers |
| **Gemini** | `/provider` or env vars | API key, access token, or local ADC workflow |
| **GitHub Models** | `/onboard-github` | Interactive onboarding with saved credentials |
| **Codex** | `/provider` | Uses existing Codex credentials |
| **Ollama** | `/provider` or env vars | Local inference with no API key (recommended) |
| **Atomic Chat** | advanced setup | Local Apple Silicon backend |
| **Bedrock** | env vars | AWS Bedrock integration |
| **Vertex AI** | env vars | Google Cloud Vertex AI |
| **Azure OpenAI** | env vars | Azure-hosted OpenAI models |

### Provider Notes

- Tool quality varies by model - use models with strong function calling support
- Smaller local models may struggle with complex multi-step workflows
- Some providers have lower output caps than CLI defaults
- Agent routing allows mixing providers (e.g., GPT-4o for planning, DeepSeek for execution)

---

## 🏗️ Architecture

NeoCode is built on a layered architecture:

```
┌─────────────────────────────────────────────────────┐
│  Interface Layer (CLI, gRPC, VS Code, Voice)        │
├─────────────────────────────────────────────────────┤
│  Core Engine (Main Loop, Tools, MCP, Permissions)   │
├─────────────────────────────────────────────────────┤
│  Provider Layer (Ollama, OpenAI, Gemini, etc.)      │
├─────────────────────────────────────────────────────┤
│  Memory Layer (Memory Palace, Knowledge Graph)      │
├─────────────────────────────────────────────────────┤
│  Daemon Layer (KAIROS, AutoDream, Notifications)    │
└─────────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed diagrams and component descriptions.

---

## 🛠️ Development

### Source Build

```bash
# Clone repository
git clone https://gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/neocode.git
cd neocode

# Install dependencies
bun install

# Build
bun run build

# Run locally
node dist/cli.mjs
```

### Development Commands

```bash
# Development with hot reload
bun run dev

# Run tests
bun test

# Test coverage
bun run test:coverage

# Type checking
bun run typecheck

# Smoke test (quick validation)
bun run smoke

# Runtime diagnostics
bun run doctor:runtime

# Privacy verification
bun run verify:privacy
```

### Provider Development

```bash
# Initialize provider profiles
bun run profile:init -- --provider ollama --model llama3.1:8b
bun run profile:init -- --provider openai --api-key sk-... --model gpt-4o

# Launch with specific provider
bun run dev:ollama
bun run dev:openai
bun run dev:gemini

# Quick presets
bun run profile:fast   # llama3.2:3b
bun run profile:code   # qwen2.5-coder:7b
```

---

## 📦 Repository Structure

```
neocode/
├── bin/neocode              # CLI entry point
├── src/
│   ├── main.tsx             # Main loop
│   ├── tools/               # 48+ built-in tools
│   ├── commands/            # 93+ slash commands
│   ├── services/            # Core services
│   │   ├── api/             # Provider layer
│   │   ├── autoDream/       # Memory consolidation
│   │   ├── kairos/          # Background daemon
│   │   ├── memoryPalace/    # Hierarchical memory
│   │   └── ...
│   ├── components/          # Ink/React UI components
│   ├── grpc/                # gRPC server
│   └── utils/               # Utilities
├── vscode-extension/        # VS Code extension
├── plugins/                 # Official plugins
├── scripts/                 # Build and utility scripts
├── docs/                    # Documentation
└── tests/                   # Test suites
```

---

## 🤝 Community

- **[GitHub Discussions](https://github.com/LHenri88/NeoCode/discussions)** - Q&A, ideas, and community conversation
- **[GitHub Issues](https://github.com/LHenri88/NeoCode/issues)** - Bug reports and feature requests
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to NeoCode
- **[Security Policy](SECURITY.md)** - Vulnerability reporting

---

## 🔒 Security

NeoCode is built with security and privacy as core principles:

- **Zero Telemetry** - No data sent to third parties (verifiable with `bun run verify:privacy`)
- **Permission Gates** - Granular control over tool execution
- **Sandbox Mode** - Safe execution environment
- **Audit Log** - Persistent log of all operations
- **No Hardcoded Credentials** - All secrets via env vars or config files

If you believe you found a security issue, see [SECURITY.md](SECURITY.md) for responsible disclosure.

---

## 📄 License

NeoCode originated from the Claude Code codebase and has been substantially modified to support multiple providers and open use. "Claude" and "Claude Code" are trademarks of Anthropic PBC.

NeoCode is an independent community project and is not affiliated with, endorsed by, or sponsored by Anthropic.

See [LICENSE](LICENSE) for full license details.

---

## 🙏 Acknowledgments

NeoCode builds upon the excellent work of:

- **Claude Code** - Original inspiration and foundation
- **Anthropic** - For Claude AI and the Anthropic SDK
- **Ollama** - For making local AI accessible
- **Ink** - For terminal UI framework
- **Model Context Protocol** - For standardized tool integration
- **Open Source Community** - For countless tools and libraries

---

## 🚀 What's Next?

See [EPICS.md](docs/EPICS.md) for our roadmap and upcoming features.

Join us in building the most powerful open-source agentic CLI!

---

**Made with 💚 by the NeoCode community**
