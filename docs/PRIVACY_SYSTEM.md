# Privacy System - Sistema de Aprovação do Usuário

## 🔒 Visão Geral

O NeoCode implementa um **sistema robusto de privacidade** que garante que o usuário deve aprovar explicitamente qualquer acesso a:

- ✅ Sistema de arquivos local (leitura/escrita)
- ✅ Navegação de diretórios
- ✅ Computer Use (screenshot + controle de mouse/teclado)
- ✅ Comandos do sistema
- ✅ Acesso à rede

---

## 🎯 Princípios

1. **Consentimento Explícito** - Usuário deve aprovar cada operação
2. **Transparência Total** - Avisos claros sobre o que será acessado
3. **Granularidade** - Aprovação por tipo de operação e caminho
4. **Revogável** - Usuário pode revogar permissões a qualquer momento
5. **Zero Telemetria** - Nenhum dado sai da máquina do usuário

---

## 📋 Tipos de Consentimento

### Filesystem Read
**O que é:** Leitura de arquivos do computador do usuário

**Quando aparece:**
- `/import` - Ao importar arquivos de outros projetos
- File browser - Ao navegar em diretórios

**Níveis de risco:**
- 🟢 **Baixo:** Diretórios de projeto
- 🟡 **Médio:** Documents, Downloads
- 🔴 **Alto:** .ssh, .aws, .config, /etc, C:\Windows

---

### Filesystem Write
**O que é:** Escrita de arquivos no computador do usuário

**Quando aparece:**
- `/import --target` - Ao importar para um diretório específico
- Write operations - Ao criar/modificar arquivos

**Níveis de risco:**
- 🟢 **Baixo:** Diretório do projeto atual
- 🟡 **Médio:** Outros diretórios do usuário
- 🔴 **Alto:** Diretórios do sistema

---

### Filesystem Browse
**O que é:** Navegação na estrutura de diretórios

**Quando aparece:**
- `/import` (sem argumentos) - File browser interativo

**Níveis de risco:**
- 🟢 **Baixo:** Sempre (apenas visualização)

---

### Computer Use
**O que é:** Captura de screenshot + controle de mouse/teclado

**Quando aparece:**
- `/computer-use on` - Ao ativar Computer Use

**Níveis de risco:**
- 🔴 **Alto:** Sempre (controle total do sistema)

**Avisos especiais:**
- ⚠️ AI pode ver e controlar sua tela
- ⚠️ Requer aprovação para cada ação (a menos que YOLO mode)

---

### System Command
**O que é:** Execução de comandos do sistema

**Quando aparece:**
- Bash tool - Comandos que requerem aprovação

**Níveis de risco:**
- 🔴 **Alto:** Sempre (acesso total ao sistema)

---

### Network Access
**O que é:** Acesso à internet/rede

**Quando aparece:**
- WebFetch - Ao buscar páginas web
- WebSearch - Ao fazer buscas

**Níveis de risco:**
- 🟡 **Médio:** Sempre

---

## 🎚️ Escopos de Aprovação

### Once (Uma vez)
- ✅ Válido apenas para esta operação
- ✅ Sempre disponível
- ❌ Não salvo

**Quando usar:**
- Operações únicas
- Teste de funcionalidade
- Quando não tem certeza

---

### Session (Sessão)
- ✅ Válido até fechar o NeoCode
- ✅ Disponível para risco baixo/médio
- ❌ Perdido ao reiniciar

**Quando usar:**
- Múltiplas operações na mesma sessão
- Desenvolvimento ativo
- Importação de vários arquivos

---

### Permanent (Permanente)
- ✅ Salvo em `~/.claude/settings.json`
- ✅ Disponível apenas para risco baixo
- ✅ Persiste entre sessões

**Quando usar:**
- Diretórios de projeto confiáveis
- Operações recorrentes
- Após validar segurança

---

## 🛡️ Avaliação de Risco

### 🟢 Baixo Risco
**Critérios:**
- Operação de leitura
- Diretório do projeto
- Sem impacto no sistema

**Permissões:**
- ✅ Once
- ✅ Session
- ✅ Permanent

**Exemplo:**
```
🟢 Privacy Notice (low risk)

Operation: Import project files
Access: Read files from your computer
Location: ~/projects/my-app

Privacy: NeoCode is privacy-first with zero telemetry
Data: All operations stay local on your machine
```

---

### 🟡 Médio Risco
**Critérios:**
- Operação de escrita
- Diretórios do usuário (não-sistema)
- Acesso à rede

**Permissões:**
- ✅ Once
- ✅ Session
- ❌ Permanent (não recomendado)

**Exemplo:**
```
🟡 Privacy Notice (medium risk)

Operation: Import to Documents folder
Access: Write files to your computer
Location: ~/Documents/imported-files

Privacy: NeoCode is privacy-first with zero telemetry
Data: All operations stay local on your machine
```

---

### 🔴 Alto Risco
**Critérios:**
- Computer Use (screenshot + controle)
- Diretórios sensíveis (.ssh, .aws, /etc, etc.)
- Comandos do sistema
- Escrita em diretórios do sistema

**Permissões:**
- ✅ Once
- ❌ Session (não disponível)
- ❌ Permanent (não disponível)

**Exemplo:**
```
🔴 Privacy Notice (high risk)

Operation: Enable Computer Use
Access: Screenshot capture + mouse/keyboard control
⚠️  Warning: AI can see and control your screen

Privacy: NeoCode is privacy-first with zero telemetry
Data: All operations stay local on your machine
```

---

## 🎨 Interface de Aprovação

### Dialog Example

```
╭─────────────────────────────────────────────╮
│ Privacy Approval Required                   │
│ Import files from another project           │
├─────────────────────────────────────────────┤
│                                             │
│ 🟢 Privacy Notice (low risk)                │
│                                             │
│ Operation: Import project files             │
│ Access: Read files from your computer       │
│ Location: ~/projects/templates              │
│                                             │
│ Privacy: NeoCode is privacy-first           │
│ Data: All operations stay local             │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │ ✓ Allow once                          │   │
│ │   Grant access for this single        │   │
│ │   operation                           │   │
│ ├───────────────────────────────────────┤   │
│ │ ✓ Allow for session                   │   │
│ │   Valid until you close NeoCode       │   │
│ ├───────────────────────────────────────┤   │
│ │ ✓ Always allow                        │   │
│ │   Remember this choice permanently    │   │
│ ├───────────────────────────────────────┤   │
│ │ ✗ Deny                                │   │
│ │   Do not grant access                 │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ Choose your preference · Esc to deny        │
╰─────────────────────────────────────────────╯
```

---

## 📁 Diretórios Sensíveis

### Unix/Linux/macOS
```
~/.ssh           # Chaves SSH
~/.aws           # Credenciais AWS
~/.config        # Configurações
~/Documents      # Documentos pessoais
~/Desktop        # Área de trabalho
~/Downloads      # Downloads
/etc             # Configurações do sistema
/System          # Sistema (macOS)
/root            # Root home
```

### Windows
```
C:\Windows                 # Sistema Windows
C:\Program Files           # Programas instalados
C:\Program Files (x86)     # Programas 32-bit
%USERPROFILE%\.ssh         # Chaves SSH
%USERPROFILE%\.aws         # Credenciais AWS
%USERPROFILE%\Documents    # Documentos
%USERPROFILE%\Desktop      # Área de trabalho
%USERPROFILE%\Downloads    # Downloads
```

---

## 🔧 Gerenciamento de Consentimentos

### Ver Consentimentos Ativos

```bash
/privacy list
```

**Saída:**
```
Active Privacy Consents:

Session (expires on exit):
  • filesystem-browse: ~/projects

Permanent:
  • filesystem-read: ~/projects/my-app
  • filesystem-write: ~/projects/my-app/src

Total: 3 consents (1 session, 2 permanent)
```

---

### Revogar Consentimento

```bash
/privacy revoke filesystem-read ~/projects/my-app
```

**Saída:**
```
✓ Revoked consent: filesystem-read for ~/projects/my-app
```

---

### Limpar Todos os Consentimentos de Sessão

```bash
/privacy clear-session
```

**Saída:**
```
✓ Cleared all session consents (1 consent removed)
```

---

### Desabilitar Privacy Gates (Não Recomendado)

```bash
/privacy gates off
```

**Avisos:**
```
⚠️  Warning: Disabling privacy gates removes all approval prompts
⚠️  This is NOT recommended for security reasons
⚠️  You will still see permission prompts for destructive operations

Are you sure? (y/N)
```

---

## 💾 Armazenamento

### Consentimentos Permanentes

**Localização:** `~/.claude/settings.json`

**Estrutura:**
```json
{
  "privacyConsents": [
    {
      "type": "filesystem-read",
      "scope": "permanent",
      "path": "/home/user/projects/my-app",
      "timestamp": 1713648000000
    },
    {
      "type": "computer-use",
      "scope": "session",
      "timestamp": 1713648123000,
      "expiresAt": 1713651723000
    }
  ],
  "privacyGatesEnabled": true
}
```

### Consentimentos de Sessão

**Localização:** Memória (não persistido)

**Limpeza:**
- Automaticamente ao sair do NeoCode
- Manualmente com `/privacy clear-session`

---

## 🔐 API de Privacidade

### Verificar Consentimento

```typescript
import { hasConsent } from './utils/permissions/privacyGates'

if (hasConsent('filesystem-read', '/path/to/dir')) {
  // Acesso aprovado
} else {
  // Solicitar aprovação
}
```

---

### Solicitar Aprovação

```typescript
import { PrivacyGateDialog } from './components/PrivacyGateDialog'

<PrivacyGateDialog
  options={{
    type: 'filesystem-read',
    path: '/path/to/dir',
    operation: 'Import project files',
    allowPermanent: true
  }}
  onDecision={(result) => {
    if (result.approved) {
      // Prosseguir com operação
    } else {
      // Operação negada
    }
  }}
/>
```

---

### Salvar Consentimento

```typescript
import { saveConsent } from './utils/permissions/privacyGates'

saveConsent('filesystem-read', 'session', '/path/to/dir')
```

---

### Revogar Consentimento

```typescript
import { revokeConsent } from './utils/permissions/privacyGates'

revokeConsent('filesystem-read', '/path/to/dir')
```

---

## 📊 Estatísticas de Privacidade

### Dashboard de Privacidade

```bash
/privacy stats
```

**Saída:**
```
Privacy Statistics:

Total consents granted: 15
  • Session: 5
  • Permanent: 10

By type:
  • filesystem-read: 8
  • filesystem-write: 4
  • filesystem-browse: 2
  • computer-use: 1

Protected paths:
  • ~/.ssh (never accessed)
  • ~/.aws (never accessed)
  • /etc (never accessed)

Security score: 95/100 ✅
```

---

## 🎓 Melhores Práticas

### Para Usuários

1. **Seja Cauteloso**
   - ✅ Leia os avisos com atenção
   - ✅ Use "Once" quando não tiver certeza
   - ✅ Evite "Permanent" para diretórios sensíveis

2. **Revise Regularmente**
   - ✅ `/privacy list` para ver consentimentos ativos
   - ✅ Revogue o que não for mais necessário
   - ✅ Limpe sessões antigas

3. **Computer Use**
   - ⚠️ Apenas ative quando realmente necessário
   - ⚠️ Desative após uso (`/computer-use off`)
   - ⚠️ Nunca deixe permanente

---

### Para Desenvolvedores

1. **Sempre Verifique Consent**
   ```typescript
   if (!hasConsent(type, path)) {
     // Show approval dialog
   }
   ```

2. **Use Níveis de Risco Apropriados**
   ```typescript
   const risk = getPrivacyRiskLevel({ type, path, operation })
   ```

3. **Forneça Contexto Claro**
   ```typescript
   operation: "Import authentication templates"
   // Não: "Read files"
   ```

4. **Respeite Negações**
   ```typescript
   if (!result.approved) {
     return // Don't retry or bypass
   }
   ```

---

## 🆘 Troubleshooting

### "Muitos Prompts de Aprovação"

**Problema:** Muitas solicitações de aprovação interrompem o fluxo

**Solução:**
1. Use "Allow for session" para operações repetitivas
2. Para projetos confiáveis, use "Always allow" (apenas baixo risco)
3. Configure `.neocode-profile.json` para caminhos permitidos

---

### "Consentimento Não Sendo Salvo"

**Problema:** Mesmo após aprovar, continua pedindo

**Verificar:**
1. Permissões de escrita em `~/.claude/settings.json`
2. Privacy gates habilitados (`/privacy gates status`)
3. Caminho exato (use caminho absoluto)

**Fix:**
```bash
/privacy list  # Ver consentimentos salvos
/privacy gates status  # Verificar se gates estão ativos
```

---

### "Diretório Sempre Classificado como Alto Risco"

**Problema:** Diretório de projeto sendo tratado como sensível

**Solução:**
```bash
# Verificar caminho
/import ~/projects/my-app

# Evitar caminhos que incluam:
# ~/.ssh, ~/.aws, /etc, C:\Windows, etc.

# Use caminho relativo se possível
cd ~/projects/my-app
/import ./templates
```

---

## 📚 Referências

- **Código Fonte:**
  - [privacyGates.ts](../src/utils/permissions/privacyGates.ts)
  - [PrivacyGateDialog.tsx](../src/components/PrivacyGateDialog.tsx)

- **Comandos:**
  - `/privacy` - Gerenciar consentimentos
  - `/import` - Com aprovação de leitura
  - `/computer-use` - Com aprovação de controle

- **Documentação:**
  - [USER_GUIDE.md](USER_GUIDE.md)
  - [SECURITY.md](../SECURITY.md)

---

**Privacy First. Always.** 🔒
