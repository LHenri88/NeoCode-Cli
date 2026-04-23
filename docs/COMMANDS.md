# NeoCode Commands Reference

Complete reference for all slash commands available in NeoCode.

---

## Table of Contents

- [Essential Commands](#essential-commands)
- [Provider & Configuration](#provider--configuration)
- [Memory & Intelligence](#memory--intelligence)
- [Session Management](#session-management)
- [Development Tools](#development-tools)
- [Agent & Automation](#agent--automation)
- [Advanced Features](#advanced-features)
- [System & Diagnostics](#system--diagnostics)

---

## Essential Commands

### `/help`

**Description:** Show help and available commands

**Usage:**
```
/help
```

**What it does:**
- Displays interactive help interface
- Lists all available slash commands
- Shows keyboard shortcuts
- Provides feature documentation

---

### `/exit`

**Description:** Exit NeoCode

**Usage:**
```
/exit
```

**Aliases:** `/quit`, Ctrl+D

---

### `/clear`

**Description:** Clear the terminal screen

**Usage:**
```
/clear
```

**Note:** Does not affect conversation history, only visual display

---

## Provider & Configuration

### `/provider`

**Description:** Manage AI provider profiles

**Usage:**
```
/provider
/provider --help
```

**Interactive Options:**
- **Auto** - Auto-detect best local model
  - Goals: balanced, coding, latency
- **Ollama** - Configure local Ollama models
- **OpenAI-compatible** - OpenAI, DeepSeek, OpenRouter, Groq, etc.
- **Gemini** - Google Gemini API
- **Codex** - ChatGPT Codex CLI
- **Clear saved profile** - Remove saved configuration

**Saved To:** `.neocode-profile.json`

**Examples:**
```
/provider              # Open setup wizard
/provider --help       # Show help
```

---

### `/model`

**Description:** Change the current AI model

**Usage:**
```
/model <model-name>
```

**Examples:**
```
/model gpt-4o
/model qwen2.5-coder:7b
/model llama3.2:3b
```

---

### `/fast`

**Description:** Switch to fast model preset

**Usage:**
```
/fast
```

**What it does:**
- Switches to a faster, lighter model
- Useful for quick iterations
- Default: llama3.2:3b (Ollama) or gpt-3.5-turbo (OpenAI)

---

### `/config`

**Description:** Edit settings file

**Usage:**
```
/config
```

**Opens:** `~/.claude/settings.json` in your default editor

**Common Settings:**
- `agentModels` - Multi-provider routing
- `agentRouting` - Task-based model selection
- `autoMemoryEnabled` - Memory Palace toggle
- `sandboxingEnabled` - Sandbox mode
- `hooks` - Lifecycle hooks
- `voiceEnabled` - Voice input default

---

### `/theme`

**Description:** Change terminal theme

**Usage:**
```
/theme [theme-name]
```

**Available Themes:**
- `matrix` - Matrix-inspired green theme (default)
- `minimal` - Clean, simple theme
- `cyberpunk` - Neon cyberpunk theme
- `dark` - Classic dark theme

**Examples:**
```
/theme matrix
/theme minimal
```

---

### `/privacy-settings`

**Description:** Configure privacy options

**Usage:**
```
/privacy-settings
```

**Options:**
- Telemetry (always disabled)
- Data retention
- Log levels
- Audit logging

---

### `/hooks`

**Description:** Manage lifecycle hooks

**Usage:**
```
/hooks
```

**Hook Types:**
- `beforeToolCall` - Before any tool execution
- `afterToolCall` - After tool completes
- `beforeWrite` - Before file write
- `afterWrite` - After file write
- `beforeBash` - Before bash command
- `afterBash` - After bash command

---

### `/keybindings`

**Description:** Configure keyboard shortcuts

**Usage:**
```
/keybindings
```

**Configurable Keys:**
- Push-to-talk (default: Space)
- Command history navigation
- Autocomplete
- Cancel operation

---

## Memory & Intelligence

### `/memory`

**Description:** Manage memory files and Memory Palace

**Usage:**
```
/memory                      # Open file selector
/memory palace <on|off>      # Toggle Memory Palace
/memory search <query>       # Search memories
/memory graph                # View memory graph
```

**Memory Files:**
- `project-memory.md` - Project context
- `guidance.md` - Task instructions
- `session-memory.md` - Current session

**Examples:**
```
/memory                           # Edit memory files
/memory palace on                 # Enable Memory Palace
/memory search "authentication"   # Search memories
/memory graph                     # View structure
```

---

### `/dream`

**Description:** Consolidate memories from recent sessions

**Usage:**
```
/dream
```

**What it does:**
- Reads recent conversation sessions
- Synthesizes key insights
- Saves consolidated memories to Memory Palace
- Updates knowledge graph

**Requires:** Memory Palace enabled (`/memory palace on`)

---

### `/btw <question>`

**Description:** Ask a side question without interrupting main conversation

**Usage:**
```
/btw <question>
/btw list
```

**Examples:**
```
/btw What's the syntax for Python decorators?
/btw How do I center a div with CSS?
/btw list    # View recent BTW questions
```

**Keyboard Controls:**
- **↑/↓** or **Ctrl+P/Ctrl+N** - Scroll response
- **Space/Enter/Esc** - Dismiss overlay

---

### `/wiki`

**Description:** Manage project wiki

**Usage:**
```
/wiki [init|status|ingest <path>]
```

**Subcommands:**
- `init` - Initialize wiki structure
- `status` - Show wiki status (default)
- `ingest <path>` - Add file to wiki sources

**Examples:**
```
/wiki init              # Create .neocode/wiki/
/wiki status            # Show page/source counts
/wiki ingest README.md  # Add file to wiki
```

---

## Session Management

### `/session`

**Description:** View session information

**Usage:**
```
/session
```

**Shows:**
- Session ID
- Start time
- Message count
- Token usage
- Current provider/model

---

### `/resume`

**Description:** Resume previous session

**Usage:**
```
/resume [session-id]
```

**What it does:**
- Lists recent sessions (if no ID provided)
- Loads session history
- Restores context

---

### `/context`

**Description:** View context size and token usage

**Usage:**
```
/context
```

**Shows:**
- Current context tokens
- Max context limit
- Token breakdown by component
- Memory usage

---

### `/compact`

**Description:** Compress context to save tokens

**Usage:**
```
/compact
```

**What it does:**
- Summarizes older messages
- Removes redundant information
- Preserves recent context
- Reduces token usage

---

### `/export`

**Description:** Export conversation

**Usage:**
```
/export [format]
```

**Formats:**
- `markdown` (default)
- `json`
- `html`

**Examples:**
```
/export             # Export as markdown
/export json        # Export as JSON
/export html        # Export as HTML
```

---

## Development Tools

### `/diff`

**Description:** Show git diff

**Usage:**
```
/diff [file]
```

**Examples:**
```
/diff              # Show all changes
/diff src/main.ts  # Show changes in specific file
```

---

### `/files`

**Description:** List project files

**Usage:**
```
/files [pattern]
```

**Examples:**
```
/files              # List all files
/files src/**/*.ts  # List TypeScript files
```

---

### `/plan`

**Description:** Enter plan mode for complex tasks

**Usage:**
```
/plan
```

**What it does:**
- Creates execution plan before coding
- Breaks down complex tasks
- Estimates effort
- Shows approval workflow

---

### `/review`

**Description:** Code review mode

**Usage:**
```
/review [file]
```

**What it does:**
- Analyzes code quality
- Identifies bugs and issues
- Suggests improvements
- Security review

---

### `/stats`

**Description:** Show usage statistics

**Usage:**
```
/stats
```

**Shows:**
- Total messages
- Token usage
- API costs
- Session duration
- Tool usage breakdown

---

### `/cost`

**Description:** View API cost estimates

**Usage:**
```
/cost
```

**Shows:**
- Current session cost
- Total costs (by provider)
- Cost per model
- Projected monthly cost

---

## Agent & Automation

### `/agents`

**Description:** Manage agent swarm

**Usage:**
```
/agents
```

**Features:**
- Configure hierarchical agents
- Set agent specializations
- View agent status
- Control delegation

---

### `/swarm`

**Description:** Configure agent swarm settings

**Usage:**
```
/swarm
```

**Settings:**
- Max concurrent agents
- Agent timeout
- Delegation strategy
- Coordinator model

---

### `/skills`

**Description:** Manage skills and capabilities

**Usage:**
```
/skills
```

**Features:**
- List available skills
- Enable/disable skills
- Create custom skills
- Import skill packs

---

### `/research`

**Description:** Research mode for information gathering

**Usage:**
```
/research <topic>
```

**What it does:**
- Web search and synthesis
- Multi-source research
- Fact verification
- Summary generation

**Examples:**
```
/research "React Server Components"
/research "Rust async programming"
```

---

## Advanced Features

### `/import`

**Description:** Import files or skill sets from another local project

**Usage:**
```
/import <path> [--target <dir>] [--overwrite] [--dry-run]
```

**Options:**
- `<path>` - Path to the source project or file
- `--target <dir>` - Target directory for imported files
- `--overwrite` - Overwrite existing files
- `--dry-run` - Preview changes without applying

**Examples:**
```
/import ../other-project/skills
/import ~/templates/react-component --target src/components
/import ./config.yaml --overwrite
```

---

### `/channel`

**Description:** Configure notification channels (Telegram, Discord, Webhook)

**Usage:**
```
/channel <telegram|discord|webhook|status> [args...]
```

**Subcommands:**
- `telegram` - Configure Telegram bot notifications
- `discord` - Configure Discord webhook notifications
- `webhook` - Configure custom webhook endpoint
- `status` - Show current channel configuration

**Examples:**
```
/channel telegram        # Setup Telegram notifications
/channel discord         # Setup Discord webhook
/channel status          # View configured channels
```

**Use Cases:**
- Get notified when long-running tasks complete
- Receive BTW responses on mobile
- Monitor background sessions

---

### `/preview`

**Description:** Manage the web preview dev server (on/off/status/open)

**Usage:**
```
/preview [on|off|status|open]
```

**Subcommands:**
- `on` - Start the preview dev server
- `off` - Stop the preview dev server
- `status` - Show server status (default)
- `open` - Open preview in browser

**Examples:**
```
/preview on              # Start preview server
/preview open            # Open in browser
/preview off             # Stop server
```

**Features:**
- Live reload on file changes
- Hot module replacement
- Preview HTML/React/Vue components
- Test web interfaces locally

---

### `/language`

**Description:** Change the interface language

**Usage:**
```
/language [en|pt|es]
```

**Available Languages:**
- `en` - English
- `pt` - Português (Portuguese)
- `es` - Español (Spanish)

**Examples:**
```
/language pt             # Switch to Portuguese
/language en             # Switch to English
/language es             # Switch to Spanish
```

---

### `/voice`

**Description:** Toggle voice input mode

**Usage:**
```
/voice
```

**Requirements:**
- Microphone access
- Claude.ai login OR Whisper endpoint

**Usage Flow:**
1. `/voice` to enable
2. Hold **Space** to talk
3. Release to send
4. Transcription appears as text

---

### `/mcp`

**Description:** Manage MCP (Model Context Protocol) servers

**Usage:**
```
/mcp
/mcp enable [server-name]
/mcp disable [server-name]
/mcp reconnect <server-name>
```

**Examples:**
```
/mcp                      # Open settings
/mcp enable               # Enable all servers
/mcp enable filesystem    # Enable specific server
/mcp disable              # Disable all servers
/mcp reconnect filesystem # Reconnect server
```

---

### `/sandbox`

**Description:** Configure command sandboxing

**Usage:**
```
/sandbox
/sandbox exclude "<pattern>"
```

**Features:**
- Docker-based isolation
- Command exclusion patterns
- Auto-allow in sandbox
- Fallback configuration

**Examples:**
```
/sandbox                           # Open settings
/sandbox exclude "npm run test:*"  # Exclude pattern
/sandbox exclude "docker *"        # Exclude docker commands
```

**Platform Support:**
- ✅ macOS, Linux, WSL2
- ❌ Windows native, WSL1

---

### `/permissions`

**Description:** Manage tool permission rules

**Usage:**
```
/permissions
```

**Aliases:** `/allowed-tools`

**Features:**
- Add allow/deny rules
- Pattern-based matching
- Retry denied tools
- View current rules

---

### `/computer-use`

**Description:** Enable computer use (screenshot/mouse/keyboard)

**Usage:**
```
/computer-use
```

**Capabilities:**
- Screenshot capture
- Mouse movement/clicks
- Keyboard input
- Window management

**Platform Support:**
- ✅ macOS, Linux, Windows
- Requires permissions

---

## System & Diagnostics

### `/doctor`

**Description:** Run system diagnostics

**Usage:**
```
/doctor
```

**Checks:**
- Node.js version
- Dependencies (ripgrep, git, etc.)
- Provider configuration
- Network connectivity
- File permissions
- Memory usage

---

### `/upgrade`

**Description:** Check for updates and upgrade NeoCode

**Usage:**
```
/upgrade
```

**What it does:**
- Checks for new versions
- Shows changelog
- Prompts for upgrade
- Installs latest version

---

### `/feedback`

**Description:** Submit feedback or report issues

**Usage:**
```
/feedback
```

**Opens:**
- GitHub Issues (for bugs)
- GitHub Discussions (for feedback)

---

### `/release-notes`

**Description:** View release notes for current version

**Usage:**
```
/release-notes
```

---

## Command Categories Quick Reference

### Most Used Commands

| Command | Purpose |
|---------|---------|
| `/help` | Show help |
| `/provider` | Setup AI provider |
| `/memory` | Manage memories |
| `/dream` | Consolidate memories |
| `/btw <q>` | Side question |
| `/clear` | Clear screen |
| `/exit` | Quit NeoCode |

### Configuration

| Command | Purpose |
|---------|---------|
| `/config` | Edit settings |
| `/theme` | Change theme |
| `/model` | Switch model |
| `/fast` | Use fast model |
| `/hooks` | Manage hooks |
| `/keybindings` | Configure keys |

### Development

| Command | Purpose |
|---------|---------|
| `/diff` | Show git diff |
| `/files` | List files |
| `/plan` | Plan mode |
| `/review` | Code review |
| `/stats` | Show stats |
| `/cost` | View costs |

### Advanced

| Command | Purpose |
|---------|---------|
| `/voice` | Voice input |
| `/mcp` | MCP servers |
| `/sandbox` | Sandboxing |
| `/permissions` | Tool permissions |
| `/agents` | Agent swarm |
| `/computer-use` | GUI automation |

---

## Tips

### Command Autocomplete

Start typing `/` and press **Tab** to autocomplete commands.

### Command History

Use **↑/↓** arrows to navigate through command history.

### Command Aliases

Some commands have shorter aliases:
- `/quit` → `/exit`
- `/allowed-tools` → `/permissions`

### Help for Specific Commands

Most commands support `--help`:
```
/provider --help
/mcp --help
```

---

## Creating Custom Commands

Create custom slash commands in `.claude/commands/`:

**Example:** `.claude/commands/test.md`
```markdown
Run the full test suite with coverage reporting
```

**Usage:**
```
/test
```

**See:** [Custom Commands Documentation](https://docs.claude.com/claude-code/commands)

---

**For detailed usage of each command, see the [User Guide](USER_GUIDE.md)**
