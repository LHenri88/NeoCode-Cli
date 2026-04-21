# NeoCode Feature Flags

This document describes all feature flags in NeoCode and their status.

## 📊 Feature Status Overview

| Category | Enabled | Disabled | Total |
|----------|---------|----------|-------|
| **Core Agent Features** | 33 | 0 | 33 |
| **Multi-Session & Debug** | 2 | 0 | 2 |
| **Infrastructure** | 0 | 4 | 4 |
| **Experimental** | 0 | 2 | 2 |
| **TOTAL** | **35** | **6** | **41** |

---

## ✅ ENABLED FEATURES (35)

### Core Agent Capabilities

| Feature | Description | Source Location |
|---------|-------------|-----------------|
| `VOICE_MODE` | Voice input/output support via speech recognition | `src/voice/`, `src/hooks/useVoice.ts` |
| `PROACTIVE` | Proactive suggestions and autonomous actions | `src/services/proactive/` |
| `KAIROS` | Kairos context awareness and memory system | `src/services/kairos/` |
| `AGENT_TRIGGERS` | Trigger-based agent activation | `src/tools/AgentTool/` |
| `MONITOR_TOOL` | Process and system monitoring | `src/tools/MonitorTool/` |
| `CACHED_MICROCOMPACT` | Optimized context compaction with caching | `src/services/compact/` |
| `COORDINATOR_MODE` | Multi-agent coordination and orchestration | `src/services/coordinator/` |
| `CONTEXT_COLLAPSE` | Smart context collapsing for token efficiency | `src/utils/context.ts` |
| `COMMIT_ATTRIBUTION` | Git commit attribution and co-authoring | `src/utils/worktree.ts` |
| `TEAMMEM` | Team memory and shared context | `src/services/teammem/` |
| `AWAY_SUMMARY` | Generate summaries while user is away | `src/services/autoAway/` |
| `TRANSCRIPT_CLASSIFIER` | Classify conversation transcripts | `src/services/classifier/` |
| `WEB_BROWSER_TOOL` | Web browsing and fetching tool | `src/tools/WebSearchTool/` |
| `MESSAGE_ACTIONS` | Interactive message action buttons | `src/components/messages/` |
| `BUDDY` | AI buddy assistant mode | `src/buddy/` |
| `ULTRATHINK` | Extended thinking and reasoning mode | `src/utils/thinking.ts` |
| `ULTRAPLAN` | Advanced multi-step planning | `src/utils/ultraplan/` |
| `EXTRACT_MEMORIES` | Automatic memory extraction from conversations | `src/services/memory/` |
| `HOOK_PROMPTS` | Custom user-defined hook prompts | `src/hooks/` |
| `FORK_SUBAGENT` | Spawn independent subagents | `src/tools/AgentTool/` |
| `AGENT_MEMORY_SNAPSHOT` | Save/restore agent memory states | `src/services/memoryPalace/` |
| `REACTIVE_COMPACT` | Reactive context compaction | `src/services/compact/` |
| `KAIROS_BRIEF` | Kairos context briefs | `src/services/kairos/` |
| `KAIROS_CHANNELS` | Kairos communication channels | `src/services/kairos/` |
| `KAIROS_DREAM` | Kairos background processing (auto-dream) | `src/services/autoDream/` |
| `COMPUTER_USE` | Cross-platform computer control (keyboard, mouse, screenshots) | `src/utils/computerUse/` |
| `RESEARCH` | Research agent with web search and synthesis | `src/commands/research/` |
| `SWARM` | Multi-agent swarm coordination | `src/services/agentSwarm/` |
| `STREAMLINED_OUTPUT` | Clean, focused output formatting | `src/cli/print.ts` |
| `SKILL_IMPROVEMENT` | Track and improve agent skills over time | `src/services/selfImprove/` |
| `TOKEN_BUDGET` | Token budget management and warnings | `src/utils/context.ts` |
| `MCP_SKILLS` | Model Context Protocol skills integration | `src/services/mcp/` |
| `FINE_GRAINED_TOOL_STREAMING` | Detailed tool execution streaming | `src/query.ts` |
| `HISTORY_PICKER` | Interactive conversation history picker | `src/commands/resume/` |
| `HISTORY_SNIP` | Snip and edit conversation history | `src/services/history/` |
| `QUICK_SEARCH` | Fast codebase search | `src/tools/GlobTool/`, `src/tools/GrepTool/` |
| `TEMPLATES` | Template system for prompts and workflows | `src/templates/` |
| `WORKFLOW_SCRIPTS` | Workflow automation scripting | `src/workflows/` |
| `ENHANCED_TELEMETRY_BETA` | Enhanced telemetry (stubbed by no-telemetry-plugin) | `src/services/analytics/` |

### Multi-Session & Debugging

| Feature | Description | Commands/Usage |
|---------|-------------|----------------|
| `BG_SESSIONS` | **NEW!** Background session management | `neocode --bg`, `neocode ps`, `neocode logs`, `neocode attach`, `neocode kill` |
| `DUMP_SYSTEM_PROMPT` | **NEW!** Dump system prompts for debugging | `neocode --dump-system-prompt` (development only) |

---

## ❌ DISABLED FEATURES (6)

### Anthropic Infrastructure Dependencies

These features require Anthropic's proprietary cloud infrastructure and cannot be enabled in the open-source NeoCode build.

| Feature | Reason Disabled | Technical Details |
|---------|-----------------|-------------------|
| `BRIDGE_MODE` | Requires claude.ai subscription & OAuth | Remote Control feature that connects to Anthropic's CCR (Claude Code Remote) service via claude.ai OAuth tokens. Requires organization UUID from `/api/oauth/profile` endpoint. |
| `DAEMON` | Requires `BRIDGE_MODE` | Daemon mode specifically designed to support bridge operations. No standalone functionality. |
| `CHICAGO_MCP` | macOS-only binary dependency | Computer-Use MCP server using proprietary `@ant/computer-use-mcp` binaries. **Alternative**: Use `COMPUTER_USE: true` (cross-platform fallback already enabled). |
| `UDS_INBOX` | Infrastructure-specific messaging | Unix Domain Socket-based inter-process communication for specific deployment architectures. |

### Experimental/Internal

| Feature | Reason Disabled | Purpose |
|---------|-----------------|---------|
| `ABLATION_BASELINE` | Internal A/B testing | Anthropic's internal experimentation framework for baseline comparisons. |
| `COWORKER_TYPE_TELEMETRY` | Telemetry removed from NeoCode | Tracks coworker interaction types. All telemetry is stubbed by `no-telemetry-plugin`. |

---

## 🔧 Changing Feature Flags

Feature flags are configured at **build time** in [`scripts/build.ts`](../scripts/build.ts).

### How to Enable a Feature

1. Open `scripts/build.ts`
2. Find the `featureFlags` object
3. Change the feature from `false` to `true`
4. Rebuild:
   ```bash
   bun run build
   ```

### How to Verify a Feature is Active

```bash
# Check if code for the feature is included in the bundle
grep -i "FEATURE_NAME" dist/cli.mjs

# Or test the feature directly
node dist/cli.mjs --help  # check for new commands
```

---

## 📝 Adding New Features

When adding a new feature to NeoCode:

1. **Add the flag** in `scripts/build.ts`:
   ```typescript
   const featureFlags = {
     // ...
     MY_NEW_FEATURE: true,
   }
   ```

2. **Guard code** with `feature()`:
   ```typescript
   import { feature } from 'bun:bundle'

   if (feature('MY_NEW_FEATURE')) {
     // This code is eliminated at build time if flag is false
   }
   ```

3. **Document** the feature:
   - Add entry to this file (`docs/FEATURES.md`)
   - Update README if user-facing
   - Add usage examples

4. **Test**:
   ```bash
   bun run build      # Build with feature enabled
   bun test           # Run test suite
   bun run smoke      # Smoke test
   ```

---

## 🎯 Feature Flag Best Practices

### ✅ DO

- Use feature flags for:
  - Experimental features under development
  - Infrastructure-dependent code
  - Optional integrations
  - Performance-heavy features

- Always document why a feature is disabled
- Keep disabled features isolated in their own directories
- Use positive ternary pattern for tree-shaking:
  ```typescript
  return feature('FLAG') ? enabledCode() : false
  ```

### ❌ DON'T

- Don't use feature flags for:
  - Core functionality everyone needs
  - Bug fixes (just fix the bug)
  - Trivial code changes

- Don't leave disabled features uncommented for years
- Don't use negative patterns that prevent tree-shaking:
  ```typescript
  // BAD - string literals not eliminated
  if (!feature('FLAG')) return
  ```

---

## 📊 Feature Statistics

**Bundle Impact**:
- Total source files: ~2,139 TypeScript files
- Bundled output: ~19MB (535k lines)
- Features enabled: 35/41 (85%)
- Disabled code: ~6 features tree-shaken at build time

**Recent Changes**:
- 2026-04-20: Enabled `BG_SESSIONS` and `DUMP_SYSTEM_PROMPT`
- 2026-04-20: Documented all 41 feature flags
- 2026-04-20: Reorganized flags with inline comments in `build.ts`

---

## 🔗 Related Documentation

- [Build System](../scripts/build.ts) - Build configuration and feature flags
- [No-Telemetry Plugin](../scripts/no-telemetry-plugin.ts) - Telemetry removal at build time
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Contributing](../CONTRIBUTING.md) - How to contribute new features

---

**Last Updated**: 2026-04-20
**NeoCode Version**: 0.1.8
