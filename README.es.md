<div align="center">

# NeoCode

**🌍 Idiomas:** [🇧🇷 Português](README.pt.md) | [🇺🇸 English](README.md) | [🇪🇸 Español](README.es.md)

---

**La CLI Agéntica de Próxima Generación para Desarrollo con IA Multi-Proveedor**

</div>

NeoCode es una CLI de agente de codificación de código abierto y centrada en la privacidad que funciona con proveedores de modelos de IA locales y en la nube. Usa OpenAI, Gemini, Ollama, Codex y otros backends manteniendo un flujo de trabajo potente basado en terminal con herramientas, agentes, protocolo MCP, comandos slash y salida en streaming.

[![PR Checks](https://github.com/LHenri88/NeoCode/actions/workflows/pr-checks.yml/badge.svg?branch=main)](https://github.com/LHenri88/NeoCode/actions/workflows/pr-checks.yml)
[![Release](https://img.shields.io/github/v/tag/LHenri88/NeoCode?label=release&color=0ea5e9)](https://github.com/LHenri88/NeoCode/tags)
[![Discussions](https://img.shields.io/badge/discussions-open-7c3aed)](https://github.com/LHenri88/NeoCode/discussions)
[![Security Policy](https://img.shields.io/badge/security-policy-0f766e)](SECURITY.md)
[![License](https://img.shields.io/badge/license-MIT-2563eb)](LICENSE)

[Inicio Rápido](#-inicio-rápido) | [Instalación](INSTALL.md) | [Características](#-características) | [Documentación](#-documentación) | [Proveedores](#-proveedores-soportados) | [Comunidad](#-comunidad)

---

## 🎯 ¿Por qué NeoCode?

- **Soporte Multi-Proveedor** - Usa una única CLI para OpenAI, Gemini, Ollama, GitHub Models, Codex y otros proveedores compatibles
- **Privacidad Primero** - Cero telemetría por defecto, soporte de IA local, verificable con `bun run verify:privacy`
- **Herramientas Potentes** - 48+ herramientas integradas (bash, operaciones de archivo, grep, glob, agentes, búsqueda web y mucho más)
- **Sistema de Memoria** - Memoria persistente de proyecto con Memory Palace y Knowledge Graph
- **Extensible** - Soporte al protocolo MCP, comandos slash personalizados, plugins y skills
- **Enfocado en Desarrolladores** - Flujo de trabajo basado en terminal con salida en streaming, resaltado de sintaxis e integración con VS Code
- **Agentes Autónomos** - Orquestación multi-agente con inteligencia de enjambre y delegación jerárquica de tareas
- **Tareas en Segundo Plano** - Daemon KAIROS para operaciones asíncronas, consolidación auto-dream y notificaciones

---

## 🚀 Inicio Rápido

### Instalación

**npm / npx (Recomendado para usuarios de Node.js)** 📦

Prueba sin instalar:
```bash
npx neocode-cli
```

Instalar globalmente:
```bash
npm install -g neocode-cli
neocode
```

---

**Binarios Standalone** ⚡ **¡No Requiere Node.js!**

Instalador de una línea (descarga automáticamente la versión más reciente):

macOS / Linux:
```bash
curl -fsSL https://raw.githubusercontent.com/LHenri88/NeoCode/main/install-standalone.sh | bash
```

Windows PowerShell:
```powershell
irm https://raw.githubusercontent.com/LHenri88/NeoCode/main/install-standalone.ps1 | iex
```

O descarga manualmente:
- [Windows x64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-windows-x64.exe)
- [Linux x64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-linux-x64)
- [macOS x64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-macos-x64)
- [macOS ARM64](https://github.com/LHenri88/NeoCode/releases/latest/download/neocode-macos-arm64)

**Compilar desde el Código Fuente (Desarrolladores):**

```bash
# Clonar repositorio
git clone https://github.com/LHenri88/NeoCode-Cli.git
cd NeoCode-Cli

# Instalar dependencias
bun install

# Compilar distribución regular
bun run build

# O compilar binarios standalone
bun run build:standalone:all
```

Ver [STANDALONE_BUILD.md](STANDALONE_BUILD.md) para instrucciones detalladas de compilación.

**Dependencias:**

Si la instalación reporta `ripgrep not found`, instala ripgrep en el sistema:

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt install ripgrep

# Windows
winget install BurntSushi.ripgrep.MSVC
```

### Primera Ejecución

```bash
neocode
```

Dentro de NeoCode:

- Ejecuta `/provider` para configuración guiada de proveedor con perfiles guardados
- Ejecuta `/help` para ver todos los comandos disponibles
- Ejecuta `/onboard-github` para integración con GitHub Models

### Configuración Rápida OpenAI

**macOS / Linux:**

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-tu-clave-aqui
export OPENAI_MODEL=gpt-4o

neocode
```

**Windows PowerShell:**

```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_API_KEY="sk-tu-clave-aqui"
$env:OPENAI_MODEL="gpt-4o"

neocode
```

### Configuración Rápida Ollama Local

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

## ✨ Características

### Capacidades Principales

- **48+ Herramientas Integradas** - Operaciones de archivo, ejecución bash, búsqueda grep/glob, búsqueda/fetch web, delegación de agentes y mucho más
- **93+ Comandos Slash** - Acceso rápido a características vía sintaxis `/comando`
- **Respuestas en Streaming** - Salida de tokens en tiempo real y progreso de herramientas
- **Bucles de Herramientas Multi-Etapa** - Flujos de trabajo complejos con llamadas de modelo, ejecución de herramientas y respuestas de seguimiento
- **Soporte de Visión** - Entradas de imagen vía URL y base64 para proveedores que soportan visión
- **Resaltado de Sintaxis** - Resaltado de sintaxis de código en la salida del terminal

### Memoria e Inteligencia

- **Memory Palace** - Organización jerárquica de memoria con Wings y Rooms
- **Knowledge Graph** - SQLite + ChromaDB para búsqueda semántica y relaciones
- **Memoria de Sesión** - Contexto persistente entre conversaciones
- **Auto-Dream** - Consolidación de memoria en segundo plano y extracción de insights
- **Agente de Orientación** - Enrutamiento de tareas consciente del contexto y optimización

### Experiencia del Desarrollador

- **Perfiles de Proveedor** - Configuraciones guardadas en `.neocode-profile.json`
- **Enrutamiento de Agentes** - Dirige diferentes agentes a diferentes modelos para optimización de costos
- **Sistema de Permisos** - Control granular sobre ejecución de herramientas (block/ask/auto/yolo)
- **Modo Sandbox** - Entorno de ejecución seguro para operaciones no confiables
- **Registro de Auditoría** - Registro persistente de todas las ejecuciones de herramientas

### Integraciones

- **Protocolo MCP** - Model Context Protocol para integración de herramientas externas
- **Extensión VS Code** - Integración de lanzamiento, soporte de temas y UI consciente de proveedor
- **Servidor gRPC** - Modo headless para integración con otras aplicaciones
- **Entrada de Voz** - Voz a texto para codificación manos libres
- **Canales de Notificación** - Telegram, Discord, WhatsApp vía plugins

### Automatización

- **Daemon KAIROS** - Programación y ejecución de tareas en segundo plano
- **BTW (By The Way)** - Tareas asíncronas en segundo plano con notificaciones en overlay en el terminal
- **Auto-Fix** - Ejecución automática de linting y pruebas después de ediciones de archivo
- **Hooks CI/CD** - Integración pre-commit, post-commit y PR

---

## 📖 Documentación

### Guías de Configuración

- **[Guía de Instalación](docs/INSTALLATION.md)** - Instrucciones detalladas de instalación para todas las plataformas
- **[Configuración No Técnica](docs/non-technical-setup.md)** - Guía amigable para principiantes
- **[Inicio Rápido Windows](docs/quick-start-windows.md)** - Instrucciones específicas para Windows
- **[Inicio Rápido macOS / Linux](docs/quick-start-mac-linux.md)** - Configuración para Unix
- **[Configuración Avanzada](docs/advanced-setup.md)** - Opciones de configuración avanzadas
- **[Instalación Android](ANDROID_INSTALL.md)** - Guía de configuración móvil

### Guías del Usuario

- **[Guía del Usuario](docs/USER_GUIDE.md)** - Tutorial completo de características
- **[Referencia de Comandos](docs/COMMANDS.md)** - Todos los comandos slash y uso
- **[Playbook](PLAYBOOK.md)** - Guía práctica para flujos de trabajo diarios
- **[Visión General de Características](docs/FEATURES.md)** - Documentación detallada de características

### Documentación del Desarrollador

- **[Arquitectura](docs/ARCHITECTURE.md)** - Diseño del sistema y visión general de componentes
- **[Guía de Contribución](CONTRIBUTING.md)** - Cómo contribuir a NeoCode
- **[Referencia de la API](docs/API.md)** - Desarrollo de integraciones y plugins
- **[Requisitos](docs/REQUIREMENTS.md)** - Dependencias y requisitos del sistema
- **[Política de Seguridad](SECURITY.md)** - Reporte de vulnerabilidades y prácticas de seguridad

### Documentación de Proveedores

- **[Visión General de Proveedores](docs/providers.md)** - Proveedores soportados y configuración
- **[Configuración LiteLLM](docs/litellm-setup.md)** - Usando NeoCode con proxy LiteLLM

---

## 🔌 Proveedores Soportados

| Proveedor | Ruta de Configuración | Notas |
|-----------|----------------------|-------|
| **Compatible con OpenAI** | `/provider` o vars de entorno | Funciona con OpenAI, OpenRouter, DeepSeek, Groq, Mistral, LM Studio y otros servidores `/v1` |
| **Gemini** | `/provider` o vars de entorno | Clave API, token de acceso o workflow ADC local |
| **GitHub Models** | `/onboard-github` | Onboarding interactivo con credenciales guardadas |
| **Codex** | `/provider` | Usa credenciales Codex existentes |
| **Ollama** | `/provider` o vars de entorno | Inferencia local sin clave API (recomendado) |
| **Atomic Chat** | configuración avanzada | Backend local Apple Silicon |
| **Bedrock** | vars de entorno | Integración AWS Bedrock |
| **Vertex AI** | vars de entorno | Google Cloud Vertex AI |
| **Azure OpenAI** | vars de entorno | Modelos OpenAI alojados en Azure |

### Notas sobre Proveedores

- La calidad de las herramientas varía por modelo - usa modelos con fuerte soporte de function calling
- Los modelos locales más pequeños pueden tener dificultades con flujos de trabajo multi-etapa complejos
- Algunos proveedores tienen límites de salida menores que los predeterminados de la CLI
- El enrutamiento de agentes permite mezclar proveedores (ej: GPT-4o para planificación, DeepSeek para ejecución)

---

## 🏗️ Arquitectura

NeoCode está construido en una arquitectura por capas:

```
┌─────────────────────────────────────────────────────┐
│  Capa de Interfaz (CLI, gRPC, VS Code, Voz)         │
├─────────────────────────────────────────────────────┤
│  Motor Principal (Loop, Tools, MCP, Permisos)       │
├─────────────────────────────────────────────────────┤
│  Capa de Proveedor (Ollama, OpenAI, Gemini, etc.)   │
├─────────────────────────────────────────────────────┤
│  Capa de Memoria (Memory Palace, Knowledge Graph)   │
├─────────────────────────────────────────────────────┤
│  Capa Daemon (KAIROS, AutoDream, Notificaciones)    │
└─────────────────────────────────────────────────────┘
```

Ver [ARCHITECTURE.md](docs/ARCHITECTURE.md) para diagramas detallados y descripciones de componentes.

---

## 🛠️ Desarrollo

### Compilación del Código Fuente

```bash
# Clonar repositorio
git clone https://gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/neocode.git
cd neocode

# Instalar dependencias
bun install

# Compilar
bun run build

# Ejecutar localmente
node dist/cli.mjs
```

### Comandos de Desarrollo

```bash
# Desarrollo con hot reload
bun run dev

# Ejecutar pruebas
bun test

# Cobertura de pruebas
bun run test:coverage

# Verificación de tipos
bun run typecheck

# Smoke test (validación rápida)
bun run smoke

# Diagnósticos de runtime
bun run doctor:runtime

# Verificación de privacidad
bun run verify:privacy
```

### Desarrollo de Proveedores

```bash
# Inicializar perfiles de proveedor
bun run profile:init -- --provider ollama --model llama3.1:8b
bun run profile:init -- --provider openai --api-key sk-... --model gpt-4o

# Lanzar con proveedor específico
bun run dev:ollama
bun run dev:openai
bun run dev:gemini

# Presets rápidos
bun run profile:fast   # llama3.2:3b
bun run profile:code   # qwen2.5-coder:7b
```

---

## 📦 Estructura del Repositorio

```
neocode/
├── bin/neocode              # Punto de entrada de la CLI
├── src/
│   ├── main.tsx             # Bucle principal
│   ├── tools/               # 48+ herramientas integradas
│   ├── commands/            # 93+ comandos slash
│   ├── services/            # Servicios principales
│   │   ├── api/             # Capa de proveedor
│   │   ├── autoDream/       # Consolidación de memoria
│   │   ├── kairos/          # Daemon en segundo plano
│   │   ├── memoryPalace/    # Memoria jerárquica
│   │   └── ...
│   ├── components/          # Componentes UI Ink/React
│   ├── grpc/                # Servidor gRPC
│   └── utils/               # Utilidades
├── vscode-extension/        # Extensión VS Code
├── plugins/                 # Plugins oficiales
├── scripts/                 # Scripts de build y utilidades
├── docs/                    # Documentación
└── tests/                   # Suites de prueba
```

---

## 🤝 Comunidad

- **[GitHub Discussions](https://github.com/LHenri88/NeoCode/discussions)** - Q&A, ideas y conversaciones de la comunidad
- **[GitHub Issues](https://github.com/LHenri88/NeoCode/issues)** - Reportes de bugs y solicitudes de características
- **[Guía de Contribución](CONTRIBUTING.md)** - Cómo contribuir a NeoCode
- **[Política de Seguridad](SECURITY.md)** - Reporte de vulnerabilidades

---

## 🔒 Seguridad

NeoCode está construido con seguridad y privacidad como principios fundamentales:

- **Cero Telemetría** - Ningún dato enviado a terceros (verificable con `bun run verify:privacy`)
- **Gates de Permiso** - Control granular sobre ejecución de herramientas
- **Modo Sandbox** - Entorno de ejecución seguro
- **Registro de Auditoría** - Registro persistente de todas las operaciones
- **Sin Credenciales Hardcoded** - Todos los secretos vía vars de entorno o archivos de config

Si crees haber encontrado un problema de seguridad, ver [SECURITY.md](SECURITY.md) para divulgación responsable.

---

## 📄 Licencia

NeoCode se originó del codebase Claude Code y ha sido sustancialmente modificado para soportar múltiples proveedores y uso abierto. "Claude" y "Claude Code" son marcas registradas de Anthropic PBC.

NeoCode es un proyecto comunitario independiente y no está afiliado, respaldado ni patrocinado por Anthropic.

Ver [LICENSE](LICENSE) para detalles completos de la licencia.

---

## 🙏 Reconocimientos

NeoCode se basa en el excelente trabajo de:

- **Claude Code** - Inspiración original y fundación
- **Anthropic** - Por Claude AI y el Anthropic SDK
- **Ollama** - Por hacer la IA local accesible
- **Ink** - Por el framework de UI para terminal
- **Model Context Protocol** - Para integración estandarizada de herramientas
- **Comunidad Open Source** - Por innumerables herramientas y bibliotecas

---

## 🚀 Próximos Pasos

Ver [EPICS.md](docs/EPICS.md) para nuestro roadmap y características futuras.

¡Únete a nosotros en la construcción de la CLI agéntica open-source más potente!

---

**Hecho con 💚 por la comunidad NeoCode**
