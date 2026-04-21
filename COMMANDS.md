# 🎮 Automação de Comandos de Clones — MMOS

Sistema de registro e ativação automática de clones especialistas via terminal.

---

## 🚀 Como Ativar um Clone

Basta digitar o comando correspondente ao nome do clone no chat/terminal:

| Comando | Clone | Domínio |
|---------|-------|---------|
| `/@christopher-nolan` | Christopher Nolan | Audiovisual Production |
| `/@daniel-kahneman` | Daniel Kahneman | Neuro Psychology |
| `/@jeb-blount` | Jeb Blount | Sales |
| `/@martin-fowler` | Martin Fowler | Software Architecture |
| `/@molly-pittman` | Molly Pittman | Paid Traffic |
| `/@mr-beast` | Mr. Beast (Jimmy Donaldson) | Content Creation |
| `/@steve-jobs` | Steve Jobs | Innovation & Tech |
| `/@copy` | Copy Master | Copywriting |
| `/@russell-brunson` | Russell Brunson | Sales Funnels |
| `/@jon-benson` | Jon Benson | Copywriting (VSL) |
| `/@brad-frost` | Brad Frost | Design Systems |
| `/@david-ogilvy` | David Ogilvy | Copywriting |

### O que acontece ao ativar:
1. **Identidade carregada:** `config.yaml`, `README.md` e `voice/voice-profile.md`
2. **Arquitetura carregada:** `ARCHITECTURE.md` com referência à Base de Conhecimento Geral
3. **Frameworks cognitivos:** Mapeados e prontos para aplicação
4. **Persona ativa:** O assistente adota o tom, estilo e expertise do clone

---

## 📂 Estrutura de Cada Clone

```
clones/{slug}/
├── agents/           → Arquivo de ativação (@slug.md)
├── config.yaml       → Configuração e identidade
├── README.md         → Guia completo do clone
├── ARCHITECTURE.md   → Arquitetura e referências à Base de Conhecimento
├── frameworks/       → Frameworks cognitivos exclusivos
├── voice/            → Perfil de voz e tom
├── checklists/       → Checklists operacionais
├── data/             → Dados e blueprint
├── tasks/            → Tasks específicas (gerais ficam na Knowledge Base)
└── workflows/        → Workflows específicos (gerais ficam na Knowledge Base)
```

---

## 🗺️ Base de Conhecimento Geral

Os clones **não** armazenam tasks e workflows genéricos localmente.
Eles referenciam a base centralizada por domínio:

| Domínio | Caminho |
|---------|---------|
| Audiovisual Production | `knowledge/domains/audiovisual-production/` |
| Neuro Psychology | `knowledge/domains/neuro-psychology/` |
| Paid Traffic | `knowledge/domains/paid-traffic/` |
| Innovation & Tech | `knowledge/domains/innovation-tech/` |
| Sales | `knowledge/domains/sales/` |
| Content Production | `knowledge/domains/content-production/` |
| General Marketing | `knowledge/domains/general-marketing/` |

---

## 🔄 Adicionando Novos Clones

Sempre que criar um novo clone na pasta `clones/`, execute o script de atualização na raiz:

```bash
node update-clone-commands.js
```

**O script irá automaticamente:**
1. Escanear a pasta `clones/` em busca de novos diretórios
2. Atualizar o `clones-registry.json` na raiz
3. Gerar/atualizar os arquivos de ativação em `clones/{slug}/agents/@{slug}.md`

---

## 📋 Arquivos de Configuração (Raiz)

| Arquivo | Descrição |
|---------|-----------|
| `clones-registry.json` | Registro mestre de todos os clones (slug, nome, domínio, paths) |
| `update-clone-commands.js` | Script de automação para manutenção de comandos |
| `COMMANDS.md` | Este arquivo — documentação de uso |

---

## ⚡ Comandos Rápidos de Referência

```bash
# Ativar clone no chat
/@mr-beast

# Atualizar registro após criar novo clone
node update-clone-commands.js

# Ver lista de clones registrados
cat clones-registry.json
```

---

*Última atualização: 2026-03-01 | 10 clones registrados | v2.0.0*
