## Why

The commit a257c47 introduced `ToolContext.workspace` for per-session isolation, but `ToolContext` already had a `cwd?: string` field that was never used. Using a single `cwd` field is simpler and more idiomatic — executor sets `cwd` to the session's workspace, tools use `context.cwd` for execution, and `path-guard` validates paths remain within bounds.

## What Changes

- Make `ToolContext.cwd` required (was optional with no default)
- Add `AgentConfig.cwd` field for passing session workspace to executor
- Update `tool-executor.ts` and `streaming-tool-executor.ts` to set `cwd: config.cwd ?? ''` when building `ToolContext`
- Update all tools (BashTool, GlobTool, GrepTool, FileReadTool, FileWriteTool, FileEditTool) to accept `context: ToolContext` and use `context.cwd` for execution
- Add `cwd` option to `execSync` and `exec` calls so commands actually execute in the session's workspace directory

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `session-workspace-isolation`: Change `ToolContext` requirement from `workspace` field to `cwd` field. Tool executors set `cwd` to session workspace, and tools use `context.cwd` for execution directory. Path validation continues to use `path-guard`.

## Impact

- **codenano**: `src/types.ts`, `src/tool-executor.ts`, `src/streaming-tool-executor.ts`, `src/tools/*.ts`
- **API contract**: `AgentConfig.cwd` replaces `AgentConfig.workspace` for passing workspace to executor
