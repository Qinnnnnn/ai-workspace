## Context

codenano-api provides multi-session agentic service. Each session needs an isolated workspace directory. The commit a257c47 added `ToolContext.workspace` for this purpose, but `ToolContext` already had a `cwd?: string` field that was never used by executors or tools.

The current state:
- `tool-executor.ts` builds `ToolContext` with `{ workspace, signal, messages }` — no `cwd`
- BashTool reads `context.workspace` for path validation but doesn't pass `cwd` to `execSync`
- Tools that need execution directory (Bash, Grep, Glob) don't actually run in the session's workspace

This design unifies to use `cwd` everywhere.

## Goals / Non-Goals

**Goals:**
- Single field (`cwd`) for session workspace — simpler mental model
- Tools actually execute commands within the session's workspace directory
- `path-guard` continues to validate paths don't escape `cwd`

**Non-Goals:**
- Changing workspace lifecycle (still created by codenano-api on session creation)
- Changing API responses — still include `workspace` field

## Decisions

### Decision 1: Remove `workspace` from `ToolContext`, use existing `cwd`

**Choice**: Change `ToolContext.workspace: string` to `cwd: string` (required)

**Rationale**: Having two fields (`workspace` and `cwd`) for the same concept is confusing. `cwd` is the standard term for "current working directory" and already exists in the type. Simpler: one field, one purpose.

**Alternatives considered**:
- Keep both `workspace` and `cwd`: More confusing, two fields with same value
- Keep `workspace` only, remove `cwd`: Would require more changes since tools already read `cwd` in some places

### Decision 2: Executor sets `cwd` from `AgentConfig.cwd` when building `ToolContext`

**Choice**: In `tool-executor.ts` and `streaming-tool-executor.ts`:
```typescript
const context: ToolContext = { cwd: config.cwd ?? '', signal, messages }
```

**Rationale**: `AgentConfig.cwd` is passed directly to tools. `cwd` defaults to empty string if not provided (allowing tools to use process.cwd() as fallback behavior).

### Decision 3: Tools use `context.cwd` for execution directory

**Files**: BashTool, GrepTool, GlobTool, FileReadTool, FileWriteTool, FileEditTool

**Changes**:
- BashTool: `execSync(cmd, { ..., cwd: context.cwd })` and `exec(cmd, { ..., cwd: context.cwd })`
- GrepTool: `execSync(args, { ..., cwd: context.cwd })`
- GlobTool: `execSync(findCmd, { ..., cwd: context.cwd })`
- FileReadTool, FileWriteTool, FileEditTool: Use `context.cwd` as base path

**Rationale**: `path-guard` already validates paths are within `cwd`. Adding `cwd` to exec options ensures OS-level constraint matches application-level validation.

## Risks / Trade-offs

**[Risk] Tools not passing `cwd` to exec** → Mitigation: Audit all exec/execSync calls in tools. This is the core fix.

**[Risk] Breaking change to tools** → Mitigation: Only internal refactor, no API change. codenano-api session responses still include `workspace`.

**[Trade-off] `cwd` is now required** → Previously `cwd` was optional with no default. Now executor always provides it. Tools can rely on it being set.

## Migration Plan

1. **Update `ToolContext` in `types.ts`**: Make `cwd` required (was optional)
2. **Update executors**: Set `cwd: config.cwd ?? ''` in context construction
3. **Update tools**: Accept `context: ToolContext` and use `context.cwd` for exec options
4. **Add `cwd` to exec options**: BashTool, GrepTool, GlobTool
5. **Build and test**: Verify codenano compiles, codenano-api tests pass

## Open Questions

1. Should `path-guard.ts` be updated to use `cwd` instead of `workspace` parameter? — Yes, rename parameter for consistency but behavior unchanged.
