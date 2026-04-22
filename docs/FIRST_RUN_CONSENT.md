# First Run Consent - Privacy Notice System

## 🎯 Visão Geral

O **First Run Consent** é um sistema de aprovação única que aparece quando o usuário inicia o NeoCode pela primeira vez. Em vez de múltiplos prompts de permissão durante o uso, apresentamos **uma única mensagem abrangente** cobrindo todas as ferramentas e acessos.

---

## ✨ Características

### 1. **Única Vez**
- ✅ Aparece apenas no primeiro uso
- ✅ Nunca mais será mostrado após aprovação
- ✅ Rastreado por ID único de usuário/máquina

### 2. **Abrangente**
- ✅ Cobre TODAS as ferramentas (filesystem, bash, network, computer use)
- ✅ Explicação clara do que cada ferramenta pode fazer
- ✅ Garantias de privacidade explícitas

### 3. **Transparente**
- ✅ Zero telemetria
- ✅ Operações locais
- ✅ Código auditável

### 4. **Simples**
- ✅ Opções claras: Yes ou No
- ✅ Opção de ler política completa
- ✅ Sair se recusar

---

## 📋 Fluxo de Uso

```
Usuario executa: neocode
        ↓
Verifica first-run consent
        ↓
    JÁ APROVADO?
    ↙         ↘
  SIM          NÃO
   ↓            ↓
Continua    Mostra Consent Dialog
 normal          ↓
            User escolhe:
            • [Y] Aceito
            • [N] Não aceito (sai)
            • [R] Ler política completa
                  ↓
            Salva decisão
                  ↓
            Se aceito: Continua
            Se recusou: Exit(0)
```

---

## 🎨 Interface do Consent Dialog

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║                    🔒 NeoCode Privacy Notice                      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Welcome to NeoCode - Privacy-First Agentic CLI

Before you begin, please review what NeoCode can access:

┌─────────────────────────────────────────────────────────────────┐
│ 📁 FILE SYSTEM ACCESS                                           │
├─────────────────────────────────────────────────────────────────┤
│ • Read files from your computer (for code analysis)            │
│ • Write files to your computer (for code generation)           │
│ • Browse directory structure                                    │
│                                                                 │
│ When: When you ask NeoCode to read, write, or analyze files    │
│ Scope: Only directories you explicitly work in                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 💻 SYSTEM COMMANDS                                              │
├─────────────────────────────────────────────────────────────────┤
│ • Execute bash/PowerShell commands                             │
│ • Run build scripts (npm, pip, etc.)                          │
│ • Git operations                                              │
│                                                                 │
│ When: When you ask NeoCode to run commands                     │
│ Protection: Permission system for destructive operations       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🌐 NETWORK ACCESS (Optional)                                    │
├─────────────────────────────────────────────────────────────────┤
│ • Web search (DuckDuckGo)                                      │
│ • Fetch web pages for analysis                                │
│ • Download AI models (Ollama)                                 │
│                                                                 │
│ When: When you ask for web search or online information        │
│ Privacy: No tracking, no analytics                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🖥️  COMPUTER USE (Disabled by Default)                          │
├─────────────────────────────────────────────────────────────────┤
│ • Screenshot capture                                            │
│ • Mouse/keyboard control                                       │
│                                                                 │
│ When: Only if you explicitly enable with /computer-use on      │
│ Protection: Requires additional approval per action            │
└─────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════╗
║                     🛡️  PRIVACY GUARANTEES                        ║
╚═══════════════════════════════════════════════════════════════════╝

✅ ZERO TELEMETRY - No data sent to external servers
✅ LOCAL-FIRST - All operations stay on your machine
✅ VERIFIABLE - Run 'bun run verify:privacy' to audit code
✅ PERMISSION GATES - Approve destructive operations before execution
✅ OPEN SOURCE - Full transparency of all operations

╔═══════════════════════════════════════════════════════════════════╗
║                       📋 YOUR CONTROL                             ║
╚═══════════════════════════════════════════════════════════════════╝

You can always:
• /permissions - Manage tool permissions
• /sandbox - Enable command sandboxing (Docker)
• /computer-use off - Disable screen control
• ~/.claude/settings.json - Full configuration control

═══════════════════════════════════════════════════════════════════

Do you accept these terms and conditions?

  [Y] Yes, I understand and accept
  [N] No, exit NeoCode
  [R] Read full privacy policy

═══════════════════════════════════════════════════════════════════
```

---

## 🔐 Como Funciona Internamente

### 1. Geração de User ID

```typescript
// Gera ID único baseado em:
const username = userInfo().username
const hostname = userInfo().username
const platformId = platform()
const random = randomBytes(8).toString('hex')

const userId = `${username}-${hostname}-${platformId}-${random}`
```

**Características do User ID:**
- ✅ Único por usuário/máquina
- ✅ Persiste entre sessões
- ✅ Armazenado localmente em `~/.claude/settings.json`
- ❌ Nunca enviado para servidores externos

### 2. Armazenamento do Consent

**Localização:** `~/.claude/settings.json`

```json
{
  "userId": "john-laptop-darwin-a1b2c3d4",
  "firstRunConsent": {
    "userId": "john-laptop-darwin-a1b2c3d4",
    "consentGiven": true,
    "consentVersion": "1.0",
    "timestamp": 1713648000000,
    "platform": "darwin",
    "username": "john"
  }
}
```

### 3. Verificação no Startup

```typescript
// src/interactiveHelpers.tsx - showSetupScreens()

// Após TrustDialog, verifica first-run consent
if (!hasFirstRunConsent()) {
  const accepted = await showDialog(root, done =>
    <FirstRunConsentDialog onComplete={done} />
  )

  if (!accepted) {
    process.exit(0) // User recusou
  }
}

// Continua normalmente...
```

---

## 📊 Versionamento de Consent

### Conceito

Se a política de privacidade mudar significativamente, podemos incrementar a versão:

```typescript
const CURRENT_CONSENT_VERSION = '1.1' // Era 1.0
```

**Resultado:**
- Usuários com consent v1.0 verão o dialog novamente
- Permite re-consentir após mudanças importantes
- Transparente sobre mudanças na política

### Quando Incrementar Versão

✅ **SIM - Incrementar:**
- Adicionar novo tipo de acesso (ex: camera access)
- Mudar escopo de permissões existentes
- Alterar garantias de privacidade

❌ **NÃO - Manter versão:**
- Correções de bugs
- Melhorias de UI
- Clarificações de texto

---

## 🎛️ Comandos de Gerenciamento

### Ver Status do Consent

```bash
# Dentro do NeoCode
/privacy consent-status
```

**Saída:**
```
First Run Consent Status:

User ID: john-laptop-darwin-a1b2c3d4
Consent Given: ✅ Yes
Consent Version: 1.0
Accepted On: 2024-04-21 10:30:45
Platform: darwin (macOS)

Review policy: docs/FIRST_RUN_CONSENT.md
Revoke consent: /privacy revoke-consent
```

---

### Revogar Consent (Re-onboarding)

```bash
/privacy revoke-consent
```

**Avisos:**
```
⚠️  Warning: This will reset your first-run consent
⚠️  You will see the privacy notice again on next launch
⚠️  All permission settings will remain unchanged

Are you sure? (y/N)
```

**Se confirmado:**
```
✓ First-run consent revoked
✓ User ID preserved: john-laptop-darwin-a1b2c3d4
✓ Restart NeoCode to see privacy notice again
```

---

### Forçar Re-onboarding (Admin/Testing)

```bash
# Resetar completamente (remover userId também)
rm ~/.claude/settings.json

# Ou apenas consent
# (editar manualmente removendo firstRunConsent)
```

---

## 🔒 Garantias de Privacidade

### O que é Salvo Localmente

**`~/.claude/settings.json`:**
```json
{
  "userId": "unique-id",
  "firstRunConsent": { ... },
  "theme": "dark",
  "permissions": { ... }
}
```

### O que NUNCA é Enviado

❌ User ID
❌ Consent data
❌ Timestamp de aceitação
❌ Nome de usuário
❌ Hostname
❌ Platform info

### Verificação

```bash
# Auditar código para phone-home
bun run verify:privacy

# Inspecionar network calls
# (NeoCode não faz calls além de AI APIs configuradas)
```

---

## 📝 Política Completa

Quando user pressiona **[R]**, vê:

```
NeoCode Privacy Policy - Full Version
Version 1.0 - Last Updated: 2024-04-21

═══════════════════════════════════════════════════════════════════
1. DATA COLLECTION
═══════════════════════════════════════════════════════════════════

NeoCode does NOT collect, transmit, or store any user data on external
servers. All data remains on your local machine.

What NeoCode stores locally:
• Configuration files in ~/.claude/
• Session history (if enabled)
• Memory files for context (project-memory.md, guidance.md)
• Tool execution logs (audit.log if enabled)

═══════════════════════════════════════════════════════════════════
2. AI PROVIDER DATA SHARING
═══════════════════════════════════════════════════════════════════

When you use NeoCode with AI providers (OpenAI, Gemini, etc.), the
prompts and code context ARE sent to those providers' APIs.

What is sent to AI providers:
• Your prompts and questions
• Code context from files you're working with
• Tool execution results

What is NOT sent:
• Your file system structure (only requested files)
• Environment variables or secrets (filtered)
• Personal information (unless in code you share)

Local-only option:
• Use Ollama for 100% local AI (no data leaves your machine)

[... continua com 8 seções completas ...]

Press any key to return to consent screen...
```

---

## 🎓 Benefícios da Abordagem

### Para Usuários

✅ **Sem Interrupções** - Aprovar uma vez, usar sempre
✅ **Transparência Total** - Tudo explicado claramente upfront
✅ **Controle** - Pode revogar e ver novamente quando quiser
✅ **Privacidade** - Garantias explícitas de zero telemetry

### Para Desenvolvedores

✅ **Simplicidade** - Um único ponto de consent
✅ **Manutenível** - Versionamento claro de políticas
✅ **Auditável** - Código open source verificável
✅ **Compliance** - GDPR-friendly (consent explícito)

---

## 🔧 Integração

### No Código

```typescript
// src/interactiveHelpers.tsx

export async function showSetupScreens(...) {
  // ... TrustDialog ...

  // Check first-run consent
  if (!hasFirstRunConsent()) {
    const accepted = await showDialog(root, done =>
      <FirstRunConsentDialog onComplete={done} />
    )

    if (!accepted) {
      exitWithMessage('Privacy consent declined. Exiting NeoCode.')
    }
  }

  // ... continua setup ...
}
```

### Arquivos Criados

1. ✅ `src/utils/permissions/firstRunConsent.ts` - Core logic
2. ✅ `src/components/FirstRunConsentDialog.tsx` - UI component
3. ✅ `docs/FIRST_RUN_CONSENT.md` - Documentação (este arquivo)

---

## 🧪 Testing

### Testar First Run

```bash
# 1. Remover consent existente
rm ~/.claude/settings.json

# 2. Executar NeoCode
neocode

# 3. Verificar que consent dialog aparece
# 4. Aceitar com [Y]
# 5. Verificar que settings.json foi criado

cat ~/.claude/settings.json | grep firstRunConsent
```

### Testar Policy View

```bash
# No consent dialog, pressionar [R]
# Verificar que política completa é mostrada
# Verificar scroll com ↑↓
# Pressionar qualquer tecla para voltar
```

### Testar Declínio

```bash
# 1. Remover consent
rm ~/.claude/settings.json

# 2. Executar NeoCode
neocode

# 3. Pressionar [N] no consent dialog
# 4. Verificar que NeoCode sai (exit code 0)
```

---

## 📚 Referências

- **Código:**
  - [firstRunConsent.ts](../src/utils/permissions/firstRunConsent.ts)
  - [FirstRunConsentDialog.tsx](../src/components/FirstRunConsentDialog.tsx)
  - [interactiveHelpers.tsx](../src/interactiveHelpers.tsx)

- **Documentação:**
  - [PRIVACY_SYSTEM.md](PRIVACY_SYSTEM.md)
  - [USER_GUIDE.md](USER_GUIDE.md)
  - [SECURITY.md](../SECURITY.md)

---

**Privacy First. Consent First. Always.** 🔒
