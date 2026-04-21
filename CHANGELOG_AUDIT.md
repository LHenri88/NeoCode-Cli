# Changelog - Auditoria Funcional Profunda v0.1.8

Data: 2026-04-20

---

## 🎯 RESUMO DAS CORREÇÕES APLICADAS

### ✅ 1. Computer Use - Windows Mouse & Keyboard (CORRIGIDO)
**Status:** ✅ **FUNCIONANDO**

**Antes:**
```
⎿ Computer Use — ✅ enabled
   Screenshot: ✅
   Mouse control: ❌
   Keyboard control: ❌
```

**Depois:**
```
⎿ Computer Use — ✅ enabled
   Screenshot: ✅
   Mouse control: ✅
   Keyboard control: ✅
```

**Implementação:**
- Funções PowerShell nativas para Windows
- Mouse via `System.Windows.Forms.Cursor` + DllImport `user32.dll::mouse_event`
- Teclado via `System.Windows.Forms.SendKeys`
- Mapeamento completo de teclas especiais (Enter, Tab, Arrows, etc.)

**Arquivo:** `src/utils/computerUse/crossPlatform.ts`

---

### ✅ 2. Indicador Visual de Enhanced Prompt (JÁ IMPLEMENTADO)
**Status:** ✅ **JÁ FUNCIONA** - Apenas documentado

O indicador já existia no NeoStatusBar:
- **✦** (verde brilhante) = CoT (Chain-of-Thought) ativo em modelos pequenos
- **✦** (dim) = Pass-through em modelos grandes

**Lógica:**
- Modelos < 14B parâmetros → CoT prefix injetado automaticamente
- Modelos grandes (Claude, GPT-4, etc.) → Sem modificação

**Localização:**
- `src/components/NeoStatusBar.tsx` - Componente visual
- `src/utils/promptEnhancer.ts` - Lógica de enhancement
- `src/components/StatusLine.tsx` - Dados para status line hooks

**Configuração:**
```typescript
// settings.json
{
  "promptEnhancementEnabled": true  // padrão: true
}
```

---

### ✅ 3. Detecção de Antigravity IDE (CORRIGIDO)
**Status:** ✅ **CORRIGIDO**

**Problema:** Antigravity era detectado como VS Code incorretamente.

**Solução:** Movida detecção de Antigravity para ANTES do VS Code genérico.

**Ordem de Detecção (prioritária):**
1. **Antigravity** - `ANTIGRAVITY_SESSION_ID`, `.antigravity`, etc.
2. **Cursor** - `CURSOR_TRACE_ID`
3. **Windsurf** - `WINDSURF_EXTENSION_ID`
4. **VS Code** - `TERM_PROGRAM=vscode` (genérico)
5. **Continue.dev** - `CONTINUE_WORKSPACE_DIRECTORY`
6. **Unknown** - Terminal padrão

**Variáveis Detectadas:**
```bash
ANTIGRAVITY_SESSION_ID
ANTIGRAVITY_WORKSPACE
ANTIGRAVITY_VERSION
VSCODE_GIT_ASKPASS_MAIN (contém "antigravity")
TERM_PROGRAM_VERSION (contém "antigravity")
.antigravity ou .antigravity.json (arquivo no workspace)
```

**Arquivo:** `src/services/webPreview/ideDetector.ts`

---

### ✅ 4. Kairos/Dream Mode (VERIFICADO - JÁ HABILITADO)
**Status:** ✅ **ATIVO**

```typescript
// scripts/build.ts
KAIROS: true,
KAIROS_DREAM: true,
KAIROS_BRIEF: true,
KAIROS_CHANNELS: true,
```

**Funcionalidades Ativas:**
- Auto-Dream: Consolidação automática de contexto em background
- Kairos Briefs: Resumos de sessões
- Kairos Channels: Canais de comunicação para agentes
- Memory Palace: Memória de longo prazo

**Arquivos:**
- `src/services/autoDream/autoDream.ts` - Dream engine
- `src/services/autoDream/dreamLog.ts` - Logging
- `src/services/kairos/` - Sistema Kairos completo

---

### ✅ 5. Salvamento de Histórico de Sessões (VERIFICADO - FUNCIONA)
**Status:** ✅ **IMPLEMENTADO**

**Diretórios:**
```bash
# Windows
D:\Users\Administrator\.claude\sessions\
D:\Users\Administrator\.neocode\sessions\
%LOCALAPPDATA%\NeoCode\sessions\

# Linux/Mac
~/.claude/sessions/
~/.neocode/sessions/
```

**Comandos:**
```bash
neocode resume              # Picker interativo
neocode --continue          # Última sessão
neocode --from-pr 123       # Sessão vinculada a PR

# Com BG_SESSIONS habilitado:
neocode ps                  # Listar sessões ativas
neocode logs <session-id>   # Ver logs
neocode attach <id>         # Anexar a sessão
neocode kill <id>           # Matar sessão
```

---

### ⚠️ 6. Voice Mode - Indicador Visual (JÁ IMPLEMENTADO)
**Status:** ⚠️ **REQUER CONFIGURAÇÃO DO USUÁRIO**

**Indicador Existe:**
```
◎ - Voice idle (aguardando)
⏺ - Recording (gravando)
◉ - Processing (transcrevendo)
```

**Backends Suportados:**
1. **Windows Speech Recognition** (nativo - recomendado)
2. **Whisper** (local ou cloud)
3. **Anthropic voice_stream** (requer API key)

**Como Ativar:**

#### Opção 1: Windows (Nativo)
```powershell
# Ativar em: Configurações > Tempo e Idioma > Fala
# Depois apenas iniciar NeoCode e pressionar ESPAÇO
```

#### Opção 2: Whisper Local
```bash
$env:WHISPER_ENDPOINT="http://localhost:8000/transcribe"
neocode
```

#### Opção 3: Anthropic (Cloud)
```bash
# Com ANTHROPIC_API_KEY configurada
neocode
# Pressionar e segurar ESPAÇO
```

**Arquivos:**
- `src/hooks/useVoice.ts` - Lógica principal
- `src/components/PromptInput/VoiceIndicator.tsx` - Indicador visual
- `src/services/voice.ts` - Gerenciamento de backends

---

### ❌ 7. Preview Mode Auto-Reload (NÃO IMPLEMENTADO)
**Status:** ❌ **DESENVOLVIMENTO FUTURO**

**Estado Atual:**
- Comando `/preview` existe
- Execução manual apenas
- Sem file watching automático

**Esperado (Não Implementado):**
- Detectar mudanças em arquivos (*.html, *.jsx, *.tsx)
- Executar build automaticamente (npm run build, vite build)
- Iniciar dev server (npm run dev)
- Atualizar logs para IA

**Implementação Futura:**
```typescript
// Pseudocódigo - a implementar
import { watch } from 'chokidar'

function startAutoPreview(projectDir: string) {
  // 1. Detectar framework (package.json)
  // 2. Iniciar dev server apropriado
  // 3. Watch arquivos
  // 4. Hot reload + feedback para IA
}
```

---

## 📊 RESUMO FINAL

| Funcionalidade | Status | Nota |
|----------------|--------|------|
| Computer Use (Win) | ✅ CORRIGIDO | Mouse + Teclado via PowerShell |
| Enhanced Prompt Indicator | ✅ JÁ EXISTE | ✦ no NeoStatusBar |
| Antigravity IDE Detection | ✅ CORRIGIDO | Prioridade antes VS Code |
| Kairos/Dream Mode | ✅ HABILITADO | Auto-dream ativo |
| Histórico de Sessões | ✅ FUNCIONA | Diretórios verificados |
| Voice Mode Indicator | ⚠️ CONFIG USER | Requer backend STT |
| Preview Auto-Reload | ❌ TODO | Feature futura |

---

## 🚀 COMANDOS DE COMMIT

### Commit 1: Computer Use Windows Fix
```bash
git add src/utils/computerUse/crossPlatform.ts
git commit -m "feat(computer-use): add Windows mouse and keyboard support

Implement native Windows controls via PowerShell:
- Mouse movement via System.Windows.Forms.Cursor
- Mouse click via user32.dll mouse_event DllImport
- Keyboard input via System.Windows.Forms.SendKeys
- Cursor position tracking

Capabilities updated:
- mouse: true (Windows + Linux)
- keyboard: true (Windows + Linux)

Fixes: Computer Use showing ❌ for mouse/keyboard on Windows"
```

### Commit 2: IDE Detection & Status Line
```bash
git add src/services/webPreview/ideDetector.ts src/components/StatusLine.tsx
git commit -m "fix: improve IDE detection and add prompt enhancement info

IDE Detection:
- Move Antigravity detection before generic VS Code check
- Add ANTIGRAVITY_* env vars detection
- Check .antigravity config files
- Prevents false VS Code detection for Antigravity IDE

Status Line:
- Add prompt_enhancement field to StatusLineCommandInput
- Include enabled flag and strategy (cot-prefix/identity)
- Visual indicator already exists in NeoStatusBar (✦ icon)

Fixes: Antigravity IDE incorrectly detected as VS Code"
```

### Commit 3: Documentation
```bash
git add docs/FIXES_APPLIED.md CHANGELOG_AUDIT.md
git commit -m "docs: add functional audit results and fixes

Documents:
- Computer Use Windows implementation
- Enhanced Prompt indicator (already exists)
- Antigravity IDE detection fix
- Kairos/Dream mode status (enabled)
- Voice Mode setup requirements
- Preview Mode limitations (manual only)

All 786 tests passing, build successful"
```

---

## ✅ CHECKLIST PRÉ-COMMIT FINAL

- [x] Computer Use: Windows mouse/keyboard ✅
- [x] Tests: 786/786 passing (100%)
- [x] Build: Successful (19MB)
- [x] IDE Detection: Antigravity priorizado
- [x] Enhanced Prompt: Indicador existe (✦)
- [x] Kairos/Dream: Verificado (habilitado)
- [x] Voice Mode: Documentado
- [x] Preview Mode: Limitação documentada
- [x] Hardening: All checks OK

---

## 📝 ISSUES PARA CRIAR (Pós-Commit)

### Issue 1: Preview Mode Auto-Reload
```markdown
## Title
Implement automatic preview mode with file watching

## Description
Add automatic file watching and hot reload to `/preview` command:
- Detect framework (Vite, Next, CRA, etc.)
- Start appropriate dev server
- Watch for changes in *.html, *.jsx, *.tsx
- Auto-rebuild and refresh
- Feed logs back to AI

## Labels
enhancement, preview-mode, file-watching

## Priority
Medium
```

### Issue 2: Voice Mode Setup Guide
```markdown
## Title
Create Voice Mode configuration guide

## Description
Document Voice Mode setup for all platforms:
- Windows Speech Recognition (native)
- Whisper (local/cloud)
- Anthropic voice_stream (cloud)

Include troubleshooting and verification steps.

## Labels
documentation, voice-mode

## Priority
High
```

---

**Auditoria Completa em**: 2026-04-20
**Versão**: NeoCode 0.1.8
**Testes**: 786/786 ✅
**Build**: 19MB ✅
**Status**: **APROVADO PARA COMMIT**
