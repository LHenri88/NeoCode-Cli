/**
 * NeoCode i18n — lightweight translation utility.
 * Reads `preferredLanguage` from global config; falls back to 'en'.
 *
 * Usage:
 *   import { t, tCmd } from '../utils/i18n.js'
 *   t('startup.toBegin')        // → "para começar"
 *   tCmd('help', 'Show help')   // → "Mostrar ajuda e comandos disponíveis"
 */

import { getPreferredLanguage } from './config.js'
import type { PreferredLanguage } from './config.js'

type Translations = Record<string, string>

// ─── String tables ────────────────────────────────────────────────────────────

const EN: Translations = {
  // ── StartupScreen ──────────────────────────────────────────────────────────
  'startup.tagline':   '✦ Wake up, Neo... Any model. Every tool. Multi Agents Orchestration. ✦',
  'startup.toBegin':  'to begin',
  'startup.local':    'local',
  'startup.cloud':    'cloud',
  'startup.provider': 'Provider',
  'startup.model':    'Model',
  'startup.endpoint': 'Endpoint',

  // ── Prompt input ───────────────────────────────────────────────────────────
  'prompt.queueHint':  'Press up to edit queued messages',
  'prompt.messageAt':  'Message @{name}…',

  // ── REPL / status ──────────────────────────────────────────────────────────
  'repl.compacting':       'Compacting conversation',
  'repl.hookPreCompact':   'Running PreCompact hooks…',
  'repl.hookPostCompact':  'Running PostCompact hooks…',
  'repl.hookSessionStart': 'Running SessionStart hooks…',
  'repl.transcriptToggle': 'Showing detailed transcript · {key} to toggle',
  'repl.waitingInput':     'Claude is waiting for your input',

  // ── Help UI (HelpV2) ───────────────────────────────────────────────────────
  'help.dismissed':          'Help dialog dismissed',
  'help.title':              'NeoCode v{version}',
  'help.tab.general':        'general',
  'help.tab.commands':       'commands',
  'help.tab.custom':         'custom-commands',
  'help.browseDefault':      'Browse default commands:',
  'help.browseCustom':       'Browse custom commands:',
  'help.noCustom':           'No custom commands found',
  'help.forMoreHelp':        'For more help:',
  'help.pressAgainToExit':   'Press {key} again to exit',
  'help.cancelShortcut':     '{shortcut} to cancel',
  'help.description':        'Claude understands your codebase, makes edits with your permission, and executes commands — right from your terminal.',
  'help.shortcuts':          'Shortcuts',

  // ── Source annotations (formatDescriptionWithSource) ───────────────────────
  'source.plugin':      'plugin',
  'source.workflow':    'workflow',
  'source.bundled':     'bundled',
  'source.user':        'user',
  'source.project':     'project',
  'source.gitignored':  'project, gitignored',
  'source.flag':        'cli flag',
  'source.managed':     'managed',

  // ── Setting source labels ──────────────────────────────────────────────────
  'settingSource.user':          'user',
  'settingSource.project':       'project',
  'settingSource.local':         'project, gitignored',
  'settingSource.flag':          'cli flag',
  'settingSource.managed':       'managed',
  'settingDisplayName.user':     'User',
  'settingDisplayName.project':  'Project',
  'settingDisplayName.local':    'Local',
  'settingDisplayName.flag':     'Flag',
  'settingDisplayName.managed':  'Managed',
  'settingDisplayName.plugin':   'Plugin',
  'settingDisplayName.builtin':  'Built-in',
  'settingLong.user':            'user settings',
  'settingLong.project':         'shared project settings',
  'settingLong.local':           'project local settings',
  'settingLong.flag':            'command line arguments',
  'settingLong.managed':         'enterprise managed settings',
  'settingLong.cliArg':          'CLI argument',
  'settingLong.command':         'command configuration',
  'settingLong.session':         'current session',

  // ── Language picker ────────────────────────────────────────────────────────
  'language.title':      'Language / Interface',
  'language.current':    'Current:',
  'language.restarting': 'Language changed to {name} ({code}). Restarting…',
  'language.alreadySet': 'Language is already set to {name} ({code}).',
  'language.cancelled':  'Language selection cancelled.',
  'language.unsupported':'Unsupported language "{code}". Available: {list}',

  // ── Command descriptions ───────────────────────────────────────────────────
  'cmd.add-dir.description':          'Add a new working directory',
  'cmd.advisor.description':          'Get advice on how to use NeoCode effectively',
  'cmd.agents.description':           'Manage agent configurations',
  'cmd.auto-fix.description':         'Run lint and tests, auto-fix issues after AI edits',
  'cmd.branch.description':           'Create a branch of the current conversation at this point',
  'cmd.btw.description':              'Ask a quick side question without interrupting the main conversation',
  'cmd.channel.description':          'Configure notification channels (telegram, discord, webhook)',
  'cmd.chrome.description':           'Claude in Chrome (Beta) settings',
  'cmd.clear.description':            'Clear conversation history and free up context',
  'cmd.color.description':            'Set the prompt bar color for this session',
  'cmd.compact.description':          'Clear conversation history but keep a summary in context',
  'cmd.computer-use.description':     'Enable/disable Computer Use (screenshot + mouse/keyboard control)',
  'cmd.config.description':           'Open config panel',
  'cmd.context.description':          'Visualize current context usage as a colored grid',
  'cmd.copy.description':             "Copy Claude's last response to clipboard",
  'cmd.cost.description':             'Show the total cost and duration of the current session',
  'cmd.desktop.description':          'Continue the current session in Claude Desktop',
  'cmd.diff.description':             'View uncommitted changes and per-turn diffs',
  'cmd.doctor.description':           'Diagnose and verify your NeoCode installation and settings',
  'cmd.dream.description':            'Dream up and auto-implement a feature or improvement',
  'cmd.effort.description':           'Set effort level for model usage',
  'cmd.exit.description':             'Exit the REPL',
  'cmd.export.description':           'Export the current conversation to a file or clipboard',
  'cmd.extra-usage.description':      'Configure extra usage to keep working when limits are hit',
  'cmd.fast.description':             'Toggle Fast mode (Opus 4.6 with faster output)',
  'cmd.feedback.description':         'Submit feedback about NeoCode',
  'cmd.files.description':            'List all files currently in context',
  'cmd.heapdump.description':         'Dump the JS heap to ~/Desktop',
  'cmd.help.description':             'Show help and available commands',
  'cmd.hooks.description':            'View hook configurations for tool events',
  'cmd.ide.description':              'Manage IDE integrations and show status',
  'cmd.import.description':           'Import files or skill sets from another local project',
  'cmd.install-github-app.description': 'Set up Claude GitHub Actions for a repository',
  'cmd.install-slack-app.description': 'Install the Claude Slack app',
  'cmd.keybindings.description':      'Open or create your keybindings configuration file',
  'cmd.language.description':         'Change the interface language (en, pt, es)',
  'cmd.login.description':            'Sign in to your Anthropic account',
  'cmd.logout.description':           'Sign out from your Anthropic account',
  'cmd.mcp.description':              'Manage MCP servers',
  'cmd.memory.description':           'Manage NeoCode memory files, Memory Palace search, and graph views',
  'cmd.mobile.description':           'Show QR code to download the Claude mobile app',
  'cmd.model.description':            'Switch the active AI model',
  'cmd.output-style.description':     'Deprecated: use /config to change output style',
  'cmd.permissions.description':      'Manage allow & deny tool permission rules',
  'cmd.plan.description':             'Enable plan mode or view the current session plan',
  'cmd.pr_comments.description':      'Get comments from a GitHub pull request',
  'cmd.privacy-settings.description': 'View and update your privacy settings',
  'cmd.provider.description':         'Manage API provider profiles',
  'cmd.rate-limit-options.description': 'Show options when rate limit is reached',
  'cmd.release-notes.description':    'View release notes',
  'cmd.reload-plugins.description':   'Activate pending plugin changes in the current session',
  'cmd.remote-env.description':       'Configure the default remote environment for teleport sessions',
  'cmd.rename.description':           'Rename the current conversation',
  'cmd.research.description':         'Run targeted web research with source citations',
  'cmd.resume.description':           'Resume a previous conversation',
  'cmd.rewind.description':           'Restore the code and/or conversation to a previous point',
  'cmd.sandbox-toggle.description':   'Toggle sandbox mode for tool execution',
  'cmd.session.description':          'Show remote session URL and QR code',
  'cmd.skills.description':           'List available skills',
  'cmd.stats.description':            'Show your NeoCode usage statistics and activity',
  'cmd.status.description':           'Show NeoCode status: version, model, account, and connectivity',
  'cmd.statusline.description':       'Toggle or configure the status line',
  'cmd.stickers.description':         'Order NeoCode stickers',
  'cmd.swarm.description':            'Launch a Matrix-style multi-agent swarm on an epic',
  'cmd.tag.description':              'Toggle a searchable tag on the current session',
  'cmd.tasks.description':            'List and manage background tasks',
  'cmd.theme.description':            'Change the terminal theme',
  'cmd.upgrade.description':          'Upgrade to Max for higher rate limits and more Opus',
  'cmd.usage.description':            'Show plan usage limits',
  'cmd.vim.description':              'Toggle between Vim and Normal editing modes',
  'cmd.voice.description':            'Toggle push-to-talk voice mode',
  'cmd.wiki.description':             'Initialize and inspect the NeoCode project wiki',
}

// ─── Portuguese ───────────────────────────────────────────────────────────────

const PT: Translations = {
  // ── StartupScreen ──────────────────────────────────────────────────────────
  'startup.tagline':   '✦ Acorde, Neo... Qualquer modelo. Todas as ferramentas. Multi Agents. ✦',
  'startup.toBegin':  'para começar',
  'startup.local':    'local',
  'startup.cloud':    'nuvem',
  'startup.provider': 'Provedor',
  'startup.model':    'Modelo',
  'startup.endpoint': 'Endpoint',

  // ── Prompt input ───────────────────────────────────────────────────────────
  'prompt.queueHint':  'Pressione ↑ para editar mensagens na fila',
  'prompt.messageAt':  'Mensagem para @{name}…',

  // ── REPL / status ──────────────────────────────────────────────────────────
  'repl.compacting':       'Compactando conversa',
  'repl.hookPreCompact':   'Executando hooks PreCompact…',
  'repl.hookPostCompact':  'Executando hooks PostCompact…',
  'repl.hookSessionStart': 'Executando hooks de início de sessão…',
  'repl.transcriptToggle': 'Mostrando transcrição detalhada · {key} para alternar',
  'repl.waitingInput':     'Claude aguarda sua entrada',

  // ── Help UI ────────────────────────────────────────────────────────────────
  'help.dismissed':          'Diálogo de ajuda fechado',
  'help.title':              'NeoCode v{version}',
  'help.tab.general':        'geral',
  'help.tab.commands':       'comandos',
  'help.tab.custom':         'comandos-personalizados',
  'help.browseDefault':      'Explorar comandos padrão:',
  'help.browseCustom':       'Explorar comandos personalizados:',
  'help.noCustom':           'Nenhum comando personalizado encontrado',
  'help.forMoreHelp':        'Para mais ajuda:',
  'help.pressAgainToExit':   'Pressione {key} novamente para sair',
  'help.cancelShortcut':     '{shortcut} para cancelar',
  'help.description':        'Claude entende seu código, faz edições com sua permissão e executa comandos — direto do seu terminal.',
  'help.shortcuts':          'Atalhos',

  // ── Source annotations ─────────────────────────────────────────────────────
  'source.plugin':      'plugin',
  'source.workflow':    'fluxo',
  'source.bundled':     'embutido',
  'source.user':        'usuário',
  'source.project':     'projeto',
  'source.gitignored':  'projeto, gitignored',
  'source.flag':        'flag CLI',
  'source.managed':     'gerenciado',

  // ── Setting source labels ──────────────────────────────────────────────────
  'settingSource.user':          'usuário',
  'settingSource.project':       'projeto',
  'settingSource.local':         'projeto, gitignored',
  'settingSource.flag':          'flag CLI',
  'settingSource.managed':       'gerenciado',
  'settingDisplayName.user':     'Usuário',
  'settingDisplayName.project':  'Projeto',
  'settingDisplayName.local':    'Local',
  'settingDisplayName.flag':     'Flag',
  'settingDisplayName.managed':  'Gerenciado',
  'settingDisplayName.plugin':   'Plugin',
  'settingDisplayName.builtin':  'Embutido',
  'settingLong.user':            'configurações do usuário',
  'settingLong.project':         'configurações compartilhadas do projeto',
  'settingLong.local':           'configurações locais do projeto',
  'settingLong.flag':            'argumentos de linha de comando',
  'settingLong.managed':         'configurações gerenciadas pela empresa',
  'settingLong.cliArg':          'argumento CLI',
  'settingLong.command':         'configuração de comando',
  'settingLong.session':         'sessão atual',

  // ── Language picker ────────────────────────────────────────────────────────
  'language.title':      'Idioma / Interface',
  'language.current':    'Atual:',
  'language.restarting': 'Idioma alterado para {name} ({code}). Reiniciando…',
  'language.alreadySet': 'O idioma já está definido como {name} ({code}).',
  'language.cancelled':  'Seleção de idioma cancelada.',
  'language.unsupported':'Idioma não suportado "{code}". Disponíveis: {list}',

  // ── Command descriptions ───────────────────────────────────────────────────
  'cmd.add-dir.description':          'Adicionar um novo diretório de trabalho',
  'cmd.advisor.description':          'Obter dicas de como usar o NeoCode efetivamente',
  'cmd.agents.description':           'Gerenciar configurações de agentes',
  'cmd.auto-fix.description':         'Executar lint e testes, corrigindo problemas automaticamente após edições da IA',
  'cmd.branch.description':           'Criar um branch da conversa atual neste ponto',
  'cmd.btw.description':              'Fazer uma pergunta rápida sem interromper a conversa principal',
  'cmd.channel.description':          'Configurar canais de notificação (telegram, discord, webhook)',
  'cmd.chrome.description':           'Configurações do Claude no Chrome (Beta)',
  'cmd.clear.description':            'Limpar o histórico da conversa e liberar contexto',
  'cmd.color.description':            'Definir a cor da barra de prompt para esta sessão',
  'cmd.compact.description':          'Limpar o histórico mas manter um resumo no contexto',
  'cmd.computer-use.description':     'Ativar/desativar Computer Use (captura de tela + controle de mouse/teclado)',
  'cmd.config.description':           'Abrir painel de configuração',
  'cmd.context.description':          'Visualizar o uso atual do contexto como uma grade colorida',
  'cmd.copy.description':             'Copiar a última resposta do Claude para a área de transferência',
  'cmd.cost.description':             'Mostrar o custo total e duração da sessão atual',
  'cmd.desktop.description':          'Continuar a sessão atual no Claude Desktop',
  'cmd.diff.description':             'Ver mudanças não confirmadas e diffs por turno',
  'cmd.doctor.description':           'Diagnosticar e verificar sua instalação e configurações do NeoCode',
  'cmd.dream.description':            'Imaginar e implementar automaticamente uma funcionalidade ou melhoria',
  'cmd.effort.description':           'Definir o nível de esforço para uso do modelo',
  'cmd.exit.description':             'Sair do REPL',
  'cmd.export.description':           'Exportar a conversa atual para um arquivo ou área de transferência',
  'cmd.extra-usage.description':      'Configurar uso extra para continuar trabalhando quando os limites forem atingidos',
  'cmd.fast.description':             'Ativar/desativar o modo Rápido (Opus 4.6 com saída mais veloz)',
  'cmd.feedback.description':         'Enviar feedback sobre o NeoCode',
  'cmd.files.description':            'Listar todos os arquivos atualmente no contexto',
  'cmd.heapdump.description':         'Despejar o heap JS em ~/Desktop',
  'cmd.help.description':             'Mostrar ajuda e comandos disponíveis',
  'cmd.hooks.description':            'Ver configurações de hooks para eventos de ferramentas',
  'cmd.ide.description':              'Gerenciar integrações de IDE e mostrar status',
  'cmd.import.description':           'Importar arquivos ou conjuntos de habilidades de outro projeto local',
  'cmd.install-github-app.description': 'Configurar ações do GitHub Claude para um repositório',
  'cmd.install-slack-app.description': 'Instalar o aplicativo Claude no Slack',
  'cmd.keybindings.description':      'Abrir ou criar seu arquivo de configuração de atalhos de teclado',
  'cmd.language.description':         'Alterar o idioma da interface (en, pt, es)',
  'cmd.login.description':            'Entrar na sua conta Anthropic',
  'cmd.logout.description':           'Sair da sua conta Anthropic',
  'cmd.mcp.description':              'Gerenciar servidores MCP',
  'cmd.memory.description':           'Gerenciar arquivos de memória do NeoCode, busca no Palácio de Memória e visualizações de grafo',
  'cmd.mobile.description':           'Mostrar código QR para baixar o aplicativo Claude para celular',
  'cmd.model.description':            'Trocar o modelo de IA ativo',
  'cmd.output-style.description':     'Obsoleto: use /config para alterar o estilo de saída',
  'cmd.permissions.description':      'Gerenciar regras de permissão de ferramentas (permitir e negar)',
  'cmd.plan.description':             'Ativar o modo de planejamento ou ver o plano da sessão atual',
  'cmd.pr_comments.description':      'Obter comentários de um pull request do GitHub',
  'cmd.privacy-settings.description': 'Ver e atualizar suas configurações de privacidade',
  'cmd.provider.description':         'Gerenciar perfis de provedores de API',
  'cmd.rate-limit-options.description': 'Mostrar opções quando o limite de taxa for atingido',
  'cmd.release-notes.description':    'Ver notas de versão',
  'cmd.reload-plugins.description':   'Ativar alterações de plugins pendentes na sessão atual',
  'cmd.remote-env.description':       'Configurar o ambiente remoto padrão para sessões de teleporte',
  'cmd.rename.description':           'Renomear a conversa atual',
  'cmd.research.description':         'Executar pesquisa web direcionada com citações de fontes',
  'cmd.resume.description':           'Retomar uma conversa anterior',
  'cmd.rewind.description':           'Restaurar o código e/ou conversa para um ponto anterior',
  'cmd.sandbox-toggle.description':   'Alternar modo sandbox para execução de ferramentas',
  'cmd.session.description':          'Mostrar URL e código QR da sessão remota',
  'cmd.skills.description':           'Listar habilidades disponíveis',
  'cmd.stats.description':            'Mostrar estatísticas de uso e atividade do NeoCode',
  'cmd.status.description':           'Mostrar status do NeoCode: versão, modelo, conta e conectividade',
  'cmd.statusline.description':       'Alternar ou configurar a linha de status',
  'cmd.stickers.description':         'Pedir adesivos do NeoCode',
  'cmd.swarm.description':            'Lançar um enxame multi-agente estilo Matrix em um épico',
  'cmd.tag.description':              'Alternar uma tag pesquisável na sessão atual',
  'cmd.tasks.description':            'Listar e gerenciar tarefas em segundo plano',
  'cmd.theme.description':            'Alterar o tema do terminal',
  'cmd.upgrade.description':          'Fazer upgrade para Max para limites mais altos e mais Opus',
  'cmd.usage.description':            'Mostrar limites de uso do plano',
  'cmd.vim.description':              'Alternar entre os modos de edição Vim e Normal',
  'cmd.voice.description':            'Ativar/desativar o modo de voz push-to-talk',
  'cmd.wiki.description':             'Inicializar e inspecionar o wiki do projeto NeoCode',
}

// ─── Spanish ──────────────────────────────────────────────────────────────────

const ES: Translations = {
  // ── StartupScreen ──────────────────────────────────────────────────────────
  'startup.tagline':   '✦ Despierta, Neo... Cualquier modelo. Todas las herramientas. Multi Agents. ✦',
  'startup.toBegin':  'para empezar',
  'startup.local':    'local',
  'startup.cloud':    'nube',
  'startup.provider': 'Proveedor',
  'startup.model':    'Modelo',
  'startup.endpoint': 'Endpoint',

  // ── Prompt input ───────────────────────────────────────────────────────────
  'prompt.queueHint':  'Presiona ↑ para editar mensajes en cola',
  'prompt.messageAt':  'Mensaje a @{name}…',

  // ── REPL / status ──────────────────────────────────────────────────────────
  'repl.compacting':       'Compactando conversación',
  'repl.hookPreCompact':   'Ejecutando hooks PreCompact…',
  'repl.hookPostCompact':  'Ejecutando hooks PostCompact…',
  'repl.hookSessionStart': 'Ejecutando hooks de inicio de sesión…',
  'repl.transcriptToggle': 'Mostrando transcripción detallada · {key} para alternar',
  'repl.waitingInput':     'Claude espera tu entrada',

  // ── Help UI ────────────────────────────────────────────────────────────────
  'help.dismissed':          'Diálogo de ayuda cerrado',
  'help.title':              'NeoCode v{version}',
  'help.tab.general':        'general',
  'help.tab.commands':       'comandos',
  'help.tab.custom':         'comandos-personalizados',
  'help.browseDefault':      'Explorar comandos predeterminados:',
  'help.browseCustom':       'Explorar comandos personalizados:',
  'help.noCustom':           'No se encontraron comandos personalizados',
  'help.forMoreHelp':        'Para más ayuda:',
  'help.pressAgainToExit':   'Presiona {key} de nuevo para salir',
  'help.cancelShortcut':     '{shortcut} para cancelar',
  'help.description':        'Claude entiende tu código, hace ediciones con tu permiso y ejecuta comandos — directo desde tu terminal.',
  'help.shortcuts':          'Atajos',

  // ── Source annotations ─────────────────────────────────────────────────────
  'source.plugin':      'plugin',
  'source.workflow':    'flujo',
  'source.bundled':     'integrado',
  'source.user':        'usuario',
  'source.project':     'proyecto',
  'source.gitignored':  'proyecto, gitignored',
  'source.flag':        'flag CLI',
  'source.managed':     'gestionado',

  // ── Setting source labels ──────────────────────────────────────────────────
  'settingSource.user':          'usuario',
  'settingSource.project':       'proyecto',
  'settingSource.local':         'proyecto, gitignored',
  'settingSource.flag':          'flag CLI',
  'settingSource.managed':       'gestionado',
  'settingDisplayName.user':     'Usuario',
  'settingDisplayName.project':  'Proyecto',
  'settingDisplayName.local':    'Local',
  'settingDisplayName.flag':     'Flag',
  'settingDisplayName.managed':  'Gestionado',
  'settingDisplayName.plugin':   'Plugin',
  'settingDisplayName.builtin':  'Integrado',
  'settingLong.user':            'configuración del usuario',
  'settingLong.project':         'configuración compartida del proyecto',
  'settingLong.local':           'configuración local del proyecto',
  'settingLong.flag':            'argumentos de línea de comandos',
  'settingLong.managed':         'configuración gestionada por la empresa',
  'settingLong.cliArg':          'argumento CLI',
  'settingLong.command':         'configuración de comando',
  'settingLong.session':         'sesión actual',

  // ── Language picker ────────────────────────────────────────────────────────
  'language.title':      'Idioma / Interfaz',
  'language.current':    'Actual:',
  'language.restarting': 'Idioma cambiado a {name} ({code}). Reiniciando…',
  'language.alreadySet': 'El idioma ya está configurado como {name} ({code}).',
  'language.cancelled':  'Selección de idioma cancelada.',
  'language.unsupported':'Idioma no soportado "{code}". Disponibles: {list}',

  // ── Command descriptions ───────────────────────────────────────────────────
  'cmd.add-dir.description':          'Agregar un nuevo directorio de trabajo',
  'cmd.advisor.description':          'Obtener consejos sobre cómo usar NeoCode eficazmente',
  'cmd.agents.description':           'Gestionar configuraciones de agentes',
  'cmd.auto-fix.description':         'Ejecutar lint y pruebas, corrigiendo problemas automáticamente tras ediciones de IA',
  'cmd.branch.description':           'Crear una rama de la conversación actual en este punto',
  'cmd.btw.description':              'Hacer una pregunta rápida sin interrumpir la conversación principal',
  'cmd.channel.description':          'Configurar canales de notificación (telegram, discord, webhook)',
  'cmd.chrome.description':           'Configuración de Claude en Chrome (Beta)',
  'cmd.clear.description':            'Borrar el historial de conversación y liberar contexto',
  'cmd.color.description':            'Establecer el color de la barra de prompt para esta sesión',
  'cmd.compact.description':          'Borrar el historial pero mantener un resumen en el contexto',
  'cmd.computer-use.description':     'Activar/desactivar Computer Use (captura de pantalla + control de ratón/teclado)',
  'cmd.config.description':           'Abrir panel de configuración',
  'cmd.context.description':          'Visualizar el uso actual del contexto como una cuadrícula de colores',
  'cmd.copy.description':             'Copiar la última respuesta de Claude al portapapeles',
  'cmd.cost.description':             'Mostrar el costo total y duración de la sesión actual',
  'cmd.desktop.description':          'Continuar la sesión actual en Claude Desktop',
  'cmd.diff.description':             'Ver cambios sin confirmar y diffs por turno',
  'cmd.doctor.description':           'Diagnosticar y verificar tu instalación y configuración de NeoCode',
  'cmd.dream.description':            'Imaginar e implementar automáticamente una funcionalidad o mejora',
  'cmd.effort.description':           'Establecer el nivel de esfuerzo para el uso del modelo',
  'cmd.exit.description':             'Salir del REPL',
  'cmd.export.description':           'Exportar la conversación actual a un archivo o portapapeles',
  'cmd.extra-usage.description':      'Configurar uso extra para seguir trabajando cuando se alcancen los límites',
  'cmd.fast.description':             'Activar/desactivar el modo Rápido (Opus 4.6 con salida más veloz)',
  'cmd.feedback.description':         'Enviar comentarios sobre NeoCode',
  'cmd.files.description':            'Listar todos los archivos actualmente en contexto',
  'cmd.heapdump.description':         'Volcar el heap JS en ~/Desktop',
  'cmd.help.description':             'Mostrar ayuda y comandos disponibles',
  'cmd.hooks.description':            'Ver configuraciones de hooks para eventos de herramientas',
  'cmd.ide.description':              'Gestionar integraciones de IDE y mostrar estado',
  'cmd.import.description':           'Importar archivos o conjuntos de habilidades de otro proyecto local',
  'cmd.install-github-app.description': 'Configurar acciones de GitHub Claude para un repositorio',
  'cmd.install-slack-app.description': 'Instalar la aplicación Claude en Slack',
  'cmd.keybindings.description':      'Abrir o crear tu archivo de configuración de atajos de teclado',
  'cmd.language.description':         'Cambiar el idioma de la interfaz (en, pt, es)',
  'cmd.login.description':            'Iniciar sesión en tu cuenta Anthropic',
  'cmd.logout.description':           'Cerrar sesión de tu cuenta Anthropic',
  'cmd.mcp.description':              'Gestionar servidores MCP',
  'cmd.memory.description':           'Gestionar archivos de memoria de NeoCode, búsqueda en el Palacio de Memoria y vistas de grafo',
  'cmd.mobile.description':           'Mostrar código QR para descargar la aplicación Claude para móvil',
  'cmd.model.description':            'Cambiar el modelo de IA activo',
  'cmd.output-style.description':     'Obsoleto: usa /config para cambiar el estilo de salida',
  'cmd.permissions.description':      'Gestionar reglas de permisos de herramientas (permitir y denegar)',
  'cmd.plan.description':             'Activar el modo de planificación o ver el plan de la sesión actual',
  'cmd.pr_comments.description':      'Obtener comentarios de un pull request de GitHub',
  'cmd.privacy-settings.description': 'Ver y actualizar tu configuración de privacidad',
  'cmd.provider.description':         'Gestionar perfiles de proveedores de API',
  'cmd.rate-limit-options.description': 'Mostrar opciones cuando se alcance el límite de velocidad',
  'cmd.release-notes.description':    'Ver notas de la versión',
  'cmd.reload-plugins.description':   'Activar cambios de plugins pendientes en la sesión actual',
  'cmd.remote-env.description':       'Configurar el entorno remoto predeterminado para sesiones de teletransporte',
  'cmd.rename.description':           'Renombrar la conversación actual',
  'cmd.research.description':         'Ejecutar investigación web dirigida con citas de fuentes',
  'cmd.resume.description':           'Reanudar una conversación anterior',
  'cmd.rewind.description':           'Restaurar el código y/o conversación a un punto anterior',
  'cmd.sandbox-toggle.description':   'Alternar el modo sandbox para ejecución de herramientas',
  'cmd.session.description':          'Mostrar URL y código QR de la sesión remota',
  'cmd.skills.description':           'Listar habilidades disponibles',
  'cmd.stats.description':            'Mostrar estadísticas de uso y actividad de NeoCode',
  'cmd.status.description':           'Mostrar el estado de NeoCode: versión, modelo, cuenta y conectividad',
  'cmd.statusline.description':       'Alternar o configurar la línea de estado',
  'cmd.stickers.description':         'Pedir pegatinas de NeoCode',
  'cmd.swarm.description':            'Lanzar un enjambre multi-agente estilo Matrix en un épico',
  'cmd.tag.description':              'Alternar una etiqueta de búsqueda en la sesión actual',
  'cmd.tasks.description':            'Listar y gestionar tareas en segundo plano',
  'cmd.theme.description':            'Cambiar el tema del terminal',
  'cmd.upgrade.description':          'Actualizar a Max para límites más altos y más Opus',
  'cmd.usage.description':            'Mostrar límites de uso del plan',
  'cmd.vim.description':              'Alternar entre los modos de edición Vim y Normal',
  'cmd.voice.description':            'Activar/desactivar el modo de voz push-to-talk',
  'cmd.wiki.description':             'Inicializar e inspeccionar el wiki del proyecto NeoCode',
}

// ─── Runtime ──────────────────────────────────────────────────────────────────

const STRINGS: Record<PreferredLanguage, Translations> = { en: EN, pt: PT, es: ES }

/**
 * Translate a key, optionally interpolating `{var}` placeholders.
 *
 * @example
 * t('startup.toBegin')                                    // "para começar"
 * t('language.restarting', { name: 'Português', code: 'pt' })
 */
export function t(key: string, vars?: Record<string, string>): string {
  const lang = getPreferredLanguage()
  const dict = STRINGS[lang] ?? EN
  let str = dict[key] ?? EN[key] ?? key

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, v)
    }
  }

  return str
}

/**
 * Translate a command's description by name, falling back to the original.
 * Used in formatDescriptionWithSource() and Help UI.
 *
 * @param name  Command name (e.g. 'help', 'memory')
 * @param fallback  Original English description from the command definition
 */
export function tCmd(name: string, fallback: string): string {
  const key = `cmd.${name}.description`
  const lang = getPreferredLanguage()
  const dict = STRINGS[lang] ?? EN
  // Only override if the language is not English AND we have a translation
  if (lang === 'en') return fallback
  return dict[key] ?? fallback
}

/** Current language code ('en' | 'pt' | 'es'). */
export function currentLang(): PreferredLanguage {
  return getPreferredLanguage()
}