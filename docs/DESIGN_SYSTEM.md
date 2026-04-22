# ðŸŽ¨ Design System â€” NeoCode CLI

**Data:** 09 de Abril de 2026
**Autora:** Uma the Empathizer (UX Design Expert Agent)
**InspiraÃ§Ã£o:** The Matrix Â· Cyberpunk Â· Hacker Aesthetic
**Framework:** React 19 + Ink (Terminal UI) + chalk (ANSI colors)

---

## ReferÃªncia Visual

> Mockups gerados via AI â€” ver `docs/mockups/` para referÃªncia visual.

---

## 1. Design Tokens

### 1.1 Paleta de Cores

```typescript
// src/theme/tokens.ts

export const colors = {
  // === CORE MATRIX PALETTE ===
  bg: {
    primary:    '#0a0a0a',   // Fundo principal (quase preto)
    secondary:  '#0d1117',   // Fundo de blocos/cards
    tertiary:   '#161b22',   // Fundo do status bar
    overlay:    '#00000099', // Overlay BTW (com transparÃªncia)
  },

  green: {
    bright:     '#00ff41',   // Matrix green â€” texto principal, cursor
    medium:     '#00cc33',   // Texto secundÃ¡rio, borders
    dim:        '#008f11',   // Texto terciÃ¡rio, comentÃ¡rios
    glow:       '#00ff4180', // Glow effect (50% opacity)
    dark:       '#003b00',   // Background sutil de seleÃ§Ã£o
  },

  accent: {
    cyan:       '#00d4ff',   // Links, referÃªncias, URLs
    amber:      '#ffb000',   // Warnings, atenÃ§Ã£o
    red:        '#ff3333',   // Erros, deletions
    purple:     '#bf5af2',   // BTW messages, async
    white:      '#e6edf3',   // Texto de alta prioridade
  },

  syntax: {
    keyword:    '#00ff41',   // function, const, if
    string:     '#00cc33',   // 'strings'
    number:     '#00d4ff',   // 42, 3.14
    comment:    '#008f11',   // // comments
    error:      '#ff3333',   // erros
    added:      '#00ff41',   // diff +
    removed:    '#ff3333',   // diff -
    unchanged:  '#8b949e',   // diff context
  },

  ui: {
    border:     '#00cc3340', // Borders sutis (25% opacity)
    separator:  '#00cc3320', // Separadores (12% opacity)
    selection:  '#003b0060', // SeleÃ§Ã£o ativa
    disabled:   '#484f58',   // Texto desabilitado
  }
} as const;
```

### 1.2 Mapeamento ANSI/chalk

```typescript
// Mapeamento para chalk (ANSI 256 colors)
export const chalk_map = {
  'matrix.bright':   'chalk.hex("#00ff41")',
  'matrix.medium':   'chalk.hex("#00cc33")',
  'matrix.dim':      'chalk.hex("#008f11")',
  'accent.cyan':     'chalk.hex("#00d4ff")',
  'accent.amber':    'chalk.hex("#ffb000")',
  'accent.red':      'chalk.hex("#ff3333")',
  'accent.purple':   'chalk.hex("#bf5af2")',
  'accent.white':    'chalk.hex("#e6edf3")',

  // Fallback para terminais sem truecolor (ANSI 16)
  'fallback.green':  'chalk.green',
  'fallback.bright': 'chalk.greenBright',
  'fallback.cyan':   'chalk.cyanBright',
  'fallback.red':    'chalk.redBright',
  'fallback.yellow': 'chalk.yellowBright',
} as const;
```

### 1.3 Tipografia

```typescript
export const typography = {
  // Terminal fonts (user's system font)
  // Recomendadas: JetBrains Mono, Fira Code, Cascadia Code

  styles: {
    bold:       true,  // Headers, tÃ­tulos, prompts
    dim:        true,  // Texto secundÃ¡rio, timestamps
    italic:     true,  // ComentÃ¡rios, hints
    underline:  true,  // Links, refs
    inverse:    true,  // SeleÃ§Ã£o, badges
  },

  // Ãcones/SÃ­mbolos Unicode
  icons: {
    prompt:     'â¯',      // Prompt principal
    thinking:   'â—‰',      // Modelo pensando
    success:    'âœ“',      // Sucesso
    error:      'âœ—',      // Erro
    warning:    'âš ',     // Warning
    info:       'â„¹',      // Info
    arrow:      'â†’',      // NavegaÃ§Ã£o
    bullet:     'â€¢',      // Lista
    memory:     'ðŸ§ ',     // Memory Palace
    dream:      'ðŸ’­',     // AutoDream
    btw:        'ðŸ’¬',     // BTW message
    review:     'ðŸ”',     // AutoReview
    research:   'ðŸ”¬',     // AutoResearch
    kairos:     'â°',     // KAIROS daemon
    provider:   'â—',      // Provider status (verde/vermelho)
    connected:  'â—',      // Conectado
    offline:    'â—‹',      // Desconectado
  }
} as const;
```

### 1.4 EspaÃ§amento

```typescript
export const spacing = {
  indent:       2,    // IndentaÃ§Ã£o padrÃ£o
  sectionGap:   1,    // 1 linha entre seÃ§Ãµes
  blockPadding: 1,    // Padding interno de blocos
  statusBarH:   1,    // Altura do status bar
} as const;
```

---

## 2. Logo ASCII Art

```
 â–ˆâ–ˆâ–ˆâ•—   â–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—
 â–ˆâ–ˆâ–ˆâ–ˆâ•—  â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•”â•â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•”â•â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•”â•â•â•â•â•
 â–ˆâ–ˆâ•”â–ˆâ–ˆâ•— â–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—  â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘  â–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—
 â–ˆâ–ˆâ•‘â•šâ–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•”â•â•â•  â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘  â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•”â•â•â•
 â–ˆâ–ˆâ•‘ â•šâ–ˆâ–ˆâ–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—
 â•šâ•â•  â•šâ•â•â•â•â•šâ•â•â•â•â•â•â• â•šâ•â•â•â•â•â•  â•šâ•â•â•â•â•â• â•šâ•â•â•â•â•â• â•šâ•â•â•â•â•â• â•šâ•â•â•â•â•â•â•
```

**RenderizaÃ§Ã£o:** `chalk.hex('#00ff41').bold(logo)`
**ApariÃ§Ã£o:** Character-by-character com efeito "digitalizaÃ§Ã£o" (20ms/char)

---

## 3. AnimaÃ§Ãµes

### 3.1 Matrix Rain (Splash Screen)

```typescript
// src/theme/animations.ts

export const matrixRain = {
  chars: 'ï¾Šï¾ï¾‹ï½°ï½³ï½¼ï¾…ï¾“ï¾†ï½»ï¾œï¾‚ï½µï¾˜ï½±ï¾Žï¾ƒï¾ï½¹ï¾’ï½´ï½¶ï½·ï¾‘ï¾•ï¾—ï½¾ï¾ˆï½½ï¾€ï¾‡ï¾012345789:ãƒ»."=*+-<>Â¦|',
  columns: 'terminal_width',
  speed: 50,                     // ms entre frames
  duration: 2000,                // 2s total
  fadeSteps: 4,
  colors: ['#00ff41', '#00cc33', '#008f11', '#003b00'],
  density: 0.05,
};
```

### 3.2 Spinners

```typescript
export const spinners = {
  matrix:  { frames: ['â—¢', 'â—£', 'â—¤', 'â—¥'], interval: 100 },
  dots:    { frames: ['â ‹', 'â ™', 'â ¹', 'â ¸', 'â ¼', 'â ´', 'â ¦', 'â §', 'â ‡', 'â '], interval: 80 },
  scanner: { frames: ['â–°â–±â–±â–±â–±', 'â–°â–°â–±â–±â–±', 'â–°â–°â–°â–±â–±', 'â–°â–°â–°â–°â–±', 'â–°â–°â–°â–°â–°', 'â–±â–°â–°â–°â–°', 'â–±â–±â–°â–°â–°', 'â–±â–±â–±â–°â–°', 'â–±â–±â–±â–±â–°', 'â–±â–±â–±â–±â–±'], interval: 120 },
  code:    { frames: ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[====]', '[ ===]', '[  ==]', '[   =]'], interval: 100 },
  dream:   { frames: ['ðŸ’­ ', ' ðŸ’­', '  ðŸ’­', ' ðŸ’­', 'ðŸ’­ '], interval: 300 },
};
```

### 3.3 Contextos de Uso

```
   â—¢ thinking...                          â†’ Modelo processando
   â–°â–°â–°â–±â–± executing FileEdit...           â†’ Tool em execuÃ§Ã£o
   ðŸ’­  dreaming...                        â†’ AutoDream ativo
   [=== ] downloading qwen2.5-coder...    â†’ Download/instalaÃ§Ã£o
```

### 3.4 Typing Effect

```typescript
export const textAnimations = {
  typing: { charDelay: 15, wordDelay: 50, cursorChar: 'â–Œ', cursorBlink: 500 },
  reveal: { lineDelay: 30, direction: 'top-down', fadeIn: true },
};
```

---

## 4. Componentes

### 4.1 MatrixRain (Splash)

```
DuraÃ§Ã£o: 2s no startup
TransiÃ§Ã£o: Fade out â†’ Logo reveal â†’ Prompt ready
DesabilitÃ¡vel: NEOCODE_NO_SPLASH=1 ou /theme minimal
```

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Terminal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ï¾Š  ï¾     ï¾‹        ï½°  ï½³  ï½¼     ï¾…  ï¾“     ï¾†  ï½»  ï¾œ  ï¾‚  ï½µ   â”‚
â”‚     ï¾˜  ï½±     ï¾Ž  ï¾ƒ  ï¾     ï½¹  ï¾’     ï½´     ï½¶     ï½·  ï¾‘       â”‚
â”‚  ï¾•     ï¾—  ï½¾     ï¾ˆ     ï½½  ï¾€  ï¾‡  ï¾     0  1  2     3  4     â”‚
â”‚        â–ˆâ–ˆâ–ˆâ•—   â–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—...                                  â”‚
â”‚        â–ˆâ–ˆâ–ˆâ–ˆâ•—  â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•”â•â•â•â•â•...         (logo aparece)           â”‚
â”‚  5     â–ˆâ–ˆâ•”â–ˆâ–ˆâ•— â–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—  ...                            7     â”‚
â”‚        â–ˆâ–ˆâ•‘â•šâ–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•”â•â•â•  ...                                  â”‚
â”‚  8     â–ˆâ–ˆâ•‘ â•šâ–ˆâ–ˆâ–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—...                            9     â”‚
â”‚        â•šâ•â•  â•šâ•â•â•â•â•šâ•â•â•â•â•â•â•...                                  â”‚
â”‚     v0.1.0 â€¢ the open-source agentic CLI                      â”‚
â”‚  â¯ _                                                          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ â— Ollama qwen2.5-coder:7b â”‚ 284MB â”‚ myapp/ â”‚ â° 0m          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 4.2 StatusBar (Barra Inferior Permanente)

```
Position: Ãšltima linha do terminal (fixa)
Background: bg.tertiary (#161b22)
Separator: ' â”‚ ' em green.dim

Layout (6 slots):
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ â— Provider Model â”‚ RAM â”‚ ðŸ§  Memory â”‚ ðŸ” Review â”‚ â–² BTW â”‚ â° â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

```typescript
interface StatusBarProps {
  provider: string;          // "Ollama"
  model: string;             // "qwen2.5-coder:7b"
  connected: boolean;        // â— ou â—‹
  memoryUsage: string;       // "284MB"
  memoryPalace?: string;     // "3 wings" ou null
  autoReview: boolean;       // ON/OFF
  btwCount: number;          // Mensagens pendentes
  uptime: string;            // "12m"
  tokensUsed?: number;       // 2400
}
```

### 4.3 ToolBlock (Bloco de ExecuÃ§Ã£o)

```
â”Œâ”€â”€â”€â”€ FileEdit: src/app.ts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  12 â”‚ - const old = "hello";                         â”‚
â”‚  12 â”‚ + const greeting = "hello world";              â”‚
â”‚  13 â”‚   export default greeting;                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  âœ“ 1 file changed, 1 insertion, 1 deletion          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

```
Cores:
- Borda: green.medium (#00cc33)
- Header: green.bright bold
- Linha + : green.bright (#00ff41)
- Linha - : accent.red (#ff3333)
- Contexto: accent.white dim
- Footer: green.dim
```

### 4.4 PromptLine

```
 â¯ sua mensagem aquiâ–Œ

- â¯ : green.bright bold
- Input: accent.white
- Cursor â–Œ: green.bright (blink 500ms)
- Placeholder: green.dim italic ("What would you like to build?")
```

### 4.5 BTWOverlay

```
PosiÃ§Ã£o: Canto inferior direito, acima do StatusBar
Background: bg.overlay com border purple
Auto-dismiss: 5 segundos

â”Œâ”€â”€ ðŸ’¬ BTW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Enquanto refatorei o auth, notei que   â”‚
â”‚ o endpoint /users pode ser otimizado.  â”‚
â”‚                           hÃ¡ 2 min     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 4.6 ProgressBar

```
 Indexing project files
 â–°â–°â–°â–°â–°â–°â–°â–°â–°â–°â–°â–°â–±â–±â–±â–±â–±â–±â–±â–±  62% (124/200 files)

- Preenchido (â–°): green.bright
- Vazio (â–±): green.dark
- Label: accent.white
- Percentual: green.medium
```

---

## 5. Temas

```typescript
export const themes = {
  matrix: {
    // PadrÃ£o â€” tudo definido acima
    splash: true, animations: true, statusBar: true, matrixRain: true,
  },
  minimal: {
    // CI/CD, terminais simples
    splash: false, animations: false, statusBar: true, matrixRain: false,
    colors: { primary: 'green', secondary: 'greenBright', accent: 'cyan' },
  },
  solarized: {
    // Tons quentes
    splash: true, animations: true, statusBar: true, matrixRain: false,
    colors: { bg: '#002b36', primary: '#859900', secondary: '#2aa198' },
  },
};
```

### Switching

```bash
/theme matrix      # PadrÃ£o
/theme minimal     # Sem animaÃ§Ãµes
/theme solarized   # Tons quentes
NEOCODE_THEME=minimal neocode   # Env var
```

---

## 6. SequÃªncia de Startup

```mermaid
sequenceDiagram
    participant User
    participant CLI as NeoCode
    participant Theme as Theme Engine
    participant Provider as Provider

    User->>CLI: $ neocode
    CLI->>Theme: Load theme config

    alt Theme = matrix
        Theme->>CLI: 1. Matrix Rain (2s)
        Theme->>CLI: 2. Logo ASCII (char-by-char 800ms)
        Theme->>CLI: 3. Version + tagline (fade in)
    else Theme = minimal
        Theme->>CLI: Skip to prompt
    end

    CLI->>Provider: Auto-detect Ollama
    Provider-->>CLI: Status

    alt Connected
        Theme->>CLI: StatusBar "â— Ollama qwen2.5-coder:7b"
    else Not found
        Theme->>CLI: StatusBar "â—‹ No provider â€” /provider"
    end

    Theme->>CLI: 4. Prompt "â¯ _"
    CLI-->>User: Ready
```

---

## 7. Acessibilidade

| CritÃ©rio | SoluÃ§Ã£o |
|---|---|
| Contraste | #00ff41 em #0a0a0a = ratio 10.5:1 âœ… |
| Color-blind | Ãcones + formas alÃ©m de cor (âœ“/âœ—/â—) |
| Screen readers | Spinners com label textual |
| Sem animaÃ§Ãµes | `NEOCODE_NO_ANIMATIONS=1` ou `/theme minimal` |
| Low-color | Fallback ANSI 16 automÃ¡tico |

---

## 8. Prioridade de ImplementaÃ§Ã£o

| # | Componente | Epic | Prioridade |
|---|---|---|---|
| 1 | Design Tokens (`src/theme/tokens.ts`) | E1 | Must |
| 2 | StatusBar | E1 | Must |
| 3 | PromptLine (estilizado) | E1 | Must |
| 4 | Spinners (matrix, scanner, dots) | E1 | Must |
| 5 | ToolBlock (borders, colors) | E1 | Should |
| 6 | ASCII Logo + Splash | E1 | Should |
| 7 | Matrix Rain animation | E15 | Could |
| 8 | BTW Overlay | E11 | Should |
| 9 | ProgressBar | E5 | Should |
| 10 | Theme switching (`/theme`) | E15 | Could |

---

> ðŸ“Ž **Documentos relacionados:**
> - [PRD](./PRD.md) Â· [Arquitetura](./ARCHITECTURE.md) Â· [Epics](./EPICS.md)
