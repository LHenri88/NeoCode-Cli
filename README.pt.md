# NeoCode

**🌍 Idiomas:** [🇧🇷 Português](README.pt.md) | [🇺🇸 English](README.md) | [🇪🇸 Español](README.es.md)

---

**A CLI Agêntica de Próxima Geração para Desenvolvimento com IA Multi-Provedor**

NeoCode é uma CLI de agente de codificação open-source e com foco em privacidade que funciona com provedores de modelos de IA locais e em nuvem. Use OpenAI, Gemini, Ollama, Codex e outros backends mantendo um fluxo de trabalho poderoso baseado em terminal com ferramentas, agentes, protocolo MCP, comandos slash e saída em streaming.

[![PR Checks](https://github.com/LHenri88/NeoCode/actions/workflows/pr-checks.yml/badge.svg?branch=main)](https://github.com/LHenri88/NeoCode/actions/workflows/pr-checks.yml)
[![Release](https://img.shields.io/github/v/tag/LHenri88/NeoCode?label=release&color=0ea5e9)](https://github.com/LHenri88/NeoCode/tags)
[![Discussions](https://img.shields.io/badge/discussions-open-7c3aed)](https://github.com/LHenri88/NeoCode/discussions)
[![Security Policy](https://img.shields.io/badge/security-policy-0f766e)](SECURITY.md)
[![License](https://img.shields.io/badge/license-MIT-2563eb)](LICENSE)

[Início Rápido](#-início-rápido) | [Instalação](INSTALL.md) | [Recursos](#-recursos) | [Documentação](#-documentação) | [Provedores](#-provedores-suportados) | [Comunidade](#-comunidade)

---

## 🎯 Por que NeoCode?

- **Suporte Multi-Provedor** - Use uma única CLI para OpenAI, Gemini, Ollama, GitHub Models, Codex e outros provedores compatíveis
- **Privacidade em Primeiro Lugar** - Zero telemetria por padrão, suporte a IA local, verificável com `bun run verify:privacy`
- **Ferramentas Poderosas** - 48+ ferramentas integradas (bash, operações de arquivo, grep, glob, agentes, busca web e muito mais)
- **Sistema de Memória** - Memória persistente de projeto com Memory Palace e Knowledge Graph
- **Extensível** - Suporte ao protocolo MCP, comandos slash personalizados, plugins e skills
- **Focado em Desenvolvedores** - Fluxo de trabalho baseado em terminal com saída em streaming, syntax highlighting e integração com VS Code
- **Agentes Autônomos** - Orquestração multi-agente com inteligência de enxame e delegação hierárquica de tarefas
- **Tarefas em Background** - Daemon KAIROS para operações assíncronas, consolidação auto-dream e notificações

---

## 🚀 Início Rápido

### Instalação

**Binários Standalone (Recomendado)** ⚡ **Não Requer Node.js!**

Instalador de uma linha (baixa automaticamente a versão mais recente):

macOS / Linux:
```bash
curl -fsSL https://raw.githubusercontent.com/LHenri88/NeoCode/main/install-standalone.sh | bash
```

Windows PowerShell:
```powershell
irm https://raw.githubusercontent.com/LHenri88/NeoCode/main/install-standalone.ps1 | iex
```

Ou baixe manualmente:
- [Windows x64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-windows-x64.exe)
- [Linux x64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-linux-x64)
- [macOS x64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-macos-x64)
- [macOS ARM64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-macos-arm64)

**Compilar do Código Fonte (Desenvolvedores):**

```bash
# Clonar repositório
git clone https://github.com/LHenri88/NeoCode-Cli.git
cd NeoCode-Cli

# Instalar dependências
bun install

# Compilar distribuição regular
bun run build

# Ou compilar binários standalone
bun run build:standalone:all
```

Veja [STANDALONE_BUILD.md](STANDALONE_BUILD.md) para instruções detalhadas de compilação.

**Dependências:**

Se a instalação reportar `ripgrep not found`, instale o ripgrep no sistema:

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt install ripgrep

# Windows
winget install BurntSushi.ripgrep.MSVC
```

### Primeira Execução

```bash
neocode
```

Dentro do NeoCode:

- Execute `/provider` para configuração guiada de provedor com perfis salvos
- Execute `/help` para ver todos os comandos disponíveis
- Execute `/onboard-github` para integração com GitHub Models

### Configuração Rápida OpenAI

**macOS / Linux:**

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-sua-chave-aqui
export OPENAI_MODEL=gpt-4o

neocode
```

**Windows PowerShell:**

```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_API_KEY="sk-sua-chave-aqui"
$env:OPENAI_MODEL="gpt-4o"

neocode
```

### Configuração Rápida Ollama Local

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

## ✨ Recursos

### Capacidades Principais

- **48+ Ferramentas Integradas** - Operações de arquivo, execução bash, busca grep/glob, busca/fetch web, delegação de agentes e muito mais
- **93+ Comandos Slash** - Acesso rápido a recursos via sintaxe `/comando`
- **Respostas em Streaming** - Saída de tokens em tempo real e progresso de ferramentas
- **Loops de Ferramentas Multi-Etapa** - Fluxos de trabalho complexos com chamadas de modelo, execução de ferramentas e respostas de acompanhamento
- **Suporte a Visão** - Entradas de imagem via URL e base64 para provedores que suportam visão
- **Syntax Highlighting** - Destaque de sintaxe de código na saída do terminal

### Memória & Inteligência

- **Memory Palace** - Organização hierárquica de memória com Wings e Rooms
- **Knowledge Graph** - SQLite + ChromaDB para busca semântica e relacionamentos
- **Memória de Sessão** - Contexto persistente entre conversas
- **Auto-Dream** - Consolidação de memória em background e extração de insights
- **Agente de Orientação** - Roteamento de tarefas consciente do contexto e otimização

### Experiência do Desenvolvedor

- **Perfis de Provedor** - Configurações salvas em `.neocode-profile.json`
- **Roteamento de Agentes** - Direcione diferentes agentes para diferentes modelos para otimização de custo
- **Sistema de Permissões** - Controle granular sobre execução de ferramentas (block/ask/auto/yolo)
- **Modo Sandbox** - Ambiente de execução seguro para operações não confiáveis
- **Log de Auditoria** - Registro persistente de todas as execuções de ferramentas

### Integrações

- **Protocolo MCP** - Model Context Protocol para integração de ferramentas externas
- **Extensão VS Code** - Integração de lançamento, suporte a temas e UI consciente de provedor
- **Servidor gRPC** - Modo headless para integração com outras aplicações
- **Entrada de Voz** - Voz para texto para codificação mãos livres
- **Canais de Notificação** - Telegram, Discord, WhatsApp via plugins

### Automação

- **Daemon KAIROS** - Agendamento e execução de tarefas em background
- **BTW (By The Way)** - Tarefas assíncronas em background com notificações em overlay no terminal
- **Auto-Fix** - Execução automática de linting e testes após edições de arquivo
- **Hooks CI/CD** - Integração pre-commit, post-commit e PR

---

## 📖 Documentação

### Guias de Configuração

- **[Guia de Instalação](docs/INSTALLATION.md)** - Instruções detalhadas de instalação para todas as plataformas
- **[Configuração Não-Técnica](docs/non-technical-setup.md)** - Guia amigável para iniciantes
- **[Início Rápido Windows](docs/quick-start-windows.md)** - Instruções específicas para Windows
- **[Início Rápido macOS / Linux](docs/quick-start-mac-linux.md)** - Configuração para Unix
- **[Configuração Avançada](docs/advanced-setup.md)** - Opções de configuração avançadas
- **[Instalação Android](ANDROID_INSTALL.md)** - Guia de configuração móvel

### Guias do Usuário

- **[Guia do Usuário](docs/USER_GUIDE.md)** - Tutorial completo de recursos
- **[Referência de Comandos](docs/COMMANDS.md)** - Todos os comandos slash e uso
- **[Playbook](PLAYBOOK.md)** - Guia prático para fluxos de trabalho diários
- **[Visão Geral de Recursos](docs/FEATURES.md)** - Documentação detalhada de recursos

### Documentação do Desenvolvedor

- **[Arquitetura](docs/ARCHITECTURE.md)** - Design do sistema e visão geral de componentes
- **[Guia de Contribuição](CONTRIBUTING.md)** - Como contribuir para o NeoCode
- **[Referência da API](docs/API.md)** - Desenvolvimento de integrações e plugins
- **[Requisitos](docs/REQUIREMENTS.md)** - Dependências e requisitos do sistema
- **[Política de Segurança](SECURITY.md)** - Relatório de vulnerabilidades e práticas de segurança

### Documentação de Provedores

- **[Visão Geral de Provedores](docs/providers.md)** - Provedores suportados e configuração
- **[Configuração LiteLLM](docs/litellm-setup.md)** - Usando NeoCode com proxy LiteLLM

---

## 🔌 Provedores Suportados

| Provedor | Caminho de Configuração | Notas |
|----------|-------------------------|-------|
| **Compatível com OpenAI** | `/provider` ou vars de ambiente | Funciona com OpenAI, OpenRouter, DeepSeek, Groq, Mistral, LM Studio e outros servidores `/v1` |
| **Gemini** | `/provider` ou vars de ambiente | Chave API, token de acesso ou workflow ADC local |
| **GitHub Models** | `/onboard-github` | Onboarding interativo com credenciais salvas |
| **Codex** | `/provider` | Usa credenciais Codex existentes |
| **Ollama** | `/provider` ou vars de ambiente | Inferência local sem chave API (recomendado) |
| **Atomic Chat** | configuração avançada | Backend local Apple Silicon |
| **Bedrock** | vars de ambiente | Integração AWS Bedrock |
| **Vertex AI** | vars de ambiente | Google Cloud Vertex AI |
| **Azure OpenAI** | vars de ambiente | Modelos OpenAI hospedados no Azure |

### Notas sobre Provedores

- A qualidade das ferramentas varia por modelo - use modelos com forte suporte a function calling
- Modelos locais menores podem ter dificuldades com fluxos de trabalho multi-etapa complexos
- Alguns provedores têm limites de saída menores que os padrões da CLI
- O roteamento de agentes permite misturar provedores (ex: GPT-4o para planejamento, DeepSeek para execução)

---

## 🏗️ Arquitetura

NeoCode é construído em uma arquitetura em camadas:

```
┌─────────────────────────────────────────────────────┐
│  Camada de Interface (CLI, gRPC, VS Code, Voz)      │
├─────────────────────────────────────────────────────┤
│  Motor Principal (Loop, Tools, MCP, Permissões)     │
├─────────────────────────────────────────────────────┤
│  Camada de Provedor (Ollama, OpenAI, Gemini, etc.)  │
├─────────────────────────────────────────────────────┤
│  Camada de Memória (Memory Palace, Knowledge Graph) │
├─────────────────────────────────────────────────────┤
│  Camada Daemon (KAIROS, AutoDream, Notificações)    │
└─────────────────────────────────────────────────────┘
```

Veja [ARCHITECTURE.md](docs/ARCHITECTURE.md) para diagramas detalhados e descrições de componentes.

---

## 🛠️ Desenvolvimento

### Compilação do Código Fonte

```bash
# Clonar repositório
git clone https://gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/neocode.git
cd neocode

# Instalar dependências
bun install

# Compilar
bun run build

# Executar localmente
node dist/cli.mjs
```

### Comandos de Desenvolvimento

```bash
# Desenvolvimento com hot reload
bun run dev

# Executar testes
bun test

# Cobertura de testes
bun run test:coverage

# Verificação de tipos
bun run typecheck

# Smoke test (validação rápida)
bun run smoke

# Diagnósticos de runtime
bun run doctor:runtime

# Verificação de privacidade
bun run verify:privacy
```

### Desenvolvimento de Provedores

```bash
# Inicializar perfis de provedor
bun run profile:init -- --provider ollama --model llama3.1:8b
bun run profile:init -- --provider openai --api-key sk-... --model gpt-4o

# Lançar com provedor específico
bun run dev:ollama
bun run dev:openai
bun run dev:gemini

# Presets rápidos
bun run profile:fast   # llama3.2:3b
bun run profile:code   # qwen2.5-coder:7b
```

---

## 📦 Estrutura do Repositório

```
neocode/
├── bin/neocode              # Ponto de entrada da CLI
├── src/
│   ├── main.tsx             # Loop principal
│   ├── tools/               # 48+ ferramentas integradas
│   ├── commands/            # 93+ comandos slash
│   ├── services/            # Serviços principais
│   │   ├── api/             # Camada de provedor
│   │   ├── autoDream/       # Consolidação de memória
│   │   ├── kairos/          # Daemon em background
│   │   ├── memoryPalace/    # Memória hierárquica
│   │   └── ...
│   ├── components/          # Componentes UI Ink/React
│   ├── grpc/                # Servidor gRPC
│   └── utils/               # Utilitários
├── vscode-extension/        # Extensão VS Code
├── plugins/                 # Plugins oficiais
├── scripts/                 # Scripts de build e utilitários
├── docs/                    # Documentação
└── tests/                   # Suítes de teste
```

---

## 🤝 Comunidade

- **[GitHub Discussions](https://github.com/LHenri88/NeoCode/discussions)** - Q&A, ideias e conversas da comunidade
- **[GitHub Issues](https://github.com/LHenri88/NeoCode/issues)** - Relatórios de bugs e solicitações de recursos
- **[Guia de Contribuição](CONTRIBUTING.md)** - Como contribuir para o NeoCode
- **[Política de Segurança](SECURITY.md)** - Relatório de vulnerabilidades

---

## 🔒 Segurança

NeoCode é construído com segurança e privacidade como princípios fundamentais:

- **Zero Telemetria** - Nenhum dado enviado para terceiros (verificável com `bun run verify:privacy`)
- **Gates de Permissão** - Controle granular sobre execução de ferramentas
- **Modo Sandbox** - Ambiente de execução seguro
- **Log de Auditoria** - Registro persistente de todas as operações
- **Sem Credenciais Hardcoded** - Todos os segredos via vars de ambiente ou arquivos de config

Se você acredita ter encontrado um problema de segurança, veja [SECURITY.md](SECURITY.md) para divulgação responsável.

---

## 📄 Licença

NeoCode se originou do codebase Claude Code e foi substancialmente modificado para suportar múltiplos provedores e uso aberto. "Claude" e "Claude Code" são marcas registradas da Anthropic PBC.

NeoCode é um projeto comunitário independente e não é afiliado, endossado ou patrocinado pela Anthropic.

Veja [LICENSE](LICENSE) para detalhes completos da licença.

---

## 🙏 Agradecimentos

NeoCode se baseia no excelente trabalho de:

- **Claude Code** - Inspiração original e fundação
- **Anthropic** - Pelo Claude AI e o Anthropic SDK
- **Ollama** - Por tornar IA local acessível
- **Ink** - Pelo framework de UI para terminal
- **Model Context Protocol** - Para integração padronizada de ferramentas
- **Comunidade Open Source** - Por incontáveis ferramentas e bibliotecas

---

## 🚀 Próximos Passos

Veja [EPICS.md](docs/EPICS.md) para nosso roadmap e recursos futuros.

Junte-se a nós na construção da CLI agêntica open-source mais poderosa!

---

**Feito com 💚 pela comunidade NeoCode**
