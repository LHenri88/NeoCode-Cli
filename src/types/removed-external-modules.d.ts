// ── @ant/computer-use-mcp stubs ───────────────────────────────────────────────
// The original Anthropic binary packages are not shipped with NeoCode.
// Type stubs allow the TypeScript compiler to resolve imports while the
// actual runtime uses either macOS native modules (darwin) or the cross-
// platform fallback in src/utils/computerUse/crossPlatform.ts.

declare module '@ant/computer-use-mcp/types' {
  export type CoordinateMode = 'pixels' | 'percent'

  export type CuSubGates = {
    pixelValidation: boolean
    clipboardPasteMultiline: boolean
    mouseAnimation: boolean
    hideBeforeAction: boolean
    autoTargetDisplay: boolean
    clipboardGuard: boolean
  }

  export type Logger = {
    silly(message: string, ...args: unknown[]): void
    debug(message: string, ...args: unknown[]): void
    info(message: string, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    error(message: string, ...args: unknown[]): void
  }

  export type DisplayGeometry = {
    displayId?: number
    x: number
    y: number
    width: number
    height: number
    scaleFactor: number
    isPrimary?: boolean
  }

  export type ScreenshotResult = {
    base64: string
    width: number
    height: number
    displayId?: number
  }

  export type ResolvePrepareCaptureResult = {
    base64: string
    width: number
    height: number
    displayId?: number
    hidden: string[]
  }

  export type FrontmostApp = {
    bundleId: string
    displayName: string
  }

  export type RunningApp = {
    bundleId: string
    displayName: string
    pid?: number
  }

  export type InstalledApp = {
    bundleId: string
    displayName: string
    path?: string
    iconDataUrl?: string
  }

  export type ComputerExecutor = {
    capabilities: Record<string, unknown>
    prepareForAction(allowlistBundleIds: string[], displayId?: number): Promise<string[]>
    previewHideSet(allowlistBundleIds: string[], displayId?: number): Promise<Array<{ bundleId: string; displayName: string }>>
    getDisplaySize(displayId?: number): Promise<DisplayGeometry>
    listDisplays(): Promise<DisplayGeometry[]>
    findWindowDisplays(bundleIds: string[]): Promise<Array<{ bundleId: string; displayIds: number[] }>>
    resolvePrepareCapture(opts: { allowedBundleIds: string[]; preferredDisplayId?: number; autoResolve: boolean; doHide?: boolean }): Promise<ResolvePrepareCaptureResult>
    screenshot(opts: { allowedBundleIds: string[]; displayId?: number }): Promise<ScreenshotResult>
    zoom(regionLogical: { x: number; y: number; w: number; h: number }, allowedBundleIds: string[], displayId?: number): Promise<{ base64: string; width: number; height: number }>
    key(keySequence: string, repeat?: number): Promise<void>
    holdKey(keyNames: string[], durationMs: number): Promise<void>
    type(text: string, opts: { viaClipboard: boolean }): Promise<void>
    readClipboard(): Promise<string>
    writeClipboard(text: string): Promise<void>
    moveMouse(x: number, y: number): Promise<void>
    click(x: number, y: number, button: 'left' | 'right' | 'middle', count: 1 | 2 | 3, modifiers?: string[]): Promise<void>
    mouseDown(): Promise<void>
    mouseUp(): Promise<void>
    getCursorPosition(): Promise<{ x: number; y: number }>
    drag(from: { x: number; y: number } | undefined, to: { x: number; y: number }): Promise<void>
    scroll(x: number, y: number, dx: number, dy: number): Promise<void>
    getFrontmostApp(): Promise<FrontmostApp | null>
    appUnderPoint(x: number, y: number): Promise<{ bundleId: string; displayName: string } | null>
    listInstalledApps(): Promise<InstalledApp[]>
    getAppIcon(path: string): Promise<string | undefined>
    listRunningApps(): Promise<RunningApp[]>
    openApp(bundleId: string): Promise<void>
  }

  export type ComputerUseHostAdapter = {
    serverName: string
    logger: Logger
    executor: ComputerExecutor
    ensureOsPermissions(): Promise<{ granted: boolean; accessibility?: boolean; screenRecording?: boolean }>
    isDisabled(): boolean
    getSubGates(): CuSubGates
    getAutoUnhideEnabled(): boolean
    cropRawPatch(patch: unknown): unknown | null
  }
}

declare module '@ant/computer-use-mcp' {
  export type {
    ComputerExecutor,
    ComputerUseHostAdapter,
    DisplayGeometry,
    FrontmostApp,
    InstalledApp,
    ResolvePrepareCaptureResult,
    RunningApp,
    ScreenshotResult,
  } from '@ant/computer-use-mcp/types'

  export const API_RESIZE_PARAMS: { maxWidth: number; maxHeight: number; quality: number }

  export function targetImageSize(
    physW: number,
    physH: number,
    params: { maxWidth: number; maxHeight: number; quality: number },
  ): [number, number]
}

// ── Anthropic proprietary SDKs (not used in NeoCode) ────────────────────────
declare module '@anthropic-ai/bedrock-sdk' {
  export class AnthropicBedrock {
    constructor(options?: unknown)
  }
}

declare module '@anthropic-ai/foundry-sdk' {
  export class AnthropicFoundry {
    constructor(options?: unknown)
  }
}

declare module '@anthropic-ai/sandbox-runtime' {
  export const SandboxManager: unknown
  export const SandboxRuntimeConfigSchema: { parse(value: unknown): unknown }
  export const SandboxViolationStore: unknown
}

declare module '@growthbook/growthbook' {
  export class GrowthBook {
    constructor(options?: unknown)
    destroy(): void
    getPayload(): any
    setPayload(payload: any): Promise<void>
    getFeatures(): any
    init(options?: unknown): Promise<void>
    refreshFeatures(): Promise<void>
    getFeatureValue<T>(feature: string, defaultValue: T): T
  }
}

declare module '@opentelemetry/api' {
  export type Attributes = Record<string, unknown>
  export type HrTime = [number, number]
  export type MetricOptions = Record<string, unknown>
  export type Span = {
    end(): void
    setAttribute(name: string, value: unknown): void
    setStatus(status: unknown): void
    recordException(error: unknown): void
    addEvent?(name: string, attributes?: Attributes): void
    isRecording?(): boolean
  }
  export type DiagLogger = Record<string, (...args: unknown[]) => void>
  export const DiagLogLevel: Record<string, number>
  export const SpanStatusCode: Record<string, number>
  export const context: {
    active(): unknown
    with<T>(ctx: unknown, fn: () => T): T
  }
  export const diag: Record<string, (...args: unknown[]) => void>
  export const trace: {
    getTracer(name: string, version?: string): {
      startSpan(name: string, options?: unknown): Span
    }
  }
}

declare module '@opentelemetry/api-logs' {
  export type AnyValueMap = Record<string, unknown>
  export type Logger = {
    emit(record: unknown): void
  }
  export const logs: {
    setGlobalLoggerProvider(provider: unknown): void
    getLogger(name: string, version?: string): Logger
  }
}

declare module '@opentelemetry/core' {
  export type ExportResult = { code: number; error?: Error }
  export const ExportResultCode: { SUCCESS: number; FAILED: number }
}

declare module '@opentelemetry/resources' {
  export function resourceFromAttributes(attributes: Record<string, unknown>): unknown
}

declare module '@opentelemetry/sdk-logs' {
  export class LoggerProvider {
    constructor(options?: unknown)
    addLogRecordProcessor(processor: unknown): void
    shutdown(): Promise<void>
    forceFlush(): Promise<void>
    getLogger(name: string, version?: string): unknown
  }
  export class BatchLogRecordProcessor {
    constructor(exporter: unknown, options?: unknown)
  }
  export class SimpleLogRecordProcessor {
    constructor(exporter: unknown)
  }
  export type ReadableLogRecord = Record<string, unknown>
}

declare module '@opentelemetry/sdk-metrics' {
  export class MeterProvider {
    constructor(options?: unknown)
    addMetricReader(reader: unknown): void
    shutdown(): Promise<void>
    forceFlush(): Promise<void>
    getMeter(name: string, version?: string): unknown
  }
  export class PeriodicExportingMetricReader {
    constructor(options?: unknown)
  }
  export type PushMetricExporter = unknown
  export const AggregationTemporality: Record<string, number>
  export const DataPointType: Record<string, number>
  export const InstrumentType: Record<string, number>
}

declare module '@opentelemetry/sdk-trace-base' {
  export class BasicTracerProvider {
    constructor(options?: unknown)
    addSpanProcessor(processor: unknown): void
    register(options?: unknown): void
    shutdown(): Promise<void>
    forceFlush(): Promise<void>
    getTracer(name: string, version?: string): unknown
  }
  export class BatchSpanProcessor {
    constructor(exporter: unknown, options?: unknown)
  }
  export class SimpleSpanProcessor {
    constructor(exporter: unknown)
  }
}

declare module '@opentelemetry/sdk-trace-node' {
  export class NodeTracerProvider {
    constructor(options?: unknown)
    addSpanProcessor(processor: unknown): void
    register(options?: unknown): void
    shutdown(): Promise<void>
    forceFlush(): Promise<void>
    getTracer(name: string, version?: string): unknown
  }
}

declare module '@opentelemetry/semantic-conventions' {
  export const ATTR_SERVICE_NAME: string
  export const ATTR_SERVICE_VERSION: string
  export const SEMRESATTRS_SERVICE_NAME: string
  export const SEMRESATTRS_SERVICE_VERSION: string
}

declare module '@opentelemetry/exporter-trace-otlp-http' {
  export class OTLPTraceExporter {
    constructor(options?: unknown)
  }
}

declare module '@opentelemetry/exporter-logs-otlp-http' {
  export class OTLPLogExporter {
    constructor(options?: unknown)
  }
}

declare module '@opentelemetry/exporter-trace-otlp-grpc' {
  export class OTLPTraceExporter {
    constructor(options?: unknown)
  }
}
