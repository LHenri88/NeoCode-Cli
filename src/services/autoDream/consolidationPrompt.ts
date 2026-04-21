// Extracted from dream.ts so auto-dream ships independently of KAIROS
// feature flags (dream.ts is behind a feature()-gated require).

import {
  DIR_EXISTS_GUIDANCE,
  ENTRYPOINT_NAME,
  MAX_ENTRYPOINT_LINES,
} from '../../memdir/memdir.js'

export function buildConsolidationPrompt(
  memoryRoot: string,
  transcriptDir: string,
  extra: string,
): string {
  return `# Dream: Memory Consolidation

You are performing a dream — a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly.

Memory directory: \`${memoryRoot}\`
${DIR_EXISTS_GUIDANCE}

Session transcripts: \`${transcriptDir}\` (large JSONL files — grep narrowly, don't read whole files)

---

## Phase 1 — Orient

- \`ls\` the memory directory to see what already exists
- Read \`${ENTRYPOINT_NAME}\` to understand the current index
- Skim existing topic files so you improve them rather than creating duplicates
- If \`logs/\` or \`sessions/\` subdirectories exist (assistant-mode layout), review recent entries there

## Phase 2 — Gather recent signal

Look for new information worth persisting. Sources in rough priority order:

1. **Daily logs** (\`logs/YYYY/MM/YYYY-MM-DD.md\`) if present — these are the append-only stream
2. **Existing memories that drifted** — facts that contradict something you see in the codebase now
3. **Transcript search** — if you need specific context (e.g., "what was the error message from yesterday's build failure?"), grep the JSONL transcripts for narrow terms:
   \`grep -rn "<narrow term>" ${transcriptDir}/ --include="*.jsonl" | tail -50\`

Don't exhaustively read transcripts. Look only for things you already suspect matter.

## Phase 3 — Consolidate & Merge

For each thing worth remembering, write or update a memory file at the top level of the memory directory. Use the memory file format and type conventions from your system prompt's auto-memory section — it's the source of truth for what to save, how to structure it, and what NOT to save.

Focus on:
- Merging new signal into existing topic files rather than creating near-duplicates
- Converting relative dates ("yesterday", "last week") to absolute dates so they remain interpretable after time passes
- Deduplicating: if two memories say the same thing, keep the more complete one and delete the other

## Phase 4 — Contradiction Detection

Scan your memory files for conflicting facts:
- If two files state opposite things about the same subject (e.g., "feature X is enabled" vs "feature X was removed"), resolve the conflict by fixing or removing the outdated entry
- Mark each resolution clearly (inline comment or removal)
- If you cannot determine which is correct from available evidence, add a `[conflicted]` note and leave both for human review

## Phase 5 — Prune Stale Memories

Remove or demote memories that are no longer actionable:
- Memories about work that is clearly finished (e.g., "sprint 1 tasks pending" when the sprint is closed)
- Memories with `[stale]` markers older than 30 days
- Duplicate memories that survived Phase 3

## Phase 6 — Index

Update \`${ENTRYPOINT_NAME}\` so it stays under ${MAX_ENTRYPOINT_LINES} lines AND under ~25KB. It's an **index**, not a dump — each entry should be one line under ~150 characters: \`- [Title](file.md) — one-line hook\`. Never write memory content directly into it.

- Remove pointers to memories that are now stale, wrong, or superseded
- Demote verbose entries: if an index line is over ~200 chars, it's carrying content that belongs in the topic file — shorten the line, move the detail
- Add pointers to newly important memories

---

Return a brief summary of what you consolidated, merged, contradictions resolved, pruned, and indexed. Report counts: files touched, contradictions fixed, memories pruned.${extra ? `\n\n## Additional context\n\n${extra}` : ''}`
}
