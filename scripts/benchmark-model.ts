#!/usr/bin/env bun
// E9.4 — Model Quality Benchmark
// Usage: bun scripts/benchmark-model.ts [--model qwen2.5-coder:7b] [--runs 3]
//
// Sends fixed prompts to the current provider and records latency + throughput.
// Results appended to ~/.neocode/benchmark.json (JSONL).

import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_MODEL =
  process.env.OLLAMA_MODEL ?? process.env.OPENAI_MODEL ?? 'qwen2.5-coder:7b'
const DEFAULT_RUNS = 3

function parseArgs(): { model: string; runs: number; baseUrl: string } {
  const args = process.argv.slice(2)
  let model = DEFAULT_MODEL
  let runs = DEFAULT_RUNS
  let baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) model = args[++i]
    if (args[i] === '--runs' && args[i + 1]) runs = parseInt(args[++i], 10)
    if (args[i] === '--base-url' && args[i + 1]) baseUrl = args[++i]
  }
  return { model, runs, baseUrl }
}

const BENCHMARK_PROMPTS = [
  { id: 'code_gen', prompt: 'Write a TypeScript function that reverses a linked list.' },
  { id: 'reasoning', prompt: 'A bat and ball cost $1.10. The bat costs $1 more than the ball. How much does the ball cost? Think step by step.' },
  { id: 'completion', prompt: 'Complete this sentence: The quick brown fox' },
]

type BenchmarkEntry = {
  ts: string
  model: string
  baseUrl: string
  promptId: string
  run: number
  latencyMs: number
  inputTokens: number
  outputTokens: number
  tokensPerSec: number
  error?: string
}

async function runPrompt(
  prompt: string,
  model: string,
  baseUrl: string,
): Promise<{ latencyMs: number; inputTokens: number; outputTokens: number }> {
  const start = Date.now()
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
      options: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(60_000),
  })
  const latencyMs = Date.now() - start
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }
  const data = (await response.json()) as {
    prompt_eval_count?: number
    eval_count?: number
  }
  return {
    latencyMs,
    inputTokens: data.prompt_eval_count ?? 0,
    outputTokens: data.eval_count ?? 0,
  }
}

async function main() {
  const { model, runs, baseUrl } = parseArgs()
  const outDir = join(homedir(), '.neocode')
  await mkdir(outDir, { recursive: true })
  const outFile = join(outDir, 'benchmark.json')

  console.log(`\nNeoCode Model Benchmark`)
  console.log(`Model:   ${model}`)
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Runs:    ${runs}`)
  console.log('─'.repeat(50))

  for (const { id, prompt } of BENCHMARK_PROMPTS) {
    console.log(`\n[${id}] ${prompt.slice(0, 60)}...`)
    for (let run = 1; run <= runs; run++) {
      let entry: BenchmarkEntry
      try {
        const { latencyMs, inputTokens, outputTokens } = await runPrompt(
          prompt,
          model,
          baseUrl,
        )
        const tokensPerSec =
          outputTokens > 0 ? Math.round((outputTokens / latencyMs) * 1000) : 0
        entry = {
          ts: new Date().toISOString(),
          model,
          baseUrl,
          promptId: id,
          run,
          latencyMs,
          inputTokens,
          outputTokens,
          tokensPerSec,
        }
        console.log(
          `  Run ${run}: ${latencyMs}ms | ${outputTokens} tokens | ${tokensPerSec} tok/s`,
        )
      } catch (e: unknown) {
        entry = {
          ts: new Date().toISOString(),
          model,
          baseUrl,
          promptId: id,
          run,
          latencyMs: -1,
          inputTokens: 0,
          outputTokens: 0,
          tokensPerSec: 0,
          error: (e as Error).message,
        }
        console.log(`  Run ${run}: ERROR — ${(e as Error).message}`)
      }
      await appendFile(outFile, JSON.stringify(entry) + '\n', 'utf8')
    }
  }

  console.log(`\nResults saved to: ${outFile}`)

  // Print summary of existing results for this model
  try {
    const raw = await readFile(outFile, 'utf8')
    const entries: BenchmarkEntry[] = raw
      .split('\n')
      .filter(Boolean)
      .map(l => JSON.parse(l))
      .filter(e => e.model === model && e.tokensPerSec > 0)
    if (entries.length > 0) {
      const avgTps =
        entries.reduce((s, e) => s + e.tokensPerSec, 0) / entries.length
      const avgLatency =
        entries.reduce((s, e) => s + e.latencyMs, 0) / entries.length
      console.log(`\nModel summary (all runs):`)
      console.log(`  Avg latency:    ${Math.round(avgLatency)}ms`)
      console.log(`  Avg throughput: ${Math.round(avgTps)} tok/s`)
    }
  } catch {
    // No prior results
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
