# ðŸ›ï¸ Arquitetura â€” NeoCode v1.0

**Data:** 09 de Abril de 2026
**Autor:** Aria the Visionary (Architect Agent)
**Base:** Fork NeoCode v0.1.8 â€” 175+ arquivos TypeScript

---

## 1. Diagrama de Arquitetura

```mermaid
graph TB
    subgraph "Interface Layer"
        CLI["CLI + Slash Commands<br/>(Ink/React Terminal UI)<br/>ðŸ†• Matrix Theme"]
        GRPC["gRPC Headless Server<br/>(src/grpc/ + proto/)"]
        VSCODE["VS Code Extension"]
        VOICE["Voice Input<br/>(src/voice/)"]
    end

    subgraph "Core Engine"
        MAIN["Main Loop<br/>(src/main.tsx)"]
        TOOL["Tool Registry<br/>(src/Tool.ts â€” 48+ tools)"]
        MCP["MCP Protocol<br/>(@modelcontextprotocol/sdk)"]
        PERM["Permission System<br/>(gates + callbacks)"]
        CMD["Command Registry<br/>(93+ slash commands)"]
    end

    subgraph "Provider Layer"
        ROUTER["Agent Routing<br/>(agentRouting.ts)"]
        OAI["OpenAI Shim"]
        CDX["Codex Shim"]
        PCONF["Provider Config"]
        OLLAMA["Ollama<br/>(LOCAL DEFAULT)"]
        CLOUD["Cloud APIs<br/>(OpenRouter, Geminiâ€¦)"]
    end

    subgraph "Tools Layer"
        BASH["Bash / PowerShell"]
        FILE["File R/W/Edit"]
        SEARCH["Grep/Glob/Web"]
        AGENT["AgentTool + Tasks"]
        COMPU["Computer Use<br/>(screenshot+mouse/kb)"]
        SKILL["SkillTool + MCPTool"]
        LSP["LSP Integration"]
    end

    subgraph "Orchestration Layer"
        COORD["Coordinator"]
        GUIDE["ðŸ†• Guidance Agent"]
        SWARM["Hierarchical Swarm"]
    end

    subgraph "Memory Layer"
        MEMDIR["MemDir"]
        EXTRACT["Extract Memories"]
        SESSION["Session Memory"]
        PALACE["ðŸ†• Memory Palace<br/>(Wings/Rooms)"]
        KG["ðŸ†• Knowledge Graph<br/>(SQLite + ChromaDB)"]
    end

    subgraph "Self-Improvement Layer"
        DREAM["AutoDream"]
        REVIEW["ðŸ†• AutoReview"]
        RESEARCH["ðŸ†• AutoResearch"]
        ENHANCE["ðŸ†• Prompt Enhance"]
        IMPROVE["ðŸ†• Self-Improve Loop"]
    end

    subgraph "Daemon Layer â€” KAIROS 2.0"
        KAIROS["ðŸ†• KAIROS Daemon"]
        BTW["BTW Async"]
        NOTIF["ðŸ†• Notifications<br/>(Telegram/Discord)"]
        CRON["ScheduleCron"]
    end

    subgraph "Extensions"
        PLUGINS["Plugin System"]
        GIT["Git-native"]
        WIKI["Wiki"]
    end

    CLI --> MAIN
    GRPC --> MAIN
    VSCODE --> GRPC
    VOICE --> MAIN
    MAIN --> TOOL
    MAIN --> MCP
    MAIN --> PERM
    MAIN --> CMD
    TOOL --> ROUTER
    ROUTER --> OAI
    ROUTER --> CDX
    OAI --> OLLAMA
    OAI --> CLOUD
    TOOL --> BASH & FILE & SEARCH & AGENT & COMPU & SKILL & LSP
    MAIN --> COORD
    COORD --> GUIDE & SWARM
    MAIN --> MEMDIR
    MEMDIR --> EXTRACT & SESSION & PALACE
    PALACE --> KG
    DREAM --> MEMDIR
    KAIROS --> DREAM & BTW & NOTIF & CRON
    PLUGINS --> TOOL & CMD
```

---

## 2. Fluxo de Dados Principal

```mermaid
sequenceDiagram
    actor User
    participant CLI as NeoCode CLI
    participant Engine as Core Engine
    participant Router as Provider Router
    participant LLM as LLM (Ollama/Cloud)
    participant Tools as Tool Registry
    participant Memory as Memory Layer
    participant Dream as AutoDream
    participant BTW as BTW/Notifications

    User->>CLI: Prompt / Slash Command
    CLI->>Engine: Parse input

    alt Is Slash Command
        Engine->>Engine: Route to command handler
        Engine-->>CLI: Command output
    else Natural Language Prompt
        Engine->>Memory: Load context (guidance + session + project)
        Memory-->>Engine: Context payload
        Engine->>Router: Select provider + model
        Router->>LLM: Send prompt + tools schema

        loop Tool-Calling Loop
            LLM-->>Engine: Response (text | tool_call)
            alt tool_call
                Engine->>Tools: Execute tool (with permission check)
                Tools-->>Engine: Tool result
                Engine->>LLM: Send tool result
            else text
                Engine-->>CLI: Stream tokens to terminal
            end
        end

        Engine->>Memory: Extract + store memories
    end

    Note over Dream,BTW: Background (KAIROS Daemon)
    Dream->>Memory: Consolidate memories (idle/scheduled)
    BTW-->>User: Async notifications (terminal overlay / channels)
```

---

## 3. DecisÃµes Arquiteturais (ADRs)

### ADR-01: Manter TypeScript + React/Ink
- **DecisÃ£o:** NÃƒO migrar para Rust
- **Justificativa:** Codebase maduro (175+ files). Migrar custaria meses sem ROI. Computer Use jÃ¡ funciona via Node FFI.
- **Tradeoff:** Performance Ã© boa o suficiente para CLI. Binary size aceitÃ¡vel via `bun build`.

### ADR-02: ChromaDB + SQLite para Knowledge Graph
- **DecisÃ£o:** Usar ChromaDB (embeddings) + SQLite (relaÃ§Ãµes) ao invÃ©s de sÃ³ arquivos `.md`
- **Justificativa:** Busca semÃ¢ntica requer vetores. SQLite Ã© zero-config. `project-memory.md` mantido para compat.
- **Tradeoff:** +20MB no runtime.

### ADR-03: NotificaÃ§Ãµes via Plugins MCP
- **DecisÃ£o:** Telegram/Discord/WhatsApp como plugins MCP, nÃ£o core
- **Justificativa:** MCP jÃ¡ suporta tools externos. MantÃ©m core leve. Permite extensÃ£o pela comunidade.
- **Tradeoff:** Telegram pode ser bundled como "official plugin".

### ADR-04: Remover deps Anthropic-proprietÃ¡rias
- **DecisÃ£o:** Remover `@anthropic-ai/bedrock-sdk`, `foundry-sdk`, `@growthbook/growthbook`
- **Justificativa:** Privacy-first. Manter `@anthropic-ai/sdk` para quem quiser Claude como provider.

### ADR-05: KAIROS como child_process
- **DecisÃ£o:** KAIROS roda como `child_process.fork()`, nÃ£o daemon separado
- **Justificativa:** Simplicidade de instalaÃ§Ã£o. Funciona em Windows sem systemd.
- **Tradeoff:** Morre quando CLI fecha. AceitÃ¡vel para v1.0.

### ADR-06: ðŸ†• Matrix Visual Theme via Ink + chalk
- **DecisÃ£o:** Implementar visual Matrix-inspired usando Ink components + chalk ANSI colors
- **Justificativa:** DiferenciaÃ§Ã£o visual no mercado. Ink jÃ¡ suporta animaÃ§Ãµes. Zero deps adicionais.
- **Tradeoff:** ConfigurÃ¡vel â€” usuÃ¡rio pode desabilitar com `/theme minimal`.

---

## 4. Mapa de DiretÃ³rios

```
neocode/
â”œâ”€â”€ bin/neocode                         # Entry point (renomeado)
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ main.tsx                        # Main loop
â”‚   â”œâ”€â”€ Tool.ts                         # Tool base class
â”‚   â”œâ”€â”€ tools/                          # 48+ tools (existentes)
â”‚   â”œâ”€â”€ commands/                       # 93+ slash commands
â”‚   â”‚   â”œâ”€â”€ btw/                        # BTW (aprimorar)
â”‚   â”‚   â”œâ”€â”€ dream/                      # Dream command
â”‚   â”‚   â”œâ”€â”€ memory/                     # Memory command
â”‚   â”‚   â””â”€â”€ theme/                      # ðŸ†• Theme switching
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ api/                        # Provider layer
â”‚   â”‚   â”œâ”€â”€ autoDream/                  # AutoDream
â”‚   â”‚   â”œâ”€â”€ extractMemories/            # Memory extraction
â”‚   â”‚   â”œâ”€â”€ SessionMemory/              # Session memory
â”‚   â”‚   â”œâ”€â”€ mcp/                        # MCP protocol
â”‚   â”‚   â”œâ”€â”€ compact/                    # Context compaction
â”‚   â”‚   â”œâ”€â”€ autoReview/                 # ðŸ†• AutoReview
â”‚   â”‚   â”œâ”€â”€ autoResearch/              # ðŸ†• AutoResearch
â”‚   â”‚   â”œâ”€â”€ guidanceAgent/             # ðŸ†• Guidance Agent
â”‚   â”‚   â”œâ”€â”€ memoryPalace/              # ðŸ†• Memory Palace
â”‚   â”‚   â”œâ”€â”€ knowledgeGraph/            # ðŸ†• Knowledge Graph
â”‚   â”‚   â”œâ”€â”€ promptEnhance/             # ðŸ†• Prompt Enhance
â”‚   â”‚   â”œâ”€â”€ selfImprove/               # ðŸ†• Self-Improve
â”‚   â”‚   â”œâ”€â”€ kairos/                    # ðŸ†• KAIROS daemon
â”‚   â”‚   â””â”€â”€ notifications/            # ðŸ†• Channel notifications
â”‚   â”œâ”€â”€ theme/                         # ðŸ†• Matrix Design System
â”‚   â”‚   â”œâ”€â”€ tokens.ts                  # Design tokens
â”‚   â”‚   â”œâ”€â”€ animations.ts             # Matrix rain, spinners
â”‚   â”‚   â”œâ”€â”€ components/               # StatusBar, Splash, Spinner
â”‚   â”‚   â””â”€â”€ presets.ts                # Theme presets
â”‚   â”œâ”€â”€ utils/computerUse/             # Computer Use
â”‚   â”œâ”€â”€ memdir/                        # Memory directory
â”‚   â”œâ”€â”€ grpc/                          # gRPC server
â”‚   â”œâ”€â”€ skills/                        # Skills system
â”‚   â”œâ”€â”€ voice/                         # Voice input
â”‚   â””â”€â”€ components/                    # UI components (156+ existentes)
â”œâ”€â”€ plugins/                           # ðŸ†• Official plugins
â”‚   â”œâ”€â”€ neocode-telegram/
â”‚   â”œâ”€â”€ neocode-discord/
â”‚   â””â”€â”€ neocode-whatsapp/
â”œâ”€â”€ scripts/
â”‚   â”œâ”€â”€ build.ts
â”‚   â””â”€â”€ install.sh                     # ðŸ†• Installer
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ PRD.md
â”‚   â”œâ”€â”€ ARCHITECTURE.md                # Este arquivo
â”‚   â”œâ”€â”€ EPICS.md
â”‚   â”œâ”€â”€ DESIGN_SYSTEM.md
â”‚   â””â”€â”€ setup guides/
â””â”€â”€ .neocode/                          # ðŸ†• Project config
    â”œâ”€â”€ guidance.md
    â”œâ”€â”€ kairos.yaml
    â””â”€â”€ memory/
```

---

## 5. IntegraÃ§Ãµes e ComunicaÃ§Ã£o

```mermaid
graph LR
    subgraph "Local"
        CLI[NeoCode CLI]
        OLLAMA[Ollama<br/>localhost:11434]
        SQLITE[(SQLite)]
        CHROMA[(ChromaDB)]
    end

    subgraph "Remote (opcional)"
        OPENAI[OpenAI API]
        GEMINI[Gemini API]
        OPENR[OpenRouter]
        TG[Telegram Bot API]
        DC[Discord Bot API]
    end

    subgraph "IDE"
        VSCODE[VS Code Extension]
        GRPC[gRPC :50051]
    end

    CLI -->|OpenAI compat| OLLAMA
    CLI -->|"if configured"| OPENAI & GEMINI & OPENR
    CLI --> SQLITE & CHROMA
    CLI -->|notifications| TG & DC
    VSCODE -->|bidirectional| GRPC
    GRPC --> CLI
```

---

## 6. SeguranÃ§a

### PrincÃ­pios
1. **Zero telemetria por padrÃ£o** â€” verificÃ¡vel via `bun run verify:privacy`
2. **Permission gates** em todas as tool executions
3. **Sandbox** para Computer Use (screenshot/input requerem aprovaÃ§Ã£o)
4. **Audit log** persistente de todas as aÃ§Ãµes
5. **Sem credenciais hardcoded** â€” tudo via env vars ou config files com chmod 600

### Modelo de PermissÃµes

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚            Permission Levels            â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  ðŸ”´ BLOCK   â”‚ Computer Use: click/type â”‚
â”‚  ðŸŸ¡ ASK     â”‚ File write, Bash exec    â”‚
â”‚  ðŸŸ¢ AUTO    â”‚ File read, Grep, Search  â”‚
â”‚  âš¡ YOLO    â”‚ Everything (per-session)  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

> ðŸ“Ž **Documentos relacionados:**
> - [PRD](./PRD.md)
> - [Epics & Stories](./EPICS.md)
> - [Design System](./DESIGN_SYSTEM.md)
