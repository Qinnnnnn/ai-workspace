## Context

codenano-cli spawns a Node.js subprocess and creates a codenano Agent via JSON-RPC. When initializing, it hardcodes `createAgent({ tools: coreTools() })`, making tools non-configurable. The codenano library defines three preset tool sets:

- `coreTools()` — 6 tools: FileRead, FileEdit, FileWrite, Glob, Grep, Bash
- `extendedTools()` — 11 tools: core + WebFetch, Tasks, Todos
- `allTools()` — 18 tools: extended + WebSearch, LSP, Agent, AskUser, Skill

The codenano-service API creates sessions and passes configuration to codenano-cli via the `init` RPC call, but does not currently pass tool configuration.

## Goals / Non-Goals

**Goals:**
- Expose tool preset selection through codenano-service API
- Allow callers to choose `core` (default), `extended`, or `all` per session
- Keep implementation simple — codenano-cli does the mapping from preset name to actual tool array

**Non-Goals:**
- Per-tool (fine-grained) configuration — presets only, no individual tool selection
- Modifying codenano library itself
- Adding new tool implementations

## Decisions

### 1. Pass preset name as string, not tool array

**Decision**: API accepts `toolPreset: "core" | "extended" | "all"`, codenano-cli maps to preset functions.

**Rationale**: `ToolDef[]` contains Zod schemas and execute functions that cannot be serialized over JSON-RPC. Passing preset name strings is the only viable approach across the subprocess boundary.

**Alternatives considered**:
- Pass tool names as string array (`["Bash", "Read", "Write"]`) → requires codenano-cli to maintain a name-to-tool mapping, more complex
- Return tool schemas from codenano-cli via RPC → returns stubs with no execute functions

### 2. Default to `core` if not specified

**Decision**: If no `toolPreset` is provided, use `coreTools()`.

**Rationale**: `core` is the most stable preset with no stub or memory-persistence issues. Safe default.

### 3. Mapping lives in codenano-cli

**Decision**: codenano-cli imports and maps preset names to codenano preset functions.

**Rationale**: codenano-cli already imports `coreTools` from codenano. Adding `extendedTools` and `allTools` imports is straightforward. Keeping mapping close to the codenano library minimizes indirection.

## Risks / Trade-offs

- [Risk] `extendedTools` contains Tasks/Todos that store data in memory (subprocess restart wipes data) → **Accepted**: this is codenano's existing behavior, out of scope for this change
- [Risk] `allTools` includes 5 stub tools that return errors when called → **Accepted**: documented behavior, callers choosing `all` should be aware
- [Risk] codenano-cli crashes on unknown preset name → **Mitigation**: validate preset name and throw clear error before calling `createAgent`

## Migration Plan

1. Deploy codenano-cli with tool preset mapping (backward compatible — no toolPreset means coreTools)
2. Deploy codenano-service passing toolPreset through init config
3. Update API docs to document `toolPreset` parameter
4. No rollback needed — absence of toolPreset uses the previous behavior (coreTools)

## Open Questions

None — design is straightforward.
