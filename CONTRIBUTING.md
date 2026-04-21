# Contributing to NeoCode

Thanks for contributing! 🚀

NeoCode is a fast-moving open-source agentic CLI with multi-provider support, local-first AI (Ollama), MCP protocol, Memory Palace, and a Matrix-inspired terminal-first workflow. The best contributions are focused, well-tested, and easy to review.

## Before You Start

- Search existing [issues](https://gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/neocode/issues) and [discussions](https://gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/neocode/discussions) before opening a new thread.
- Use issues for confirmed bugs and actionable feature work.
- Use discussions for setup help, ideas, and general community conversation.
- For larger changes, open an issue first so the scope is clear before implementation.
- For security reports, follow [SECURITY.md](SECURITY.md).

## Prerequisites

| Requirement | Version | Why |
|---|---|---|
| **Bun** | ≥ 1.2 | Build system, test runner, package manager |
| **Node.js** | ≥ 20 | Runtime |
| **Git** | ≥ 2.30 | Version control |
| **Ollama** (optional) | Latest | Local LLM provider for testing |

## Local Setup

```bash
# Clone the repository
git clone https://gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/neocode.git
cd neocode

# Install dependencies
bun install

# Build the CLI
bun run build

# Smoke test — ensures the build works
bun run smoke

# Run locally
bun run dev
```

### Provider Setup (optional)

```bash
# Quick setup with Ollama (recommended)
bun run profile:code

# Auto-detect best local provider
bun run profile:auto

# Launch with specific provider
bun run dev:ollama
bun run dev:gemini
bun run dev:openai
```

## Development Workflow

1. **Fork & Clone** — Fork the repo and create a feature branch
2. **Implement** — Follow existing patterns in the codebase
3. **Test** — Add tests and ensure existing ones pass
4. **Build** — Run `bun run build && bun run smoke`
5. **Submit PR** — Use the PR template and describe your changes

### Key Directories

| Directory | Description |
|---|---|
| `src/tools/` | 48+ tools (file, bash, search, etc.) |
| `src/commands/` | 93+ slash commands |
| `src/services/` | Core services (memory, dream, kairos, etc.) |
| `src/theme/` | Matrix design system |
| `src/components/` | Ink/React terminal UI components |
| `vscode-extension/` | VS Code extension |
| `plugins/` | Official plugin stubs |

### Conventions

- **TypeScript ES Modules** — All source code
- **Bun test** — Test runner (`bun test`)
- **Chalk + Ink** — Terminal rendering
- **No console.log** — Use `logForDebugging()` from `utils/debug.js`

## Validation

At minimum, run these checks for your change:

```bash
# Build + smoke test
bun run build && bun run smoke

# Run all tests
bun test

# Type checking
bun run typecheck

# Privacy verification (no phone-home)
bun run verify:privacy

# Full hardening check
bun run hardening:strict
```

### Focused Testing

```bash
# Single test file
bun test ./path/to/test-file.test.ts

# Provider tests
bun run test:provider

# Runtime diagnostics
bun run doctor:runtime
```

## Pull Requests

Good PRs include:

- **What** changed
- **Why** it changed
- **Impact** on users or developers
- **Tests** you ran
- **Screenshots** if UI/terminal changes

### PR Checklist

- [ ] Code follows existing style patterns
- [ ] Tests added/updated for behavior changes
- [ ] `bun run build && bun run smoke` passes
- [ ] Documentation updated if user-facing
- [ ] No new console.error/console.log usage — use `logForDebugging()`

## Architecture Overview

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system diagram.

Key layers:
- **Interface Layer** — CLI, gRPC, VS Code, Voice
- **Core Engine** — Main loop, Tool Registry, MCP, Permissions
- **Provider Layer** — Ollama (default), OpenAI, Gemini, OpenRouter
- **Memory Layer** — MemDir, Memory Palace, Knowledge Graph
- **Daemon Layer** — KAIROS (background tasks, AutoDream, notifications)

## Provider Changes

NeoCode supports multiple provider paths. If you change provider logic:

- Be explicit about which providers are affected
- Avoid breaking third-party providers while fixing first-party behavior
- Test the exact provider/model path you changed
- Call out limitations or follow-up work in the PR description

## Plugin Development

See `src/plugins/builtinPlugins.ts` for the plugin registration API.

Plugins can provide:
- MCP servers
- Skills (slash commands)
- Hooks (lifecycle events)
- Themes
- Tools

## Community

Please be respectful and constructive with other contributors.

Maintainers may ask for narrower scope, focused follow-up PRs, stronger validation, or docs updates for behavior changes. That is normal and helps keep the project reviewable as it grows.

---

> 💚 **Thank you for helping make NeoCode the most powerful open-source CLI agent!**
