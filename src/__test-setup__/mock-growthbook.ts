/**
 * Bun preload: runtime stubs for all proprietary/removed external packages.
 *
 * Epic 1.3 + 1.4 – these packages are intentionally removed from production deps.
 * Stubs ensure unit tests can run without installing any of them.
 */
import { mock } from 'bun:test'

// --- @growthbook/growthbook ---
mock.module('@growthbook/growthbook', () => ({
  GrowthBook: class GrowthBook {
    constructor(_options?: unknown) {}
    destroy() {}
    getPayload() { return null }
    async setPayload(_payload: unknown) {}
    getFeatures() { return {} }
    async init(_options?: unknown) {}
    async refreshFeatures() {}
    getFeatureValue<T>(_feature: string, defaultValue: T): T { return defaultValue }
  },
}))

// --- @opentelemetry/api ---
const noopSpan = {
  end() {},
  setAttribute(_k: string, _v: unknown) {},
  setStatus(_s: unknown) {},
  recordException(_e: unknown) {},
  addEvent(_n: string) {},
  isRecording() { return false },
}
mock.module('@opentelemetry/api', () => ({
  SpanStatusCode: { UNSET: 0, OK: 1, ERROR: 2 },
  DiagLogLevel: { NONE: 0, ERROR: 30, WARN: 50, INFO: 60, DEBUG: 70, VERBOSE: 80, ALL: 9999 },
  context: { active() { return {} }, with(_ctx: unknown, fn: () => unknown) { return fn() } },
  diag: { setLogger() {}, verbose() {}, debug() {}, info() {}, warn() {}, error() {} },
  trace: { getTracer(_n: string) { return { startSpan(_name: string) { return noopSpan } } } },
}))

// --- @opentelemetry/api-logs ---
mock.module('@opentelemetry/api-logs', () => ({
  logs: {
    setGlobalLoggerProvider(_p: unknown) {},
    getLogger(_name: string) { return { emit(_r: unknown) {} } },
  },
}))

// --- @opentelemetry/core ---
mock.module('@opentelemetry/core', () => ({
  ExportResultCode: { SUCCESS: 0, FAILED: 1 },
}))

// --- @opentelemetry/resources ---
mock.module('@opentelemetry/resources', () => ({
  resourceFromAttributes(_attrs: Record<string, unknown>) { return {} },
}))

// --- @opentelemetry/sdk-logs ---
mock.module('@opentelemetry/sdk-logs', () => ({
  LoggerProvider: class { addLogRecordProcessor(_p: unknown) {} async shutdown() {} async forceFlush() {} getLogger(_n: string) { return { emit(_r: unknown) {} } } },
  BatchLogRecordProcessor: class { constructor(_e: unknown, _o?: unknown) {} },
  SimpleLogRecordProcessor: class { constructor(_e: unknown) {} },
}))

// --- @opentelemetry/sdk-metrics ---
mock.module('@opentelemetry/sdk-metrics', () => ({
  MeterProvider: class { addMetricReader(_r: unknown) {} async shutdown() {} async forceFlush() {} getMeter(_n: string) { return {} } },
  PeriodicExportingMetricReader: class { constructor(_o?: unknown) {} },
  AggregationTemporality: { CUMULATIVE: 0, DELTA: 1 },
  DataPointType: {},
  InstrumentType: {},
}))

// --- @opentelemetry/sdk-trace-base ---
mock.module('@opentelemetry/sdk-trace-base', () => ({
  BasicTracerProvider: class { addSpanProcessor(_p: unknown) {} register(_o?: unknown) {} async shutdown() {} async forceFlush() {} getTracer(_n: string) { return { startSpan(_name: string) { return noopSpan } } } },
  BatchSpanProcessor: class { constructor(_e: unknown, _o?: unknown) {} },
  SimpleSpanProcessor: class { constructor(_e: unknown) {} },
}))

// --- @opentelemetry/sdk-trace-node ---
mock.module('@opentelemetry/sdk-trace-node', () => ({
  NodeTracerProvider: class { addSpanProcessor(_p: unknown) {} register(_o?: unknown) {} async shutdown() {} async forceFlush() {} getTracer(_n: string) { return { startSpan(_name: string) { return noopSpan } } } },
}))

// --- @opentelemetry/semantic-conventions ---
mock.module('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
  ATTR_SERVICE_VERSION: 'service.version',
  SEMRESATTRS_SERVICE_NAME: 'service.name',
  SEMRESATTRS_SERVICE_VERSION: 'service.version',
}))

// --- @opentelemetry/exporter-trace-otlp-http ---
mock.module('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: class { constructor(_o?: unknown) {} },
}))

// --- @opentelemetry/exporter-logs-otlp-http ---
mock.module('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: class { constructor(_o?: unknown) {} },
}))

// --- @opentelemetry/exporter-trace-otlp-grpc ---
mock.module('@opentelemetry/exporter-trace-otlp-grpc', () => ({
  OTLPTraceExporter: class { constructor(_o?: unknown) {} },
}))

// --- @anthropic-ai/bedrock-sdk ---
mock.module('@anthropic-ai/bedrock-sdk', () => ({
  AnthropicBedrock: class { constructor(_o?: unknown) {} },
}))

// --- @anthropic-ai/foundry-sdk ---
mock.module('@anthropic-ai/foundry-sdk', () => ({
  AnthropicFoundry: class { constructor(_o?: unknown) {} },
}))

// --- @anthropic-ai/sandbox-runtime ---
mock.module('@anthropic-ai/sandbox-runtime', () => ({
  SandboxManager: {},
  SandboxRuntimeConfigSchema: { parse(v: unknown) { return v } },
  SandboxViolationStore: {},
}))
