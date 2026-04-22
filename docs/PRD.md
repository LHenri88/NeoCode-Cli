# ðŸ“‹ PRD â€” NeoCode v1.0

**Data:** 09 de Abril de 2026
**VersÃ£o:** 2.0 (Aprimorada pelo Pipeline PO + PM)
**Status:** Aprovada â€” Pronta para Desenvolvimento

---

## 1. VisÃ£o do Produto

**NeoCode** Ã© um CLI agentic open-source que herda a arquitetura madura do NeoCode (fork direto do Claude Code) e o transforma no agente de terminal mais poderoso, privado e acessÃ­vel do mercado. Roda 100% local por padrÃ£o (Ollama), com suporte nativo a +200 modelos via OpenAI-compatible APIs.

Inclui Computer Use full, AutoReview, AutoResearch (Karpathy-style), Self-Improve Loop, Guidance Agent permanente, Memory Palace com Knowledge Graph, AutoDream (consolidaÃ§Ã£o de memÃ³ria), BTW (mensagens assÃ­ncronas) e notificaÃ§Ãµes em canais reais (Telegram, WhatsApp, Discord).

Qualquer pessoa com um PC comum (8GB RAM) transforma o terminal em um **engenheiro sÃªnior autÃ´nomo** â€” tudo com privacidade total e instalaÃ§Ã£o em 30 segundos.

---

## 2. Diferenciais Competitivos

| # | Diferencial | vs Claude Code | vs Cursor | vs Aider |
|---|---|---|---|---|
| 1 | 100% local por padrÃ£o (Ollama) | âŒ Requer API | âŒ Cloud | âŒ Requer API |
| 2 | Multi-provider (+200 modelos) | âŒ SÃ³ Anthropic | Parcial | Parcial |
| 3 | Computer Use full (screenshot+mouse/kb) | âœ… | âŒ | âŒ |
| 4 | AutoDream (consolidaÃ§Ã£o de memÃ³ria) | âœ… (leak) | âŒ | âŒ |
| 5 | BTW (mensagens assÃ­ncronas) | âœ… (leak) | âŒ | âŒ |
| 6 | Memory Palace + Knowledge Graph | âŒ | âŒ | âŒ |
| 7 | Guidance Agent permanente | âŒ | âŒ | âŒ |
| 8 | NotificaÃ§Ãµes em canais reais | âŒ | âŒ | âŒ |
| 9 | Open-source + privacidade total | âŒ | Parcial | âœ… |
| 10 | Plugin system extensÃ­vel (MCP) | âŒ | Parcial | âŒ |
| 11 | gRPC headless server | âŒ | âŒ | âŒ |
| 12 | ðŸ†• Matrix-inspired visual identity | âŒ | âŒ | âŒ |

---

## 3. PÃºblico-Alvo

| Persona | Perfil | Necessidade Principal |
|---|---|---|
| **Dev Solo** | Indie dev, PC 8GB | Agente local sem custos de API |
| **Equipe Pequena** | 2-5 devs em startup | ColaboraÃ§Ã£o + BTW |
| **Power User** | Dev sÃªnior / arquiteto | Computer Use + AutoResearch + Memory Palace |
| **Hobbyist/Maker** | Entusiasta nÃ£o-dev | InstalaÃ§Ã£o ultra-simples |
| **Empresa Privacy-First** | Dados sensÃ­veis | Zero telemetria + on-premise |

---

## 4. Stack TÃ©cnica (baseada no codebase real do NeoCode)

```yaml
Core Runtime:
  language: TypeScript (ES Modules)
  runtime: Bun v1.2+ (build + test) / Node.js 20+ (runtime)
  build: bun build (scripts/build.ts)
  ui_framework: React 19 + Ink (terminal UI)
  binary_entry: bin/neocode

Provider Layer (existente):
  shims: openaiShim.ts, codexShim.ts
  routing: agentRouting.ts (por goal/agent)
  config: providerConfig.ts + .neocode-profile.json

Tools Layer (48+ existentes):
  code: BashTool, PowerShellTool, FileEditTool, FileReadTool, FileWriteTool
  search: GlobTool, GrepTool, WebSearchTool, WebFetchTool
  agent: AgentTool, TaskCreateTool, WorkflowTool
  mcp: MCPTool, ListMcpResourcesTool, ReadMcpResourceTool
  computer_use: src/utils/computerUse/ (executor, wrapper, gates)

Memory Layer:
  existente: src/memdir/ + src/services/extractMemories/ + SessionMemory/
  novo: ChromaDB + SQLite Knowledge Graph (Memory Palace)

AutoDream (existente â€” aprimorar):
  src/services/autoDream/ (autoDream.ts, config.ts, consolidationLock.ts, consolidationPrompt.ts)

BTW (existente â€” aprimorar):
  src/commands/btw/

Notifications (NOVO):
  telegram: node-telegram-bot-api
  discord: discord.js
  whatsapp: whatsapp-web.js (plugin opcional)

Communication:
  gRPC: @grpc/grpc-js + protobuf (existente)
  WebSocket: ws (existente)
```

### DependÃªncias Novas (apenas adiÃ§Ãµes ao NeoCode)

```json
{
  "novas": {
    "chromadb": "^1.10.0",
    "better-sqlite3": "^11.5.0",
    "node-telegram-bot-api": "^0.66.1",
    "discord.js": "^14.16.0"
  },
  "remover": {
    "@anthropic-ai/bedrock-sdk": "proprietÃ¡rio",
    "@anthropic-ai/foundry-sdk": "proprietÃ¡rio",
    "@growthbook/growthbook": "feature-flags proprietÃ¡rio",
    "@opentelemetry/*": "telemetria (ou tornar opt-in)"
  }
}
```

---

## 5. Requisitos Funcionais

### RF-01: Rebranding & Identity
- Renomear binÃ¡rios, package, paths: `neocode` â†’ `neocode`
- Config: `~/.neocode/` e `.neocode/`
- Backward-compat com aliases `neocode` por 3 meses
- **ðŸ†• Visual identity Matrix-inspired** (ver Design System)

### RF-02: Multi-Provider Layer
- Ollama como provider padrÃ£o com auto-detection no startup
- Healthcheck + fallback automÃ¡tico entre providers
- UX refinada do `/provider` (Ollama em destaque)

### RF-03: Permission System & Sandbox
- PermissÃ£o granular por aÃ§Ã£o (screenshot vs click vs type)
- Modo "yolo" configurÃ¡vel por sessÃ£o
- Audit log de todas as aÃ§Ãµes executadas

### RF-04: Computer Use Full (Multi-Provider)
- Abstrair hostAdapter para interface genÃ©rica (nÃ£o Anthropic-only)
- Screenshot + OCR independente de provider
- Mouse/keyboard actions via Node FFI
- Multi-monitor support

### RF-05: Memory Palace HÃ­brido
- Wings (categorias) e Rooms (sub-categorias) sobre memdir
- Knowledge Graph via SQLite (entidades + relaÃ§Ãµes)
- Embeddings locais via ChromaDB
- Import/export de memÃ³rias
- Comando `/memory graph` para visualizaÃ§Ã£o

### RF-06: Guidance Agent Permanente
- Contexto carregado do `project-memory.md` + `.neocode/guidance.md`
- Injeta diretrizes em cada prompt
- Auto-update baseado em learnings

### RF-07: AutoReview
- Review automÃ¡tico pÃ³s file-edit
- IntegraÃ§Ã£o ESLint/Prettier como regras
- Severidade: silent / warn / block

### RF-08: AutoResearch (Karpathy-style)
- Pesquisa automÃ¡tica de conceitos desconhecidos
- Cache de pesquisas recentes
- CitaÃ§Ã£o de fontes no output

### RF-09: AutoDream (aprimorar existente)
- Merge de duplicatas, eliminaÃ§Ã£o de contradiÃ§Ãµes
- Pruning de memÃ³rias obsoletas
- Trigger: idle / intervalo / manual
- Log de auditoria

### RF-10: BTW (aprimorar existente)
- Mensagens assÃ­ncronas sem poluir histÃ³rico
- Envio via canais (Telegram/Discord)
- Buffer para review: `/btw list`

### RF-11: Daemon KAIROS 2.0
- Background: AutoDream scheduling, BTW dispatch, Notifications
- Config: `.neocode/kairos.yaml`
- Health monitoring

### RF-12: NotificaÃ§Ãµes em Canais
- Telegram (priority), Discord, WhatsApp (plugin)
- Webhook genÃ©rico para integraÃ§Ã£o custom

### RF-13: Prompt Enhance
- Pre-processing do prompt para modelo em uso
- Chain-of-thought injection para modelos pequenos
- Context window management inteligente

### RF-14: Self-Improve Loop
- AnÃ¡lise pÃ³s-sessÃ£o de erros e padrÃµes
- SugestÃµes de melhoria no project-memory.md

### RF-15: InstalaÃ§Ã£o Cross-Platform
- Script universal (bash + PowerShell)
- Auto-install de Ollama + modelo padrÃ£o
- Landing page `get.neocode.dev`

---

## 6. Requisitos NÃ£o-Funcionais

| ID | Requisito | MÃ©trica |
|---|---|---|
| RNF-01 | Tempo de startup CLI | â‰¤ 2s (cold start) |
| RNF-02 | LatÃªncia resposta (Ollama local) | â‰¤ 500ms first token |
| RNF-03 | RAM em idle | â‰¤ 300MB |
| RNF-04 | RAM com modelo 7B | â‰¤ 6GB total |
| RNF-05 | Tamanho do binÃ¡rio | â‰¤ 50MB (sem modelo) |
| RNF-06 | Cobertura de testes | â‰¥ 70% core |
| RNF-07 | Tempo de build | â‰¤ 30s |
| RNF-08 | Zero dados externos | VerificÃ¡vel via script |

---

## 7. MÃ©tricas de Sucesso

| MÃ©trica | v0.1 | v1.0 |
|---|---|---|
| GitHub Stars | 1.000 | 10.000 |
| InstalaÃ§Ãµes/semana | 500 | 5.000 |
| Contribuidores ativos | 10 | 50 |
| Modelos suportados testados | 10 | 50+ |

---

## 8. PriorizaÃ§Ã£o MoSCoW

**MUST (MVP v0.1):** M1â€“M6 (Rebranding, Multi-provider, Sandbox, Computer Use, Installer, Privacy)
**SHOULD (v0.5):** S1â€“S7 (Memory Palace, Guidance, AutoReview, AutoResearch, AutoDream, BTW, Prompt Enhance)
**COULD (v1.0):** C1â€“C7 (Self-Improve, KAIROS, Channels, Teams, VS Code, Git, Plugins)
**WON'T (futuro):** Mobile app, GUI Desktop, Cloud hosting

---

## 9. Riscos

| Risco | Prob. | Impacto | MitigaÃ§Ã£o |
|---|---|---|---|
| LicenÃ§a derivada do Claude Code | Alta | CrÃ­tico | Auditoria legal; MIT; remover refs proprietÃ¡rias |
| Modelos 7B em tool-calling complexo | Alta | Alto | Fallback chain + prompt engineering |
| `robotjs` builds nativos | MÃ©dia | Alto | Avaliar `@napi-rs/clipboard` + alternativas |
| WhatsApp Web.js instabilidade | MÃ©dia | MÃ©dio | Plugin opcional, nÃ£o core |
| Binary size com `bun pkg` | MÃ©dia | MÃ©dio | Tree-shaking + lazy-loading |

---

## 10. Quick Start

```bash
# Instalar
curl -fsSL https://get.neocode.dev | bash

# Iniciar (auto-detecta Ollama)
neocode

# Configurar modelo
/provider ollama qwen2.5-coder

# Ativar features
/memory palace on
/autoreview on
/channel telegram <token>
/btw
/research "implementar feature X"
/dream
```

---

> ðŸ“Ž **Documentos relacionados:**
> - [Arquitetura](./ARCHITECTURE.md)
> - [Epics & Stories](./EPICS.md)
> - [Design System](./DESIGN_SYSTEM.md)
