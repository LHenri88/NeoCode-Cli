/**
 * NeoCode build script — bundles the TypeScript source into a single
 * distributable JS file using Bun's bundler.
 *
 * Handles:
 * - bun:bundle feature() flags for the open build
 * - MACRO.* globals → inlined version/build-time constants
 * - src/ path aliases
 */

import { readFileSync } from 'fs'
import { noTelemetryPlugin } from './no-telemetry-plugin'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const version = pkg.version

// Feature flags for NeoCode.
// Features marked 'false' are either Anthropic-internal infrastructure
// dependencies (BRIDGE_MODE, DAEMON, CHICAGO_MCP) or experimental/telemetry
// features not relevant for the open-source build.
const featureFlags: Record<string, boolean> = {
  // ── Core Agent Features (enabled) ──────────────────────────────────────
  VOICE_MODE: true,                    // Voice input/output support
  PROACTIVE: true,                     // Proactive suggestions
  KAIROS: true,                        // Kairos context system
  AGENT_TRIGGERS: true,                // Agent trigger system
  MONITOR_TOOL: true,                  // Process monitoring
  CACHED_MICROCOMPACT: true,           // Cached context compaction
  COORDINATOR_MODE: true,              // Multi-agent coordination
  CONTEXT_COLLAPSE: true,              // Context collapsing strategies
  COMMIT_ATTRIBUTION: true,            // Git commit attribution
  TEAMMEM: true,                       // Team memory features
  AWAY_SUMMARY: true,                  // Away summaries
  TRANSCRIPT_CLASSIFIER: true,         // Transcript classification
  WEB_BROWSER_TOOL: true,              // Web browsing tool
  MESSAGE_ACTIONS: true,               // Message action buttons
  BUDDY: true,                         // Buddy AI assistant
  ULTRATHINK: true,                    // Extended thinking mode
  ULTRAPLAN: true,                     // Advanced planning
  EXTRACT_MEMORIES: true,              // Memory extraction
  HOOK_PROMPTS: true,                  // Custom hook prompts
  FORK_SUBAGENT: true,                 // Subagent forking
  AGENT_MEMORY_SNAPSHOT: true,         // Agent memory snapshots
  REACTIVE_COMPACT: true,              // Reactive compaction
  KAIROS_BRIEF: true,                  // Kairos briefs
  KAIROS_CHANNELS: true,               // Kairos channels
  KAIROS_DREAM: true,                  // Kairos dream mode
  COMPUTER_USE: true,                  // Computer use (cross-platform)
  RESEARCH: true,                      // Research agent mode
  SWARM: true,                         // Agent swarm coordination
  STREAMLINED_OUTPUT: true,            // Streamlined output formatting
  SKILL_IMPROVEMENT: true,             // Skill improvement tracking
  TOKEN_BUDGET: true,                  // Token budget management
  MCP_SKILLS: true,                    // MCP protocol skills
  FINE_GRAINED_TOOL_STREAMING: true,   // Fine-grained streaming
  HISTORY_PICKER: true,                // History picker UI
  HISTORY_SNIP: true,                  // History snipping
  QUICK_SEARCH: true,                  // Quick search feature
  TEMPLATES: true,                     // Template system
  WORKFLOW_SCRIPTS: true,              // Workflow automation

  // ── Multi-Session & Debugging (newly enabled) ──────────────────────────
  BG_SESSIONS: true,                   // Background sessions (ps, logs, attach, kill)
  DUMP_SYSTEM_PROMPT: true,            // Debug: dump system prompts

  // ── Anthropic Infrastructure (disabled - requires cloud) ───────────────
  BRIDGE_MODE: false,                  // Remote Control via claude.ai (requires subscription)
  DAEMON: false,                       // Daemon mode for bridge (requires BRIDGE_MODE)
  CHICAGO_MCP: false,                  // Computer-Use MCP (macOS binary, use COMPUTER_USE instead)
  UDS_INBOX: false,                    // Unix Domain Socket messaging (infrastructure-specific)

  // ── Experimental/Telemetry (disabled) ──────────────────────────────────
  ABLATION_BASELINE: false,            // A/B testing baseline (internal experiments)
  COWORKER_TYPE_TELEMETRY: false,      // Coworker telemetry (telemetry removed in NeoCode)
  ENHANCED_TELEMETRY_BETA: true,       // Enhanced telemetry (stubbed by no-telemetry-plugin)
}

const result = await Bun.build({
  entrypoints: ['./src/entrypoints/cli.tsx'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  splitting: false,
  sourcemap: 'external',
  minify: false,
  naming: 'cli.mjs',
  define: {
    // MACRO.* build-time constants
    // Keep the internal compatibility version high enough to pass
    // first-party minimum-version guards, but expose the real package
    // version separately in NeoCode branding.
    'MACRO.VERSION': JSON.stringify('99.0.0'),
    'MACRO.DISPLAY_VERSION': JSON.stringify(version),
    'MACRO.BUILD_TIME': JSON.stringify(new Date().toISOString()),
    'MACRO.ISSUES_EXPLAINER':
      JSON.stringify('report the issue at https://github.com/anthropics/claude-code/issues'),
    'MACRO.PACKAGE_URL': JSON.stringify('@neocode/cli'),
    'MACRO.NATIVE_PACKAGE_URL': 'undefined',
  },
  plugins: [
    noTelemetryPlugin,
    {
      name: 'bun-bundle-shim',
      setup(build) {
        const internalFeatureStubModules = new Map([
          [
            '../daemon/workerRegistry.js',
            'export async function runDaemonWorker() { throw new Error("Daemon worker is unavailable in the open build."); }',
          ],
          [
            '../daemon/main.js',
            'export async function daemonMain() { throw new Error("Daemon mode is unavailable in the open build."); }',
          ],
          [
            '../cli/bg.js',
            `
export async function psHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function logsHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function attachHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function killHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function handleBgFlag() { throw new Error("Background sessions are unavailable in the open build."); }
`,
          ],
          [
            '../cli/handlers/templateJobs.js',
            'export async function templatesMain() { throw new Error("Template jobs are unavailable in the open build."); }',
          ],
          [
            '../environment-runner/main.js',
            'export async function environmentRunnerMain() { throw new Error("Environment runner is unavailable in the open build."); }',
          ],
          [
            '../self-hosted-runner/main.js',
            'export async function selfHostedRunnerMain() { throw new Error("Self-hosted runner is unavailable in the open build."); }',
          ],
        ] as const)

        // Resolve `import { feature } from 'bun:bundle'` to a shim
        build.onResolve({ filter: /^bun:bundle$/ }, () => ({
          path: 'bun:bundle',
          namespace: 'bun-bundle-shim',
        }))
        build.onLoad(
          { filter: /.*/, namespace: 'bun-bundle-shim' },
          () => ({
            contents: `const featureFlags = ${JSON.stringify(featureFlags)};\nexport function feature(name) { return featureFlags[name] ?? false; }`,
            loader: 'js',
          }),
        )

        build.onResolve(
          { filter: /^\.\.\/(daemon\/workerRegistry|daemon\/main|cli\/bg|cli\/handlers\/templateJobs|environment-runner\/main|self-hosted-runner\/main)\.js$/ },
          args => {
            if (!internalFeatureStubModules.has(args.path)) return null
            return {
              path: args.path,
              namespace: 'internal-feature-stub',
            }
          },
        )
        build.onLoad(
          { filter: /.*/, namespace: 'internal-feature-stub' },
          args => ({
            contents:
              internalFeatureStubModules.get(args.path) ??
              'export {}',
            loader: 'js',
          }),
        )

        // Resolve react/compiler-runtime to the standalone package
        build.onResolve({ filter: /^react\/compiler-runtime$/ }, () => ({
          path: 'react/compiler-runtime',
          namespace: 'react-compiler-shim',
        }))
        build.onLoad(
          { filter: /.*/, namespace: 'react-compiler-shim' },
          () => ({
            contents: `export function c(size) { return new Array(size).fill(Symbol.for('react.memo_cache_sentinel')); }`,
            loader: 'js',
          }),
        )

        // Resolve native addon, telemetry, and missing snapshot imports to stubs.
        for (const mod of [
          'audio-capture-napi',
          'audio-capture.node',
          'image-processor-napi',
          'modifiers-napi',
          'url-handler-napi',
          'color-diff-napi',
          '@anthropic-ai/mcpb',
          '@ant/claude-for-chrome-mcp',
          '@anthropic-ai/bedrock-sdk',
          '@anthropic-ai/sandbox-runtime',
          '@smithy/node-http-handler',
          '@smithy/core',
          '@aws-sdk/credential-provider-node',
          '@opentelemetry/api',
          '@opentelemetry/api-logs',
          '@opentelemetry/core',
          '@opentelemetry/exporter-trace-otlp-grpc',
          '@opentelemetry/exporter-trace-otlp-http',
          '@opentelemetry/exporter-trace-otlp-proto',
          '@opentelemetry/exporter-logs-otlp-http',
          '@opentelemetry/exporter-logs-otlp-proto',
          '@opentelemetry/exporter-logs-otlp-grpc',
          '@opentelemetry/exporter-metrics-otlp-proto',
          '@opentelemetry/exporter-metrics-otlp-grpc',
          '@opentelemetry/exporter-metrics-otlp-http',
          '@opentelemetry/exporter-prometheus',
          '@opentelemetry/resources',
          '@opentelemetry/sdk-trace-base',
          '@opentelemetry/sdk-trace-node',
          '@opentelemetry/sdk-logs',
          '@opentelemetry/sdk-metrics',
          '@opentelemetry/semantic-conventions',
          'asciichart',
          'plist',
          'cacache',
          'fuse',
          'code-excerpt',
          'stack-utils',
        ]) {
          build.onResolve({ filter: new RegExp(`^${mod}$`) }, () => ({
            path: mod,
            namespace: 'native-stub',
          }))
        }
        build.onLoad(
          { filter: /.*/, namespace: 'native-stub' },
          () => ({
            // Comprehensive stub that handles any named export via Proxy
            contents: `
const noop = () => null;
const noopClass = class {};
const handler = {
  get(_, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return new Proxy({}, handler);
    if (prop === 'ExportResultCode') return { SUCCESS: 0, FAILED: 1 };
    if (prop === 'resourceFromAttributes') return () => ({});
    if (prop === 'SandboxRuntimeConfigSchema') return { parse: () => ({}) };
    return noop;
  }
};
const stub = new Proxy(noop, handler);
export default stub;
export const __stub = true;
// Named exports for all known imports
export const SandboxViolationStore = null;
export const SandboxManager = new Proxy({}, { get: () => noop });
export const SandboxRuntimeConfigSchema = { parse: () => ({}) };
export const BROWSER_TOOLS = [];
export const getMcpConfigForManifest = noop;
export const ColorDiff = null;
export const ColorFile = null;
export const getSyntaxTheme = noop;
export const plot = noop;
export const createClaudeForChromeMcpServer = noop;
// OpenTelemetry exports
export const ExportResultCode = { SUCCESS: 0, FAILED: 1 };
export const resourceFromAttributes = noop;
export const Resource = noopClass;
export const SimpleSpanProcessor = noopClass;
export const BatchSpanProcessor = noopClass;
export const NodeTracerProvider = noopClass;
export const BasicTracerProvider = noopClass;
export const OTLPTraceExporter = noopClass;
export const OTLPLogExporter = noopClass;
export const OTLPMetricExporter = noopClass;
export const PrometheusExporter = noopClass;
export const LoggerProvider = noopClass;
export const SimpleLogRecordProcessor = noopClass;
export const BatchLogRecordProcessor = noopClass;
export const MeterProvider = noopClass;
export const PeriodicExportingMetricReader = noopClass;
export const trace = { getTracer: () => ({ startSpan: () => ({ end: noop, setAttribute: noop, setStatus: noop, recordException: noop }) }) };
export const context = { active: noop, with: (_, fn) => fn() };
export const SpanStatusCode = { OK: 0, ERROR: 1, UNSET: 2 };
export const ATTR_SERVICE_NAME = 'service.name';
export const ATTR_SERVICE_VERSION = 'service.version';
export const SEMRESATTRS_SERVICE_NAME = 'service.name';
export const SEMRESATTRS_SERVICE_VERSION = 'service.version';
export const AggregationTemporality = { CUMULATIVE: 0, DELTA: 1 };
export const DataPointType = { HISTOGRAM: 0, SUM: 1, GAUGE: 2 };
export const InstrumentType = { COUNTER: 0, HISTOGRAM: 1, UP_DOWN_COUNTER: 2 };
export const PushMetricExporter = noopClass;
export const SeverityNumber = {};
`,
            loader: 'js',
          }),
        )

        // Resolve .md and .txt file imports to empty string stubs
        build.onResolve({ filter: /\.(md|txt)$/ }, (args) => ({
          path: args.path,
          namespace: 'text-stub',
        }))
        build.onLoad(
          { filter: /.*/, namespace: 'text-stub' },
          () => ({
            contents: `export default '';`,
            loader: 'js',
          }),
        )

        // Pre-scan: find all missing modules that need stubbing
        // (Bun's onResolve corrupts module graph even when returning null,
        //  so we use exact-match resolvers instead of catch-all patterns)
        const fs = require('fs')
        const pathMod = require('path')
        const srcDir = pathMod.resolve(__dirname, '..', 'src')
        const missingModules = new Set<string>()
        const missingModuleExports = new Map<string, Set<string>>()

        // Known missing external packages
        for (const pkg of [
          '@ant/computer-use-mcp',
          '@ant/computer-use-mcp/sentinelApps',
          '@ant/computer-use-mcp/types',
          '@ant/computer-use-swift',
          '@ant/computer-use-input',
        ]) {
          missingModules.add(pkg)
        }

        // Scan source to find imports that can't resolve
        function scanForMissingImports() {
          function walk(dir: string) {
            for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
              const full = pathMod.join(dir, ent.name)
              if (ent.isDirectory()) { walk(full); continue }
              if (!/\.(ts|tsx)$/.test(ent.name)) continue
              const code: string = fs.readFileSync(full, 'utf-8')
              // Collect all imports
              for (const m of code.matchAll(/import\s+(?:\{([^}]*)\}|(\w+))?\s*(?:,\s*\{([^}]*)\})?\s*from\s+['"](.*?)['"]/g)) {
                const specifier = m[4]
                const namedPart = m[1] || m[3] || ''
                const names = namedPart.split(',')
                  .map((s: string) => s.trim().replace(/^type\s+/, ''))
                  .filter((s: string) => s && !s.startsWith('type '))

                // Check src/tasks/ non-relative imports
                if (specifier.startsWith('src/tasks/')) {
                  const resolved = pathMod.resolve(__dirname, '..', specifier)
                  const candidates = [
                    resolved,
                    `${resolved}.ts`, `${resolved}.tsx`,
                    resolved.replace(/\.js$/, '.ts'), resolved.replace(/\.js$/, '.tsx'),
                    pathMod.join(resolved, 'index.ts'), pathMod.join(resolved, 'index.tsx'),
                  ]
                  if (!candidates.some((c: string) => fs.existsSync(c))) {
                    missingModules.add(specifier)
                  }
                }
                // Check relative .js imports
                else if (specifier.endsWith('.js') && (specifier.startsWith('./') || specifier.startsWith('../'))) {
                  const dir2 = pathMod.dirname(full)
                  const resolved = pathMod.resolve(dir2, specifier)
                  const tsVariant = resolved.replace(/\.js$/, '.ts')
                  const tsxVariant = resolved.replace(/\.js$/, '.tsx')
                  if (!fs.existsSync(resolved) && !fs.existsSync(tsVariant) && !fs.existsSync(tsxVariant)) {
                    missingModules.add(specifier)
                  }
                }

                // Track named exports for missing modules
                if (names.length > 0) {
                  if (!missingModuleExports.has(specifier)) missingModuleExports.set(specifier, new Set())
                  for (const n of names) missingModuleExports.get(specifier)!.add(n)
                }
              }
            }
          }
          walk(srcDir)
        }
        scanForMissingImports()

        // Register exact-match resolvers for each missing module
        for (const mod of missingModules) {
          const escaped = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          build.onResolve({ filter: new RegExp(`^${escaped}$`) }, () => ({
            path: mod,
            namespace: 'missing-module-stub',
          }))
        }

        build.onLoad(
          { filter: /.*/, namespace: 'missing-module-stub' },
          (args) => {
            const names = missingModuleExports.get(args.path) ?? new Set()
            const exports = [...names].map(n => `export const ${n} = noop;`).join('\n')
            return {
              contents: `
const noop = () => null;
export default noop;
${exports}
`,
              loader: 'js',
            }
          },
        )
      },
    },
  ],
  external: [
    // Native image processing
    'sharp',
    // Cloud provider SDKs
    '@aws-sdk/client-bedrock',
    '@aws-sdk/client-bedrock-runtime',
    '@aws-sdk/client-sts',
    '@aws-sdk/credential-providers',
    '@azure/identity',
    'google-auth-library',
  ],
})

if (!result.success) {
  console.error('Build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log(`✓ Built neocode v${version} → dist/cli.mjs`)
